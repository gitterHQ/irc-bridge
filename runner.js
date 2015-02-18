/* jshint unused:true, node:true */
"use strict";

var Server = require('./lib/server');

var server = new Server();

// TODO: Handle signals
//process.on('SIGHUP', function() {})
//process.on('SIGTERM', function() {})

server.start(process.env.PORT || 6667);
