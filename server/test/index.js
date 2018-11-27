'use strict';
const expect = require('chai').expect;
const req = require('supertest');

const MongoClient = require('mongodb').MongoClient;

// Connection URL
const URL = 'mongodb://localhost:27017';

// Database Name
const DB_NAME = 'crcm';

// Create a new MongoClient
const client = new MongoClient(URL);

const SHORT_TIMEOUT = 5000;

var app = null;
describe('testing app', function() {
  this.timeout(SHORT_TIMEOUT);

  before(function(done) {
    app = require('../server.js');

    app.on('started', function(...args) {
      console.log('test startttttted', args);

      client.connect(function(err) {
        expect(err).to.be.null;
        console.log('Connected successfully to mongodb server');
        done();
      });
    });

    app.on('booted', function(...args) {
      console.log('test booted', args);
      app.start();
    });
  });

  after(function(done) {
    console.log('closing connection to db');
    client.close();
    done();
    setTimeout(() => {
      process.exit();
    }, 1000);
  });

  it('should upload a file correctly', function(done) {
    // TODO
    done();
  });
});

