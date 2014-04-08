/*
basex.js

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

module.exports = function (server) {

  var basex = server.db = require('./basexdriver');
  var sendFile = require('./sendfile');
  var restify = require('restify')

  server.get(/^\/rest3d\/fl4re\/info/,function(req, res, next) {
  
    console.log('[rest3d]'+req.url);
        res.writeHead(200, {"Content-Type": "text/ascii"});  

        if (basex.session) {
          basex.session.execute("info", function(err, r) {
          if (err)
          {
            console.log('basex INFO error'+err);
          } else {    
            res.write(r.result);
            res.end();
          } 
        })
        } else // basex is not running
        {
          res.write("Database NOT running \nusing read only file system instead");
          res.end();
        }
      
    return next();
  });


  server.put(/^\/rest3d\/fl4re\/assets.*/,function(req, res, next) {
    var asset = req.url.split('assets/')[1];
    var h = new handler(req, res, next)
    // need asset uri !
    if (asset === undefined || asset == null || asset === '')
    {
        res.writeHead(400);
        res.write('put need asset uri');
        res.end();
        return next();
    }

    // read body using formidable
   
    var form = new formidable.IncomingForm();
    form.on('error', function(error) { // I thought this would handle the upload error
        h.handleError(error);
    });

 
    form.parse(req, function(err, fields, files) {
    if (err) {
      h.handleError(error);
    }

    // will execute when form is parsed
    console.log('put asset='+asset)
    console.log('body=',req.body)

    rmdirSync('tmp');
    fs.mkdirSync('tmp');

    var zipfile = fs.createWriteStream('tmp/zip.zip');

    var daefilename = '';


    zipfile.on('close', function () {

      zipfile = fs.createReadStream('tmp/zip.zip')
      
      var data = fs.readFileSync('tmp/zip.zip')
      try {
      //fs.open("tmp/zip.zip", "r", "0666", function(err, fd) {
        //  var reader = zip.Reader(fd);

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
          return next();
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
        
        console.log('pushing converted files to basex')

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

        var query=basex.session.query(xql);

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
              basex.store(asset,'models/'+filename);
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
                var query=basex.session.query(xql);
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
              basex.store(asset,'images/'+filename);
          
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
              var query=basex.session.query(xql);
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

        res.writeHead(200);
        res.write(output);
        res.end();

        
        return next();
               });
      }
    });
    request.get(req.body).pipe(zipfile); 
  });
});

server.get(/^\/rest3d\/fl4re\/assets.*/,function(req, res, next) {
  

  var asset = req.url.split("/assets/")[1];
  //if (asset !== undefined) asset = asset.toLowerCase()
  console.log('[assets] =['+asset+']');

  if (asset === undefined || asset=='') {
    console.log('get assets');

    if (basex.session) {
      var query='<query xmlns="http://basex.org/rest"><text><![CDATA['+
              'declare option output:method "json";'+
              'doc("assets/assets.xml")'+
              ']]></text></query>';

      basex.post('/assets',query,function(err,res2){
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
    } else { // basex not running, return a directory listing
      res.writeHead(404);
      res.write('basex not runing - TODO: return directory listing');
      res.end();
      return next();
    }


  } else
  {
    // see if we have a cache hit
      var redirect = '/rest/assets/'+asset;
      
      server.diskcache.hit(redirect,function(err,entry){
        
        if (entry != null) 
        {
          console.log('disk cache HIT!');
          res.setHeader('Content-Type', entry.headers['content-type']);
          console.log('set content-type to ['+entry.headers['content-type']+']')
        sendFile(req,res,entry.filename);
        return next();
        }
        // not in the cache - query basex for asset

        if (basex.session) {

          // Using Socket interface to baseX
          var query_doc=basex.session.query("doc(\"assets/"+asset+"\")");
          var query_doc_type=basex.session.query("db:content-type('assets','"+asset+"')");
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
              
                // node_basex soket i/o does not work for binary files
                // this may have been fixed now
                // but for the time being - use the rest http API
                basex.get(redirect,function(err,res2){
                  if (err)
                  {
                  res.end(err);
                  console.log('err'+err)
                  return next(404);
                  } else
                  server.diskcache.store(redirect,res2,function(err,entry){
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
              }

          } else 
          {
            console.log('error 404!')
            console.log(err);
            return next(new restify.ResourceNotFoundError(err));

          }
        });
        } else { // Database is not running, so get from static filesystem directly 
        res.writeHead(404)
        res.write("Database is not running, TODO - get files from filesystem")
        res.end()
        return next();
        }

      });

    }
  
  });
};
