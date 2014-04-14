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

var options = {
    host: process.env.XML_SERVER || "localhost",
    port: process.env.XML_SERVER_PORT || 8081,
    rest: "/exist/rest",
    auth: "rest3d:itsfl4r3rest3d"
};

var connection = new Connection(options);

//check_eXist();

console.log('eXist host='+options.host+" port="+options.port+ " REST server="+options.rest);

exports.name = "eXist"; 

exports.get = function(url, callback) {
	var cb=callback;
	connection.get(url, function(res) {
    // collect input and print it out upon end
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
}

// store an asset
var store = exports.store = function(asset,filename, callback) {

  var cb = callback;
  // other optional arg: destination filename
	connection.store(filename, '/apps/rest3d/data/', asset, function(err) {
    if (err) {
        console.log("eXist.store(): An error occurred: " + err);
        if (cb) cb(err,asset);
    } else {
      console.log("eXist: "+asset+" Upload completed!")
    	if (cb) cb(undefined,asset)
    }
	});
}

// delete an asset (note: delete is a reserved keyword)
var del = exports.del = function(asset, callback) {

  var cb = callback;
  var path = '/apps/rest3d/data/'+asset;
  // other optional arg: destination filename
  connection.del(path, function(err,res) {
    if (err) {
        cb && cb(err,null);
        console.log("eXist.store(): An error occurred: " + err);
    } else {
      cb && cb(undefined,"eXist: "+path+" Upload completed!")
    }
  });
}
// insert an object in a key/pair database
var insertKeyPair = exports.insertKeyPair = function(collection, id, value, callback) {


  var text = value;
  if (!text) {
    text= "";
  } else
  if (typeof text != String) {
    text = toJSON(text);
  }

console.log('insertKeyPair['+id+','+text+']')
// encode characters for xQuery 
  text = text.replace(/&/g, '&amp;')
         .replace(/</g,'&lt;').replace(/>/g,'&gt;')
         .replace(/\r/g,'&#xA;').replace(/\n/g,'&#xD;').replace(/ /g,'&#160;').replace(/\t/g,'&#009;')
         .replace(/'/g, '&apos;').replace(/"/g, '&quot;')
         .replace(/{/g, '&#123;').replace(/}/g, '&#125;');

  //var text = xmlbuilder.buildObject(value);
  var xquery = 'xquery version "3.0";\
                let $db := doc("/db/apps/rest3d/data/'+collection+'.xml")/items \
                let $item := $db/item[@id="'+id+'"]\
                let $newitem := <item id= "'+id+'">'+text+'</item> \
							  return\
                if ($db)\
                then\
  							  if ($item)\
                  then \
                   update replace $item with $newitem\
                  else \
                   update insert $newitem into $db\
                else\
                  (response:set-status-code( 404 ), "cannot find '+collection+'.xml")';
/*
console.log('*************');
console.log(xquery)
console.log('*************');
*/
  query(xquery, callback);
}
// delete an object in a key/pair database
var removeKey = exports.removeKey = function(collection,id, value, callback) {

  console.log('removeKey['+id+']')

  var xquery = 'xquery version "3.0";\
                let $db := doc("/db/apps/rest3d/data/'+collection+'.xml")/items \
							  for $item in $db/item[@id="'+id+'"]\
							   return\
							    update delete $item';


  query(xquery, callback);
}

// delete an object in a key/pair database
var getKey = exports.getKey = function(collection,id, callback) {
  var cb=callback;
/*
  var xquery = 'xquery version "3.0";\
                declare namespace json="http://www.json.org";\
                declare option exist:serialize "method=json media-type=text/javascript";\
                let $db := doc("/db/apps/rest3d/data/'+collection+'.xml")/items \
                return\
                 if ($db)\
                then\
							    $db/item[@id="'+id+'"]\
                else\
                  (response:set-status-code( 404 ), "cannot find '+collection+'.xml")';
*/

console.log('getKey['+id+']')

  var xquery = 'xquery version "3.0";\
                let $db := doc("/db/apps/rest3d/data/'+collection+'.xml")/items\
                let $data := $db/item[@id="'+id+'"]/text() \
                return\
                  if ($db)\
                  then\
                    if ($data)\
                    then\
                      $data\
                    else\
                      (response:set-status-code( 404 ), "cannot find item[@id='+id+']")\
                  else\
                   (response:set-status-code( 404 ), "cannot find collection '+collection+'.xml")';


  query(xquery, function(err,res) {
  	var result = "";

  	if (err) {
      cb && cb(err,null)
  	} else if (res) {
	    result=JSON.parse(res);
	    cb && cb(undefined,result);
	  } else {
      console.log('key not found')
      cb && cb(new Error('key not found'),null)
    }
  })
}

var query = exports.query = function(xquery, callback) {
	var cb = callback;
	var query = connection.query(xquery, { chunkSize: 100 });
  var data =[];

	query.on("error", function(err) {
	  //console.log("eXist.query(): An error occurred: " + err);
		if (cb) cb(err,null);
	});
	var results=[];
	query.each(function(item,hits,offset) {
      results.push(item);
    });
	query.on('end',function(){
		if (cb) cb(null,results)
	})

}

var info = exports.info = function (callback) {
  var cb=callback;

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
var init = exports.init = function (callback){

 var cb=callback;

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
				return check_existdb_1(cb);
			} else {
				console.log('creating cookies.xml');
				xquery = 'xquery version "3.0";\
                  let $my-doc := <items/> \
                  return\
                  xmldb:store("/apps/rest3d/data", "assets.xml", $my-doc)';
        query(xquery, function(err,res) {
        	if (err) {
        		console.log('Error creating cookies.xml');
        		console.log(err);
        		return cb(false);
        	} else {
        		console.log('assets.xml created')
        		return check_existdb_1(cb);
        	}
        })
			}
		})
	})
})
}


// next step in check existdb - 
var check_existdb_1 = function (callback) {
  var cb = callback;
  // empty cookie jar
  connection.del('/apps/rest3d/data/cookies.xml', function(err) {
    if (err) {
        console.log("delete cookies - error ");
        console.log(err);
        return cb(false);
    } else {
      console.log('cookies deleted, creating new jar');
        var xquery = 'xquery version "3.0";\
                    let $my-doc := <items/> \
                    return\
                    xmldb:store("/apps/rest3d/data", "cookies.xml", $my-doc)';
          query(xquery, function(err,res) {
            if (err) {
              console.log('Error creating cookies.xml');
              console.log(err);
              return cb(false)
            } else {
              console.log('cookies.xml created')
              return cb(true);
            }
          })
    }
  });

/* TEST FUNCTIONS -> do not remove
  insertKeyPair('cookies','tagada', 'a json string', function(err, res) {
	  if (err) {
  		console.log('Error inserting cookie');
  		console.log(err);
  		return
  	} else {

  		removeKey('cookies','tagada', function(err,res){
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
  insertKeyPair('cookies','olala', {name:'toto', price:5}, function(err, res) {
	  if (err) {
  		console.log('Error inserting cookie');
  		console.log(err);
  		return
  	} else {
  		getKey('cookies','olala', function (err,res){
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