// assets

var toJSON = require('./tojson')
var Resource = require('./resource')
var extend = require('./extend')

var mime_type = 'model/rest3d-asset+json';

var Asset = function (database, parentId ,name, resource){
  if (arguments.length) {
    Resource.call(this, database, parentId, name,mime_type); // call parent constructor
    this.resources = [resource];
  }
};

Asset.prototype = Object.create(Resource.prototype);
Asset.prototype.constructor = Asset;

Asset.type = mime_type;
// include the Asset constructor in create, so this can only be used to create Assets
// an asset will contain at least one resource - so the resource constructor is embedded in the Asset constructor
Asset.create = function(asset,userid,callback){
  Resource.create(asset,userid,callback)
}

Asset.prototype.addResource = function(resource,callback){
  // LIFO -> add at begining of array
  // TODO -> some resources are not to be versioned ? 
  this.resources.unshift(resource);
  this.save(callback);
}

// TODO -> do something clever to get the right resource back
Asset.prototype.lock = function(callback){
  if (this.database.lockAsset) {
      this.database.lockAsset(this, callback);
  } else{
    callback(undefined,this);
  }
}

Asset.prototype.unlock = function(callback){
  if (this.database.unlockAsset) {
    this.database.unlockAsset(this,callback);
  } else
    callback(undefined, this);
}

Asset.prototype.getResourceSync = function(){
  return this.resources[0];
}

// get resource for REST API output
Asset.prototype.get = function(callback) {
  var result=extend({},this);
  var cb=callback;
  delete result.resources;
  var col = this.getResourceSync();
  extend(result,col);
  result.database && result.database.name && (result.database = result.database.name);
  cb(undefined,result);

}
Asset.tmpAssets = {};

module.exports = Asset;