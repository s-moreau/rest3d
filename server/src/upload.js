// upload
'use strict';
module.exports = function (server) {

  var formidable = require('formidable');
  var fs = require('fs');
  var Path = require('path');
  var imageMagick = require('imagemagick');

  var memoryStream = require('memorystream');
  var request = require('request');

  var FileInfo = require('./fileinfo');

  var UploadHandler = require('./handler');
  var zipFile = require('./zipfile');

  var Collection = require('./collection');
  var Resource = require('./resource');

  var Mime = require('mime');

  var extend = require('./extend')
  var toJSON = require('./tojson')

  Mime.define({
    'model/collada+xml': ['dae']
  });
  Mime.define({
    'text/x-glsl': ['glsl']
  });

  var utf8encode = function (str) {
    return unescape(encodeURIComponent(str));
  };

  // here's a dummy database
  var tmpdb={};
  tmpdb.assets={};
  tmpdb.name = 'tmp';

  tmpdb.root = null; // where we store each user root collection

  tmpdb.saveAsset = function(asset,cb){
    // update root if this asset is the root folder
    if (asset.name === '/') tmpdb.root = asset;
    tmpdb.assets[asset.uuid] = asset;
    cb(undefined,asset);
  }

  tmpdb.loadAsset = function(id,cb){
    var result = tmpdb.assets[id];
    result.database=tmpdb;
    if (result)
      cb(undefined, result)
    else
      cb('database[tmp] cannot find asset id='+id)
  }
 
  tmpdb.delAsset = function(asset,cb){
    delete tmpdb.assets[asset.uuid];
    // Garbage collection will collect asset if it is not referenced anywhere
    cb(undefined, undefined);
  }

  tmpdb.getRoot = function(cb){
    cb(undefined, tmpdb.root);
  }
  
  server.tmpBuffer = tmpdb;
  // make sure we have a tmp folder for this user
  server.use(function(req,res,next){
    if (!req.session || !req.session.sid)
    return next(new Error('cannot find sid in upload::createTMP'))
    if (!req.session.tmpdir) {
      // create tmp folder for user
      Collection.create(tmpdb,Path.join('/',req.session.sid), req.session.sid, function(err,collection){
        if (err){
          console.log('Could NOT create TMP folder for user='+req.session.sid)
          next(err);
        } 
        else {
          console.log('Created TMP for user='+req.session.sid)
          req.session.tmpdir=collection.uuid;
          server.sessionManager.save(req.session.sid, req.session, next)
        }
      })
    } else
    next();
  })

  // upload one or more files
  UploadHandler.prototype.post = function (collectionpath, assetpath) {
    var handler = this;
    var form = new formidable.IncomingForm();
    var tmpFiles = [];
    var files = [];
    var map = {}
    var counter = 1;

  
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
          return handler.handleError({message:'post did not send any files', statusCode:400})
        files.forEach(function (fileInfo) {
          //fileInfo.initUrls(handler.req);
          var timeout = function (db) {
            fileInfo.delete(db,function(){}); // no callback
            console.log('timeout !! ' + fileInfo.name + ' was deleted');
          }
          setTimeout(timeout, 60 * 60 * 1000, handler.db);

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
              if (res.database === 'tmp') {
                if (res.collectionpath.contains('/'))
                  res.collectionpath = res.collectionpath.stringAfter('/')
                else
                  res.collectionpath = "";
              } else 
                res 
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
       if (name === 'url') {
        // downloading file and uncompressing if needed
        // counter++; -> getting all files at once
        //                                                      no jar
        counter++; // one more result to POST
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
      } else if (name === 'collection') {
        // create a collection at path 
        counter++; // one more result to POST
        var newcollection = value;

        Collection.create(handler.db, Path.join(collectionpath,assetpath,value), handler.sid, function(err,col){
          if (err) return finish(err);
          var fileInfo = new FileInfo(undefined, collectionpath, assetpath);
          fileInfo.asset = col;
          files.push(fileInfo);
          finish(undefined,col);
        });
      }
    }).on('file', function (name, file) {

      if (file.size ===0) {
        // form did not send a valid file
        return;
      }
      var fileInfo = map[file.path];
      fileInfo.size = file.size;
      fileInfo.type = Mime.lookup(fileInfo.name);


      counter++; // so that 'end' does not finish
      //                                                              no jar
      zipFile.unzipFile(handler, collectionpath, assetpath, fileInfo.name, fileInfo.path, null, function(error,result) {
        if (error)
          finish(error);
        else {
          // turn {asset} into fileInfos
          var getFileInfos = function (results) {

            if (results.fileInfo && results.fileInfo.asset) 
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
      finish({message:'Could not parse form', statusCode:400});
    }).on('progress', function (bytesReceived, bytesExpected) {
      if (bytesReceived > FileInfo.options.maxPostSize) {
        handler.req.connection.destroy();
      }
    }).on('end', finish);
    form.parse(handler.req);
  };

  // delete a file
  UploadHandler.prototype.destroy = function () {
    var handler = this;

    if (handler.req.url.slice(0, FileInfo.options.uploadUrl.length) === FileInfo.options.uploadUrl) {
      var fileName = Path.basename(decodeURIComponent(handler.req.url));
      if (fileName[0] !== '.') {
        fs.unlink(Path.join(FileInfo.options.uploadDir, fileName), function (ex) {
          Object.keys(FileInfo.options.imageVersions).forEach(function (version) {
            fs.unlink(Path.join(FileInfo.options.uploadDir, version, fileName));
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


  UploadHandler.prototype.get = function(params,uuid){

    var handler = this;

    // refctor this, this is a lot of code duplicaton !!!

    if (handler.db !== tmpdb) {
      if (!params && !uuid) {
        Collection.find(handler.db, '/', function (err, result) {
          if (err) return handler.handleError(err);
          else {
            result.collection.get(function (err, result) {
              if (err) handler.handleError(err);
              else handler.handleResult(result);
            })
          }
        })

      } else if (uuid) {
          console.log('handler.get UUID='+uuid);
          Resource.load(handler.db, uuid, function (err, resource) {
          if (err) handler.handleError(err);
          else {
            resource.get(function (err, result) {
              if (err) handler.handleError(err)
              else handler.handleResult(result);
            })
          }
        })
      } else /* this is a path */ {
        Collection.find(handler.db, params, function (err, res) {
          if (err) return handler.handleError(err);
          else {
            // res = {path collection}
            // this is a collection that we queried for

            // remove path from query
            console.log('res upload returned match =' + res.path + ' asset =' + res.assetpath);

            if (!res.assetpath) { // we found a collection
              res.collection.get(function(err,result){
                if (err) handler.handleError(err);
                else handler.handleResult(result);
              })
            } else {

              // let see if there is an asset there
              console.log('upload, looking for asset at ' + res.path + ' name=' + res.assetpath);

              res.collection.getAsset(res.assetpath, function (err, asset) {
                if (err) return handler.handleError(err);
                if (!asset) return handler.handleError('get '+handler.db.name+' could not find asset id =' + res.assetpath);
                // we have the asset, now we just need its data

                // this calls zipFile.uploadURL, and upload URL into cache, return filename in cache
                
                handler.db.getData(asset, function(err,filename){
                  if (err)
                    handler.handleError(err);
                  else
                    handler.sendFile(filename, asset.type, asset.name);
                })
                
                //handler.redirect(handler.db.getUrl(asset));

              })
            }
          }
        })
      }
    } else {

      if (!params && !uuid) {
        Collection.find(handler.db, Path.join('/', handler.sid), function (err, result) {
          if (err) return handler.handleError(err);
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
        console.log('handler.get uuid=' + uuid);
        Resource.load(handler.db, uuid, function (err, resource) {
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

        console.log('get tmp quering for collection =' + Path.join('/', handler.sid, params));

        Collection.find(handler.db, Path.join('/', handler.sid, params), function (err, res) {
          if (err) return handler.handleError(err);
          else {
            // res = {path collection}
            // this is a collection that we queried for

            // remove path from query
            console.log('res upload returned match =' + res.path + ' asset =' + res.assetpath);

            if (!res.assetpath) { // we found a collection
              res.collection.get(function(err,result){
                if (err) handler.handleError(err);
                else handler.handleResult(result);
              })
            } else {

              // let see if there is an asset there
              console.log('upload, looking for asset at ' + res.path + ' name=' + res.assetpath);

              res.collection.getAsset(res.assetpath, function (err, asset) {
                if (err) return handler.handleError(err);
                if (!asset) return handler.handleError('get /tmp/ cannot find asset=' + res.assetpath);
                
                // TODO: replace with var url = handler.db.getUrl(asset.uuid);
                var p = Path.resolve(FileInfo.options.uploadDir, asset.uuid);
                console.log('sending file=' + p)
                handler.sendFile(p,asset.type,asset.name);
              })
            }
          }
        })

      }
    }
  };

  // rest3d post upload API
  server.post(/^\/rest3d\/tmp.*/, function (req, res, next) {

    var handler = new UploadHandler(req, res, next);
    handler.allowOrigin();
    handler.db = tmpdb;

    var params = req.url.split("/tmp")[1];


    Collection.find(handler.db, Path.join('/', handler.sid, params), function (err, result) {

      console.log('res POST returned match =' + result.path + ' asset =' + result.assetpath);

      handler.post(result.path, result.assetpath);

    })

  });


  // rest3d get upload API
  server.get(/^\/rest3d\/tmp.*/, function (req, res, next) {
    var handler = new UploadHandler(req, res, next);
    handler.allowOrigin();
    handler.db = tmpdb;

    var params = req.url.split("/tmp")[1];
    if (params.contains('?'))
      params = params.stringBefore('?');
    while (params.slice(-1) === '/') params = params.slice(0, -1);

    var uuid = req.query.uuid;



    console.log('in GET tmp/ for asset=' + params)
    console.log('in GET tmp/upload with path =' + uuid);

    handler.get(params, req.query.uuid);
  });
};