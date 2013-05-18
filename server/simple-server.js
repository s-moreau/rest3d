var restify = require('restify'),
    nstatic = require('node-static'),
    fs = require('fs'),
    data = __dirname + '/data.json',
    server = restify.createServer();


// Serve static files
var file = new nstatic.Server('');

// Process GET
server.get('/api/:id', function(req, res) {
    // FIRES
    res.end('api!');
});

server.get(/^\/.*/, function(req, res, next) {
    file.serve(req, res, function (err) {
      if (err) {
        throw err;
      }
      console.log('next');
      next();
    });
});


server.listen( 8000 );

console.log('Server running on port ' + 8000);