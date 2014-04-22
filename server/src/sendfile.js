'use strict';

var path = require('path')
var send = require('send');
var http = require('http');

var sendFile = function(_h,p) {

  var handler = _h;

    function error(err) {
      handler.res.statusCode = err.status;
      handler.res.end(http.STATUS_CODES[err.status]);
      console.log('send error');
      
      console.log(err);
      console.log('******')
    }

    function redirect() {
      handler.res.statusCode = 301;
      handler.res.setHeader('Location', path.join(handler.req.url ,'index.html'));
      handler.res.end('Redirecting to ' + path.join(handler.req.url ,'index.html'));
      console.log('redirected to '+ path.join(handler.req.url + 'index.html'));
    }

  console.log('sendFile dir='+ p);

    send(handler.req, p)
    .on('error', error)
    .on('directory', redirect)
    .pipe(handler.res)
    .on('end', handler.next);

  };

module.exports = sendFile;
