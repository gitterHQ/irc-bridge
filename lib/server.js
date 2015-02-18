/* jshint unused:true, node:true */
"use strict";

var net = require('net');
var Client = require('./client');
var gitterAdapter = require('./gitter-adapter');

function Server() {
  this.clients = {};
}

Server.prototype.start = function(port) {
  var server = net.createServer(this.connectionListener);
  server.listen(port);
}
    
Server.prototype.connectionListener = function(conn) {
  try {
    var client = new Client(conn);

    gitterAdapter(client);

    client.on('disconnected', function() {
      client.removeAllListeners();
      client = null;
    });
  
  } catch (err) {
    console.log("FATAL:", err, err.stack)
    throw err;
  }
}

module.exports = Server;
