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
//rest3d.upload(url,)//url:'/rest3d/upload'

rest3d.upload = function(_params,_cb){
        var params=_params || {};
    var cb=_cb;
    $.post('/rest3d/upload', params.file)
    .done(function(data) {
      if (data) params.result = data; 
      if (cb) cb(params);
    }).fail(function(data) {
        console.log("fail upload!")
        // console.log("Error Converting "+params.files.name);
        // console.log(JSON.parse(data.error().responseText));
    });

}
    function getData(a){//
        console.debug(a.files[0].name);
    }
setTimeout(function(){
    console.debug("jaja");
    var data = {};
    data.files = [];
    data.files[0] = {};
    data.files[0].name = "test.js";
    data.files[0].content = "helloWorld!";
    rest3d.upload(data,getData);
},3000);
