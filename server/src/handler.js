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
  if (this.errorSet) {
    console.log('caught repeated error in sendfile')
    return;
  }


  function error(err) {
    console.log('sendFile error');
    handler.handleError(err);
  }

  function redirect() {
    handler.res.statusCode = 301;
    handler.res.setHeader('Location', path.join(handler.req.url ,'index.html'));
    handler.res.end('Redirecting to ' + path.join(handler.req.url ,'index.html'));
    console.log('redirected to '+ path.join(handler.req.url + 'index.html'));
  }

  if (type) handler.res.setHeader('Content-Type', type);
  if (name) this.res.setHeader('Content-disposition', 'attachment; filename='+name);

  console.log('sendFile dir='+ p);
  console.log('         type='+type);
  console.log('         name='+name);

  send(handler.req, p)
  .on('error', error)
  .on('directory', redirect)
  .pipe(handler.res)
  .on('end', handler.next);

 };

Handler.prototype.handleError = function (error) {

  if (typeof error === 'string')
    error = {
      success: false,
      statusCode: 500,
      message: error
    };

  if (error instanceof Error) {
    var message = error.stack || error.message || "internal error";
    error = {
      success: false,
      message: message,
      statusCode: (error.statusCode ? error.statusCode : 500)
    };
  }

  // avoid repeated errors that crashes nodejs

  if (!this.errorSet) {

    this.setNoCacheHeaders();
    this.res.writeHead(error.statusCode, {
      'Content-Type': this.req.headers.accept.indexOf('application/json') !== -1 ?
        'application/json' : 'text/plain'
    });
    this.res.end(toJSON(error));
    this.errorSet = error.statusCode;
    //if (this.next) this.next(new restify.ResourceNotFoundError(err))
  } else
  {
    console.log('caught repeated error !')
  }
};

Handler.prototype.handleResult = function (result, code) {

if (this.errorSet) {
    console.log('caught repeated error in handleResult')
    return;
  }

  if (typeof result === 'string')
    result = {
      success: true,
      message: result
    };
  if (result instanceof Error)
    return this.handleError(result);

  if (code === 302) {
    this.res.writeHead(302, {
      'Location': redirect.replace(
        /%s/,
        encodeURIComponent(toJSON.stringify(result)))
    });
    this.res.end();
  } else {

    this.setNoCacheHeaders();
    this.res.writeHead(code?code:200, {
      'Content-Type': this.req.headers.accept.indexOf('application/json') !== -1 ?
        'application/json' : 'text/plain',
      'Access-Control-Allow-Origin': '*'
    });
    this.res.end(toJSON(result));
  }
  if (this.next) this.next();
};

module.exports = Handler;

