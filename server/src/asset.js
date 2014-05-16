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
  // LIFO -> add at end of array
  if (this.database.noversioning)
    this.resources = [resource];
  else
    this.resources.push(resource);
  this.save(callback);
}

Asset.prototype.lock = function(callback){
  this.database.lockAsset(this, callback);
}

Asset.prototype.unlock = function(callback){
  this.database.unlockAsset(this,callback);
}

Asset.prototype.getResourceSync = function(){
  // last element is most recent
  // return a copy
  //return extend(new Resource(),this.resources[this.resources.length-1])
  return this.resources[this.resources.length-1];
}

// get resource for REST API output
Asset.prototype.getSync = function() {
  var result=extend({},this);

  delete result.resources;
  delete result.parentId;
  var col = this.getResourceSync();
  extend(result,col);
  result.database && result.database.name && (result.database = result.database.name);
  return result;

}
Asset.tmpAssets = {};

module.exports = Asset;