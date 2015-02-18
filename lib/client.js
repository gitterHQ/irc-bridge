/* jshint unused:true, node:true */
"use strict";

var util        = require('util');
var events      = require('events');
var carrier     = require('carrier');
var ircMessage  = require('irc-message');

var pingInterval = 5*1000;

function Client(socket) {
  events.EventEmitter.call(this);

  this.socket = socket;
  this.socket.on('end',   this.teardown.bind(this));
  this.socket.on('error', this.teardown.bind(this));

  this.carry  = carrier.carry(socket);
  this.carry.on('line', this.parse.bind(this));

  this.pingInterval = setInterval(this.ping.bind(this), pingInterval);

  this.nick     = 'foo';
  this.username = 'foo';
  this.hostname = 'bar';
}

util.inherits(Client, events.EventEmitter);

Client.prototype.parse = function(line) {
  console.log('[received]', line);
  var msg = ircMessage.parseMessage(line);
  // queue unauthed messages
  this.emit.apply(this, [msg.command].concat(msg.params));
}

Client.prototype.mask = function() {
  return ':' + this.nick + '!' + this.username + '@' + this.hostname;
},

Client.prototype.ping = function() {
  this.emit('PING');
}

Client.prototype.send = function(msg) {
  var message = msg.join(' ');
  console.log('[sent]', message);
  this.socket.write(msg.join(' ') + '\r\n');
}

Client.prototype.teardown = function() {
  this.socket.end();
  clearInterval(this.pingInterval);
  this.emit('disconnected');
}

module.exports = Client;
