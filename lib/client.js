/* jshint unused:true, node:true */
"use strict";

var util        = require('util');
var events      = require('events');
var carrier     = require('carrier');
var ircMessage  = require('irc-message');

var pingInterval = 30*1000;

// The Client handles a single socket client,
// parses each line and emits an event when an
// IRC command is received.
function Client(socket) {
  events.EventEmitter.call(this);

  this.socket = socket;
  this.socket.on('end',   this.teardown.bind(this));
  this.socket.on('error', this.teardown.bind(this));

  this.carry = carrier.carry(socket);
  this.carry.on('line', this.parse.bind(this));

  this.pingInterval = setInterval(this.ping.bind(this), pingInterval);

  // TODO Get network and hostname from a config file
  this.network  = 'Gitter';
  this.hostname = 'gitter.im';
  this.host     = ':' + this.hostname;

  this.username = null;
  this.nick     = null;

  // By default the Client is not authenticated
  // and received commands are queued
  this.authed = false;
  this.queue  = [];
}

util.inherits(Client, events.EventEmitter);

Client.prototype.parse = function(line) {
  console.log('[received]', line);
  var msg = ircMessage.parseMessage(line);
  if (this.authed || msg.command.match(/pass/i)) {
    this.emit.apply(this, [msg.command.toUpperCase()].concat(msg.params));
  } else {
    this.queue.push(msg);
  }
}

Client.prototype.authenticate = function() {
  this.authed = true;
  this.queue.forEach(function(msg) {
    this.emit.apply(this, [msg.command.toUpperCase()].concat(msg.params));
  }.bind(this));
}

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
    while (chunks.length) {
      chunk.push(chunks.shift());
      var _chunk = ':' + command + ':' + chunk.join(' ') + '\r\n';
      if (_chunk.length > 450 || !chunks.length) {
        this.socket.write(_chunk);
        chunk = []; // start another chunk
      }
    }
  } else {
    this.socket.write(message + '\r\n');
  }
}

Client.prototype.mask = function() {
  return ':' + this.nick + '!' + this.username + '@' + this.hostname;
}

Client.prototype.ping = function() {
  this.emit('PING');
}

Client.prototype.teardown = function() {
  this.socket.end();
  clearInterval(this.pingInterval);
  this.emit('disconnected');
}

module.exports = Client;
