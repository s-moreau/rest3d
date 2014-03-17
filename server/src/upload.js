
// upload

'use strict';
module.exports = function (server) {
  
  var formidable = require('formidable');
  var fs = require('fs');
  var path = require('path');
  var imageMagick = require('imagemagick');

  var FileInfo = require('./fileinfo');
  var sendFile = require('./sendfile');

  var UploadHandler = require('./handler');
  var utf8encode = function (str) {
   return unescape(encodeURIComponent(str));
  };

  var setNoCacheHeaders = function (res) {
   res.setHeader('Pragma', 'no-cache');
   res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
   res.setHeader('Content-Disposition', 'inline; filename="files.json"');
  };


  UploadHandler.prototype.post = function () {
    console.log ("upload requested");
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

            console.log ('file '+fileInfo.name+' was uploaded succesfully');

              fileInfo.initUrls(handler.req);

              var timeout = function() {
                fileInfo.delete();
                console.log('timeout !! '+fileInfo.name+' was deleted');
              }
              setTimeout(function() { timeout()},5 * 60 * 1000);
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
        map[path.basename(file.path)] = fileInfo;
        files.push(fileInfo);
      } catch(e) {
        handler.handleError( e);
        return 
      };
    }).on('field', function (name, value) {
      if (name === 'redirect') {
        redirect = value;
      }
    }).on('file', function (name, file) {
      var fileInfo = map[path.basename(file.path)];
      fileInfo.size = file.size;
      if (!fileInfo.validate()) {
        fs.unlink(file.path);
        return;
      }
      fs.renameSync(file.path, FileInfo.options.uploadDir + '/' + fileInfo.name);
      console.log("uploaded "+FileInfo.options.uploadDir + '/' + fileInfo.name);
      /* Image resize 

      if (FileInfo.options.imageTypes.test(fileInfo.name)) {
        Object.keys(FileInfo.options.imageVersions).forEach(function (version) {
          counter += 1;
          var opts = FileInfo.ptions.imageVersions[version];
          imageMagick.resize({
            width: opts.width,
            height: opts.height,
            srcPath: FileInfo.options.uploadDir + '/' + fileInfo.name,
            dstPath: FileInfo.options.uploadDir + '/' + version + '/' +
              fileInfo.name
          }, finish);
        });
      }
      */
      finish();
    }).on('aborted', function () {
      tmpFiles.forEach(function (file) {
        fs.unlink(file);
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
            size: stats.size
          });
          fileInfo.initUrls(handler.req);
          files.push(fileInfo);
        }
      });
      handler.handleResult({success: true, files: files});
      return;
    });
  };

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

    //if (req.headers.content-type === "multipart/form-data")

    console.log(req.headers['content-type']);
    res.setHeader(
      'Access-Control-Allow-Origin',
      FileInfo.options.accessControl.allowOrigin
    );
    res.setHeader(
      'Access-Control-Allow-Methods',
      FileInfo.options.accessControl.allowMethods
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      FileInfo.options.accessControl.allowHeaders
    );
    var handler = new UploadHandler(req, res, next);
    setNoCacheHeaders(res);
    var result = handler.post();

    return next();
  });


  // rest3d get upload API
  server.get(/^\/rest3d\/upload.*/, function(req,res,next){

      res.setHeader(
          'Access-Control-Allow-Origin',
          FileInfo.options.accessControl.allowOrigin
      );
      res.setHeader(
          'Access-Control-Allow-Methods',
          FileInfo.options.accessControl.allowMethods
      );
      res.setHeader(
          'Access-Control-Allow-Headers',
          FileInfo.options.accessControl.allowHeaders
      );
      var handler = new UploadHandler(req, res, next);

      var asset = req.url.split("/upload/")[1];
        
      console.log('in GET upload/ for asset='+asset)

      if (asset === undefined || asset === '') {
          setNoCacheHeaders(res);
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
