/* jshint unused:true, node:true */
"use strict";

var debug     = require('debug')('irc-gitter-adapter');
var irc       = require('./protocol');
var Gitter    = require('node-gitter');
var manifest  = require('../package.json');
var VERSION   = manifest.version;
var DATE      = Date();

function Adapter(client) {
  this.client = client;

  // Keep track of the active rooms
  this.rooms = {};

  this.hookEvents();
}

// Map IRC commands to adapter functions
Adapter.prototype.hookEvents = function() {
  var commands = {
    PASS:     this.setup,
    PRIVMSG:  this.sendMessage,
    QUIT:     this.quit,
    NICK:     this.nick,
    USER:     this.register,
    JOIN:     this.joinRooms,
    PART:     this.leaveRooms,
    WHO:      this.listUsers,
  };

  Object.keys(commands).map(function(cmd) {
    this.client.on(cmd, commands[cmd].bind(this));
  }.bind(this));
};

Adapter.prototype.listenForOneToOnes = function() {
  function subscribeIfoneToOne(room) {
    if (!room.oneToOne || this.rooms[room.name]) return;

    this.subscribeToRoom(room);
    var mask = ':' + room.name + '!' + room.name + '@gitter.im';
    this.client.send(mask, 'PRIVMSG', room.name, ':' + msg.text);
  }

  function handleNotification(msg) {
    if (msg.notification !== 'user_notification') return;

    this.gitterClient.rooms.find(msg.troupeId)
    .then(subscribeIfoneToOne.bind(this))
    .catch(function(err) {
      debug('Error handling user_notification', err);
    });
  }

  this.gitterClient.faye.client.subscribe('/api/v1/user/' + this.user.id, handleNotification.bind(this));
};

Adapter.prototype.setup = function(token) {
  var opts = {};
  // TODO move this to a config file
  if (process.env.DEV) opts = {client: {host: "localhost", port: 5000, prefix: true}, faye: {host: 'http://localhost:5000/faye'}};
  this.gitterClient = new Gitter(token, opts);
  this.gitterClient.currentUser()
  .then(function(user) {
    debug('Logged in as ' + user.username);
    this.user = user;
    this.client.authenticate(user);
    this.listenForOneToOnes();
  }.bind(this))
  .catch(function(err) {
    debug('Authentication failed', err);
  });
};

Adapter.prototype.subscribeToRoom = function(room) {
  var uri = room.uri || room.name;
  if (this.rooms[uri]) return;

  var c = this.client;

  room.subscribe();

  function channel() {
    return room.oneToOne ? room.name : '#' + room.uri;
  }

  room.on('chatMessages', function(evt) {
    if (evt.operation !== 'create') return;
    var message = evt.model;
    var nick = message.fromUser.username;
    if (nick !== c.nick) {
      var mask = ':' + nick + '!' + nick + '@gitter.im';
      c.send(mask, 'PRIVMSG', channel(), ':' + message.text);
      this.user.markAsRead(room.id, [message.id]);
    }
  }.bind(this));

  room.on('events', function(evt) {
    if (evt.operation !== 'create') return;
    var message = evt.model;
    var mask = ':gitter!gitter@gitter.im';
    c.send(mask, 'PRIVMSG', channel(), ':' + message.text);
    this.user.markAsRead(room.id, [message.id]);
  }.bind(this));

  room.on('users', function(evt) {});

  this.rooms[uri] = room;
};

Adapter.prototype.sendMessage = function(target, message) {
  var uri = target.replace('#','');
  this.gitterClient.rooms.join(uri)
  .then(function(room) {
    room.send(message);
  })
  .catch(function(err){
    debug('Invalid room/user:' + uri);
  });
};

Adapter.prototype.nick = function(nick) {
  var c = this.client;
  c.send(c.mask(), 'NICK', ':' + c.nick);
};

Adapter.prototype.register = function(username, hostname, servername, realname) {
  var c = this.client;
  c.send(c.host, irc.reply.welcome, c.nick, c.network, c.mask());
  c.send(c.host, irc.reply.yourHost, c.nick, 'Version:', VERSION);
  c.send(c.host, irc.reply.created, c.nick, 'Created on', DATE);
  c.send(c.host, irc.reply.myInfo, c.hostname, VERSION, 'wo', 'ntr');
  //client.server.motd(this);
};

Adapter.prototype.joinRooms = function(channels, key) {
  channels.split(',').map(this.joinRoom.bind(this));
};

Adapter.prototype.joinRoom = function(channel) {
  var self  = this;
  var c     = this.client;
  var uri   = channel.replace('#','');

  this.gitterClient.rooms.join(uri)
  .then(function(room) {
    if (room.oneToOne) throw('Room is one-to-one');
    return [room, room.users()];
  })
  .spread(function(room, users) {
    var chanType = '*'; // * private, @ secret, = public
    var usernames = users.map(function(u) { return u.username; });
    usernames.push('gitter'); // Fake gitter user for Events
    c.send(c.mask(), 'JOIN', channel);
    c.send(c.host, irc.reply.topic, c.nick, channel, ':' + room.topic);
    c.send(c.host, irc.reply.nameReply, c.nick, chanType, channel, ':' + usernames.join(' '));
    c.send(c.host, irc.reply.endNames, c.nick, channel, ': /NAMES');
    return room;
  })
  .then(function(room) {
    self.subscribeToRoom(room);
  })
  .catch(function() {
    c.send(c.host, irc.errors.noSuchChannel, ': Invalid channel or insufficient permissions');
  });
};

Adapter.prototype.leaveRooms = function(channels, key) {
  channels.split(',').map(this.leaveRoom.bind(this));
};

Adapter.prototype.leaveRoom = function(channel) {
  var uri = channel.replace('#','');
  if (this.rooms[uri]) this.rooms[uri].unsubscribe();
  this.client.send(this.client.mask(), 'PART', channel);
};

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
  })  
  .catch(function() {
    c.send(c.host, irc.errors.noSuchChannel, c.nick, ':No such channel');
  });
};

Adapter.prototype.quit = function() {
  Object.keys(this.rooms).forEach(function(channel) {
    this.rooms[channel].unsubscribe();
  }.bind(this));
  this.client.disconnect();
};

module.exports = Adapter;
