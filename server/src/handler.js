// handler

'use strict';
var toJSON = require('./tojson');
var Handler = function (req, res, next) {
      this.req = req;
      this.res = res;
      this.next = next;
};

Handler.prototype.handleError = function (error) {

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

module.exports = Handler;
