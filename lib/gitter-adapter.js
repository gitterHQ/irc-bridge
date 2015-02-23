/* jshint unused:true, node:true */
"use strict";

var irc       = require('./protocol');
var Gitter    = require('node-gitter');
var manifest  = require('../package.json');
var VERSION   = manifest.version;
var DATE      = Date();

function Adapter(client) {
  this.client = client;
  this.channels = {};
  this.hook();
}

// Map IRC commands to adapter functions
Adapter.prototype.hook = function() {
  var commands = {
    PASS:     this.setup,
    PRIVMSG:  this.sendMessage,
    QUIT:     this.quit,
    PING:     this.ping,
    NICK:     this.nick,
    USER:     this.register,
    JOIN:     this.joinRooms,
    PART:     this.leaveRooms,
    WHO:      this.listUsers,
  };

  Object.keys(commands).map(function(cmd) {
    this.client.on(cmd, commands[cmd].bind(this));
  }.bind(this));
}

Adapter.prototype.setup = function(token) {
  this.gitterClient = new Gitter(token, {faye: {host: 'https://ws.gitter.im/faye'}});
  this.gitterClient.currentUser()
  .then(function(user) {
    console.log('Logged in as', user.username);
    this.client.username = user.username;
    this.client.nick     = user.username;
    this.user = user;
    this.client.authenticate();
  }.bind(this))
  .catch(function(err) {
    console.log('Auth failed');
  });
}

Adapter.prototype.subscribeToRoom = function(room) {
  var c = this.client;
  var faye = this.gitterClient.streamClient().client;
  var resource = '/api/v1/rooms/' + room.id + '/chatMessages';

  var subscription = faye.subscribe(resource, function(evt) {
    console.log('evt:', evt);
    if (evt.operation !== 'create') return;
    var message = evt.model;
    var nick = message.fromUser.username;
    if (nick !== c.nick)
      var mask = ':' + nick + '!' + nick + '@gitter.im'
      c.send(mask, 'PRIVMSG', '#' + room.uri, ':' + message.text)
      // TODO mark as unread
  });

  this.channels[room.uri] = subscription;
}

Adapter.prototype.sendMessage = function(target, message) {
  var uri = target.replace('#','');
  this.gitterClient.rooms.join(uri)
  .then(function(room) {
    room.send(message);
  });
};

Adapter.prototype.ping = function() {
  var c = this.client;
  c.send('PING', c.hostname, c.host);
}

Adapter.prototype.nick = function(nick) {
  var c = this.client;
  c.send(c.mask(), 'NICK', ':' + c.nick);
}

Adapter.prototype.register = function(username, hostname, servername, realname) {
  var c = this.client;
  c.send(c.host, irc.reply.welcome, c.nick, c.network, c.mask());
  c.send(c.host, irc.reply.yourHost, c.nick, 'Version:', VERSION);
  c.send(c.host, irc.reply.created, c.nick, 'Created on', DATE);
  c.send(c.host, irc.reply.myInfo, c.hostname, VERSION, 'wo', 'ntr');
  //client.server.motd(this);
}

Adapter.prototype.joinRooms = function(channels, key) {
  channels.split(',').map(this.joinRoom.bind(this));
}

Adapter.prototype.joinRoom = function(channel) {
  var self  = this;
  var c     = this.client;
  var uri   = channel.replace('#','');

  this.gitterClient.rooms.join(uri)
  .then(function(room) {
    if (room.oneToOne) throw('Room is one-to-one');

    var chanType = '*'; // * private, @ secret, = public
  
    return room.users()
    .then(function(users) {
      var usernames = users.map(function(u) { return u.username; });
      usernames.push('gitter');
      c.send(c.mask(), 'JOIN', channel);
      c.send(c.host, irc.reply.topic, c.nick, channel, ':' + room.topic);
      c.send(c.host, irc.reply.nameReply, c.nick, chanType, channel, ':' + usernames.join(' '));
      c.send(c.host, irc.reply.endNames, c.nick, channel, ': /NAMES');
    })
    .then(function() {
      self.subscribeToRoom(room);
    });
  })
  .catch(function(err) {
    c.send(c.host, irc.errors.noSuchChannel, ': Invalid channel or insufficient permissions');
  });
}

Adapter.prototype.leaveRooms = function(channels, key) {
  channels.split(',').map(this.leaveRoom.bind(this));
}

Adapter.prototype.leaveRoom = function(channel) {
  var uri = channel.replace('#','');
  if (this.channels[uri]) this.channels[uri].cancel();
}

Adapter.prototype.listUsers = function(channel, key) {
  var c = this.client;
  var uri = channel.replace('#','');

  this.gitterClient.rooms.join(uri)
  .then(function(room) {
    return room.users();
  })
  .then(function(users) {
    users.forEach(function(user) {
      c.send(c.host, irc.reply.who, c.nick, channel, user.username, c.hostname, c.hostname, user.username, 'H', ':0', user.displayName);
    });
    c.send(c.host, irc.reply.who, c.nick, channel, 'gitter', c.host, c.hostname, 'gitter', 'H', ':0', 'Gitter Bot');

    c.send(c.host, irc.reply.endWho, c.nick, channel, ':End of /WHO list.');
  });
}

Adapter.prototype.quit = function() {
  Object.keys(this.channels).forEach(function(channel) {
    this.channels[channel].cancel();
  }.bind(this));
  this.client.teardown();
}

module.exports = Adapter;
