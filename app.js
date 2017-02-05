var nconf = require('nconf');
var express = require('express');
var Poet = require('poet');

// Use command-line arguments first, then env variables, then defaults
nconf.argv().env().defaults({
  'httpPort': 3000,
});

var app = express();

app.use(express.static('static'));

app.get('/', function(req, res) {
  res.render('index');
})

app.set('view engine', 'jade');
app.set('views', __dirname + '/views');

app.get('/blog', function(req, res) {
  res.render('blog');
});

var poet = Poet(app, {
  postsPerPage: 3,
  posts: __dirname + '/posts',
  metaFormat: 'json',
  routes: {
    '/blog/post/:post': 'post',
    '/blog/page/:page': 'page',
    '/blog/category/:category': 'category',
    '/blog/tag/:tag': 'tag'
  }
});
poet.init().then(function() {
  console.log('Blog initialized successfully');
}, function(err) {
  console.log('Blog not initialized successfully: ' + err);
});

app.get('/rss', function(req, res) {
  var posts = poet.helpers.getPosts(0, 5);
  res.setHeader('Content-Type', 'application/rss+xml');
  res.render('rss', { posts: posts });
});

var port = nconf.get('httpPort');
var server = app.listen(port, function() {
  console.log('Server listening on port %s', server.address().port);
});