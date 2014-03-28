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
var basex = require('basex');


var basex_port = process.env['DOTCLOUD_DATABASE_SERVERPORT_PORT'] || 1984;
var basex_port_server = process.env['DOTCLOUD_DATABASE_SERVERPORT_HOST'];
var basex_rest_server = process.env['DOTCLOUD_DATABASE_HTTP_HOST'];
var basex_rest = 80;
var basex_rest_user = 'admin';
var basex_rest_pass = 'admin';

if (basex_port_server === undefined)
{
	basex_port_server = basex_rest_server = 'localhost';
	basex_rest = 8984;
}

console.log('baseX host='+basex_port_server+" TCP port="+basex_port+ " REST server="+basex_rest_server+" port="+basex_rest);
var session = exports.session = new basex.Session(basex_port_server,basex_port);

var basex_rest_url = 'http://'+basex_rest_server+':'+basex_rest;

var basex_client = restify.createClient({
	url: basex_rest_url
});

basex_client.basicAuth(basex_rest_user, basex_rest_pass);

var check_basex = function () {
	// start the rest session
	basex_client.get('/rest', function(err, req) {
		var didthiswork=true;
		var test_count = 3;
		if (err){
			console.log('intial DB REST ERROR\n'+err);
			console.log('running without database');
			session=null;
			return
		}
		req.on('result', function(err, res) {
		  	if (err) {
				console.log('REST RESULT ERROR')
				console.log(err)
				didthiswork=false;
				return 
			}
		    res.body = '';
		    res.setEncoding('binary');
		    res.on('data', function(chunk) {
		    	res.body += chunk;
	    	});

		    res.on('end', function() {
		    	if (didthiswork) {
	      			console.log('Database REST API and connection tested');
	      			console.log("rest3d baseX server running at\n  => http://localhost:" + basex_rest + "/\nCTRL + C to shutdown");
	      		}
	      		else
	      		{
	      			console.log('ERROR: cannot get result from database');
	      			test_count --;
	      			if (test_count) {
		      			console.log('trying again in 15 seconds')
		      			setTimeout('check_basex',15000)
		      		} else
		      		{
		      			console.log('running without database');
		      			session=null;
		      		}
	      		}

		    });
		});
	});
};

check_basex();


function print(err, reply) {
    if (err) {
            console.log("Error: " + err);
    } else {
            console.log(reply);
    }
};

exports.get = function(url, callback) {
	var cb=callback;
	basex_client.get(url, function(err, req2) {
		console.log('calling BASEX REST GET = '+ url)
		if (err){
			console.log('BASEX REST GET ERROR')
			console.log(err)
			if (cb) cb(err,req2,null);
			else return err;
		}

	  req2.on('result', function(err, res2) {
	  	if (err){
			console.log('BASEX REST GET RESULT ERROR')
			console.log(err)
			if (cb) cb(err,req2,null);
			else return err;
		}
		res2.body=''
	    res2.setEncoding('binary')
	    res2.on('data', function(chunk) {
	      res2.body += chunk;
	    });

	    res2.on('end', function() {
	      if (cb) cb(null, req2, res2);
	      else return res2;
	    });
	  });
		
	});
};
exports.post = function(url, body, callback) {
	var cb=callback;
	var opts = {};
	opts['path'] = '/rest'+url;
	opts['headers'] = {'content-type': 'application/xml'};
	
	basex_client.post(opts, function(err, req2) {
		console.log('calling BASEX REST POST = '+req2.path);
		if (err){
			console.log('BASEX REST GET ERROR')
			console.log(err)
			if (cb) cb(err,req2,null);
			else return err;
		}
	  req2.write(body);
	  req2.end();

	  req2.on('result', function(err, res2) {
	  	if (err){
			console.log('BASEX REST GET RESULT ERROR')
			console.log(err)
			if (cb) cb(err,req2,null);
			else return err;
		}
		res2.body=''
	    res2.setEncoding('binary')
	    res2.on('data', function(chunk) {
	      res2.body += chunk;
	    });

	    res2.on('end', function() {
	      if (cb) cb(null, req2, res2);
	      else return res2;
	    });
	  });
		
	});
};


exports.store = function(asset,filename) {
	var opts = {};
	opts['path'] = '/rest/assets/'+asset+'/'+filename;
	opts['headers'] = {'content-type': 'application/octet-stream'}

	console.log('databaseStore'+opts['path'])

	if (filename.toLowerCase().endsWith('.xml') || filename.toLowerCase().endsWith('.dae') || filename.toLowerCase().endsWith('.kml'))
		opts['headers'] = {'content-type': 'application/xml'}
	else if (filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg'))
		opts['headers'] = {'content-type': 'image/jpeg'}
	else if (filename.toLowerCase().endsWith('.png'))
		opts['headers'] = {'content-type': 'image/png'}

	console.log('pusing to database = '+ opts['path'])
	
	basex_client.put(opts, function (err, req) { 
		if (err){
			console.log('Database Upload (Put) ERROR')
			console.log(err)
			return next(err);
		}	
		
		var data = fs.readFileSync('tmp/'+asset+'/'+filename)
		req.write(data);
		req.end();
		req.on('result', function (err,res2) {
			res2.body=''
			res2.setEncoding('UTF8');
			res2.on('data', function(chunk) {
				res2.body += chunk;
			});

			res2.on('end',function(){
				console.log('GOT '+res2.body)
			});
		});
	});
}


// get basex system info 
session.execute("xquery json:serialize-ml(db:system())", function (err,r){

	if (err)
	{
		console.log("cannot connect to database");

	} else
	{
		var basex_system=eval(r.result);

		// this will fail, but return only after a long timeout. 
		// seems like this will enable other calls to repond fast. bug in node-basex most likely
		var query_doc_type=session.query("db:content-type('assets','truc')");
		query_doc_type.execute(function(err,r) {
		
			query_doc_type.execute(function(err,r) {
			});
		});
	}
});
