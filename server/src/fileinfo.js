  'use strict';

  var fs = require('fs');
  var Path = require('path');

  var Mime = require('mime');

  var Asset = require('./asset');
  var Collection = require('./collection');
  var Resource = require('./resource');

  var mkdirp = require('mkdirp');


  var nameCountRegexp = /(?:(?: \(([\d]+)\))?(\.[^.]+))?$/;
  var nameCountFunc = function (s, index, ext) {
        return ' (' + ((parseInt(index, 10) || 0) + 1) + ')' + (ext || '');
      };

  var copyFile = function(source, target, cb) {
    var cbCalled = false;

    var rd = fs.createReadStream(source);
    rd.on("error", done);

    var wr = fs.createWriteStream(target);
    wr.on("error", done);
    wr.on("close", function(ex) {
      done();
    });
    rd.pipe(wr);

    function done(err) {
      if (!cbCalled) {
        cb(err);
        cbCalled = true;
      }
    }
  }

   var mvFile = function(source, target, cb) {
    var cbCalled = false;

    var rd = fs.createReadStream(source);
    rd.on("error", done);

    var wr = fs.createWriteStream(target);
    wr.on("error", done);
    wr.on("close", function(ex) {
      done();
    });
    rd.pipe(wr);

    function done(err) {
      if (!cbCalled) {
        cbCalled = true;
        fs.unlink(source,function() {cb(err)});
      }
    }
  }

  var FileInfo = function (file, collectionpath, assetpath) {
      if (file) { // file is undefined if this is a folder
        // file -> name, path, optional:size, type, not used: hash, lastModifiedDate)
        this.name = file.name; // name according to sender
        this.path = file.path; // where is it now?

        if (this.path)
          try{this.size = fs.statSync(this.path).size;}catch(e){this.size = -1}
        else
          this.size = -1;
        if (file.type)
          this.type = file.type; // type according to sender
        else
          this.type = Mime.lookup(file.name);

        this.isFolder = false; // true if this is a folder and not a file
      } else
        this.isFolder = true; // true if this is a folder and not a file

        // asset information
      this.collectionpath = collectionpath; // where to put it -> a collection object
      this.assetpath = assetpath; // path of asset inside collection

     
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

  // test if file is valid
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
  /*
  FileInfo.prototype.safeName = function () {
    // Prevent directory traversal and creating hidden system files:
    this.name = path.basename(this.name).replace(/^\.+/, '');
    // Prevent overwriting existing files:
    while (fs.existsSync(FileInfo.options.uploadDir + '/' + this.name)) {
      this.name = this.name.replace(nameCountRegexp, nameCountFunc);
    }
  };
  */
  FileInfo.prototype.initUrls = function (req) {
    if (!this.error) {
      var that = this,
        baseUrl = (FileInfo.options.ssl ? 'https:' : 'http:') +
          '//' + req.headers.host ;
      this.url = baseUrl + encodeURIComponent(this.assetpath);
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
  
// FIXME -> Need to remove resource from all assets !!
  FileInfo.prototype.delete = function(database,cb){
    console.log('********* DELETE *************')
    var fileInfo = this;
    if (database) {
      // remove asset file from database, and update assets info uppon success
      // NOTE -> should not do that ... should keep asset and move it to a recycle bin instead !!
      database.del(fileInfo.asset.assetId, function(err,assetId){
        if (err) {
          console.log('Error deleting asset='+assetId);
          cb(err);
        } else {
          console.log('Success deleting asset='+assetId);
          cb(undefined, res);
        }

      })
    } else {
      fs.unlink(pah.join(FileInfo.options.uploadDir,fileInfo.asset.assetId), function (ex) {

        /*
        if (FileInfo.options.imageVersions)
          Object.keys(FileInfo.options.imageVersions).forEach(function (version) {
            fs.unlinkSync(FileInfo.options.uploadDir + '/' + version + '/' + fileName);
          });
        */

        if (ex) {
          cb(ex);
        } else {
          delete FileInfo.tmpAssets[fileInfo.asset.assetId];
          cb(undefined,fileInfo.asset.assetId+" was succesfully deleted");
        }

      });
    }
  };

  // create an asset out of this fileInfo
  // folder is a subcollection path. 
  // returns the new resource
  // TODO - separate sid from userid 
  FileInfo.prototype.toAsset = function(database,userid,cb) {
    var fileInfo = this;

    var collectionpath = this.collectionpath;
    var assetpath = this.assetpath;

    // find collection 
    
    Collection.find(database,collectionpath,function(err,result){
      if (err) return cb(err);
      if (result.assetpath !== "") 
        return cb({message: 'cannot find collection ['+result.assetpath+']', statusCode:404});
 
      // upload data
      var collection=result.collection;
      var resource = new Resource(database, collection.uuid, fileInfo.name, fileInfo.type);
      resource.size = fileInfo.size;
      fileInfo.resource = resource;
      Resource.create(resource, userid, function(err,resource){
        if (err) return cb(err);
        collection.mkAsset(Path.join(assetpath,resource.name), userid, resource, function(err,asset){
          fileInfo.asset = asset;
          cb(undefined,resource);
        });


      })

    });
  }

  // move a file to upload area, assign a uuid
  // need the path where to upload the file
  // and if it is a fileSystem or a database
  // This will be stored in the handler
  FileInfo.prototype.upload = function (handler, cb) {

    var fileInfo = this;
    var finish = function(err) {
      if (err) {
        console.log('error in fileInfo.toAsset -> '+err);
        cb(err);
      } else {
        cb(undefined, fileInfo.asset);
      }
    };

    if (fileInfo.buffer) {
      fileInfo.size = fileInfo.buffer.length;
    } else if (fileInfo.path){
      fileInfo.size = fs.statSync(fileInfo.path).size;
    } else {
      var error = new Error('neither buffer or path was set in fileInfo.upload');
      return cb(error);
    }

    if (handler.db.name !== 'tmp'){
      // make an asset out of this fileInfo
      // create a uuid

/*
      if (fileInfo.collectionpath ==='')
        return cb({message:'forbidden to store an asset at root of database',statusCode:403});
*/

      fileInfo.toAsset(handler.db,handler.sid, function(err,asset) {
        if (err) return cb(err);

        if (fileInfo.buffer) {
           handler.db.store(asset,fileInfo.buffer, finish);
        } else 
           handler.db.store(asset,fileInfo.path, finish);
           /*
        if (!fileInfo.donotmove){ // this can be done whenever - don't care if it does not work
          fs.unlink(fileInfo.path);
        }
        */
      })
  

    } else { // this is the 'tmp' database 
      // make an asset out of this fileInfo, in database 'tmp'
      // TODO -> replace handler.sid with hander.uid (user id)

      fileInfo.toAsset(handler.db,handler.sid,function(err,asset) {
        if (err) return cb(err);
        var filename = Path.resolve(FileInfo.options.uploadDir, handler.req.session.tmpdir ,asset.uuid);
        // Note: folder was created in upload.js makeTMP
        
        if (fileInfo.buffer) {

          fs.writeFile(filename, fileInfo.buffer, 'binary', finish);
        } else if (fileInfo.donotmove){
          copyFile(fileInfo.path, filename, finish);
        } else {
          mvFile(fileInfo.path, filename, finish);
        }
      })
    }
    
    /* Image resize -> need to enable this code at open point?

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


