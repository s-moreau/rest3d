// handler
'use strict';
var toJSON = require('./tojson');
var FileInfo = require('./fileinfo')
var Handler = function (req, res, next) {
      this.req = req;
      this.res = res;
      this.next = next;

      // Replace this. 
      // use req.session instead
      if(req.headers.hasOwnProperty("x-iduser")){
        console.log("iduser detected : "+req.headers["x-iduser"]);
        this.iduser = req.headers["x-iduser"];
      }
      if(req.headers.hasOwnProperty("x-folder")){
        console.log("idfolder detected : "+req.headers["x-folder"]);
        this.folder = req.headers["x-folder"];
      }
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

Handler.prototype.handleError = function (error) {

  if (typeof error === 'string')
    error = {
      success: false,
      errorCode: 'N/A',
      message: error
    };

  if (error instanceof Error) {
    var message = error.stack || error.message || "internal error";
    error = {
      success: false,
      message: message,
      errorCode: error.name
    };
  }

  this.setNoCacheHeaders();
  this.res.writeHead(500, {
    'Content-Type': this.req.headers.accept.indexOf('application/json') !== -1 ?
      'application/json' : 'text/plain'
  });
  this.res.end(toJSON(error));
  //if (this.next) this.next();
};

Handler.prototype.handleResult = function (result, redirect) {

  if (typeof result === 'string')
    result = {
      success: true,
      message: result
    };
  if (result instanceof Error)
    return this.handleError(result);

  if (redirect) {
    this.res.writeHead(302, {
      'Location': redirect.replace(
        /%s/,
        encodeURIComponent(toJSON.stringify(result)))
    });
    this.res.end();
  } else {

    this.setNoCacheHeaders();
    this.res.writeHead(200, {
      'Content-Type': this.req.headers.accept.indexOf('application/json') !== -1 ?
        'application/json' : 'text/plain',
      'Access-Control-Allow-Origin': '*'
    });
    this.res.end(toJSON(result));
  }
  if (this.next) this.next();
};

module.exports = Handler;

