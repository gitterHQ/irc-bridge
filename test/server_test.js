var assert  = require('assert');
var net     = require('net');

var Server = require('../lib/server.js');

var IRCPORT = 9876;
var WEBPORT = 5432;

describe('Server', function(){
  it('should allow incoming connections on a given port', function(done) {
    var server = new Server();
    server.start({irc: IRCPORT, web: WEBPORT});

    var client = net.connect({port: IRCPORT});
    client.on('end', done);
    client.end();
  });
});
