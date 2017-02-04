var nconf = require('nconf');
var express = require('express');
var Poet = require('poet');

// Use command-line arguments first, then env variables, then defaults
nconf.argv().env().defaults({
  'httpPort': 3000,
});

var app = express();

app.use(express.static('static'));

app.set('view engine', 'jade');
app.set('views', __dirname + '/views');

var poet = Poet(app, {
  posts: __dirname + '/posts/',
  postsPerPage: 5,
  metaFormat: 'json'
});
poet.init().then(function() {
  console.log('Blog initialized successfully');
}, function(err) {
  console.log('Blog not initialized successfully: ' + err);
});

var port = nconf.get('httpPort');
var server = app.listen(port, function() {
  console.log('Server listening on port %s', server.address().port);
});