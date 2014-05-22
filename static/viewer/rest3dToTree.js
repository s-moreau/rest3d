'use strict';
       // this.name = name;
       //  this.login = indexLogin;/// indexLogin : 0 -> no login needed, 1 -> optional, 2 -> required, 3-> not yet implemented
       //  this.picture = pictureTmp;
       //  this.description;
       //  this.signin;///It's an url. if array, redirection with new window. If not, iframe used
       //  this.upload;/// Set whether or not the upload feature is available
define(['rest3d', 'upload', 'viewer','database', 'collada','gltf'], function (rest3d, setViewer6Upload, viewer,databaseTab,COLLADA,glTF) {
    window.objectRest3d = {};
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
        this.flagEmpty = true;
        this.progress = $("<progress value=0 max=100></progress>");
        this.infoUrl = location.protocol + "//" + location.host + "/rest3d/info/" + this.name +"/";
        this.uploadUrl = location.protocol + "//" + location.host + "/rest3d/" + this.name +"/";
        this.dataUrl = location.protocol + "//" + location.host + "/rest3d/data/" + this.name +"/";
        this.convertUrl = location.protocol + "//" + location.host + "/rest3d/convert/" + this.name +"/";
        this.uploadToTmp = location.protocol + "//" + location.host + "/rest3d/tmp/";
        this.uploadToDb = location.protocol + "//" + location.host + "/rest3d/db/";
        window.objectRest3d[this.name] = this;
        var stock = this;

        this.init = function(){
            var tmp = new databaseTab(this,this.data,this.area);        
        }

        this.buildUrlData = function(node){
            if(this.name=="warehouse"||this.name=="3dvia"){
                var relativePath = node.attr('path').substr(0, node.attr('path').lastIndexOf("/"));
                var path = encodeURI(stock.dataUrl+relativePath+'/?uuid='+node.attr("uuid")); 
            }   
            else{
                var relativePath = node.attr('path').substr(0, node.attr('path').lastIndexOf("/"));
                var path = encodeURI("/rest3d/data/"+stock.name+relativePath+'/?uuid='+node.attr("uuid")); 
            }
            return path;
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
                    $('#myIframe').attr('src', '/viewer/easy-viewer.html?file='+stock.buildUrlData(node));
                },
            });
        }

        // this.preview = function (node) {
        //     $("#dialog").dialog("close");
        //     var gitHtml = $('<div id="dialog"><iframe id="myIframe" src="" style="height:100% !important; width:100% !important; border:0px;"></div>');
        //     $('body').append(gitHtml);
        //     $("#dialog").dialog({
        //         title: node.attr('name'),
        //         width: '600',
        //         height: '500',
        //         open: function () {
        //             $('#myIframe').attr('src', node.attr("previewuri"));
        //         },
        //         close: function () {
        //             gitHtml.remove();
        //         },
        //     });
        //     $("#dialog").css({
        //         'min-height': 'none !important;'
        //     });
        // }

        this.icon = function (node) {
            $("#dialog").dialog("close");
            var gitHtml = $('<div id="dialog"><img src="' + node.attr("iconuri") + '" /></div>');
            $('body').append(gitHtml);
            $("#dialog").dialog({
                title: node.attr('name'),
                width: '300',
                height: '300',
                open: function () {
                    $('#myIframe').attr('src', node.attr("iconuri"));
                },
                close: function () {
                    gitHtml.remove();
                },
            });
            $("#dialog").css({
                'min-height': 'none !important;'
            });
        }

        this.displayCollada = function (node) {
            if(stock.name == "warehouse"){
                $.post(stock.uploadToTmp+'/'+encodeURI(node.attr('name')),{url:stock.buildUrlData(node)}).done(function(data){
                    data = jQuery.parseJSON(data);
                    window.renderMenu.tab_tmp.focusTab();
                    data.forEach(function(file){
                        if(file.name==node.attr('name')){
                            setTimeout(function(){
                                var selector = $("#tab_tmp li[name='"+file.name+"']");
                                if(selector.length==1)selector=[selector];
                                try{
                                selector.forEach(function(element){
                                var uuid = element.attr("uuid");
                                    // if(uuid==file.uuid){
                                        window.objectRest3d.tmp.displayCollada(element)
                                    // }
                                    // else{
                                    //     console.log("The model hasn't been correctly uploaded by the API, please try again")
                                    // }
                                      })
                                }catch(e){
                                    console.error("File to load not found among the tmp database")
                                }
                              
                            },500);
                        }
                    })
                }).fail(function(err) {
                console.error(err)
            });
            }
            else{
                window.pleaseWait(true);
                COLLADA.load(stock.buildUrlData(node), viewer.parse_dae).then(
                    function (flag) {
                        window.pleaseWait(false);
                        buffer.notif(node.attr("name"));
                    })
            }
        }

        this.displayGltf = function (node) {
            window.pleaseWait(true);          
            glTF.load(stock.buildUrlData(node), viewer.parse_gltf).then(
                function (flag) {
                    window.pleaseWait(false);
                    window.notif(node.attr("name"));
                })
        }

        this.download = function(node) {
            var path = node.attr('path');
            if (path[0] ==='/') path = path.substring(1);
            var win = window.open(encodeURI(stock.dataUrl+path+'/?uuid='+node.attr("uuid")), '_blank');              
        }

        this.upToTmp = function(node){
            $.post(stock.uploadToTmp+'/'+encodeURI(node.attr('name')),{url:stock.buildUrlData(node)}).done(function(){
                 window.renderMenu.tab_tmp.focusTab();
            }).fail(function(err) {
                console.error(err)
            });
        }

        this.upToDb= function(node){
            $.post(stock.uploadToDb+'/'+encodeURI(node.attr('name')),{url:stock.buildUrlData(node)}).done(function(){
                 window.renderMenu.tab_db.focusTab();
            }).fail(function(err) {
                console.error(err)
            })
        }

        this.convertMenu = function (node) {
            // result = $("#" + node.attr("id")).data();
            // result.file.relativePath = "";
            $.post(stock.convertUrl+node.attr("path") , { url: stock.dataUrl+'/?uuid='+node.attr("uuid")}).done(function( data ) {
                alert( data );
              }).fail(function(err) {
                console.error(err)
            });
        }
        this.images=[];
        this.bufferUuid = "";
        this.nodeArray = function(parent,name,id,uuid,type,path,up,close){
            var result = {};
            result.data = name.substr(0, 60);
            if(close)result.state = "closed";
            else if(type=="folder"&&(this.name=="warehouse"||this.name=="3dvia")){result.state = "closed";}
            else if(name.split(".").length<2){result.state = "open"}
            if(uuid==name){
                uuid=stock.bufferUuid;
            }
            result.attr = {
                "id": id,
                "name": name,
                "uuid": uuid,
                "rel":type,
                "path":path,
            }
            result.children = [];
            parent.push(result);
            if (path[0] ==='/') path = path.substring(1);
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
                if(key1.indexOf("\\") != -1){
                    var tmp = key1.split('\\');
                    tmp.slice(0,1)
                } else {
                    var tmp = key1.split('/');
                }
                this.buildJson(tmp,data.assets[key1],result.children,path);
            }
            for(var key in data.children){
                this.nodeArray(result.children,key,this.encodeToId(key),data.children[key],"collection",path+'/'+key,true,true);             
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
                                url = stock.infoUrl;
                                stock.firstFlag = true;
                            }
                            else {
                                stock.bufferUuid = node.attr("uuid");
                                var url= node.attr('path');
                                if (url[0] ==='/') url = url.substring(1);
                                url = stock.infoUrl+'?uuid='+node.attr("uuid");
                                stock.firstFlag = false;
                            }
                            return url;
                        },
                        "success": function (new_data) {
                            stock.image.remove();
                            stock.flagEmpty = false; 
                            if(stock.nodeBuffer==-1&&jQuery.isEmptyObject(new_data.assets)&&jQuery.isEmptyObject(new_data.children)){
                                stock.image = GUI.image(stock.tree['tree_' + stock.name], "img-emptybox", "../gui/images/empty_box.gif", 60, 60, "before");
                                stock.flagEmpty = true; 
                                GUI.addTooltip({
                                    parent: stock.image,
                                    content: "Any files found in "+stock.name+", click on the picture or drag and drop for starting to upload your models",//"Any files found in "+stock.name
                                });
                                stock.image.click(function(){
                                    stock.image.remove();
                                    stock.parentTree = -1;
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
                            if(stock.name!=="warehouse"){
                                setTimeout(function(){
                                    for(var i=0;i<stock.images.length;i++){
                                        GUI.addTooltip({
                                            parent: $("#"+stock.images[i].id).find('a'),
                                            content: "<img style='max-height:150px;max-width:150px' src="+stock.dataUrl+stock.images[i].path+" ></img>",
                                        })            
                                    }
                                },1000)
                            }
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
                        var up = node.attr("upload");
                        // result.create = {
                        //     'label': 'Create collection',
                        //     'action': function (obj) {
                        //         // stock.tree["tree_"+stock.name].jstree("rename");
                        //        this.rename(obj); 
                        //     }
                        // };
                        if (upload !=="" && (rel == "collection" || rel == "model" || rel == "zip" || rel == "folder")) {
                            result.addfiles = {
                                'label': 'Add files',
                                'action': stock.addFiles_contextMenu,
                            };
                        }

                        if (!up&& rel !== "collection" && stock.name !=="warehouse"){
                            result.download = {
                                'label': 'Download',
                                'action': stock.download,
                            };
                        }

                        else if(rel == 'folder'){
                            result.download = {
                                'label': 'Download',
                                'action': stock.download,
                            };
                            result.upToTmp = {
                                'label': 'Upload to tmp',
                                'action': stock.upToTmp,
                            };
                            if(window.objectRest3d.hasOwnProperty("db")){
                                result.upToDb = {
                                    'label': 'Upload to db',
                                    'action': stock.upToDb,
                                };
                            }
                        }

                        if ((rel == "collada" || rel == "gltf") && !up && stock.name !=="warehouse") {
                            result.preview = {
                                'label': 'Preview',
                                'action': stock.preview,
                            };
                        }
                        if (rel == "gltf" && !up) {
                            result.display = {
                                'label': 'Display',
                                'action': stock.displayGltf,
                            };
                        }
                        if (rel == "collada" && !up) {
                            result.display = {
                                'label': 'Display',
                                'action': stock.displayCollada,
                            };
                            result.convert = {
                                'label': 'Convert',
                                'action': stock.convertMenu,
                            };
                        }
                        if (node.attr("previewuri")) {
                                    result.preview = {
                                        'label': 'Preview model',
                                        'action': stock.preview,
                                    };
                                }
                        if (node.attr("iconuri")) {
                            result.icon = {
                                'label': 'Display icon',
                                'action': stock.icon,
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

        this.encodeToId = function(name){  // FUNCTION TO ENCODE ANY STRING TO AN ID HANDLED BY HTML/ REEEAAAALLLY IMPORTANT
            try{name = this.parentTree.attr("path")+"/"+name;}
            // SUPPORT HTML
            catch(e){name = name;}
            name = "a"+encodeURI(name);
            name = name.split('(').join(""); 
            name = name.split(')').join(""); 
            name = name.split('@').join("");
            name = name.split('~').join(""); 
            name = name.split('*').join(""); 
            name = name.split('!').join("");   
            name = name.split(' ').join(""); 
            name = name.split(',').join("");
            name = name.split('/').join(""); 
            name = name.split('?').join(""); 
            name = name.split('@').join(""); 
            name = name.split('&').join("");
            name = name.split('=').join("");
            name = name.split('+').join(""); 
            name = name.split('$').join(""); 
            name = name.split('%').join(""); 
            name = name.split('#').join("");
            // SUPPORT JQUERY
            name = name.split('.').join(""); 
            name = name.split(':').join(""); 
            return name; 
        }

        this.checkIfIdExist = function(name){
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
        this.addNodeRoot = function(object){
             this.tree["tree_"+this.name].jstree("create_node", this.parentTree,'last', object);
        }

        this.addNode = function(object){
            this.tree["tree_"+this.name].jstree("create_node", this.parentTree, "inside", object, false, true);
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
                window.pleaseWait(true);
                setTimeout(function(){window.pleaseWait(false)},1000)
                                if(data.files.length<100){
                    

                if(e.idToDrop==""){
                    stock.parentTree = false;
                }
                else if($('#'+e.idToDrop).length==0){
                    stock.parentTree = false;
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
                    stock.parentTree = false;
                }
                                }else{
                       e.stopPropagation();
                    e.preventDefault();
                    console.log("Too many files draged at once, limit sets at 100")
                }
            })
            this.uploadPlugin.jquery.bind('fileuploadadd', function (e, data) {
                    if(stock.parentTree == false){
                        stock.parentTree = -1;
                        var flagRoot=true;
                    }
                    var origin = stock.parentTree;
                    //var flagRoot=true;
                    if(data.files[0].relativePath){
                        var relativePath = data.files[0].relativePath.split("/");
                        relativePath.forEach(function(folder){
                            if(folder !== ""){
                                var objectId = stock.encodeToId(folder);
                                if($('#'+objectId).length!==1){
                                    var object = {};
                                    object.data = folder;
                                    object.attr = {};
                                    object.attr.rel = "folder";
                                    if(stock.parentTree == -1) object.attr.path = folder;
                                    else object.attr.path = stock.parentTree.attr("path")+'/'+folder;
                                    objectId = stock.checkIfIdExist(objectId);
                                    object.attr.id = objectId;
                                    if(stock.parentTree == -1) stock.addNodeRoot(object)
                                    else stock.addNode(object)
                                } 
                                stock.parentTree = $("#"+objectId);  
                            }
                        })
                    }
                    var tmp = {};
                    tmp.data = data.files[0].name;
                    var id = stock.encodeToId(tmp.data);
                    id = stock.checkIfIdExist(id);
                    tmp.attr = {};
                    tmp.attr.id = id;
                    tmp.attr.upload = true; 
                    tmp.attr.rel = stock.extensionToType(tmp.data.match(/\.[^.]+$/));
                    if(stock.parentTree == -1){
                        data.url = stock.uploadUrl + tmp.data;
                        tmp.attr.path = tmp.data;
                    }
                    else{
                        data.url = stock.uploadUrl + stock.parentTree.attr("path");
                        tmp.attr.path = stock.parentTree.attr("path")+'/'+tmp.data;
                    }
                    if(stock.parentTree == -1) stock.addNodeRoot(tmp)
                    else stock.addNode(tmp)
                    var checkbox = $('<input type="checkbox" style="position:absolute;float:right;right:15px !important;" checked=true>')
                    $("#"+id).append(checkbox);
                    stock.uploadPlugin.setting.click(function(){
                        if($("#"+id).find('input').is(':checked')){
                            var request = data.submit();
                            if(stock.parentTree==false){
                                request.abort();
                            }
                        }
                    })
                    if(flagRoot){stock.image.remove();} 
                    stock.parentTree = origin;
                    stock.tree.openAll();
            })
            this.uploadPlugin.jquery.bind('fileuploadstart', function (e){
                window.fl4reStatus("UPLOAD",stock.progress);
            });
            this.uploadPlugin.jquery.bind('fileuploadprogressall',function (e, data) {
                var progress = parseInt(data.loaded / data.total * 100, 10);
                stock.progress.val(progress);
                if(data.total == data.loaded){
                    setTimeout(function(){
                        window.fl4reStatus("READY");
                        stock.tree["tree_"+stock.name].jstree("refresh");
                    },100)
                }
            })
            window.renderMenu["tab_"+stock.name].focusTab(function(){
                stock.tree["tree_"+stock.name].jstree("refresh");
            })
        }
        this.init();
    }
    return rest3dToTree;
})