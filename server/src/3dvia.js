/*
3dvia.js

The MIT License (MIT)

Copyright (c) 2013 Rémi Arnaud - Advanced Micro Devices, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
'use strict';

module.exports = function (server) {

  var request = require('request');
  var cheerio = require('cheerio');
  var toJSON = require('./tojson');
  var sendFile = require('./sendfile');

  var handler = require('./handler');
  var zipFile = require('./zipfile')(server);
  var formidable = require('formidable');

  handler.prototype.login = function(){
    console.log ("3dvia login requested");
    var handler = this;


    var form = new formidable.IncomingForm();

    form.parse(this.req, function(err, args) {
      if (err) return handler.handleError(err);
      if (!args.user || args.user==='' ) {
        return handler.handleError('need non empty user');
      };
      console.log('login to 3dvia with user='+args.user+" and passwd="+args.passwd);
      // get cookies
      var j = request.jar();
      request.post({ // All collections
          url: "https://www.3dvia.com/login",
          jar:j,
          form: { 'signin[user_id]':args.user,
                  'signin[user_pwd]':args.passwd }
        },function(err, resp, body){
          console.log('got response from https://www.3dvia.com/login');
          if (err)
            return handler.handleError(err);
          
          // Check that we have a PHPSESSION

          var cookies = j._jar.store.idx;
          var PHPSESSID = null;
          if (cookies['www.3dvia.com'] && cookies['www.3dvia.com']['/'])
            PHPSESSID = cookies['www.3dvia.com']['/'].PHPSESSID;
          var TDVIA_SESSION = null;
          if (cookies['3dvia.com'] && cookies['3dvia.com']['/'])
            TDVIA_SESSION = cookies['3dvia.com']['/']['3DVIA_SESSION'];

          console.log('3DVIA session='+toJSON(TDVIA_SESSION));

          if (TDVIA_SESSION) {
            return handler.handleResult('connected to 3dvia as user '+args.user);
          }
          else
            return handler.handleError('failed to authenticate as user '+args.user);
          }
      );
          
    });

  }

  server.post(/^\/rest3d\/3dvia\/login/, function(req,res, next){
    var tdvia = new handler(req, res, next);

    tdvia.allowOrigin();
    tdvia.setNoCacheHeaders();

    tdvia.login();

    return next();

  });

};

