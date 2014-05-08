'use strict';
       // this.name = name;
       //  this.login = indexLogin;/// indexLogin : 0 -> no login needed, 1 -> optional, 2 -> required, 3-> not yet implemented
       //  this.picture = pictureTmp;
       //  this.description;
       //  this.signin;///It's an url. if array, redirection with new window. If not, iframe used
       //  this.upload;/// Set whether or not the upload feature is available
define(['rest3d', 'upload', 'viewer','database', 'collada','gltf'], function (rest3d, setViewer6Upload, viewer,databaseTab,COLLADA,glTF) {
    var rest3dToTree = function (data,parent) {
        var upload = "";
        this.data = data;
        this.login = data.login;
        this.picture = data.picture;
        this.signin = data.signin;
        this.name = data.name;
        this.upload = data.upload;
        this.description = data.description;
        this.id = GUI.uniqueId();
        this.area = parent;
        this.image = $();
        this.progress = $("<progress value=0 max=100></progress>");
        this.url = location.protocol + "//" + location.host + "/rest3d/" + this.name;

        this.init = function(){
            var tmp = new databaseTab(this,this.data,this.area);        
        }

        this.preview = function (node) {
            $("#dialog").dialog("close");
            var gitHtml = '<div id="dialog"><iframe id="myIframe" src="" style="height:99% !important; width:99% !important; border:0px;"></iframe></div>';
            $('body').append(gitHtml);
            $("#dialog").dialog({
                title: "Preview",
                width: '600',
                height: '500',
                open: function (ev, ui) {
                    $('#myIframe').attr('src', '/viewer/easy-viewer.html?file=/rest3d/'+stock.name + node.attr("path"));
                },
            });
        }
        var stock = this;
        this.displayCollada = function (node) {
            window.pleaseWait(true);
            COLLADA.load("/rest3d/"+stock.name + node.attr("path"), viewer.parse_dae).then(
                function (flag) {
                    window.pleaseWait(false);
                    buffer.notif(node.attr("name"));
                })
        }

        this.displayGltf = function (node) {
            window.pleaseWait(true);
            glTF.load("/rest3d/"+this.name + node.attr("path"), viewer.parse_gltf).then(
                function (flag) {
                    window.pleaseWait(false);
                    window.notif(node.attr("name"));
                })
        }

        this.convertMenu = function (node) {
            result = $("#" + node.attr("id")).data();
            result.file.relativePath = "";
            rest3d.convert(result, callbackConvert);
        }

        this.encodeToId = function(name,uuid){
            name=name.split(".").join("_");
            name += "_"+uuid.split("-")[0];
            while(true){
                if($("#"+name).length==1){
                    name+='_1';
                }else{
                    break;
                }
            }
            return name;
        }
   
        this.extensionToType=function(ext) {
            var result;
            if(ext==null){
                return "folder";
            }
            else{
                switch (ext[0]) {
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
                    case "":
                        result = "folder";
                        break;
                    case ".kmz":
                        result = "zip";
                        break;
                    default:
                        result = "file";
                        break;
                    }
                    return result;
                }
            }
        this.images=[];
        this.nodeArray = function(parent,name,id,uuid,type,path,up,close){
            var result = {};
            result.data = name.substr(0, 60);
            if(close)result.state = "closed";
            else if(name.split(".").length<2){result.state = "open"}
            result.attr = {
                "id": id,
                "uuid": uuid,
                "rel":type,
                "path":path,
                "up":up,
            }
            result.children = [];
            parent.push(result);
            if(type=="texture"){
                this.images.push({"id":id,"path":path});
            }
        }

        var checkIfExist = function(value,arbre){
            for(var i=0;i<arbre.length;i++){
                if(value==arbre[i].data){
                    return i;
                }
            }
            return -1;
        }

        this.buildJson= function(split,uuid,arbre,path){
            var true_path=path+"/"+split[0];
            if(split.length==0){return;}
            var check = checkIfExist(split[0],arbre);
            var id = this.encodeToId(split[0],uuid);
            var ext = split[0].match(/\.[^.]+$/);
            var type = this.extensionToType(ext);
            if(check!==-1){
                split.shift();
                this.buildJson(split,uuid,arbre[check].children,true_path);
            }
            else{
                this.nodeArray(arbre, split[0], id, uuid, type,true_path,true,false);
                split.shift();
                this.buildJson(split,uuid,arbre[arbre.length-1].children,true_path);
            }
        }

        this.parseMessage = function(data,path){
            if(!path){var path = "";}
            var result = {};
            result.children = [];
            for(var key1 in data.assets){
                var tmp = key1.split('/');
                this.buildJson(tmp,data.assets[key1],result.children,path);
            }
            for(var key in data.children){
                this.nodeArray(result.children,key,this.encodeToId(key,data.children[key]),data.children[key],"collection",path+'/'+key,true,true);             
            }
            return result.children;
        }

        this.createTree = function () {
            var stock = this;
            this.nodeBuffer;
            this.tree = GUI.treeBis({
                id: 'tree_' + this.name,
                parent: this.area,
                json: {
                    "ajax": {
                        "type": 'GET',
                        "url": function (node) {
                            var url = "";
                            stock.nodeBuffer = node;
                            if (node == -1) {
                                url = stock.url;
                                stock.firstFlag = true;
                            }
                            else {
                                var url= node.attr('path');
                                url = stock.url+url;
                                stock.firstFlag = false;
                            }
                            return url;
                        },
                        "success": function (new_data) {
                            stock.image.remove();
                            if(stock.image)stock.image.remove();
                            if(stock.nodeBuffer==-1&&jQuery.isEmptyObject(new_data.assets)&&jQuery.isEmptyObject(new_data.children)){
                                stock.image = GUI.image(stock.tree['tree_' + stock.name], "img-emptybox", "../gui/images/empty_box.gif", 60, 60, "before");
                                GUI.addTooltip({
                                    parent: stock.image,
                                    content: "Any files found in "+stock.name+", click on the picture or drag and drop for starting to upload your models",//"Any files found in "+stock.name
                                });
                                stock.image.click(function(){
                                    stock.addFiles();
                                })
                            }
                            
                            var result = [];
                            if(!stock.firstFlag){
                                result = stock.parseMessage(new_data,stock.nodeBuffer.attr('path'));
                                // setTimeout(function(){stock.tree.openAll();},600);
                            }
                            else{
                                result = stock.parseMessage(new_data);
                            }
                            setTimeout(function(){
                                for(var i=0;i<stock.images.length;i++){
                                    GUI.addTooltip({
                                        parent: $("#"+stock.images[i].id).find('a'),
                                        content: "<img style='max-height:150px;max-width:150px' src="+stock.url+"/"+stock.images[i].path+" ></img>",
                                    })            
                                }
                            },1000)
                            return result;
                        }
                    }
                },
                "dnd": {
                    "drop_finish": function (data) {
                        console.log('drop finish' + data);
                        //this is where the actual call to the sever is made for rearranging the triples for drag n drop.
                        //console.log(data);
                        //console.log('target '+ data.r);

                    },
                },
                "plugin": ["themes", "json_data", "ui", "types", "sort", "search", "contextmenu"],
                "contextmenu": {
                    "items": function (node) {
                        var result = {};
                        var rel = node.attr("rel");
                        var up = node.attr("up");
                        result.create = {
                            'label': 'create',
                            'action': function (obj) {
                                // stock.tree["tree_"+stock.name].jstree("rename");
                               this.rename(obj); 
                            }
                        };
                        if (rel == "collection" || rel == "model" || rel == "zip" || rel == "folder") {
                            result.icon = {
                                'label': 'Add files',
                                'action': stock.addFiles_contextMenu,
                            };
                        }
                        if ((rel == "collada" || rel == "gltf")) {
                            result.preview = {
                                'label': 'Preview',
                                'action': stock.preview,
                            };
                        }
                        if (rel == "gltf" ) {
                            result.display = {
                                'label': 'Display',
                                'action': stock.displayGltf,
                            };
                        }
                        if (rel == "collada" ) {
                            result.display = {
                                'label': 'Display',
                                'action': stock.displayCollada,
                            };
                            result.convert = {
                                'label': 'Convert',
                                'action': stock.convertMenu,
                            };
                        }
                        return result;
                    }
                },
                type: {
                    "types": {
                        "child": {
                            "icon": {
                                "image": "../gui/images/folder.png",
                            },
                        },
                         "zip": {
                            "icon": {
                                "image": "../gui/images/menu-scenes.png",
                            },
                        },
                        "collection": {
                            "icon": {
                                "image": "../gui/images/menu-scenes.png",
                            },
                        },
                        "collada": {
                            "icon": {
                                "image": "../favicon.ico",
                            },
                        },
                        "gltf": {
                            "icon": {
                                "image": "../favicon.ico",
                            },
                        },
                        'shader': {
                            "icon": {
                                "image": "../gui/images/geometry.png",
                            },
                        },
                        "file": {
                            "icon": {
                                "image": "../gui/images/file.png",
                            },
                        },
                        "kml": {
                            "icon": {
                                "image": "../gui/images/kml.png",
                            },
                        },
                        "texture": {
                            "icon": {
                                "image": "../gui/images/media-image.png",
                            },
                        },
                        "model": {
                            "icon": {
                                "image": "../gui/images/bunny.png",
                            },
                        },
                        "empty": {
                            "icon": {
                                "image": "../gui/images/cross.jpg",
                            },
                        },
                    }
                },
                themes: {
                    "theme": "apple",
                },
            });
            
        }
        this.addNodeRoot = function(object){
             this.tree["tree_"+this.name].jstree("create_node", this.parentTree,'last', object);
        }
        this.setUpload = function () {
            this.nodeRoot = $("#"+this.id)
            var upload = {
                parent: this.area,
                id: this.id,
                url: location.protocol + "//" + location.host + '/rest3d/'+this.name+'/',
                tree: this.tree["tree_"+this.name],
            };
            this.uploadPlugin = setViewer6Upload(upload);
            this.addFiles =this.uploadPlugin.button;
            this.dropFlag = false; //flag used to determine whether or not the file has been draged&droped
            var stock = this;

            this.addFiles_contextMenu = function(node){
                stock.parentTree = node;
                stock.addFiles();
            }
            this.uploadPlugin.refresh.click(function(){
                  stock.tree["tree_"+stock.name].jstree("refresh");
            })
            this.uploadPlugin.jquery.bind('fileuploaddrop', function (e, data) {
                console.debug(e.idToDrop);
                if(e.idToDrop==""){
                    data.submit().abort();
                }
                else if($('#'+e.idToDrop).length==0){
                     data.submit().abort();
                }
                else if($('#'+e.idToDrop).attr('rel')!==undefined){
                    var rel = $('#'+e.idToDrop).attr('rel')
                    if(rel == "collection" || rel == "model" || rel == "zip" || rel == "folder"){
                        stock.parentTree = $('#'+e.idToDrop);
                    }
                    else{
                        var buffer = $('#'+e.idToDrop);
                        var foundFlag = false;
                        for(var i=0;i<4;i++){
                            buffer = buffer.parent();
                            if(buffer.attr('rel')!==undefined){
                                var rel = buffer.attr('rel');
                                if(rel == "collection" || rel == "model" || rel == "zip" || rel == "folder"){
                                    stock.parentTree = buffer;
                                    foundFlag = true;
                                    break;
                                }
                            }
                        }
                        if(!foundFlag){
                            stock.parentTree = -1;
                        }
                    }
                }
                else{
                    data.submit().abort();
                }
            })
            this.uploadPlugin.jquery.bind('fileuploadadd', function (e, data) {
                if(stock.image.length==1){var flagRoot = true;}
                var tmp = {};
                tmp.data = data.files[0].name;
                var id = stock.encodeToId(tmp.data,"upload-f");
                tmp.attr = {};
                tmp.attr.id = id;
                tmp.attr.rel = stock.extensionToType(tmp.data.match(/\.[^.]+$/));
                if(flagRoot){stock.parentTree = -1}
                if(stock.parentTree !== -1){
                    data.url = stock.url + stock.parentTree.attr("path");
                }
                stock.addNodeRoot(tmp);
                var checkbox = $('<input type="checkbox" style="float:right;" checked=true>')
                $("#"+id).append(checkbox);
                stock.uploadPlugin.setting.click(function(){
                    if($("#"+id).find('input').is(':checked')){
                        data.submit();
                    }
                })
                if(flagRoot){stock.image.remove();}       
            })
            this.uploadPlugin.jquery.bind('fileuploadstart', function (e){
                window.fl4reStatus("UPLOAD",stock.progress);
            });
            this.uploadPlugin.jquery.bind('fileuploaddone', function (e) {
                window.fl4reStatus("READY");
                stock.tree["tree_"+stock.name].jstree("refresh");
            })
            this.uploadPlugin.jquery.bind('fileuploadprogressall',function (e, data) {
                var progress = parseInt(data.loaded / data.total * 100, 10);
                stock.progress.val(progress);
            })
        }
        this.init();
        // this.createTree();
        // this.setUpload(); //we load the upload feature, by default for the moment
    }
    return rest3dToTree;
})