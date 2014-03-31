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
define(['jquerymin', 'rest3d', 'gltf', 'collada', 'viewer'], function ($, rest3d, glTF, COLLADA, viewer) {

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
            var stock = this;
            this.removeNodes = function () {
                if (stock.flag) {
                    for (var j = 0; j < stock.bufferNode.length; j++) {
                        $("#uploadTree").jstree("delete_node", $(stock.bufferNode[j]));
                    }
                }
            }
            this.header = upload.header(this.removeNodes);
        }

        var cleanup = function(){
            // console.debug("cleanup!")
            // var counterBlock = 0;
            // var counterBr = 0;
            // $('#fileArea_upModel').children().each(function () {
            //     if(this.style == "display: block;"){
            //         counter++;
            //     }
            //     else if(this.style == "display: block;"){
            //          $(this).remove();
            //     }
            //     else{
            //         counterBr++;
            //     }
            // });
            // if(counterBr!==counterBlock){
            //     for(c)        
            //     }
        }

        var buttonToReplace;
        // upload.callOnClick(function(){
        //        function removeNodes(){
        //     for(var j=0;j<window.bufferNode.length;j++){
        //         $("#uploadTree").jstree("delete_node",$(window.bufferNode[j]));
        //     }
        // }
        //     window.header = upload.header(removeNodes);
        //     window.buffer = []; 
        //     window.bufferNode=[];
        //     window.bufferDae = false; 
        // });

        var url = '/rest3d/upload';
        var uploadButton = $('<button/>')
            .addClass('btn')
            .prop('disabled', true)
            .on('click', function () {
                var $this = $(this),
                    data = $this.data();
                $this
                    .off('click')
                    .on('click', function () {
                        $this.remove();
                        data.abort();
                    });
                data.submit();
                buttonToReplace = $(this);
                //.always(function () {
                //     $this.remove();
                // });
            }),
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
        var sortAsset = function (e, data, node) {
            cleanup();
            $("#uploadTree").jstree('open_all');
            data.tmp = new Buffer();
            var sort = [];
            var stock = [];
            $.each(data.files, function (index, file) {
                var ext = file.name.match(/\.[^.]+$/);
                if (ext[0] == ".dae" || ext[0] == ".DAE") {
                    sort.unshift(file);
                }
                else {
                    sort.push(file);
                }
            });
            data.files = sort;
            var ext = sort[0].name.match(/\.[^.]+$/)[0];
            var filename = sort[0].name.split('.');
            var tmp = {};
            tmp.name = 'X-iduser';
            tmp.value = viewer.idUser;
            stock.push(tmp);
            if (ext == ".dae" || ext == ".DAE") {
                var tmp = {};
                tmp.name = 'X-folder';
                tmp.value = filename[0];
                stock.push(tmp);
            }
            else {
                if (node.attr("id") != viewer.idUser) {
                    var tmp = node.attr("id").split("_folder_");
                    var obj = {};
                    obj.name = 'X-folder';
                    obj.value = tmp[1];
                    stock.push(obj);
                    data.tmp.nodeFolder = tmp[1];
                    data.tmp.flagNode = false;
                }
            }
            data.tmp.array = stock;
            setTimeout(function () {
                upload.object.fileupload("option", "beforeSend", function (xhr, data) {
                    for (var i = 0; i < data.tmp.array.length; i++) {
                        xhr.setRequestHeader(data.tmp.array[i].name, data.tmp.array[i].value);
                    }
                });
            }, 500);
        }

        var sortAssetDrop = function (e, data) {
            $("#uploadTree").jstree('open_all');
            if (e.idToDrop == undefined) {
                e.preventDefault();
            }
            else {
                data.tmp = new Buffer();
                var sort = [];
                var stock = [];
                $.each(data.files, function (index, file) {
                    var ext = file.name.match(/\.[^.]+$/);
                    if (ext[0] == ".dae" || ext[0] == ".DAE") {
                        sort.unshift(file);
                    }
                    else {
                        sort.push(file);
                    }
                });
                data.files = sort;
                var ext = sort[0].name.match(/\.[^.]+$/)[0];
                var filename = sort[0].name.split('.');
                var tmp = {};
                tmp.name = 'X-iduser';
                tmp.value = viewer.idUser;
                stock.push(tmp);
                if (e.idToDrop == viewer.idUser || e.idToDrop.split("____")[0] == viewer.idUser) {
                    if (ext == ".dae" || ext == ".DAE") {
                        var tmp = {};
                        tmp.name = 'X-folder';
                        tmp.value = filename[0];
                        stock.push(tmp);
                    }
                }
                else {
                    var tmp = e.idToDrop.replace(viewer.idUser, '');
                    tmp = tmp.split("_folder_");
                    tmp = tmp[1].split("____");
                    var obj = {};
                    obj.name = 'X-folder';
                    obj.value = tmp[0];
                    stock.push(obj);
                    data.tmp.nodeFolder = tmp[0];
                    data.tmp.flagNode = false;
                }
                data.tmp.array = stock;
                upload.object.fileupload("option", "beforeSend", function (xhr, data) {
                    for (var i = 0; i < data.tmp.array.length; i++) {
                        xhr.setRequestHeader(data.tmp.array[i].name, data.tmp.array[i].value);
                    }
                });
            }
        }



        setTimeout(function () {
            upload.object.fileupload('option', 'dropZone', $("#" + viewer.idUser));
            upload.object.bind('fileuploaddrop', function (e, data) {
                sortAssetDrop(e, data)
            });
        }, 1000);

        upload.callback = function (node) {
            this.object.off('fileuploadchange');
            this.object.on('fileuploadchange', function (e, data) {
                sortAsset(e, data, node);
            })
        }

        upload.object.on('fileuploadadd', function (e, data) {
            var buffer = data.tmp;
            upload.object = $(this);
            data.context = buffer.header;
            $.each(data.files, function (index, file) {
                var ext = file.name.match(/\.[^.]+$/);
                var filename = file.name.split('.');
                if (ext[0] == ".dae" || ext[0] == ".DAE") {
                    if (buffer.flagNode) {
                        $("#uploadTree").jstree("create_node", $("#" + viewer.idUser), "inside", {
                            "data": filename[0],
                            "attr": {
                                "id": viewer.idUser + "_folder_" + filename[0],
                                "rel": "child"
                            }
                        }, false, true);
                        buffer.bufferDae = $("#" + viewer.idUser + "_folder_" + filename[0]);
                        buffer.bufferNode.push(buffer.bufferDae);
                        $("#uploadTree").jstree("create_node", buffer.bufferDae, "inside", {
                            "data": file.name,
                            "attr": {
                                "id": viewer.idUser + "_folder_" + filename[0] + "____model",
                                "rel": "main"
                            }
                        }, false, true);
                        var url = '/rest3d/upload/' + viewer.idUser + '/' + filename[0] + '/' + file.name; //
                    }
                    else {
                        $("#uploadTree").jstree("create_node", $("#" + viewer.idUser + "_folder_" + buffer.nodeFolder), "inside", {
                            "data": file.name,
                            "attr": {
                                "id": viewer.idUser + "_folder_" + buffer.nodeFolder + "____" + filename[0] + "____model",
                                "rel": "main"
                            }
                        }, false, true);
                        buffer.bufferNode.push($("#" + viewer.idUser + "_folder_" + buffer.nodeFolder + "____" + filename[0] + "____model"));
                        var url = '/rest3d/upload/' + viewer.idUser + '/' + file.name;
                    }

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
                    upload.upload(buffer.header, file.name, $preview, $dialog, uploadButton.clone(true).data(data).prop("disabled", false));
                    $('#dialog' + index).hide();
                    $('#preview' + index).hide();
                    // rest3d.testUpload(file);
                }
                else if (ext[0] == ".png" || ext[0] == ".jpg" || ext[0] == ".tga" || ext[0] == ".png" || ext[0] == ".jpeg" || ext[0] == ".glsl") {
                    upload.upload(buffer.header, file.name, uploadButton.clone(true).data(data).prop("disabled", false));
                    if (buffer.flagNode) {
                        if (buffer.bufferDae != false) {
                            $("#uploadTree").jstree("create_node", buffer.bufferDae, "inside", {
                                "data": file.name,
                                "attr": {
                                    "id": viewer.idUser + "_folder_" + buffer.bufferDae.prop("id").split("_folder_")[1] + "____" + filename[0],
                                    "rel": "image"
                                }
                            }, false, true);
                            buffer.bufferNode.push($("#" + viewer.idUser + "_folder_" + buffer.bufferDae.prop("id") + "____" + filename[0]));
                        }
                        else {
                            $("#uploadTree").jstree("create_node", $("#" + viewer.idUser), "inside", {
                                "data": file.name,
                                "attr": {
                                    "id": viewer.idUser + "____" + filename[0],
                                    "rel": "image"
                                }
                            }, false, true);
                            buffer.bufferNode.push($("#" + viewer.idUser + "____" + filename[0]));
                        }
                    }
                    else {
                        $("#uploadTree").jstree("create_node", $("#" + viewer.idUser + "_folder_" + buffer.nodeFolder), "inside", {
                            "data": file.name,
                            "attr": {
                                "id": viewer.idUser + "_folder_" + buffer.nodeFolder + "____" + filename[0],
                                "rel": "image"
                            }
                        }, false, true);
                        buffer.bufferNode.push($("#" + viewer.idUser + "_folder_" + buffer.nodeFolder + "____" + filename[0]));
                    }
                }
                else {
                    upload.upload(buffer.header, file.name);
                } //
                $("#uploadTree").jstree('open_all');
            });
            data.tmp = buffer;
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
            $.each(data.result.files, function (index, file) {
                file.assetName = data.result.files[index].name;
                var $node = convertButton.clone(true).data({
                    file: file,
                    context: data.context
                })
                // .prop('disabled', !/dae$/i.test(file.url))
                buttonToReplace
                    .replaceWith($node)
                    .prop("id", "nodeClose");
                GUI.addIcon($node, "ui-icon-check", "", "before");
                $node.parent().parent().show().find("button").show();
                var ext = file.name.match(/\.[^.]+$/);
                if (ext[0] == ".dae" || ext[0] == ".DAE") {
                    $node.prop('disabled', false);
                }
            });
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
    }

    return setViewer6Upload;

});