
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


  var _getAssetInfo = function(entry, params){

    var daefilename = ""; // this will look for a .dae in the zip file
      
    var name=null;
    var headers=null;
    if (entry.headers && entry.headers['content-disposition']) 
      headers = entry.headers['content-disposition'];
    if (params.req && params.req.response && params.req.response.headers)
      headers = params.req.response.headers['content-disposition'];
    if (headers) {
      var index = headers.indexOf('filename=');
      name = headers.substring(index+9);
    } else 
      return params.cb(new Error('cannot find header in _getAssetInfo'));

    var asset = {type:'asset', name:name, id:params.uid, url:params.url}; 

    try {

      var data = fs.readFileSync(entry.filename);
      var reader = zip.Reader(data);
      var currentpath = '';

      reader.forEach(function (entry) {

        var filename = entry.getName();
     
        // returns list of files
        // find where this should be inserted
        var path = filename;
        var index = path.indexOf('/');
        var file = path;
        var folder = asset;

        while (index>0) {
          file = path.substring(0,index);

          if (currentpath != '') currentpath += '/';
          currentpath += file;

          if (!folder.children) folder.children=[];
          var test=null;
          for( var i=0; i< folder.children.length; i++ ) { if (folder.children[i].name === file) {test=folder.children[i]; break;}};
          if (!test) {
            test = {name:file, type:'folder', path:currentpath, size:entry._header.uncompressed_size};
            folder.children.push(test);
          } 
          folder = test;
          path = path.substring(index+1);
          index = path.indexOf('/');
        }
        if (path.length !== 0) {
          var item = {name:path, type:'file', path:filename};
          if (!folder.children) folder.children=[];
          folder.children.push(item);
          if (path.toLowerCase().endsWith('.dae'))
            asset.dae = filename;
        }

      });

      //console.log('asset='+asset);
      //console.log('cb='+params.cb);
      params.cb(null,asset);
    } catch (e)
    {
      params.cb(e);
    }

  };

  zipFile.getAssetInfo = function (uid,url,jar,cb){

    var params={};
    params.uid = uid;
    params.cb = cb;
    params.url=url;
    params.jar=jar;

    server.diskcache.hit(params.url,function(err,entry){
      if (entry) 
      {
        console.log('zip disk cache HIT!='+entry.filename);
        _getAssetInfo(entry,params);
      } else {
        var buffer = new memoryStream(null, {readable : false});
        buffer.on('error', function(error) {
           params.cb(error);
        });
        buffer.on('end', function () {
          params.req.response.body = this.toBuffer();
          server.diskcache.store(params.url,params.req.response,function(err,entry){
            _getAssetInfo(entry,params);
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

  // This will atempt to unzip a file, return file as asset otherwise
  zipFile.unzip = function (_entry,_params){

    var params=_params;
    var entry = _entry;

    var daefilename = ""; // this will look for a .dae in the zip file

      
    var name=null;
    var headers=null;
    
    if (entry.headers && entry.headers['content-disposition']) 
      headers = entry.headers['content-disposition'];
    if (params.req && params.req.response && params.req.response.headers)
      headers = params.req.response.headers['content-disposition'];
    if (headers) {
      var index = headers.indexOf('filename=');
      name = headers.substring(index+9);
    } 
    if (!name) {
      var contentType=null;
      if (entry.headers && entry.headers['content-type']) 
        contentType = entry.headers['content-type'];
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

    var asset = {type:'asset', name:name, id:params.uid, url:params.url}; 


    try {
      var data = fs.readFileSync(entry.filename);
      var reader = zip.Reader(data);

      reader.forEach(function (entry) {

        var filename = entry.getName();
        var currentpath = params.where+'/'+params.uid; // folder where file will be written
        var tmpfilename = currentpath+'/'+filename;

        mkdirp.sync(currentpath);

        var path = filename; 
        var index = path.indexOf('/'); // where to cut
        var file = path; // currenly considered item in the path
        var folder = asset; // were we are at in the {asset}

        while (index>0) {
          file = path.substring(0,index);
          
          currentpath += '/'+file;
          
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
          var item = {name:path, path:currentpath+'/'+path, size:entry._header.uncompressed_size, type:'file'};
          //console.log('item='+toJSON(item));
          if (!folder.children) folder.children=[];
          folder.children.push(item);
          if (path.toLowerCase().endsWith('.dae'))
            asset.dae = filename;
          fs.writeFileSync(tmpfilename, entry.getData());
          
        }
      });

      //console.log('asset='+asset);
      //console.log('cb='+params.cb);
      params.cb(null,asset);
    } catch (e)
    {
      if (e.message && e.message.startsWith("cannot find header in zip") || 
          e.message.startsWith("ZIP end of central directory record signature invalid")) {

        console.log("this is not a zip file");
        var newname = FileInfo.options.uploadDir + '/' + params.uid + '/' + name;
        var oldname = entry.filename;

        var folder = newname.substring(0,newname.lastIndexOf('/'));
        console.log("creating folder="+folder);
        mkdirp.sync(folder);

        console.log("copy "+entry.filename+" to "+newname);
        // do not move, this is from the cache ?
        fs.writeFileSync(newname, fs.readFileSync(entry.filename));

        var filename = newname.substring(newname.lastIndexOf('/')+1);
        var item = {name:filename, type:'file', path:newname};
        console.log("new entry="+toJSON(item));
        asset.children=[item];
        return params.cb(null,asset);
      }

      params.cb(e);
    }


  }


  return zipFile;
};

