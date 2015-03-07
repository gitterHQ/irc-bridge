var assert      = require('assert'),
    net         = require('net'),
    sinon       = require('sinon'),
    Server      = require('../lib/server.js'),
    TestAdapter = require('./test-adapter.js');

var IRCPORT = 9876,
    WEBPORT = 5432;

describe('Server', function () {
  var server, _instance;

  before(function (done) {
    server = new Server(TestAdapter);
    server.start({irc: IRCPORT, web: WEBPORT})
        .then(function (instance) {
          _instance = instance;
          done();
        });
  });

  after(function (done) {
    if (_instance) _instance.close();
    done();
  });

  it('should allow incoming connections on a given port', function (done) {
    var client = net.connect({port: IRCPORT}, function () {
      setTimeout(function () {
        var connectedClients = Object.keys(server.clients).length;
        assert.equal(connectedClients, 1, 'Expected a single connected client');

        client.end();
      }, 0);
    });

    client.on('end', function () {
      done();
    });
  });
});

