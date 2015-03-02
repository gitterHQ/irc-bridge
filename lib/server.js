/* jshint unused:true, node:true */
"use strict";

var debug = require('debug')('irc-server');
var net = require('net');
var Client = require('./client');
var GitterAdapter = require('./gitter-adapter');
var dashboard = require('../dashboard');

// The server handles incoming TCP connections and
// instantiates a Client to handle each connection
function Server() {
  this.clients = {};
}

Server.prototype.start = function(ports) {
  var server = net.createServer(this.connectionListener.bind(this));
  server.listen(ports.irc, function() {
    debug('IRC server listening on ' + ports.irc);
  });

  dashboard(this, ports.web);

  process.on('SIGTERM', function() {
    debug('SIGTERM received');
    this.clients.map(function(c) { c.teardown(); });
    setTimeout(this.stop, 1000);
  });
};

Server.prototype.stop = function() {
  process.exit(0);
};
    
Server.prototype.connectionListener = function(conn) {
  debug('Client connected');

  var client  = new Client(conn);
  var adapter = new GitterAdapter(client);

  this.clients[client.uuid] = client; 

  client.on('disconnected', function() {
    debug('Client disconnected');
    adapter = null;
    client.removeAllListeners();
    client = null;
  });
};

module.exports = Server;
