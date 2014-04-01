
'use strict';


module.exports = function (server) {
  var zip=require('zip');
  var fs=require('fs');
  var mkdirp = require('mkdirp');
  var request = require('request');
  var memoryStream = require('memorystream');
  require('./utils');
  var FileInfo = require('./fileinfo');
  var Mime = require('mime');
  var toJSON = require('./tojson')

  var zipFile = {};

  // request file from url, with otional jar, 
  // then unzip, and then call cb with assetInfo
  zipFile.getAssetInfo = function (uid,url,jar,cb){

    var params={};
    params.uid = uid;
    params.cb = cb;
    params.url=url;
    params.jar=jar;
    params.dryrun=true;
    params.where='';

    uploadAndUnzip(params);
  }

  zipFile.unzip = function(uid,url,jar,where,cb){

    var params={};
    params.uid = uid;
    params.cb = cb;
    params.url=url;
    params.jar=jar;
    params.where=where;

    uploadAndUnzip(params);
  };

  var uploadAndUnzip = function(params){

    server.diskcache.hit(params.url,function(err,entry){
      if (entry) 
      {
        console.log('zip disk cache HIT!='+entry.filename);
        unzip(entry,params);
      } else {
        var buffer = new memoryStream(null, {readable : false});
        buffer.on('error', function(error) {
           params.cb(error);
        });
        buffer.on('end', function () {
          params.req.response.body = this.toBuffer();
          server.diskcache.store(params.url,params.req.response,function(err,entry){
            unzip(entry,params);
          });
        });
       
        // for some reason, request(url, cb) returns an incmplete body
        // but pipe() provides the right body
        // but I need the response headers, so I split this in half
        // and I can get to the header in 'close'
        var options={url: params.url};
        if (params.jar) options.jar=params.jar;
        params.req = request.get(options);
        params.req.pipe(buffer); 
      }
    });
  };

  // unzip a file
  // if params does not have a filename, extract filename from headers
  var unzip = function (resp,params){

    var daefilename = ""; // this will look for a .dae in the zip file

    var name=params.name;
    var headers=null;
    
    if (!name) {
      if (resp.headers && resp.headers['content-disposition']) 
        headers = resp.headers['content-disposition'];
      if (params.req && params.req.response && params.req.response.headers)
        headers = params.req.response.headers['content-disposition'];
      if (headers) {
        var index = headers.indexOf('filename=');
        name = headers.substring(index+9);
      } 
      if (!name) {
        var contentType=null;
        if (resp.headers && resp.headers['content-type']) 
          contentType = resp.headers['content-type'];
        if (!contentType && params.req && params.req.response && params.req.response.headers)
          contentType = params.req.response.headers['content-type'];
        if (contentType) {
          var extension = Mime.extension(contentType);
          name = params.uid+'.'+extension;
          console.log('made up name for file is'+name);
        }
      }
      if (!name)
        return params.cb(new Error('cannot find header in _getAssetInfo'));

    }

    var asset = {type:'asset', name:name, id:params.uid, url:params.url}; 

    try {
      var data = fs.readFileSync(resp.filename);
      var reader = zip.Reader(data);

      reader.forEach(function (entry) {

        var filename = entry.getName();
        var currentpath = "";
        var tmpfilename = filename;
        if (params.where) {
          currentpath = params.where+'/'+params.uid; // folder where file will be written
          tmpfilename = currentpath+'/'+filename;
        }

        if (!params.dryrun)
          mkdirp.sync(currentpath);

        var path = filename; 
        var index = path.indexOf('/'); // where to cut
        var file = path; // currenly considered item in the path
        var folder = asset; // were we are at in the {asset}

        while (index>0) {
          file = path.substring(0,index);
          
          if (currentpath !== '')
            currentpath += '/'+file;
          else
            currentpath = file;
          
          if (!params.dryrun)
            mkdirp.sync(currentpath);

          if (!folder.children) folder.children=[];
          var test=null;
          for( var i=0; i< folder.children.length; i++ ) { if (folder.children[i].name === file) {test=folder.children[i]; break;}};
          if (!test) {
            test = {name:file, type:'folder', path:currentpath};
            //console.log('folder ='+toJSON(test));
            folder.children.push(test);
          } 
          folder = test;
          path = path.substring(index+1);
          index = path.indexOf('/');
        }
        if (path.length !== 0) {
          var fullpath = currentpath+'/'+path;
          if (currentpath ==='') fullpath = path;
          var item = {name:path, path:fullpath, size:entry._header.uncompressed_size, type:'file'};
          //console.log('item='+toJSON(item));
          if (!folder.children) folder.children=[];
          folder.children.push(item);
          if (path.toLowerCase().endsWith('.dae'))
            asset.dae = filename;
          if(!params.dryrun)
            fs.writeFileSync(tmpfilename, entry.getData());
          
        }
      });
      params.cb(null,asset);
    } catch (e)
    {
      if (e.message && e.message.startsWith("cannot find header in zip") || 
          e.message.startsWith("ZIP end of central directory record signature invalid")) {

        console.log("this is not a zip file");
        var newname = FileInfo.options.uploadDir + '/' + params.uid + '/' + name;
        var oldname = resp.filename;

        var folder = newname.substring(0,newname.lastIndexOf('/'));
        console.log("creating folder="+folder);
        mkdirp.sync(folder);

        console.log("copy "+resp.filename+" to "+newname);
        // do not move, this is from the cache ?
        if (!params.dryrun)
          fs.writeFileSync(newname, fs.readFileSync(resp.filename));

        var filename = newname.substring(newname.lastIndexOf('/')+1);
        var item = {name:filename, type:'file', path:newname};
        console.log("new entry="+toJSON(item));
        asset.children=[item];
        params.cb(null,asset);
      } else
      params.cb(e);
    }
  }

  return zipFile;
};

