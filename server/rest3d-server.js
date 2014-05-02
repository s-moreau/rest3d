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
var ncp = require('ncp').ncp;
var walk = require('walk');
var path = require('path');
var cache = require('./src/diskcache');

var request = require('request');

// get content from zip files
var zip = require("zip");

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

// include routes
require('./src/warehouse')(server);
require('./src/3dvia')(server);
require('./src/upload')(server);


// create diskcache (no mem caching, no gzip)
server.diskcache = new cache('cache', true, false, false);

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

    // session mnager -> requires database
    session.config.db = server.db;

});

// rest3d API

server.get(/^\/rest3d\/info/, function (req, res, next) {
    var handler = new Handler(req, res, next);
    
    /// if sign
    function database(name,indexLogin,pictureTmp){
        this.name = name;
        this.login = indexLogin;/// indexLogin : 0 -> no login needed, 1 -> optional, 2 -> required, 3-> not yet implemented
        this.picture = pictureTmp;
        this.description;
        this.signin;///It's an url. if array, redirection with new window. If not, iframe used
        this.upload;/// Set whether or not the upload feature is available
        }
        var result = {};
        result["tmp"] = new database("tmp",0,"../gui/images/upload_d.png")
        result["tmp"].description = "This is your cloud repository, any assets manipulated over this tab is stocked in a node server's job created at your session initialization. Everything will be lost once the session expires.";
        result["tmp"].signin = "";
        result["tmp"].upload = true;
     if(server.db) {
        result["db"] = new database("db",0,"../gui/images/exist.png");
        result["db"].description = "Your cloud repository";
        result["db"].signin = "";
        result["db"].upload = true;
    }
    if(server.hasOwnProperty("dvia")){
        result["dvia"] = new database("3dvia",2,"../gui/images/3dvia.png");
        result["dvia"].description = "'Whether you're building a scene and want the perfect elements to fill it or need models with intelligence for your next interactive game, save time and resources by downloading assets from 3DVIA's Content Warehouse with a combined 85,000 free user contributed and premium models available for download. You're bound to find what you're looking for.' ref http://www.3dvia.com/resources";
        result["dvia"].signin ="https://www.3dvia.com/join";
        result["dvia"].upload = false;
    }
    if(server.hasOwnProperty("warehouse")){
        result["warehouse"] = new database("warehouse",3,"../gui/images/warehouse.jpg");
        result["warehouse"].description = "'The Trimble 3D Warehouse (formerly Google 3D Warehouse) is an accompanying website for SketchUp where modelers can upload, download and share three-dimensional models.' ref http://en.wikipedia.org/wiki/Trimble_3D_Warehouse";
        result["warehouse"].signin =["https://3dwarehouse.sketchup.com/?redirect=1"];
        result["warehouse"].upload = false;
    }
    // if(get.prototype)
    // handler.handleResult("database not connected")
    handler.handleResult(result);
});


// convert

server.post(/^\/rest3d\/convert.*/, function (req, res, next) {
    console.log('post -> convert');

    var form = new formidable.IncomingForm(),
        url = '',
        params = {};

    var handler = new Handler(req, res, next);


    form.on('field', function (name, data) {
        params[name] = data;
    }).on('error', function (e) {
        handler.handleError(e);
    }).on('end', function () { //
        console.log(params);
        console.log('now converting collada');
        if (!params.name && !params.path || !params.name.toLowerCase().endsWith('dae')) {
            h.handleError({
                error: 'invalid file ' + params.name + ' in convert'
            });
            return;
        }
        if (params.hasOwnProperty("path")) {
            // new API, path specified in the params of the request in order to convert the right file.
            var output_dir = params.path.split('/');
            output_dir[output_dir.length - 2] = output_dir[output_dir.length - 2] + '_gltf';
            output_dir[output_dir.length - 1] = output_dir[output_dir.length - 1].replace('.dae', '.json').replace('.DAE', '.json');
            var output_path = output_dir[0];
            for (var i = 1; i < output_dir.length; i++) {
                output_path = output_path + "/" + output_dir[i];
                var list = fs.readdirSync("upload")
                list.forEach(function (name) {
                    console.log(name);
                });
                console.log(output_path, fs.existsSync(output_path + "/"));
                if (!fs.existsSync(output_path) && i !== output_dir.length - 1) {
                    console.log("create folder " + output_path)
                    fs.mkdirSync(output_path);
                }
            }
            console.log(collada2gltf + " -p -f \"" + params.path + "\" -o \"" + output_path + "\"");
            var cmd = collada2gltf + " -p -f \"" + params.path + "\" -o \"" + output_path + "\"";
            var input_dir = params.path.replace(/[^\/]*$/, '');
            output_dir = output_path.replace(/[^\/]*$/, '');
        }
        else {
            // let's considered the model is stocked under rest3d/upload/ repository in case any path isn't specified
            // the conversion will create a folder for stocking the gltf file
            // CODE NOT TESTED, maybe get some conflicts for copying all textures to the gltf folder.
            console.log("PART NOT TESTED YET")
            var output_dir = params.name.split('\.')[0] + '_gltf';
            var output_file = params.name.replace('.dae', '.json');
            var output_path = 'upload/' + output_dir + '/' + output_file;
            var cmd = collada2gltf + " -p -f \"upload/" + params.name + "\" -o \"" + output_path + "\"";
            var input_dir = "upload/";
            output_dir = output_path.replace(/[^\/]*$/, '');
        }
        console.log('exec ' + cmd);
        // todo -> manage progress !!!
        var outputC2J;
        var codeC2J;
        // todo -> manage progress !!!
        var ls = childProcess.exec(cmd, function (error, stdout, stderr) {
            if (error) {
                console.log(error.stack);
                //console.log('Error code: '+error.code);
                //console.log('Signal received: '+error.signal);

                handler.handleError({
                    "code": error.code,
                    "message": stderr
                });

            }
            console.log('Child Process STDOUT: ' + stdout);
            console.log('Child Process STDERR: ' + stderr);
        });
        ls.on('exit', function (code, output) {
            console.log('Child process exited with exit code ' + code);
            if (code !== 0) {
                handler.handleError({
                    errorCode: code,
                    message: 'Child process exited with exit code '
                });
                return;
            }
            codeC2J = code;
            outputC2J = output;
            console.log('Exit code:', code);
            console.log('Program output:', output);
            // // hack, copy all images in the output_dir, so the viewer will work
            var list = fs.readdirSync(input_dir);
            list.forEach(function (name) {
                var ext = name.match(/\.[^.]+$/);
                console.log(name, ext);
                if (ext !== null) {
                    if (ext[0] !== '.json' && ext[0] !== '.dae') {
                        copyFileSync(input_dir + name, output_dir + name);
                        console.log(input_dir + name + '  TO  ' + output_dir + name);
                    }
                }
                else {
                    console.log("Folder detected");
                    ncp(input_dir + name, output_dir + name, function (err) {
                        if (err) {
                            return console.error(err);
                        }
                        console.log(input_dir + name + '  TO  ' + output_dir + name);
                    });
                }
            });
            // end hack
            setTimeout(function () {
                var files = [];

                // Walker options
                var walker = walk.walk(output_dir, {
                    followLinks: false
                });

                walker.on('file', function (root, stat, next) {
                    // Add this file to the list of files
                    var path = root + stat.name;
                    files.push({
                        name: stat.name,
                        path: path.split("//").join("/"),
                        size: stat.size
                    });
                    next();
                });

                walker.on('end', function () {
                    console.log(files);
                    var timeout = function (output_dir) {
                        rmdirSync(output_dir);
                        console.log('timeout !! ' + output_dir + ' was deleted');
                    }
                    setTimeout(function () {
                        timeout()
                    }, 5 * 60 * 1000);
                    handler.handleResult({
                        files: files,
                        code: codeC2J,
                        output: outputC2J
                    });
                });
            }, 2500);
        });
    });
    form.parse(req);
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