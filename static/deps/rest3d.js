var rest3d={};
rest3d.convert = function(_params, _cb) {
    var params=_params || {};
    var cb=_cb;

    $.post('/rest3d/convert', params.file)
    .done(function(data) {
      if (data) params.result = JSON.parse(data); 
      if (cb) cb(params);
    }).fail(function(data) {
        console.log("Error Converting "+params.file.name);
        params.error = JSON.parse(data.error().responseText);
        if (cb) cb(params);
    });
};