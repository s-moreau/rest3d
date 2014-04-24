// upload
'use strict';
module.exports = function (server) {

  var formidable = require('formidable');
  var fs = require('fs');
  var path = require('path');
  var imageMagick = require('imagemagick');

  var memoryStream = require('memorystream');
  var request = require('request');

  var FileInfo = require('./fileinfo');
  var sendFile = require('./sendfile');

  var UploadHandler = require('./handler');
  var zipFile = require('./zipfile')(server);

  var Collection = require('./collection');
  var Resource = require('./resource');

  var Mime = require('mime');

  var extend = require('./extend')

  Mime.define({
    'model/collada+xml': ['dae']
  });
  Mime.define({
    'text/x-glsl': ['glsl']
  });

  var utf8encode = function (str) {
    return unescape(encodeURIComponent(str));
  };

  // upload one or more files
  UploadHandler.prototype.post = function (collectionpath, assetpath) {
    var handler = this;
    var form = new formidable.IncomingForm();
    var tmpFiles = [];
    var files = [];
    var map = {}
    var counter = 1;
    var redirect = undefined;
  
    var finish = function (err, asset) {
      if (err) {
        console.log('ERROR IN FINISH');
        handler.handleError(err);
        counter = -1;
        return;
      }
      counter -= 1;
      if (counter === 0) {
      
        var results = [];
        counter = files.length;
        if (!counter)
          return handler.handleError('post did not return any files')
        files.forEach(function (fileInfo) {
          //fileInfo.initUrls(handler.req);
          var timeout = function (handler) {
            fileInfo.delete(handler);
            console.log('timeout !! ' + fileInfo.name + ' was deleted');
          }
          setTimeout(timeout, 60 * 60 * 1000, handler);

          fileInfo.asset.get(function (err, res) {
            if (err) {
              if (counter != -1)
                handler.handleError(err);
              counter = -1;
              return
            } else {
              res.assetpath = fileInfo.assetpath;
              res.collectionpath = fileInfo.collectionpath;
              // remove sid from collectionpath for database tmp
              if (res.database==='tmp') {
                if (res.collectionpath.contains('/'))
                  res.collectionpath = res.collectionpath.stringAfter('/')
                else
                  res.collectionpath = "";
                
              }
              results.push(res)
              counter--;
              if (counter == 0)
                handler.handleResult(results);
            }
          })

        });
      
      }
    };

    //form.uploadDir = FileInfo.options.tmpDir;
    form.on('fileBegin', function (name, file) {

      tmpFiles.push(file.path);
      var fileInfo = new FileInfo(file, collectionpath, assetpath);
      //fileInfo.safeName();
      map[file.path] = fileInfo;
      //files.push(fileInfo); -> this will happen later

    }).on('field', function (name, value) {
      if (name === 'redirect') {
        redirect = value;
      } else if (name === 'url') {
        // downloading file and uncompressing if needed
        // counter++; -> getting all files at once
        //                                                      no jar
        counter++; // so that 'end' does not finish
        zipFile.unzipUrl(handler, collectionpath, assetpath, value, null, function(error,result) {
          if (error)
            handler.handleError(error);
          else {
            // turn {asset} into fileInfos
            var getFileInfos = function (results) {

              if (results.fileInfo) 
                files.push(results.fileInfo);

              if (results.children) {
                for (var i = 0; i < results.children.length; i++) {
                  getFileInfos(results.children[i]);
                }
              }
            };
            getFileInfos(result);
            finish(undefined);
          }
        });
      }
    }).on('file', function (name, file) {

      var fileInfo = map[file.path];
      fileInfo.size = file.size;
      fileInfo.type = Mime.lookup(fileInfo.name);


      counter++; // so that 'end' does not finish
      //                                                              no jar
      zipFile.unzipFile(handler, collectionpath, assetpath, fileInfo.name, fileInfo.path, null, function(error,result) {
        if (error)
          handler.handleError(error);
        else {
          // turn {asset} into fileInfos
          var getFileInfos = function (results) {

            if (results.fileInfo) 
              files.push(results.fileInfo);

            if (results.children) {
              for (var i = 0; i < results.children.length; i++) {
                getFileInfos(results.children[i]);
              }
            }
          };
          getFileInfos(result);
          finish(undefined);
        }
      });

    }).on('aborted', function () {
      tmpFiles.forEach(function (file) {
        fs.unlinkSync(file);
      });
    }).on('error', function (e) {
      handler.handleError(e);
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
    var handler = this;
    var files = [];

    fs.readdir(FileInfo.options.uploadDir, function (err, list) {
      list.forEach(function (name) {
        var stats = fs.statSync(path.join(FileInfo.options.uploadDir, name)),
          fileInfo;
        if (stats.isFile() && name[0] !== '.') {
          fileInfo = new FileInfo({
            name: name,
            size: stats.size,
            path: path.join(FileInfo.options.uploadDir, name)
          });
          fileInfo.initUrls(handler.req);
          files.push(fileInfo);
        }
      });
      handler.handleResult({
        success: true,
        files: files
      });
      return;
    });
  };

  // delete a file
  UploadHandler.prototype.destroy = function () {
    var handler = this;

    if (handler.req.url.slice(0, FileInfo.options.uploadUrl.length) === FileInfo.options.uploadUrl) {
      var fileName = path.basename(decodeURIComponent(handler.req.url));
      if (fileName[0] !== '.') {
        fs.unlink(path.join(FileInfo.options.uploadDir, fileName), function (ex) {
          Object.keys(FileInfo.options.imageVersions).forEach(function (version) {
            fs.unlink(path.join(FileInfo.options.uploadDir, version, fileName));
          });
          handler.handleResult({
            success: !ex
          });
          return;
        });
        return;
      }
    }
    handler.handleResult({
      success: false
    });
  };

  // rest3d post upload API
  server.post(/^\/rest3d\/tmp.*/, function (req, res, next) {

    var handler = new UploadHandler(req, res, next);
    handler.allowOrigin();

    var params = req.url.split("/tmp")[1];


    Collection.find('tmp', path.join('/', handler.sid, '/', params), function (err, result) {

      console.log('res POST returned match =' + result.path + ' asset =' + result.assetpath);

      handler.post(result.path, result.assetpath);
      //return next();
    })

  });


  // rest3d get upload API
  server.get(/^\/rest3d\/tmp.*/, function (req, res, next) {
    var handler = new UploadHandler(req, res, next);
    handler.allowOrigin();

    var params = req.url.split("/tmp")[1];
    if (params.contains('?'))
      params = params.stringBefore('?');
    while (params.slice(-1) === '/') params = params.slice(0, -1);

    var uuid = req.query.uuid;

    var p = null;


    console.log('in GET tmp/ for asset=' + params)
    console.log('in GET tmp/upload with path =' + uuid);


    if (!params && !uuid) {
      Collection.find('tmp', path.join('/', handler.sid), function (err, result) {
        if (err) return handler.handlerError(err);
        else {
          result.collection.get(function (err, result) {
            if (err) handler.handleError(err);
            else {
              // replace sid with '/' in col path, so this is hidden from client
              result.name = '/';
              handler.handleResult(result);
            }
          })
        }
      })

    } else if (uuid) {
      console.log('looking for uuid=' + uuid);
      Resource.load('tmp', uuid, function (err, resource) {
        if (err) handler.handleError(err);
        else {
          resource.get(function (err, result) {
            if (err) handler.handleError(err)
            else {
              if (result.name === handler.sid)
                result.name = '/';
              handler.handleResult(result);
            }
          })
        }
      })
    } else /* this is a path */ {

      console.log('get tmp quering for collection =' + path.join('/', handler.sid, '/', params));

      Collection.find('tmp', path.join('/', handler.sid, '/', params), function (err, res) {
        if (err) return handler.handlerError(err);
        else {
          // res = {path collection}
          // this is a collection that we queried for

          // remove path from query
          console.log('res upload returned match =' + res.path + ' asset =' + res.assetpath);

          if (!res.assetpath) // we found a collection
            return handler.handleResult(res.collection);

          // let see if there is an asset there
          console.log('upload, looking for asset at ' + res.path + ' name=' + res.assetpath);

          res.collection.getAssetId(res.assetpath, function (err, assetId) {
            if (err) return handler.handleError(err);
            if (!assetId) console.log('get /tmp/ cannot find asset=' + res.assetpath)
            // we have the asset, now we just need its ID
            p = path.resolve(FileInfo.options.uploadDir, assetId);
            console.log('sending file=' + p)
            sendFile(handler, p);
          })


        }
      })

    }

  });
};