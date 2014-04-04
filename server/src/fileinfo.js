  'use strict';

  var fs = require('fs');
  var path = require('path');

  var nameCountRegexp = /(?:(?: \(([\d]+)\))?(\.[^.]+))?$/,
      nameCountFunc = function (s, index, ext) {
        return ' (' + ((parseInt(index, 10) || 0) + 1) + ')' + (ext || '');
      };

  var FileInfo = function (file) {
      this.name = file.name;
      this.size = file.size;
      this.type = file.type;
      this.path = file.path;
      //this.delete_type = 'DELETE';
  };

  FileInfo.options = {
      //tmpDir: __dirname + '/../tmp',
      //uploadDir: __dirname + '/../upload',
      tmpDir: 'tmp',
      uploadDir: 'upload',
      uploadUrl: '/rest3d/upload/',
      maxPostSize: 11000000000, // 11 GB
      minFileSize: 1,
      maxFileSize: 10000000000, // 10 GB
      acceptFileTypes: /.+/i,
      // Files not matched by this regular expression force a download dialog,
      // to prevent executing any scripts in the context of the service domain:
      safeFileTypes: /\.(gif|jpe?g|png|tga|dae|zip)$/i,
      imageTypes: /\.(gif|jpe?g|png|tga)$/i,
      imageVersions: {
        'thumbnail': {
          width: 80,
          height: 80
           }
       },
       accessControl: {
        allowOrigin: '*',
        allowMethods: 'OPTIONS, HEAD, GET, POST, PUT, DELETE',
        allowHeaders: 'Content-Type, Content-Range, Content-Disposition'
      },

      /* Uncomment and edit this section to provide the service via HTTPS:
      ssl: {
        key: fs.readFileSync('/Applications/XAMPP/etc/ssl.key/server.key'),
        cert: fs.readFileSync('/Applications/XAMPP/etc/ssl.crt/server.crt')
      },
      */
       nodeStatic: {
         cache: 3600 // seconds to cache served files
       }
    };

  FileInfo.prototype.validate = function () {
    if (FileInfo.options.minFileSize && FileInfo.options.minFileSize > this.size) {
      FileInfo.error = 'File is too small';
    } else if (FileInfo.options.maxFileSize && FileInfo.options.maxFileSize < this.size) {
      this.error = 'File is too big';
    } else if (FileInfo.options.acceptFileTypes && !FileInfo.options.acceptFileTypes.test(this.name)) {
      this.error = 'Filetype not allowed';
    }
    return !this.error;
  };
  FileInfo.prototype.safeName = function () {
    // Prevent directory traversal and creating hidden system files:
    this.name = path.basename(this.name).replace(/^\.+/, '');
    // Prevent overwriting existing files:
    while (fs.existsSync(FileInfo.options.uploadDir + '/' + this.name)) {
      this.name = this.name.replace(nameCountRegexp, nameCountFunc);
    }
  };
  FileInfo.prototype.initUrls = function (req) {
    if (!this.error) {
      var that = this,
        baseUrl = (FileInfo.options.ssl ? 'https:' : 'http:') +
          '//' + req.headers.host ;
      this.url = baseUrl + encodeURIComponent(this.path);
      //this.delete_url = this.url;
      if (FileInfo.options.imageVersions)
        Object.keys(FileInfo.options.imageVersions).forEach(function (version) {
          if (fs.existsSync(
              FileInfo.options.uploadDir + '/' + version + '/' + that.name
            )) {
            that[version + '_url'] = baseUrl + version + '/' +
              encodeURIComponent(that.name);
          }
        });
    }
  };
  FileInfo.prototype.delete = function(){
    var fileName = this.name;
    fs.unlink(FileInfo.options.uploadDir + '/' + fileName, function (ex) {
      if (FileInfo.options.imageVersions)
        Object.keys(FileInfo.options.imageVersions).forEach(function (version) {
          fs.unlinkSync(FileInfo.options.uploadDir + '/' + version + '/' + fileName);
          console.log('deleted '+FileInfo.options.uploadDir + '/' + version + '/' + fileName);
        });
    });
  };
  // move a file to upload area
  FileInfo.prototype.upload = function (handler, filePath) {

    if(handler.hasOwnProperty("iduser")){ 

      
      var flagIduser = fs.existsSync(FileInfo.options.uploadDir+'/'+handler.iduser);
      if(!flagIduser){
        fs.mkdirSync(FileInfo.options.uploadDir + '/' + handler.iduser);
      }
      if(handler.hasOwnProperty("folder")){ 
        
        var flagFolder = fs.existsSync(FileInfo.options.uploadDir+ '/' + handler.iduser+'/'+handler.iduser);
        if(!flagFolder){
          fs.mkdirSync(FileInfo.options.uploadDir + '/' + handler.iduser + '/'+ handler.folder);
        }
        fs.renameSync(filePath, FileInfo.options.uploadDir + '/' + handler.iduser + '/'+ handler.folder +'/'+ this.name);
        console.log("uploaded "+FileInfo.options.uploadDir + '/' + handler.iduser + '/'+ handler.folder +'/'+ this.name);
        this.path = FileInfo.options.uploadDir + '/' + handler.iduser + '/'+ handler.folder +'/'+ this.name;
      } else {
        fs.renameSync(filePath, FileInfo.options.uploadDir + '/' + handler.iduser + '/' + this.name);
        console.log("uploaded "+FileInfo.options.uploadDir + '/' + handler.iduser + '/' + this.name);
        this.path = FileInfo.options.uploadDir + '/' + handler.iduser + '/' + this.name;
      }
    } else{
      fs.renameSync(filePath, FileInfo.options.uploadDir + '/' + this.name);
      console.log("uploaded "+FileInfo.options.uploadDir + '/' + this.name);
      this.path = FileInfo.options.uploadDir + '/' + this.name;
    }
    /* Image resize 

    if (FileInfo.options.imageTypes.test(fileInfo.name)) {
      Object.keys(FileInfo.options.imageVersions).forEach(function (version) {
        counter += 1;
        var opts = FileInfo.ptions.imageVersions[version];
        imageMagick.resize({
          width: opts.width,
          height: opts.height,
          srcPath: FileInfo.options.uploadDir + '/' + fileInfo.name,
          dstPath: FileInfo.options.uploadDir + '/' + version + '/' +
            fileInfo.name
        }, finish);
      });
    }
    */
  };

   module.exports = FileInfo;


