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
            .text('Upload')
            .on('click', function (){
                var $this = $(this),
                    data = $this.data();
                $this
                    .off('click')
                    .text('Abort')
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
            .text('Convert')
            .on('click', function () {
                var $this = $(this),
                    data = $this.data();
                $this
                    .off('click')
                    .text('Convert')
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
                            var $download = $("<button>Downl..</button>").on("click",function(){
                                var gitHtml = $('<iframe id="myIframe" src="'+decodeURIComponent(file.url)+'" style="height:99% !important; width:99% !important; border:0px;"></iframe>');
                                gitPanel = $('body').append(gitHtml);
                            });
                        console.debug(decodeURIComponent(file.url))
                        var $dialog = $("<button>Launch</button>").on("click",function(){
                            var url = decodeURIComponent(file.url);
                            glTF.load(url, parse_gltf);
                            // notif(url);
                        });
                            // function(parent,link,button1,button2,button3){
                            upload.convert($conve,formatName(data,file),$dialog,$("<button>Display</button>"),$download);
                            // var span = '<p><span><a href="'+decodeURIComponent(file.url)+'" target="_blank"><p><span>'+formatName(data,file)+'</a>';
                            // // endsWith
                            // if (file.url.indexOf('.json', file.url.length - '.json'.length) !== -1) {
                            //     var url='/viewer/viewer4.html?file=/rest3d/upload/'+decodeURIComponent(file.name);
                            //     span += ' -> <a href="'+url+'" target="_blank"> View '+formatName(data,file)+'</a>';
                            // }
                            // span += '</span></p>';
                            // data.context.append($(span));
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
                upload.upload(header,file.name,uploadButton.clone(true).data(data));
            }
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
        if (file.error) {
          GUI.addTooltip({
                    parent: node.find('button'),
                    content: file.error,
                });
        }
        if (indexI + 1 === data.files.length) {
            node.find('button')
                .text('Upload')
                .prop('disabled', !!data.files.error);
        }
        index++;
    }).on('fileuploadprogressall', function (e, data) {
        var progress = parseInt(data.loaded / data.total * 100, 10);
        upload.progress.setValue(progress);
    }).on('fileuploaddone', function (e, data) {
        $.each(data.result.files, function (index, file) {
            file.assetName = data.result.files[index].name;
            var $node = convertButton.clone(true).data({file: file, context: data.context})
                .text('Convert')
                .prop('disabled', !/dae$/i.test(file.url));
            buttonToReplace
                .replaceWith($node);
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
