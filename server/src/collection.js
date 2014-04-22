// collections
'use strict';

// collection is an asset, points to an array of collection-resources
// collection-resouces are resources, contains array of array and collection 

var toJSON = require('./tojson')
var Path = require('path')
var Asset = require('./asset')
var extend = require('./extend')
var Resource = require('./resource')

// create collectiion _name inside _database, as a sub collection of _collection
// this will be an empty collection to begin with

var mime_type = 'model/rest3d-collection+json';

var Collection = function (database,name, resource){
  Asset.call(this,database,name,resource);
  this.type=mime_type;
}


Collection.prototype = Object.create(Asset.prototype);
Collection.prototype.constructor = Collection;


Collection.type = mime_type;

Collection.create = function(_database,_path,_uid,_callback){
  var cb=_callback;
  var path=_path;
  var uid=_uid;
  Collection.getroot(_database,function(err,collection){
    collection.create(path,uid,cb);
  })
};

// recursive creation of collections, similar to mkdirp
// non destructive, this will return existing collection if it exists

Collection.prototype.create = function(_path,_uid,_callback){
  var cb = _callback;
  var collection = this;
  // remove first / if needed.
  if (!_path || _path==='/') return _callback(undefined,this);
  if (_path[0] === '/') _path = _path.substr(1);
  var rootPath = _path.stringBefore('/');
  var assetPath = _path.stringAfter('/');

  // recursive collection createion
  if (!rootPath){
    collection.mkdir(_path,_uid,cb);
  } else {
    collection.mkdir(rootPath, _uid, function(err, collection){
      if (err) return callback(err);
      else {
        collection.create(assetPath, collection.userId, cb);
      }
    })
  }
}

// add or return a child collection
Collection.prototype.mkdir = function(_path,_uid,_callback) {
  var collection= this;
  var cb=_callback;
  var name=_path;
  var uid=_uid;

  this.getResource(function(err,col){
    if (err) cb(err)
    else {
      if (col.children[_path]) {
        // this is a uuid, get the asset 
        Resource.load(collection.database,col.children[_path],cb);
      } else {
        var col2 = {children:{}, assets:{}};
        var collection2 = new Collection(collection.database, name, col2);

        Asset.create(collection2, uid,function(err,collection2){
          if (err) cb (err)
          else {
            // add child to parent collection
            // this returns the resource as saved by resource.save
            collection.addChild(collection2,function(err,resource){
              cb(err,collection2);
            });
          }
        });
        
      }

    }
  })
}

// find as much path in the collection hierarchy
Collection.find = function(_database,_path,_callback) {
  var cb=_callback;
  var path=_path;
  Collection.getroot(_database,function(err,collection){
    collection.find(path,cb);
  })
};
// find os much path in hierarchy
// return matched path AND collection
Collection.prototype.find = function(_path,_callback) {
  find(this,'',_path,_callback);
}

var find = function(_collection,_match,_path,_callback) {
  var collection=_collection;
  var match=_match;
  var cb = _callback;

  if (_path==='/' || !_path) return cb(undefined,{path:_match,assetpath:'',collection:collection});

  while (_path[0] === '/') _path = _path.substr(1);
  
  var rootPath = _path.stringBefore('/');
  var assetPath = _path.stringAfter('/');
  var path=_path;

  collection.getResource(function(err,col){
    if (err) cb(err)
    else {
      if (!rootPath) {
        // this is the end
        if (col.children[path]) 
          Resource.load(collection.database,col.children[path],function(err,collection) {
            cb(undefined,{path:Path.join(match,path),assetpath:'',collection:collection})
          });   
        else 
          cb(undefined,{path:match,assetpath:path,collection:collection});
      } else {

        if (col.children[rootPath]) 
          Resource.load(collection.database,col.children[rootPath],function(err,collection) {
            find(collection,Path.join(match,rootPath), assetPath, cb); 
          });
        else
          cb(undefined,{path:match,assetpath:path,collection:collection});
      }
    }
  });
   
}


// return a collection to rest API
Collection.prototype.get = function(callback) {
  var result=extend({},this);
  var cb=callback;
  delete result.resources;
  this.getResource(function(err,col){
    extend(result,col);
    cb(err,result);
  })
}

var root=[];
// return the root collection for a database
Collection.getroot = function(database,callback){
  var cb=callback;
  var db=database;
  if (!root[database]) {
    var col = {children:{}, assets:{}};
    var collection = new Collection(db, '/', col);

    Asset.create(collection, 0, function(err,collection){
      if (err) cb(err);
      else {
        root[db] = collection;
        cb(undefined,collection);
      }
    });
  } else
  cb(undefined,root[database])
}

// add an asset to a collection
// THIS NEEDS TO CREATE A NEW RESOURCE FOR VERSIONING
Collection.prototype.addAsset = function(_asset, _path, callback){
  if (_asset.type === mime_type) 
    return callback("collection.addAsset -> cannot add collection, use addChild")

  var collection = this;
  var cb=callback;
  var asset=_asset;
  var path=_path;

  collection.getResource(function(err,col){
    if (err) cb(err)
    else {
      // clone col
      var newcol=extend({},col);

      newcol.assets[path] = asset.uuid;
      collection.addResource(newcol,cb);
  
    }
    
  })
 
}

// add a subcollection to a collection
Collection.prototype.addChild = function(_collection, callback){

  if (_collection.type !== mime_type) 
    return callback("collection.addChild -> cannot only add collection, use addAsset instead")

  var collection = this;
  var newcollection = _collection;
  var cb=callback;
  var path=_collection.name;

  if (path.contains('/')) return callback("collection.addChild cannot add a complex path ="+path)
  
  collection.getResource(function(err,col){
    if (err) cb(err)
    else {
      // clone col
      var newcol=extend({},col);
    
      newcol.children[path] = newcollection.uuid;
    
      collection.addResource(newcol,cb);
    }
  })
 
}

// return matching asset in collection
Collection.prototype.getAssetId = function(_path, callback){
  var path=_path;
  var cb=callback;
  var collection = this;

  collection.getResource(function(err,col){
    if (err) cb(err)
    else {
      var assetId = col.assets[_path];
      if (assetId) {
        // resolve and send
        console.log('getAssetId found assetId='+assetId)
        Resource.load(collection.databae,assetId,function(err,asset){
          if (err) {
            console.log('could not get asset resource?!')
            cb(err);
          }
          asset.getResource(function(err,resource){
            console.log('and resolved to resourceId='+resource.uuid)
            cb(err,resource.uuid);
          });
        })
        
          
      } else {
          console.log('getAssetId returned null')
        callback(undefined,null);
      }
    }
  })
}


module.exports = Collection;