'use strict';
       // this.name = name;
       //  this.login = indexLogin;/// indexLogin : 0 -> no login needed, 1 -> optional, 2 -> required, 3-> not yet implemented
       //  this.picture = pictureTmp;
       //  this.description;
       //  this.signin;///It's an url. if array, redirection with new window. If not, iframe used
       //  this.upload;/// Set whether or not the upload feature is available
define(['rest3d', 'upload', 'viewer','database', 'collada'], function (rest3d, setViewer6Upload, viewer,databaseTab,COLLADA) {
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
        this.url = location.protocol + "//" + location.host + "/rest3d/" + this.name;
        this.init = function(){
            var tmp = new databaseTab(this,this.data,this.area);        
        }

        this.refresh = function () {
            var stock = this;
            var cb = function (data) {
                // callback(data);
                stock.loop(data, stock.nodeRoot);
            }
            rest3d.database({}, cb, "/" + this.name);
        }
        this.loop = function (data, parent, flag) {
            var stock = this;
            var origin = parent;
            for (var key in data.assets) {
                parent = origin;
                var uuid = data.assets[key];
                var tmp = key.split("/");
                var flag2 = false;
                for (var i = 0; i < tmp.length; i++) {
                    if (i !== tmp.length - 1) {
                        parent = stock.createNode({
                            "name": tmp[i],
                            "collectionpath": parent.attr('collectionpath')
                        }, parent);
                        if (!flag2) {
                            flag2 = tmp[i];
                        }
                        else {
                            flag2 += "/" + tmp[i];
                        }
                        flag = true;
                    }
                    else {
                        var json = {
                            "name": tmp[i],
                            "uuid": uuid,
                            "collectionpath": "",
                            "assetpath": ""
                        };
                        if (flag) {
                            json.collectionpath = parent.attr('collectionpath');
                        }
                        if (flag2) {
                            json.assetpath = flag2;
                        }
                        stock.createNodeDatabase(json, parent);
                    }
                }
            }
            for (var key1 in data.children) {
                var uuid = data.children[key1];
                rest3d.database({
                    key: key1,
                    parent: parent
                }, function (data) {
                    stock.loop(data.data, stock.createCollection({
                        "collectionpath": data.key
                    }, data.parent), true);
                }, "/" + stock.name, uuid)
            }
        }
        this.createNodeDatabase = function (file, parent) { //upload.createNodeDatabase file.name file.uuid file.collectionpath file.assetpath parent
            var stock = this;
            if (file.hasOwnProperty('path')) {
                var path = file.path;
            }
            else {
                var path = "";
                if (!file.collectionpath == "") {
                    path += "/" + file.collectionpath;
                }
                if (!file.assetpath == "") {
                    path += "/" + file.assetpath;
                }
                path += "/" + file.name;
            }
            var json = {
                "data": file.name,
                "attr": {
                    "id": "a_" + file.uuid,
                    "name": file.name,
                    "path": path,
                    "collectionpath": file.collectionpath,
                    "assetpath": file.assetpath,
                    "rel": this.upload.extensionToType(file.name.match(/\.[^.]+$/)[0]),
                    "uploadstatus": true,
                }
            }
            if (file.collectionpath == "" && file.assetpath == "" && parent.attr("id") == "c_" + stock.idUser) {
                delete json.attr.collectionpath;
                delete json.attr.assetpath;
                json.attr.path = file.name;
            }
            $("#uploadTree").jstree("create_node", parent, "inside", json, false, true);
            file.idToTarget = "#a_" + file.uuid
            if (file.hasOwnProperty("size")) {
                GUI.addTooltip({
                    parent: $("#a_" + file.uuid),
                    content: "size: " + file.size,
                    //wait new tooltip for showing date + User fields
                });
            }
            return $(file.idToTarget);
        }
        this.createNode = function (file, parent) {
            var id = this.encodeStringToId(file.name + "_" + Math.floor(Math.random() * 100000) + 1);
            var json = {
                "data": file.name,
                "attr": {
                    "id": id,
                    "rel": "collection",
                    "uploadstatus": true,
                }
            }
            if (file.hasOwnProperty('assetpath')) {
                if (file.assetpath !== "") {
                    json.attr.assetpath = file.assetpath;
                }
            }
            if (file.hasOwnProperty('collectionpath')) {
                if (file.collectionpath !== "") {
                    json.attr.collectionpath = file.collectionpath;
                }
            }
            $("#uploadTree").jstree("create_node", parent, "inside", json, false, true);
            return $("#" + id);
        }
        this.createCollection = function (file, parent) {
            var id = this.encodeStringToId(file.collectionpath);
            parent.data({});
            if (!parent.data().hasOwnProperty(file.collectionpath)) {
                var flagCollection = {};
                flagCollection[file.collectionpath] = true;
                parent.data(flagCollection);
                $("#uploadTree").jstree("create_node", parent, "inside", {
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
        upload.preview = this.preview;
        var stock = this;
        this.displayCollada = function (node) {
            window.pleaseWait(true);
            COLLADA.load("/rest3d/"+stock.name + node.attr("path"), viewer.parse_dae).then(
                function (flag) {
                    window.pleaseWait(false);
                    buffer.notif(node.attr("name"));
                })
        }
        upload.displayCollada = this.displayCollada;

        this.displayGltf = function (node) {
            window.pleaseWait(true);
            glTF.load("/rest3d/"+this.name + node.attr("path"), viewer.parse_gltf).then(
                function (flag) {
                    window.pleaseWait(false);
                    window.notif(node.attr("name"));
                })
        }
        upload.displayGltf = this.displayGltf;

        this.convertMenu = function (node) {
            result = $("#" + node.attr("id")).data();
            result.file.relativePath = "";
            rest3d.convert(result, callbackConvert);
        }
        upload.convertMenu = this.convertMenu;


        this.encodeStringToId = function (string) {
            string = string.split(".").join("-");
            string = encodeURIComponent(string);
            string = string.split("%").join("z");
            return string;
        }
        this.encodeToId = function(name,uuid){
            name=name.split(".").join("_");
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
            path+="/"+split[0]
            if(split.length==0){return;}
            var check = checkIfExist(split[0],arbre);
            var id = this.encodeToId(split[0],uuid);
            var ext = split[0].match(/\.[^.]+$/);
            var type = this.extensionToType(ext);
            if(check!==-1){
                split.shift();
                this.buildJson(split,uuid,arbre[check].children,path);
            }
            else{
                this.nodeArray(arbre, split[0], id, uuid, type,path,true);
                split.shift();
                this.buildJson(split,uuid,arbre[arbre.length-1].children,path);
            }
        }

        this.parseMessage = function(data,path){
            if(!path){var path = "";}
            var result = {};
            result.children = [];
            for(var key1 in data.assets){
                var tmp = key1.split('/');
                this.buildJson(tmp,data.assets[key1],result.children,"",path);
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
                    // "data": {
                    //     "data": "Guest_repository",
                    //     "attr": {
                    //         "id": this.id,
                    //         "rel": "collection",
                    //         "path": "/rest3d/tmp/",
                    //         "file": this.id,
                    //     }
                    // },
                    "ajax": {
                        "type": 'GET',
                        "url": function (node) {
                            var url = "";
                            stock.nodeBuffer = node;
                            // var type = node.attr('type'); 
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
                                    content: "Any files found in "+stock.name,//"Any files found in "+stock.name
                                });
                            }
                            setTimeout(function(){stock.tree.openAll();},600);
                            var result = [];
                            if(!stock.firstFlag){
                                result = stock.parseMessage(new_data,stock.nodeBuffer.attr('path'));
                            }
                            else{
                                result = stock.parseMessage(new_data);
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
                        var up = node.attr("up");
                        if (rel == "collection" || rel == "model" || rel == "child" || rel == "folder") {
                            result.icon = {
                                'label': 'Add files',
                                'action': stock.button,
                            };
                        }
                        if ((rel == "collada" || rel == "gltf") && up == "true") {
                            result.preview = {
                                'label': 'Preview',
                                'action': stock.preview,
                            };
                        }
                        if (rel == "gltf" && up == "true") {
                            result.display = {
                                'label': 'Display',
                                'action': stock.displayGltf,
                            };
                        }
                        if (rel == "collada" && up == "true") {
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
            var stock = this;
            setTimeout(function(){
                for(var i=0;i<stock.images.length;i++){
                    console.debug(stock.images[i].id,$("#"+stock.images[i].id).length)
                    GUI.addTooltip({
                        parent: $("#"+stock.images[i].id),
                        content: "<img style='max-height:150px;max-width:150px' src="+stock.url+"/"+stock.images[i].path+" ></img>",
                    })
                    
                }
            },1000)
        }
        this.setUpload = function () {
            this.nodeRoot = $("#"+this.id)
            var upload = {
                parent: this.area,
                id: this.id,
                url: location.protocol + "//" + location.host + '/rest3d/tmp/',
                tree: this.tree["tree_"+this.name],
                nodeRoot: this.nodeRoot
            };
            console.debug(this.nodeRoot.length)
            upload = setViewer6Upload(upload);
            upload.progress["progress_" + this.id].width("100%");
            this.button =upload.button;
        }
                this.init();
        // this.createTree();
        // this.setUpload(); //we load the upload feature, by default for the moment
    }
    return rest3dToTree;
})