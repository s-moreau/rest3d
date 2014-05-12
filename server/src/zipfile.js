'use strict';

  var fs = require('fs');

  var request = require('request');
  var memoryStream = require('memorystream');
  require('./utils');
  var FileInfo = require('./fileinfo');
  var Mime = require('mime');
  var toJSON = require('./tojson')
  var Path = require('path')

  var zipFile = {};
  zipFile.diskcache = null;

  var walk = require('walk');
  var rmdirSync = require('./rmdir')
 
  // request file from url, with otional jar, 
  // then unzip, and then call cb with assetInfo
  zipFile.getAssetInfoUrl = function (handler, url, jar, cb) {

    var params = {};
    params.handler = handler;
    params.cb = cb;
    params.url = url;
    params.jar = jar;
    params.dryrun = true;

    uploadAndUnzip(params);
  }

  zipFile.unzipUrl = function (handler,collectionpath, assetpath,jar,target,cb){





  }

  zipFile.unzipFile = function (handler,collectionpath, assetpath,target,cb){




  }

  zipFile.getAssetInfoFile = function (handler, name, filename, jar, cb) {

    var params = {};
    params.handler = handler;
    params.cb = cb;
    params.url = name;
    params.jar = jar;
    params.dryrun = true;
    params.filename = filename;

    uploadAndUnzip(params);
  }

  zipFile.unzipUploadUrl = function (handler, collectionpath, assetpath, url, jar, cb) {

    var params = {};
    params.handler = handler;
    params.cb = cb;
    params.url = url;
    params.jar = jar;

    params.collectionpath = collectionpath;
    params.assetpath = assetpath;

    uploadAndUnzip(params);
  };


  zipFile.unzipUploadFile = function (handler, collectionpath, assetpath, name, filename, jar, cb) {

    var params = {};
    params.handler = handler;
    params.cb = cb;
    params.name = name;
    params.filename = filename;
    params.jar = jar;
    params.collectionpath = collectionpath;
    params.assetpath = assetpath;

    uploadAndUnzip(params);
  };

  // upload does not use handler at all

  zipFile.uploadUrl = function (url, jar, cb) {

    var params = {};

    params.cb = cb;
    params.url = url;
    params.jar = jar;

    params.uploadOnly = true;

    uploadAndUnzip(params);
  };
  
  zipFile.uploadFile = function (name, filename, jar, cb) {

    var params = {};

    params.cb = cb;
    params.name = name;
    params.filename = filename;
    params.jar = jar;

    params.uploadOnly = true;

    uploadAndUnzip(params);
  };



  var uploadAndUnzip = function (params) {
    if (params.url) {
      if (!zipFile.diskcache) return params.cb('diskcache not set in zipFile');
      zipFile.diskcache.hit(params.url, function (err, entry) {
        if (entry) {
          console.log('zip disk cache HIT!=' + entry.filename);
          getname(entry,params);
          params.donotmove=true;
          unzip(params);
        } else {
          var buffer = new memoryStream(null, {
            readable: false
          });
          buffer.on('error', function (error) {
            params.cb(error);
          });
          buffer.on('end', function () {
            params.req.response.body = this.toBuffer();
            zipFile.diskcache.store(params.url, params.req.response, function (err, entry) {
              if (err)
                return params.cb(err);

              getname(entry,params);
              params.donotmove=true;
              unzip(params);
            });
          });

          // for some reason, request(url, cb) returns an incmplete body
          // but pipe() provides the right body
          // but I need the response headers, so I split this in half
          // and I can get to the header in 'close'
          var options = {
            url: params.url
          };
          if (params.jar) options.jar = params.jar;
          try {
            params.req = request.get(options);
            params.req.pipe(buffer);
          } catch (e) {
            console.log('caught error in uploadAndUnzip for url='+params.url);
            return params.cb(e)
          }
        }
      });
    } else {
      // callers has to set params.name and params.filename
      params.donotmove=false;
      unzip(params);
    }
  };

  var getname = function(resp, params) {

    var name = params.name;
    if (name) return

    var headers = null;

    if (!name) {
      if (resp.headers && resp.headers['content-disposition'])
        headers = resp.headers['content-disposition'];
      if (params.req && params.req.response && params.req.response.headers)
        headers = params.req.response.headers['content-disposition'];
      if (headers) {
        var index = headers.indexOf('filename=');
        name = headers.substring(index + 9);
      }
      if (!name) {
        var contentType = null;
        if (resp.headers && resp.headers['content-type'])
          contentType = resp.headers['content-type'];
        if (!contentType && params.req && params.req.response && params.req.response.headers)
          contentType = params.req.response.headers['content-type'];
        if (contentType) {
          var extension = Mime.extension(contentType);
          name = params.url;
          if (name.contains('?')) name = name.stringBefore('?');
          while (name.contains('/')) name = name.stringAfter('/');
          if (name.contains('.')) name = name.stringBefore('.');
          name += '.' + extension;
        }
      }
      if (!name)
        console.log('cannot find header in unzip/getfilename');
      params.name = name;

      params.filename = resp.filename;
    }
  }

  // unzip a file 
  // resp-> filename (input)
  // params.name -> output
  // if params does not have a filename, extract filename from headers
  var unzip = function (params) {

    var counter = 0;

    var there_was_an_error=false;

    var files = []; // retuns an array of fileInfos;

    if (!params.name) return params.cb(new Error('cannot find name in unzip'))

    if (params.uploadOnly) {
       var item = {
            name: params.name,
            path: params.filename 
            // size and type will be created by new FileInfo()
        };
        var fileInfo = new FileInfo(item, params.collectionpath, params.assetpath);

        fileInfo.donotmove = params.donotmove;
        return params.cb(undefined, fileInfo);
    }

    var folder = params.handler.req.session.sid;

    var finish = function (err, rest3d_asset) {
      if (there_was_an_error) return;
      if (err) {
        console.log('ERROR IN ZIPFILE FINISH');
        
        rmdirSync("tmp/"+folder);
        params.cb(err);
        counter = -1;
        there_was_an_error=true;
        return;
      }
      rmdirSync("tmp/"+folder);
      params.cb(undefined, files);
    };

    var folder = params.handler.req.session.sid;
    var cmd = 'unzip '+params.filename+' -x Thumbs.db .DS_Store .Trashes __MACOSX/* -d tmp/'+folder;
    console.log('exec ['+cmd+']');
    exec(cmd, function(code, output){
      if (code === 9){
         console.log("error in unzip - assuming this is not a zip file");

        var item = {
            name: params.name,
            path: params.filename 
            // size and type will be created by new FileInfo()
        };
        var fileInfo = new FileInfo(item, params.collectionpath, params.assetpath);
        //item.fileInfo = fileInfo;
        counter ++;
        //asset = {name:params.name, path:params.filename, type:fileInfo.type};

        fileInfo.donotmove = params.donotmove;
        files.push(fileInfo);

        if (!params.dryrun) {
           fileInfo.upload(params.handler, finish);
        } else
          finish(undefined);
      } else if (code) {
        console.log('Exit code:', code);
        console.log('Program output:', output);
        return finish('unzip exit code ='+code+' output='+output);
      } else {
      // now march the folder structure and upload files to database
        var options = {
          listeners: {
              names: function (root, nodeNamesArray) {
                /*
                nodeNamesArray.sort(function (a, b) {
                  if (a > b) return 1;
                  if (a < b) return -1;
                  return 0;
                });
                */
              }
            , directories: function (root, dirStatsArray, next) {
                // dirStatsArray is an array of `stat` objects with the additional attributes
                // * type
                // * error
                // * name
                
                next();
              }
            , file: function (root, fileStats, next) {
                
                  var item = {
                    name: fileStats.name,
                    path: Path.join(root,fileStats.name)
                  };
                  var currentpath = Path.join(root.stringAfter(folder),fileStats.name);
                  if (currentpath[0] ==='/') currentpath = currentpath.substring(1);
                  var fileInfo = new FileInfo(item, params.collectionpath, currentpath);

                  files.push(fileInfo);
                  counter++;
                  if (!params.dryrun) {
                     fileInfo.upload(params.handler, finish);
                  } else
                    //finish(undefined);

                  next();
           
              }
            , errors: function (root, nodeStatsArray, next) {
                next();
              }
            , end: function(){
              finish(undefined);
            }
          }
        };

        walk.walkSync("tmp/"+folder, options);
      }
        
    });
    // I could not make the following work with large ZIP files
/*
    var counter = 1; // event 'close' will sent last counter--
    var files=[];

    var there_was_an_error = false;
    
    var finish = function (err, rest3d_asset) {
      if (there_was_an_error) return;
      if (err) {
        console.log('ERROR IN ZIPFILE FINISH');
        //params.handler.handleError(err);
        params.cb(err);
        counter = -1;
        return;
      }
      counter -= 1;
      if (counter === 0) 
        params.cb(undefined, asset);

    };

    var readStream = fs.createReadStream(params.filename);
    fs.createReadStream(params.filename)
     .pipe(zip.Parse({verbose:true}))
     .on('entry', function (entry) {
        console.log('entry ='+entry.path)

        if (entry.type === 'Directory') return; // 'Directory' or 'File'
        var filename = entry.path;
        // entry.size;
        if (filename === "I don't care for that file") {
          entry.autodrain();
        } else {

          var path = filename;
          var currentpath = Path.join(params.name,params.assetpath) || "";
          var index = path.indexOf('/'); // where to cut
          var file = path; // currenly considered item in the path
          var folder = asset; // were we are at in the {asset}

          while (index > 0) {
            file = path.substring(0, index);

            if (currentpath !== '')
              currentpath += '/' + file;
            else
              currentpath = file;

            if (!folder.children) folder.children = [];
            var test = null;
            for (var i = 0; i < folder.children.length; i++) {
              if (folder.children[i].name === file) {
                test = folder.children[i];
                break;
              }
            };
            if (!test) {
              test = {
                name: file,
                type: 'folder',
                path: currentpath
              };
              folder.children.push(test);
            }
            folder = test;
            path = path.substring(index + 1);
            index = path.indexOf('/');
          }
          if (path.length !== 0) {
            var fullpath = currentpath + '/' + path;
            if (currentpath === '') fullpath = path;
            var item = {
              name: path
              //size: entry._header.uncompressed_size,
              //type: Mime.looku
            };
           
            if (!folder.children) folder.children = [];
            folder.children.push(item);
            if (path.toLowerCase().endsWith('.dae'))
              asset.dae = filename;

            // file -> name, path, optional:size, type, not used: hash, lastModifiedDate)

            var fileInfo = new FileInfo(item, params.collectionpath, currentpath);
            //entry.pipe(fs.createWriteStream('output/path'));
            fileInfo.buffer = new Buffer(entry.size);
            //entry.pipe(fileInfo.buffer);
            
            var data=[];
            entry
            .on('data',function(chuck){
              data.push(chuck);
            })
            .on('error', function(err){
              var error=new Error('error in reading stream in zipFile')
              console.log(error);
              finish(error)
            })
            .on('finish', function(a){
                console.log('got finish event '+a)
            })
            .on('end',function(){
              
              fileInfo.buffer = Buffer.concat(data);

              files.push(fileInfo);
              counter++;
              if (!params.dryrun) {
                 fileInfo.upload(params.handler, function(err,rest_asset){
                  if (err) {
                    there_was_an_error=true;
                    params.cb(err);
                  } else {
                    item.fileInfo = fileInfo;
                    finish(undefined);
                  }
                });
              } else
                finish(undefined);
            })
          }
        }
     })
     .on('error', function(err){
        console.log("error in unzip - assuming this is not a zip file");

        var item = {
            name: params.name,
            path: params.filename 
            // size and type will be created by new FileInfo()
        };
        var fileInfo = new FileInfo(item, params.collectionpath, params.assetpath);
        item.fileInfo = fileInfo;

        files.push(fileInfo);
        asset = {name:params.name, path:params.filename, type:fileInfo.type};

        fileInfo.donotmove = params.donotmove;

        if (!params.dryrun) {
           fileInfo.upload(params.handler, function(err,rest_asset){
             asset.fileInfo = fileInfo;
             finish(err,rest_asset);
           });
        } else
          finish(undefined);
     })
     .on('close', function(){
        finish(undefined);
     });
*/
  }

  module.exports = zipFile;
