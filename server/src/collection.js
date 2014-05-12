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

var Collection = function (database, parentId ,name, resource){
  if (arguments.length) {
    Asset.call(this,database, parentId ,name,resource);
    this.type=mime_type;
  }
}


Collection.prototype = Object.create(Asset.prototype);
Collection.prototype.constructor = Collection;


Collection.type = mime_type;

Collection.create = function(database,path,uid,cb){

  Collection.getroot(database,function(err,collection){
    collection.create(path,uid,cb);
  })
};

// find the lowest collection in the chain
// and then create a collection at remaining path

Collection.prototype.create = function(path,uid,cb){

  var collection = this;
  // remove first / if needed.
  if (!path || path==='/') return _callback(undefined,this);
  if (path[0] === '/') path = path.substr(1);

  collection.find(path,function(err,result){
    if (err) return cb(err)
    if (!result.assetpath) cb(undefined,result.collection);
    // found collection (at path) and need to add assetpath
    result.collection.mkdir(result.assetpath,uid,cb)
  })
}

// remove a chid collection 
// its like mkdir, except removing the entry from list of child

Collection.prototype.rmdir = function(uid,cb){
  var collection = this; // we can return this too
  // unlock and leave
  var next = function(err){
    // always try to unlock
    collection.unlock(function(err2,asset) {
      if (err) return cb(err);
      if (err2) return cb(err2);
      cb(undefined,collection);
    })
  }

  var col=null;
  var found=null;

  // we need to lock the collection
   this.lock (
    function(err,asset,callback){
      if (err) return cb(err);

      // now that we locked the asset, get its correct value
      collection = asset;

      col = collection.getResourceSync();
      // find collection
      for (var key in col.children) {
          if (col.children[key] === uid) {
            found = key;
            break;
          }
      }
      if (found) {
        delete col.children[found];
        return collection.addResource(col,next);
      }

      for (var key in col.assets) {
          if (col.assets[key] === uid) {
            found = key;
            break;
          }
      }
      if (found) {
        var error = new Error('rmdir cannot remove an asset = '+name);
        error.statusCode = 403;
        return next(error);
      } else { 
        var error = new Error('could not find children['+uid+']');
        error.statusCode = 404;
        return next(error);
      }
  })
}

// add or return a child collection
// this will acquire a lock on the collection, so it can either
//  - get the latest version of collection in case its been written at same time by another user
//  - modify the collection to create the new child

// return -> child collection

Collection.prototype.mkdir = function(name,uid,cb) {
  if (!name) cb(undefined,this);
  var collection= this;
  var collection2; // this is what we return

  var next = function(err){
    // always try to unlock
    collection.unlock(function(err2,asset) {
      if (err) return cb(err);
      if (err2) return cb(err2);
      cb(undefined,collection2);
    })
  }

  // no need to use lock here
  var add_child = function(next){
    Resource.load(collection.database,col.children[name], function(err,res){
        collection2=res;
        next(err,res);
      });
  }


  // let's try without locking first
  var col = collection.getResourceSync();
  // collection already exists - we're done
  if (col.children[name]) {
    return add_child(cb);
  } else if (col.assets[name]){
    var error = new Error('conflict with existing asset = '+name);
    error.statusCode = 403;
    return cb(error);
  } else  this.lock (
    function(err,asset,callback){
      if (err) return cb(err);

      // now that we locked the asset, get its correct value
      collection = asset;

      col = collection.getResourceSync();
      if (col.children[name]) {
        add_child(next);
      }  else if (col.assets[name]){
        var error = new Error('conflict with existing asset = '+name);
        error.statusCode = 403;
        return cb(error);
      } else { // create new child collection
        var col2 = {children:{}, assets:{}};
        collection2 = new Collection(collection.database, collection.uuid, name.slice(name.lastIndexOf('/')+1), col2);
        Asset.create(collection2, uid,function(err,collection2){
          if (err) return next(err);
          addChild(collection,collection2,name,next);
        });
      }
  })
}
// add or modify an asset at path, provided the new resource
// see if the asset already exists in the collection
// yes -> then acquire lock on asset, and then modify asset with new resource
// no -> acquire lock on collection,
//       check if asset already exists (its possible, in case another user was adding an asset at same time
//       yes -> acquire lock on asset, and then modify asset with new resource -> unlock asset
//       no -> create new asset with resource, unlock collection
//         (no need to lock asset, since it's new, and nobody else has access to it

// return -> child Asset

Collection.prototype.mkAsset = function(name,uid,resource,cb) {
  var collection= this;
  var newasset; // this is what we return

  var next = function(err){
    // always try to unlock collection
    collection.unlock(function(err2,asset) {
      if (err) return cb(err);
      if (err2) return cb(err2);
      cb(undefined,newasset);
    })
  }

// TODO -> lock resource, instead of resource load, need resource lock!!!
// maybe move this to Asset.js, generic locked asset resource adding?
  var add_resource = function(cb) {
    var next=cb;
    Resource.load(collection.database,col.assets[name], function(err,res){
        newasset=res;
        newasset.addResource(resource,next);
    })
  }

  var col = collection.getResourceSync();

  // first try without locking the collection 
      
  if (col.assets[name]) {
    add_resource(cb);
  } else if (col.children[name]){
    var error = new Error('conflict with existing collection = '+name);
    error.statusCode = 403;
    return cb(error);
  } else {

    this.lock(
      function(err,asset){
        if (err) return cb(err);

        // now that we have a lock, let's update the value
        collection = asset;

        var col = collection.getResourceSync();
        if (col.assets[name]) {
          // there is already an asset at that path
          // let's get that asset, and then add a resource to that asset 
          console.log('mkAsset '+collection.name+' - asset load at path ='+name)

          add_resource(next);

        }  else if (col.children[name]){
          var error = new Error('conflict with existing collection = '+name);
          error.statusCode = 403;
          return cb(error);
        } else {
          // there is no asset at that path
          // create a new asset, with the resource attached
          newasset = new Asset(collection.database, collection.uuid, resource.name,resource);
          Asset.create(newasset, resource.userId, function(err,newasset){
            if (err) return next(err);
            // add new asset, no need to lock this new asset
            addAsset(collection, newasset, name, next);
          })
        }
      }
    )
  }
}

// find as much path in the collection hierarchy
Collection.find = function(database,path,cb) {
  Collection.getroot(database,function(err,collection) {
    if (err) 
      return cb(err);
    collection.find(path,cb);
  })
};

// find as much path in hierarchy
// return matched path AND collection
Collection.prototype.find = function(path,callback) {
  find(this,'',path,callback);
}

var find = function(collection,match,path,cb) {

  if (path==='/' || !path) return cb(undefined,{path:match,assetpath:'',collection:collection});

  while (path.startsWith('/')) path = path.slice(1);
  while (path.endsWith('/')) path = path.slice(0, -1);

  // search if there is a children which path match with the beginning of _path
  // there can be only one ?
  // path = toto/titi/tata
  // (1) children[toto/titi] = collection
  // (2) chuldren[toto/truc] = collection
  // 
  // (1) match=[toto/titi]
  // (2) match=[toto]     
  //  --> need to find the longest match
  var col = collection.getResourceSync();
  var found=null;
  var length=0;
  for (var key in col.children){
    if (path.startsWith(key)){
      if (key.length > length){
        found = key;
        length = key.length;
        if (length === path.length)
          break;
      }
    }
  }

  if (found){
    // full or patrial path found
    Resource.load(collection.database,col.children[found],function(err,collection) {
      if (err) return cb(err);
      if (length === path.length)
        cb(undefined,{path:Path.join(match,path),assetpath:'',collection:collection})
      else
        find(collection,Path.join(match,found), path.substr(length), cb); 
    }); 
    
  } else {
    // no path
    cb(undefined,{path:match,assetpath:path,collection:collection});
  }
}


// return a collection to rest API
Collection.prototype.get = function(callback) {
  var result=extend({},this);
  var cb=callback;
  delete result.resources;
  delete result.parentId;
  var col = this.getResourceSync();
  extend(result,col);
  result.database && result.database.name && (result.database = result.database.name);

  cb(undefined,result);
}

// return the root collection for a database
Collection.getroot = function(db,cb){

  db.getRoot(function(err,root){
    if (!root || (err && err.statusCode === 404)) {
      var col = {children:{}, assets:{}};
      var collection = new Collection(db, null, '/', col);
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
// does not even check if asset already exists
  var addAsset = function(collection, asset, path, cb){
  if (asset.type === mime_type) 
    return callback("collection.addAsset -> cannot add collection, use addChild")

  if (!asset.uuid)
    return callback("Cannot add asset without uuid !!!")

  var col = collection.getResourceSync();

  // clone col
  var newcol=extend({},col);

  newcol.assets[path] = asset.uuid;
  collection.addResource(newcol,cb);

}

// add a subcollection to a collection
// this is not using locks
// does not even checks if asset already exists
var addChild = function(collection,newcollection, path, cb){

  if (newcollection.type !== mime_type) 
    return callback("collection.addChild -> cannot only add collection, use addAsset instead")

  if (!newcollection.uuid)
    return callback("Cannot add child without uuid !!!")
  
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
      console.log(' ... and resolved to resourceId='+resource.uuid)
      cb(err,resource);
    })
    
      
  } else {
      console.log('getAssetId returned null')
    callback(undefined,null);
  }
}


module.exports = Collection;