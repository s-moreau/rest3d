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

var Connection = require('existdb-node');

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

// store a file
var store = exports.store = function(asset,filename, callback) {

  var cb = callback;
  var path = '/rest/assets/'+asset+'/'+filename;
  // other optional arg: destination filename
	connection.store(filename, path, function(err) {
    if (err) {
        if (cb) cb(err,null);
		    console.log("eXist.store(): An error occurred: " + err);
    } else {
    	if (cb) cb(null,"eXist: "+path+" Upload completed!")
    }
	});
}
// insert an object in a key/pair database
var insertKeyPair = exports.insertKeyPair = function(collection, id, value, callback) {

  var text = value;
  if (typeof text != String) text = toJSON(text);
  text = encodeURIComponent(text);
  var cb = callback;
  var xquery = 'xquery version "3.0";\
                let $db := doc("/db/'+collection+'/'+collection+'.xml")/'+collection+' \
                let $item := $db/item[@id="'+id+'"]\
                let $newitem := <item id= "'+id+'">'+text+'</item> \
							  return\
							  if ($item)\
                then \
                 update replace $item with $newitem\
                else \
                 update insert $newitem into $db';


  query(xquery, callback);
}
// delete an object in a key/pair database
var removeKey = exports.removeKey = function(collection,id, value, callback) {

  var xquery = 'xquery version "3.0";\
                let $db := doc("/db/'+collection+'/'+collection+'.xml")/'+collection+' \
							  for $item in $db/item[@id="'+id+'"]\
							   return\
							    update delete $item';


  query(xquery, callback);
}

// delete an object in a key/pair database
var getKey = exports.getKey = function(collection,id, callback) {

  var xquery = 'xquery version "3.0";\
                declare namespace json="http://www.json.org";\
                declare option exist:serialize "method=json media-type=text/javascript";\
                let $db := doc("/db/'+collection+'/'+collection+'.xml")/'+collection+' \
							   return\
							    $db/item[@id="'+id+'"]';

  query(xquery, function(err,res) {
  	var result = "";
  	if (err) callback (err,null)
  	else if (res && res[0] && res[0]["#text"]) {
	    result=JSON.parse(decodeURIComponent(res[0]["#text"]));
	    callback(undefined,result);
	  } else
      callback('key not found',null)
  })
}

var query = exports.query = function(xquery, callback) {
	var cb = callback;
	var query = connection.query(xquery, { chunkSize: 100 });
  var data =[];

	query.on("error", function(err) {
	  console.log("eXist.query(): An error occurred: " + err);
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
		// create cookie.xml if it does not exists
		var xquery = 'fn:doc-available("cookies/cookies.xml")';

		query(xquery, function(err,res) {
			if (err) {
				console.log('Error xquery check for cookies.xml');
			  console.log(err);
			  return cb(false);
			} else if (res[0]==="true") {
				return check_existdb_1(cb);
			} else {
				console.log('creating cookies.xml');
				xquery = 'xquery version "3.0";\
                  let $my-doc := <cookies/> \
                  return\
                  xmldb:store("cookies", "cookies.xml", $my-doc)';
        query(xquery, function(err,res) {
        	if (err) {
        		console.log('Error creating cookies.xml');
        		console.log(err);
        		return cb(false);
        	} else {
        		console.log('cookies.xml created')
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
 return callback(true);
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