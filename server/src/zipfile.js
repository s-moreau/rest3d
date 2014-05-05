'use strict';



  var zip = require('zip');
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

  zipFile.unzipUrl = function (handler, collectionpath, assetpath, url, jar, cb) {

    var params = {};
    params.handler = handler;
    params.cb = cb;
    params.url = url;
    params.jar = jar;

    params.collectionpath = collectionpath;
    params.assetpath = assetpath;

    uploadAndUnzip(params);
  };


  zipFile.unzipFile = function (handler, collectionpath, assetpath, name, filename, jar, cb) {

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

    var daefilename = ""; // this will look for a .dae in the zip file
    if (!params.name) return params.cb(new Error('cannot find name in unzip'))

    if (params.uploadOnly)
      return params.cb(null, {
        path: params.filename,
        name: params.name,
        type: 'file'
      });

    var asset = {
      type: 'asset',
      name: params.name,
      id: 'params.uid',
      url: params.url
    };

    var counter = 0;
    var files=[];
    
    var finish = function (err, rest3d_asset) {
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


    try {
      var data = fs.readFileSync(params.filename);
      var reader = zip.Reader(data);
      var there_was_an_error = false;

      // note: this will throw an error if this is not a zip file
      reader.forEach(function (entry) {
        if (there_was_an_error) return;
        
        var filename = entry.getName();
        var currentpath = Path.join(params.name,params.assetpath) || "";
       
        var path = filename;
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
            name: path,
            size: entry._header.uncompressed_size,
            type: 'file'
          };
         
          if (!folder.children) folder.children = [];
          folder.children.push(item);
          if (path.toLowerCase().endsWith('.dae'))
            asset.dae = filename;

          // file -> name, path, optional:size, type, not used: hash, lastModifiedDate)

          var fileInfo = new FileInfo(item, params.collectionpath, currentpath);
          fileInfo.buffer = entry.getData();
          files.push(fileInfo);
          counter++;
          if (!params.dryrun) {
             fileInfo.upload(params.handler, function(err,rest_asset){
              if (err) {
                params.cb(err);
                there_was_an_error=true;
              } else {
                item.fileInfo = fileInfo;
                finish(undefined);
              }
            });
          } else
            finish(undefined);
        }
      });

    } catch (e) {
 
        console.log("error in unzip - assuming this is not a zip file");

        var item = {
            name: params.name,
            path: params.filename
        };
        var fileInfo = new FileInfo(item, params.collectionpath, params.assetpath);
        item.fileInfo = fileInfo;

        files.push(fileInfo);
        asset = {name:params.name, path:params.filename, type:'file'};

        fileInfo.donotmove = params.donotmove;
        counter++;
        if (!params.dryrun) {
           fileInfo.upload(params.handler, function(err,rest_asset){
             asset.fileInfo = fileInfo;
             finish(err,rest_asset);
           });
        } else
          finish(undefined);
    }
  }

  module.exports = zipFile;
