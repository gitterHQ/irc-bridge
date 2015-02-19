var assert  = require('assert')
var net     = require('net');

var Server = require('../lib/server.js');

var PORT = 9876;

describe('Server', function(){
  it('should allow incoming connections on a given port', function(done) {
    var server = new Server;
    server.start(PORT);

    var client = net.connect({port: PORT});
    client.on('end', done);
    client.end();
  });
});
