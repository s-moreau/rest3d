
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
define(['jquerymin', 'rest3d', 'gltf', 'collada', 'viewer', 'q'], function ($, rest3d, glTF, COLLADA, viewer, Q) {

    function setViewer6Upload($, upload, rest3d, viewer) {
        var index;
        var id;
        var flag;
        var url = '/rest3d/upload';


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
                    window.sortAssetDrop(e, buffer.result);
                    window.visualize(buffer.result);
                }
            }
        }

        function preview(node) {
            $("#dialog").dialog("close");
            var gitHtml = '<div id="dialog"><iframe id="myIframe" src="" style="height:99% !important; width:99% !important; border:0px;"></iframe></div>';
            gitPanel = $('body').append(gitHtml);
            $("#dialog").dialog({
                width: '600',
                height: '500',
                open: function (ev, ui) {
                    $('#myIframe').attr('src', '/viewer/easy-viewer.html?file=' + node.attr("path"));
                },
            });
        }
        upload.preview = preview;

        function displayCollada(node) {
            window.pleaseWait(true);
            COLLADA.load("/rest3d/tmp/" + node.attr("path"), viewer.parse_dae).then(
                function (flag) {
                    window.pleaseWait(false);
                    buffer.notif(node.attr("name"));
                })
        }
        upload.displayCollada = displayCollada;

        function displayGltf(node) {
            window.pleaseWait(true);
            glTF.load("/rest3d/tmp/" + node.attr("path").encodeURIComponent(), viewer.parse_gltf).then(
                function (flag) {
                    window.pleaseWait(false);
                    window.notif(node.attr("name"));
                })
        }
        upload.displayGltf = displayGltf;

        function convertMenu(node) {
            result = $("#" + node.attr("id")).data();
            console.debug(result);
            result.file.relativePath = "";
            rest3d.convert(result, callbackConvert);
        }
        upload.convertMenu = convertMenu;

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
                            $("#uploadTree").jstree("delete_node", $(stock.bufferNode[j]));
                        }
                    }
                }
            }
            this.button = $("<button>Upload</button>");
            this.header = upload.header(this.removeNodes, this.button);
            this.upload = [];
            var stock = this;
        }

        window.sortAssetDrop = function (e, data, mode) {
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
                    rmp = $("#uploadTree").jstree("create_node", parent, "inside", {
                        "data": name,
                        "attr": {
                            "id": id,
                            "file": name,
                            "path": parent.attr('path') + "/" + name,
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
                        rmp = $("#uploadTree").jstree("create_node", parent, "inside", {
                            "data": name,
                            "attr": {
                                "id": flag,
                                "file": name,
                                "path": parent.attr('path') + "/" + name,
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
                            upload.createNodeDatabase(file, parent);
                            parent = origin;
                        }
                    }
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
            $("#uploadTree").jstree('open_all');
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
            upload.object.fileupload('option', 'dropZone', $("#c_" + viewer.idUser));
            upload.object.bind('fileuploaddrop', function (e, data) {
                window.pleaseWait(true);
                window.sortAssetDrop(e, data).then(function () {
                    window.pleaseWait(false);
                })
            });
        }, 1000);

        upload.callback = function (node) {
            this.object.off('fileuploadchange');
            this.object.on('fileuploadchange', function (e, data) {
                window.pleaseWait(true);
                window.sortAssetDrop(e, data, node).then(function () {
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
            var node = data.files[0].relativePath;
            node.attr("uploadstatus", true);
            node.parent().parent().attr("uploadstatus", true);
        });

        upload.object.fileupload("option", "done", function (e, data) {
            // data.files[0].relativePath.attr("id", data.result.files[0].assetId);
            console.debug(data.result[0]);
            var object = data.result;
            var e = {};
            e.idDatabase = "c_" + viewer.idUser;
            data.files[0].relativePath.remove();
            window.sortAssetDrop(e, object);
            window.visualizeDatabase(object);


        });
    }
    return setViewer6Upload;

});