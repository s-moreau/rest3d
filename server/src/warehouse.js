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

    if(process.platform.contains('win')){
    var joinToPath = '\\';
  } else {
    var joinToPath = '/';
  }


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
          var result=parsesearch(body);
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
        // this will give all the binaries uuid
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
        //https://3dwarehouse.sketchup.com/3dw/Search?parentCollectionId=4871dd3b77631cc747a8ae22df766ea8&class=collection&calculateTotal=true&startRow=1&endRow=4&Fn=true
        //              
        request({ // 3d building collections ?
          url: url
          },function(err, resp, body){
            if (err){
              console.log('ERROR asking 3dwarehouse ID='+id[1]);
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
                  console.log('ERROR asking 3dwarehouse ID='+id[1]);
                  return handler.handleError(err);
                }
                var result2 = parsesearch(body);

                if (!result2) return handle.handleError('warehouse returned empty body');

                // append collections to models
                var col1 = result.getResourceSync();
                var col2 = result2.getResourceSync();
                for (var attrname in col2.children) { col1.children[attrname] = col2.children[attrname]; }
                for (var attrname in col2.assets) { col1.assets[attrname] = col2.assets[attrname]; }

                //result.RequestUri = uid;

                return handler.handleResult(result.getSync());
              }
            );
            
        });
      } else
        return handler.handleError({message:'wrong id='+uid,statusCode:400});
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

/*
https://3dwarehouse.sketchup.com/3dw/GetCollection?id=4871dd3b77631cc747a8ae22df766ea8
{
    "tags": [""],
    "createTime": "2011-06-12 12:38:25.000",
    "averageRating": 0,
    "collectionCount": 4,
    "binaries": {
        "st": {
            "id": "80a53172-0cf8-4d05-a899-8b840d381b9d",
            "modifier": {
                "id": "1379538105755232331646158",
                "displayName": "SnowTiger"
            },
            "fileSize": 2197,
            "createTime": "2011-06-12 12:38:25.000",
            "contentUrl": "https://3dwarehouse.sketchup.com/3dw/getpubliccontent?contentId=80a53172-0cf8-4d05-a899-8b840d381b9d",
            "originalFileName": "4871dd3b77631cc747a8ae22df766ea8.jpg",
            "types": "smallThumbnail",
            "modifyTime": "2013-03-27 18:59:43.000",
            "url": "https://3dwarehouse.sketchup.com/3dw/getbinary?subjectId=4871dd3b77631cc747a8ae22df766ea8&subjectClass=collection&name=st",
            "creator": {
                "id": "1379538105755232331646158",
                "displayName": "SnowTiger"
            }
        }
    },
    "type": "USER_GENERATED",
    "entityCount": 0,
    "creator": {
        "id": "1379538105755232331646158",
        "displayName": "SnowTiger"
    },
    "isHidden": false,
    "id": "4871dd3b77631cc747a8ae22df766ea8",
    "modifier": {
        "id": "1379538105755232331646158",
        "displayName": "SnowTiger"
    },
    "title": "SnowTiger's Favorite Collections by Others",
    "parentCatalogId": null,
    "source": "SKETCHUP",
    "isPrivate": false,
    "currentUserRating": null,
    "binaryNames": ["st"],
    "description": "I recently decided that the easiest way to return to specific modeler's collections is to basically bookmark those collections. The best way to bookmark them is to create a collection of Collections.\r  So this is a Collection of all my favorite Collections of models by Others. \r  One or two Collections might even contain some of my own models, but this doesn't have any significant bearing on my reasons for choosing to save those collections. I will save collections because they contain a vast assortment and variety of great models as discovered by others.\r  I look forward to watching this Collection of Collections grow.\r  Come join me and let me know what you think.",
    "reviewCount": 0,
    "translations": {},
    "isCatalog": false,
    "attributes": {
        "display": {
            "showMap": {
                "value": true,
                "dataType": "boolean"
            }
        },
        "legacy": {
            "defaultLocale": {
                "value": "en",
                "dataType": "string"
            },
            "showContainingCollections": {
                "value": true,
                "dataType": "boolean"
            },
            "hasLogo": {
                "value": true,
                "dataType": "boolean"
            },
            "isPubliclyEditable": {
                "value": false,
                "dataType": "boolean"
            },
            "averageRating": {
                "value": 5,
                "dataType": "float"
            },
            "maxRating": {
                "value": 5,
                "dataType": "int"
            },
            "isCollectionOfCollections": {
                "value": true,
                "dataType": "boolean"
            },
            "isGoogleEarthReady": {
                "value": false,
                "dataType": "boolean"
            },
            "numRaters": {
                "value": 4,
                "dataType": "int"
            },
            "minRating": {
                "value": 1,
                "dataType": "int"
            }
        }
    },
    "modifyTime": "2013-03-27 18:59:43.000",
    "success": true
}
https://3dwarehouse.sketchup.com/3dw/Search?parentCollectionId=4871dd3b77631cc747a8ae22df766ea8&class=collection&calculateTotal=true&startRow=1&endRow=4&Fn=true
{
    "endRow": 4,
    "total": 4,
    "startRow": 1,
    "entries": [{
        "averageRating": 0,
        "creatorId": 178379,
        "title": "3D Buildings Layer nominees",
        "text_en": ["3D Buildings Layer nominees", "SketchUp Guide Tommy", "This collection is for nominating models for the 3D Buildings layer in Google Earth.", "3D Buildings Layer nominees", "This collection is for nominating models for the 3D Buildings layer in Google Earth."],
        "source": "SKETCHUP",
        "isPrivate": false,
        "description": "This collection is for nominating models for the 3D Buildings layer in Google Earth.",
        "reviewCount": 0,
        "isCatalog": false,
        "type": "USER_GENERATED",
        "isDeletedOrHidden": false,
        "binaryNames": ["st"],
        "parent": ["3e540ca8f451d8d637cbac9a42887e27", "34dea6f6fd3aab0834a5fdaaa4b9a258", "448375ca46720ecf517e3b35480d866", "1518093a6de779b7b01f5de0d4c60a8f", "4871dd3b77631cc747a8ae22df766ea8", "916bca9e7ed646869a7e2641408ee47", "17cf27de0958cab635b6b85eb7e2724a", "af5675305fe2aedc3a9191cfdc3d4086", "a98e1d5e5a2ca0cbaa801cdda8d55bf8", "3056ba63492700c21518677e8ce2c6e5", "1cb73a12aa99127a57ea74a12ff083c5", "5689f2cee3722ca0f6b0798449d600f8", "ud85483ab-ecba-4651-898e-a45498183300"],
        "title_en": ["3D Buildings Layer nominees"],
        "description_en": ["This collection is for nominating models for the 3D Buildings layer in Google Earth."],
        "popularity": 0,
        "id": "e014072e8d6463df85c8113b62bb1aa",
        "creator": {
            "displayName": "SketchUp Guide Tommy",
            "id": "1726226593313278674252950"
        },
        "modifier": {
            "displayName": "SketchUp Guide Tommy",
            "id": "1726226593313278674252950"
        },
        "createTime": "2008-04-11 21:11:57.000",
        "modifyTime": "2014-01-03 19:35:22.000",
        "translations": {
            "ca": {
                "title": "Nominats per a la capa Edificis 3D",
                "description": "Aquesta col·lecció es per a nominar models per a la capa Edificis 3D de Google Earth."
            },
            "es": {
                "title": "Nominados a la capa Edificios 3D",
                "description": "Esta colección es para la nominación de modelos a la capa Edificios 3D de Google Earth."
            }
        },
        "entityCount": 530,
        "collectionCount": 0
    }, {
        "title": "Ko Panyi fisherman vilage",
        "text_en": ["Ko Panyi fisherman vilage", "Ko Panyi (also known as Koh Panyee) (Thai: เกาะปันหยี) is a fishing village in Phang Nga Province, Thailand notable for being built on stilts by Indonesian fishermen. The population consists of roughly 200 families or between 1500 and 2000 people descended from 2 seafaring Muslim families from Java.\n \n  http://en.wikipedia.org/wiki/Ko_Panyi\n \n  http://www.youtube.com/watch?v=jU4oA3kkAWU", "baco yahanno", "Ko Panyi fisherman vilage", "Ko Panyi (also known as Koh Panyee) (Thai: เกาะปันหยี) is a fishing village in Phang Nga Province, Thailand notable for being built on stilts by Indonesian fishermen. The population consists of roughly 200 families or between 1500 and 2000 people descended from 2 seafaring Muslim families from Java.\n \n  http://en.wikipedia.org/wiki/Ko_Panyi\n \n  http://www.youtube.com/watch?v=jU4oA3kkAWU"],
        "description": "Ko Panyi (also known as Koh Panyee) (Thai: เกาะปันหยี) is a fishing village in Phang Nga Province, Thailand notable for being built on stilts by Indonesian fishermen. The population consists of roughly 200 families or between 1500 and 2000 people descended from 2 seafaring Muslim families from Java.\n \n  http://en.wikipedia.org/wiki/Ko_Panyi\n \n  http://www.youtube.com/watch?v=jU4oA3kkAWU",
        "source": "SKETCHUP",
        "creatorId": 51589,
        "isPrivate": false,
        "type": "USER_GENERATED",
        "reviewCount": 0,
        "averageRating": 0,
        "isDeletedOrHidden": false,
        "isCatalog": false,
        "parentCatalogId": ["0"],
        "binaryNames": ["st"],
        "parent": ["4871dd3b77631cc747a8ae22df766ea8"],
        "title_en": ["Ko Panyi fisherman vilage"],
        "description_en": ["Ko Panyi (also known as Koh Panyee) (Thai: เกาะปันหยี) is a fishing village in Phang Nga Province, Thailand notable for being built on stilts by Indonesian fishermen. The population consists of roughly 200 families or between 1500 and 2000 people descended from 2 seafaring Muslim families from Java.\n \n  http://en.wikipedia.org/wiki/Ko_Panyi\n \n  http://www.youtube.com/watch?v=jU4oA3kkAWU"],
        "popularity": 0,
        "id": "ddd9451a9bc8ff0d74f4d8720802f8d3",
        "creator": {
            "displayName": "baco yahanno",
            "id": "0553123819038560175902261"
        },
        "modifier": {
            "displayName": "baco yahanno",
            "id": "0553123819038560175902261"
        },
        "createTime": "2011-05-04 16:23:45.000",
        "modifyTime": "2011-05-04 16:49:42.000",
        "translations": {
            "en": {
                "externalUrl": "http://en.wikipedia.org/wiki/Ko_Panyi"
            }
        },
        "entityCount": 10,
        "collectionCount": 0
    }, {
        "title": "Top 11 of Damo's Models",
        "text_en": ["Top 11 of Damo's Models", "The top 11 what I consider to be my best geo-located models.......", "Damo", "Top 11 of Damo's Models", "The top 11 what I consider to be my best geo-located models......."],
        "description": "The top 11 what I consider to be my best geo-located models.......",
        "source": "SKETCHUP",
        "creatorId": 1573,
        "isPrivate": false,
        "type": "USER_GENERATED",
        "reviewCount": 0,
        "averageRating": 0,
        "isDeletedOrHidden": false,
        "isCatalog": false,
        "parentCatalogId": ["0"],
        "binaryNames": ["st"],
        "parent": ["4871dd3b77631cc747a8ae22df766ea8", "a3c36ef74940ca082e4d5bd853781216", "3056ba63492700c21518677e8ce2c6e5"],
        "title_en": ["Top 11 of Damo's Models"],
        "description_en": ["The top 11 what I consider to be my best geo-located models......."],
        "popularity": 0,
        "id": "7b8cd92c0d8c5278a5f88291d2e1580c",
        "creator": {
            "displayName": "Damo",
            "id": "0319491755264223266044156"
        },
        "modifier": {
            "displayName": "Damo",
            "id": "0319491755264223266044156"
        },
        "createTime": "2011-05-25 22:58:04.000",
        "modifyTime": "2013-01-03 00:05:52.000",
        "translations": {},
        "entityCount": 11,
        "collectionCount": 0
    }, {
        "title": "Saint Pall's Reykjavik",
        "text_en": ["Saint Pall's Reykjavik", "Models of buildings and structures in Reykjavik, Iceland made by St. Pall.", "St.Pall", "Models of buildings and structures in Reykjavik, Iceland made by St. Pall."],
        "description": "Models of buildings and structures in Reykjavik, Iceland made by St. Pall.",
        "source": "SKETCHUP",
        "creatorId": 11422,
        "isPrivate": false,
        "type": "USER_GENERATED",
        "reviewCount": 0,
        "averageRating": 0,
        "isDeletedOrHidden": false,
        "isCatalog": false,
        "parentCatalogId": ["0"],
        "binaryNames": ["st"],
        "parent": ["a7f705a6dab14458e1a76950e7797b26", "bad9e68ff3ae2cd570b134ef842f17d", "4871dd3b77631cc747a8ae22df766ea8", "39c40f227db27ff6803bf82e60da2461", "a98e1d5e5a2ca0cbaa801cdda8d55bf8", "3056ba63492700c21518677e8ce2c6e5", "34a627ac20bca52ac4a3da1c73fd9205"],
        "title_fi": ["Saint Pall's Reykjavik"],
        "text_fi": ["Saint Pall's Reykjavik"],
        "description_en": ["Models of buildings and structures in Reykjavik, Iceland made by St. Pall."],
        "popularity": 0,
        "id": "36699c5482d3bd713e44ddf14f881525",
        "creator": {
            "displayName": "St.Pall",
            "id": "1285541943464810890606506"
        },
        "modifier": {
            "displayName": "St.Pall",
            "id": "1285541943464810890606506"
        },
        "createTime": "2010-06-21 11:32:33.000",
        "modifyTime": "2013-12-13 15:31:42.000",
        "translations": {},
        "entityCount": 129,
        "collectionCount": 0
    }],
    "success": true
}
https://3dwarehouse.sketchup.com/3dw/Search?parentCollectionId=e014072e8d6463df85c8113b62bb1aa&class=entity&calculateTotal=true&startRow=1&endRow=4&Fn=true
{
    "endRow": 4,
    "total": 530,
    "startRow": 1,
    "entries": [{
        "averageRating": 5,
        "text_en": ["Barcelona", "Catalonia", "Catalunya", "Cataluña", "ceramics", "España", "flamboyant", "Guell", "Parc Güell", "Parque Güell", "Spain", "Park Güell by Antoni Gaudi - Entrance Pavilions - Barcelona, Spain", "Belgrade Sim", "Park Güell was built from 1900. to 1914. on a hill originally intended for a residential neighborhood. Two pavilion towers marking the entrance to the park are also referred as the guardian towers and are characterized by exceptionally decorated and flamboyant architecture. Park Güell, along with the Sagrada Familia, Casa Mila and Casa Batllo, is among the most renowned projects of the famous Catalan architect Antoni Gaudi. // Park Guelj građen je od 1900. do 1914. na uzbrdici koja je prvobitno planirana za stambeno naselje. Dve kule-paviljoni koje obeležavaju ulaz nazivaju se i stražarskim kulama i izrazito su dekorisane arhitekture. Park Guelj, uz Sagradu Familiu, Kasa Milu i Kasu Batlo jedno je od najpoznatijih dela čuvenog katalonskog arhitekte Antonija Gaudija.", "Park Güell was built from 1900. to 1914. on a hill originally intended for a residential neighborhood. Two pavilion towers marking the entrance to the park are also referred as the guardian towers and are characterized by exceptionally decorated and flamboyant architecture. Park Güell, along with the Sagrada Familia, Casa Mila and Casa Batllo, is among the most renowned projects of the famous Catalan architect Antoni Gaudi. // Park Guelj građen je od 1900. do 1914. na uzbrdici koja je prvobitno planirana za stambeno naselje. Dve kule-paviljoni koje obeležavaju ulaz nazivaju se i stražarskim kulama i izrazito su dekorisane arhitekture. Park Guelj, uz Sagradu Familiu, Kasa Milu i Kasu Batlo jedno je od najpoznatijih dela čuvenog katalonskog arhitekte Antonija Gaudija."],
        "creatorId": 6848,
        "longitude": 2.153095,
        "title": "Park Güell by Antoni Gaudi - Entrance Pavilions - Barcelona, Spain",
        "altitude": 0,
        "source": "SKETCHUP",
        "isPrivate": false,
        "description": "Park Güell was built from 1900. to 1914. on a hill originally intended for a residential neighborhood. Two pavilion towers marking the entrance to the park are also referred as the guardian towers and are characterized by exceptionally decorated and flamboyant architecture. Park Güell, along with the Sagrada Familia, Casa Mila and Casa Batllo, is among the most renowned projects of the famous Catalan architect Antoni Gaudi. // Park Guelj građen je od 1900. do 1914. na uzbrdici koja je prvobitno planirana za stambeno naselje. Dve kule-paviljoni koje obeležavaju ulaz nazivaju se i stražarskim kulama i izrazito su dekorisane arhitekture. Park Guelj, uz Sagradu Familiu, Kasa Milu i Kasu Batlo jedno je od najpoznatijih dela čuvenog katalonskog arhitekte Antonija Gaudija.",
        "reviewCount": 36,
        "type": "SKETCHUP_MODEL",
        "isDeletedOrHidden": false,
        "latitude": 41.413497,
        "popularity": 7309,
        "text_lt": ["udc85510d-792c-4110-b1eb-155b67e0aea0", "99607ffb-04bd-461a-a96f-01953a313b16", "bot_lt", "51383", "renderserver renderserver", "ecf0201e-ffaa-4b0d-83c1-5d656e0868f9", "11316", "0338068331584126904932358", "jpg", "ffb47f5292d43136cda7e8e257af648c.jpg", "Belgrade Sim"],
        "binaryNames": ["bot_lt", "bot_smontage", "bot_st", "ks", "log", "lt", "s8", "skj", "skjtexture/texture_img_10.png", "skjtexture/texture_img_11.png", "skjtexture/texture_img_12.png", "skjtexture/texture_img_13.png", "skjtexture/texture_img_14.png", "skjtexture/texture_img_15.png", "skjtexture/texture_img_16.png", "skjtexture/texture_img_17.png", "skjtexture/texture_img_18.png", "skjtexture/texture_img_19.png", "skjtexture/texture_img_2.png", "skjtexture/texture_img_20.png", "skjtexture/texture_img_21.png", "skjtexture/texture_img_22.png", "skjtexture/texture_img_23.png", "skjtexture/texture_img_24.png", "skjtexture/texture_img_25.png", "skjtexture/texture_img_26.png", "skjtexture/texture_img_27.png", "skjtexture/texture_img_28.png", "skjtexture/texture_img_29.png", "skjtexture/texture_img_3.png", "skjtexture/texture_img_30.png", "skjtexture/texture_img_31.png", "skjtexture/texture_img_32.png", "skjtexture/texture_img_33.png", "skjtexture/texture_img_34.png", "skjtexture/texture_img_35.png", "skjtexture/texture_img_36.png", "skjtexture/texture_img_37.png", "skjtexture/texture_img_38.png", "skjtexture/texture_img_39.png", "skjtexture/texture_img_4.png", "skjtexture/texture_img_40.png", "skjtexture/texture_img_41.png", "skjtexture/texture_img_42.png", "skjtexture/texture_img_43.png", "skjtexture/texture_img_44.png", "skjtexture/texture_img_45.png", "skjtexture/texture_img_46.png", "skjtexture/texture_img_47.png", "skjtexture/texture_img_48.png", "skjtexture/texture_img_5.png", "skjtexture/texture_img_6.png", "skjtexture/texture_img_7.png", "skjtexture/texture_img_8.png", "skjtexture/texture_img_9.png", "smontage", "st"],
        "reviewers": ["0176019922058571810504301", "0300854158600359173853681", "1059984736033896563201617", "0773010434377981790340055", "0659867491000466796160028", "1512358731834911344535505", "0969219958342385519548005", "0748874066615023077440300", "1075517635620607674712084", "0912215308759983884231968", "0582307310246917745663036", "0940359228228083606105636", "1740565216780674800560313", "0764082217470505295717234", "0474550786855026421405040", "0051002201981774459806834", "1155416332595902912335267", "0205482123203058881500091", "0523302193737765823759711", "1215047910010415958255197", "1285541943464810890606506", "1339278268599493370808305", "0123859736507442936414317", "0597843197407614654222928", "0360767830900222442019616", "1471356831259605490843005", "0554603877776304708803567", "1097874199049318448123977", "1398437394671555589557572", "0590976555287419058321254", "0973046409669036277820028", "1255794114432690252311215", "0249369224553912146714335", "0346488855095652644430972", "1492508857488452334630166", "0565813584455484174818008"],
        "parent": ["c6fc0fc9c7d9a3006b6995ab1da351de", "ad4e3e25653b649b4173bd995dfc5711", "7c058492aa5934efa4f754e5234e9709", "182f3a5646449ae0d035d2ae969f3beb", "d50b7d55819b482a859807d4c639f399", "e014072e8d6463df85c8113b62bb1aa", "d8f5f7e083f176e1789452bafa4f558b"],
        "title_it": ["Park Güell by Antoni Gaudi - Entrance Pavilions - Barcelona, Spain"],
        "text_it": ["Park Güell by Antoni Gaudi - Entrance Pavilions - Barcelona, Spain"],
        "description_en": ["Park Güell was built from 1900. to 1914. on a hill originally intended for a residential neighborhood. Two pavilion towers marking the entrance to the park are also referred as the guardian towers and are characterized by exceptionally decorated and flamboyant architecture. Park Güell, along with the Sagrada Familia, Casa Mila and Casa Batllo, is among the most renowned projects of the famous Catalan architect Antoni Gaudi. // Park Guelj građen je od 1900. do 1914. na uzbrdici koja je prvobitno planirana za stambeno naselje. Dve kule-paviljoni koje obeležavaju ulaz nazivaju se i stražarskim kulama i izrazito su dekorisane arhitekture. Park Guelj, uz Sagradu Familiu, Kasa Milu i Kasu Batlo jedno je od najpoznatijih dela čuvenog katalonskog arhitekte Antonija Gaudija."],
        "tag_es": ["Barcelona", "Catalonia", "Catalunya", "Cataluña", "ceramics", "España", "flamboyant", "Guell", "Parc Güell", "Parque Güell", "Spain"],
        "text_es": ["Barcelona", "Catalonia", "Catalunya", "Cataluña", "ceramics", "España", "flamboyant", "Guell", "Parc Güell", "Parque Güell", "Spain"],
        "id": "ffb47f5292d43136cda7e8e257af648c",
        "creator": {
            "displayName": "Belgrade Sim",
            "id": "0338068331584126904932358"
        },
        "modifier": {
            "displayName": "renderserver renderserver",
            "id": "udc85510d-792c-4110-b1eb-155b67e0aea0"
        },
        "createTime": "2011-11-01 11:27:28.000",
        "modifyTime": "2014-03-21 01:50:53.000",
        "translations": {}
    }, {
        "averageRating": 5,
        "text_en": ["Bosra", "Bosra Amphitheatre", "Busra", "Roman Theatre", "Syria", "Bosra Amphitheatre", "suhiman", "Roman theatre Bosra", "Bosra Amphitheatre", "Roman theatre Bosra"],
        "creatorId": 4516,
        "longitude": 36.481694,
        "title": "Bosra Amphitheatre",
        "altitude": 0,
        "source": "SKETCHUP",
        "isPrivate": false,
        "description": "Roman theatre Bosra",
        "reviewCount": 11,
        "type": "SKETCHUP_MODEL",
        "isDeletedOrHidden": false,
        "latitude": 32.517801,
        "popularity": 2644,
        "text_lt": ["udc85510d-792c-4110-b1eb-155b67e0aea0", "1bf923e6-66d1-4463-ab9d-e332b5c77abb", "bot_lt", "83808", "renderserver renderserver", "cecd1bf6-1696-4d5a-9701-8168eb84efe1", "15099", "0277383359556255497759147", "jpg", "ff6cef964fec342cdb6abae74d98ccec.jpg", "suhiman"],
        "binaryNames": ["bot_lt", "bot_smontage", "bot_st", "ks", "log", "lt", "s8", "skj", "skjtexture/texture_img_1.png", "skjtexture/texture_img_10.png", "skjtexture/texture_img_11.png", "skjtexture/texture_img_12.png", "skjtexture/texture_img_13.png", "skjtexture/texture_img_14.png", "skjtexture/texture_img_15.png", "skjtexture/texture_img_16.png", "skjtexture/texture_img_17.png", "skjtexture/texture_img_18.png", "skjtexture/texture_img_19.png", "skjtexture/texture_img_2.png", "skjtexture/texture_img_20.png", "skjtexture/texture_img_21.png", "skjtexture/texture_img_22.png", "skjtexture/texture_img_3.png", "skjtexture/texture_img_4.png", "skjtexture/texture_img_5.png", "skjtexture/texture_img_6.png", "skjtexture/texture_img_7.png", "skjtexture/texture_img_8.png", "skjtexture/texture_img_9.png", "smontage", "st"],
        "reviewers": ["1118994338676907360107191", "1512358731834911344535505", "0557498138979575318425039", "1580666136256115551632296", "1159723894312151968136428", "1155416332595902912335267", "1215047910010415958255197", "0123859736507442936414317", "0316611576384812436417506", "1471356831259605490843005", "1570528695199341126511039"],
        "parent": ["bb6a3cf268d2617b23be5314fc0638d1", "e014072e8d6463df85c8113b62bb1aa", "68f8ac83fa4ccc351ceeda6f5565a404"],
        "title_en": ["Bosra Amphitheatre"],
        "description_en": ["Roman theatre Bosra"],
        "tag_hr": ["Bosra", "Bosra Amphitheatre", "Busra", "Roman Theatre", "Syria"],
        "text_hr": ["Bosra", "Bosra Amphitheatre", "Busra", "Roman Theatre", "Syria"],
        "id": "ff6cef964fec342cdb6abae74d98ccec",
        "creator": {
            "displayName": "suhiman",
            "id": "0277383359556255497759147"
        },
        "modifier": {
            "displayName": "renderserver renderserver",
            "id": "udc85510d-792c-4110-b1eb-155b67e0aea0"
        },
        "createTime": "2012-03-23 10:30:09.000",
        "modifyTime": "2014-03-22 09:39:18.000",
        "translations": {}
    }, {
        "averageRating": 5,
        "text_en": ["3dbyMan", "aegean", "church", "cyclades", "mediterranean", "white washed", "Παναγιά Παραπορτιανή, Μύκονος - Panagia Paraportiani, Mykonos", "}-M@No->", "The church received the name \u201cParaportiani\u201d because it can be reached by the side door that belonged to the medieval castle of Mykonos.  Its name literally means \u201cOur Lady of the Side Gate\u201d in Greek, as its entrance was found in the side gate of the entrance to the Kastro area. The building of this church started in 1425 and was not completed until the 17th century. This impressive, whitewashed church actually consists of five other churches attached all together: the four churches are all on the ground and constitute the base of the fifth church that has been built on top of them. This architectural spottiness has made Panagia Paraportiani the most photographed church in Greece and one of the strangest in the world!", "The church received the name \u201cParaportiani\u201d because it can be reached by the side door that belonged to the medieval castle of Mykonos.  Its name literally means \u201cOur Lady of the Side Gate\u201d in Greek, as its entrance was found in the side gate of the entrance to the Kastro area. The building of this church started in 1425 and was not completed until the 17th century. This impressive, whitewashed church actually consists of five other churches attached all together: the four churches are all on the ground and constitute the base of the fifth church that has been built on top of them. This architectural spottiness has made Panagia Paraportiani the most photographed church in Greece and one of the strangest in the world!"],
        "creatorId": 1468,
        "longitude": 25.325674,
        "title": "Παναγιά Παραπορτιανή, Μύκονος - Panagia Paraportiani, Mykonos",
        "altitude": 0,
        "source": "SKETCHUP",
        "isPrivate": false,
        "description": "The church received the name \u201cParaportiani\u201d because it can be reached by the side door that belonged to the medieval castle of Mykonos.  Its name literally means \u201cOur Lady of the Side Gate\u201d in Greek, as its entrance was found in the side gate of the entrance to the Kastro area. The building of this church started in 1425 and was not completed until the 17th century. This impressive, whitewashed church actually consists of five other churches attached all together: the four churches are all on the ground and constitute the base of the fifth church that has been built on top of them. This architectural spottiness has made Panagia Paraportiani the most photographed church in Greece and one of the strangest in the world!",
        "reviewCount": 30,
        "type": "SKETCHUP_MODEL",
        "isDeletedOrHidden": false,
        "latitude": 37.447123999999995,
        "popularity": 2705,
        "binaryNames": ["k2", "lt", "smontage", "st"],
        "text_lt": ["ea92116a-19c7-48fd-9dd5-a6a2b3188166", "123876", "0748874066615023077440300", "jpg", "ff110c860e1405ff725dbc7568ab96d.jpg", "}-M@No->"],
        "parent": ["4a59bda2a124d70613ab72cb460f317", "f517ec502d87f4e834eed748ebb78c65", "7c058492aa5934efa4f754e5234e9709", "ee391271cc03a07a44ee592c32b4f0ae", "e014072e8d6463df85c8113b62bb1aa", "d8f5f7e083f176e1789452bafa4f558b", "8e41523e4e32c77072fbab13f7a8df43", "a67201f0a2eee671b7fb2b168773da97"],
        "title_el": ["Παναγιά Παραπορτιανή, Μύκονος - Panagia Paraportiani, Mykonos"],
        "text_el": ["Παναγιά Παραπορτιανή, Μύκονος - Panagia Paraportiani, Mykonos"],
        "description_en": ["The church received the name \u201cParaportiani\u201d because it can be reached by the side door that belonged to the medieval castle of Mykonos.  Its name literally means \u201cOur Lady of the Side Gate\u201d in Greek, as its entrance was found in the side gate of the entrance to the Kastro area. The building of this church started in 1425 and was not completed until the 17th century. This impressive, whitewashed church actually consists of five other churches attached all together: the four churches are all on the ground and constitute the base of the fifth church that has been built on top of them. This architectural spottiness has made Panagia Paraportiani the most photographed church in Greece and one of the strangest in the world!"],
        "tag_da": ["3dbyMan", "aegean", "church", "cyclades", "mediterranean", "white washed"],
        "text_da": ["3dbyMan", "aegean", "church", "cyclades", "mediterranean", "white washed"],
        "id": "ff110c860e1405ff725dbc7568ab96d",
        "creator": {
            "displayName": "}-M@No->",
            "id": "0748874066615023077440300"
        },
        "modifier": {
            "displayName": "}-M@No->",
            "id": "0748874066615023077440300"
        },
        "createTime": "2011-10-31 13:37:40.000",
        "modifyTime": "2011-11-06 13:29:25.000",
        "translations": {
            "en": {
                "externalUrl": "http://www.google.gr/search?hl=el&q=paraportiani&gs_sm=s&gs_upl=0l0l0l5565l0l0l0l0l0l0l0l0ll0l0&bav=on.2,or.r_gc.r_pw.,cf.osb&biw=1280&bih=890&um=1&ie=UTF-8&tbm=isch&source=og&sa=N&tab=wi"
            }
        }
    }, {
        "averageRating": 5,
        "text_en": ["Britain", "Cromwell", "England", "Lion", "London", "Oliver", "Sculpture", "UK", "Westminster", "Cromwell Green & Statue", "Jonathan Green", "This statue of Oliver Cromwell, on Cromwell Green at the Palace of Westminster, was sculpted in 1899 by Hamo Thornycroft. Although Cromwell is noted for turning Britain into a republic, he is also a controversial figure in history because of his involvement in ordering the deaths of many catholics, almost bordering on genocide. He is still universally hated by catholics today.\r   ____About the model: The Google Earth terrain of the green is actually around 2.5m too high (It is actually well below the level of the road), and for this reason the new visitor centre ramp has been omitted from the model. The texturing on the rear of the lion and Cromwell are assumed, since it is not possible to get a photo to do this (Perhaps my local MP can help?) Thank you  for reading.", "Cromwell Green & Statue", "This statue of Oliver Cromwell, on Cromwell Green at the Palace of Westminster, was sculpted in 1899 by Hamo Thornycroft. Although Cromwell is noted for turning Britain into a republic, he is also a controversial figure in history because of his involvement in ordering the deaths of many catholics, almost bordering on genocide. He is still universally hated by catholics today.\r   ____About the model: The Google Earth terrain of the green is actually around 2.5m too high (It is actually well below the level of the road), and for this reason the new visitor centre ramp has been omitted from the model. The texturing on the rear of the lion and Cromwell are assumed, since it is not possible to get a photo to do this (Perhaps my local MP can help?) Thank you  for reading."],
        "creatorId": 26941,
        "longitude": -0.12578,
        "title": "Cromwell Green & Statue",
        "altitude": 0,
        "source": "SKETCHUP",
        "isPrivate": false,
        "description": "This statue of Oliver Cromwell, on Cromwell Green at the Palace of Westminster, was sculpted in 1899 by Hamo Thornycroft. Although Cromwell is noted for turning Britain into a republic, he is also a controversial figure in history because of his involvement in ordering the deaths of many catholics, almost bordering on genocide. He is still universally hated by catholics today.\r   ____About the model: The Google Earth terrain of the green is actually around 2.5m too high (It is actually well below the level of the road), and for this reason the new visitor centre ramp has been omitted from the model. The texturing on the rear of the lion and Cromwell are assumed, since it is not possible to get a photo to do this (Perhaps my local MP can help?) Thank you  for reading.",
        "reviewCount": 35,
        "type": "SKETCHUP_MODEL",
        "isDeletedOrHidden": false,
        "latitude": 51.499935,
        "popularity": 23839,
        "text_lt": ["udc85510d-792c-4110-b1eb-155b67e0aea0", "887ba4b2-b3ec-44bd-be2c-f7cb8527612d", "bot_lt", "26460", "renderserver renderserver", "f634294d-4c85-4fe0-94af-eab0ba2c36be", "5953", "1570528695199341126511039", "jpg", "fed27901e1e75007daec831dbb1cc6a6.jpg", "Jonathan G."],
        "binaryNames": ["bot_lt", "bot_smontage", "bot_st", "ks", "log", "lt", "s8", "skj", "skjtexture/texture_img_1.png", "skjtexture/texture_img_10.png", "skjtexture/texture_img_11.png", "skjtexture/texture_img_12.png", "skjtexture/texture_img_13.png", "skjtexture/texture_img_14.png", "skjtexture/texture_img_15.png", "skjtexture/texture_img_16.png", "skjtexture/texture_img_17.png", "skjtexture/texture_img_18.png", "skjtexture/texture_img_19.png", "skjtexture/texture_img_2.png", "skjtexture/texture_img_20.png", "skjtexture/texture_img_21.png", "skjtexture/texture_img_22.png", "skjtexture/texture_img_23.png", "skjtexture/texture_img_3.png", "skjtexture/texture_img_4.png", "skjtexture/texture_img_5.png", "skjtexture/texture_img_6.png", "skjtexture/texture_img_7.png", "skjtexture/texture_img_8.png", "skjtexture/texture_img_9.png", "smontage", "st"],
        "parent": ["98e39800550595eea5f88291d2e1580c", "7bf98a9c8c561009daec831dbb1cc6a6", "b42c21ab9f8a2d5531de9651063afcb6", "2fa8e781ae1474c1cb107ac09b3b8d1e", "8eb5ed61b69c81223d7599b04ed8fca2", "c3a0f11bff230d01e438c73e8f77523f", "e014072e8d6463df85c8113b62bb1aa", "ed25bfd15480dd50e724fc90297634ab", "1fe68cc34c62c98cde9d26150b1a206d", "ff5b4294c774a8ddc863da2823c14da3"],
        "title_en": ["Cromwell Green & Statue"],
        "description_en": ["This statue of Oliver Cromwell, on Cromwell Green at the Palace of Westminster, was sculpted in 1899 by Hamo Thornycroft. Although Cromwell is noted for turning Britain into a republic, he is also a controversial figure in history because of his involvement in ordering the deaths of many catholics, almost bordering on genocide. He is still universally hated by catholics today.\r   ____About the model: The Google Earth terrain of the green is actually around 2.5m too high (It is actually well below the level of the road), and for this reason the new visitor centre ramp has been omitted from the model. The texturing on the rear of the lion and Cromwell are assumed, since it is not possible to get a photo to do this (Perhaps my local MP can help?) Thank you  for reading."],
        "tag_fi": ["Britain", "Cromwell", "England", "Lion", "London", "Oliver", "Sculpture", "UK", "Westminster"],
        "text_fi": ["Britain", "Cromwell", "England", "Lion", "London", "Oliver", "Sculpture", "UK", "Westminster"],
        "id": "fed27901e1e75007daec831dbb1cc6a6",
        "creator": {
            "displayName": "Jonathan Green",
            "id": "1570528695199341126511039"
        },
        "modifier": {
            "displayName": "renderserver renderserver",
            "id": "udc85510d-792c-4110-b1eb-155b67e0aea0"
        },
        "createTime": "2011-04-19 16:57:16.000",
        "modifyTime": "2014-03-20 14:37:04.000",
        "translations": {
            "en": {
                "externalUrl": "http://en.wikipedia.org/wiki/Hamo_Thornycroft"
            }
        }
    }],
    "success": true
}


https://3dwarehouse.sketchup.com/3dw/GetEntity?id=313d7958c0b97d22febc325cfee55a39
    {
    "tags": ["shower", "shower head", "showerhead", "soiree", "toto", "toto soiree"],
    "createTime": "2011-03-30 19:06:34.000",
    "averageRating": 0,
    "binaries": {
        "skj": {
            "id": "9ac6c97c-2626-4122-9987-42df35f5cb36",
            "modifier": {
                "id": "udc85510d-792c-4110-b1eb-155b67e0aea0",
                "displayName": "renderserver renderserver"
            },
            "fileSize": 368930,
            "createTime": "2014-03-20 22:42:59.000",
            "contentUrl": "https://3dwarehouse.sketchup.com/3dw/getpubliccontent?contentId=9ac6c97c-2626-4122-9987-42df35f5cb36",
            "originalFileName": "skj",
            "modifyTime": "2014-03-20 22:42:59.000",
            "url": "https://3dwarehouse.sketchup.com/3dw/getbinary?subjectId=313d7958c0b97d22febc325cfee55a39&subjectClass=entity&name=skj",
            "creator": {
                "id": "udc85510d-792c-4110-b1eb-155b67e0aea0",
                "displayName": "renderserver renderserver"
            }
        },
        "smontage": {
            "id": "8f53360a-eddb-4819-8b31-19fbf5cfa8e1",
            "modifier": {
                "id": "1802014757282367429942956",
                "displayName": "Sarah"
            },
            "fileSize": 122760,
            "createTime": "2011-03-30 19:06:34.000",
            "contentUrl": "https://3dwarehouse.sketchup.com/3dw/getpubliccontent?contentId=8f53360a-eddb-4819-8b31-19fbf5cfa8e1",
            "originalFileName": "313d7958c0b97d22febc325cfee55a39.jpg",
            "types": "montage",
            "modifyTime": "2011-03-30 19:06:42.000",
            "url": "https://3dwarehouse.sketchup.com/3dw/getbinary?subjectId=313d7958c0b97d22febc325cfee55a39&subjectClass=entity&name=smontage",
            "creator": {
                "id": "1802014757282367429942956",
                "displayName": "Sarah"
            }
        },
        // this is KMZ
        "ks": {
            "id": "d5795719-f99c-4b4d-85e4-3865dddfe7c1",
            "modifier": {
                "id": "udc85510d-792c-4110-b1eb-155b67e0aea0",
                "displayName": "renderserver renderserver"
            },
            "fileSize": 53177,
            "createTime": "2014-03-20 22:42:59.000",
            "contentUrl": "https://3dwarehouse.sketchup.com/3dw/getpubliccontent?contentId=d5795719-f99c-4b4d-85e4-3865dddfe7c1",
            "originalFileName": "ks",
            "modifyTime": "2014-03-20 22:42:59.000",
            "url": "https://3dwarehouse.sketchup.com/3dw/getbinary?subjectId=313d7958c0b97d22febc325cfee55a39&subjectClass=entity&name=ks",
            "creator": {
                "id": "udc85510d-792c-4110-b1eb-155b67e0aea0",
                "displayName": "renderserver renderserver"
            }
        },
        "bot_smontage": {
            "id": "7d6cc7bc-fbac-42c3-b494-02d7dab3f6d3",
            "modifier": {
                "id": "udc85510d-792c-4110-b1eb-155b67e0aea0",
                "displayName": "renderserver renderserver"
            },
            "fileSize": 262364,
            "createTime": "2014-03-20 22:43:01.000",
            "contentUrl": "https://3dwarehouse.sketchup.com/3dw/getpubliccontent?contentId=7d6cc7bc-fbac-42c3-b494-02d7dab3f6d3",
            "originalFileName": "bot_smontage",
            "modifyTime": "2014-03-20 22:43:01.000",
            "url": "https://3dwarehouse.sketchup.com/3dw/getbinary?subjectId=313d7958c0b97d22febc325cfee55a39&subjectClass=entity&name=bot_smontage",
            "creator": {
                "id": "udc85510d-792c-4110-b1eb-155b67e0aea0",
                "displayName": "renderserver renderserver"
            }
        },
        "st": {
            "id": "ffe695d5-418e-465a-bc47-8829bcb6907a",
            "modifier": {
                "id": "1802014757282367429942956",
                "displayName": "Sarah"
            },
            "fileSize": 936,
            "createTime": "2011-03-30 19:06:34.000",
            "contentUrl": "https://3dwarehouse.sketchup.com/3dw/getpubliccontent?contentId=ffe695d5-418e-465a-bc47-8829bcb6907a",
            "originalFileName": "313d7958c0b97d22febc325cfee55a39.jpg",
            "types": "smallThumbnail",
            "modifyTime": "2011-03-30 19:06:42.000",
            "url": "https://3dwarehouse.sketchup.com/3dw/getbinary?subjectId=313d7958c0b97d22febc325cfee55a39&subjectClass=entity&name=st",
            "creator": {
                "id": "1802014757282367429942956",
                "displayName": "Sarah"
            }
        },
        // This is sketchup
        "s8": {
            "id": "82ae4808-88f6-4bf7-ad56-36e4b4d6a0bd",
            "modifier": {
                "id": "1802014757282367429942956",
                "displayName": "Sarah"
            },
            "fileSize": 162884,
            "createTime": "2011-03-30 19:06:34.000",
            "contentUrl": "https://3dwarehouse.sketchup.com/3dw/getpubliccontent?contentId=82ae4808-88f6-4bf7-ad56-36e4b4d6a0bd",
            "originalFileName": "Untitled.skp",
            "types": "SKP",
            "modifyTime": "2011-03-30 19:06:42.000",
            "url": "https://3dwarehouse.sketchup.com/3dw/getbinary?subjectId=313d7958c0b97d22febc325cfee55a39&subjectClass=entity&name=s8",
            "creator": {
                "id": "1802014757282367429942956",
                "displayName": "Sarah"
            }
        },
        "lt": {
            "id": "1121661b-56f1-44c2-9eba-7e28da1a98b9",
            "modifier": {
                "id": "1802014757282367429942956",
                "displayName": "Sarah"
            },
            "fileSize": 2965,
            "createTime": "2011-03-30 19:06:34.000",
            "contentUrl": "https://3dwarehouse.sketchup.com/3dw/getpubliccontent?contentId=1121661b-56f1-44c2-9eba-7e28da1a98b9",
            "originalFileName": "313d7958c0b97d22febc325cfee55a39.jpg",
            "types": "largeThumbnail",
            "modifyTime": "2011-03-30 19:06:42.000",
            "url": "https://3dwarehouse.sketchup.com/3dw/getbinary?subjectId=313d7958c0b97d22febc325cfee55a39&subjectClass=entity&name=lt",
            "creator": {
                "id": "1802014757282367429942956",
                "displayName": "Sarah"
            }
        },
        "bot_st": {
            "id": "e972424a-c013-4f07-a0aa-da47d4017d01",
            "modifier": {
                "id": "udc85510d-792c-4110-b1eb-155b67e0aea0",
                "displayName": "renderserver renderserver"
            },
            "fileSize": 1779,
            "createTime": "2014-03-20 22:43:00.000",
            "contentUrl": "https://3dwarehouse.sketchup.com/3dw/getpubliccontent?contentId=e972424a-c013-4f07-a0aa-da47d4017d01",
            "originalFileName": "bot_st",
            "modifyTime": "2014-03-20 22:43:00.000",
            "url": "https://3dwarehouse.sketchup.com/3dw/getbinary?subjectId=313d7958c0b97d22febc325cfee55a39&subjectClass=entity&name=bot_st",
            "creator": {
                "id": "udc85510d-792c-4110-b1eb-155b67e0aea0",
                "displayName": "renderserver renderserver"
            }
        },
        "log": {
            "id": "087e3c92-d856-4d40-82bf-78cfaa0ac184",
            "modifier": {
                "id": "udc85510d-792c-4110-b1eb-155b67e0aea0",
                "displayName": "renderserver renderserver"
            },
            "fileSize": 2182,
            "createTime": "2014-03-20 22:43:01.000",
            "contentUrl": "https://3dwarehouse.sketchup.com/3dw/getpubliccontent?contentId=087e3c92-d856-4d40-82bf-78cfaa0ac184",
            "originalFileName": "log",
            "modifyTime": "2014-03-20 22:43:01.000",
            "url": "https://3dwarehouse.sketchup.com/3dw/getbinary?subjectId=313d7958c0b97d22febc325cfee55a39&subjectClass=entity&name=log",
            "creator": {
                "id": "udc85510d-792c-4110-b1eb-155b67e0aea0",
                "displayName": "renderserver renderserver"
            }
        },
        "bot_lt": {
            "id": "df14f8cf-189a-46e1-8f37-ad63c79eea10",
            "modifier": {
                "id": "udc85510d-792c-4110-b1eb-155b67e0aea0",
                "displayName": "renderserver renderserver"
            },
            "fileSize": 6141,
            "createTime": "2014-03-20 22:43:00.000",
            "contentUrl": "https://3dwarehouse.sketchup.com/3dw/getpubliccontent?contentId=df14f8cf-189a-46e1-8f37-ad63c79eea10",
            "originalFileName": "bot_lt",
            "modifyTime": "2014-03-20 22:43:00.000",
            "url": "https://3dwarehouse.sketchup.com/3dw/getbinary?subjectId=313d7958c0b97d22febc325cfee55a39&subjectClass=entity&name=bot_lt",
            "creator": {
                "id": "udc85510d-792c-4110-b1eb-155b67e0aea0",
                "displayName": "renderserver renderserver"
            }
        },
        "skjtexture/texture_img_1.png": {
            "id": "d3a312b7-d8ea-4b4d-82f1-18921120eb56",
            "modifier": {
                "id": "udc85510d-792c-4110-b1eb-155b67e0aea0",
                "displayName": "renderserver renderserver"
            },
            "fileSize": 2331,
            "createTime": "2014-03-20 22:43:01.000",
            "contentUrl": "https://3dwarehouse.sketchup.com/3dw/getpubliccontent?contentId=d3a312b7-d8ea-4b4d-82f1-18921120eb56",
            "originalFileName": "skjtexture/texture_img_1.png",
            "modifyTime": "2014-03-20 22:43:01.000",
            "url": "https://3dwarehouse.sketchup.com/3dw/getbinary?subjectId=313d7958c0b97d22febc325cfee55a39&subjectClass=entity&name=skjtexture%2Ftexture_img_1.png",
            "creator": {
                "id": "udc85510d-792c-4110-b1eb-155b67e0aea0",
                "displayName": "renderserver renderserver"
            }
        }
    },
    "location": {
        "longitude": -105.283,
        "altitude": 0,
        "latitude": 40.017
    },
    "type": "SKETCHUP_MODEL",
    "creator": {
        "id": "1802014757282367429942956",
        "displayName": "Sarah"
    },
    "isHidden": false,
    "id": "313d7958c0b97d22febc325cfee55a39",
    "modifier": {
        "id": "udc85510d-792c-4110-b1eb-155b67e0aea0",
        "displayName": "renderserver renderserver"
    },
    "title": "TOTO Soirée® Handshower Set with Lever Handle",
    "source": "SKETCHUP",
    "isPrivate": false,
    "currentUserRating": null,
    "binaryNames": ["skj", "ks", "smontage", "bot_smontage", "bot_st", "lt", "s8", "st", "log", "bot_lt", "skjtexture/texture_img_1.png"],
    "description": "TOTO Soirée® Handshower Set with Lever Handle - hand shower hardware in a modern design",
    "reviewCount": 0,
    "translations": {
        "en": {
            "externalUrl": "http://www.modernbathroom.com/showers-tubs/toto-soiree-handshower-set-wi"
        }
    },
    "attributes": {
        "skp": {
            "isClassified": {
                "value": false,
                "dataType": "boolean"
            },
            "contributors": {
                "value": "{\"1802014757282367429942956\":{\"name\":\"Sarah\",\"type\":[\"wiki\",\"model\"]}}",
                "dataType": "string"
            },
            "isGeoreferenced": {
                "value": false,
                "dataType": "boolean"
            },
            "materials": {
                "value": 3,
                "dataType": "int"
            },
            "isDynamicComponent": {
                "value": false,
                "dataType": "boolean"
            },
            "polygons": {
                "value": 2178,
                "dataType": "int"
            }
        },
        "display": {
            "showMap": {
                "value": true,
                "dataType": "boolean"
            }
        },
        "legacy": {
            "defaultLocale": {
                "value": "en",
                "dataType": "string"
            },
            "hasServerGeneratedKmz": {
                "value": true,
                "dataType": "boolean"
            },
            "showContainingCollections": {
                "value": true,
                "dataType": "boolean"
            },
            "hasLogo": {
                "value": false,
                "dataType": "boolean"
            },
            "isPubliclyEditable": {
                "value": false,
                "dataType": "boolean"
            },
            "hasSkp7": {
                "value": false,
                "dataType": "boolean"
            },
            "hasSkp6": {
                "value": false,
                "dataType": "boolean"
            },
            "isDownloadRestricted": {
                "value": false,
                "dataType": "boolean"
            },
            "hasSkp8": {
                "value": true,
                "dataType": "boolean"
            },
            "hasKmz": {
                "value": false,
                "dataType": "boolean"
            },
            "isGoogleEarthReady": {
                "value": false,
                "dataType": "boolean"
            },
            "hasSkp5": {
                "value": false,
                "dataType": "boolean"
            }
        }
    },
    "modifyTime": "2014-03-20 22:42:59.000",
    "popularity": 10086,
    "success": true
}

kmz model
https://3dwarehouse.sketchup.com/3dw/getpubliccontent?contentId=d5795719-f99c-4b4d-85e4-3865dddfe7c1&fn=TOTO_Soir_e_Handshower_Set_with_Lever_Handle.kmz
https://3dwarehouse.sketchup.com/3dw/getpubliccontent?contentId=82ae4808-88f6-4bf7-ad56-36e4b4d6a0bd&fn=Untitled.skp
*/

  var parsesearch =function(body) {


    var parentId =0;
    var result = new Collection('warehouse',parentId,'');
    delete result.name;
    var col = result.getResourceSync();
    var json = JSON.parse(body);

    if (json.success != true) return null;


    result.page={start:json.startRow, end:json.endRow, total:json.total};

    for (var i=0;i<json.entries.length;i++){
      var entry = json.entries[i];
      // get rid of funny business
      if (entry.title.contains('<img src')) continue;

      var item = null;
      // is this a collection ?
      if (entry.entityCount !== undefined || entry.collectionCount !== undefined){
        // reject empty collections
        if (entry.entityCount === 0 && entry.collectionCount === 0) continue;
        // add a collection to this collection
        var id = 'c_'+entry.id;
        item = {uuid: id};
      } else if (entry.binaryNames !== undefined)
      {
        var extension=null;
        if (entry.binaryNames.indexOf('ks')>=0) extension='ks';
        else if (entry.binaryNames.indexOf('k2')>=0) extension='k2';
        if (extension) {
          // add an asset to this collection
          var id = 'm_'+entry.id+'_'+extension
          item = {uuid: id, mimetype:'application/vnd.google-earth.kmz'};
          item.iconUri = "https://3dwarehouse.sketchup.com/3dw/getbinary?subjectId="+entry.id+"&subjectClass=entity&name=st";
          item.modelUri = "https://3dwarehouse.sketchup.com/model.html?id="+entry.id;
          item.previewUri = "https://3dwarehouse.sketchup.com/embed.html?entityId="+entry.id;
        }
      }

      if (item !== null){
        item.description = entry.description;
        if (entry.creator && entry.createTime)
          item.created = { date : new Date(entry.createTime).getTime(), 
                           user : entry.creator.id};
        if (entry.latitude && entry.longitude)
          item.latitude = entry.latitude, item.longitude=entry.longitude;

        col.children[entry.title] = item;
      }

 
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

    result.page={start:json.startRow, end:json.endRow, total:json.total};

    for (var i=0;i<json.entries.length;i++){
      var entry = json.entries[i];
      var entityCount = entry.entityCount;
      var collectionCount = entry.collectionCount;


      // remove empty folders at root, there are tons of them
      if (entityCount===0 && collectionCount===0) continue;
      // remove entrys that have a bogus name
      if (entry.contains('<img src') ) continue;


      var id = 'c_'+entry.id;
      col.children[entry.title] = {uuid:id};


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

