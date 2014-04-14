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

module.exports = function (server) {

  var existdb = server.db = require('./existdbdriver');
  var restify = require('restify')
  var sendFile = require('./sendfile');
  // note: handler has post/get/destroy added by upload.js already
  var Handler = require('./handler');
  var FileInfo = require('./fileinfo');
  var formidable = require('formidable');

  var uuid = require('node-uuid');

  server.get(/^\/rest3d\/fl4re\/info/,function(req, res, next) {
    var handler = new dbHandler(req,res,next);
  
    existdb.info(function(err,res){
      if (err)
        handler.handleError(err);
      else
        handler.handleResult(res);
    })
  });

/*
  // upload one or more files
  dbHandler.prototype.post = function () {
    var handler = this;
    var form = new formidable.IncomingForm();
    var tmpFiles = [];
    var files = [];
    var map = {}
    var counter = 1;
    var redirect=undefined;

    var finish = function () {
        counter -= 1;
        if (!counter) 
            return handler.handleResult({files: files}, redirect);
       
    };

    form.uploadDir = FileInfo.options.tmpDir;
    form.on('fileBegin', function (name, file) {
      try {
        tmpFiles.push(file.path);
        var fileInfo = new FileInfo(file);
        fileInfo.safeName();
        map[file.path] = fileInfo;
        files.push(fileInfo);

      } catch(e) {
        handler.handleError( e);
        return 
      };
    }).on('field', function (name, value) {
      if (name === 'redirect') {
        redirect = value;
      }
      if (name === 'url')
      {
        // downloading file and uncompressing if needed
        var params={};
        params.uid = uuid.v1(); // time based uuid generation
        params.cb = function(error,result){
          if (error)
            handler.handleError(error);
          else {
            // turn {asset} into fileInfos
            var getFileInfos = function(results) {

              if (results.type === 'file') {
                var fileInfo = new FileInfo(results);
                fileInfo.safeName();
                files.push(fileInfo);
                //fileInfo.size =
                // if (!fileInfo.validate()) {
                //  fs.unlink(file.path);
                //  return;
                //}
              }
              if (results.children) {
                for (var i=0; i<results.children.length;i++){
                  getFileInfos(results.children[i]);
                }
              }
            };
            getFileInfos(result);
            finish();
          }
        };
        params.url = value;
        params.where = FileInfo.options.uploadDir;

        counter ++;
        zipFile.unzip(params.uid,params.url,null,params.where, params.cb); //jar?
      }
    }).on('file', function (name, file) {
      var fileInfo = map[file.path];
      fileInfo.size = file.size;
      fileInfo.type = file.type;
      fileInfo.file = file;
      fileInfo.assetId = uuid.v1();
      if (!fileInfo.validate()) {
        fs.unlinkSync(file.path);
        return;
      }
      handler.db = server.db;
      fileInfo.upload(handler, finish);

    }).on('aborted', function () {
      tmpFiles.forEach(function (file) {
        fs.unlinkSync(file);
      });
    }).on('error', function (e) {
        handler.handleError( e);
        return 
    }).on('progress', function (bytesReceived, bytesExpected) {
      if (bytesReceived > FileInfo.options.maxPostSize) {
        handler.req.connection.destroy();
      }
    }).on('end', finish);
    form.parse(handler.req);
  };
*/
  // rest3d post upload API
  server.post(/^\/rest3d\/fl4re\/upload.*/, function(req,res,next){

    var handler = new Handler(req, res, next);
    handler.db = server.db;
    handler.allowOrigin();

    handler.post();

    return next();
  });

  server.get(/^\/rest3d\/fl4re\/.*/,function(req, res, next) {

    var asset = req.url.split("/assets/")[1];
    //if (asset !== undefined) asset = asset.toLowerCase()
    console.log('[assets] =['+asset+']');

      var handler = new dbHandler(req,res,next);
    
      existdb.get(asset, function(err,res){
        if (err)
          handler.handleError(err);
        else
          handler.handleResult(res);
      })
    });
  };