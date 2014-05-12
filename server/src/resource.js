// resources (files)

var uuid = require('node-uuid');
var extend = require('./extend')

var Resource = function (database,parentId,name,type){
  if (arguments.length) {
    this.parentId = parentId; // who owns this asset
    this.database = database;
    this.name = name;
    this.type = type;
  }
};

// this set a creation date and a uuid, and save the resource
Resource.create = function(resource,uid,callback){
  resource.created = {date: new Date().getTime(),user: uid};
  getuuid(resource, callback);
}

// todo - check if id does not exists already
var getuuid = function(resource, callback) {
  var cb=callback;

  if (!resource.uuid){
    var id = uuid.v1();
    /*
    if (Resource.tmpAssets[id])
      return getuuid(resource,cb);
    else
      */
      resource.uuid = id;
  }
  resource.save(cb);
}

/*
 So, we do not delete resources in normal case
 Assets get removed from collections, but they can be un-deleted 
 as removing is in fact pushing a new resource, that does not have 
 a link to this new resource.

 But we're going to need some way to clean up a database somehow when disk is full?
 
Resource.prototype.del = function(callback) {

}
*/

Resource.prototype.save = function(callback) {
  this.database.saveAsset(this, callback);
}

Resource.load = function(database,id,callback){
  database.loadAsset(id,callback);
}

// get resource for REST API output
Resource.prototype.get = function(callback) {
  var result=extend({},this);
  result.database && result.database.name && (result.database = result.database.name);
  delete result.parentId;
  callback(undefined,result);
}

Resource.tmpAssets = {};

module.exports = Resource;