'use strict';

const async = require('async');
const crypto = require('crypto');
const formidable = require('formidable');
const fs = require('fs');
const semver = require('semver');

const CONF_DIR_NAME = 'configurations';
const TMP_DIR_NAME = 'tmp';

const ALLOWED_EXTENTIONS = ['csv', 'ini', 'json', 'yaml', 'cfg', 'xml'];

function getSha256(filepath, cb) {
  const input = fs.createReadStream(filepath);
  const hash = crypto.createHash('sha256');

  input.on('error', (err) => {
    cb(err);
  });

  input.on('readable', () => {
    const data = input.read();
    if (data) {
      hash.update(data);
    } else {
      let h = hash.digest('hex');
      cb(null, h);
    }
  });
}

function checkFields(fields) {
  let msg = '';
  // TODO add any desired fields checking here
  if (typeof fields.name !== 'string' || fields.name === '') {
    msg = 'Configuration name not specified';
    throw new Error(msg);
  }

  if (typeof fields.version !== 'string' || fields.version === '') {
    msg = 'Configuration version not specified';
    throw new Error(msg);
  }

  if (!semver.valid(fields.version)) {
    msg = 'Configuration version must have the semver format';
    throw new Error(msg);
  }
}

function checkFileType(fileInfo) {
  // TODO: check the mime type when having the complete list
  // had differences when using curl (example csv mime type was
  // application/octect-stream)
  let type = fileInfo.name.split('.')[1];

  if (ALLOWED_EXTENTIONS.indexOf(type) === -1) {
    let str = ALLOWED_EXTENTIONS.join(', ');
    throw new Error(`The following extensions are allowed: ${str}.`);
  }
}

function createConfigDir(dirStoragePath, configName) {
  let path = '';

  if (typeof configName === 'string') {
    path = `${dirStoragePath}/${configName}`;
  } else {
    let msg = 'Cannot create directory: configuration name not specified';
    // TODO choose error code
    throw new Error(msg);
  }

  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
  }
  return path;
}

module.exports = function(Configuration) {
  Configuration.upload = function(req, res, body, cb) {
    const {Container} = Configuration.app.models;
    const form = new formidable.IncomingForm();
    const {name: storageName, root: storageRoot} = Configuration.app
    .dataSources.storage.settings;
    const STORAGE_DIR_PATH = `${storageRoot}/${CONF_DIR_NAME}`;
    const TMP_DIR_PATH = `${storageRoot}/${TMP_DIR_NAME}`;
    const USER_ID = req.accessToken.userId;

    var fileStoragePath = '';
    var fields = {};
    var fileInfo = {};
    var fileHash = '';
    var filePath = '';
    var tmpFilePath = '';

    function removeFile(containerName, fileName, callback) {
      Container.removeFile(containerName, fileName, (err) => {
        callback(err);
      });
    }

    const filePromise = new Promise((resolve, reject) => {
      Container.upload(req, res, {
        container: TMP_DIR_NAME,
      }, (error, fileObj) => {
        if (error) return reject(error);
        fileInfo = fileObj.files.file[0];
        try {
          checkFileType(fileInfo);
        } catch (err) {
          return removeFile(TMP_DIR_NAME, fileInfo.name, (_err) => {
            if (_err) console.log(_err);
            reject(err);
          });
        }

        resolve(fileInfo);
      });
    });

    const fieldsPromise = new Promise((resolve, reject) => {
      form.parse(req, function(error, _fields, files) {
        if (error) return reject(error);

        try {
          checkFields(_fields);
          fileStoragePath = createConfigDir(STORAGE_DIR_PATH, _fields.name);
          fields = _fields;
          /*
            store files in a directory whose name is the configuration name and
            the file name is the version of the configuration
          */
          filePath = `${fileStoragePath}/${fields.version}`;
          tmpFilePath = `${TMP_DIR_PATH}/${fileInfo.name}`;
        } catch (error) {
          return reject(error);
        }
        resolve(fields);
      });
    });

    Promise.all([filePromise, fieldsPromise])
    .then(([fileInfo, fields]) => {
      // NOTE: assuming only one file is uploaded for now
      async.waterfall([
        function(callback) {
          // TODO: further file checking prior to this step
          fs.rename(tmpFilePath, filePath, (err) => {
            callback(err);
          });
        },
        function(callback) {
          getSha256(filePath, (err, hash) => {
            if (err) return callback(err);
            fileHash = hash;
            callback(null);
          });
        },
        function(callback) {
          let config = {
            name: fields.name,
            filepath: filePath,
            filename: fileInfo.name,
            version: fields.version,
            idOwner: USER_ID,
            date: Date.now(),
            fingerprint: fileHash,
            type: fileInfo.type,
            size: fileInfo.size,
          };
          Configuration.create(config, (error, reply) => {
            if (error) return callback(error);
            callback(null, reply);
          });
        },
      ], function(err, results) {
        if (err) return cb(err);
        cb(null, results.reply);
      });
    })
    .catch(error => {
      removeFile(TMP_DIR_NAME, fileInfo.name, (err) => {
        cb(err);
      });
    });
  };

  Configuration.remoteMethod('upload', {
    description: 'Uploads a file',
    accepts: [
      {arg: 'req', type: 'object', http: {source: 'req'}},
      {arg: 'res', type: 'object', http: {source: 'res'}},
      {arg: 'body', type: 'object', http: {source: 'body'}},
    ],
    returns: {
      arg: 'fileObject',
      type: 'object',
      root: true,
    },
    http: {verb: 'post'},
  });
};
