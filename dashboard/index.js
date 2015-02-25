var express = require('express');

var app = express();
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.get('/', function(req,res) {
  var clients = Object.keys(app.irc.clients).map(function(uuid) { return app.irc.clients[uuid]; });
  res.render('clients', {clients: clients});
});

function hook(server) {
  app.irc = server;
  app.listen(4567);
}

module.exports = hook;
