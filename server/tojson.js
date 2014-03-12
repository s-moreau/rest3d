function toJSON(o) {
    var cache = [];
	var result = JSON.stringify(o, function(key, value) {
		if (typeof value === 'object' && value !== null) {
        if (cache.indexOf(value) !== -1) {
            // Circular reference found, discard key
            return;
        }
        // Store value in our collection
        cache.push(value);
    }
	    return value;
	});
	cache = null; // Enable garbage collection
	return result;
};
module.exports = toJSON;