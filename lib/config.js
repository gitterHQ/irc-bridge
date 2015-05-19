/* jshint unused:true, node:true */
"use strict";

var config = {}

config.hostname 	= process.env.DEBUG ? "localhost" : "irc.gitter.im";
// '&& false' because of no 'faye'
config.gitter		= process.env.DEBUG && false ? {client: {host: "localhost", port: 5000, prefix: true}, faye: {host: 'http://localhost:5000/faye'}} : {};

config.irc 			= { hostname : 'irc.gitter.im', user : 'gitti' };

module.exports = config;