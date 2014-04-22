  'use strict';

  var fs = require('fs');
  var Path = require('path');
  var mkdirp = require('mkdirp');

  var Asset = require('./asset');
  var Collection = require('./collection');
  var Resource = require('./resource')

  var nameCountRegexp = /(?:(?: \(([\d]+)\))?(\.[^.]+))?$/;
  var nameCountFunc = function (s, index, ext) {
        return ' (' + ((parseInt(index, 10) || 0) + 1) + ')' + (ext || '');
      };

  var FileInfo = function (file, collection, assetpath) {
      this.file = file;
      this.name = file.name;
      this.size = file.size;
      this.type = file.type;
      this.collection = collection;
      this.assetpath = assetpath;
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
  FileInfo.prototype.delete = function(handler){
    var fileInfo = this;
    if (handler.db) {
      // remove asset file from database, and update assets info uppon success
      // NOTE -> should not do that ... should keep asset and move it to a recycle bin instead !!
      handler.db.del(fileInfo.asset.assetId, function(err,assetId){
            if (err) {
              console.log('Error deleting asset='+assetId);
              cb && cb(err);
            } else {
              console.log('Success deleting asset='+assetId);
              var aid = assetId;
              handler.db.removeKey('assets',aid, function (err,res){
              if (err) {
                console.log('Error deleting asset key '+aid+' = '+err);
                cb && cb(err);
              } else {
                console.log('asset ['+aid+'] entry deleted')
                cb && cb(undefined, res);
              }
            })
          }
        })
    } else {
      fs.unlink(pah.join(FileInfo.options.uploadDir,fileInfo.asset.assetId), function (ex) {
        if (FileInfo.options.imageVersions)
          Object.keys(FileInfo.options.imageVersions).forEach(function (version) {
            fs.unlinkSync(FileInfo.options.uploadDir + '/' + version + '/' + fileName);
          });
        if (ex) {
          handler.handleError(ex);
        } else {
          handler.handleResult(fileInfo.asset.assetId+" was succesfully deleted");
          delete FileInfo.tmpAssets[fileInfo.asset.assetId];
        }
        handler.handleResult({success: !ex});
      });
    }
  };

  // create an asset out of this fileInfo
  // folder is a subcollection path. 
  // returns the uuid for the fileInfo (resource)
  // TODO - separate sid from userid
  FileInfo.prototype.toAsset = function(database,userid,callback) {
    var fileInfo = this;
    var cb=callback;
    var uid=userid;

    var collectionpath = this.collection;
    var assetpath = this.assetpath;

    //if (fileInfo.asset) cb(undefined, fileInfo.asset.assetId);
    // We need a uuid for our data file. How do we make sure this uuid is not used already ?
    var resource = new Resource(database, fileInfo.name, fileInfo.type);
    resource.size = fileInfo.size;
    Resource.create(resource, userid, function(err,resource){
      if (err) cb(err);
      else {

        var name = resource.name; //.substr(0,resource.name.lastIndexOf('.'));
        var asset = new Asset(resource.database,name,resource);
        Asset.create(asset, resource.userId, function(err,asset){
          if (err) cb(err);
          else {
            fileInfo.asset = asset;
            fileInfo.resource = resource;
            
            // this create an empty collection or return existing one

            Collection.create(resource.database,collectionpath,uid, function(err,collection){
               if (err) cb(err);
               else {

                 collection.addAsset(fileInfo.asset,Path.join(assetpath,asset.name), function(err,collection){
                    if (err) cb(err)
                    else cb(undefined,fileInfo.resource.uuid);
                 })
               }
            })
          }
        });
      }
    })

  }

  // move a file to upload area, assign a uuid
  // need the path where to upload the file
  // and if it is a fileSystem or a database
  // This will be stored in the handler
  FileInfo.prototype.upload = function (handler, callback) {
    var cb=callback;
    var fileInfo = this;

      if (handler.db){
        // make an asset out of this fileInfo
        // create a uuid
        fileInfo.toAsset(handler.db.name,folder,handler.sid, function(err,assetId) {
          if (err) return cb(err);

          // database store asset file, and update assets info uppon success
          handler.db.store(assetId,fileInfo.file.path, function(err,assetId){
                if (err) {
                  console.log('Error storing asset='+assetId);
                  cb && cb(err,null);
                } else {
                  fileInfo.created = new Date().getTime();
                  console.log('Success storing asset='+assetId);
                  handler.db.insertKeyPair('assets',assetId, fileInfo.asset, function (err,res){
                  if (err) {
                    console.log('Error inserting assets');
                    console.log(err);
                    cb && cb(err, null);
                  } else {
                    console.log('asset entry added')
                    console.log('->'+res)
                    cb && cb(undefined, res);
                  }
                })
              }
            })
        })

      } else { // this is the 'tmp' database 
        // make an asset out of this fileInfo, in database 'tmp'
        // TODO -> replace handler.sid with hander.uid (user id)
        fileInfo.toAsset('tmp',handler.sid,function(err,assetId) {
          if (err) return cb(err);
          var assetPath=Path.resolve(FileInfo.options.uploadDir,fileInfo.collection);
          mkdirp(assetPath);
          console.log('created dir='+assetPath)
          fs.rename(fileInfo.file.path, Path.join(assetPath,assetId), function(err){
            if (err) {
              console.log('error in FileInfo.upload ->'+err);
              cb && cb(err);
            } else {
              console.log('moved asset')
              cb && cb(undefined, fileInfo.asset);
            }
          })
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


