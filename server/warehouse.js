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
  var toJSON = require('./tojson')

  server.get(/^\/rest3d\/warehouse.*/,function(req, res, next) {
    // parse body to get result we need
    function parseroot(body) {
      var result={};
      $ = cheerio.load(body);
      var search = $('span[class="itemtitle"]'); //use your CSS selector here
      result.name = $(search).text();
      result.uri = '46f3f70fe38d801af6dcb9e43126f21d';
      result.assets = []
      search = $('div[class="resulttitle"] a');
      result.loaded = true;
      result.type = 'root'
      $(search).each(function(i, link){
        var item={};
        item.name = $(link).attr('title')
        item.uri = $(link).attr('href').split("mid=")[1];
        item.type="collection"
        item.assets=[]; // indicates there are assets, to be discovered...
        item.loaded = false;
        result.assets.push(item);
      });
      return result;
    };  
    function parsecollection(body,uid) {
      var result={};
      $ = cheerio.load(body);
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
    function parsesearch(body,str) {
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
        for (var j=0; j<entry.binaryExts.length;j++){
          if (entry.binaryExts[j] === 'kmz') {
            kmz=entry.binaryNames[j];
          }
          if (entry.binaryNames[j] === 'st') 
            st = true;
        }
        if (!kmz) continue;
        var item={};
        item.name = entry.title;
        item.description = entry.description;
        item.id = entry.id;
        item.type="model";
        item.format="kmz";
        item.assets=null;
        item.uri="https://3dwarehouse.sketchup.com/model.html?id="+entry.id;
        item.creator = {name: entry.creator.displayName, id: entry.creator.id};
        item.license = "N/A";
        item.created = entry.createTime;
        item.modified = entry.modifyTime;
        item.parents = entry.parent;
        item.rating = entry.popularity;
        item.iconUri = (st ? "https://3dwarehouse.sketchup.com/3dw/getbinary?subjectId="+entry.id+"&subjectClass=entity&name=st" : null);
        item.assetUri = "https://3dwarehouse.sketchup.com/3dw/getbinary?subjectId="+entry.id+"&subjectClass=entity&name="+kmz;
        result.assets.push(item);
      }
      return result;
    };    
    var uid = req.url.split("/warehouse/")[1];
    console.log('[warehouse]' + uid);
    if (uid === null || uid==='')
    {
      request({ // 3d building collections
          url: 'http://sketchup.google.com/3dwarehouse/cldetails?mid=46f3f70fe38d801af6dcb9e43126f21d'
          //,headers : {
          //  "Authorization" : "Basic " + new Buffer(basex_rest_user + ":" + basex_rest_pass).toString("base64")
          //}
        },function(err, resp, body){
          if (err){
            console.log('CLIENT ERROR')
            console.log(err)
            return next(err);
          }
          result=parseroot(body);
            res.writeHead(200, {'Content-Type': 'application/json' });
          res.write(toJSON(result));
          res.end();
          return next();
          }
      );

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
        var end = 1000;
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
          var result = parsesearch(body,search);

              result.RequestUri = uid;

          res.writeHead(200, {'Content-Type': 'application/json' });
          res.write(toJSON(result));
          res.end();
          return next();
        });
      }
    } else
    {
      request({ // 3d building collections ?
        url: "https://3dwarehouse.sketchup.com/"
        },function(err, resp, body){
          if (err){
            console.log('ERROR asking 3dwarehouse main page')
            console.log(err)
            return next(err);
          }
          result=parsecollection(body,uid);
            res.writeHead(200, {'Content-Type': 'application/json' });
          res.write(toJSON(result));
          res.end();
          return next();
          }
      );
    }
  });
};

