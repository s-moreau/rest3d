// handler

'use strict';
var toJSON = require('./tojson');
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

Handler.prototype.handleError = function (error) {
      console.log("handler error : "+error)
      if (typeof error === 'string') 
        error = {success:false, errorCode:'N/A', message:error};

       if (error instanceof Error) {
        var message = error.stack || error.message || "internal error";
        error = {success:false, message:message, errorCode:error.name};
       }

       // console.log('returning error (500) ='+toJSON(error));
        this.res.writeHead(500, {
            'Content-Type': this.req.headers.accept
            .indexOf('application/json') !== -1 ?
              'application/json' : 'text/plain'
          });
          this.res.end(toJSON(error));
          if (this.next) this.next();
     };

Handler.prototype.handleResult = function(result, redirect) {

      if (typeof result === 'string') 
        result = {success:true, message:result};
      if (error instanceof Error) 
        return this.handleError(error);
      
        if (redirect) {

        
        // console.log('returning redirect (302) ='+encodeURIComponent(toJSON(result)));

          this.res.writeHead(302, {
            'Location': redirect.replace(
            /%s/,
            encodeURIComponent(toJSON.stringify(result))
            )
          });
          this.res.end();
        } else {

        
        // console.log('returning result (200) ='+toJSON(result));

          this.res.writeHead(200, {
            'Content-Type': this.req.headers.accept
            .indexOf('application/json') !== -1 ?
              'application/json' : 'text/plain'
          });
          this.res.end(toJSON(result));
        }
        if (this.next) this.next();
      };

  Handler.prototype.search =  function(path,value){
        var fs = require('fs');
        var flag = false;
        var files = fs.readdirSync(path);
        console.log(files);
        if(files.length==0){flag=false;}
          files.forEach(function (name) {
            if(name == value){
              flag = true;
            }
      });
        return flag;
          }

module.exports = Handler;
