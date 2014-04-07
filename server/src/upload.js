// upload

'use strict';
module.exports = function (server) {
  
  var formidable = require('formidable');
  var fs = require('fs');
  var path = require('path');
  var imageMagick = require('imagemagick');
  var uuid = require('node-uuid');

  var memoryStream = require('memorystream');
  var request = require('request');

  var FileInfo = require('./fileinfo');
  var sendFile = require('./sendfile');

  var UploadHandler = require('./handler');
  var zipFile = require('./zipfile')(server);;

  var utf8encode = function (str) {
   return unescape(encodeURIComponent(str));
  };

  // upload one or more files
  UploadHandler.prototype.post = function () {
    var handler = this;
    var form = new formidable.IncomingForm();
    var tmpFiles = [];
    var files = [];
    var map = {}
    var counter = 1;
    var redirect;
    var finish = function () {
        counter -= 1;
        if (!counter) {
          try {
            files.forEach(function (fileInfo) {

              //fileInfo.initUrls(handler.req);

              var timeout = function() {
                fileInfo.delete();
                console.log('timeout !! '+fileInfo.name+' was deleted');
              }
              setTimeout(function() { timeout()},60 * 60 * 1000);
            });
            handler.handleResult({files: files}, redirect);
            return;
          } catch (e) {
            handler.handleError( e);
            return 
          }
        }
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
      fileInfo.upload(handler);
      finish();
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

  // get a file 
  UploadHandler.prototype.get = function () {
    var handler = this,
      files = [];
    fs.readdir(FileInfo.options.uploadDir, function (err, list) {
      list.forEach(function (name) {
        var stats = fs.statSync(FileInfo.options.uploadDir + '/' + name),
          fileInfo;
        if (stats.isFile() && name[0] !== '.') {
          fileInfo = new FileInfo({
            name: name,
            size: stats.size,
            path: FileInfo.options.uploadDir + '/' + name
          });
          fileInfo.initUrls(handler.req);
          files.push(fileInfo);
        }
      });
      handler.handleResult({success: true, files: files});
      return;
    });
  };

  // delete a file
  UploadHandler.prototype.destroy = function () {
    var handler = this,
      fileName;
    if (handler.req.url.slice(0, FileInfo.options.uploadUrl.length) === FileInfo.options.uploadUrl) {
      fileName = path.basename(decodeURIComponent(handler.req.url));
      if (fileName[0] !== '.') {
        fs.unlink(FileInfo.options.uploadDir + '/' + fileName, function (ex) {
          Object.keys(FileInfo.options.imageVersions).forEach(function (version) {
            fs.unlink(FileInfo.options.uploadDir + '/' + version + '/' + fileName);
          });
          handler.handleResult({success: !ex});
          return;
        });
        return;
      }
    }
    handler.handleResult({success: false});
  };

  // rest3d post upload API
  server.post(/^\/rest3d\/upload.*/, function(req,res,next){

    var handler = new UploadHandler(req, res, next);
    handler.allowOrigin();

    handler.post();

    return next();
  });


  // rest3d get upload API
  server.get(/^\/rest3d\/upload.*/, function(req,res,next){

      var handler = new UploadHandler(req, res, next);
      handler.allowOrigin();

      var asset = req.url.split("/upload/")[1];
        
      console.log('in GET upload/ for asset='+asset)

      if (asset === undefined || asset === '') {
          //handler.setNoCacheHeaders();
          if (req.method === 'GET') {
              handler.get();
          } else {
             res.end();
          }
       } else {
           var p=path.resolve(FileInfo.options.uploadDir+'/'+asset);
           sendFile(req,res,p);
       }
       return next();
  });
};
