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
  if (arguments.length) {
    Asset.call(this,database,name,resource);
    this.type=mime_type;
  }
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
  var collection2; // this is what we return

  var next = function(err){
    // always try to unlock
    collection.unlock(function(err2,asset) {
      if (err) return cb(err);
      if (err2) return cb(err2);
      cb(undefined,collection2);
    })
  }

  this.lock(
    function(err,asset,callback){
      if (err) return cb(err);

      // now that we locked the asset, get its correct value
      collection = asset;

      var col = collection.getResourceSync();
      if (col.children[name]) {
        // this is a uuid, get the asset 
        console.log('mkdir '+collection.name+'- children load at path='+name)
        Resource.load(collection.database,col.children[name], function(err,res){
          collection2=res;
          next(err,res);
        });
      } else {
        var col2 = {children:{}, assets:{}};
        collection2 = new Collection(collection.database, name, col2);
        Asset.create(collection2, uid,function(err,collection2){
          if (err) return next(err);
          addChild(collection,collection2,next);
        });
      }
  })
}
// add or return an asset at path

Collection.prototype.mkAsset = function(_path,_uid,_resource,_callback) {
  var collection= this;
  var resource = _resource;
  var cb=_callback;
  var name=_path;
  var uid=_uid;
  var newasset; // this is what we return

  var next = function(err){
    // always try to unlock
    collection.unlock(function(err2,asset) {
      if (err) return cb(err);
      if (err2) return cb(err2);
      cb(undefined,newasset);
    })
  }

  var add_resource = function() {
    // finally add the new asset to the collection
    addAsset(collection,newasset,name, function(err,collection){
      if (err) next(err)
      else next(undefined,resource.uuid);

    });
  }

  this.lock(
    function(err,asset){
      if (err) return cb(err);

      // now that we have a lock, let's update the value
      collection =asset;
      var col = collection.getResourceSync();
      if (col.assets[name]) {
        // there is already an asset at that path
        // let's get that asset, and then add a resource to that asset 
        console.log('mkAsset '+collection.name+' - asset load at path ='+name)
        Resource.load(collection.database,col.assets[name], function(err,res){
          newasset=res;
          // TODO -> need to lock the asset before adding a resource to that asset
          newasset.addResource(resource);
          if (err) return next(err);
          
          add_resource();
        });
      } else {
        // there is no asset at that path
        // create a new asset, with the resource attached
        var asset = new Asset(resource.database,resource.name,resource);
        Asset.create(asset, resource.userId, function(err,asset){
          if (err) return next(err);
          newasset=asset;
          add_resource();
         
        })
      }
    }
  )
}

// find as much path in the collection hierarchy
Collection.find = function(_database,_path,_callback) {
  var cb=_callback;
  var path=_path;
  Collection.getroot(_database,function(err,collection){
    if (err) 
      return cb(err);
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

  var col = collection.getResourceSync();

  if (!rootPath) {
    // this is the end
    if (col.children[path]) {
      console.log('find '+collection.name+' - load children at path='+path)
      Resource.load(collection.database,col.children[path],function(err,collection) {
        cb(undefined,{path:Path.join(match,path),assetpath:'',collection:collection})
      });   
    } else 
      cb(undefined,{path:match,assetpath:path,collection:collection});
  } else {

    if (col.children[rootPath]) {
      console.log('find '+collection.name+' - load children at path='+rootPath)
      Resource.load(collection.database,col.children[rootPath],function(err,collection) {
        find(collection,Path.join(match,rootPath), assetPath, cb); 
      });
    } else
      cb(undefined,{path:match,assetpath:path,collection:collection});
  }
}


// return a collection to rest API
Collection.prototype.get = function(callback) {
  var result=extend({},this);
  var cb=callback;
  delete result.resources;
  var col = this.getResourceSync();
  extend(result,col);
  result.database && result.database.name && (result.database = result.database.name);
  cb(undefined,result);
}

// return the root collection for a database
Collection.getroot = function(database,callback){
  var cb=callback;
  var db=database;

  db.getRoot(function(err,root){
    if (!root || (err && err.statusCode === 404)) {
      var col = {children:{}, assets:{}};
      var collection = new Collection(db, '/', col);
      // 'save' will save the asset, which will be detected as root
      Asset.create(collection, 0, function(err, collection){
          // TODO - it is possible that 2 users will create a root at same time !
          cb(err,collection);
      });
    } else
      cb(err,root);
  });
}

// add an asset to a collection
// this is not using locks
  var addAsset = function(_collection,_asset, _path, callback){
  if (_asset.type === mime_type) 
    return callback("collection.addAsset -> cannot add collection, use addChild")

  var collection = _collection;
  var cb=callback;
  var asset=_asset;
  var path=_path;

  var col = collection.getResourceSync();

  // clone col
  var newcol=extend({},col);

  newcol.assets[path] = asset.uuid;
  collection.addResource(newcol,cb);

}

// add a subcollection to a collection
// this is not using locks
var addChild = function(_collection,_newcollection, callback){

  if (_newcollection.type !== mime_type) 
    return callback("collection.addChild -> cannot only add collection, use addAsset instead")

  if (!_newcollection.uuid)
    return callback("Cannot add child without uuid !!!")

  var collection = _collection;
  var newcollection = _newcollection;
  var cb=callback;
  var path=newcollection.name;

  if (path.contains('/')) return callback("collection.addChild cannot add a complex path ="+path)
  
  
  var col = collection.getResourceSync();

  // clone resource and add new children
  var newcol=extend({},col);

  newcol.children[path] = newcollection.uuid;

  collection.addResource(newcol,cb);
}

// return matching asset in collection
Collection.prototype.getAsset = function(_path, callback){
  var path=_path;
  var cb=callback;
  var collection = this;

  var col = collection.getResourceSync();

  var assetId = col.assets[_path];
  if (assetId) {
    // resolve and send
    console.log('getAsset '+collection.nane+' - get assetId = '+assetId)
    Resource.load(collection.database,assetId,function(err,asset){
      if (err) {
        console.log('could not get asset resource?!')
        cb(err);
      }
      var resource = asset.getResourceSync();
      console.log('and resolved to resourceId='+resource.uuid)
      cb(err,resource);
    })
    
      
  } else {
      console.log('getAssetId returned null')
    callback(undefined,null);
  }
}


module.exports = Collection;