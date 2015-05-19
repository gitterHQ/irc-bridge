var assert  = require('assert');
var events  = require('events');
var net     = require('net');
var sinon   = require('sinon');

var Client = require('../lib/client.js');
var Adapter = require('../lib/gitter-adapter.js');

describe('Gitter Adapter', function(){
  var socket, client, adapter;

  beforeEach(function() {
    socket  = new net.Socket();
    client  = new Client(socket);
    adapter = new Adapter(client);
  });

  it('should ignore NICK and return Gitter nick', function() {
    client.authenticated = true;
    client.nick = 'bar'; // obtained after auth
    var spy = sinon.spy();
    var stub = sinon.stub(socket, 'write', spy);
    client.parse('NICK foo');
    assert(spy.calledWith(":bar!bar@irc.gitter.im NICK :bar\r\n"));
  });

  it('should ignore WHO when no parameter is specified', function() {
    client.authenticated = true;
    client.nick = 'bar'; // obtained after auth
    var spy = sinon.spy();
    var stub = sinon.stub(socket, 'write', spy);
    client.parse('WHO');
    assert(spy.calledWith(":bar!bar@irc.gitter.im WHO :\r\n"));
  });

  it('should ignore WHO when a username is specified', function() {
    client.authenticated = true;
    client.nick = 'bar'; // obtained after auth
    var spy = sinon.spy();
    var stub = sinon.stub(socket, 'write', spy);
    client.parse('WHO bar');
    assert(spy.calledWith(":bar!bar@irc.gitter.im WHO :bar\r\n"));
  });
});
