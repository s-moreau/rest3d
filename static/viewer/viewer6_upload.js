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
        var index;
        var id;
        var flag;
        var url = '/rest3d/upload';
        this.upload = function(_json){
            function Upload(_json){
                this.id = _json.id;
                this.parent = _json.parent;
                this.url = _json.url;
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
                        stock.callback(node);
                        $('#fileupload_'+stock.id).click();
                    };
                    // this[this.id].append("<hr>");

                    // this.dropzone = GUI.image(this[this.id],"image_"+this.id,"../gui/images/upload_d.png","100%","100px");
                    // GUI.addTooltip({
                    //         parent: this.dropzone,
                    //         content: "Drag&drop area",
                    //     });
                    // this[this.id].css("text-align","center");
                    
                    this.tree = tmp.uploadTree;
                    this[this.id].append("<hr>");//

                    this.progress = GUI.progress({
                        id:"progress_"+this.id,
                        parent:this[this.id],
                    });

                    this[this.id].append('<br><div id="fileArea_'+this.id+'"></div>');

                    this.optionLog= GUI.addCheckBox("uploadSetting", "Use log interface", this[this.id]);
                    this.setting = GUI.button("Upload", this.optionLog);
                    var ex = this.setting;
                    this.setting.css({"float":"right"})
                    this.optionLog.find('input').on("change",function(){
                        if($(this).is(':checked')){
                            $("#fileArea_"+this.id).hide();
                            ex.hide();
                     }
                     else{
                            $("#fileArea_"+this.id).show();
                            ex.show();
                    }      
                    });
                    this.optionLog.hide();
                    this.setting.hide();
                }
                    
                   // $('#fileArea_'+this.id).append('<div style="border: 1px solid grey; border-top: none; width:100%;" ><span style="float:left !important;">Fildsdsdsdsde</span></div>');
                
                this.getOptionLog = function(){
                    return this.optionLog.find('input').is(':checked');
                }

                this.callOnClick = function(cb){
                    if(this.button){
                        this.button.on('click',function(){
                        cb.call();
                    })
                    }
                }
                this.extensionToType=function(ext) {
                    var result;
                    switch (ext) {
                    case ".dae":
                        result = "collada";
                        break;
                    case ".DAE":
                        result = "collada";
                        break;
                    case ".json":
                        result = "gltf";
                        break;
                    case ".JSON":
                        result = "gltf";
                        break;
                    case ".png":
                        result = "texture";
                        break;
                    case ".jpeg":
                        result = "texture";
                        break;
                    case ".tga":
                        result = "texture";
                        break;
                    case ".jpg":
                        result = "texture";
                        break;
                    case ".glsl":
                        result = "shader";
                        break;
                    default:
                        result = "file";
                        break;
                    }
                    return result;
                }

                this.encodeStringToId=function(string) {
                    string = string.split(".").join("-");
                    string = encodeURIComponent(string);
                    string = string.split("%").join("z");
                    return string;
                }
                this.createNodeDatabase=function(file, parent) { //upload.createNodeDatabase file.name file.uuid file.collectionpath file.assetpath parent
                var stock = this;
                tree.jstree("create_node", parent, "inside", {
                    "data": file.name,
                    "attr": {
                        "id": "a_" + file.uuid,
                        "name": file.name,
                        "path": file.collectionpath + "/" + file.assetpath + "/" + file.name,
                        "collectionpath": file.collectionpath,
                        "assetpath": file.assetpath,
                        "rel": stock.extensionToType(file.name.match(/\.[^.]+$/)[0]),
                        "uploadstatus": true,
                    }
                }, false, true);
                file.idToTarget = "#a_" + file.uuid;
                if(file.hasOwnProperty("size"))
                {
                    GUI.addTooltip({
                        parent: $("#a_" + file.uuid),
                        content: "size: " + file.size,
                        //wait new tooltip for showing date + User fields
                    });
                }
                return $(file.idToTarget);
            }
            this.createCollection =  function(file, parent) {
                var id = this.encodeStringToId(file.collectionpath);
                parent.data({});
                if (!parent.data().hasOwnProperty(file.collectionpath)) {
                    var flagCollection = {};
                    flagCollection[file.collectionpath] = true;
                    parent.data(flagCollection);
                    tree.jstree("create_node", parent, "inside", {
                        "data": file.collectionpath,
                        "attr": {
                            "id": id,
                            "collectionpath": file.collectionpath,
                            "rel": "collection",
                            "uploadstatus": true,
                        }
                    }, false, true);
                }
                return $("#" + id);
            } 
                this.jqueryUpload = function(){
                    var stock = this;  
                    stock.dropzone = nodeRoot;
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
                    // if(this.idUser){
                    //     var idtmp = this.idUser;
                    //     json["beforeSend"]=function(xhr, data) {
                    //         xhr.setRequestHeader('X-idUser', idtmp);
                    //     }
                    // }                                                                                                                                                                   
                    stock.object = stock.upload1.fileupload(json);
                    // },50);

                }
                this.createJqueryObject = function(){
                    this[this.id]=$('#container_'+this.id);
                    this.upload1 = $('#fileupload_'+this.id);
                    this.filesArea = $('#fileArea_'+this.id);
                }
                function htmlSpan(parent,percentage,html){
                        if(!html){html="";}
                        var $result = $('<span style="display:inline-block !important; width:'+percentage+'% !important;">'+html+'</span>');
                        parent.append($result);
                        if(percentage<20)$result.addClass("btn-upload");
                        return $result;
                    }

                function htmlDiv(parent,head){
                        if(head){
                            var $result = $('<div style="border: 1px solid grey; width:100%;"></div>');}
                        else{
                            var $result = $('<div style="border: 1px solid grey; border-top:none; width:100%;"></div>');}
                        parent.append($result);
                        return $result;
                    }

                this.header = function(flag,button){
                    var stock = this;
                    var $follow = this.filesArea.append($('<br>'));
                    var $frame = $('<div class="upload_header"></div>');
                    this.filesArea.append($frame);
                    var $head = htmlDiv($frame,true);
                    if(flag&&typeof(flag)!="function"){
                        var $span = htmlSpan($head,90,GUI.time(true)+" convert "+flag);
                    }
                    else if(typeof(flag)=="function"&&button){
                        var $span = htmlSpan($head,80,GUI.time(true)+" Upload");
                    }
                    else{var $span = htmlSpan($head,90,GUI.time(true)+" Upload");}
                    if(typeof(flag)=="function"&&button){
                        var $spanButton1 = htmlSpan($head,10);
                        $spanButton1.append(button);
                    }
                    $span.css("font-weight","bold");
                    var $spanButton = htmlSpan($head,10);
                    var flag1 = flag;
                    var $j = $("<button>X</button>").on('click', function (){
                            $frame.hide();
                            stock.filesArea.children("br").last().remove();
                            if(typeof(flag1) == "function"){
                                flag1();
                            }
                    });
                    $spanButton.append($j);
                    $follow.hide();
                    $frame.hide();
                    $frame.tmp = $follow;
                    return $frame;
                };
                this.upload = function(parent,link,button,button1,button2){
                    parent.show();
                     parent.tmp.show();
                    var $newLine = htmlDiv(parent,false);
                    if(!button&&!button1&&!button2){
                        var $span = htmlSpan($newLine,100,link);
                        $span.css("text-align","left");}
                    else if(!button1&&!button2){
                        var $span = htmlSpan($newLine,90,link);
                        $span.css("text-align","left");
                        var $spanButton = htmlSpan($newLine,10);
                        $spanButton.append(button);
                          var arrowre = GUI.addIcon(button, "ui-icon-arrowrefresh-1-n", "", "before");
                        var array = ["ui-icon-arrowrefresh-1-n","ui-icon-arrowrefresh-1-e","ui-icon-arrowrefresh-1-s","ui-icon-arrowrefresh-1-w"]
                        button.click(function(){
                            var i = 1;
                            setInterval(function(){
                                if(i>3){i=0;}
                                arrowre.remove();
                                arrowre = GUI.addIcon(button, array[i], "", "before");
                                i++;
                            },500)
                        });
                    }
                    else{
                        var $span = htmlSpan($newLine,70,link);
                        $span.css("text-align","left");
                        var $spanButton = htmlSpan($newLine,10);
                        var tooltip = button1.html();
                        button1.html("");
                        GUI.addIcon(button1, "ui-icon-play", "", "before");
                        $spanButton.append(button1);
                        button1.addClass("btn-upload");
                        GUI.addTooltip({
                            parent: button1,
                            content: tooltip,
                        });
                        button1.hide();
                        var $spanButton2 = htmlSpan($newLine,10);
                        var tooltip = button.html();
                        button.html("");
                        GUI.addIcon(button, "ui-icon-newwin", "", "before");
                        $spanButton2.append(button);//
                         button.addClass("btn-upload");
                        GUI.addTooltip({
                            parent: button,
                            content: tooltip,
                        });
                        button.hide();

                        var $spanButton1 = htmlSpan($newLine,10);
                        var tooltip = button2.html();
                        button2.html("");
                        var arrowre = GUI.addIcon(button2, "ui-icon-arrowrefresh-1-n", "", "before");
                        $spanButton1.append(button2);
                        button2.addClass("btn-upload");
                        GUI.addTooltip({
                            parent: button2,
                            content: tooltip,
                        });
                        var array = ["ui-icon-arrowrefresh-1-n","ui-icon-arrowrefresh-1-e","ui-icon-arrowrefresh-1-s","ui-icon-arrowrefresh-1-w"]
                        button2.click(function(){
                            var i = 1;
                            setInterval(function(){
                                if(i>3){i=0;}
                                arrowre.remove();
                                arrowre = GUI.addIcon(button2, array[i], "", "before");
                                i++;
                            },500)
                        });
                    }
                    return $newLine;
                }
                this.download = function(parent,link,button){
                      parent.show();
                     parent.tmp.show();

                    var $newLine = htmlDiv(parent,false);
                    var $span = htmlSpan($newLine,90,link);
                    $span.css("text-align","left");
                    var $spanButton1 = htmlSpan($newLine,10);
                    var tooltip = button.html();
                    button.html("");
                    GUI.addIcon(button, "ui-icon-disk", "", "before");
                    button.addClass("btn-upload");
                    $spanButton1.append(button);
                    GUI.addTooltip({
                            parent: button,
                            content: tooltip,
                        });
                }
                this.convert = function(parent,link,launch,download,preview){
                      parent.show();
                     parent.tmp.show();
                    var $newLine = htmlDiv(parent,false);
                    var $span = htmlSpan($newLine,70,link);
                    $span.css("text-align","left");
                    var $spanButton1 = htmlSpan($newLine,10);
                    var tooltip = launch.html();
                    
               
                    launch.html("");
                    GUI.addIcon(launch, "ui-icon-play", "", "before");
                    $spanButton1.append(launch).addClass("btn-upload");
                    GUI.addTooltip({
                            parent: launch,
                            content: tooltip,
                        });
                    var width = $spanButton1.width();
                    //launch.width(width);

                    var $spanButton2 = htmlSpan($newLine,10);
                    tooltip = download.html();
                    width = download.parent().width();
                    download.html("");
                    GUI.addIcon(download, "ui-icon-disk", "", "before");
                    $spanButton2.append(download).addClass("btn-upload");
                    GUI.addTooltip({
                            parent: download,
                            content: tooltip,
                        });
                    width = $spanButton2.width();
                    // download.width(width);

                    var $spanButton3 = htmlSpan($newLine,10);
                    tooltip = preview.html();
                    preview.html("");
                    GUI.addIcon(preview, "ui-icon-newwin", "", "before");
                    $spanButton3.append(preview).addClass("btn-upload");
                    GUI.addTooltip({
                            parent: preview,
                            content: tooltip,
                        });
                    width = $spanButton3.width();
                    // preview.width(width);
                }
                // this.createInfo = function(name,href,button){
                //     var tmp = this.header();
                //     this.upload(tmp,"tefa.js",$("<button>Upload</button>"))
                //     this.convert(tmp,"tefadsssss.js",$("<button>Dialog</button>"),$("<button>Display</button>"),$("<button>Downlo</button>"))
                // }
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

        function callbackConvert(data) {
            var buffer = data;
            // $this.prop('disabled',true);
            if (data.result.output) {
                console.debug(data.result.output);
            }
            if (data.result.code) {
                ("Exit code: " + data.result.code);
            }
            if (data.error) {
                var span = $('<p><span><b>Error code=' + data.error.code + ' :: ' + data.error.message + '</b></span></p>');
                data.context.append(span);
            }
            else {
                // ennumerate all resulting files
                if (upload.getOptionLog()) {
                    var $conve = upload.header(data.file.name);
                    $.each(data.result.files, function (index, file) {
                        var href = $('<a style="display:none" href="/rest3d/' + decodeURIComponent(file.name) + '" target="_blank"></a>');
                        upload.filesArea.append(href);
                        var $download = $("<button>Download</button>").on("click", function () {
                            href[0].click();
                            href[0].remove();
                        });

                        var url = '/rest3d/' + decodeURIComponent(file.name);
                        var ext = url.match(/\.[^.]+$/);
                        if (ext == ".json") {
                            var $dialog = $("<button>Launch</button>").on("click", function () {
                                window.pleaseWait(true);
                                glTF.load(url, viewer.parse_gltf).then(
                                    function (flag) {
                                        window.pleaseWait(false);
                                        window.notif(url);
                                    })
                            });
                            var $preview = $("<button>Peview</button>").on("click", function () {
                                $("#dialog").dialog("close");
                                var gitHtml = '<div id="dialog"><iframe id="myIframe" src="" style="height:99% !important; width:99% !important; border:0px;"></iframe></div>';
                                gitPanel = $('body').append(gitHtml);
                                $("#dialog").dialog({
                                    width: '600',
                                    height: '500',
                                    open: function (ev, ui) {
                                        $('#myIframe').attr('src', '/viewer/easy-viewer.html?file=/rest3d/' + decodeURIComponent(file.name));
                                    },
                                    // close: function(){
                                    //     gitHtml.remove();},
                                });
                            });
                            upload.convert($conve, formatName(data, file), $dialog, $download, $preview);
                        }
                        else {
                            upload.download($conve, formatName(data, file), $download); //
                        }
                    });
                }
                else {
                    var e = {};
                    e.idToDrop = "c_" + viewer.idUser;
                    sortAssetDrop(e, buffer.result);
                    window.visualize(buffer.result);
                }
            }
        }

        function encodePathToId(path) {
            path = path.replace("/rest3d/upload/" + viewer.idUser + "/", "");
            path = encodeURIComponent(path).split('%').join('').split('.').join('');
            return path;
        }

        function uniqueName(name, parent) {
            var splitName = name.split('.');
            var rmp = parent.attr('path') + "/" + splitName[0] + "Bis." + splitName[1];
            rmp = encodePathToId(rmp);
            if ($("#a_" + rmp).length == 1) {
                name = uniqueName(splitName[0] + "Bis." + splitName[1], parent);
                return name;
            }
            else {
                return splitName[0] + "Bis." + splitName[1];
            }
        }

        function Buffer() {
            this.bufferDae = false;
            this.bufferNode = []
            this.array = [];
            this.flag = true;
            this.flagNode = true;
            this.nodeFolder = false;
            this.buttonToReplace = {};
            var stock = this;
            this.removeNodes = function () {
                if (stock.flag) {
                    for (var j = 0; j < stock.bufferNode.length; j++) {
                        if ($(stock.bufferNode[j]).attr("uploadstatus") !== "true") {
                            tree.jstree("delete_node", $(stock.bufferNode[j]));
                        }
                    }
                }
            }
            this.button = $("<button>Upload</button>");
            this.header = upload.header(this.removeNodes, this.button);
            this.upload = [];
            var stock = this;
        }

        var sortAssetDrop = function (e, data, mode) {
            var defer = Q.defer();
            if (!upload.getOptionLog()) {
                upload.filesArea.children("br").last().remove();
            }
            upload.setting.show();
            upload.optionLog.show();
            data.tmp = new Buffer(); //buffer.bufferNode.push

            function createNode(parent, name, file) {
                var attr = parent.attr("rel");
                var children = parent.children("ul").children("li");
                var flag = 0;
                if (name.split('.').length > 1) { //if fichier
                    var index = "a";
                    ext = name.match(/\.[^.]+$/)[0];
                    var ext = upload.extensionToType(ext);
                    // if (ext == "collada" || ext == "gltf") {
                    //     parent.attr("id", "m_" + encodePathToId(parent.attr('path')));
                    //     parent.attr("rel", "model");
                    // }

                }
                else if (attr == "model" || attr == "child") {
                    var index = "a";
                    var flag1 = true;
                }
                else { // if folder
                    var index = "c";
                }
                for (var z = 0; z < children.length; z++) {
                    var nameSplitFolder = $(children[z]).attr("file");
                    if (nameSplitFolder == name) {
                        flag = children[z].id;
                    }
                }
                var rel;
                if (ext) {
                    rel = ext;
                }
                else if (attr == "model" || attr == "child") {
                    rel = "child";
                }
                else {
                    rel = "collection"
                }
                if (flag == 0) {
                    var rmp = parent.attr('path') + "/" + name;
                    rmp = encodePathToId(rmp);
                    var id = index + "_" + rmp;
                    rmp = tree.jstree("create_node", parent, "inside", {
                        "data": name,
                        "attr": {
                            "id": id,
                            "file": name,
                            "rel": rel,
                            "uploadstatus": false,
                        }
                    }, false, true);
                    data.tmp.bufferNode.push(rmp);
                    file.relativePath = rmp;
                    return id;
                }
                else {
                    if (index == "a" && !flag1) {
                        name = uniqueName(name, parent);
                        var rmp = parent.attr('path') + "/" + name;
                        rmp = encodePathToId(rmp);
                        flag = index + "_" + rmp;
                        rmp = tree.jstree("create_node", parent, "inside", {
                            "data": name,
                            "attr": {
                                "id": flag,
                                "file": name,
                                "rel": rel,
                                "uploadstatus": false,
                            }
                        }, false, true);
                        data.tmp.bufferNode.push(rmp);
                        file.relativePath = rmp;
                    }
                    return flag;
                }
            }

            function parsePath(file, parent) {
                if (mode) {
                    var result = [""];
                }
                else {
                    try {
                        var result = file.relativePath.split("/");
                    }
                    catch (err) {
                        var result = file.path.replace("upload/", "").split("/");
                    }
                }

                for (var i = 0; i < result.length; i++) {
                    if (result[i] != "" && result[i].indexOf('.') == -1) {
                        var id = createNode(parent, result[i], file);
                        parent = $("#" + id);
                    }
                    else {
                        createNode(parent, file.name, file);
                        if (mode) {
                            parent = $("#" + mode.attr("id"));
                        }
                        else {
                            parent = $("#" + e.idToDrop);
                        }
                    }
                }
                return parent;
            }
            var tmp="";
            function parsePathDatabase(file, parent) {
                // var collection = file.collectionpath;
                var origin = parent;
                var relativePath = file.assetpath;
                if(file.collectionpath !== ""){
                    parent = upload.createCollection(file, parent);
                }
                if (file.assetpath == "") {
                    upload.createNodeDatabase(file, parent);
                    parent = origin;
                }
                else {
                    relativePath = relativePath.split("/");
                    for (var z = 0; z < relativePath.length; z++) {
                        if (z !== relativePath.length - 1) { //if folder
                            file.collectionpath = relativePath[z];
                            parent = upload.createCollection(file, parent);
                        }
                        else { //if file
                            file.path = tmp+'/'+relativePath[z];
                            upload.createNodeDatabase(file, parent);
                            parent = origin;
                        }
                    }
                    tmp = tmp + "/" + relativePath[z];
                }
                return parent;
            }

            if (mode) {
                var parent = $("#" + mode.attr("id"));
            }
            else if (e.hasOwnProperty("idDatabase")) {
                var parent = $("#" + e.idDatabase)
            }
            else {
                var parent = $("#" + e.idToDrop);
            }
            if (mode || (!mode && e.idToDrop != undefined)) {
                $.each(data.files, function (index, file) {
                    parent = parsePath(file, parent);
                });
            }
            else {
                // e.preventDefault();
                // var buf = parent;
                for (var i = 0; i < data.length; i++) {
                    parsePathDatabase(data[i], $("#c_" + viewer.idUser));
                }
            }
            defer.resolve();
            tree.jstree('open_all');
            return defer.promise;
        }

        window.visualize = function (data) {
            $.each(data.files, function (index, file) {
                var url = file.relativePath;
                url.attr("uploadstatus", true);
                url.append("<img style='float:right;' src='../gui/images/accept.png' >");
                $(url).data({
                    file: file,
                });
            });
        }

        window.visualizeDatabase = function (data) {
            for (var z = 0; z < data.length; z++) {
                var url = $(data[z].idToTarget);
                url.attr("uploadstatus", true);
                url.append("<img style='float:right;' src='../gui/images/accept.png' >");
                $(url).data({
                    file: data[z],
                });
            }
        }

        setTimeout(function () {
            upload.object.fileupload('option', 'dropZone', nodeRoot);
            upload.object.bind('fileuploaddrop', function (e, data) {
                window.pleaseWait(true);
                sortAssetDrop(e, data).then(function () {
                    window.pleaseWait(false);
                })
            });
        }, 1000);

        upload.callback = function (node) {
            this.object.off('fileuploadchange');
            this.object.on('fileuploadchange', function (e, data) {
                window.pleaseWait(true);
                sortAssetDrop(e, data, node).then(function () {
                    window.pleaseWait(false);
                })
            })
        }
        var uploadButton = $('<input type="checkbox" style="float:right;">')
            .addClass('btn'),
            // show the name of the file nicely
            formatName = function (data, file) {
                var i = file.name.lastIndexOf('/');
                return file.name.substring(i + 1);
            },
            convertButton = $('<button/>')
                .addClass('btn')
                .prop('disabled', true)
                .on('click', function () {
                    var $this = $(this),
                        data = $this.data();
                    $this
                        .off('click')
                        .prop('disabled', true)
                    // user rest to convert dae into glTF
                    rest3d.convert(data, callbackConvert);
                });

        upload.object.on('fileuploadadd', function (e, data) {
            var buffer = data.tmp;
            upload.object = $(this);
            data.context = buffer.header;
            data.buttonToReplace = [];
            var button;
            $.each(data.files, function (index, file) {
                var ext = file.name.match(/\.[^.]+$/);
                var url = "default";
                button = uploadButton.clone(true).data(data);
                var stock = function (object) {
                    data = button.data();
                    data.submit();
                    buffer.button.unbind('click', main);
                }

                    function main() {
                        stock(data.tmp);
                    }
                button.on('change', function () {
                    if ($(this).is(':checked')) {
                        buffer.button.bind('click', main);
                    }
                    else {
                        buffer.button.unbind('click', main);
                    }
                });
                setTimeout(function () {
                    button.click()
                }, 1000);
                if (ext == null) {
                    ext = [];
                    ext[0] == "unknown"
                }
                if (ext[0] == ".dae" || ext[0] == ".DAE") {

                    var $dialog = $("<button>Launch</button>").on("click", function () {
                        window.pleaseWait(true);
                        COLLADA.load(url, viewer.parse_dae).then(
                            function (flag) {
                                window.pleaseWait(false);
                                buffer.notif(url);
                            })
                    })
                        .prop("id", "dialog" + index);
                    var $preview = $("<button>Preview</button>").on("click", function () {
                        $("#dialog").dialog("close");
                        var gitHtml = '<div id="dialog"><iframe id="myIframe" src="" style="height:99% !important; width:99% !important; border:0px;"></iframe></div>';
                        gitPanel = $('body').append(gitHtml);
                        $("#dialog").dialog({
                            width: '600',
                            height: '500',
                            open: function (ev, ui) {
                                $('#myIframe').attr('src', '/viewer/easy-viewer.html?file=' + url);
                            },
                        });
                    })
                        .prop("id", "preview" + index);
                    var array = [];
                    var newLine = upload.upload(buffer.header, file.name, $preview, $dialog, button);
                    if (!upload.getOptionLog()) {
                        buffer.header.hide()
                    }
                    $('#dialog' + index).hide();
                    $('#preview' + index).hide();
                    // rest3d.testUpload(file);
                }
                else {
                    var newLine = upload.upload(buffer.header, file.name, button);
                    if (!upload.getOptionLog()) {
                        buffer.header.hide()
                    }
                }
                setTimeout(function () {
                    url = file.relativePath;
                    if (!upload.getOptionLog()) {
                        url.append(button);
                    };
                    url = url.attr("path");
                    newLine.append("<a>" + url + "</a>");
                    upload.setting.on("click", function () {
                        buffer.button.click();
                    })
                }, 1000);
            });
            data.tmp = buffer;
            data.buttonToReplace.push(button);
        }).on('fileuploadprocessalways', function (e, data) {
            var indexI = data.index,
                file = data.files[indexI],
                node = $(data.context.children('div')[index + 1]);
            if (file.preview) {
                node
                    .prepend('<br>')
                    .prepend(file.preview); //
            }
            if (file.error) {
                GUI.addTooltip({
                    parent: node.find('button'),
                    content: file.error,
                });
            }
            if (indexI + 1 === data.files.length) {
                node.find('button')
                    .prop('disabled', !! data.files.error);
            }
            index++;
        }).on('fileuploadprogressall', function (e, data) {
            var progress = parseInt(data.loaded / data.total * 100, 10);
            upload.progress.setValue(progress);
        }).on('fileuploaddone', function (e, data) {
            var buffer1 = data.tmp;
            $.each(data.result, function (index, file) {
                data.buttonToReplace[index].parent().data({
                    file: file,
                    context: data.context,
                })
                if (upload.getOptionLog()) {
                    file.assetName = data.result[index].name;

                    var $node = convertButton.clone(true).data({
                        file: file,
                        context: data.context,
                    })
                    data.buttonToReplace[index]
                        .replaceWith($node)
                        .prop("id", "nodeClose");
                    GUI.addIcon($node, "ui-icon-check", "", "before");
                    $node.parent().parent().show().find("button").show();
                    var ext = file.name.match(/\.[^.]+$/);
                    if (ext != null) {
                        if (ext[0] == ".dae" || ext[0] == ".DAE") {
                            $node.prop('disabled', false);
                        }
                    }
                }
                else {
                    data.buttonToReplace[index].replaceWith("<img style='float:right;' src='../gui/images/accept.png' >");
                }
            });

        }).on('fileuploadfail', function (e, data) {
            console.error("fail!");
            // if (!data.result) {
            //     $(data.context.children()[0])
            //         .append('<br>')
            //         .append('error communicating with server')
            //         .find('button').remove();
            // }
            // else {
            //     $.each(data.result.files, function (index, file) {
            //         var error = $('<span/>').text(file.error);
            //         $(data.context.children()[index])
            //             .append('<br>')
            //             .append(error)
            //             .find('button').remove();
            //     });
            // }
        });

        upload.object.fileupload("option", "beforeSend", function (xhr, data) {
            // console.debug(data);
            var node = data.files[0].relativePath;
            node.attr("uploadstatus", true);
            node.parent().parent().attr("uploadstatus", true);
        });

        upload.object.fileupload("option", "done", function (e, data) {
            // data.files[0].relativePath.attr("id", data.result.files[0].assetId);
            // console.debug(data.result[0]);
            var object = data.result;
            var e = {};
            e.idDatabase = "c_" + viewer.idUser;
            data.files[0].relativePath.remove();
            sortAssetDrop(e, object);
            window.visualizeDatabase(object);


        });
        return this.result;
    }
    return setViewer6Upload;

});