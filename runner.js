/* jshint unused:true, node:true */
"use strict";

var memwatch = require('memwatch');
var Server = require('./lib/server');

memwatch.on('leak', function(info) {
  console.log('[memwatch]', info.growth, info.reason);
});

var server = new Server();
server.start(process.env.PORT || 6667);
