
'use strict';


module.exports = function (server) {
  var zip=require('zip');
  var fs=require('fs');
  var mkdirp = require('mkdirp');
  var request = require('request');
  var memoryStream = require('memorystream');

  // create diskcache (no mem caching, no gzip)
  //var cache = require('./src/diskcache').Cache;

  var zipFile = {};


  var _getAssetInfo = function(entry, params){

    var daefilename = ""; // this will look for a .dae in the zip file

    try {
      // there must be better than doing a SYNC read!
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
        throw new Error('cannot find header in _getAssetInfo');

      var asset = {type:'asset', name:name, id:params.uid, path:'/'}; // output ... find name of asset somewhere?
      var data = fs.readFileSync(entry.filename)
      var reader = zip.Reader(data);

      reader.forEach(function (entry) {

        var filename = entry.getName();
        //console.log('****** entry *********')
        //console.log('filename=',filename);

  /* this code creates files and folders

          var tmpfilename = 'tmp/'+uid+'/'+filename;

          if (tmpfilename.endsWith('/')) {
          } else
          {
            var folder = tmpfilename.substring(0,tmpfilename.lastIndexOf('/'));
            console.log('folder='+folder)
            mkdirp.sync(folder); 
            
            fs.writeFileSync(tmpfilename, entry.getData(), function (err) {
              if (err) throw err;
              console.log('It\'s saved!');
            });
          
            if (filename.toLowerCase().endsWith('.dae'))
              daefilename = tmpfilename;
              
          }
  */
          // returns list of files
          // find where this should be inserted
          var path = filename;
          var index = path.indexOf('/');
          var file = path;
          var folder = asset;
          var found = asset;
          while (index>0) {
            file = path.substring(0,index);
            if (!folder.children) folder.children=[];
            var test=null;
            for( var i=0; i< folder.children.length; i++ ) { if (folder.children[i].name === file) {test=folder.children[i]; break;}};
            if (!test) {
              test = {name:file, type:'folder'};
              folder.children.push(test);
            } 
            folder = test;
            path = path.substring(index+1);
            index = path.indexOf('/');
          }
          if (path.length !== 0) {
            entry = {name:path, type:'file'};
            if (!folder.children) folder.children=[];
            folder.children.push(entry);
            if (path.toLowerCase().endsWith('.dae'))
              asset.dae = filename;
          }

      });

      //console.log('asset='+asset);
      //console.log('cb='+params.cb);
      params.cb(null,asset);
    } catch (e)
    {
      console.log('error'+e);
      params.cb(e);
    }

  };

  zipFile.getAssetInfo = function (uid,url,cb){

    var params={};
    params.uid = uid;
    params.cb = cb;
    params.url=url;

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
        params.req=request.get(url); 
        params.req.pipe(buffer);
      }
    });
  };
  return zipFile;
};

