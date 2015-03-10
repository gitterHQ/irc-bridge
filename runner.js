/* jshint unused:true, node:true */
"use strict";

var IRCPORT = process.env.IRCPORT || 6667;
var WEBPORT = process.env.WEBPORT || 4567;

var Server   = require('./lib/server');

require('v8-profiler');

var server = new Server();
server.start({irc: IRCPORT, web: WEBPORT});
