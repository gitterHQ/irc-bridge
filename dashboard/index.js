var express = require('express');

var debug = require('debug')('irc-dashboard');
var app = express();
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.get('/', function(req,res) {
  var clients = Object.keys(app.irc.clients).map(function(uuid) { return app.irc.clients[uuid]; });
  res.render('clients', {clients: clients});
});

function hook(ircServer, port) {
  app.irc = ircServer;
  app.listen(port, function(err) {
    debug('Dashboard listening on ' + port);
  });
}

module.exports = hook;
