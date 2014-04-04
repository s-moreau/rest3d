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
//
define(['jquerymin', 'rest3d', 'gltf', 'collada', 'viewer','q'], function ($, rest3d, glTF, COLLADA, viewer,Q) {

    function setViewer6Upload($, upload, rest3d, viewer) {
        // window.header=false;
        var index;
        var id;
        var flag;
        // window.bufferNode=[];
        // window.buffer = []; 
        // window.bufferDae = false; 
        //"#uploadTree").bind('before.jstree', function(event, data){ 
        //          console.log(data.plugin + ' fired:' + data.func); 
        // if(data.plugin == 'dnd'){ 
        //         switch(data.func){ 
        //                 case('start_drag'): 
        //                         console.log(data.plugin + ' fired:' + data.func); 
        //                         break; 
        //                 case('dnd_finish'): 
        //                         console.log(data.plugin + ' fired:' + data.func); 
        //                         break; 
        //         } 
        // } 
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
                        if($(stock.bufferNode[j]).attr("uploadstatus")!=true){
                            $("#uploadTree").jstree("delete_node", $(stock.bufferNode[j]));
                        }
                    }
                }
            }
            this.button = $("<button>Upload</button>");
            this.header = upload.header(this.removeNodes,this.button);
            this.upload = [];
            var stock = this;
            // this.link = upload.upload(this.header, "Upload selection",this.button);
        }

        var url = '/rest3d/upload';
        var uploadButton = $('<input type="checkbox">')
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
                    var callback = function (data) {
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
                            var $conve = upload.header(data.file.name);
                            $.each(data.result.files, function (index, file) {
                                var href = $('<a style="display:none" href="/rest3d/upload/' + decodeURIComponent(file.name) + '" target="_blank"></a>');
                                upload.filesArea.append(href);
                                var $download = $("<button>Download</button>").on("click", function () {
                                    href[0].click();
                                    href[0].remove();
                                });

                                var url = '/rest3d/upload/' + decodeURIComponent(file.name);
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
                                                $('#myIframe').attr('src', '/viewer/easy-viewer.html?file=/rest3d/upload/' + decodeURIComponent(file.name));
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
                    }
                    rest3d.convert(data, callback);
                });
        // var sortAsset = function (e, data, node) {
        //     $("#uploadTree").jstree('open_all');
        //     data.tmp = new Buffer();
        //     var sort = [];
        //     var stock = [];
        //     $.each(data.files, function (index, file) {
        //         var ext = file.name.match(/\.[^.]+$/);
        //         if (ext[0] == ".dae" || ext[0] == ".DAE") {
        //             sort.unshift(file);
        //         }
        //         else {
        //             sort.push(file);
        //         }
        //     });
        //     data.files = sort;
        //     var ext = sort[0].name.match(/\.[^.]+$/)[0];
        //     var filename = sort[0].name.split('.');
        //     var tmp = {};
        //     tmp.name = 'X-iduser';
        //     tmp.value = viewer.idUser;
        //     stock.push(tmp);
        //     if (ext == ".dae" || ext == ".DAE") {
        //         var tmp = {};
        //         tmp.name = 'X-folder';
        //         tmp.value = filename[0];
        //         stock.push(tmp);
        //     }
        //     else {
        //         if (node.attr("id") != viewer.idUser) {
        //             var tmp = node.attr("id").split("_folder_");
        //             var obj = {};
        //             obj.name = 'X-folder';
        //             obj.value = tmp[1];
        //             stock.push(obj);
        //             data.tmp.nodeFolder = tmp[1];
        //             data.tmp.flagNode = false;
        //         }
        //     }
        //     data.tmp.array = stock;
        //     setTimeout(function () {
        //         upload.object.fileupload("option", "beforeSend", function (xhr, data) {
        //             for (var i = 0; i < data.tmp.array.length; i++) {
        //                 xhr.setRequestHeader(data.tmp.array[i].name, data.tmp.array[i].value);
        //             }
        //         });
        //     }, 500);
        // }
        var numberUser = viewer.idUser.split("_")[1]
        var sortAssetDrop = function (e, data,mode) {
            var defer = Q.defer();
            data.tmp = new Buffer();//buffer.bufferNode.push
            function extensionToType (ext){
                var result;
                switch (ext){
                    case ".dae":
                        result="collada";break;
                    case ".DAE":
                        result="collada";break;
                    case ".json":
                        result="gltf";break;
                    case ".JSON":
                        result="gltf";break;
                    case ".png":
                        result="texture";break;
                    case ".jpeg":
                        result="texture";break;
                    case ".tga":
                        result="texture";break;
                    case ".jpg":
                        result="texture";break;
                    case ".glsl":
                        result="shader";break;
                    default:
                        result="file";break;
                }
                return result;       
            }
            function createNode(parent,name){
                var attr = parent.attr("rel");
                var children = parent.children("ul").children("li");
                var flag = 0;
                var nickname = name.replace("__","");
                nickname = nickname.replace("_","");
                if(name.split('.').length>1){ //if fichier
                    var index = "a";
                    ext =  name.match(/\.[^.]+$/)[0];
                    var ext = extensionToType(ext);
                    if (ext == "collada" || ext == "gltf"){
                        parent.attr("id","m_"+parent.attr('id').split("_")[1]+"_"+parent.attr('id').split("_")[2]);
                        parent.attr("rel","model");
                    }
                    nickname = nickname.replace(".","-");
                }
                else if(attr=="model"||attr=="child"){
                    var index = "a";
                    var flag1 = true;
                }
                else{ // if folder
                    var index = "c";
                }
                for(var z=0;z<children.length;z++){
                    var nameSplitFolder = children[z].id.split("_");
                    if(nameSplitFolder[1]==nickname){
                        flag=children[z].id;
                    }
                }
                var rel;
                if(ext){rel = ext;}
                else if(attr=="model"||attr=="child"){rel = "child";}
                else{rel="collection"}
                if(flag==0){
                    var id = index+"_"+nickname+"_"+numberUser;
                    $("#uploadTree").jstree("create_node", parent, "inside", {
                                "data": name,
                                "attr": {
                                    "id": id,
                                    "path": parent.attr('path') +"/"+name,
                                    "rel": rel,
                                    "uploadstatus":false,
                                }
                            }, false, true);
                    data.tmp.bufferNode.push($("#"+id));
                    return id;
                }
                else{
                    if(index=="a"&&!flag1){
                        flag = index+"_"+nickname+"Bis"+"_"+numberUser;
                        var splitName = name.split('.');
                        $("#uploadTree").jstree("create_node", parent, "inside", {
                                "data": splitName[0]+"Bis."+splitName[1],
                                "attr": {
                                    "id": flag,
                                    "path": parent.attr('path') +"/"+splitName[0]+"Bis."+splitName[1],
                                    "rel": rel,
                                    "uploadstatus":false,
                                }
                            }, false, true);
                        data.tmp.bufferNode.push($("#"+flag));
                    }
                    return flag;
                }
            }


            // function parseLevel (parent,children,file){
            //     var id = safeName(file,children,"collection");

            //     for(var j=0;j<children.length;j++){
            //         var nameSplitFolder = children[i].id.split("_");
            //         console.debug(nameSplitFolder);
            //         if(nameSplitFolder[0]=="c"){
            //             if(nameSplitFolder[1]==file){
            //                 return children[i].id;
            //             }
                   
            //         }
            //     }
            // }

            function parsePath (file,parent){
                if(mode){
                    var result = [""];
                }
                else{
                    var result = file.relativePath.split("/");}
                for(var i=0;i<result.length;i++){
                    if(result[i]!=""){
                        var id = createNode(parent,result[i]);
                        parent = $("#"+id);}
                    else{
                        createNode(parent,file.name);
                        if(mode){
                             parent = $("#"+mode.attr("id"));
                        }
                        else{
                            parent = $("#"+e.idToDrop);
                        }
                    }
                }
                return parent;
            }
            if(mode){
                var parent = $("#"+mode.attr("id"));
            }
            else{
                var parent = $("#"+e.idToDrop);
            }
            if(mode||(!mode&&e.idToDrop != undefined)){
                $.each(data.files, function (index, file) {
                    parent = parsePath( file , parent);
                });
            }
            else{
                e.preventDefault();
            }
            defer.resolve();
            // if (e.idToDrop == viewer.idUser || e.idToDrop.split("____")[0] == viewer.idUser) {
            //     parent = 
            // }
            // else {
            //     var tmp = e.idToDrop.replace(viewer.idUser, '');
            //     tmp = tmp.split("_folder_");
            //     tmp = tmp[1].split("____");
            //     var obj = {};
            //     obj.name = 'X-folder';
            //     obj.value = tmp[0];
            //     stock.push(obj);
            //     data.tmp.nodeFolder = tmp[0];
            //     data.tmp.flagNode = false;
            // }
            //console.debug(data);
            // var defer = Q.defer();
            // if (e.idToDrop == undefined) {
            //     e.preventDefault();
            // }
            // else {
            //     data.tmp = new Buffer();
            //     var sort = [];
            //     var stock = [];
            //     console.debug(data.files);
            //     $.each(data.files, function (index, file) {
            //         var ext = file.name.match(/\.[^.]+$/);
            //         if (ext[0] == ".dae" || ext[0] == ".DAE") {
            //             sort.unshift(file);
            //         }
            //         else {
            //             sort.push(file);
            //         }
            //     });
            //     data.files = sort;
            //     data.deferred = defer;
            //     var ext = sort[0].name.match(/\.[^.]+$/)[0];
            //     var filename = sort[0].name.split('.');
            //     var tmp = {};
            //     tmp.name = 'X-iduser';
            //     tmp.value = viewer.idUser;
            //     stock.push(tmp);
            //     if (e.idToDrop == viewer.idUser || e.idToDrop.split("____")[0] == viewer.idUser) {
            //         if (ext == ".dae" || ext == ".DAE") {
            //             var tmp = {};
            //             tmp.name = 'X-folder';
            //             tmp.value = filename[0];
            //             stock.push(tmp);
            //         }
            //     }
            //     else {
            //         var tmp = e.idToDrop.replace(viewer.idUser, '');
            //         tmp = tmp.split("_folder_");
            //         tmp = tmp[1].split("____");
            //         var obj = {};
            //         obj.name = 'X-folder';
            //         obj.value = tmp[0];
            //         stock.push(obj);
            //         data.tmp.nodeFolder = tmp[0];
            //         data.tmp.flagNode = false;
            //     }
            //     data.tmp.array = stock;
            //     upload.object.fileupload("option", "beforeSend", function (xhr, data) {
            //         for (var i = 0; i < data.tmp.array.length; i++) {
            //             xhr.setRequestHeader(data.tmp.array[i].name, data.tmp.array[i].value);
            //         }
            //     });
            // }
            return defer.promise;
        }



        setTimeout(function () {
            upload.object.fileupload('option', 'dropZone', $("#c_" + viewer.idUser));
            upload.object.bind('fileuploaddrop', function (e, data) {
                window.pleaseWait(true);
                sortAssetDrop(e, data).then(function(){
                    window.pleaseWait(false);
                })
            });
        }, 1000);

        upload.callback = function (node) {
            this.object.off('fileuploadchange');
            this.object.on('fileuploadchange', function (e, data) {
                  window.pleaseWait(true);
                sortAssetDrop(e, data, node).then(function(){
                    window.pleaseWait(false);
                })
            })
        }

        upload.object.on('fileuploadadd', function (e, data) {
            var buffer = data.tmp;
            upload.object = $(this);
            data.context = buffer.header;
            data.buttonToReplace = [];
            var button;
            $.each(data.files, function (index, file) {
                var ext = file.name.match(/\.[^.]+$/);
                var filename = file.name.split('.');
                var nickname = file.name.replace("__","");
                nickname = nickname.replace("_","");
                nickname = nickname.replace(".","-");
                var url="default";
                button = uploadButton.clone(true).data(data);
                var stock = function(object){
                        data = button.data();
                        console.debug(filename[0]);
                        data.submit();
                        buffer.button.unbind('click',main);
                    }
                function main(){
                    stock(data.tmp);
                }
                button.on('change', function () {
                    if($(this).is(':checked')){
                    buffer.button.bind('click',main);
                 }
                 else{
                    buffer.button.unbind('click',main);
                 }
                });
                setTimeout(function(){button.click()},1000);
                if (ext[0] == ".dae" || ext[0] == ".DAE") {
                    // if (buffer.flagNode) {
                        // $("#uploadTree").jstree("create_node", $("#" + viewer.idUser), "inside", {
                        //     "data": filename[0],
                        //     "attr": {
                        //         "id": viewer.idUser + "_folder_" + filename[0],
                        //         "rel": "child"
                        //     }
                        // }, false, true);
                        // buffer.bufferDae = $("#" + viewer.idUser + "_folder_" + filename[0]);
                        // buffer.bufferNode.push(buffer.bufferDae);
                        // $("#uploadTree").jstree("create_node", buffer.bufferDae, "inside", {
                        //     "data": file.name,
                        //     "attr": {
                        //         "id": viewer.idUser + "_folder_" + filename[0] + "____model",
                        //         "rel": "main"
                        //     }
                        // }, false, true);
                        // var url = '/rest3d/upload/' + viewer.idUser + '/' + filename[0] + '/' + file.name; //
                    // }
                    // else {
                    //     $("#uploadTree").jstree("create_node", $("#" + viewer.idUser + "_folder_" + buffer.nodeFolder), "inside", {
                    //         "data": file.name,
                    //         "attr": {
                    //             "id": viewer.idUser + "_folder_" + buffer.nodeFolder + "____" + filename[0] + "____model",
                    //             "rel": "main"
                    //         }
                    //     }, false, true);
                    //     buffer.bufferNode.push($("#" + viewer.idUser + "_folder_" + buffer.nodeFolder + "____" + filename[0] + "____model"));
                    //     var url = '/rest3d/upload/' + viewer.idUser + '/' + file.name;
                    // }

                    var $dialog = $("<button>Launch</button>").on("click", function () {
                        window.pleaseWait(true);
                        COLLADA.load(url, viewer.parse_dae).then(
                            function (flag) {
                                window.pleaseWait(false);
                                buffer.notif(url);
                            })
                    })
                        .prop("id", "dialog" + index);
                    var $preview = $("<button>Peview</button>").on("click", function () {
                        $("#dialog").dialog("close");
                        var gitHtml = '<div id="dialog"><iframe id="myIframe" src="" style="height:99% !important; width:99% !important; border:0px;"></iframe></div>';
                        gitPanel = $('body').append(gitHtml);
                        $("#dialog").dialog({
                            width: '600',
                            height: '500',
                            open: function (ev, ui) {
                                $('#myIframe').attr('src', '/viewer/easy-viewer.html?file=' + url);
                            },
                            //              close: function(){
                            // gitHtml.remove();
                            //},//
                        });
                    })
                        .prop("id", "preview" + index);
                    var array = [];
                     var newLine =upload.upload(buffer.header, file.name, $preview, $dialog, button);
                    $('#dialog' + index).hide();
                    $('#preview' + index).hide();
                    // rest3d.testUpload(file);
                }
                else /*if (ext[0] == ".png" || ext[0] == ".jpg" || ext[0] == ".tga" || ext[0] == ".png" || ext[0] == ".jpeg" || ext[0] == ".glsl")*/ {
                    var newLine = upload.upload(buffer.header, file.name, button);
                    // if (buffer.flagNode) {
                    //     if (buffer.bufferDae != false) {
                    //         $("#uploadTree").jstree("create_node", buffer.bufferDae, "inside", {
                    //             "data": file.name,
                    //             "attr": {
                    //                 "id": viewer.idUser + "_folder_" + buffer.bufferDae.prop("id").split("_folder_")[1] + "____" + filename[0],
                    //                 "rel": "image"
                    //             }
                    //         }, false, true);
                    //         buffer.bufferNode.push($("#" + viewer.idUser + "_folder_" + buffer.bufferDae.prop("id") + "____" + filename[0]));
                    //     }
                    //     else {
                    //         $("#uploadTree").jstree("create_node", $("#" + viewer.idUser), "inside", {
                    //             "data": file.name,
                    //             "attr": {
                    //                 "id": viewer.idUser + "____" + filename[0],
                    //                 "rel": "image"
                    //             }
                    //         }, false, true);
                    //         buffer.bufferNode.push($("#" + viewer.idUser + "____" + filename[0]));
                    //     }
                    // }
                    // else {
                    //     $("#uploadTree").jstree("create_node", $("#" + viewer.idUser + "_folder_" + buffer.nodeFolder), "inside", {
                    //         "data": file.name,
                    //         "attr": {
                    //             "id": viewer.idUser + "_folder_" + buffer.nodeFolder + "____" + filename[0],
                    //             "rel": "image"
                    //         }
                    //     }, false, true);
                    //     buffer.bufferNode.push($("#" + viewer.idUser + "_folder_" + buffer.nodeFolder + "____" + filename[0]));
                    // }
                }
                setTimeout(function(){ 
                    url = $("#a_"+nickname+"_"+numberUser)
                    url = url.attr("path");
                    newLine.append("<a>"+url+"</a>");
                },1000);
              
                $("#uploadTree").jstree('open_all');
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
            data.tmp.flag = false;
            var buffer1 = data.tmp;
            $.each(data.result.files, function (index, file) {
                var nickname = file.name.replace("__","");
                nickname = nickname.replace("_","");
                nickname = nickname.replace(".","-");
                var node = $("#a_"+nickname+"_"+numberUser);
                node.attr("uploadstatus",true);

                file.assetName = data.result.files[index].name;
                var $node = convertButton.clone(true).data({
                    file: file,
                    context: data.context
                })
                // .prop('disabled', !/dae$/i.test(file.url))
                data.buttonToReplace[index]
                    .replaceWith($node)
                    .prop("id", "nodeClose");
                GUI.addIcon($node, "ui-icon-check", "", "before");
                $node.parent().parent().show().find("button").show();
                var ext = file.name.match(/\.[^.]+$/);
                if(ext!=null){
                    if (ext[0] == ".dae" || ext[0] == ".DAE") {
                        $node.prop('disabled', false);
                    }
                }
            });
            // data.deferred.resolve(true);
        }).on('fileuploadfail', function (e, data) {
            if (!data.result) {
                $(data.context.children()[0])
                    .append('<br>')
                    .append('error communicating with server')
                    .find('button').remove();
            }
            else
                $.each(data.result.files, function (index, file) {
                    var error = $('<span/>').text(file.error);
                    $(data.context.children()[index])
                        .append('<br>')
                        .append(error)
                        .find('button').remove();
                });
        });
    

        upload.object.fileupload("option", "beforeSend", function (xhr, data) {
                console.debug(data.files[0].name);
                var nickname = data.files[0].name.replace("__","");
                nickname = nickname.replace("_","");
                nickname = nickname.replace(".","-");
                var node = $("#a_"+nickname+"_"+numberUser);
                    // // for (var i = 0; i < data.tmp.array.length; i++) {
                    
                    // // }
                xhr.setRequestHeader("X-iduser", viewer.idUser);
                xhr.setRequestHeader("X-folder", node.attr("path"));

                });
}
    return setViewer6Upload;

});