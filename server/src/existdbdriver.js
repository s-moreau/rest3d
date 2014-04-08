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

exports.query = function(collection, xquery, callback) {
	var cb = callback;
	var query = connection.query(xquery, { chunkSize: 100 });
	query.bind("collection", collection);
	query.on("error", function(err) {
		if (cb) cb(err,null);
	  console.log("eXist.query(): An error occurred: " + err);
	});
	query.each(function(rows) {
	    rows.forEach(function(row) {
	        console.log("%s\t%s\t%s", row.name, row.permissions, row.modified);
	    });
	});
	if (cb) cb(null,query);
}

// TODO

exports.info = function (callback) {
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