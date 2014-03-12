'use strict';

var sendFile = function(req,res,p) {

var send = require('send');
var http = require('http');

  function error(err) {
    res.statusCode = err.status;
    res.end(http.STATUS_CODES[err.status]);
    console.log('send error');
    
    console.log(err);
    console.log('******')
  }

  function redirect() {
    res.statusCode = 301;
    res.setHeader('Location', req.url + 'index.html');
    res.end('Redirecting to ' + req.url + 'index.html');
    console.log('redirected to '+req.url + 'index.html')
  }

console.log('sendFile dir='+ p);

  send(req, p)
  .on('error', error)
  .on('directory', redirect)
  .pipe(res);

};

module.exports = sendFile;