/*

The MIT License (MIT)

Copyright (c) 2013 Rémi Arnaud - Advanced Micro Devices, Inc.

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
THE SOFTWARE.*/
define("rest3d", (function (global) {

var rest3d = this.rest3d = {};
rest3d.convert = function(_params, _cb) {
    var params=_params || {};
    var cb=_cb;

    $.post('/rest3d/convert', params.file)
    .done(function(data) {
      if (data) params.result = JSON.parse(data); 
      if (cb) cb(params);
    }).fail(function(data) {
        console.log("Error Converting "+params.file.name);
        console.log(JSON.parse(data.error().responseText));
    });
};

rest3d.getFileConverted = function(_file, _cb){
    var params="";
    var cb=_cb;

    $.get(_file)
    .done(function(data) {
      if (data) params = data; 
      if (cb) cb(params);
    }).fail(function(data) {
        console.log("Error Converting "+params.file.name);
        params.error = JSON.parse(data.error().responseText);
    });
};
//rest3d.upload(url,)//url:'/rest3d/upload
// _params must be an object from the upload file api: <File> Object
// _params = {file: 'File Object'}
// this is the only way to get a file from the client side, by selecting a file physically via an input HTML5 element.
// In this function, I hack a fake input element to use the fileupload plugin and send the file indicated from the "_params" paramater to the cloud.
rest3d.upload = function(_params,_cb){
    var params=_params || {};
    var cb=_cb;
    $input = $('<input id="fileupload" style="display:none;" type="file" name="files[]" multiple>');
    $("body").append($input);
    $input.fileupload({
        url: 'http://node.fl4re.com/rest3d/upload',
        dataType: 'json',
        autoUpload: false,
        acceptFileTypes: /(\.|\/)(dae|png|tga)$/i,
        maxFileSize: 100000000, // 100 MB
        loadImageMaxFileSize: 15000000, // 15MB
        disableImageResize: false,
        previewMaxWidth: 100,
        previewMaxHeight: 100,
        previewCrop: true,
    });
    var jqXHR = $input.fileupload('send', {files: _params.file})
    jqXHR.success(function (result, textStatus, jqXHR) {
        console.debug("upload successfull: "+result);
      if (result) params = result; 
      if (cb) cb(params)
    $input.remove();
})
    jqXHR.error(function (jqXHR, textStatus, errorThrown) {
        console.error("upload error: "+textStatus+", "+errorThrown);
        $input.remove();
})
}

// rest3d.testUpload = function(file){
//     function getData(a){//
//         // console.debug(a.file);
//     }
//     var data={};
//     data.file = file;
//     rest3d.upload(data,getData);
// }

return function () {
        return global.rest3d;
    };
}(this)));
