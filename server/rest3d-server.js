/*

rest3d-server.js

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

if (process.env['NODETIME_KEY']) {
    console.log("+=+=+= Starting http://nodetime.com");
    console.log("Key = '" + process.env['NODETIME_KEY'] + "'");
    require('nodetime').profile({
        accountKey: process.env['NODETIME_KEY'],
        appName: 'rest3d.fl4re.com node server'
    });
}

var restify = require('restify');
//var connect = require('connect');
var http = require('http');
var utils = require('./src/utils');
var childProcess = require('child_process');
var os = require('os');
require('shelljs/global');

var fs = require('fs');

var path = require('path');
var cache = require('./src/diskcache');

var request = require('request');

var formidable = require('formidable');

var rmdirSync = require('./src/rmdir');
var copyFileSync = require('./src/cp');

var toJSON = require('./src/tojson');

var Handler = require('./src/handler');




var platform = os.type().match(/^Win/) ? 'win' :
    (os.type().match(/^Dar/) ? 'mac' : 'unix');

console.log('host platform=', platform);
var staticPath = path.join(__dirname, '../static');

console.log('static folder=', staticPath);

var httpPort = process.env.OPENSHIFT_NODEJS_PORT ||
    process.env.HTTP ||
    8000;
var httpsPort = process.env.HTTPS || 443;
var ip_address = process.env.OPENSHIFT_NODEJS_IP || null;
var listenToPort = httpPort;


// see where collada2gltf is located
var openshift = process.env.OPENSHIFT_DATA_DIR;
var collada2gltf = 'collada2gltf';
if (openshift)
    collada2gltf = openshift + 'bin/collada2gltf-latest';
if (process.env.GLTF_BIN_PATH)
    collada2gltf = process.env.GLTF_BIN_PATH + '/collada2gltf';

// find out if we are running http or https
// if https, create two servers, the http server only does redirect to https

var params = {
    name: 'rest3d'
};

if (fs.existsSync('./server.pem') && fs.existsSync('./server.key')) {
    console.log('found https certficates');
    params.key = fs.readFileSync('./server.key');
    params.certificate = fs.readFileSync('./server.pem');
    listenToPort = httpsPort;
};

var server = module.exports.server = restify.createServer(params);
server.collada2gltf = collada2gltf;


if (params.key) {
    var http_server = restify.createServer();
    http_server.get(/.*/, function (req, res, next) {
        // Assume https port is on the default port
        var redirect = "https://" + req.headers.host.replace(/(.*):.*/, '$1') + req.url;
        res.writeHead(302, {
            'Location': redirect
        });

        //console.log('**** https redirect to '+redirect)
        res.end();
        next();
    });
    http_server.listen(httpPort, ip_address);
}

rmdirSync('tmp');
rmdirSync('cache');
rmdirSync('upload');

fs.mkdirSync('tmp');
fs.mkdirSync('upload');
fs.mkdirSync('cache');

fs.chmodSync('tmp', '777');
fs.chmodSync('upload', '777');
fs.chmodSync('cache', '777');

//fs.mkdirSync('upload/thumbnail');

server.use(restify.acceptParser(server.acceptable));
//server.use(restify.authorizationParser());
server.use(restify.dateParser());
server.use(restify.queryParser());
//server.use(restify.bodyParser()); -> use formidable instead
server.use(restify.gzipResponse());
restify.defaultResponseHeaders = false;

var session = require('./src/session')();

server.sessionManager = session;
server.use(session.sessionManager);

// call passport init after we have set the session manager
var passport = require('./src/passport');
passport.init(server);

// include routes
require('./src/jobs_routes')(server);
require('./src/warehouse')(server);
require('./src/3dvia')(server);
require('./src/upload')(server);
require('./src/convert')(server);


// create diskcache (no mem caching, no gzip)
server.diskcache = new cache('cache', true, false, false);

// init zipFile with same diskcache
var zipFile = require('./src/zipfile');
zipFile.diskcache = server.diskcache;

function unknownMethodHandler(req, res) {
    console.log('unkownMethodHandler method=' + req.method.toLowerCase());
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

// start database

var database = process.env.DATABASE ||
    process.argv[2] ||
    'existdb';

console.log("loading database module [" + database + "]");

// this initializes server.db
require('./src/' + database)(server);

server.db.init(function (b) {
    if (b)
        console.log("rest3d will be using database [" + database + "]");
    else {
        console.log("rest3d will not be using database [" + database + "]");
        server.db = null;
    }

    // session manager -> requires database
    session.config.db = server.db;

});


// rest3d API

server.get(/^\/rest3d\/info/, function (req, res, next) {
    var handler = new Handler(req, res, next);
    
    var params = req.url.stringAfter("info");
    while(params[0]==='/') params=params.substr(1);

    if (params)
        return handler.handleError({message:'unknown database '+params, statusCode:400});

    function cleanDb(route){
    for (var i=0;i<route.length;i++){
        
    }
    }
    cleanDb(server.router.routes["POST"]);
    cleanDb(server.router.routes["GET"]);

    function Database(name){ //Json generated for every databases detected and hooked to the rest3d platform(under ../rest3d/ domain) 
        this.name = name; // name of the database, really important because it is the name used according to the rest3d design /rest3d/[name]/...
        this.indexLogin = 0;// indexLogin : 0 -> no login needed, 1 -> optional, 2 -> required, 3-> not yet implemented
        this.picture = "";// picture used for the database. Required for the ui generation
        this.description = false;// Set the database description
        this.signin = false;//It's an url for signin to the database if needed. if array, redirection with new window. If not, iframe used

        // this is our features for rendering a personnalize interface for every databases, they are detected by <Parser_routes>
        this.upload = false;// Set whether or not the upload feature is available
        this.info = false;// Set if we can get some info from the db, no precisions for the moment : https://rest3d.fl4re.com/rest3d/db/info no working
        this.login = false;// Set if a login area or not should be handled by the viewer.
    }

    function Parser_routes(){ //parse of routes connected to our platform for checking which databases and features are available on the rest3d platform.
        this.routes = server.router.routes;
        this.object = {}; //final object resulted from the parsing
        this.name ="";
        this.parse_routes_DELETE = function(route){};
        this.parse_routes_HEAD = function(route){};
        this.parse_routes_OPTIONS = function(route){};
        this.parse_routes_PATCH = function(route){};
        this.parse_routes_PUT = function(route){};
        this.parse_routes_POST = function(route){ 
            for(var i=0;i<route.length;i++){
                if(route[i].name.split(this.name).length==2){
                    if(route[i].name.split('db').length==2&&server.db==null){
                         route.splice(i, 1); //delete db post routes because the database hasn't been detected
                    }  
                    else if(route[i].name.match('login')!==null){
                        this.database.login = true;
                    }
                    else{
                        this.database.upload = true;
                    }
                }
            }      
        }
        this.parse_routes_GET = function(route){ // I assume a database must be readable for being associated to the UI, route ==  /^\/rest3d\/[nameOfTheDatabase].*/
            for(var i=0;i<route.length;i++){
                if(route[i].hasOwnProperty("path")){
                    var tmp = route[i].path.source.split('/');
                    if(tmp[2]=="data\\"){
                        if(tmp[3].split("db").length==2&&server.db==null){
                            route.splice(i, 1);//delete db get routes because the database hasn't been detected
                        }
                        else if(tmp[3].split(".*").length==2){
                            this.name = tmp[3].split(".*").join("");
                            this.createDatabase();
                            this.object[this.name]=this.database;
                            this.parse_routes();
                        }
                    }
                }
            }
        }
        this.parse_routes = function(){//GET NOT HANDLE BC IT IS REQUIRED
            for(var method in this.routes){ 
                if(method!=='GET'){                    
                    this["parse_routes_"+method](this.routes[method]);
                }
            }
        }
        this.createDatabase = function(){
            this.database = new Database(this.name);
            switch(this.name){ //set here the REQUIRED paramaters for creating a database. We should find a way to specify those informations directly in routes/header of files
                case 'warehouse':
                    this.database.description = "The Google 3D Warehouse is a free, online repository where users can find, share, store, and collaborate on 3D models.";
                    this.database.indexLogin = 3;
                    this.database.picture = "../gui/images/warehouse.jpg";
                    this.database.signin = ["https://3dwarehouse.sketchup.com/?redirect=1"];
                    break;
                case 'db':
                    this.database.indexLogin = 0;
                    this.database.picture = "../gui/images/exist.png";
                    this.database.description = "Your cloud repository";
                    break;
                case '3dvia':
                    this.database.description = "'Whether you're building a scene and want the perfect elements to fill it or need models with intelligence for your next interactive game, save time and resources by downloading assets from 3DVIA's Content Warehouse with a combined 85,000 free user contributed and premium models available for download. You're bound to find what you're looking for.' ref http://www.3dvia.com/resources";
                    this.database.signin ="https://www.3dvia.com/join";
                    this.database.picture = "../gui/images/3dvia.png";
                    this.database.indexLogin =2;
                    break;
                case 'tmp':
                    this.database.indexLogin = 0;
                    this.database.picture="../gui/images/upload_d.png";
                    this.database.description = "This is your cloud repository, any assets manipulated over this tab is stocked in a node server's job created at your session initialization. Everything will be lost once the session expires.";
                    break;
            }
        }


        this.parse_routes_GET(server.router.routes.GET);
    }


    var result = new Parser_routes();
    handler.handleResult(result.object);
});


// static server
server.get(/^\/.*/, function (req, res, next) {
  var handler = new Handler(req,res,next);
    // parse out parameters from url
    var filename = req.url.split('\?')[0];
    var p = path.resolve(staticPath + filename);

    console.log('http get path=' + filename);

  handler.sendFile(p);
});

// clean exit
function sigterm_handler() {
    console.warn('Kaboom Baby!');
    process.exit(0);
}

process.on('SIGTERM', sigterm_handler);

// run server
server.listen(listenToPort, ip_address);
console.log('rest3d server listening on port ' + listenToPort);