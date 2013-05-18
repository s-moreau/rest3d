// Utility functions
String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};
String.prototype.startsWith = function(prefix) {
  return this.lastIndexOf(prefix, 0) === 0;
};