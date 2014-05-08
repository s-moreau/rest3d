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
define(['jquery', 'rest3d', 'gltf', 'collada', 'viewer', 'q'], function ($, rest3d, glTF, COLLADA, viewer, Q) {

    function setViewer6Upload(upload) {
        var tree = upload.tree;
        var nodeRoot = upload.nodeRoot;
        this.upload = function(_json){
            function Upload(_json){
                this.id = _json.id;
                this.parent = _json.parent;
                this.url = _json.url;
                this.dropzone = _json.dropzone;
                if(_json.hasOwnProperty("idUser")){
                    this.idUser = _json.idUser;
                }
                this.generateHTML = function(){
                    this.html = "<div id='container_"+this.id+"' class='container'>";
                    this.html+="<input id='fileupload_"+this.id+"' style='display:none;' type='file' name='files[]' multiple>"
                }
                this.createWidget = function(){   
                    this.parent.append(this.html);
                    this.createJqueryObject();
                    var stock=this;
                    this.button = function(node){
                        $('#fileupload_'+stock.id).click();
                    };
                    
                    this.tree = tmp.uploadTree;
                    this[this.id].append("<hr>");//

                    this[this.id].append('<br><div id="fileArea_'+this.id+'"></div>');
                    this.createJqueryObject();
                    this.setting = GUI.button("Upload", this.filesArea);
                    this.refresh = GUI.button("Refresh", this.filesArea);
                    this.collection = GUI.button("Create collection", this.filesArea);
                    this.setting.css({"float":"right"})
                }

                this.callOnClick = function(cb){
                    if(this.button){
                        this.button.on('click',function(){
                        cb.call();
                    })
                    }
                }

                this.jqueryUpload = function(){
                    var stock = this;  
                    var json = {
                        url: stock.url,
                        dataType: 'json',
                        autoUpload: false,
                        acceptFileTypes: /(\.|\/)(dae|png|tga)$/i,
                        maxFileSize: 100000000, // 100 MB
                        loadImageMaxFileSize: 15000000, // 15MB
                        disableImageResize: false,
                        previewMaxWidth: 100,
                        previewMaxHeight: 100,
                        previewCrop: true,
                    };                                                                                                                                                         
                    stock.object = stock.upload1.fileupload(json);
                }
                this.createJqueryObject = function(){
                    this[this.id]=$('#container_'+this.id);
                    this.upload1 = $('#fileupload_'+this.id);
                    this.filesArea = $('#fileArea_'+this.id);
                    this.jquery = this.upload1;
                }
            }
            var tmp = new Upload(_json);
            tmp.generateHTML();
            tmp.createJqueryObject();
            tmp.createWidget();
            tmp.createJqueryObject();
            tmp.jqueryUpload();
            return tmp;
        }
        this.result = this.upload(upload);
        upload = this.result;

        return this.result;
    }
    return setViewer6Upload;

});