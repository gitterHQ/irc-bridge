var assert  = require('assert');
var events  = require('events');
var net     = require('net');
var sinon   = require('sinon');

var Client = require('../lib/client.js');
var Adapter = require('../lib/gitter-adapter.js');

describe('Gitter Adapter', function(){
  it('should disconect the client on QUIT', function(done) {
    var client = new Client(new net.Socket());
    var stub = sinon.stub(client, 'teardown', function(msg) {
      done();
    });

    var adapter = new Adapter(client);
    client.emit('QUIT');
  });
});
