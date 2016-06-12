var assert  = require('assert');
var EventEmitter = require('eventemitter3');
var net     = require('net');
var sinon   = require('sinon');

var Client = require('../lib/client.js');

describe('Client', function(){
  it('should be an event emitter', function() {
    var socket = new net.Socket();
    var client = new Client(socket);
    assert(client instanceof EventEmitter);
  });

  it('should emit PASS command even if not authenticated', function(done) {
    var socket = new net.Socket();
    var client = new Client(socket);

    client.on('PASS', function(channels) {
      done();
    });

    client.parse('PASS 123token456');
  });


  it('should emit after parsing an IRC message', function(done) {
    var socket = new net.Socket();
    var client = new Client(socket);
    client.authenticated = true;

    client.on('JOIN', function(channels) {
      done();
    });

    client.parse('JOIN #test');
  });

  it('should send valid messages', function(done) {
    var socket = new net.Socket();
    var stub = sinon.stub(socket, 'write', function(msg) {
      assert(msg === "PING hostname host\r\n");
      done();
    });

    var client = new Client(socket);
    client.send('PING', 'hostname', 'host');
  });

  it('should shutdown properly', function() {
    var socket = new net.Socket();
    var spy = sinon.spy();
    var stub = sinon.stub(socket, 'end', spy);
    var client = new Client(socket);

    client.disconnect();
    sinon.assert.called(spy);
  });

  it('should process queue after authenticated', function() {
    var socket = new net.Socket();
    var client = new Client(socket);
    var spy = sinon.spy();

    client.parse('NICK foo');
    client.parse('NICK foo');
    client.on('NICK', spy);
    client.authenticate({username: 'foo'});
    sinon.assert.calledTwice(spy);
  });

  it('should split long messages', function(done) {
    var socket = new net.Socket();

    var prefixes = ':source PRIVMSG target :';
    var prefix_len = prefixes.length;
    var message_index = 0;
    var messages = [
      // two messages with normal-ish spacing and colons
      'first message: ' + Array(450).join('a') + ' ',
      'second message ' + Array(450).join('a') + ' ',
      // two messages with one long word with no spaces
      Array(510 - prefix_len + 1).join('a'),
      Array(510 - prefix_len + 1).join('a')
    ]

    var stub = sinon.stub(socket, 'write', function(msg) {
      assert.equal(msg, prefixes + messages[message_index++].trim() + "\r\n");
      if (message_index == messages.length) {
        done();
      }
    });

    var client = new Client(socket);
    client.send(':source', 'PRIVMSG', 'target', ':' + messages.join(''));
  });

});
