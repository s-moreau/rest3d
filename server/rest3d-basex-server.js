/*
rest3d-basex-server.js

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

var restify = require('restify');
//var connect = require('connect');
var send = require('send');
var http = require('http');
var basex  = require('basex');
var utils = require('./utils');

var os= require('os');
require('shelljs/global');

var fs = require('fs');
var path = require('path');
// create diskcache (no mem caching, no gzip)
var cache = require('./diskcache').Cache;

// fast html scrapping
var request = require('request');
var cheerio = require('cheerio');

// get content from zip files
var zip = require("zip");

var diskcache = new cache('cache',true,false,false); 

var formidable = require('formidable');
var imageMagick = require('imagemagick');


// create/delete tmp upload dirs
var rmdirSync = function(dir) {
	if (!fs.existsSync(dir)) return;
	var list = fs.readdirSync(dir);
	for(var i = 0; i < list.length; i++) {
		var filename = path.join(dir, list[i]);
		var stat = fs.statSync(filename);
		
        if(stat.isDirectory()) {
			// rmdir recursively
			rmdirSync(filename);
		} else {
			// rm fiilename
			fs.unlinkSync(filename);
		}
	}
	fs.rmdirSync(dir);
};


rmdirSync('tmp');
rmdirSync('upload');

fs.mkdirSync('tmp');
fs.mkdirSync('upload');
//fs.mkdirSync('upload/thumbnail');

var platform = os.type().match(/^Win/) ? 'win' : 
				(os.type().match(/^Dar/) ? 'mac' : 'unix');

console.log('host platform=',platform);

var static = path.join(process.cwd(), '../static');

console.log('static folder=',static);

//
function toJSON(o) {
    var cache = [];
	var result = JSON.stringify(o, function(key, value) {
		if (typeof value === 'object' && value !== null) {
        if (cache.indexOf(value) !== -1) {
            // Circular reference found, discard key
            return;
        }
        // Store value in our collection
        cache.push(value);
    }
	    return value;
	});
	cache = null; // Enable garbage collection
	return result;
};

//
var basex_system = "";

var listenToPort = process.env['OPENSHIFT_NODEJS_PORT'] || 8000;
var ip_address = process.env['OPENSHIFT_NODEJS_IP'] || '127.0.0.1';

var basex_port = process.env['DOTCLOUD_DATABASE_SERVERPORT_PORT'] || 1984;
var basex_port_server = process.env['DOTCLOUD_DATABASE_SERVERPORT_HOST'];
var basex_rest_server = process.env['DOTCLOUD_DATABASE_HTTP_HOST'];
var basex_rest = 80;
var basex_rest_user = 'admin';
var basex_rest_pass = 'admin';

// see where collada2gltf is located
var openshift = process.env['OPENSHIFT_DATA_DIR'];
var collada2gltf = 'collada2gltf';
if (openshift) 
	collada2gltf = openshift + 'bin/collada2gltf';

if (basex_port_server === undefined)
{
	basex_port_server = basex_rest_server = 'localhost';
	basex_rest = 8984;
}

console.log('baseX host='+basex_port_server+" TCP port="+basex_port+ " REST server="+basex_rest_server+" port="+basex_rest);
var session = new basex.Session(basex_port_server,basex_port);


var server = restify.createServer();

server.use(restify.acceptParser(server.acceptable));
//server.use(restify.authorizationParser());
server.use(restify.dateParser());
server.use(restify.queryParser());
//server.use(restify.bodyParser()); -> use formidable instead
restify.defaultResponseHeaders = false;

function unknownMethodHandler(req, res) {
	console.log('unkownMethodHandler method='+req.method.toLowerCase());
  if (req.method.toLowerCase() === 'options') {
    var allowHeaders = ['Accept', 'Accept-Version', 'Content-Type', 'Api-Version'];

    if (res.methods.indexOf('OPTIONS') === -1) res.methods.push('OPTIONS');

    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Headers', allowHeaders.join(', '));
    res.header('Access-Control-Allow-Methods', res.methods.join(', '));
    res.header('Access-Control-Allow-Origin', req.headers.origin);

    return res.send(204);
  }
  else
    return res.send(new restify.MethodNotAllowedError());
}

server.on('MethodNotAllowed', unknownMethodHandler);
/*
server.use(restify.throttle({
  burst: 100,
  rate: 50,
  ip: true,
  overrides: {
    '192.168.1.1': {
      rate: 0,        // unlimited
      burst: 0
    }
  }
}));
*/
//server.use(restify.conditionalRequest());

var basex_rest_url = 'http://'+basex_rest_server+':'+basex_rest;

var basex_client = restify.createClient({
	url: basex_rest_url
});

basex_client.basicAuth(basex_rest_user, basex_rest_pass);

var check_basex = function () {
	// start the rest session
	basex_client.get('/rest', function(err, req) {
		var didthiswork=true;
		if (err){
			console.log('intial DB REST ERROR')
			console.log(err)
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
	      			console.log('trying again in 15 seconds')
	      			setTimeout('check_basex',15000)
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

basexGet= function(url, callback) {
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
basexPost= function(url, body, callback) {
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

// get basex system info 
session.execute("xquery json:serialize-ml(db:system())", function (err,r){

	if (err)
	{
		console.log("cannot connect to database");

	} else
	{
		basex_system=eval(r.result);

		// this will fail, but return only after a long timeout. 
		// seems like this will enable other calls to repond fast. but in node-basex most likely
		var query_doc_type=session.query("db:content-type('assets','truc')");
		query_doc_type.execute(function(err,r) {
		
			query_doc_type.execute(function(err,r) {
			});
		});
	}
});

function sendFile(req,res,p) {
  function error(err) {
    res.statusCode = err.status;
    res.end(http.STATUS_CODES[err.status]);
    console.log('send error');
    
    console.log(err);
    console.log('******')
  }

  function redirect() {
    res.statusCode = 301;
    res.setHeader('Location', req.url + 'index.html');
    res.end('Redirecting to ' + req.url + 'index.html');
    console.log('redirected to '+req.url + 'index.html')
  }

console.log('sendFile dir='+ p);

  send(req, p)
  .on('error', error)
  .on('directory', redirect)
  .pipe(res);

};

// rest3d API
server.get(/^\/rest3d\/info/,function(req, res, next) {
	console.log('[rest3d]'+req.url);
	    res.writeHead(200, {"Content-Type": "text/ascii"});  

		session.execute("info", function(err, r) {
			if (err)
			{
				console.log('database INFO error'+err);
			} else {		
				res.write("<pre>");
				res.write(r.result);
				res.write("</pre>");
				res.end();
			}	

		})
	return next();
});

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
		result.assets = []
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
		$ = cheerio.load(body);
		result.name = 'Search results for '+str;
		result.uri = uid;
		result.assets = []

		var search = $('div[class="resulttitle"] a'); //use your CSS selector here
		
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
			}
		});
		return result;
	};		
	var uid = req.url.split("/warehouse/")[1];
	console.log('[warehouse]' + uid);
	if (uid == null || uid=='')
	{
		request({ // 3d building collections
				url: 'http://sketchup.google.com/3dwarehouse/cldetails?mid=46f3f70fe38d801af6dcb9e43126f21d'
				//,headers : {
				//	"Authorization" : "Basic " + new Buffer(basex_rest_user + ":" + basex_rest_pass).toString("base64")
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
			var req = "http://sketchup.google.com/3dwarehouse/doadvsearch?title="+
			          search+
			          "&scoring=d&file=zip&dwld=true"
			request({ 
				url: req
			}, function(err, resp, body){
				if (err){
					console.log('ERROR searching 3dwarehouse for '+search)
					console.log(err)
					return next(err);
				}
				var result = parsesearch(body,search);
				res.writeHead(200, {'Content-Type': 'application/json' });
				res.write(toJSON(result));
				res.end();
				return next();
			});
		}
	} else
	{
		request({ // 3d building collections ?
			url: 'http://sketchup.google.com/3dwarehouse/cldetails?mid='+uid
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

var databaseStore = function(asset,filename) {
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

server.put(/^\/rest3d\/assets.*/,function(req, res, next) {
	var asset = req.url.split('assets/')[1];
	// need asset uri !
	if (asset === undefined || asset == null || asset === '')
	{
			res.writeHead(400);
			res.write('put need asset uri');
			res.end();
			return next();
	}
	console.log('put asset='+asset)
	console.log('body=',req.body)

	rmdirSync('tmp');
	fs.mkdirSync('tmp');

	var zipfile = fs.createWriteStream('tmp/zip.zip')

	var daefilename = '';

	request.get(req.body).pipe(zipfile)

	zipfile.on('close', function () {

		zipfile = fs.createReadStream('tmp/zip.zip')
		
		var data = fs.readFileSync('tmp/zip.zip')
		try {
		//fs.open("tmp/zip.zip", "r", "0666", function(err, fd) {
			//	var reader = zip.Reader(fd);

			var reader = zip.Reader(data);
		
		    reader.forEach(function (entry) {
		    	var filename = entry.getName();
		    	console.log('****** entry *********')
			    console.log('filename=',filename);

			try {
			    var tmpfilename = 'tmp/'+asset+'/'+filename;
		    	if (tmpfilename.endsWith('/')) {
		    	} else
		    	{
		    		// make sure folder exists
		    		var folder = tmpfilename.substring(0,tmpfilename.lastIndexOf('/'));
		    		console.log('folder='+folder)
		    		mkdirsSync(folder); 
		    		
		    		fs.writeFileSync(tmpfilename, entry.getData(), function (err) {
					  if (err) throw err;
					  console.log('It\'s saved!');
					});
		    	
		    		if (filename.toLowerCase().endsWith('.dae'))
		    			daefilename = tmpfilename;
			    	
				}
			} catch (e)
			{
				console.log("problem writing entry")
				console.log(e)
			}
			
	    	//});
		});
		} catch (e)
		{
			console.log('counld not unzip zip file')
			console.log(e);
			res.writeHead(500);
			res.write('counld not unzip zip file');
			res.end();
			return next();
		}
		if (daefilename == '')
		{
			console.log('counld not find .dae file in zip')
			res.writeHead(400);
			res.write('counld not find .dae file in zip');
			res.end();
			return next();
		} else
		{
			console.log('now converting collada')

			exec(collada2gltf+' '+daefilename+" "+daefilename.replace('.dae','.json'), function(code, output){

			console.log('Exit code:', code);
				console.log('Program output:', output);
			

			daefilename = daefilename.substring(daefilename.lastIndexOf('/')+1);
			
			console.log('filename = '+daefilename)
			
			console.log('pushing converted files to database')

			var xml = '<asset  xmlns=""> '+
							 '<type>collection</type> '+
						 '<name>'+asset+'</name> '+
						 '<uri>assets/</uri> '+
						   '<assets> '+
						    '<asset> '+
								 '<type>collection</type> '+
								 '<name>models</name> '+
								 '<uri>assets/'+asset+'/</uri> '+
								 '<assets> '+
									 '<asset> '+
									 '<type>model</type> '+
									 '<name>'+asset+'</name> '+
									 '<uri>assets/'+asset+'/models/</uri> '+
									 '<source>'+daefilename+'</source> '+
									 '<builds> '+
									 '<build> '+
									 '<target>COLLADA2json</target> '+
									 '<script>builtin</script> '+
									 '<outputs> '+
									    '<output>'+daefilename.replace('.dae','.json')+'</output> '+
									    '<output>'+daefilename.replace('.dae','.bin')+'</output> '+
									 '</outputs> '+
									 '</build> '+
									 '</builds> '+
									 '</asset> '+
								 '</assets> '+
						    '</asset> '+
						    '<asset> '+
								 '<type>collection</type> '+
								 '<name>images</name> '+
								 '<uri>assets/'+asset+'/</uri> '+
								 '<assets> '+
								 '</assets> '+
						    '</asset> '+
						   '</assets> '+
						 '</asset> '


			var xql = 'let $a := doc("assets/assets.xml")/json/assets '+
			              'let $b := '+xml+
			              'return '+
			              'insert node $b as first into $a '

			var query=session.query(xql);

			console.log('xql='+xql)
			query.execute(function(err,r){
				if (err)
				{
					console.log('query error'+err);
				} else {
					console.log('query OK');
				}	
			}); 



			fs.readdir('tmp/'+asset+'/models', function(err, files) {
				if (err) {
					console.log('cannot readdir '+'tmp/'+asset+'/models')
				} else
				{
					files.forEach(function (filename) {
						databaseStore(asset,'models/'+filename);
						if (filename.toLowerCase().endsWith('glsl'))
						{
							var xml = '<asset  xmlns=""> '+
										'<type>shader</type> '+
										'<name>'+filename.split('.')[0]+'</name> '+
										'<uri>assets/'+asset+'/models/</uri> '+
										'<source>'+filename+'</source> '+
									'</asset> '

							var xql = 'let $a := doc("assets/assets.xml")/json/assets/asset[name="'+asset+'"]/assets/asset[name="models"]/assets '+
					              'let $b := '+xml+
					              'return '+
					              'insert node $b into $a '
							var query=session.query(xql);
							console.log('xql='+xql)
							query.execute(function(err,r){
								if (err)
								{
									console.log('query error'+err);
								} else {
									console.log('query OK');
								}	
							}); 
						}
					});
				}
			});


			fs.readdir('tmp/'+asset+'/images', function(err, files) {
				if (err) {
					console.log('cannot readdir '+'tmp/'+asset+'/images')
				} else
				{
					files.forEach(function (filename) {
						databaseStore(asset,'images/'+filename);
				
						var xml = '<asset  xmlns=""> '+
										'<type>image</type> '+
										'<name>'+filename.split('.')[0]+'</name> '+
										'<uri>assets/'+asset+'/images/</uri> '+
										'<source>'+filename+'</source> '+
									'</asset> '

						var xql = 'let $a := doc("assets/assets.xml")/json/assets/asset[name="'+asset+'"]/assets/asset[name="images"]/assets '+
				              'let $b := '+xml+
				              'return '+
				              'insert node $b into $a '
						var query=session.query(xql);
						console.log('xql='+xql)
						query.execute(function(err,r){
							if (err)
							{
								console.log('query error'+err);
							} else {
								console.log('query OK');
							}	
						}); 
					});
				}
			});

			res.writeHead(200)
			res.write(output)
			res.end()

			
			return next();
	           });
		}
	})

		
});

server.get(/^\/rest3d\/assets.*/,function(req, res, next) {
	var asset = req.url.split("/assets/")[1];
	//if (asset !== undefined) asset = asset.toLowerCase()
	console.log('[assets] =['+asset+']');

	if (asset === undefined || asset=='') {
		console.log('get assets');

		var query='<query xmlns="http://basex.org/rest"><text><![CDATA['+
		          'declare option output:method "json";'+
		          'doc("assets/assets.xml")'+
		          ']]></text></query>';

		basexPost('/assets',query,function(err,req2,res2){
			if (err)
			{
				console.log('got ERROR from REST QUERY')
				console.log(err)
				res.send(new restify.InternalError(err))
			}
			else {
				console.log('got RESULT from REST QUERY')
				res.writeHead(200, {'Content-Type': 'application/json' });

				res.write(res2.body);
				res.end();

			}
			return next();
		});

	} else
	{
 		// see if we have a cache hit
	    var redirect = '/rest/assets/'+asset;
	    
	    diskcache.hit(redirect,function(err,entry){
	    	
	    	if (entry != null) 
	    	{
	    		console.log('disk cache HIT!');
	    		res.setHeader('Content-Type', entry.headers['content-type']);
	    		console.log('set content-type to ['+entry.headers['content-type']+']')
				sendFile(req,res,entry.filename);
				return next();
	    	} // else

		    var query_doc=session.query("doc(\"assets/"+asset+"\")");
		    var query_doc_type=session.query("db:content-type('assets','"+asset+"')");
		    console.log('xquery='+"db:content-type('assets','"+asset+"')");
		    //var query_binary=session.query("declare option output:method 'raw';  db:retrieve('assets', '"+asset+"')");


		 	query_doc_type.execute(function(err,r) {
		 		if (r.ok) {
		 			if (r.result == 'application/xml') {

		 				console.log('query_xml');
		 			    query_doc.execute(function(err, r) {
							console.log('second query');
							if (err) {
								
								res.end(err);
								console.log('err'+err)
								return next(404);
							} else
							{
								console.log('writing query results');
								res.write(r.result);
								res.end();
								return next();
							}
						});

		 			} else {

		 				console.log('query_binary');
					  
		    			// did not find document in cache before
		    			// get data from database
		    			basexGet(redirect,function(err,req2,res2){
		    				if (err)
		    				{
								res.end(err);
								console.log('err'+err)
								return next(404);
		    				} else
 							diskcache.store(redirect,res2,function(err,entry){
							      	if (err){
				    					console.log('DISK CACHE ERROR')
				    					console.log(err)
				    					return next(err);
				    				}
				    				console.log('SERVE CONTENT NOW!!='+entry.filename)
				    				res.setHeader('Content-Type', entry.headers['content-type']);
						    		console.log('set content-type to ['+entry.headers['content-type']+']')
									sendFile(req,res,entry.filename);
									return next();
								});
		    			});
		    			/*
		    			basex_client.get(redirect, function(err, req2) {
		    				console.log('in redirect client.get = '+ redirect)
		    				if (err){
		    					console.log('CLIENT ERROR')
		    					console.log(err)
		    					return next(err);
		    				}

						  req2.on('result', function(err, res2) {
						  	console.log('in result')
						  	if (err){
		    					console.log('CLIENT RESULT ERROR')
		    					console.log(err)
		    					console.log('***')
		    					console.log(res2)
		    					return next(err);
		    				}
		    				console.log('getting result from database query')
		    				res2.body=''
						    res2.setEncoding('binary')
						    res2.on('data', function(chunk) {
						      res2.body += chunk;
						    });

						    console.log('res2 header='); console.log(res2.headers)

						    res2.on('end', function() {
						      console.log('GOT BODY');
						      diskcache.store(redirect,res2,function(err,entry){
							      	if (err){
				    					console.log('DISK CACHE ERROR')
				    					console.log(err)
				    					return next(err);
				    				}
				    				console.log('SERVE CONTENT NOW!!='+entry.filename)
				    				res.setHeader('Content-Type', entry.headers['content-type']);
						    		console.log('set content-type to ['+entry.headers['content-type']+']')
									sendFile(req,res,entry.filename);
									return next();
								});

						    });
						  });
					    	
					    });
						*/

					    
		     		}

		 		} else 
		 		{
		 			console.log('error 404!')
		 			console.log(err);
		 			
					//res.writeHead(404);
					//res.end(404,err);

					return next(new restify.ResourceNotFoundError(err));
					//return next(err);
		 		}
		 	});
	    });

 	}
	
});

// upload
var UploadHandler = function (req, res, callback) {
            this.req = req;
            this.res = res;
            this.callback = callback;
    },
    options = {
        tmpDir: __dirname + '/tmp',
        uploadDir: __dirname + '/upload',
        uploadUrl: '/rest3d/upload/',
        maxPostSize: 11000000000, // 11 GB
        minFileSize: 1,
        maxFileSize: 10000000000, // 10 GB
        acceptFileTypes: /.+/i,
        // Files not matched by this regular expression force a download dialog,
        // to prevent executing any scripts in the context of the service domain:
        safeFileTypes: /\.(gif|jpe?g|png|tga|dae|zip)$/i,
        imageTypes: /\.(gif|jpe?g|png|tga)$/i,
        imageVersions: {
            'thumbnail': {
                width: 80,
                height: 80
               }
       },
       accessControl: {
            allowOrigin: '*',
            allowMethods: 'OPTIONS, HEAD, GET, POST, PUT, DELETE',
            allowHeaders: 'Content-Type, Content-Range, Content-Disposition'
        },
        /* Uncomment and edit this section to provide the service via HTTPS:
        ssl: {
            key: fs.readFileSync('/Applications/XAMPP/etc/ssl.key/server.key'),
            cert: fs.readFileSync('/Applications/XAMPP/etc/ssl.crt/server.crt')
        },
        */
       nodeStatic: {
           cache: 3600 // seconds to cache served files
       }
    },
    utf8encode = function (str) {
        return unescape(encodeURIComponent(str));
    },

    nameCountRegexp = /(?:(?: \(([\d]+)\))?(\.[^.]+))?$/,
    nameCountFunc = function (s, index, ext) {
        return ' (' + ((parseInt(index, 10) || 0) + 1) + ')' + (ext || '');
    },
    handleResult = function (req, res, result, redirect) {

        if (redirect) {
            res.writeHead(302, {
                'Location': redirect.replace(
                /%s/,
                encodeURIComponent(JSON.stringify(result))
                )
            });
            res.end();
        } else {
            res.writeHead(200, {
                'Content-Type': req.headers.accept
                .indexOf('application/json') !== -1 ?
                    'application/json' : 'text/plain'
            });
            res.end(JSON.stringify(result));
        }
    },
    handleError = function (req, res, error) {
    	console.log('returning error ='+JSON.stringify(error));
		res.writeHead(500, {
            'Content-Type': req.headers.accept
            .indexOf('application/json') !== -1 ?
                'application/json' : 'text/plain'
        });
        res.end(JSON.stringify(error));
    },
    setNoCacheHeaders = function (res) {
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Content-Disposition', 'inline; filename="files.json"');
    };


var FileInfo = function (file) {
        this.name = file.name;
        this.size = file.size;
        this.type = file.type;
        this.delete_type = 'DELETE';
};
FileInfo.prototype.validate = function () {
    if (options.minFileSize && options.minFileSize > this.size) {
        this.error = 'File is too small';
    } else if (options.maxFileSize && options.maxFileSize < this.size) {
        this.error = 'File is too big';
    } else if (!options.acceptFileTypes.test(this.name)) {
        this.error = 'Filetype not allowed';
    }
    return !this.error;
};
FileInfo.prototype.safeName = function () {
    // Prevent directory traversal and creating hidden system files:
    this.name = path.basename(this.name).replace(/^\.+/, '');
    // Prevent overwriting existing files:
    while (fs.existsSync(options.uploadDir + '/' + this.name)) {
        this.name = this.name.replace(nameCountRegexp, nameCountFunc);
    }
};
FileInfo.prototype.initUrls = function (req) {
    if (!this.error) {
        var that = this,
            baseUrl = (options.ssl ? 'https:' : 'http:') +
                '//' + req.headers.host + options.uploadUrl;
        this.url = this.delete_url = baseUrl + encodeURIComponent(this.name);
        Object.keys(options.imageVersions).forEach(function (version) {
            if (fs.existsSync(
                    options.uploadDir + '/' + version + '/' + that.name
                )) {
                that[version + '_url'] = baseUrl + version + '/' +
                    encodeURIComponent(that.name);
            }
        });
    }
};
FileInfo.prototype.delete = function(){
	var fileName = this.name;
	fs.unlink(options.uploadDir + '/' + fileName, function (ex) {
		Object.keys(options.imageVersions).forEach(function (version) {
			fs.unlink(options.uploadDir + '/' + version + '/' + fileName);
		});
	});
};

var UploadHandler = function (req, res, callback) {
    this.req = req;
    this.res = res;
    this.callback = callback;
};


UploadHandler.prototype.post = function () {
    var handler = this,
        form = new formidable.IncomingForm(),
        tmpFiles = [],
        files = [],
        map = {},
        counter = 1,
        redirect,
        finish = function () {
            counter -= 1;
            if (!counter) {
                files.forEach(function (fileInfo) {

    			    console.log ('file '+fileInfo.name+' was uploaded succesfully');

                    fileInfo.initUrls(handler.req);

                    var timeout = function() {
                    	fileInfo.delete();
                    	console.log('timeout !! '+fileInfo.name+' was deleted');
                    }
                    setTimeout(function() { timeout()},5 * 60 * 1000);
                });
                handler.callback(handler.req, handler.res, {files: files}, redirect);
            }
        };
    form.uploadDir = options.tmpDir;
    form.on('fileBegin', function (name, file) {
        tmpFiles.push(file.path);
        var fileInfo = new FileInfo(file, handler.req, true);
        fileInfo.safeName();
        map[path.basename(file.path)] = fileInfo;
        files.push(fileInfo);
    }).on('field', function (name, value) {
        if (name === 'redirect') {
            redirect = value;
        }
    }).on('file', function (name, file) {
        var fileInfo = map[path.basename(file.path)];
        fileInfo.size = file.size;
        if (!fileInfo.validate()) {
            fs.unlink(file.path);
            return;
        }
        fs.renameSync(file.path, options.uploadDir + '/' + fileInfo.name);
        if (options.imageTypes.test(fileInfo.name)) {
            Object.keys(options.imageVersions).forEach(function (version) {
                counter += 1;
                var opts = options.imageVersions[version];
                imageMagick.resize({
                    width: opts.width,
                    height: opts.height,
                    srcPath: options.uploadDir + '/' + fileInfo.name,
                    dstPath: options.uploadDir + '/' + version + '/' +
                        fileInfo.name
                }, finish);
            });
        }
    }).on('aborted', function () {
        tmpFiles.forEach(function (file) {
            fs.unlink(file);
        });
    }).on('error', function (e) {
        console.log(e);
        return ('error '+e)
    }).on('progress', function (bytesReceived, bytesExpected) {
        if (bytesReceived > options.maxPostSize) {
            handler.req.connection.destroy();
        }
    }).on('end', finish);

    form.parse(handler.req);
};

UploadHandler.prototype.get = function () {
    var handler = this,
        files = [];
    fs.readdir(options.uploadDir, function (err, list) {
        list.forEach(function (name) {
            var stats = fs.statSync(options.uploadDir + '/' + name),
                fileInfo;
            if (stats.isFile() && name[0] !== '.') {
                fileInfo = new FileInfo({
                    name: name,
                    size: stats.size
                });
                fileInfo.initUrls(handler.req);
                files.push(fileInfo);
            }
        });
        handler.callback(handler.req, handler.res, {files: files});
    });
};

UploadHandler.prototype.destroy = function () {
    var handler = this,
        fileName;
    if (handler.req.url.slice(0, options.uploadUrl.length) === options.uploadUrl) {
        fileName = path.basename(decodeURIComponent(handler.req.url));
        if (fileName[0] !== '.') {
            fs.unlink(options.uploadDir + '/' + fileName, function (ex) {
                Object.keys(options.imageVersions).forEach(function (version) {
                    fs.unlink(options.uploadDir + '/' + version + '/' + fileName);
                });
                handler.callback(this.req, this.res, {success: !ex});
            });
            return;
        }
    }
    handler.callback(this.req, this.res, {success: false});
};

server.post(/^\/rest3d\/upload.*/, function(req,res,next){


    res.setHeader(
        'Access-Control-Allow-Origin',
        options.accessControl.allowOrigin
    );
    res.setHeader(
        'Access-Control-Allow-Methods',
        options.accessControl.allowMethods
    );
    res.setHeader(
        'Access-Control-Allow-Headers',
        options.accessControl.allowHeaders
    );
    var handler = new UploadHandler(req, res, handleResult);
    setNoCacheHeaders(res);
    var result = handler.post();

    return next();
});

server.get(/^\/rest3d\/upload.*/, function(req,res,next){
	console.log('in upload/')
    res.setHeader(
        'Access-Control-Allow-Origin',
        options.accessControl.allowOrigin
    );
    res.setHeader(
        'Access-Control-Allow-Methods',
        options.accessControl.allowMethods
    );
    res.setHeader(
        'Access-Control-Allow-Headers',
        options.accessControl.allowHeaders
    );
    var handler = new UploadHandler(req, res, handleResult);

    var asset = req.url.split("/upload/")[1];
    console.log('asset='+asset)
    if (asset === undefined || asset === '') {
        setNoCacheHeaders(res);
        if (req.method === 'GET') {
            handler.get();
        } else {
           res.end();
        }
     } else {
     	 var p=path.resolve(options.uploadDir+'/'+asset);
         sendFile(req,res,p);
     }
     return next();
});
// static server
server.get(/^\/.*/, function (req, res, next) {
	

	var p=path.resolve(static + req.url);

	console.log('http get path='+p);

	sendFile(req,res,p);
	return next();
});

// convert

server.post(/^\/rest3d\/convert.*/,function(_req,_res,_next){
	 console.log('post -> convert');

	 var form = new formidable.IncomingForm(),
         url = '',
         res = _res,
         req = _req,
         next = _next,
         params = {};

     form.on('field', function (name, data) {
     	params[name] = data;
     }).on('error', function (e) {
     	handleError(req,res,e);
        return next();
     }).on('end', function(){
     	console.log('now converting collada')

     	if (!params.name || !params.name.toLowerCase().endsWith('dae')) { 
     		handleError(req,res,{error: 'invalid file '+params.name+' in convert'});
     		return next();
     	}
     	var output_dir = params.name.split('\.')[0]+'_gltf';
     	var output_file = params.name.replace('.dae','.json');
     	fs.mkdirSync('upload/'+output_dir);

     	var cmd = collada2gltf+" -p -f \"upload/" + params.name+"\" -o \""+'upload/'+output_dir+'/'+output_file+"\"";
     	console.log('exec '+cmd);
     	// todo -> manage progress !!!
		exec(cmd, function(code, output){

			if (code !== 0){
				handleError(req,res,{error: 'collada2gltf returned an error='+code+'\n'+output});
				return next();
			}
			console.log('Exit code:', code);
	  		console.log('Program output:', output);
					
			var files = [];
			fs.readdir('upload/'+output_dir, function (err, list) {
                list.forEach(function (name) {
		            var stats = fs.statSync('upload/'+output_dir + '/' + name),
		                fileInfo;
		            if (stats.isFile() && name[0] !== '.') {
		                fileInfo = new FileInfo({
		                    name: output_dir+'/'+name,
		                    size: stats.size
		                });
		                fileInfo.initUrls(req);
		                files.push(fileInfo);
		            }
		        });
		        var timeout = function() {
                    	rmdirSync('upload/'+output.dir);
                    	console.log('timeout !! upload/'+output_dir+'/ was deleted');
                    }
                    setTimeout(function() { timeout()},5 * 60 * 1000);
		        handleResult(req, res, {files: files});
		    });
						
		     return next();
	     });
	});

    form.parse(req);

});
//post
server.post(/^\/rest3d.*/,function(req,res,next){

	var test = req.url.split("/rest3d/")[1];
	console.log('[post]'+test);
	console.log(req.params)
	return next();
});

// clean exit
function sigterm_handler() {
    console.warn('Kaboom Baby!');
    process.exit(0);
}

process.on('SIGTERM', sigterm_handler);

// run server
server.listen( listenToPort, ip_address);
console.log ('rest3d server running on port '+listenToPort);


