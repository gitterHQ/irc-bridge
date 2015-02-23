/* jshint unused:true, node:true */
"use strict";

var net = require('net');
var Client = require('./client');
var GitterAdapter = require('./gitter-adapter');

// The server handles incoming TCP connections and
// instantiates a Client to handle each connection
function Server() {}

Server.prototype.start = function(port) {
  var server = net.createServer(this.connectionListener);
  server.listen(port);

  // TODO Handle signals
  //process.on('SIGHUP', function() {})
  //process.on('SIGTERM', function() {})
}
    
Server.prototype.connectionListener = function(conn) {
  var client  = new Client(conn);
  var adapter = new GitterAdapter(client);

  client.on('disconnected', function() {
    console.log('Client disconnected');
    adapter = null;
    client.removeAllListeners();
    client = null;
  });
}

module.exports = Server;
