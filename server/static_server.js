/*
static_server.js

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

var http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs"),
    mime = require("mime");
var port = process.argv[2] || process.env.OPENSHIFT_NODEJS_PORT || 8000;
var ip_address = process.env.OPENSHIFT_NODEJS_IP || 'localhost';
var static = path.join(process.cwd(), '../static');
 
http.createServer(function(request, response) {
 
  var uri = url.parse(request.url).pathname,
      filename = path.join(static, uri);
  
  fs.exists(filename, function(exists) {
    if(!exists) {
      response.writeHead(404, {"Content-Type": "text/plain"});
      response.write("404 Not Found\n");
      response.end();
      return;
    }
 
    if (fs.statSync(filename).isDirectory()) filename += '/index.html';
 
    fs.readFile(filename, "binary", function(err, file) {
      if(err) {        
        response.writeHead(500, {"Content-Type": "text/plain"});
        response.write(err + "\n");
        response.end();
        return;
      }
 
      response.writeHead(200, {"Content-Type": mime.lookup(filename)});
      response.write(file, "binary");
      response.end();
    });
  });
}).listen(parseInt(port, 10), ip_address);
 
console.log("Static file server ["+static+"] running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");

