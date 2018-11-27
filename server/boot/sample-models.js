'use strict';
const async = require('async');

module.exports = function(app) {
  var {CrcmUser, Role, RoleMapping} = app.models;

  app.dataSources.mongodb.automigrate('CrcmUser', function(err) {
    if (err) throw err;
    let usersToCreate = [
      {
        username: 'configurer',
        email: 'configurer@configurer.com',
        password: '1234',
      },
      {
        username: 'client',
        email: 'client@client.com',
        password: '1234',
      },
    ];

    function makeConfigurer(user, callback) {
      async.waterfall([
        function(cb) {
          let q = {
            where: {
              name: 'configurer',
            },
          };
          let obj = {name: 'configurer'};

          Role.findOrCreate(q, obj, (err, role, created) => {
            if (err) return cb(err);
            // stop if already initialized
            if (!created) err = true;
            cb(err, role);
          });
        },
        function(role, cb) {
          role.principals.create({
            principalType: RoleMapping.USER,
            principalId: user.id,
          }, (err, principal) => {
            console.log('created role configurer', role, principal);
            cb(err);
          });
        },
      ], (err) => {
        if (err && err !== true) return callback(err);
        callback(null);
      });
    }
    function makeClient(user, callback) {
      async.waterfall([
        function(cb) {
          let q = {
            where: {
              name: 'client',
            },
          };
          let obj = {name: 'client'};

          Role.findOrCreate(q, obj, (err, role, created) => {
            if (err) return cb(err);
            // stop if already initialized
            if (!created) err = true;
            cb(err, role);
          });
        },
        function(role, cb) {
          role.principals.create({
            principalType: RoleMapping.USER,
            principalId: user.id,
          }, (err, principal) => {
            console.log('created role client', role, principal);
            cb(err);
          });
        },
      ], (err) => {
        if (err && err !== true) return callback(err);
        callback(null);
      });
    }

    async.waterfall([
      function(cb) {
        let q = {
          where: {
            or: [
              {username: 'configurer'},
              {username: 'client'},
            ],
          },
        };
        CrcmUser.findOrCreate(q, usersToCreate, (err, users, created) => {
          console.log('Created users:', users, created);
          if (err) return cb(err);
          // stop if already initialized
          if (!created) err = true;
          cb(err, users);
        });
      },
      function(users, cb) {
        makeConfigurer(users[0], (err) => {
          cb(err, users);
        });
      },
      function(users, cb) {
        makeClient(users[1], cb);
      },
    ], (err) => {
      if (err && err !== true) throw err;
    });
  });
};
