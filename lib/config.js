/* jshint unused:true, node:true */
"use strict";

var config = {}

config.hostname 	= process.env.DEV ? "localhost" : "irc.gitter.im";
config.user			= 'gitter';
// '&& false' because of no 'faye'
config.gitter		= process.env.DEV && false ? {client: {host: "localhost", port: 5000, prefix: true}, faye: {host: 'http://localhost:5000/faye'}} : {};

config.irc 			= { hostname : config.hostname, user : config.user };

module.exports = config;