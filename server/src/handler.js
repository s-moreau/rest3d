// handler
'use strict';
var toJSON = require('./tojson');
var FileInfo = require('./fileinfo')
  var fs = require('fs');

var Handler = function (req, res, next) {
      this.req = req;
      this.res = res;
      this.next = next;
      if(req.headers.hasOwnProperty("x-iduser")){
        console.log("iduser detected : "+req.headers["x-iduser"]);
        this.iduser = req.headers["x-iduser"];
      }
      if(req.headers.hasOwnProperty("x-folder")){
        console.log("iduser detected : "+req.headers["x-folder"]);
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

Handler.prototype.createSyncPath = function(path){
      var array = path.split("/");
      var index = array.length;
      var result;
      console.log(path,array)
      for(var i=3;i<index;i++){
        if(array[i].split(".").length==1){
          console.log("in",array[i])
          array[i]=array[i-1]+"/"+array[i];
          console.log("in1",array[i])
          var flag = fs.existsSync(array[i]);
          console.log("in2",flag)
          if(!flag){
            console.log("createfoler "+array[i])
            fs.mkdirSync(array[i]);
          }
        }
        else{
          console.log("out",array[i])

          array[i]=array[i-1]+"/"+array[i];
        }
      }    
      console.log("array",array[index-1])  
      return array[index-1];
}

Handler.prototype.handleResult = function (result, redirect) {

  if (typeof result === 'string')
    result = {
      success: true,
      message: result
    };
  if (error instanceof Error)
    return this.handleError(error);

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

