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

  var request = require('request');
  var cheerio = require('cheerio');
  var toJSON = require('./tojson');
  var sendFile = require('./sendfile');

  var handler = require('./handler');
  var zipFile = require('./zipfile')(server);


  server.get(/^\/rest3d\/warehouse.*/,function(req, res, next) {
    
    var warehouseHandler = new handler(req,res,next);

    var uid = req.url.split("/warehouse/")[1];
    console.log('[warehouse]' + uid);

    // just browsing
    if (!uid || uid==='')
    {
    	// this returns a json with all collections
      var start = 1;
      var end = 200;
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
            console.log(err)
            return next(err);
          }
          var result=parseroot(body);
          res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin' : '*'});
          res.write(toJSON(result));
          res.end();
          return next();
          }
      );

    } else if (uid.startsWith('data/'))
    {
        var ids = uid.split('data/')[1];
        var id = ids.split('_');
 
        if (id && id[0] === 'm' && id.length===3){
          console.log ('get warehouse asset ID =['+id[1]+']')
          var url = "https://3dwarehouse.sketchup.com/3dw/getbinary?subjectId="+id[1]+"&subjectClass=entity&name="+id[2];

          // proxie
          req.pipe(request(url)).pipe(res);
          return next();

        } else if (id && id[0] === 'c' && id.length===2){
          // TODO call handleError
          var error = { "code": "API call error", "message": "invalid id="+ids+" in /rest3d/warehouse/data/ "};
          warehouseHandler.handleError(error);
        } else {
          error={code:"API call error",message:"transfering a collection is not supported"};
          warehouseHandler.handleError(error);
        }
        // return the asset 
    } else if (uid.startsWith('search/'))
    {
      var search = uid.split('search/')[1];
      console.log ('search warehouse for ['+search+']')
      if (search === '')
      {
        console.log('search string cannot be empty')
        res.writeHead(400);
        res.write('search string cannot be empty');
        res.end();
        return next();
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
            console.log('ERROR searching 3dwarehouse for '+search)
            console.log(err)
            return next(err);
          }
          var result = parsesearch(body);

          result.RequestUri = uid;

          res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin' : '*' });
          res.write(toJSON(result));
          res.end();
          return next();
        });
      }
    } else // requesting a specic ID
    {
    	// note, id exists, otherwise we would not be there

      var id = uid.split('_');
      if (id && id[0] === 'm' && id.length===3){
        console.log ('get warehouse model ID =['+id[1]+']')
        var url = "https://3dwarehouse.sketchup.com/3dw/getbinary?subjectId="+id[1]+"&subjectClass=entity&name="+id[2];

        // TODO - do we really need to use file for this?
        // can't we do this in memory instead?

        var asset = zipFile.getAssetInfo(uid,url, function(error, result){
          if (error)
            warehouseHandler.handleError(error);
          else
            warehouseHandler.handleResult(result);
        });



      } else if (id && id[0] === 'c' && id.length===2){
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
	            console.log(err)
	            return next(err);
	          }

	          var result = parsesearch(body);

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
			            console.log(err)
			            return next(err);
			          }
			          var result2 = parseroot(body);
			          // append collections to models
			          result.assets = result.assets.concat(result2.assets);
		            result.RequestUri = uid;
			          res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin' : '*' });
			          res.write(toJSON(result));
			          res.end();
			          return next();
			        }
			      );
	          
	      	}
	      );
      } else {
	      	// TODO call handleError
	      	var error = { "code": "API call error", "message": "invalid id="+uid+" in /rest3d/warehouse/ "};
          warehouseHandler.handleError(error);
	    }
    }
  });

// not used, this is the old code that had to parse the web page
// warehouse web site has changed, and json objects are now available
  var parsecollection = function(body) {
      var result={};
      var $ = cheerio.load(body);
      var search = $('span[class="itemtitle"]'); //use your CSS selector here
      result.name = $(search).text();
      result.uri = uid;
      result.assets = [];
      search = $('div[class="resulttitle"] a');
      //result.loaded = true;
      result.type = 'collection'
      $(search).each(function(i, link){
        if ($(link).attr('href').startsWith('/3dwarehouse/details'))
        {
          var item={};
          item.name = $(link).attr('title')
          item.uri = $(link).attr('href').split("mid=")[1];
          item.type="model"
          item.assets=null; // this element has no assets
          item.source = 'http://sketchup.google.com/3dwarehouse/download?mid='+item.uri+'&rtyp=zs';
          //item.loaded = true;
          result.assets.push(item);

        } else if ($(link).attr('href').startsWith('/3dwarehouse/cldetails'))
        {      
          var item={};
          item.name = $(link).attr('title')
          item.uri = $(link).attr('href').split("mid=")[1];
          item.type="collection"
          item.assets=[]; // indicates there are assets, to be discovered...
          //item.loaded = false;
          result.assets.push(item);
        }
      });
      return result;
    };
    var parsesearch =function(body) {
      var result={};
      var json = JSON.parse(body);

      result.success = json.success;
      if (result.success != true) return;

      result.start = json.startRow;
      result.end = json.endRow;
      result.total = json.total;

      result.assets = [];

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
      }
      return result;
    };    
    // 
    var parseroot= function (body) {
      var result={};
      var json = JSON.parse(body);

      result.success = json.success;
      if (result.success != true) return;

      result.start = json.startRow;
      result.end = json.endRow;
      result.total = json.total;

      result.assets = [];

      for (var i=0;i<json.entries.length;i++){
        var entry = json.entries[i];
        var entityCount = entry.entityCount;
        var collectionCount = entry.collectionCount;


        // remove empty folders at root, there are tons of them
        if (entityCount===0 && collectionCount===0) continue;

        var st = false;
        if (entry.binaryNames) 
          for (var j=0; j<entry.binaryExts.length;j++){
            if (entry.binaryNames[j] === 'st') 
              st = true;
          }

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
      }
      return result;
    };  

};

