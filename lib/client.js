/* jshint unused:true, node:true */
"use strict";

var debug         = require('debug')('irc-client');
var audit         = require('debug')('irc-server');
var util          = require('util');
var EventEmitter  = require('eventemitter3');
var carrier       = require('carrier');
var ircMessage    = require('irc-message');
var crypto        = require('crypto');
var chunkString   = require('./chunk-string');


// https://tools.ietf.org/html/rfc2812#section-2.3
var MESSAGE_MAX_LENGTH = 512;
// 512 - CR - LF
var MESSAGE_PIECE_MAX_LENGTH = 510;




// The Client handles a single socket client,
// parses each line and emits an event when an
// IRC command is received.
function Client(socket) {
  EventEmitter.call(this);

  this.uuid = crypto.randomBytes(4).toString('hex');
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

  this.authMessage = setTimeout(function() {
    if (!this.authenticated) {
      this.disconnect({msg: 'You must authenticate, check: https://irc.gitter.im'});
    }
  }.bind(this), 5000);

  this.stats = {};
  this.trackEvent('connected');
}

util.inherits(Client, EventEmitter);

// https://tools.ietf.org/html/rfc2812#section-3.7.2
Client.prototype.keepAlive = function() {
  var pingInterval = 30 * 1000;
  var connectionTimeout = pingInterval * 2;

  var ping = function() {
    this.send('PING', this.host);
  };

  var pong = function() {
    this.send('PONG', this.host);
  };

  var refreshConnectionTimeout = function() {
    clearTimeout(this.connectionTimeout);
    this.connectionTimeout = setTimeout(this.disconnect.bind(this), connectionTimeout);
    this.stats.ping = new Date();
  };

  this.pingInterval = setInterval(ping.bind(this), pingInterval);
  this.connectionTimeout = setTimeout(this.disconnect.bind(this), connectionTimeout);

  this.on('PONG', refreshConnectionTimeout.bind(this));
  this.on('PING', pong.bind(this));
};

Client.prototype.parse = function(line) {
  debug('Rx: ' + line);
  var msg = ircMessage.parseMessage(line);
  if (!msg.command.toUpperCase().match(/^P(I|O)NG/)) this.stats['msg-from-client'] = new Date();

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

  this.trackEvent('authenticated');
};

Client.prototype.trackEvent = function() {
  var args = Array.prototype.slice.call(arguments);
  if (!args.length) return;

  var time = new Date();
  this.stats[args[0]] = time;
  audit.apply(this, [this.uuid, this.nick, time].concat(args));
};

// https://tools.ietf.org/html/rfc1459#section-2.3
Client.prototype.send = function() {
  var args = Array.prototype.slice.call(arguments);
  var message = args.join(' ');

  // Respect IRC line length limit of 512 chars (MESSAGE_MAX_LENGTH)
  // https://tools.ietf.org/html/rfc2812#section-2.3
  if (message.length > MESSAGE_PIECE_MAX_LENGTH) {
    var payload_marker  = message.indexOf(' :');
    var command = message.substr(0, payload_marker) + ' :';
    var payload = message.substr(payload_marker + 2);

    var payloadChunks = chunkString(payload, MESSAGE_PIECE_MAX_LENGTH - command.length);
    payloadChunks.forEach(function(payloadChunk) {
      var messageChunk = command + payloadChunk;
      debug('Tx: ' + messageChunk);
      this.socket.write(messageChunk + '\r\n');
    }.bind(this));

  } else {
    debug('Tx: ' + message);
    this.socket.write(message + '\r\n');
  }

  if (!message.toUpperCase().match(/^P(I|O)NG/)) this.stats['msg-to-client'] = new Date();
};

Client.prototype.mask = function() {
  return ':' + this.nick + '!' + this.nick + '@' + this.hostname;
};

Client.prototype._teardown = function() {
  this.trackEvent('disconnected');

  this.removeAllListeners();
  clearTimeout(this.authMessage);
  clearInterval(this.pingInterval);
  clearTimeout(this.connectionTimeout);
};

Client.prototype.disconnect = function(opts) {
  opts = opts || {};

  if (opts.msg) {
    try {
      var mask = ':gitter!gitter@irc.gitter.im';
      this.send(mask, 'PRIVMSG', this.nick, ': ' + opts.msg);
    }
    catch(err) {
      debug('Socket was already closed');
    }
  }

  this.socket.end();
};


module.exports = Client;
