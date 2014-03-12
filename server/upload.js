
// upload

'use strict';
module.exports = function (server) {
  
  var formidable = require('formidable');
  var fs = require('fs');
  var path = require('path');
  var imageMagick = require('imagemagick');

  var UploadHandler = function (req, res, callback) {
        this.req = req;
        this.res = res;
        this.callback = callback;
    },
    options = {
      tmpDir: __dirname + '/tmp',
      uploadDir: __dirname + '/upload',
      uploadUrl: '/rest3d/upload/',
      maxPostSize: 11000000000, // 11 GB
      minFileSize: 1,
      maxFileSize: 10000000000, // 10 GB
      acceptFileTypes: /.+/i,
      // Files not matched by this regular expression force a download dialog,
      // to prevent executing any scripts in the context of the service domain:
      safeFileTypes: /\.(gif|jpe?g|png|tga|dae|zip)$/i,
      imageTypes: /\.(gif|jpe?g|png|tga)$/i,
      imageVersions: {
        'thumbnail': {
          width: 80,
          height: 80
           }
       },
       accessControl: {
        allowOrigin: '*',
        allowMethods: 'OPTIONS, HEAD, GET, POST, PUT, DELETE',
        allowHeaders: 'Content-Type, Content-Range, Content-Disposition'
      },
      /* Uncomment and edit this section to provide the service via HTTPS:
      ssl: {
        key: fs.readFileSync('/Applications/XAMPP/etc/ssl.key/server.key'),
        cert: fs.readFileSync('/Applications/XAMPP/etc/ssl.crt/server.crt')
      },
      */
       nodeStatic: {
         cache: 3600 // seconds to cache served files
       }
    },
    utf8encode = function (str) {
      return unescape(encodeURIComponent(str));
    },

    nameCountRegexp = /(?:(?: \(([\d]+)\))?(\.[^.]+))?$/,
    nameCountFunc = function (s, index, ext) {
      return ' (' + ((parseInt(index, 10) || 0) + 1) + ')' + (ext || '');
    },
    handleResult = function (req, res, result, redirect) {

      if (redirect) {
        res.writeHead(302, {
          'Location': redirect.replace(
          /%s/,
          encodeURIComponent(JSON.stringify(result))
          )
        });
        res.end();
      } else {
        res.writeHead(200, {
          'Content-Type': req.headers.accept
          .indexOf('application/json') !== -1 ?
            'application/json' : 'text/plain'
        });
        res.end(JSON.stringify(result));
      }
    },
    handleError = function (req, res, error) {
      console.log('returning error ='+JSON.stringify(error));
    res.writeHead(500, {
        'Content-Type': req.headers.accept
        .indexOf('application/json') !== -1 ?
          'application/json' : 'text/plain'
      });
      res.end(JSON.stringify(error));
    },
    setNoCacheHeaders = function (res) {
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Content-Disposition', 'inline; filename="files.json"');
    };


  var FileInfo = function (file) {
      this.name = file.name;
      this.size = file.size;
      this.type = file.type;
      this.delete_type = 'DELETE';
  };
  FileInfo.prototype.validate = function () {
    if (options.minFileSize && options.minFileSize > this.size) {
      this.error = 'File is too small';
    } else if (options.maxFileSize && options.maxFileSize < this.size) {
      this.error = 'File is too big';
    } else if (!options.acceptFileTypes.test(this.name)) {
      this.error = 'Filetype not allowed';
    }
    return !this.error;
  };
  FileInfo.prototype.safeName = function () {
    // Prevent directory traversal and creating hidden system files:
    this.name = path.basename(this.name).replace(/^\.+/, '');
    // Prevent overwriting existing files:
    while (fs.existsSync(options.uploadDir + '/' + this.name)) {
      this.name = this.name.replace(nameCountRegexp, nameCountFunc);
    }
  };
  FileInfo.prototype.initUrls = function (req) {
    if (!this.error) {
      var that = this,
        baseUrl = (options.ssl ? 'https:' : 'http:') +
          '//' + req.headers.host + options.uploadUrl;
      this.url = this.delete_url = baseUrl + encodeURIComponent(this.name);
      Object.keys(options.imageVersions).forEach(function (version) {
        if (fs.existsSync(
            options.uploadDir + '/' + version + '/' + that.name
          )) {
          that[version + '_url'] = baseUrl + version + '/' +
            encodeURIComponent(that.name);
        }
      });
    }
  };
  FileInfo.prototype.delete = function(){
    var fileName = this.name;
    fs.unlink(options.uploadDir + '/' + fileName, function (ex) {
    Object.keys(options.imageVersions).forEach(function (version) {
      fs.unlink(options.uploadDir + '/' + version + '/' + fileName);
    });
    });
  };

  var UploadHandler = function (req, res, callback) {
    this.req = req;
    this.res = res;
    this.callback = callback;
  };


  UploadHandler.prototype.post = function () {
    console.log ("upload requested");
    var handler = this,
      form = new formidable.IncomingForm(),
      tmpFiles = [],
      files = [],
      map = {},
      counter = 1,
      redirect,
      finish = function () {
        counter -= 1;
        if (!counter) {
          files.forEach(function (fileInfo) {

          console.log ('file '+fileInfo.name+' was uploaded succesfully');//

            fileInfo.initUrls(handler.req);

            var timeout = function() {
              fileInfo.delete();
              console.log('timeout !! '+fileInfo.name+' was deleted');
            }
            setTimeout(function() { timeout()},5 * 60 * 1000);
          });
          handler.callback(handler.req, handler.res, {files: files}, redirect);
        }
      };
    form.uploadDir = options.tmpDir;
    form.on('fileBegin', function (name, file) {
      tmpFiles.push(file.path);
      var fileInfo = new FileInfo(file, handler.req, true);
      fileInfo.safeName();
      map[path.basename(file.path)] = fileInfo;
      files.push(fileInfo);
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
      fs.renameSync(file.path, options.uploadDir + '/' + fileInfo.name);
      if (options.imageTypes.test(fileInfo.name)) {
        Object.keys(options.imageVersions).forEach(function (version) {
          counter += 1;
          var opts = options.imageVersions[version];
          imageMagick.resize({
            width: opts.width,
            height: opts.height,
            srcPath: options.uploadDir + '/' + fileInfo.name,
            dstPath: options.uploadDir + '/' + version + '/' +
              fileInfo.name
          }, finish);
        });
      }
    }).on('aborted', function () {
      tmpFiles.forEach(function (file) {
        fs.unlink(file);
      });
    }).on('error', function (e) {
      console.log ('error '+e);   
      console.log(e);
      return ('error '+e)
    }).on('progress', function (bytesReceived, bytesExpected) {
      if (bytesReceived > options.maxPostSize) {
        handler.req.connection.destroy();
      }
    }).on('end', finish);
    form.parse(handler.req);
  };

  UploadHandler.prototype.get = function () {
    var handler = this,
      files = [];
    fs.readdir(options.uploadDir, function (err, list) {
      list.forEach(function (name) {
        var stats = fs.statSync(options.uploadDir + '/' + name),
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
      handler.callback(handler.req, handler.res, {files: files});
    });
  };

  UploadHandler.prototype.destroy = function () {
    var handler = this,
      fileName;
    if (handler.req.url.slice(0, options.uploadUrl.length) === options.uploadUrl) {
      fileName = path.basename(decodeURIComponent(handler.req.url));
      if (fileName[0] !== '.') {
        fs.unlink(options.uploadDir + '/' + fileName, function (ex) {
          Object.keys(options.imageVersions).forEach(function (version) {
            fs.unlink(options.uploadDir + '/' + version + '/' + fileName);
          });
          handler.callback(this.req, this.res, {success: !ex});
        });
        return;
      }
    }
    handler.callback(this.req, this.res, {success: false});
  };

  server.post(/^\/rest3d\/upload.*/, function(req,res,next){


    res.setHeader(
      'Access-Control-Allow-Origin',
      options.accessControl.allowOrigin
    );
    res.setHeader(
      'Access-Control-Allow-Methods',
      options.accessControl.allowMethods
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      options.accessControl.allowHeaders
    );
    var handler = new UploadHandler(req, res, handleResult);
    setNoCacheHeaders(res);
    var result = handler.post();

    return next();
  });
};
