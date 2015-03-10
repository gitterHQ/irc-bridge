/* jshint unused:true, node:true */
"use strict";

var debug         = require('debug')('irc-client');
var util          = require('util');
var EventEmitter  = require('eventemitter3');
var carrier       = require('carrier');
var ircMessage    = require('irc-message');
var uuid          = require('uuid');

// The Client handles a single socket client,
// parses each line and emits an event when an
// IRC command is received.
function Client(socket) {
  EventEmitter.call(this);

  this.uuid = uuid.v1();
  this.socket = socket;

  this.carry = carrier.carry(socket);
  this.carry.on('line', this.parse.bind(this));

  // TODO Get network and hostname from a config file
  this.hostname = 'irc.gitter.im';
  this.host     = ':' + this.hostname;

  this.user = null;
  this.nick = null;

  // By default the Client is not authenticated
  // and received commands are queued
  this.authenticated = false;
  this.queue = [];

  this.keepAlive();
}

util.inherits(Client, EventEmitter);

// https://tools.ietf.org/html/rfc2812#section-3.7.2
Client.prototype.keepAlive = function() {
  var pingInterval = 30 * 1000;
  var connectionTimeout = pingInterval * 2;

  var ping = function() {
    this.send('PING', this.hostname);
  };

  var pong = function() {
    this.send('PONG', this.hostname);
  };

  var refreshConnectionTimeout = function() {
    clearTimeout(this.connectionTimeout);
    this.connectionTimeout = setTimeout(this.disconnect.bind(this), connectionTimeout);
  };

  this.pingInterval = setInterval(ping.bind(this), pingInterval);
  this.connectionTimeout = setTimeout(this.disconnect.bind(this), connectionTimeout);

  this.on('PONG', refreshConnectionTimeout.bind(this));
  this.on('PING', pong.bind(this));
};

Client.prototype.parse = function(line) {
  debug('Rx: ' + line);
  var msg = ircMessage.parseMessage(line);
  if (this.authenticated || msg.command.match(/pass/i)) {
    this.emit.apply(this, [msg.command.toUpperCase()].concat(msg.params));
  } else {
    this.queue.push(msg);
  }
};

Client.prototype.authenticate = function(user) {
  this.nick = user.username;
  this.authenticated = true;
  this.queue.forEach(function(msg) {
    this.emit.apply(this, [msg.command.toUpperCase()].concat(msg.params));
  }.bind(this));
};

// https://tools.ietf.org/html/rfc1459#section-2.3
Client.prototype.send = function() {
  var args = Array.prototype.slice.call(arguments);
  var message = args.join(' ');

  // Respect IRC line length limit of 512 chars 
  // https://tools.ietf.org/html/rfc2812#section-2.3
  if (message.length > 512) {
    var parts   = message.split(':');
    var command = parts[1];
    var payload = parts[2];

    var chunks = payload.split(' ');
    var chunk = [];
    var _chunk;
    while (chunks.length) {
      chunk.push(chunks.shift());
       _chunk = ':' + command + ':' + chunk.join(' ') + '\r\n';
      if (_chunk.length > 450 || !chunks.length) {
        debug('Tx: ' + _chunk);
        this.socket.write(_chunk);
        chunk = []; // start another chunk
      }
    }
  } else {
    debug('Tx: ' + message);
    this.socket.write(message + '\r\n');
  }
};

Client.prototype.mask = function() {
  return ':' + this.nick + '!' + this.nick + '@' + this.hostname;
};

Client.prototype._teardown = function() {
  this.removeAllListeners();
  clearInterval(this.pingInterval);
  clearTimeout(this.connectionTimeout);
};

Client.prototype.disconnect = function(opts) {
  opts = opts || {};

  if (opts.notify) {
    var mask = ':gitter!gitter@irc.gitter.im';
    this.send(mask, 'PRIVMSG', this.nick, ': Server restarting...');
  }

  this.socket.end();
};

module.exports = Client;
