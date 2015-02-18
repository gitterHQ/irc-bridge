var assert  = require('assert')
var net     = require('net');

var Server = require('../lib/server.js');

var port = 9876;

describe('Server', function(){
  it('should allow incoming connections', function(done) {
    var server = new Server;
    server.start(port);

    var client = net.connect({port: PORT});
    client.on('end', done);
    client.end();
  })
})

