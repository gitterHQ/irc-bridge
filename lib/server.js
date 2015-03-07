/* jshint unused:true, node:true */
"use strict";

var debug = require('debug')('irc-server');
var net = require('net');
var Q = require('q');
var Client = require('./client');
var dashboard = require('../dashboard');

// The server handles incoming TCP connections and
// instantiates a Client to handle each connection
function Server(adapter) {
  this.clients = {};
  this.adapter = adapter;
}

Server.prototype.start = function(ports) {
  var deferred = Q.defer();

  var server = net.createServer(this.connectionListener.bind(this));
  server.listen(ports.irc, function() {
    debug('IRC server listening on ' + ports.irc);

    deferred.resolve(server);
  }.bind(this));

  dashboard(this, ports.web);

  process.on('SIGTERM', this.stop.bind(this));
  process.on('SIGINT',  this.stop.bind(this));

  return deferred.promise;
};

Server.prototype.stop = function() {
  debug('Stopping...');

  // If all clients have disconnected, exit with status 0
  setInterval(function() {
    if (Object.keys(this.clients).length === 0) process.exit(0);
  }.bind(this), 100);

  // Force shutdown after 2.5s
  setTimeout(function() {
    debug('Failed to disconnect all the clients');
    process.exit(1);
  }, 2500);

  // Disconnect all clients
  Object.keys(this.clients).map(function(uuid) {
    this.clients[uuid].disconnect({notify: true});
  }.bind(this));
};
    
Server.prototype.connectionListener = function(conn) {

  var client  = new Client(conn);
  var adapter = this.adapter.call(Object.create(this.adapter.prototype), client);

  debug('Client connected ' + client.uuid);
  this.clients[client.uuid] = client; 

  client.on('disconnected', function() {
    debug('Client disconnected ' + client.uuid);
    adapter = null;
    client.removeAllListeners();
    delete this.clients[client.uuid];
  }.bind(this));
};

module.exports = Server;
