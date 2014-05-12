// convert one or more files
// convert
'use strict';
module.exports = function (server) {

var UploadHandler = require('./handler');
var Collection = require('./collection');
var Path = require('path');
var formidable = require('formidable');
var FileInfo = require('./fileinfo');
var zipFile = require('./zipfile');
var uuid = require('node-uuid');
var fs = require('fs');
var rmdirSync =require('./rmdir');

server.jobManager.addJob('convert', {
  concurrency: 100, //number of concurrent jobs ran at the same time, default 50 if not specified
  work: function (params) {          //The job
      this.params = params;
      console.log(params.files);
      this.dirname = uuid.v4(); //generate random/unique repository name
      fs.mkdirSync(this.dirname); //create temporary folder for stocking assets to be converted
      fs.chmodSync(this.dirname, '777'); //set access mode R&W
      this.stderr = "error test"; //test to stock the sderr
      this.stdout = "out test"; //test to stock stdout
      this.finished = true;
    }
});
server.jobManager.on('finish', function (job, worker) {
    fs.writeFile(worker.dirname+"/stderr_"+worker.dirname, worker.stderr, function(err) { //create stderr log
    if(err) {
        console.log(err);
    } else {
        console.log("Log stderr conversion created");
    }
    }); 
    fs.writeFile(worker.dirname+"/stdout_"+worker.dirname, worker.stdout, function(err) {//create stdout log
    if(err) {
        console.log(err);
    } else {
        console.log("Log stdout conversion created");
    }
    });
    worker.params.handler.handleResult("Convert job finished");
    //rmdirSync(worker.dirname); //remove temporary directory
  });

UploadHandler.prototype.convert = function (collectionpath, assetpath) {
    var handler = this;
    var form = new formidable.IncomingForm();
    var tmpFiles = [];
    var files = [];
    var map = {}
    var counter = 1;
    var copyall = false;

    var finish = function (err, asset) {
      if (err) {
        console.log('ERROR IN CONVERT FINISH');
        counter = -1;
        handler.handleError(err);
        return;
      }
      counter -= 1;

      // // here start conversion, and then call fileInfo.upload on converted files
      // // check copyall
      
        var results = [];
        if (files.length==0){
          return handler.handleError({message:'post did not send any files', statusCode:400});
        }
        files.forEach(function (fileInfo) {
          //fileInfo.initUrls(handler.req);
          var timeout = function (db) {
            fileInfo.delete(db,function(){}); // no callback
            console.log('timeout !! ' + fileInfo.name + ' was deleted');
          }
          setTimeout(timeout, 60 * 60 * 1000, handler.db);
        });
        server.jobManager.enqueue('convert', {'files':files,'handler':handler}); //Call convert job
        
    
    };

     //form.uploadDir = FileInfo.options.tmpDir;
    form.on('fileBegin', function (name, file) {

      tmpFiles.push(file.path);
      var fileInfo = new FileInfo(file, collectionpath, assetpath);
      //fileInfo.safeName();
      map[file.path] = fileInfo;
      //files.push(fileInfo); -> this will happen later

    }).on('field', function (name, value) {
       if (name === 'copyall') {
          copyall=true;
       } else if (name === 'url') {
        // downloading file and uncompressing if needed
        // counter++; -> getting all files at once
        //                                                      no jar
        counter++; // one more result to POST
        zipFile.getAssetInfoUrl(handler, value,undefined, function(error,result) {
          if (error)
            handler.handleError(error);
          else {
            files.push(result);
            finish(undefined);
          }
        });
        // zipFile.unzipUrl(handler, "", "", value, null, function(error,result) {
        //   if (error)
        //     handler.handleError(error);
        //   else {
        //     // turn {asset} into fileInfos
        //     var getFileInfos = function (results) {

        //       if (results.fileInfo) 
        //         files.push(results.fileInfo);

        //       if (results.children) {
        //         for (var i = 0; i < results.children.length; i++) {
        //           getFileInfos(results.children[i]);
        //         }
        //       }
        //     };
        //     getFileInfos(result);
        //     finish(undefined);
        //   }
        // });
      } 
    }).on('file', function (name, file) {

      // if (file.size ===0) {
      //   // form did not send a valid file
      //   return;
      // }
      // var fileInfo = map[file.path];
      // fileInfo.size = file.size;
      // fileInfo.type = Mime.lookup(fileInfo.name);


      // counter++; // so that 'end' does not finish
      // //                                                              no jar
      // zipFile.getAssetInfoFile(handler, collectionpath, assetpath, fileInfo.name, fileInfo.path, null, function(error,result) {
      //   if (error)
      //     finish(error);
      //   else {
      //     // turn {asset} into fileInfos
      //     var getFileInfos = function (results) {

      //       if (results.fileInfo && results.fileInfo.asset) 
      //         files.push(results.fileInfo);

      //       if (results.children) {
      //         for (var i = 0; i < results.children.length; i++) {
      //           getFileInfos(results.children[i]);
      //         }
      //       }
      //     };
      //     getFileInfos(result);
      //     // finish(undefined);
      //   }
      // });

    }).on('aborted', function () {
      tmpFiles.forEach(function (file) {
        fs.unlinkSync(file);
      });
    }).on('error', function (e) {
      finish({message:'NONO, Could not parse form', statusCode:400});
    }).on('progress', function (bytesReceived, bytesExpected) {
      if (bytesReceived > FileInfo.options.maxPostSize) {
        handler.req.connection.destroy();
      }
    }).on('end',function(){
      console.log("form ended")
    });
    form.parse(handler.req);
  };


}