'use strict';

function empty() {
}

function Adapter(client) {
  this.client = client;

  // Keep track of the active rooms
  this.rooms = {};

  var commands = {
    PASS   : empty,
    PRIVMSG: empty,
    QUIT   : empty,
    NICK   : empty,
    USER   : empty,
    JOIN   : empty,
    PART   : empty,
    WHO    : empty,
    LIST   : empty,
    MOTD   : empty
  };

  Object.keys(commands).map(function (cmd) {
    this.client.on(cmd, commands[cmd].bind(this));
  }.bind(this));

  this.init();
}

Adapter.prototype.init = function () {
};

module.exports = Adapter;
