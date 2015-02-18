/* jshint unused:true, node:true */
"use strict";

var irc = require('./protocol');
var Gitter = require('node-gitter');

// Commands currently supported by IRCd.js

// PONG: function() 
// PING: function() 
// PASS: function(password) 
// AWAY: function(message) 
// VERSION: function() 
// TIME: function() 
// NICK: function(nick) 
// USER: function(username, hostname, servername, realname) 
// JOIN: function(channelNames, key) 
// PART: function(channelName) 
// KICK: function(channels, users, kickMessage) 
// TOPIC: function(channelName, topic) 
// PRIVMSG: function(target, message) 
// INVITE: function(nick, channelName) 
// MODE: function(target, modes, arg) 
// LIST: function(targets) 
// NAMES: function(targets) 
// WHO: function(target) 
// WHOIS: function(nickmask) 
// WHOWAS: function(nicknames, count, serverName) 
// OPER: function(name, password) 
// QUIT: function(message) 
// MOTD: function() 

var gitterAdapter = function(client) {

  var gitter;

  client.on('PING', function() {
    client.send(['PING', 'gitter.im', ':gitter.im']);
  })

  client.on('PONG', function() {
  });

  client.on('NICK', function(nick) {
    client.nick = nick;
    client.send([client.mask(), 'NICK', ':' + nick]);
  })

  client.on('USER', function(username, hostname, servername, realname) {
    console.log('USER', username, hostname, servername, realname);
  })

  client.on('PASS', function(password) {
    var gitter = new Gitter(password);
  });

  client.on('JOIN', function(channelNames, key) {
    var channels = channelNames.replace('#', '').split(',');

    channels.forEach(function(chan) {
      gitter.rooms.join(chan)
      .then(function(room) {
        // TODO notify other users in the channel
        //channel.users.forEach(function(channelUser) {
        //  channelUser.send(user.mask, 'JOIN', channel.name);
        //});

        client.send('gitter.im', irc.reply.topic, client.nick, chan, ':' + room.topic);
        client.send('gitter.im', irc.reply.nameReply, client.nick, channel.type, channel.name, ':' + channelUsers.join(' '));
        client.send('gitter.im', irc.reply.endNames, client.nick, channel.name, ':End of /NAMES list.');
      })
    });
  });

}

module.exports = gitterAdapter;
