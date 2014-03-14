// adapted from https://github.com/joehewitt/diskcache
/*
Copyright 2011 Joe Hewitt

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
 
   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/*
The MIT License (MIT)

Copyright (c) 2013 Advanced Micro Devices, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var D;

var crypto = require('crypto');
var path = require('path');
var events = require('events');
var fs = require('fs');
var url = require('url');
var _ = require('underscore');
var async = require('async');
var dandy = require('dandy/errors');
var abind = require('dandy/errors').abind;
var compress = null; // can't get npm to install compress on windows.
var mkdirp = require('mkdirp');

// create/delete tmp upload dirs
var rmdirSync = function(dir) {
	if (!fs.existsSync(dir)) return;
	var list = fs.readdirSync(dir);
	for(var i = 0; i < list.length; i++) {
		var filename = path.join(dir, list[i]);
		var stat = fs.statSync(filename);
		
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

// *************************************************************************************************

/**
 * Disk cache manages an cache on disk and optionally in memory.
 *
 * Any object which can be converted to JSON can be stored.
 */
function Cache(cachePath, useDisk, useMem, useGzip) {
    events.EventEmitter.call(this);

	this.cachePath = cachePath;
	this.useMem = useMem;
	this.useDisk = useDisk;
	this.useGzip = false; // useGzip; - no compress available
	this.removeTrailingSlash = true;
	this.memCache = {};
	this.memCacheDirs = {};
	this.locks = {};
	this.monitors = {};
	if (cachePath) {
		rmdirSync(cachePath);
		//fs.mkdirSync(cachePath);
		mkdirp.sync(cachePath);
	}
}
exports.Cache = Cache;

function subclass(cls, supercls, proto) {
    cls.super_ = supercls;
    cls.prototype = Object.create(supercls.prototype, {
        constructor: {value: cls, enumerable: false}
    });
    _.extend(cls.prototype, proto);
}

subclass(Cache, events.EventEmitter, {
	/**
	 * See if we have a cache hit, if we do, return filename
	*/
	hit: function(URL, cb){
		URL = this._normalizeURL(URL);
		var locks = this.locks[URL];
		if (locks) {
			D&&D('Wait for lock on', URL);
			console('Wait for lock')
			locks.push(cb);
		} else {
			if (URL in this.memCache) {
				return cb(new Error("Cached in memory!"));
			} else if (this.useDisk) {
				var keys = this._keysForURL(URL);
				console.log('calling readFile '+keys.path+'.meta.json');

				//return
				fs.readFile(keys.path+'.meta.json', _.bind(function(err, jsonData) {
					console.log('in readFile ['+jsonData+']')
					if (err || !jsonData || !jsonData.length) return cb ? cb(err) : 0;
					var entry = JSON.parse(jsonData);
					console.log('FOUND cache with content-type='+entry.headers['content-type'])
					
					entry.filename = keys.path+'.bin';
					console.log('filename='+entry.filename)
					return cb(0,entry);
				}));
			
			} else
			{
				console.log('prout')
			 cb(new Error("Not found in cache"));	
			}
		}
	},
	/**
	 * Loads the entry for a URL from the cache.
	 *
	 * If useGzip is true and cached object has a body property, the result
	 * will have a bodyZipped property that is a zipped buffer.
	 */
	load: function(URL, cb) {
		URL = this._normalizeURL(URL);
		var locks = this.locks[URL];
		if (locks) {
			D&&D('Wait for lock on', URL);
			console.log('wait for lock')
			locks.push(cb);
		} else {
			if (URL in this.memCache) {
				cb(0, this.memCache[URL]);
			} else if (this.useDisk) {
				var keys = this._keysForURL(URL);
				D&&D('Try to load', keys.path, 'for', URL);
				console.log('try to load')
				fs.readFile(keys.path+'.meta.json', _.bind(function(err, jsonData) {
					if (err || !jsonData || !jsonData.length) return cb ? cb(err) : 0;
					
					var entry = JSON.parse(jsonData);

					async.waterfall([
						_.bind(function(next) {
							fs.readFile(keys.path+'.bin', next);
						}, this),

						// XXX-I don't understand this - what is data? why do we store inside load()?
						_.bind(function(data, next) {
							entry.body = data;
							this._storeAndZip(URL, keys, entry, cb);
						}, this),
					]);
				}, this));				
			} else {
				cb(new Error("Not found in cache"));
			}
		}
	},
	
	/**
	 * Stores data in cache.
	 */	
	store: function(URL, entry, cb) {
		URL = this._normalizeURL(URL);
		var keys = this._keysForURL(URL);
		


		// Make a copy that doesn't have the body property
		/* keep headers only?
		var entryCopy = {};
		for (var name in entry) {
			if (name != 'body' && name != 'bodyZipped' && name !='socket' && name !='connection') {
				entryCopy[name] = entry[name];
			}
		}
		*/
		var entryCopy = {};
		entryCopy['headers']=entry.headers;
	
		async.parallel([
			_.bind(function(next) {
				if (this.useDisk) {
					var jsonData = JSON.stringify(entryCopy);
					fs.writeFile(keys.path+'.meta.json', jsonData, 'utf8', next);
				} else {
					next(0);
				}
			}, this),

			_.bind(function(next) {
				if (this.useDisk && entry.body) {
					fs.writeFile(keys.path+'.bin', entry.body, 'binary', next);
				} else {
					next(0);
				}
			}, this),

			_.bind(function(next) {
				entry.filename = keys.path+'.bin';
				this._storeAndZip(URL, keys, entry, next);
			}, this)			
		],
		abind(function(err) {
			if (cb) {
				cb(err, entry);
			}
			this.unlock(URL, entry);
		}, cb, this));
	},

	/**
	 * Removes cached data for a url.
	 */
	remove: function(URL, cb) {
		URL = this._normalizeURL(URL);
		var keys = this._keysForURL(URL);

		if (this.useMem) {
			for (var leafURL in keys.mem) {
				delete this.memCache[leafURL];
				delete keys.mem[leafURL];
			}
		}

		if (this.useDisk) {
			D&&D('Remove', path.dirname(keys.path), 'for', URL);	
			rmdirSync(path.dirname(keys.path));

			if (cb) cb(err);

		}
	},
	
	/**
	 * Removes all files in the cache for a directory.
	 */
	removeAll: function(URL, cb) {
		if (URL) {
			URL = this._normalizeURL(URL);
			var keys = this._keysForURL(URL, true);
			try {
				if (this.useDisk) {
					rmdirSync(keys.path);

						if (cb) cb(err);

				}

				if (this.useMem) {
					this._removeMemBranch(keys.mem);
				}
			} catch (exc) {
				dandy.logException(exc);
			}
		} else {
			if (this.useDisk && this.cachePath) {
				rmdirSync(this.cachePath);

					if (cb) cb(err);

			}

			if (this.useMem) {
				this.memCache = {};
				this.memCacheDirs = {};
			}
		}
	},

	/**
	 * Locks a URL so that it can't be accessed until it is stored.
	 */	
	lock: function(URL) {
		URL = this._normalizeURL(URL);
		D&&D('Lock', URL);
		this.locks[URL] = [];
	},

	/**
	 * Unlocks a URL and dispatches its new value to callbacks waiting on the lock.
	 */	
	unlock: function(URL, data) {
		URL = this._normalizeURL(URL);
		D&&D('Unlock', URL);
		var callbacks = this.locks[URL];
		if (callbacks) {
			delete this.locks[URL];

			callbacks.forEach(function(cb) {
				cb(0, data);
			});
		}
	},

	/**
	 * Invalidates a given URL when changes affect dependent files.
	 *
	 * @dependencies An array of file paths to start monitoring.
	 */
	monitor: function(URL, dependencies, cb) {
		URL = this._normalizeURL(URL);
		var mon = _.bind(function() {
			_.each(dependencies, _.bind(function(depPath) {
				var monitors = this.monitors[depPath];
				if (monitors) {
					var index = monitors.indexOf(mon);
					monitors.splice(index, 1);
					if (!monitors.length) {
						D&&D('Unwatch', depPath, URL);
						fs.unwatchFile(depPath);
						delete this.monitors[depPath];
					}
				}
			}, this));

			this.remove(URL);
			if (cb) { cb(0, URL); }				
			this.emit('unmonitor', {url: URL});
		}, this);

		_.each(dependencies, _.bind(function(depPath) {
			D&&D('Watch', depPath, URL);
			if (depPath in this.monitors) {
				this.monitors[depPath].push(mon);
			} else {
				this.monitors[depPath] = [mon];	

				fs.watchFile(depPath, {interval: 0}, _.bind(function(curr, prev) {
					if (curr.mtime.getTime() != prev.mtime.getTime()) {
						D&&D("Modified", depPath, curr.mtime);
						_.each(this.monitors[depPath].slice(), function(fn) { fn(); });
					}
				}, this));					
			}
		}, this));
	},

	/**
	 * Stops monitoring changes to files for a given url.
	 *
	 * @dependencies An array of file paths to stop monitoring.
	 */
	unmonitor: function(URL, dependencies) {
		URL = this._normalizeURL(URL);
		_.each(dependencies, function(depPath) {
			fs.unwatchFile(depPath);
		});
		this.emit('unmonitor', {url: URL});
	},

	_keysForURL: function(URL, justDirectory) {
		var keys = {};
		var hash = this._hashForURL(URL);

		var U = url.parse(URL);
		var cachePath = path.join(this.cachePath, U.pathname);

		if (this.useDisk && this.cachePath) {
			//fs.mkdirSync(cachePath);
			mkdirp.sync(cachePath);
		}

		if (this.useMem) {
			var parts = U.pathname ? U.pathname.split('/') : [];
			if (parts[0] === '') {
				parts.splice(0, 1);
			}
			var dir = this.memCacheDirs;
			_.each(parts, function(part) {
				if (part in dir) {
					dir = dir[part];
				} else {
					dir = dir[part] = {};
				}
			});
			keys.mem = dir;
		}

		if (justDirectory) {
			keys.path = cachePath;
		} else {
			keys.path = path.join(cachePath, hash);
		}

		return keys;
	},

	_hashForURL: function(URL) {
		var hash = crypto.createHash('md5');
		hash.update(URL);
		return hash.digest('hex');
	},

	_storeInMemCache: function(URL, keys, entry) {
		this.memCache[URL] = entry;
		keys.mem[URL] = 1;
		// D&&D('Stored', URL, 'in', require('util').inspect(this.memCacheDirs, false, 100));
	},

	_removeMemBranch: function(branch) {
		for (var branchURL in branch) {
			delete this.memCache[branchURL];
			this._removeMemBranch(branch[branchURL]);
			delete branch[branchURL];
		}		
	},

	_storeAndZip: function(URL, keys, entry, cb) {
		if (this.useMem) {
			if (this.useGzip && entry.body) {
				var gzip=new compress.Gzip;
				gzip.init();
				
				var encoding = 'binary';
				if (entry.charset && entry.charset.toLowerCase() == 'utf-8') {
					encoding = 'utf8';
				}

				var buf1 = gzip.deflate(entry.body, encoding);
		    	var buf2 = gzip.end();
		    	entry.bodyZipped = new Buffer(buf1+buf2, 'binary');
	    		
	    		this._storeInMemCache(URL, keys, entry);
	    		process.nextTick(function() {
					cb(0, entry, true);	    			
	    		})
		    } else {
				this._storeInMemCache(URL, keys, entry);
				cb(0, entry, true);
		    }
		} else {
			cb(0, entry, true);
		}		
	},
	
	_normalizeURL: function(URL) {
		var U = url.parse(URL, true);
		
		// Remove trailing slash
		if (this.removeTrailingSlash & U.pathname && U.pathname.substr(-1) == '/') {
			U.pathname = U.pathname.substr(0, U.pathname.length-1);
		}

		// Put query key/value pairs in sorted order
		var keys = _.keys(U.query).sort();
		var parts = [];
		_.each(keys, function(name) {
			var value = U.query[name];
			if (value) {
				parts.push(name + '=' + value);
			} else {
				parts.push(name);
			}
		});

		// Re-assemble URL without the protocol or host sections
		if (parts.length) {
			return U.pathname + '?' + parts.join('&');
		} else {
			return U.pathname;
		}
	},

});

exports.Cache = Cache;
