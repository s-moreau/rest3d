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
exports.store = function(asset,filename, callback) {

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
exports.insert = function(collection,id, value, callback) {

  var cb = callback;
  var xquery = 'variable $cookies := doc("cookies.xml"); \
							  insert node element cookie { \
							  element id{ '+id+'}, \
							  element state {'+toJSON(value)+' } \
               } into $cookies;';
  query(xquery, callback);
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
var check_existdb = function (){

  info(function(err,res){
		if (err) {
			console.log('error initializing eXist');
			// do something
			return
		}
		// create cookie.xml if it does not exists
		var xquery = 'fn:doc-available("projects/cookies.xml")';

		query(xquery, function(err,res) {
			if (err) {
				console.log('Error xquery check for cookies.xml');
			  console.log(err);
			  return;
			} else if (res[0]==="true") {
				console.log('OK: we have cookies.xml');
			} else {
				console.log('creating cookies.xml');
				xquery = 'xquery version "3.0";\
                  let $my-doc := <cookies/> \
                  return\
                  xmldb:store("projects", "cookies.xml", $my-doc)';
        query(xquery, function(err,res) {
        	if (err) {
        		console.log('Error creating cookies.xml');
        		console.log(err);
        		return
        	} else {
        		console.log('cookies.xml created')
        	}
        })
			}
		})

	})
}


check_existdb();