var assert  = require('assert');
var net     = require('net');

var Server = require('../lib/server.js');

var IRCPORT = 9876;
var WEBPORT = 5432;

describe('Server', function(){
  var server;

  before(function(done) {
    server = new Server();
    server.start({irc: IRCPORT, web: WEBPORT}, done);
  });

  after(function(done) {
    server.stop(done);
  });

  it('should allow keep an index of connected clients', function(done) {
    var client = net.connect({port: IRCPORT});

    client.on('connect', function() {
      assert.equal(1, Object.keys(server.clients).length);
      client.end();
    });

    client.on('data', function() {});

    client.on('close', function() {
      done();
    });
  });

  it('should cleanup after a client disconnects', function(done) {
    var client = net.connect({port: IRCPORT});

    client.on('connect', client.end);

    client.on('data', function() {});

    client.on('close', function() {
      assert.equal(0, Object.keys(server.clients).length);
      done();
    });
  });
});
