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
setViewer6Upload=function(upload){
    var header;
    var index;
    var buttonToReplace;
    upload.callOnClick(function(){
        header = upload.header();
        index=0;
    });
    var url = '/rest3d/upload',
        uploadButton = $('<button/>')
            .addClass('btn')
            .prop('disabled', true)
            .on('click', function (){
                var $this = $(this),
                    data = $this.data();
                $this
                    .off('click')
                    .on('click', function () {
                        $this.remove();
                        data.abort();
                    });
                data.submit();
                buttonToReplace=$(this);
                //.always(function () {
                //     $this.remove();
                // });
        }),
        // show the name of the file nicely
        formatName = function(data,file){
            var i = file.name.lastIndexOf('/');
            return file.name.substring(i+1);
        },
        convertButton = $('<button/>')
            .addClass('btn')
            .prop('disabled', true)
            .on('click', function () {
                var $this = $(this),
                    data = $this.data();
                $this
                    .off('click')
                    .prop('disabled',true)
                // user rest to convert dae into glTF
                var callback = function(data) {
                    $this.prop('disabled',true);
                    if(data.result.output){console.debug(data.result.output);}
                    if(data.result.code){console.debug("Exit code: "+data.result.code);}
                    if (data.error){
                        var span = $('<p><span><b>Error code='+data.error.code+' :: '+data.error.message+'</b></span></p>');
                        data.context.append(span);
                    } else {
                        // ennumerate all resulting files
                        var $conve = upload.header(data.file.name);
                        $.each(data.result.files, function (index, file) {
                            var href = $('<a style="display:none" href="'+decodeURIComponent(file.url)+'" target="_blank"></a>');
                            upload.filesArea.append(href);
                            var $download = $("<button>Download</button>").on("click",function(){
                                href[0].click();
                            });

                        var url = decodeURIComponent(file.url);
                        var ext = url.match(/\.[^.]+$/);
                        if(ext==".json"){
                            var $dialog = $("<button>Launch your model</button>").on("click",function(){
                                glTF.load(url, viewer.parse_gltf);
                                window.notif(url);
                            });
                            var $preview = $("<button>Peview</button>").on("click",function(){
                                var gitHtml = '<div id="dialog"><iframe id="myIframe" src="" style="height:99% !important; width:99% !important; border:0px;"></iframe></div>';
                                gitPanel = $('body').append(gitHtml);
                                $("#dialog").dialog({
                                    autoOpen: true,
                                    width: 800,
                                    height: 600,
                                    open: function (ev, ui) {
                                        $('#myIframe').attr('src', '/viewer/easy-viewer.html?file=/rest3d/upload/'+decodeURIComponent(file.name));
                                    }
                                });
                            });
                                upload.convert($conve,formatName(data,file),$dialog,$download,$preview);
                        }
                        else{
                            upload.download($conve,formatName(data,file),$download);//
                        }
                        });
                    }
                }

                rest3d.convert(data,callback);
            });

    upload.object.on('fileuploadadd', function (e, data) {
        upload.object=$(this);
        data.context = header;
        $.each(data.files, function (index, file) {
            if (!index) {
                var url =  file.url;
                console.debug(file + file.url);
                var $dialog = $("<button>Launch your model</button>").on("click",function(){
                                COLLADA.load(url, viewer.parse_dae);
                                window.notif(url);
                            });
                 var $preview = $("<button>Peview</button>").on("click",function(){
                                var gitHtml = '<div id="dialog"><iframe id="myIframe" src="" style="height:99% !important; width:99% !important; border:0px;"></iframe></div>';
                                gitPanel = $('body').append(gitHtml);
                                $("#dialog").dialog({
                                    autoOpen: true,
                                    width: 800,
                                    height: 600,
                                    open: function (ev, ui) {
                                        $('#myIframe').attr('src', '/viewer/easy-viewer.html?file=/rest3d/upload/'+decodeURIComponent(file.name));
                                    }//
                                });
                            });
                upload.upload(header,file.name,$preview,$dialog,uploadButton.clone(true).data(data));}//
            else{this.upload(header,file.name);}
        });
    }).on('fileuploadprocessalways', function (e, data) {
            var indexI = data.index,
            file = data.files[indexI],
             node = $(data.context.children('div')[index+1]);
        if (file.preview) {
            node
                .prepend('<br>')
                .prepend(file.preview);
        }
        if (file.error) {//
          GUI.addTooltip({
                    parent: node.find('button'),
                    content: file.error,
                });//
        }
        if (indexI + 1 === data.files.length) {
            node.find('button')
                .prop('disabled', !!data.files.error);
        }
        index++;//
    }).on('fileuploadprogressall', function (e, data) {
        var progress = parseInt(data.loaded / data.total * 100, 10);
        upload.progress.setValue(progress);
    }).on('fileuploaddone', function (e, data) {
        $.each(data.result.files, function (index, file) {
            file.assetName = data.result.files[index].name;
            var $node = convertButton.clone(true).data({file: file, context: data.context})
                .prop('disabled', !/dae$/i.test(file.url))
            buttonToReplace
                .replaceWith($node)
                .prop("id","nodeClose");//
                GUI.addIcon($node, "ui-icon-check", "", "before");
        });
    }).on('fileuploadfail', function (e, data) {
        if (!data.result) {
            $(data.context.children()[0])
                .append('<br>')
                .append('error communicating with server')
                .find('button').remove();
        } else
        $.each(data.result.files, function (index, file) {
            var error = $('<span/>').text(file.error);
            $(data.context.children()[index])
                .append('<br>')
                .append(error)
                .find('button').remove();
        });
    });
}
