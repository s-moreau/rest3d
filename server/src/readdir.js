'use strict';
var fs = require('fs');

var walk = function (dir,callback){
    var files = fs.readdirSync(dir);
    for(var i in files){
        if (!files.hasOwnProperty(i)) continue;
        var name = dir+'/'+files[i];
        if (fs.statSync(name).isDirectory()){
            walk(name,callback);
        }else{
            callback(dir,files[i]);
        }
    }
}

module.exports = walk;

// function getFiles(dir,files_){
//     if (typeof files_ == 'undefined') files=[];
//     var files = fs.readdirSync(dir);
//     for(var i in files){
//         if (!files.hasOwnProperty(i)) continue;
//         var name = dir+'/'+files[i];
//         if (fs.statSync(name).isDirectory()){
//             getFiles(name,files_);
//         }else{
//             files_.push(name);
//         }
//     }
//     return files_;
// }
// console.log(getFiles('path/to/dir'))