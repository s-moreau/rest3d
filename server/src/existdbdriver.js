/*
basexdriver.js

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

var restify = require('restify');
var toJSON = require('./tojson');
var request = require('request');

//var xml2js = require('xml2js');
//var xmlbuilder = new xml2js.Builder({'doctype':{'headless': true}});

var Connection = require('existdb-node');
// use this to local debug existd-node
//var Connection = require('./index');

var Asset = require('./asset');
var Resource = require('./resource')
var Collection = require('./collection')
var extend = require('./extend')
var zipFile = require('./zipfile')

var memoryStream = require('memorystream');


var options = {
    host: process.env.XML_SERVER || "localhost",
    port: process.env.XML_SERVER_PORT || 8081,
    rest: "/exist/rest",
    auth: (process.env.REST3D_USER || 'guest') +':'+(process.env.REST3D_PASSWD || 'guest')
};

var connection = new Connection(options);



exports.name = "eXist"; 

var getUrl = exports.getUrl = function(asset)
{
  return 'http://'+connection.config.auth+'@'+connection.config.host+':'+connection.config.port+connection.config.rest+
  '/db/apps/rest3d/data/'+(asset.parentId ? asset.parentId+'/' : '') + asset.uuid;
    
}

exports.getData = function(asset, cb) {
  

    var url = getUrl(asset);

    // this will upload the url content into the diskcacke
    zipFile.uploadUrl(url,null, function(error, result){

        if (error)
          cb(error);
        else {
          cb(undefined,result.path);
        }
        
      });
};

// this locks an asset, waiting forever for lock to be available
var lockAsset = exports.lockAsset = function(asset,cb, _n){

  var n=_n || 0;

  console.log('++ lock asset name['+asset.uuid+']='+asset.name);

  lockKey(asset.parentId,'assets',asset.uuid, function(err,res){
    if (err){
      if (err.statusCode === 423){
        // try again later
        if (n===100){
          // let's give it the lock, and try again
          console.log('could not lock asset aftre 100 trials -> forcing unlock now')
          unlockKey(asset.parentId,'assets',asset.uuid, function(err,res){
            return setTimeout(lockAsset,1000,asset,cb,1);
          })
        } else {
          console.log('asset ['+asset.uuid+'] ='+asset.name+' is locked - trying again('+(n+1)+')');
          return setTimeout(lockAsset,1000,asset,cb,n+1);
        }
      } 
      console.log('database[eXist] cannot find asset id='+asset.uuid);
      return cb(err);
    }
    if (res) {
      if (res.type === Collection.type)
        res = extend(new Collection(),res);
      else if (res.type === Asset.type)
        res = extend(new Asset(),res);
      else
        res = extend(new Resource(),res);
      res.database=exports;
      cb(undefined,res);
    }
    else {
      console.log('database[eXist] cannot find asset id='+id);
      var error = new Error('cannot find asset id='+id);
      error.statusCode = 404;
      cb(error);
    }
  })
}
// unlock asset
var unlockAsset = exports.unlockAsset = function(asset,cb){

  console.log('++ unlock asset['+asset.uuid+'] name='+asset.name);

  unlockKey(asset.parentId,'assets',asset.uuid, function(err,garbage){
    if (err) return cb(err);
    cb(undefined,asset);
  });
}

// If the asset cannot be saved, because it is locked or otherwise
//  return to callers, as it has to do something about it

var saveAsset = exports.saveAsset = function(asset,cb){

  console.log('-- saveAsset ['+asset.uuid+'] name='+asset.name)
  if (asset instanceof Collection){
    console.log('asset is a Collection')
  } else if (asset instanceof Asset){
    console.log('asset is a Asset')
  } else if (asset instanceof Resource){
    console.log ('asset is a Resource')
  } else {
    console.log ('asset is unknown')
  }

  if (asset.name === '/') 
    saveRoot(asset, function(err,res){
      if (err) return cb(err);
      cb(undefined,asset);
    });
  else
    insertKeyPair(asset.parentId,'assets',asset.uuid, asset, function(err,garbage){
      cb(err,asset);
    });
}

// cookies 
var saveCookie = exports.saveCookie = function( sid, data, cb)
{
  insertKeyPair(null,'cookies',sid, data, cb);
}
var loadCookie = exports.loadCookie = function(sid,cb){
  getKey(sid, cb);
}
var delCookie = exports.delCookie = function(sid,cb){
  removeKey(null,'cookies',sid, cb);
}
// workers 

var getWorker = exports.getWorker = function(sid,cb){
  getKey(sid, cb);
};

var setWorker = exports.setWorker = function( sid, data, cb)
{
  insertKeyPair(null,'workers',sid, data, cb);
};

// add worker to the set in key sid
var addWorkerId = exports.addWorker = function(sid, workerId, cb)
{
  getKey(sid,function(err,res){
    if (err) return cb(err);
    res.push(workerId);
    insertKeyPair(null,'workers',sid, res, cb);
  })
};

var removeWorker = exports.removeWorker = function(sid,cb){
  removeKey(null,'worker',sid, cb);
};

var removeWorkerId = exports.removeWorkerId = function(sid,workerId,cb){
  getKey(sid,function(err,res){
    if (err) return cb(err);
    var index = res.indexOf(workerId);
    if (index > -1) {
       res.splice(index, 1);
    }
    insertKeyPair(null,'workers',sid, res, cb);
  })
};


var loadAsset = exports.loadAsset = function(id,cb){

  var value;

  console.log('-- loadAsset id='+id)

  getKey(id, function (err,res){
    if (err) return cb(err);
    if (res) {
      if (res.type === Collection.type)
        res = extend(new Collection(),res);
      else if (res.type === Asset.type)
        res = extend(new Asset(),res);
      else
        res = extend(new Resource(),res);
      res.database=exports;
      cb(undefined,res);
    }
    else {
      console.log('database[eXist] cannot find asset id='+id);
      cb(err);
    }
  });
}

// FIXME !!
var delAsset = exports.delAsset = function(asset,cb){
  removeKey(asset.parentId,'assets',asset.uuid, cb);
}

// store an asset
var store = exports.store = function(asset,filename_or_buffer, callback) {

  var cb = callback;
  // other optional arg: destination filename
	connection.store(filename_or_buffer, '/apps/rest3d/data'+(asset.parentId ? '/'+asset.parentId : '/'), asset.uuid, function(err) {
    if (err) {
      console.log("eXist.store(): An error occurred: " + err);
      cb(err,asset);
    } else {
      console.log("eXist: "+asset.name+"["+asset.uuid+"] Upload completed!")
    	cb(undefined,asset)
    }
	});
}

// delete an resource (note: delete is a reserved keyword)
// also delete its item in asset.xml
// FIXME -> need to update all references to that resource in all assets

var del = exports.del = function(assetId, cb) {
/*
  var path = '/apps/rest3d/data/'+assetId;
  // other optional arg: destination filename
  connection.del(path, function(err,res) {
    if (err) {
      console.log("eXist.delete(): An error occurred: " + err);
      cb(err,null);
    } else {
      console.log("eXist.delete(): removed asset "+assetId);
      cb(undefined,res);
      removeKey('assets',assetId, function (err,res){
        if (err) {
          console.log('Error deleting asset key '+assetId+' = '+err);
          cb(err);
        } else {
          console.log('asset ['+assetId+'] entry deleted')
          cb(undefined, res);
        }
      })
    }
  });
*/
console.log('TODO -> del ')
}
// insert an object in a key/pair database
// Warning -> this returns garbage in res
var insertKeyPair = function(collection, file, id, value, callback) {

  var cb=callback;
  var text = value;
  if (!text) {
    text= "";
  } else
  if (typeof text != String) {
    text = toJSON(text);
  }

  console.log('insertKeyPair['+id+'] name='+value.name);
  // encode characters for xQuery 
  text = text.replace(/&/g, '&amp;')
         .replace(/</g,'&lt;').replace(/>/g,'&gt;')
         .replace(/\r/g,'&#xA;').replace(/\n/g,'&#xD;').replace(/ /g,'&#160;').replace(/\t/g,'&#009;')
         .replace(/'/g, '&apos;').replace(/"/g, '&quot;')
         .replace(/{/g, '&#123;').replace(/}/g, '&#125;');


  //var text = xmlbuilder.buildObject(value);
  var xquery = 'xquery version "3.0";\
                declare namespace xh="http://www.w3.org/1999/html";\
                declare function xh:col() \
                {\
                    let $col := collection("/db/apps/rest3d/data/'+(collection?collection:'')+'")\
                    return\
                      if ($col) then\
                         ()\
                      else\
                        xmldb:create-collection("/db/apps/rest3d/data", "'+(collection?collection:'')+'")\
                };\
                declare function xh:items() as node()*\
                {\
                  let $db := doc("/db/apps/rest3d/data'+(collection ? '/'+collection+'/' : '/')+file+'.xml")\
                  return\
                    if ($db) then\
                      $db/items\
                    else\
                      let $test := xmldb:store("/apps/rest3d/data'+(collection ? '/'+collection : '/')+'","'+file+'.xml", <items/>)\
                      return\
                        doc("/db/apps/rest3d/data'+(collection ? '/'+collection+'/' : '/')+file+'.xml")/items\
                };\
                let $col := xh:col()\
                let $db := xh:items()\
                let $item := $db/item[@id="'+id+'"]\
                let $newitem := element item {$item/(@* except @id), attribute id {"'+id+'"} ,"'+text+'"}\
							  return\
                if ($db)\
                then\
  							  if ($item)\
                  then \
                   update replace $item with $newitem\
                  else \
                   update insert $newitem into $db\
                else\
                  (response:set-status-code( 404 ), "cannot find '+(collection ? '/'+collection+'/' : '/')+file+'.xml")';
  /*
  console.log('*************');
  console.log(xquery)
  console.log('*************');
  */
  query(xquery, function(err,res){
    cb(err,res);
  });
}

var saveRoot = exports.saveRoot = function(collection, cb){
  console.log('set root ['+collection.uuid+'] name = '+collection.name+' ');
  var text = toJSON(collection);
  var id = collection.uuid;
  text = text.replace(/&/g, '&amp;')
         .replace(/</g,'&lt;').replace(/>/g,'&gt;')
         .replace(/\r/g,'&#xA;').replace(/\n/g,'&#xD;').replace(/ /g,'&#160;').replace(/\t/g,'&#009;')
         .replace(/'/g, '&apos;').replace(/"/g, '&quot;')
         .replace(/{/g, '&#123;').replace(/}/g, '&#125;');
    

  //var text = xmlbuilder.buildObject(value);
  var xquery = 'xquery version "3.0";\
                declare namespace xh="http://www.w3.org/1999/html";\
                declare function xh:items() as node()*\
                {\
                  let $db := doc("/db/apps/rest3d/data/assets.xml")\
                  return\
                    if ($db) then\
                      $db/items\
                    else\
                      let $test := xmldb:store("/apps/rest3d/data","assets.xml", <items/>)\
                      return\
                        doc("/db/apps/rest3d/data/assets.xml")/items\
                };\
                let $db := xh:items()\
                let $item := $db/item[@id="'+id+'"]\
                let $newitem := element item {$item/(@* except (@id,@root)), attribute root {"true"}, attribute id {"'+id+'"}, "'+text+'"}\
                return\
                  if ($item)\
                  then \
                   update replace $item with $newitem\
                  else \
                   update insert $newitem into $db';
   query(xquery, cb);
}


var getRoot = exports.getRoot = function(cb) {

 console.log('getRoot');
 var xquery='xquery version "3.0";\
             let $db := doc("/db/apps/rest3d/data/assets.xml")/items \
             let $item := $db/item[@root]\
             return\
             if ($item) then\
                 $item/text()\
             else\
               (response:set-status-code(404), "root not found")';
         
    query(xquery,function(err,res){
      if (err) return cb(err);

      // at this point err is null
      var result;
      try  {
        var result=JSON.parse(res[0]);
      } catch (e) {
        console.log('could not parse result of query in eXist:getRoot');
        err = new Error(res);
      }
      if (err) return cb(err)
      result=extend(new Collection(),result);
      result.database=exports;
      cb(undefined,result);
    });
}

var lockKey = function(collection, file, id, cb) {

  console.log('lock key['+id+']')
  var xquery = 'xquery version "3.0";\
                declare namespace xh="http://www.w3.org/1999/html";\
                declare function xh:lock($db, $item) as xs:string\
                {\
                  let $lock := $item/@lock\
                  let $newitem := element item {$item/(@* except (@lock,@id)), attribute lock {"true"}, attribute id {"'+id+'"}, $item/text()}\
                  return\
                    if ($lock) then\
                      (response:set-status-code(423), "key is locked")\
                    else\
                      if ($item) then\
                        (update replace $item with $newitem, $newitem/text())\
                      else\
                        (update insert $newitem into $db, $newitem/text())\
                };\
                declare function xh:items() as node()*\
                {\
                  let $db := doc("/db/apps/rest3d/data'+(collection ? '/'+collection+'/' :'/')+file+'.xml")\
                  return\
                    if ($db) then\
                      $db/items\
                    else\
                      let $test := xmldb:store("/apps/rest3d/data'+(collection ? '/'+collection : '/')+'","'+file+'.xml", <items/>)\
                      return\
                        doc("/db/apps/rest3d/data'+(collection ? '/'+collection+'/' : '/')+file+'.xml")/items\
                };\
                let $db := xh:items()\
                let $item := $db/item[@id="'+id+'"]\
                return\
                  util:exclusive-lock($item, xh:lock($db, $item))';

   query(xquery,function(err,res){
      if (err){
        if (err.statusCode === 423) {
          return cb(err)
        } else
          return cb(err);
      } 
      var result=res;
      try  {
        result=JSON.parse(res[0]);
      } catch (e) {
        console.log('could not parse result of query in eXist:lockKey');
      }
      cb(undefined,result);
    });
}

var unlockKey = function(collection, file, id, cb) {

  console.log('unlock key['+id+']')

  var xquery = 'xquery version "3.0";\
                declare namespace xh="http://www.w3.org/1999/html";\
                declare function xh:unlock($item) as xs:string\
                {\
                  let $lock := $item/@lock\
                  let $newitem := element item {$item/(@* except @lock), $item/text()}\
                  return\
                    if ($lock) then\
                      (update replace $item with $newitem , $newitem/text())\
                    else\
                      if ($item) then\
                        $item/text()\
                      else\
                        (response:set-status-code(404), "key not found")\
                 };\
                let $db := doc("/db/apps/rest3d/data'+(collection ? '/'+collection+'/' : '/')+file+'.xml")/items\
                let $item := $db/item[@id="'+id+'"]\
                return \
                  util:exclusive-lock($item, xh:unlock($item))';

  query(xquery, cb);
}

// delete an object in a key/pair database
var removeKey =  function(collection,file,id, cb) {

  console.log('removeKey['+id+']')

  var xquery = 'xquery version "3.0";\
                let $db := doc("/db/apps/rest3d/data'+(collection ?  '/'+collection+'/' : '/')+file+'.xml")\
							  for $item in $db/item[@id="'+id+'"]\
							   return\
                 if ($item) then\
							     update delete $item\
                 else\
                   (response:set-status-code(404), "key not found")';

  query(xquery, cb);
}


// get a Key value, retry until it is unlocked
var getKey = function(id, cb) {

 console.log('getKey['+id+']')

 var xquery='xquery version "3.0";\
             let $db := collection("/db/apps/rest3d/data")/items\
             let $item := $db/item[@id="'+id+'"] \
             return\
             if ($item) then\
                 $item/text()\
             else\
               (response:set-status-code(404), "key not found")';


         
    query(xquery,function(err,res){
      if (err) return cb(err);

      var result=res;
      try {
        result=JSON.parse(res[0]);
      } catch (e) {
        cb(new Error('could not parse result of query in eXist:getRoot'));
      }
      cb(undefined,result);
    });
}

var query = exports.query = function(xquery, cb) {

	var query = connection.query(xquery, { chunkSize: 100 });
  var data =[];

	query.on("error", function(err) {
	   if (err.message){
      var message = null;
      try {
        message = JSON.parse(err.message);
      } catch (e)
      {
        console.log('tentative - parsing xml error')
        if (err.message) {
          message={};
          message.data = err.message.stringAfter('<message>').stringBefore('</');
          if (message.data.contains('permission'))
            err.statusCode = 403;
        }
      }
      if (message && message.data) {
        var error = new Error(message.data);
        error.statusCode = err.statusCode;
        return cb(error);
      }
     } // this will catch all remaining errors
		cb(new Error(err));
	});
	var results=[];
	query.each(function(item,hits,offset) {
      results.push(item);
    });
	query.on('end',function(){
		cb(undefined,results)
	})

}

var info = exports.info = function (cb) {

	  connection.call('/exist/apps/rest3d/hello.xql', function(res){
	    var data = [];
	    res.on("data", function(chunk) {
	        data.push(chunk);
	    });
	    res.on("end", function() {
	        var res = data.join("");
	        if (cb) cb(null, res);
	    });
	    res.on("error", function(err) {
	        console.log("eXist get error: " + err);
	        if (cb) cb(err,null);
	    });
		});

};


// test and initiallize database
var init = exports.init = function (cb){

  request({ // 3d building collections ?
		url: 'http://'+connection.config.host+':'+connection.config.port+'/'+connection.config.rest
		},function(err, resp, body){
		  if (err){
		    console.log('ERROR asking exist rest url');
		    console.log(err)
		    return cb(false)
    }

  info(function(err,res){
		if (err) {
			console.log('error initializing eXist');
			return cb(false);
		}
		// create assets.xml if it does not exists
		var xquery = 'fn:doc-available("/apps/rest3d/data/assets.xml")';

		query(xquery, function(err,res) {
			if (err) {
				console.log('Error xquery check for asset.xml');
			  console.log(err);
			  return cb(false);
			} else if (res[0]==="true") {
        console.log('assets.xml already exists')
				return check_existdb_1(cb);
			} else {
        /*
				console.log('creating assets.xml');
				xquery = 'xquery version "3.0";\
                  let $my-doc := <items/> \
                  return\
                  xmldb:store("/apps/rest3d/data", "assets.xml", $my-doc)';
        query(xquery, function(err,res) {
        	if (err) {
        		console.log('Error creating assets.xml');
        		console.log(err);
        		return cb(false);
        	} else {
        		console.log('assets.xml created')
        		return check_existdb_1(cb);
        	}
        })
        */
        console.log('assets.xml does not exists');
			}
		})
	})
})
}


// next step in check existdb - 
var check_existdb_1 = function (cb) {

  // empty cookie jar
  connection.del('/apps/rest3d/data/cookies.xml', function(err) {
    if (err) {
        console.log("delete cookies - error ");
        console.log(err);
        return cb(false);
    } 
    console.log('cookies deleted');
    /*
    var xquery = 'xquery version "3.0";\
                let $my-doc := <items/> \
                return\
                xmldb:store("/apps/rest3d/data", "cookies.xml", $my-doc)';
    query(xquery, function(err,res) {
      if (err) {
        console.log('Error creating cookies.xml');
        console.log(err);
        return cb(false)
      } 
      console.log('cookies.xml created')
      */

      // root is created automatically by the first call to rest3d/db
      // but it would be more efficient to create it here
      getRoot(function(err,res){
        if (err) {
          console.log('root does not exists');
          console.log(' -->'+err);

        } else {
          console.log('root already exists')

        }

        // let's unlock the database
        // some items may have been left locked by previous crash
          var xquery='xquery version "3.0";\
                      for $item in collection("/db/apps/rest3d/data/")/items\
                      return\
                        if ($item/@lock) then\
                          (update replace $item with element item {$item/(@* except @lock), $item/text()})\
                        else\
                          ()';
          query(xquery, function(err,res) {
            if (err) {
              console.log('Error removing locks cookies.xml');
              console.log(err);
              return cb(false)
            } 
            console.log('locks were removed')
            cb(true)
          })

        })
      

    //})
  });

/* TEST FUNCTIONS -> do not remove
  insertKeyPair(null,'cookies','tagada', 'a json string', function(err, res) {
	  if (err) {
  		console.log('Error inserting cookie');
  		console.log(err);
  		return
  	} else {

  		removeKey(null,'cookies','tagada', function(err,res){
	  	  if (err) {
		  		console.log('Error removing cookie');
		  		console.log(err);
		  		return
		  	} else {
		  		console.log('cookie tagada removed')
		  	}
	   })
  	}
  }) 
  insertKeyPair(null,'cookies','olala', {name:'toto', price:5}, function(err, res) {
	  if (err) {
  		console.log('Error inserting cookie');
  		console.log(err);
  		return
  	} else {
  		getKey('olala', function (err,res){
  			console.log('olalalal')
  			if (err) {
		  		console.log('Error getKey ');
		  		console.log(err);
		  		return
		  	} else {
		  		console.log('getKey returned ')
		  		console.log(res)
		  	}

  		})
  	}
  })
*/
}

//check_existdb();