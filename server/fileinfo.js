
  'use strict';

  var fs = require('fs');
  var path = require('path');

  var nameCountRegexp = /(?:(?: \(([\d]+)\))?(\.[^.]+))?$/,
      nameCountFunc = function (s, index, ext) {
        return ' (' + ((parseInt(index, 10) || 0) + 1) + ')' + (ext || '');
      };

  var FileInfo = function (file, options) {
      this.name = file.name;
      this.size = file.size;
      this.type = file.type;
      this.delete_type = 'DELETE';
      this.options = (options ? options : {uploadDir: __dirname + '/upload', uploadUrl: '/rest3d/upload/'});
  };
  FileInfo.prototype.validate = function () {
    if (this.options.minFileSize && this.options.minFileSize > this.size) {
      this.error = 'File is too small';
    } else if (this.options.maxFileSize && this.options.maxFileSize < this.size) {
      this.error = 'File is too big';
    } else if (this.options.acceptFileTypes && !this.options.acceptFileTypes.test(this.name)) {
      this.error = 'Filetype not allowed';
    }
    return !this.error;
  };
  FileInfo.prototype.safeName = function () {
    // Prevent directory traversal and creating hidden system files:
    this.name = path.basename(this.name).replace(/^\.+/, '');
    // Prevent overwriting existing files:
    while (fs.existsSync(this.options.uploadDir + '/' + this.name)) {
      this.name = this.name.replace(nameCountRegexp, nameCountFunc);
    }
  };
  FileInfo.prototype.initUrls = function (req) {
    if (!this.error) {
      var that = this,
        baseUrl = (this.options.ssl ? 'https:' : 'http:') +
          '//' + req.headers.host + this.options.uploadUrl;
      this.url = this.delete_url = baseUrl + encodeURIComponent(this.name);
      if (this.options.imageVersions)
        Object.keys(this.options.imageVersions).forEach(function (version) {
          if (fs.existsSync(
              that.options.uploadDir + '/' + version + '/' + that.name
            )) {
            that[version + '_url'] = baseUrl + version + '/' +
              encodeURIComponent(that.name);
          }
        });
    }
  };
  FileInfo.prototype.delete = function(){
    var fileName = this.name;
    fs.unlink(this.options.uploadDir + '/' + fileName, function (ex) {
      if (this.options.imageVersions)
        Object.keys(this.options.imageVersions).forEach(function (version) {
          fs.unlink(tbis.options.uploadDir + '/' + version + '/' + fileName);
        });
    });
  };

   module.exports = FileInfo;


