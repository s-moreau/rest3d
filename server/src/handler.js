// handler
'use strict';

var toJSON = require('./tojson');
var FileInfo = require('./fileinfo')
var fs = require('fs');

var path = require('path')
var send = require('send');

var Handler = function (req, res, next) {
      this.req = req;
      this.res = res;
      this.next = next;

      this.sid = req.session.sid;
};

Handler.prototype.allowOrigin = function () {
  this.res.setHeader(
    'Access-Control-Allow-Origin',
    FileInfo.options.accessControl.allowOrigin
  );
  this.res.setHeader(
    'Access-Control-Allow-Methods',
    FileInfo.options.accessControl.allowMethods
  );
  this.res.setHeader(
    'Access-Control-Allow-Headers',
    FileInfo.options.accessControl.allowHeaders
  );
};

Handler.prototype.setNoCacheHeaders = function () {
  //this.res.setHeader('Pragma', 'no-cache');
  this.res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  //this.res.setHeader('Content-Disposition', 'inline; filename="files.json"');
};

// FIX ME !!
Handler.prototype.sendData = function(data,type,name) {

  if (type) this.res.setHeader('Content-Type', type);
  if (name) this.res.setHeader('Content-disposition', 'attachment; filename='+name);
  //this.res.setHeader('Content-Type','application/octet-stream')
  //res.setHeader('Content-Length', data.length);
  
  var stream=fs.createWriteStream("/tmp/test")
  data.pipe(stream);


  // After all the data is saved, respond with a simple html form so they can post more data
  data.on('end', function () {
    console.log('data on end')

  console.log("wrote /tmp/test");
    stream.end();
      this.next();
    
  });
  data.on('error',function(){
    console.log('data on error')
  })
  // This is here incase any errors occur
  writeStream.on('error', function (err) {
    console.log('write stream on errror');
  });




  /*
  fs.writeFile("/tmp/test", data, function(err) {
    if(err) {
        console.log(err);
    } else {
        console.log("The file was saved!");
    }
  }); 

*/
//data.pipe(fs.createWriteStream("tmp/test"));
/*
this.req.pipe(data).pipe(this.res);
  this.res.writeHead(200);
 // data.pipe(this.res);
 // this.res.write(data);
  this.res.end();
  this.next();
  */
}


Handler.prototype.sendFile = function(p,type,name) {

  var handler = this;

/// TODO - translate error message
  function error(err) {
    console.log('sendFile error - assuming file not found error');
    handler.handleError(err, 404);
  }

  function redirect() {
    handler.res.statusCode = 301;
    handler.res.setHeader('Location', path.join(handler.req.url ,'index.html'));
    handler.res.end('Redirecting to ' + path.join(handler.req.url ,'index.html'));
    console.log('redirected to '+ path.join(handler.req.url + 'index.html'));
  }

  if (type) handler.res.setHeader('Content-Type', type);
  if (name) handler.res.setHeader('Content-disposition', 'attachment; filename='+name);

  console.log('sendFile dir='+ p);
  console.log('         type='+type);
  console.log('         name='+name);

  send(handler.req, p)
  .on('error', error)
  .on('directory', redirect)
  .pipe(handler.res)
  .on('end', handler.next);

 };

Handler.prototype.handleError = function (error, code) {

  if (this.sentHeaders) {
    console.log('caught repeated sent headers in handleError')
    this.next()
    return;
  }
  this.sentHeaders = true;
  var message,statusCode;

  if (error instanceof Error) {
    message = error.stack || error.message || "internal error";
    statusCode = code || (error.statusCode ? error.statusCode : 500);
  }

  else if (typeof error === "object") {
    // make sure we have success and status code
    message = error.message || "internal error";
    statusCode= code || (error.statusCode ? error.statusCode : 500)

  } else {
    message = error;
    statusCode= code || 500;
  } 

  this.setNoCacheHeaders();
  this.res.writeHead(statusCode, {
    'Content-Type': this.req.headers.accept.indexOf('application/json') !== -1 ?
      'application/json' : 'text/plain'
  });
  this.res.end(toJSON(message));
 
};

Handler.prototype.redirect = function(whereto) {

  if (this.sentHeaders) {
    console.log('caught repeated sent headers in redirect')
    this.next()
    return;
  }
  this.sentHeaders = true;

  this.setNoCacheHeaders();
  this.res.writeHead(302, {
    'Location': whereto
  })
  this.res.end();
  this.next();
}

Handler.prototype.handleResult = function (result, code) {

  if (code ===302)
    return this.redirect(result);

  if (this.sentHeaders) {
    console.log('caught repeated sent headers in handleResult')
    this.next()
    return;
  }
  var statusCode = code || 200;

  this.sentHeaders = true;
  if (result instanceof Error)
    return this.handleError(result);

  this.setNoCacheHeaders();
  this.res.writeHead(code?code:statusCode, {
    'Content-Type': this.req.headers.accept.indexOf('application/json') !== -1 ?
      'application/json' : 'text/plain',
    'Access-Control-Allow-Origin': '*'
  });
  this.res.end(toJSON(result));
 
  this.next();
};

module.exports = Handler;

