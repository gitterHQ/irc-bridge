/* jshint unused:true, node:true */
"use strict";

var debug     = require('debug')('irc-server');
var net       = require('net');
var Client    = require('./client');
var dashboard = require('../dashboard');
var GitterAdapter = require('./gitter-adapter');

// The server handles incoming TCP connections and
// instantiates a Client to handle each connection
function Server() {
  this.clients = {};
}

Server.prototype.start = function(ports, cb) {
  this._instance = net.createServer(this.connectionListener.bind(this));
  this._instance.listen(ports.irc, function() {
    debug('IRC server listening on ' + ports.irc);
    if (cb) cb();
  });

  dashboard(this, ports.web);

  process.on('SIGTERM', this.exit.bind(this));
  process.on('SIGINT',  this.exit.bind(this));
};

Server.prototype.connectionListener = function(conn) {
  var client  = new Client(conn);
  this.clients[client.uuid] = client;

  var adapter = new GitterAdapter(client);

  var _close = function() {
    adapter._teardown();
    client._teardown();
    delete this.clients[client.uuid];
  };

  conn.on('end',      _close.bind(this));
  conn.on('error',    _close.bind(this));
  conn.on('timeout',  _close.bind(this));
};

Server.prototype.stop = function(cb) {
  debug('Stopping server');
  cb = cb || function() {};

  // If all clients have disconnected, exit with status 0
  setInterval(function() {
    if (Object.keys(this.clients).length === 0) this._instance.close(cb);
  }.bind(this), 100);

  // Force shutdown after 2.5s
  setTimeout(function() {
    this._instance.close(cb);
  }, 2500);

  // Disconnect all clients gracefully
  Object.keys(this.clients).map(function(uuid) {
    this.clients[uuid].disconnect({msg: 'Server stopping.'});
  }.bind(this));
};

Server.prototype.exit = function() {
  this.stop(function(err) {
    if (err) debug(err.message);
    process.exit(err ? 1 : 0);
  });
};
    
module.exports = Server;
