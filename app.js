var nconf = require('nconf');
var express = require('express');

// Use command-line arguments first, then env variables, then defaults
nconf.argv().env().defaults({
  'httpPort': 3000,
});

var app = express();

/*app.get('/', function(req, res) {
  res.send('Hello World!');
  });*/

app.use(express.static('static'));

var port = nconf.get('httpPort');
var server = app.listen(port, function() {
  console.log('Server listening on port %s', server.address().port);
});