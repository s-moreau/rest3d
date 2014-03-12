'use strict';

var fs = require('fs');
var path = require('path');
// create/delete tmp upload dirs
var rmdirSync = function(dir) {
	if (!fs.existsSync(dir)) return;
	var list = fs.readdirSync(dir);
	for(var i = 0; i < list.length; i++) {
		var filename = path.join(dir, list[i]);
		var stat = fs.lstatSync(filename);
		
        if(stat.isDirectory()) {
			// rmdir recursively
			rmdirSync(filename);
		} else {
			// rm fiilename
			fs.unlinkSync(filename);
		}
	}
	fs.rmdirSync(dir);
};

module.exports = rmdirSync;


