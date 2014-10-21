// Author: Binux<i@binux.me>
// http://binux.me
// Created on 2013-04-20 20:55:07

importScripts('./sha1.js');
self.onmessage = function(evt) {
	var data = evt.data;
	var req = new XMLHttpRequest();
	req.open('GET', data.blob, false);
	req.responseType = 'arraybuffer';
	req.send(null);
	self.postMessage({id: data.id,
	hash: sha1.hash(req.response),
	blob: data.blob});
	req.response = null;
};