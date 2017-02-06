var nconf = require('nconf');
var express = require('express');
var forceSSL = require('express-force-ssl');
var Poet = require('poet');

// Use command-line arguments first, then env variables, then defaults
nconf.argv().env().defaults({
  'httpPort': 3000,
  'useHttps': false
});

var app = express();

var useHttps = nconf.get('useHttps');
if (useHttps) {
  app.use(forceSSL);
}

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
poet.watch(function() {
  console.log('Posts dir changed, cache updated');
}).init().then(function() {
  console.log('Watcher initialized successfully');
});

app.get('/rss', function(req, res) {
  var posts = poet.helpers.getPosts(0, 5);
  res.setHeader('Content-Type', 'application/rss+xml');
  res.render('rss', { posts: posts });
});

app.get('/sitemap.xml', function(req, res) {
  var posts = poet.helpers.getPosts(0, poet.helpers.getPostCount());
  res.setHeader('Content-Type', 'application/xml');
  res.render('sitemap', { posts: posts });
});

var port = nconf.get('httpPort');
var server = app.listen(port, function() {
  console.log('Server listening on port %s', server.address().port);
});

if (useHttps) {
  // We need to split up the chain certificate manually to avoid touching the files on disk.
  // This allows sslmate (our registration service) to auto-renew the certificates without
  // us having to manually alter the files afterwards, and is ok to do here since it only
  // happens when the server starts up.
  // Original code to do this from http://stackoverflow.com/a/31629223
  function splitChain(chain) {
    var cert = [];
    var ca = [];
    chain.split("\n").forEach(function(line) {
      cert.push(line);
      if (line.match(/-END CERTIFICATE-/)) {
        ca.push(cert.join("\n"));
        cert = [];
      }
    });
    return ca;
  }

  var secureServer = https.createServer({
    key: fs.readFileSync("/etc/sslmate/rustualboy.com.key", "utf8"),
    cert: fs.readFileSync("/etc/sslmate/rustualboy.com.crt", "utf8"),
    ca: splitChain(fs.readFileSync("/etc/sslmate/rustualboy.com.chain.crt", "utf8"))
  }, app).listen(443, function() {
    console.log("Secure server listening on port %s", secureServer.address().port);
  });
}