/*
existdb.js

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

// note: handler has post/get/destroy added by upload.js already
var Handler = require('./handler');
var Collection = require('./collection');

module.exports = function (server) {

  var existdb = server.db = require('./existdbdriver');

  server.get(/^\/rest3d\/db\/info/,function(req, res, next) {
    var handler = new dbHandler(req,res,next);
  
    existdb.info(function(err,res){
      if (err)
        handler.handleError(err);
      else
        handler.handleResult(res);
    })
  });

  // rest3d post upload API
  server.post(/^\/rest3d\/db.*/, function(req,res,next){

    // need destination project and path

    var handler = new Handler(req, res, next);
    handler.db = existdb; 
    handler.allowOrigin();

    var params = req.url.stringAfter("db");

    Collection.find(existdb,  params, function (err, result) {

      if (err) return handler.handleError(err);
      handler.post(result.path, result.assetpath); // see upload.js

    })

  });

  server.get(/^\/rest3d\/db.*/,function(req, res, next) {

    var asset = req.url.stringAfter("db");

    var handler = new Handler(req, res, next);
    handler.allowOrigin();
    handler.db = existdb;
    if (asset.contains('?'))
      asset = asset.stringBefore('?');
    while (asset.slice(-1) === '/') asset = asset.slice(0, -1);

    handler.get(asset, req.query.uuid);

    
  });
}
