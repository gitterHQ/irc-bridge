var express = require('express');

var debug = require('debug')('irc-dashboard');
var app = express();
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.get('/', function(req,res) {
  var clients = Object.keys(app.irc.clients).map(function(uuid) { return app.irc.clients[uuid]; });
  res.render('clients', {clients: clients});
});

app.get('/users/:uuid', function(req,res) {
  var client = app.irc.clients[req.params.uuid];
  if (!client) return res.status(404).send('Not Found');
  res.render('client', {client: client});
});


function hook(ircServer, port) {
  app.irc = ircServer;
  app.listen(port, function(err) {
    debug('Dashboard listening on ' + port);
  });
}

module.exports = hook;
