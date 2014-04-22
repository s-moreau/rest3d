/*
3dvia.js

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
  server.dvia = true;
  var request = require('request');
  var cheerio = require('cheerio');
  var toJSON = require('./tojson');
  var sendfile = require('./sendfile');

  var handler = require('./handler');
  var zipFile = require('./zipfile')(server);
  var formidable = require('formidable');
  var Cookies = require('cookies');
  var FileInfo = require('./fileinfo');

  var cookies = {};

  var tdviahandler = function(req,res,next){
    handler.call(this,req,res,next);
  }
  tdviahandler.prototype = Object.create(handler.prototype);

  // do not use prototype, login is private to 3dvia
  tdviahandler.prototype.login = function(){
    console.log ("3dvia login requested");
    var handler = this;

    var form = new formidable.IncomingForm();
    var sid = null;
    if (!handler.req.session || !handler.req.session.sid)
    {
      return handler.handleError('3dvia login -> could not find sid !!!');
    } else
      sid = handler.req.session.sid;

    form.parse(this.req, function(err, args) {
      if (err) return handler.handleError(err);
      if (!args.user || args.user==='' ) {
        return handler.handleError('3dvia login -> need non empty user');
      };
      console.log('login to 3dvia with user='+args.user+" and passwd="+args.passwd);
      // get cookies
      var j = request.jar();
      request.post({ // All collections
          url: "https://www.3dvia.com/login",
          jar:j,
          form: { 'signin[user_id]':args.user,
                  'signin[user_pwd]':args.passwd },
          followAllRedirects: true
        },function(err, resp, body){
          console.log('got response from https://www.3dvia.com/login');
          if (err)
            return handler.handleError(err);
          
          // Check that we have a PHPSESSION

          var cookies = j._jar.store.idx;

          // add redirect cookies - is this a request bug ??
          if (resp.headers && resp.headers['set-cookie'])
            for (var i=0; i<resp.headers['set-cookie'].length;i++){
              var cookie = resp.headers['set-cookie'][i];
              j.setCookie(cookie, resp.headers.location, {ignoreError: true});
            }
          var PHPSESSID = null;
          if (cookies['www.3dvia.com'] && cookies['www.3dvia.com']['/'])
            PHPSESSID = cookies['www.3dvia.com']['/'].PHPSESSID;
          var TDVIA_SESSION = null;
          if (cookies['3dvia.com'] && cookies['3dvia.com']['/'])
            TDVIA_SESSION = cookies['3dvia.com']['/']['3DVIA_SESSION'];

          console.log('3DVIA session='+toJSON(TDVIA_SESSION));

          if (TDVIA_SESSION) {
            // need to store session for this user
            var data = handler.req.session;
            data['3dvia']=j;
            server.sessionManager.save(sid,data, function(err,data) {
              if (err) return handler.handleError(err);
              console.log('stored 3DVIA cookies for session='+sid);
              return handler.handleResult('connected to 3dvia as user '+args.user);
            })
          }
          else
            return handler.handleError('failed to authenticate as user '+args.user);
        }
      );
          
    });

  };

  
  var parseall = function(body) {
      var result={};
      
      result.assets = [];
      result.success = true;
      result.count = body.count;
      result.total = body.total;

      var $ = cheerio.load(body.content);

      result.start = 0;
      result.end = 0;
      result.total = 0;

      var search = $('a');
      //result.loaded = true;
      result.type = 'collection'
      $(search).each(function(i, link){
        if (link.attribs.href.startsWith('models'))
        {

          var url = link.attribs.href;
          var uid=url.split('/')[1];


          var file_size = link.parent.parent.children[9].children[0].data;
          var format = link.parent.parent.children[7].children[0].data;
          var name = $(link).text().replace(/^\s+|\s+$/g, "");
          //e.g Format: obj
          //var price = $(data.children[23]).text();
          //e.g "Price: 50 credits"
          var creator = link.parent.parent.children[11].children[0].data;
          var date =link.parent.parent.children[13].children[0].data;


          //http://www.3dvia.com/3dsearch/Content/8A066E8092A4B688.3dxml/ zip
          // 'http://www.3dvia.com/download.php?media_id='+item.uid+'&file=/3dsearch/Content/'+item.uid+'.zip';

          var item={};
          /*
        
        <a href="models/4FC6B34557697B4D/modern-dining-set-with-red-chairs">
        <img src="http://wwc.3dvia.com/3dsearch/Content/4FC6B34557697B4D_C2.jpg?ts=1386616421909" alt="Modern Dining Set with Red Chairs uploaded by mgbaron" class="result-thumbnail" />
        Modern Dining Set with Red Chairs
        </a>
    
        </td>
        <td>Model</td>
        <td>kmz</td>
        <td class="nowrapping">998 KB</td>
        <td>mgbaron</td>
        <td class="nowrapping">Aug 12, 2008</td>
        </tr>
              
        */
          item.name = name;
          //item.description = "";
          item.format = format;
          //item.price = price;
          item.iconUri = "http://wwc.3dvia.com/3dsearch/Content/"+uid+"_C3.jpg"
          item.largeIconUri = "http://wwc.3dvia.com/3dsearch/Content/"+uid+"L2.jpg";
          item.uri = 'http://www.3dvia.com/'+url;
          item.type="model"
          item.assets=null; // this element has no assets
          item.id=uid;
          item.assets=null;
          //http://www.3dvia.com/download.php?media_id=B3C79CA9BB8D9FB1&ext=zip&file=/3dsearch/Content/B3C79CA9BB8D9FB1.zip

          item.assetUri = "http://www.3dvia.com/download.php?media_id="+uid+"&ext=zip&file=/3dsearch/Content/"+uid+".zip";
          item.creator = "";
          item.license = "N/A";;
          item.size = file_size;

          result.assets.push(item);
          item.created = date;
          //item.modified = "";
          //item.parents = "";
          //item.rating =  "";
          //item.previewUri =


//http://www.3dvia.com/download.php?media_id=8A066E8092A4B688&file=/3dsearch/Content/8A066E8092A4B688.zip
        } 
      });
      return result;
    };

  server.post(/^\/rest3d\/3dvia\/login/, function(req,res, next){
    var tdvia = new tdviahandler(req, res, next);

    tdvia.login();

  });
 
  server.get(/^\/rest3d\/3dvia.*/,function(req, res, next) {
    
    var tdvia = new tdviahandler(req,res,next);

    var uid = req.url.split("/3dvia/")[1];
    console.log('[3dvia]' + uid);

    var jar = null;

    if (req.session && req.session['3dvia']) {
      jar = req.session['3dvia'];
      if (!jar || !jar._jar.store.idx || !jar._jar.store.idx['3dvia.com']['/']['3DVIA_SESSION'])
        return tdvia.handleError("need to login first (no jar)");

      // just browsing
      if (!uid || uid==='') {
        // this returns a json with all collections
        var start = 1;
        var end = 25;
        request.post({ // All collections 
            //url: "http://www.3dvia.com/warehouse/all",
            url: "http://www.3dvia.com/search/ContentPicker.php",
            jar: jar,
            form: {
              action:'files',
              query:null,
              start:start,
              count:end,
              page:'file',
              'types[]':null,
              groupPrivacy:null
            }
          },function(err, resp, body){
            if (err)
              return tdvia.handleError(err);
            var o = JSON.parse(body);
            if (!o || o.status === undefined)
              return tdvia.handleError("got no response from 3dvia")
            if (o.status === undefined || o.status !== 0)
              return tdvia.handleError({message: body.message, name:body.status});
            var result=parseall(o.result);
            result.start = start;
            result.end = end;
            return tdvia.handleResult(result);
        });

      } else if (uid.startsWith('data/')) {
        var id = uid.split('data/')[1];
 
        if (id) {
          var url = "http://www.3dvia.com/3dsearch/FileInfo?FileId="+id+"&_format=json";

          request({ 
            url: url,
            jar: jar
            }, function(err, resp, body){
              if (err) return tdvia.handleError(err);
              var data =JSON.parse(body);
              if (!data.returnresponse || !data.returnresponse.item || data.returnresponse.count<1 )
                return tdvia.handleError('no response from 3dvia FileInfo assetID='+id);
              if (data.returnresponse.code !== 200 )
                return tdvia.handleError({name:data.returnresponse.code,message:'error code from 3dvia FileInfo assetID='+id});

              var info = data.returnresponse.item[0];
              var format = info.Format;

              var url = "http://www.3dvia.com/download.php?media_id="+id+"&file=/3dsearch/Content/"+id+"."+format;
              //var url= "http://www.3dvia.com/3dsearch/Content/"+uid+".zip";

              //proxie with cache
              
              var asset = zipFile.upload(uid,url,jar, FileInfo.options.uploadDir, function(error, result){
                if (error)
                  tdvia.handleError(error);
                else {

                  tdvia.res.setHeader('Content-Disposition', 'inline; filename='+result.name);
                  sendfile(tdvia,result.filename);
                  
                }
              });
              
              // proxie no cache
              //tdvia.req.pipe(request({url:url, jar:jar})).pipe(tdvia.res);

              //tdvia.res.writeHead(302, {'Location': url});
              //tdvia.res.end();
              
              });

        } else {
          error={code:"API call error",message:"transfering a collection is not supported"};
          tdvia.handleError(error);
        }
        // return the asset 
      } else if (uid.startsWith('search/')) {
        var search = uid.split('search/')[1];
        var query = null;
        console.log ('search tdvia for ['+search+']')
        // this returns a json with all collections
        var start = 1;
        var end = 25;
        request.post({ // All collections 
            //url: "http://www.3dvia.com/warehouse/all",
            url: "http://www.3dvia.com/search/ContentPicker.php",
            jar: jar,
            form: {
              action:'files',
              query:query,
              start:start,
              count:end,
              page:'file',
              'types[]':null,
              groupPrivacy:null
            }
          },function(err, resp, body){
            if (err)
              return tdvia.handleError(err);
            var o = JSON.parse(body);
            if (!o || o.status === undefined)
              return tdvia.handleError("got no response from 3dvia")
            if (o.status === undefined || o.status !== 0)
              return tdvia.handleError({message: body.message, name:body.status});
            var result=parseall(o.result);
            result.start = start;
            result.end = end;
            return tdvia.handleResult(result);
        });
      } else if (uid.startsWith('info/')) {

        var id = uid.split('info/')[1];
 
        if (id) {

          console.log ('get 3dvia model info ID =['+id+']')
          var url = "http://www.3dvia.com/3dsearch/FileInfo?FileId="+id+"&_format=json";

          request({ 
            url: url,
            jar: jar
            }, function(err, resp, body){
              if (err) return tdvia.handleError(err);
              var data =JSON.parse(body);
              if (!data.returnresponse || !data.returnresponse.item || data.returnresponse.count<1 )
                return tdvia.handleError('no response from 3dvia FileInfo '+id);
              if (data.returnresponse.code !== 200 )
                return tdvia.handleError({name:data.returnresponse.code,message:'error code from 3dvia FileInfo '+uid});

              return tdvia.handleResult(data.returnresponse.item[0]);
          });
        } else
          return tdcia.handleError("/3dvia/info invalid id="+id);
        
     
      } else if (uid.startsWith('copy/')) {
        var id = uid.split('copy/')[1];
        var url = "http://www.3dvia.com/3dsearch/FileInfo?FileId="+id+"&_format=json";
        console.log ('copy 3dvia asset  ID =['+id+']');
        request({ 
          url: url,
          jar: jar
          }, function(err, resp, body){
            if (err) return tdvia.handleError(err);
            var data =JSON.parse(body);
            if (!data.returnresponse || !data.returnresponse.item || data.returnresponse.count<1 )
              return tdvia.handleError('no response from 3dvia fileInfo, assetID='+id);
            if (data.returnresponse.code !== 200 )
              return tdvia.handleError({name:data.returnresponse.code,message:'error code from 3dvia FileInfo, assetID='+id});

            var info = data.returnresponse.item[0];
            var format = info.Format;

            var url = "http://www.3dvia.com/download.php?media_id="+id+"&file=/3dsearch/Content/"+id+"."+format;

            // note: this is using diskcache
            var asset = zipFile.unzip(uid,url,jar, FileInfo.options.uploadDir, function(error, result){
              if (error)
                tdvia.handleError(error);
              else {
                for (var file in results) 
                   FileInfo.upload(handler,file.path);
                tdvia.handleResult(result);
              }
            });
        });

      } else { // request information about asset 
        console.log ('get 3dvia asset  ID =['+uid+']');
        
        var url = "http://www.3dvia.com/3dsearch/FileInfo?FileId="+uid+"&_format=json";

        request({ 
          url: url,
          jar: jar
          }, function(err, resp, body){
            if (err) return tdvia.handleError(err);
            var data =JSON.parse(body);
            if (!data.returnresponse || !data.returnresponse.item || data.returnresponse.count<1 )
              return tdvia.handleError('no response from 3dvia FileInfo assetID='+id);
            if (data.returnresponse.code !== 200 )
              return tdvia.handleError({name:data.returnresponse.code,message:'error code from 3dvia FileInfo assetID='+uid});

            var info = data.returnresponse.item[0];
            var format = info.Format;

            var url = "http://www.3dvia.com/download.php?media_id="+uid+"&file=/3dsearch/Content/"+uid+"."+format;
            //var url= "http://www.3dvia.com/3dsearch/Content/"+uid+".zip";

            // note: this is using diskcache
            var asset = zipFile.getAssetInfo(uid,url,jar, function(error, result){
              if (error)
                tdvia.handleError(error);
              else
                tdvia.handleResult(result);
            });
        });
       
      }
    } else
    return tdvia.handleError("need to login first (no 3dvia session)");
  });
};

