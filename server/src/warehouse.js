/*
warehouse.js

The MIT License (MIT)

Copyright (c) 2013 Rémi Arnaud - Advanced Micro Devices, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
'use strict';

module.exports = function (server) {
  server.warehouse = true;
  var request = require('request');
  var cheerio = require('cheerio');
  var toJSON = require('./tojson');

  var Handler = require('./handler');
  var zipFile = require('./zipfile');

  var Collection = require('./collection');
  var Asset = require('./asset');
  var Resource = require('./resource');


  server.get(/^\/rest3d\/info\/warehouse.*/,function(req, res, next) {
    
    var handler = new Handler(req,res,next);

    var uid = req.query.uuid;

    console.log('[info/warehouse] id=' + uid);

    if (!uid || uid === '') {
    	// this returns a json with all collections
      var start = 1;
      var end = 300;
      request({ // All collections
          url: "https://3dwarehouse.sketchup.com/3dw/Search"+
                "?startRow="+start+
                "&endRow="+end+
                "&calculateTotal=true"+
                "&q"+
                "&type=USER_GENERATED"+
                "&source"+
                "&title"+
                "&description"+
                "&sortBy=title%20ASC"+
                "&createUserDisplayName"+
                "&createUserId"+
                "&modifyUserDisplayName"+
                "&class=collection"+
                "&Lk=true"
          //,headers : {
          //  "Authorization" : "Basic " + new Buffer(basex_rest_user + ":" + basex_rest_pass).toString("base64")
          //}
        },function(err, resp, body){
          if (err){
            console.log('Error asking warehouse to list all collections')
            return handler.handleError(err);
          }
          var result=parseroot(body);
          if (!result) return handler.handleError('warehouse search returned empty result')
          result.name = '/';
          result.uuid = '';
          handler.handleResult(result.getSync());

        }
      );
    } else {
      // here return info on a model/collection
      // note, id exists, otherwise we would not be there

      var id = uid.split('_');
      if (id && id[0] === 'm' && id.length===3){
        console.log ('get warehouse model ID =['+id[1]+']')
        var url = "https://3dwarehouse.sketchup.com/3dw/getbinary?subjectId="+id[1]+"&subjectClass=entity&name="+id[2];

        // note: this is using diskcache
        // no jar -> undefined -> user=guest
        /*
        {"database":"eXist","name":"doc.kml","type":"application/vnd.google-earth.kml+xml",
         "created":{"date":1399877510599,"user":"A5OyPlGHedkrBTbqQUQ1qBscietma84wTGLB9IfW"},
          "uuid":"e4fced70-d9a1-11e3-a7c9-1d8ed1f8e783","parentId":"a1ad39b0-d967-11e3-b00e-c1e3a1d321cb",
          "size":1601,"assetpath":"doc.kml","collectionpath":"tmp"}
        
        */
        var asset = zipFile.getAssetInfoUrl(handler,url, undefined, function(error, files){
          if (error)
            handler.handleError(error);
          else { 
            var parentId=0;
            var result = new Collection('warehouse',parentId,'');
            result.uuid=uid;
            delete result.name;
            var col = result.getResourceSync();
            files.forEach(function (fileInfo) {
              var path = (fileInfo.assetpath ? fileInfo.assetpath+'/' : '');
              col.assets[path+fileInfo.name] = fileInfo.name;
              
            });
            return handler.handleResult(result.getSync());
          }
        });


      } else if (id && id[0] === 'c' && id.length===2) {
        console.log ('get warehouse collection ID =['+id[1]+']')
        var start = 1;
        var end = 100;
        var url = "https://3dwarehouse.sketchup.com/3dw/Search"+
        "?parentCollectionId="+id[1]+
        "&class=entity"+
        "&calculateTotal=true"+
        "&startRow="+start+
        "&endRow="+end+
        "&Lk=true";
        //https://3dwarehouse.sketchup.com/3dw/GetCollection?id=4ef38d3f07220753e9c10e42c8ca6ea7
        // return: collectionCount, entityCount, parentCatalogId, description, title
        //https://3dwarehouse.sketchup.com/3dw/Search?parentCollectionId=690ba0129bb10a958f7918fdf5f5eb1&class=entity&calculateTotal=true&startRow=1&endRow=4&Lk=true
        // returns:  "entries": [{
        //              
        request({ // 3d building collections ?
          url: url
          },function(err, resp, body){
            if (err){
              console.log('ERROR asking 3dwarehouse ID'=id[0]);
              return handler.handleError(err);
            }

            var result = parsesearch(body);
            if (!result) return handler.handlerError(new Error('3d warehouse get collection error'));

            result.uuid = uid;
            // get collections now
            var start = 1;
            var end = 100;
            var url = "https://3dwarehouse.sketchup.com/3dw/Search"+
                "?parentCollectionId="+id[1]+
                "&class=collection"+
                "&calculateTotal=true"+
                "&startRow="+start+
                "&endRow="+end+
                "&Lk=true";
            request({ // 3d building collections ?
              url: url
              },function(err, resp, body){
                if (err){
                  console.log('ERROR asking 3dwarehouse ID'=id[0]);
                  return handler.handleError(err);
                }
                var result2 = parseroot(body);

                if (!result2) return handle.handleError('warehouse returned empty body');

                // append collections to models
                var col1 = result.getResourceSync();
                var col2 = result2.getResourceSync();
                col1.children = col2.children;

                //result.RequestUri = uid;

                return handler.handleResult(result.getSync());
              }
            );
            
        });
      }
    }
  });


  
  server.get(/^\/rest3d\/data\/warehouse.*/,function(req, res, next) {
    
    var handler = new Handler(req,res,next);

    var uid = req.query.uuid;

    console.log('[data/warehouse] id=' + uid);

    // just browsing
    if (!uid || uid ==='') {
      error={statusCode:400,message:"missing uuid in GET /data/warehouse request"};
      return handler.handleError(error);
    }

    var id = uid.split('_');

    if (id && id[0] === 'm' && id.length===3){
      console.log ('get warehouse asset ID =['+id[1]+']')
      var url = "https://3dwarehouse.sketchup.com/3dw/getbinary?subjectId="+id[1]+"&subjectClass=entity&name="+id[2];

      // proxie
      //req.pipe(request(url)).pipe(res);
      // redirect
      handler.redirect(url);
      /*
      res.writeHead(302, {'Location': url});
      res.end();
      return next();
      */

    } else if (id && id[0] === 'c' && id.length===2){
      error={statusCode:400,message:"getting data from a collection is not supported"};
      console.log(eror.message);
      handler.handleError(error);
    } else {
      error={statusCode:400,message:"invalid id="+uid+" in GET data/warehouse"};
      handler.handleError(error);
    }
  });

  server.get(/^\/rest3d\/search\/warehouse.*/,function(req, res, next) {
    
    var handler = new Handler(req,res,next);

    var search = req.url.stringAfter('/warehouse');
    
    while (search[0]==='/') search = search.substring(1);

    console.log('[search/warehouse] id=' + search);


    if (search === '')
    {
      console.log('search string cannot be empty')
      return handle.handleError({message:'search string cannot be empty',statusCode:400});

    } else
    {
      // this returns a json
      var start = 1;
      var end = 100;
      var req = "https://3dwarehouse.sketchup.com/3dw/Search"+
                 "?startRow="+start+
                 "&endRow="+end+
                 "&calculateTotal=true"+
                 "&q="+search+
                 "&type=SKETCHUP_MODEL"+
                 "&source"+
                 "&title"+
                 "&description&sortBy=title%20ASC"+
                 "&createUserDisplayName"+
                 "&createUserId"+
                 "&modifyUserDisplayName"+
                 "&class=entity"+
                 "&Lk=true";

      request({ 
        url: req
      }, function(err, resp, body){
        if (err){

          console.log('ERROR searching 3dwarehouse for '+search);

          return handler.handleError(err);

        }
        var result = parsesearch(body);
        result.search = search;
        if (!result) return handler.handleError('3dwarehouse search returned empty result');

        //result.RequestUri = uid;

        return handler.handleResult(result.getSync());

      });

    }
  });



  var parsesearch =function(body) {


    var parentId =0;
    var result = new Collection('warehouse',parentId,'');
    delete result.name;
    var col = result.getResourceSync();
    var json = JSON.parse(body);

    if (json.success != true) return null;

/* TODO - handle partial result
    result.start = json.startRow;
    result.end = json.endRow;
    result.total = json.total;

    result.assets = [];
*/


    for (var i=0;i<json.entries.length;i++){
      var entry = json.entries[i];
      var kmz = null;
      var st = false;
      if (!entry.binaryNames) continue;
      for (var j=0; j<entry.binaryExts.length;j++){
        if (entry.binaryNames[j] === 'st') 
          st = true;
        if (entry.binaryNames[j] === 'k2' || entry.binaryNames[j] === 'ks' || entry.binaryNames[j] === 'zip')
        {
          if (!kmz) kmz = entry.binaryNames[j];
          else if (entry.binaryNames[j] === 'zip') kmz = entry.binaryNames[j]; // zip are prefered sources
        }
      }
      if (!kmz) continue;

      // those are assets
      var id = 'm_'+entry.id+"_"+kmz;
      col.assets[entry.title] = id;

      /*
      var item={};
      item.name = entry.title;
      item.description = entry.description;
      item.id = 'm_'+entry.id+"_"+kmz;
      item.type="model";
      item.format="kmz";
      item.assets=null;
      item.uri="https://3dwarehouse.sketchup.com/model.html?id="+entry.id;
      item.creator = {name: entry.creator.displayName, id: entry.creator.id};
      item.license = "N/A";
      item.created = entry.createTime;
      item.modified = entry.modifyTime;
      item.parents = 'c_'+entry.parent;
      item.rating = entry.popularity;
      item.iconUri = (st ? "https://3dwarehouse.sketchup.com/3dw/getbinary?subjectId="+entry.id+"&subjectClass=entity&name=st" : null);
      item.assetUri = "https://3dwarehouse.sketchup.com/3dw/getbinary?subjectId="+entry.id+"&subjectClass=entity&name="+kmz;
      item.previewUri = "https://3dwarehouse.sketchup.com/embed.html?entityId="+entry.id;
      result.assets.push(item);
      */
    }
    return result;
  };    

  // parse the result and return a root collection and a list of child collections

  var parseroot= function ( body) {
    
    var parentId =0;
    var result = new Collection('warehouse',parentId,'');
    delete result.name;
    var col = result.getResourceSync();
    var json = JSON.parse(body);

    if (json.success != true) return null;

    /* TODO -- deal with partial results

    result.start = json.startRow;
    result.end = json.endRow;
    result.total = json.total;

    result.assets = [];
    */

    for (var i=0;i<json.entries.length;i++){
      var entry = json.entries[i];
      var entityCount = entry.entityCount;
      var collectionCount = entry.collectionCount;


      // remove empty folders at root, there are tons of them
      if (entityCount===0 && collectionCount===0) continue;
      // remove entrys that have a bogus name
      if (entry.title.indexOf('<img src') !== -1) continue;

      var st = false;
      if (entry.binaryNames) 
        for (var j=0; j<entry.binaryExts.length;j++){
          if (entry.binaryNames[j] === 'st') 
            st = true;
        }


      var id = 'c_'+entry.id;
      col.children[entry.title] = id;


      /*
      var item={};
      item.name = entry.title;
      item.description = entry.description;
      item.id = 'c_'+entry.id;
      item.type="collection";

      item.assets=null;
      item.uri="https://3dwarehouse.sketchup.com/collection.html?id="+entry.id;
      item.creator = {name: entry.creator.displayName, id: entry.creator.id};
      item.license = "N/A";
      item.created = entry.createTime;
      item.modified = entry.modifyTime;
      item.parentID = entry.parentCatalogId;
      item.collectionCount = collectionCount;
      item.entityCount = entityCount;
      item.iconUri = (st ? "https://3dwarehouse.sketchup.com/3dw/getbinary?subjectId="+entry.id+"&subjectClass=collection&name=st" : null);
      result.assets.push(item);
      */
    }
    return result;
  };  

};

