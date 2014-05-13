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

  // console.log(collada2gltf + " -p -f \"" + params.path + "\" -o \"" + output_path + "\"");
  //           var cmd = collada2gltf + " -p -f \"" + params.path + "\" -o \"" + output_path + "\"";
  //           var input_dir = params.path.replace(/[^\/]*$/, '');
  //           output_dir = output_path.replace(/[^\/]*$/, '');
  //       }
  //       else {
  //           // let's considered the model is stocked under rest3d/upload/ repository in case any path isn't specified
  //           // the conversion will create a folder for stocking the gltf file
  //           // CODE NOT TESTED, maybe get some conflicts for copying all textures to the gltf folder.
  //           console.log("PART NOT TESTED YET")
  //           var output_dir = params.name.split('\.')[0] + '_gltf';
  //           var output_file = params.name.replace('.dae', '.json');
  //           var output_path = 'upload/' + output_dir + '/' + output_file;
  //           var cmd = collada2gltf + " -p -f \"upload/" + params.name + "\" -o \"" + output_path + "\"";
  //           var input_dir = "upload/";
  //           output_dir = output_path.replace(/[^\/]*$/, '');
  //       }
  //       console.log('exec ' + cmd);
  //       // todo -> manage progress !!!
  //       var outputC2J;
  //       var codeC2J;
  //       // todo -> manage progress !!!
  //       var ls = childProcess.exec(cmd, function (error, stdout, stderr) {
  //           if (error) {
  //               console.log(error.stack);
  //               //console.log('Error code: '+error.code);
  //               //console.log('Signal received: '+error.signal);

  //               handler.handleError({
  //                   "code": error.code,
  //                   "message": stderr
  //               });

  //           }
  //           console.log('Child Process STDOUT: ' + stdout);
  //           console.log('Child Process STDERR: ' + stderr);
  //       });
  //       ls.on('exit', function (code, output) {
  //           console.log('Child process exited with exit code ' + code);
  //           if (code !== 0) {
  //               handler.handleError({
  //                   errorCode: code,
  //                   message: 'Child process exited with exit code '
  //               });
  //               return;
  //           }
  //           codeC2J = code;
  //           outputC2J = output;
  //           console.log('Exit code:', code);
  //           console.log('Program output:', output);
  //           // // hack, copy all images in the output_dir, so the viewer will work
  //           var list = fs.readdirSync(input_dir);
  //           list.forEach(function (name) {
  //               var ext = name.match(/\.[^.]+$/);
  //               console.log(name, ext);
  //               if (ext !== null) {
  //                   if (ext[0] !== '.json' && ext[0] !== '.dae') {
  //                       copyFileSync(input_dir + name, output_dir + name);
  //                       console.log(input_dir + name + '  TO  ' + output_dir + name);
  //                   }
  //               }
  //               else {
  //                   console.log("Folder detected");
  //                   ncp(input_dir + name, output_dir + name, function (err) {
  //                       if (err) {
  //                           return console.error(err);
  //                       }
  //                       console.log(input_dir + name + '  TO  ' + output_dir + name);
  //                   });
  //               }
  //           });


server.jobManager.addJob('convert', {
  concurrency: 100, //number of concurrent jobs ran at the same time, default 50 if not specified
  work: function (params) {          //The job
      this.params = params;
      this.dirname = uuid.v4(); //generate random/unique repository name
      this.stderr = "", this.stdout = "";
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
      zipFile.unzipUrl(params.handler,params.collectionpath,params.assetpath,params.url,undefined,this.dirname,function(err,files){
        if(err){
          stock.stderr += err + '\n';
        }
        else{
          files.forEach(function(fileInfo){
            if(fileInfo.type == "model/collada+xml"){
              var output_path = fileInfo.path.stringBefore('/'+fileInfo.name);
              var origin = fs.readdirSync(output_path);
              var cmd = server.collada2gltf + " -p -f \"" + fileInfo.path + "\" -o \"" + output_path + "\"";
              console.log( "--> exec "+cmd);
              stock.stdout += "--> exec "+cmd+"\n";
              var ls = childProcess.exec(cmd, function (error, stdout, stderr) {
                if (error) {
                  console.log("error in convert: "+error.stack);
                  stock.stderr += error.stack + '\n';
                  stock.stderr += error.code + '\n';
                  stock.stderr += error.signal + '\n';
                }
                
              });
              ls.on('exit', function (code, output) {
                console.log('Child process exited with exit code ' + code +" "+output);
                stock.stdout += 'Child process exited with exit code ' + code+'\n';
                if (code !== 0) {
                    stock.stderr += 'Child process exited with exit code '+code+'\n';
                }
                  var result = [];
                  var over = fs.readdirSync(output_path);
                  for(var i=0;i<over.length;i++){
                    for(var j=0;j<origin.length;j++){
                      if(over[i].name==origin[j].name){
                        over.splice(i, 1);
                      }
                    }
                  }
                  console.log(over)
                  over.forEach(function(file){
                    var fileInfoOver = new FileInfo({name:file,path:output_path+'/'+name},stock.params.collectionpath,stock.params.assetpath);
                    fileInfoOver.upload(stock.params.hander,function(err,file){
                      if(err){
                        stock.stderr += err+'\n';
                      }
                      else{
                        result.push(file);
                        stock.stdout += "uploaded "+file+'\n';
                      }
                    })
                  })
              })
            }
            if(stock.params.copyall){
              fileInfo.upload(stock.params.hander,function(err,file){
                if(err){
                  stock.stderr += err+'\n';
                }
                else{
                  result.push(file);
                  stock.stdout += "uploaded "+file+'\n';
                }
              })
            }
          });
        }
        //stock.finished = true;
    })
      // var stock = this;
      // if(params.files[0][0].path.indexOf("tmp/")!==-1){ // if it is a file unziped in tmp, move files
      //   params.files[0].forEach(function(fileInfo){
      //     fs.createReadStream(fileInfo.path).pipe(fs.createWriteStream(stock.dirname+'/'+fileInfo.name));
      //   })
      // }
      // else{  //Must be cache, copy
      //}
    }
});
server.jobManager.on('finish', function (job, worker) {
    worker.params.handler.handleResult("Convert job finished");
    rmdirSync(worker.dirname); //remove temporary directory
  });

UploadHandler.prototype.convert = function (collectionpath, assetpath) {
    var handler = this;
    var form = new formidable.IncomingForm();
    var tmpFiles = [];
    var files = [];
    var map = {}
    var counter = 1;
    var copyall = false;

    // var finish = function (err, asset) {
    //   if (err) {
    //     console.log('ERROR IN CONVERT FINISH');
    //     counter = -1;
    //     handler.handleError(err);
    //     return;
    //   }
    //   counter -= 1;

    //   // // here start conversion, and then call fileInfo.upload on converted files
    //   // // check copyall
      
    //     var results = [];
    //     if (files.length==0){
    //       return handler.handleError({message:'post did not send any files', statusCode:400});
    //     }
    //     files.forEach(function (fileInfo) {
    //       //fileInfo.initUrls(handler.req);
    //       var timeout = function (db) {
    //         fileInfo.delete(db,function(){}); // no callback
    //         console.log('timeout !! ' + fileInfo.name + ' was deleted');
    //       }
    //       setTimeout(timeout, 60 * 60 * 1000, handler.db);
    //     });
    //     server.jobManager.enqueue('convert', {'files':files,'handler':handler}); //Call convert job
        
    
    // };

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
       } 
       else if (name === 'url') {                                            
        counter++; // one more result to POST
        var params = {};
        params.handler = handler, params.collectionpath = collectionpath, params.assetpath = assetpath, params.url = value, params.copyall =copyall;
        server.jobManager.enqueue('convert', params);
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