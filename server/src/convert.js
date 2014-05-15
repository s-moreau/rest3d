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
var childProcess = require('child_process');
var walk = require('walk');

server.jobManager.addJob('convert', {
  concurrency: 100, //number of concurrent jobs ran at the same time, default 50 if not specified
  work: function (params) {          //The job
      this.params = params;
      this.dirname = this.id; 
      this.stderr = "", this.stdout = "", this.errorCode = undefined, this.result=[], this.timeout = 1000*60*5;
      this.writeLogs = function(){
         fs.writeFile(this.dirname+"/stderr_"+this.dirname, this.stderr+".log", function(err) { //create stderr log
          if(err) {
              console.log(err);
          } else {
              console.log("Log stderr conversion created");
          }
          }); 
          fs.writeFile(this.dirname+"/stdout_"+this.dirname+".log", this.stdout, function(err) {//create stdout log
          if(err) {
              console.log(err);
          } else {
              console.log("Log stdout conversion created");
          }
          });
      }
      fs.mkdirSync(this.dirname); //create temporary folder for stocking assets to be converted
      fs.chmodSync(this.dirname, '777'); //set access mode R&W
      var stock = this;

      // CONVERT callback
      var callbackConvert = function(err,files){
          if(err){
            stock.stderr += err + '\n';
          }
          else{
            files.forEach(function(fileInfo){
              if(fileInfo.type == "model/collada+xml"){
                var cmd = " ls & "+server.collada2gltf + " -p -f \"" + fileInfo.name + "\" ";
                console.log( "--> exec "+cmd);
                stock.stdout += "--> exec "+cmd+"\n";
                var ls = childProcess.exec(cmd, {cwd: "./"+fileInfo.path.stringBefore(fileInfo.name)} ,function (error, stdout, stderr) {
                  console.log("Where we convert? "+stdout);
                  if (error) {
                    console.log("error in convert: "+error.stack);
                    stock.stderr += error.stack + '\n';
                    stock.stderr += error.code + '\n';
                    stock.stderr += error.signal + '\n';
                  }
                });
                ls.on('exit', function (code, output) {
                  stock.errorCode = code;
                  console.log('Child process exited with exit code ' + code + " " + output);
                  stock.stdout += 'Child process exited with exit code ' + code+'\n';
                  if (code !== 0) {
                      stock.stderr += 'Child process exited with exit code '+code+'\n';
                  }
                  else{
                    var options = {
                      listeners: {
                        file: function (root, fileStats, next) {
                          var item = {
                            name: fileStats.name,
                            path: Path.join(root,fileStats.name)
                          };
                          var fileInfoBis = new FileInfo(item, stock.params.collectionpath, stock.params.assetpath);
                          fileInfoBis.upload(stock.params.handler, function(err,file){
                            if(err){
                              stock.stderr += "upload "+file.name+" "+err+'\n';
                              console.log("upload "+file.name+" "+err);
                            }
                            else{
                              stock.result.push(file);
                              stock.stdout += "uploaded "+file.name+'\n';
                              console.log("uploaded "+file.name);
                            }
                          });
                          next();
                          }
                        , errors: function (root, nodeStatsArray, next) {
                            next();
                          }
                      }
                    };
                    walk.walkSync("./"+fileInfo.path.stringBefore(fileInfo.name), options);
                  }
                  
                })
              }
              else if(stock.params.copyall){
                fileInfo.upload(stock.params.handler,function(err,file){
                  if(err){
                    stock.stderr += "upload "+file.name+" "+err+'\n';
                    console.log("upload "+file.name+" "+err);
                  }
                  else{
                    stock.result.push(file);
                    stock.stdout += "uploaded "+file.name+'\n';
                    console.log("uploaded "+file.name);
                  }
                })
              }
            });
          }
        }

      // URL 
      if(params.url){
        zipFile.unzipUrl(params.handler,params.collectionpath,params.assetpath,params.url,undefined,this.dirname,callbackConvert)
      }

      // FILE
      if(params.file){  
        zipFile.unzipFile(params.handler,params.collectionpath, params.assetpath,params.file,this.dirname,callbackConvert)
      }

      stock.params.handler.handleResult({"job id":stock.dirname});
      setTimeout(function(){stock.finished = true;},stock.timeout);
    }
});
server.jobManager.on('finish', function (job, worker) {
    console.log("job "+worker.id+" finished");
    rmdirSync(worker.dirname); //remove temporary directory
  });

UploadHandler.prototype.convert = function (collectionpath, assetpath) {
    var handler = this;
    var form = new formidable.IncomingForm();
    var tmpFiles = [];
    var files = [];
    var map = {}
    var copyall = false;
    var params = {};
    params.handler = handler, params.collectionpath = collectionpath, params.assetpath = assetpath;

    form.on('fileBegin', function (name, file) {
      tmpFiles.push(file.path);
      var fileInfo = new FileInfo(file, collectionpath, assetpath);
      map[file.path] = fileInfo;

    }).on('field', function (name, value) {
       if (name === 'copyall') { 
          copyall=true;
       } 
       else if (name === 'url') {                                            
        params.url = value, params.copyall =copyall;
        server.jobManager.enqueue('convert', params);
      } 
    }).on('file', function (name, file) {
      params.file = file;
      server.jobManager.enqueue('convert', params);
    }).on('aborted', function () {
      tmpFiles.forEach(function (file) {
        fs.unlinkSync(file);
      });
    }).on('error', function (e) {
      finish({message:'Could not parse form', statusCode:400});
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