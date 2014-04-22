// resources (files)

var uuid = require('node-uuid');
var extend = require('./extend')

var Resource = function (database,name,type){
  this.database = database;
  this.name = name;
  this.type = type;
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
    if (Resource.tmpAssets[id])
      return getuuid(resource,cb);
    else
      resource.uuid = id;
  }
  resource.save(cb);
}

// delete this resource 
Resource.prototype.del = function(callback) {
 // TODO -> delete the actual resource file !! if type===Resource
 delete Resource.tmpAssets[this.uuid];
 callback(undefined, this);
}

Resource.prototype.save = function(callback) {
  // store as a key/pair
  Resource.tmpAssets[this.uuid] = this;
  callback(undefined,this);
}

Resource.load = function(database,id,callback){
  var result = Resource.tmpAssets[id];
  if (result)
    callback(undefined, result)
  else
    callback('cannot find asset id='+id)
}

// get resource for REST API output
Resource.prototype.get = function(callback) {
  var result=extend({},this);
  callback(undefined,result);
}

Resource.tmpAssets = {};

module.exports = Resource;