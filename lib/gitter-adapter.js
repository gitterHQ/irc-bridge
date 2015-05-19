/* jshint unused:true, node:true */
"use strict";

var debug     = require('debug')('irc-gitter-adapter');
var irc       = require('./protocol');
var Gitter    = require('node-gitter');
var manifest  = require('../package.json');
var VERSION   = manifest.version;
var DATE      = Date();

var log = console.log;

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
    LIST:     this.listRooms,
    MOTD:     this.messageOfTheDay
  };

  Object.keys(commands).map(function(cmd) {
    this.client.on(cmd, commands[cmd].bind(this));
  }.bind(this));
};

Adapter.prototype.listenForOneToOnes = function() {
  var c = this.client;

  var handleNotification = function(msg) {
    if (msg.notification !== 'user_notification') return;

    this.gitterClient.rooms.find(msg.troupeId)
    .then(function(room) {
      if (!room.oneToOne) return;
      var nick = room.user.username;
      var mask = ':' + nick + '!' + nick + '@irc.gitter.im';
      msg.text.split('\n').forEach(function(line) { 
        c.send(mask, 'PRIVMSG', c.nick, ':' + line); 
      });
    }.bind(this))
    .catch(function(err) {
      log('Error handling user_notification', this.user.username, err);
      log(err.stack);
    });
  };

  this.oneToOneSub = this.gitterClient.faye.client.subscribe('/api/v1/user/' + this.user.id, handleNotification.bind(this));
};

Adapter.prototype.setup = function(token) {
  var c = this.client;

  // TODO move this to a config file
  var opts = {};
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
    log('Authentication failed for token ', token);
    var mask = ':gitter!gitter@irc.gitter.im';
    c.send(mask, 'PRIVMSG', 'gitter', ': Authentication failed. Get a valid token from https://irc.gitter.im');
    this.quit();
  }.bind(this));
};

Adapter.prototype.subscribeToRoom = function(room) {
  var c = this.client;
  var uri = (room.uri || room.name).toLowerCase();

  debug('Subscribing to room ' + uri);

  if (this.rooms[uri]) return;

  this.rooms[uri] = room;
  room.subscribe();

  room.on('chatMessages', function(evt) {
    if (['create','update'].indexOf(evt.operation) === -1) return;

    var message = evt.model;
    var nick = message.fromUser.username;
    if (nick === c.nick) return; // User's own message

    var mask = ':' + nick + '!' + nick + '@irc.gitter.im';

    var text;
    message.text.split('\n').forEach(function(line) {
      text = evt.operation === 'update' ? '[edit] ' + line : line;
      c.send(mask, 'PRIVMSG', '#' + room.uri, ':' + text);
    });

    this.user.markAsRead(room.id, [message.id]);
  }.bind(this));

  room.on('events', function(evt) {
    if (evt.operation !== 'create') return;
    var message = evt.model;
    var mask = ':gitter!gitter@irc.gitter.im';

    c.send(mask, 'PRIVMSG', '#' + room.uri, ':' + message.text);
  }.bind(this));

  room.on('users', function(evt) {
    var nick, mask;
    if (evt.operation === 'create') {
      nick = evt.model.username;
      mask = ':' + nick + '!' + nick + '@irc.gitter.im';
      c.send(mask, 'JOIN', '#' + room.uri);
    }
    if (evt.operation === 'remove') {
      nick = evt.model.username;
      mask = ':' + nick + '!' + nick + '@irc.gitter.im';
      c.send(mask, 'PART', '#' + room.uri);
    }
  });

};

Adapter.prototype.sendMessage = function(target, message) {
  var c = this.client;
  var uri = target.replace('#','');
  var isStatus = /^\u0001ACTION/.test(message);

  // This are /me IRC messages.
  if (isStatus) {
    message = message
    .replace(/^\u0001ACTION /, '@' + c.nick + ' ')
    .replace(/\u0001$/, '');
  }

  this.gitterClient.rooms.join(uri)
  .then(function(room) {
    return isStatus ? room.sendStatus(message) : room.send(message);
  })
  .catch(function(err){
    log('Error sending message to ', uri, err);
    log(err.stack);
  });
};

Adapter.prototype.nick = function(nick) {
  var c = this.client;
  c.send(c.mask(), 'NICK', ':' + c.nick);
};

Adapter.prototype.register = function(username, hostname, servername, realname) {
  var c = this.client;
  c.send(c.host, irc.reply.welcome, c.nick, 'Gitter', c.mask());
  c.send(c.host, irc.reply.yourHost, c.nick, 'Version:', VERSION);
  c.send(c.host, irc.reply.created, c.nick, 'Created on', DATE);
  c.send(c.host, irc.reply.myInfo, c.hostname, VERSION, 'wo', 'ntr');
  this.messageOfTheDay();
};

Adapter.prototype.joinRooms = function(channels, key) {
  channels.split(',').map(this.joinRoom.bind(this));
};

Adapter.prototype.joinRoom = function(channel) {
  var c     = this.client;
  var uri   = channel.replace('#','');

  this.gitterClient.rooms.join(uri)
  .then(function(room) {
    if (room.oneToOne) throw('Room is one-to-one');
    return [room, room.users()];
  })
  .spread(function(room, users) {
    var _channel = '#' + room.uri;
    var channelType = '*'; // TODO set right type -> * private, @ secret, = public

    var usernames = users.map(function(u) { return u.username; });
    usernames.push( config.irc.user ); // Fake gitter user for Events

    c.send(c.mask(), 'JOIN', _channel);
    c.send(c.host, irc.reply.topic,     c.nick, _channel, ':' + room.topic);
    c.send(c.host, irc.reply.nameReply, c.nick, channelType, _channel, ':' + usernames.join(' '));
    c.send(c.host, irc.reply.endNames,  c.nick, _channel, ': /NAMES');

    return room;
  })
  .then(this.subscribeToRoom.bind(this))
  .catch(function(err) {
    c.send(c.host, irc.errors.noSuchChannel, ': Invalid channel or insufficient permissions');
    log('Error joining room ', uri, err);
    log(err.stack);
  });
};

Adapter.prototype.leaveRooms = function(channels, key) {
  channels.split(',').map(this.leaveRoom.bind(this));
};

Adapter.prototype.leaveRoom = function(channel) {
  var uri = channel.replace('#','').toLowerCase();
  this.client.send(this.client.mask(), 'PART', channel);
  this._unsubscribe(uri);
};

Adapter.prototype.listUsers = function(channel, key) {
  var c = this.client;

  if (channel === undefined) {
    c.send(c.mask(), 'WHO', ':');
    return;
  }
  if (channel.charAt(0) !== '#') {
    c.send(c.mask(), 'WHO', ':' + channel);
    return;
  }
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
  .catch(function(err) {
    log('Error listing users for ', uri, err);
    log(err.stack);
    c.send(c.host, irc.errors.noSuchChannel, c.nick, ':No such channel');
  });
};

Adapter.prototype.listRooms = function() {
  var c = this.client;

  this.gitterClient.currentUser()
  .then(function(user) {
    return user.rooms();
  })
  .then(function(rooms) {
    c.send(c.host, irc.reply.listStart, c.nick, 'Channel', ':Users Name');

    rooms.forEach(function(room) {
      if (room.oneToOne) return; // Do not show 1-to-1 chats
      c.send(c.host, irc.reply.list, c.nick, '#' + room.uri, room.userCount, ': ' + room.topic);
    });

    c.send(c.host, irc.reply.listEnd, c.nick, ':End of /LIST');
  });
};

Adapter.prototype.messageOfTheDay = function() {
  var c = this.client;

  c.send(c.host, irc.reply.motdStart, c.nick, ':- Message of the Day -');
  c.send(c.host, irc.reply.motd,      c.nick, 'Welcome To Gitter IRC!');
  c.send(c.host, irc.reply.motd,      c.nick, 'Info at https://irc.gitter.im');
  c.send(c.host, irc.reply.motd,      c.nick, 'Code at https://github.com/gitterHQ/irc-bridge');
  c.send(c.host, irc.reply.motdEnd,   c.nick, ':End of /MOTD command.');
};

Adapter.prototype.quit = function() {
  this.client.disconnect();
};

Adapter.prototype._unsubscribe = function(uri) {
  if (!this.rooms[uri]) return;

  this.rooms[uri].unsubscribe();
  this.rooms[uri].removeAllListeners();
  delete this.rooms[uri];
};

Adapter.prototype._teardown = function() {
  if (this.oneToOneSub) this.oneToOneSub.cancel();
  Object.keys(this.rooms).map(this._unsubscribe.bind(this));
  if (this.gitterClient) this.gitterClient.faye.client.disconnect();
};

module.exports = Adapter;
