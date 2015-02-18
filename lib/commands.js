PONG: function(user) {
PING: function(user) {
PASS: function(user, password) {
AWAY: function(user, message) {
VERSION: function(user) {
TIME: function(user) {
NICK: function(user, nick) {
USER: function(user, username, hostname, servername, realname) {
JOIN: function(user, channelNames, key) {
PART: function(user, channelName) {
KICK: function(/*user, channels, users, kickMessage*/) {
TOPIC: function(user, channelName, topic) {
PRIVMSG: function(user, target, message) {
INVITE: function(user, nick, channelName) {
MODE: function(/*user, target, modes, arg*/) {
LIST: function(user, targets) {
NAMES: function(user, targets) {
WHO: function(user, target) {
WHOIS: function(user, nickmask) {
WHOWAS: function(/*user, nicknames, count, serverName*/) {
OPER: function(/*user, name, password*/) {
QUIT: function(user, message) {
MOTD: function(user) {
