var assert  = require('assert');
var events  = require('events');
var net     = require('net');

var Client = require('../lib/client.js');

describe('Client', function(){
  it('should be an event emitter', function() {
    var mockSocket = new events.EventEmitter();
    var client = new Client(mockSocket);
    assert(client instanceof events.EventEmitter);
  });
});
