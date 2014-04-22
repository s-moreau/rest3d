// assets

var toJSON = require('./tojson')
var Resource = require('./resource')
var extend = require('./extend')

var mime_type = 'model/rest3d-asset+json';

var Asset = function (database,name, resource){
  Resource.call(this, database, name,mime_type); // call parent constructor
  this.resources = [resource];
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
Asset.prototype.getResource = function(callback){
  callback(undefined,this.resources[0]);
}

// get resource for REST API output
Asset.prototype.get = function(callback) {
  var result=extend({},this);
  var cb=callback;
  delete result.resources;
  this.getResource(function(err,col){
    extend(result,col);
    cb(err,result);
  })
}
Asset.tmpAssets = {};

module.exports = Asset;