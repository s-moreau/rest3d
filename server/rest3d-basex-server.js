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

//var collada2json = require('./collada2json');
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

// create/delete tmp dir

var mkdirsSync = require('mkdir').mkdirsSync;
var rimraf = require('rimraf');

function delTmp(callback) {
	rimraf('tmp/',function(err){
		if (err)
		{
			console.log('Could not delete tmp'); console.log(err);
		} else
		{
			console.log('tmp deleted succesfully')
		}
		mkdirsSync('tmp');
		if (callback) callback();
	});
};
//delTmp();

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

var listenToPort = 8000;
var basex_port = process.env['DOTCLOUD_DATABASE_SERVERPORT_PORT'];
var basex_port_server = process.env['DOTCLOUD_DATABASE_SERVERPORT_HOST'];
var basex_rest_server = process.env['DOTCLOUD_DATABASE_HTTP_HOST'];
var basex_rest = 80;
var basex_rest_user = 'admin';
var basex_rest_pass = 'admin';

if (basex_port === undefined)
	basex_port = 1984;
else
	listenToPort = 8080;
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
server.use(restify.bodyParser());
restify.defaultResponseHeaders = false;
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
	      			console.log("rest3d baseX server running at\n  => http://localhost:" + listenToPort + "/\nCTRL + C to shutdown");
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
	basex_client.get(url, function(err, req2) {
		console.log('calling BASEX REST GET = '+ url)
		if (err){
			console.log('BASEX REST GET ERROR')
			console.log(err)
			if (callback) callback(err,req2,null);
			else return err;
		}

	  req2.on('result', function(err, res2) {
	  	if (err){
			console.log('BASEX REST GET RESULT ERROR')
			console.log(err)
			if (callback) callback(err,req2,null);
			else return err;
		}
		res2.body=''
	    res2.setEncoding('binary')
	    res2.on('data', function(chunk) {
	      res2.body += chunk;
	    });

	    res2.on('end', function() {
	      if (callback) callback(null, req2, res2);
	      else return res2;
	    });
	  });
		
	});
};
basexPost= function(url, body, callback) {
	var opts = {};
	opts['path'] = '/rest'+url;
	opts['headers'] = {'content-type': 'application/xml'};
	
	basex_client.post(opts, function(err, req2) {
		console.log('calling BASEX REST POST = '+req2.path);
		if (err){
			console.log('BASEX REST GET ERROR')
			console.log(err)
			if (callback) callback(err,req2,null);
			else return err;
		}
	  req2.write(body);
	  req2.end();

	  req2.on('result', function(err, res2) {
	  	if (err){
			console.log('BASEX REST GET RESULT ERROR')
			console.log(err)
			if (callback) callback(err,req2,null);
			else return err;
		}
		res2.body=''
	    res2.setEncoding('binary')
	    res2.on('data', function(chunk) {
	      res2.body += chunk;
	    });

	    res2.on('end', function() {
	      if (callback) callback(null, req2, res2);
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

function mySend(p,req,res) {
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

console.log('mySend dir='+ p);

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

	if (filename.endsWith('.xml') || filename.endsWith('.dae') || filename.endsWith('.kml'))
		opts['headers'] = {'content-type': 'application/xml'}
	else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg'))
		opts['headers'] = {'content-type': 'image/jpeg'}
	else if (filename.endsWith('.png'))
		opts['headers'] = {'content-type': 'image/png'}

	console.log('pusing to database = '+ opts['path'])
	
	basex_client.put(opts, function (err, req) { 
		if (err){
			console.log('Database Upload (Put) ERROR')
			console.log(err)
			delTmp();
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

	delTmp(function(){


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
			    	
			    		if (filename.endsWith('.dae'))
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

				//output = collada2json.convert(daefilename,daefilename.replace('.dae','.json'))
				var prgm="./collada2json"
				if (platform==='win') 
					prgm="collada2json.exe"
				
				exec(prgm+" "+daefilename+" "+daefilename.replace('.dae','.json'), function(code, output){

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
							if (filename.endsWith('glsl'))
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
	}); // delTmp

		
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
				mySend(entry.filename,req,res);
				return next();
	    	} // else

		    var query_doc=session.query("doc(\"assets/"+asset+"\")");
		    var query_doc_type=session.query("db:content-type('assets','"+asset+"')");
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
									mySend(entry.filename,req,res);
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
									mySend(entry.filename,req,res);
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


// static server
server.get(/^\/.*/, function (req, res, next) {
	

	var p=path.resolve(static + req.url);

	console.log('http get path='+p);

	mySend(p,req,res);
	return next();
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
server.listen(listenToPort);


