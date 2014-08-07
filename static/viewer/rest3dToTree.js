'use strict';
// this.name = name;
//  this.login = indexLogin;/// indexLogin : 0 -> no login needed, 1 -> optional, 2 -> required, 3-> not yet implemented
//  this.picture = pictureTmp;
//  this.description;
//  this.signin;///It's an url. if array, redirection with new window. If not, iframe used
//  this.upload;/// Set whether or not the upload feature is available
define(['rest3d', 'upload', 'viewer', 'database', 'collada', 'gltf'], function (rest3d, setViewer6Upload, viewer, databaseTab, COLLADA, glTF) {
    window.objectRest3d = {};
    var rest3dToTree = function (data, parent) {

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
        this.search = false;
        this.progress = $("<progress value=0 max=100></progress>");
        this.infoUrl = location.protocol + "//" + location.host + "/rest3d/info/" + this.name + "/";
        this.uploadUrl = location.protocol + "//" + location.host + "/rest3d/" + this.name + "/";
        this.searchUrl = location.protocol + "//" + location.host + "/rest3d/search/" + this.name + "/";
        this.dataUrl = location.protocol + "//" + location.host + "/rest3d/data/" + this.name + "/";
        this.convertUrl = location.protocol + "//" + location.host + "/rest3d/convert/tmp/";
        this.uploadToTmp = location.protocol + "//" + location.host + "/rest3d/tmp/";
        this.uploadToDb = location.protocol + "//" + location.host + "/rest3d/db/";
        window.objectRest3d[this.name] = this;
        var stock = this;

        this.init = function () {
            var tmp = new databaseTab(this, this.data, this.area);
        }

        this.preview = function () {
            $("#dialog").dialog("close");
            var gitHtml = $('<div id="dialog"><iframe id="myIframe" src="" style="height:99% !important; width:99% !important; border:0px;"></iframe></div>');
            $('body').append(gitHtml);
            $("#dialog").dialog({
                title: "Preview",
                width: '600',
                height: '500',
                open: function (ev, ui) {
                    $('#myIframe').attr('src', '/viewer/easy-viewer.html?file='+stock.dataUrl+stock.nodeContext.li_attr.path);
                },
                close: function () {
                    gitHtml.remove();
                },
            });
        }

        this.previewWarehouse = function () {
            $("#dialog").dialog("close");
            var gitHtml = $('<div id="dialog"><iframe id="myIframe" src="" style="height:100% !important; width:100% !important; border:0px;"></div>');
            $('body').append(gitHtml);
            $("#dialog").dialog({
                title: stock.nodeContext.name,
                width: '600',
                height: '500',
                open: function () {
                    $('#myIframe').attr('src', stock.nodeContext.li_attr.previewUri);
                },
                close: function () {
                    gitHtml.remove();
                },
            });
            $("#dialog").css({
                'min-height': 'none !important;'
            });
        }

        this.icon = function () {
            $("#dialog").dialog("close");
            var gitHtml = $('<div id="dialog"><img src=""/></div>');
            $('body').append(gitHtml);
            $("#dialog").dialog({
                title: stock.nodeContext.text,
                width: '300',
                height: '300',
                open: function () {
                    $('#myIframe').find('img').attr('src', stock.nodeContext.li_attr.iconuri);
                },
                close: function () {
                    gitHtml.remove();
                },
            });
            $("#dialog").css({
                'min-height': 'none !important;'
            });
        }

        this.displayCollada = function () {
            if (stock.name == "warehouse") {
                $.post(stock.setParentToUpload(stock.nodeContext), {
                    url: stock.dataUrl +'/?uuid='+ stock.nodeContext.li_attr.uuid
                }).done(function (data) {
                    data = jQuery.parseJSON(data);
                    window.renderMenu.tab_tmp.focusTab();
                    data.forEach(function (file) {
                        if (file.name == stock.nodeContext.text) {
                            setTimeout(function () {
                                window.pleaseWait(true);
                                var path = stock.nodeContext.li_attr.path.split('/');
                                path.shift();
                                path = path.join('/');
                                COLLADA.load(location.protocol + "//" + location.host + "/rest3d/data/tmp/"+encodeURI(path), viewer.parse_dae).then(
                                    function (flag) {
                                        window.pleaseWait(false);
                                        buffer.notif(stock.nodeContext.text);
                                    })
                            }, 700);
                        }
                    })
                }).fail(function (err) {
                    console.error(err)
                });
            }
            else {
                window.pleaseWait(true);
                COLLADA.load(stock.dataUrl+stock.nodeContext.li_attr.path, viewer.parse_dae).then(
                    function (flag) {
                        window.pleaseWait(false);
                        buffer.notif(stock.nodeContext.text);
                    })
            }
        }

        this.displayGltf = function () {
            window.pleaseWait(true);
            glTF.load(stock.buildUrlData(), viewer.parse_gltf).then(
                function (flag) {
                    window.pleaseWait(false);
                    window.notif(stock.nodeContext.text);
                })
        }

        this.download = function () {
            var path = stock.nodeContext.li_attr.path;
            if (path[0] === '/') path = path.substring(1);
            if(stock.name == "warehouse"){
                var win = window.open(stock.dataUrl + 'q?uuid=' + stock.nodeContext.li_attr.uuid, '_blank');
            } else {
                var win = window.open(stock.dataUrl+stock.nodeContext.li_attr.path, '_blank');
            }
        }

        this.buildUrlData = function () {
            if (this.name == "warehouse" || this.name == "3dvia") {
                var relativePath = stock.nodeContext.li_attr.path.substr(0, stock.nodeContext.li_attr.path.lastIndexOf("/"));
                if (relativePath[0] === '/') relativePath = relativePath.substring(1);
                var path = encodeURI(stock.dataUrl + relativePath + '/?uuid=' + stock.nodeContext.li_attr.uuid);
            }
            else {
                var relativePath = stock.nodeContext.li_attr.path.substr(0, stock.nodeContext.li_attr.path.lastIndexOf("/"));
                var path = encodeURI("/rest3d/data/" + stock.name +'/?uuid=' + stock.nodeContext.li_attr.uuid);
            }
            path = path.split("(").join("");
            path = path.split(")").join("");
            return path;
        }

        this.createCollection = function (data) {
            var result = {};
            result.icon = "../gui/images/menu-scenes.png";
            result.text = "New Collection";
            result.li_attr = {};
            result.li_attr.type = "collection";
            //result.state = {"disabled":true};
            result.children = false;
            if(!data){
                var ref = this.tree["tree_" + this.name].jstree('create_node', '#', result, 'last');
                this.tree["tree_" + this.name].jstree('edit', ref);
            } else {
                var inst = $.jstree.reference(data.reference),
                obj = inst.get_node(data.reference);
                inst.create_node(obj, result, "last", function (new_node) {
                    setTimeout(function () { inst.edit(new_node); },0);
                });
            }
        }

        this.setParentToUpload = function () {
            if (stock.nodeContext.li_attr.type === "collada" || stock.nodeContext.li_attr.type === "gltf") {
                var buffer = $('#'+stock.nodeContext.id);
                for (var i = 0; i < 7; i++) {
                    buffer = buffer.parent();
                    if (buffer.attr('type') == 'model') {
                        var name = buffer.attr('name');
                        stock.tmpParent = name;
                    }
                }
            } else {
                var name = stock.nodeContext.text;
            }
            if(stock.name=='tmp')name = stock.uploadToTmp + encodeURI(name);
            else{name = stock.uploadToDb + encodeURI(name);}
            name = name.split("(").join("");
            name = name.split(")").join("");
            return name;
        }

        this.upToTmp = function () {
            $.post(stock.setParentToUpload(stock.nodeContext), {
                url: stock.dataUrl +'/?uuid='+ stock.nodeContext.li_attr.uuid
            }).done(function () {
                window.renderMenu.tab_tmp.focusTab();
            }).fail(function (err) {
                console.error(err)
            });
        }

        this.upToDb = function () {
            $.post(stock.setParentToUpload(stock.nodeContext), {
                url: stock.buildUrlData(stock.nodeContext)
            }).done(function () {
                window.renderMenu.tab_db.focusTab();
            }).fail(function (err) {
                console.error(err)
            })
        }

        this.convertMenu = function () {
            // result = $("#" + node.attr("id")).data();
            // result.file.relativePath = "";
            $.post(stock.convertUrl + stock.nodeContext.li_attr.path.split(stock.nodeContext.li_attr.name).join(''), {
                url: stock.dataUrl + '/' + stock.nodeContext.li_attr.path
            }).done(function (data) {
                console.debug(data);
            }).fail(function (err) {
                console.error(err)
            });
        }
        this.images = [];
        this.bufferUuid = "";

        this.setIcon = function(type){
            switch(type){
                case "zip": 
                    type= "../gui/images/menu-scenes.png";break;
                case "collection": 
                    type= "../gui/images/menu-scenes.png";break;
                case "collada": 
                    type = "../favicon.ico";break;
                case "gltf": 
                    type = "../gui/images/3d_model.png";break;
                case 'shader': 
                    type = "../gui/images/geometry.png";break;
                case "file": 
                    type =  "../gui/images/file.png";break;
                case "kml": 
                    type = "../gui/images/kml.png";break;
                case "texture": 
                    type =  "../gui/images/media-image.png";break;
                case "model": 
                    type =  "../gui/images/3d_model.png";break;
                case "empty": 
                    type =  "../gui/images/cross.jpg";break;
                case "folder":
                    type="../gui/images/folder.png";break;
                case "model":
                    type="../gui/images/3d_model.png";break;
                default:
                    type="../gui/images/folder.png";break;
            }
            return type;
        }

        this.nodeArray = function (parent, name, id, uuid, type, path,close) {
            if(typeof uuid !== 'string'){
                if(uuid.uuid[0]=="c")uuid = uuid.uuid;
                else if(uuid.mimetype=="application/vnd.google-earth.kmz"){
                    var description = uuid.description;
                    var modelUri = uuid.modelUri;
                    var previewUri = uuid.previewUri;
                    var iconUri = uuid.iconUri;
                    uuid = uuid.uuid;
                } else if(stock.canJSON(uuid)){
                    uuid = uuid.uuid;
                } else {
                    return
                }
            }
            var result1 = {};
            result1.text = decodeURI(name).substr(0, 60);
            // if (close) result.children = true;
            // else if (type == "folder" && (this.name == "warehouse" || this.name == "3dvia")) {
            if(close==true){
                result1.children = true;
            }
            else{
                result1.state = {'opened':true}
                result1.children = [];
            }
            // }
            // else if (name.split(".").length < 2) {
            //     result.children = [];
            // }
            // else{
            //     result.children = [];
            // }
            if (uuid == name) {
                uuid = stock.bufferUuid;
            }
            result1.id = id;
            result1.icon = stock.setIcon(type);
            if (path[0] === '/') path = path.substring(1);
            result1.li_attr = {
                "name": decodeURI(name).substr(0, 60),
                "uuid": uuid,
                "path": path,
                "type":type,
            }
            if(description)result1.li_attr.description=description;
            if(modelUri){
                result1.li_attr.modelUri=modelUri;
            }
            if(previewUri)result1.li_attr.previewUri=previewUri;
            if(iconUri){
                result1.li_attr.iconUri=iconUri;
                result1.icon= iconUri;
                result1.li_attr.type = 'model';
                 setTimeout(function () {
                    GUI.addTooltip({
                        parent: $("#" + id).find('a'),
                        content: "<img style='max-height:150px;max-width:150px' src=" + iconUri + " ></img>",
                    })
                },500);
            }
            if(description)result1.li_attr.description=description;
            // if(parent==true){parent=[];}
            parent.push(result1);
            if (type == "texture") {
                this.images.push({
                    "id": id,
                    "path": path
                });
            }
        }

        var checkIfExist = function (value, arbre) {
            value = decodeURI(value).substr(0, 60);
            for (var i = 0; i < arbre.length; i++) {
                if (value == arbre[i].text) {
                    return i;
                }
            }
            return -1;
        }

        this.buildJson = function (split, uuid, arbre, path) {
            var true_path = path + "/" + decodeURI(split[0]);
            if (split.length == 0) {
                return;
            }
            // var check = checkIfExist(decodeURI(split[0]), arbre);
            // var id = this.encodeToId(decodeURI(split[0]));
            var check = checkIfExist(split[0], arbre);
            var id = stock.encodeToId(split[0],path);
            id = stock.checkIfIdExist(id);
            var ext = split[0].match(/\.[^.]+$/);
            var type = this.extensionToType(ext);
            if (check !== -1) {
                split.shift();
                this.buildJson(split, uuid, arbre[check].children, true_path);
            }
            else {
                this.nodeArray(arbre, split[0], id, uuid, type, true_path, close);
                split.shift();
                this.buildJson(split, uuid, arbre[arbre.length - 1].children, true_path);
            }
        }

        this.parseMessage = function (data, path) {
            if (!path) {
                var path = "";
            }
            var result = {};
            result.children = [];
            for (var key1 in data.assets) {
                if (key1.indexOf("\\") != -1) {
                    var tmp = key1.split('\\');
                    tmp.slice(0, 1)
                }
                else {
                    var tmp = key1.split('/');
                }
                if(!tmp || !tmp.length)tmp.shift();
                this.buildJson(tmp, data.assets[key1], result.children, path);
            }
            for (var key in data.children) {
                this.nodeArray(result.children, key, this.encodeToId(key), data.children[key], "collection", path + '/' + key, true);
            }
            return result.children;
        }

        this.canJSON = function(value) {
            try {
                JSON.stringify(value);
                return true;
            } catch (ex) {
                return false;
            }
        }

        this.buildContent = function(){
            this.accordion = GUI.accordion({
                id: 'accordion_'+stock.name,
                parent: this.area,
                item: [{
                    id: "sample_"+stock.name,
                    text: "Sample of collections"
                },
                {
                    id: "search_"+stock.name,
                    text: "Search"
                },
                ]
             })
            this.area = this.accordion["sample_"+stock.name];
            this.createTree();
            this.searchInput = GUI.addInput("searchInputWarehouse", "Sofa", this.accordion["search_"+stock.name]).width("77%");
            this.searchInput.keypress(
              function(e){
              if (e.keyCode==13){
                stock["tree_search"]['tree_search_' + stock.name].jstree("refresh");
                } 
            });
            this.submitSearch = GUI.button("search", this.accordion["search_"+stock.name], function(){
                stock["tree_search"]['tree_search_' + stock.name].jstree("refresh");
            });
            this.area = stock.accordion["search_"+stock.name];
            this.search=true;
            this.createTree();
        }

        this.createTree = function () {
            var stock = this;
            this.nodeBuffer;
            this[this.search ? "tree_search":"tree"] = GUI.treeBis({
                id: this.search ? 'tree_search_' + this.name : 'tree_' + this.name,
                parent: this.area,
                "plugin": ["themes", "json_data", "ui", "types", "sort", "search", "contextmenu"],
                core: {
                    "data": {
                        "type": 'GET',
                        "url": function (node) {
                            var url = "";
                            stock.nodeBuffer = node;
                            if (node.id == "#") {
                                if(!stock.search){
                                    url = stock.infoUrl;
                                } else {
                                    url = stock.searchUrl+stock.searchInput.val();
                                }
                                stock.firstFlag = true;
                            }
                            else {
                                stock.bufferUuid = node.li_attr.uuid;
                                var url = node.li_attr.path;
                                if (url[0] === '/') url = url.substring(1);
                                url = stock.infoUrl + '?uuid=' + stock.bufferUuid;
                                stock.firstFlag = false;
                            }
                            return url;
                        },
                        "dataFilter": function (new_data) {
                            new_data = jQuery.parseJSON(new_data);
                            if(stock.name=='3dvia')new_data=new_data.resources[0];
                            stock.image.remove();
                            stock.flagEmpty = false;
                            if (stock.nodeBuffer.id == "#" && jQuery.isEmptyObject(new_data.assets) && jQuery.isEmptyObject(new_data.children)) {
                                setTimeout(function(){ 
                                    stock.image = GUI.image(stock.tree['tree_' + stock.name], "img-emptybox", "../gui/images/empty_box.gif", 60, 60, "before");
                                    stock.flagEmpty = true;
                                    GUI.addTooltip({
                                        parent: stock.image,
                                        content: "Any files found in " + stock.name + ", click on the picture or drag and drop for starting to upload your models", //"Any files found in "+stock.name
                                    });
                                    stock.image.click(function () {
                                        stock.image.remove();
                                        stock.parentTree = "#";
                                        stock.addFiles();
                                    })
                                },300)
                            }

                            var result = [];
                            if (!stock.firstFlag) {
                                result = stock.parseMessage(new_data, stock.nodeBuffer.li_attr.path);
                                // setTimeout(function(){stock.tree.openAll();},600);
                            }
                            else {
                                result = stock.parseMessage(new_data);
                            }
                            if (stock.name !== "warehouse") {
                                setTimeout(function () {
                                    for (var i = 0; i < stock.images.length; i++) {
                                        GUI.addTooltip({
                                            parent: $("#" + stock.images[i].id).find('a'),
                                            content: "<img style='max-height:150px;max-width:150px' src=" + encodeURI(stock.dataUrl + stock.images[i].path) + " ></img>",
                                        })
                                    }
                                }, 1000)
                            }
                            return result;
                        }
                    },
                    'check_callback' : true,
                    'themes' : {
                            'responsive' : false,
                            'variant' : 'small',
                            'stripes' : true
                        },
                },
                "dnd": {
                    "drop_finish": function (data) {
                        console.log('drop finish' + data);
                        //this is where the actual call to the sever is made for rearranging the triples for drag n drop.
                        //console.log(data);
                        //console.log('target '+ data.r);

                    },
                },
                "contextmenu": {
                    "items": function (node) {
                        var result = {};
                        var rel = node.li_attr.type;
                        var up = node.li_attr.upload;
                        stock.nodeContext = node;
                        if(up==undefined)up=false;
                        if(stock.name!=="warehouse"&&(rel == "collection" || rel == "model" || rel == "zip" || rel == "folder") ){
                            result.create = {
                                'label': 'Create collection',
                                'icon': '../gui/images/createcollection.png',
                                "action": stock.createCollection,
                            };
                            result.addfiles = {
                                "separator_before": false,
                                "separator_after": false,
                                'label': 'Add files',
                                'icon': '../gui/images/file_add.png',
                                'action': stock.addFiles_contextMenu,
                            };
                        }

                        if (!up && rel !== "collection" && rel !== "folder" && stock.name !== "warehouse") {
                            result.download = {
                                "separator_before": false,
                                "separator_after": false,
                                'icon': '../gui/images/drive.png',
                                'label': 'Download',
                                'action': stock.download,
                            };
                        }

                        else if ((rel == 'folder'||rel == 'model')&& stock.name == "warehouse" ) {
                            result.download = {
                                "separator_before": false,
                                "separator_after": false,
                                'icon': '../gui/images/drive.png',
                                'label': 'Download',
                                'action': stock.download,
                            };
                            result.upToTmp = {
                                "separator_before": false,
                                "separator_after": false,
                                'label': 'Upload to tmp',
                                'icon': '../gui/images/upload.png',
                                'action': stock.upToTmp,
                            };
                            if (window.objectRest3d.hasOwnProperty("db")) {
                                result.upToDb = {
                                    "separator_before": false,
                                    "separator_after": false,
                                    'icon': '../gui/images/upload.png',
                                    'label': 'Upload to db',
                                    'action': stock.upToDb,
                                };
                            }
                        }

                        if ((rel == "collada" || rel == "gltf") && !up && stock.name !== "warehouse") {
                            result.preview = {
                                "separator_before": false,
                                "separator_after": false,
                                'label': 'Preview',
                                'icon':'../gui/images/preview.png',
                                'action': stock.preview,
                            };
                        }
                        if (rel == "gltf" && !up) {
                            result.displayGltf = {
                                "separator_before": false,
                                "separator_after": false,
                                'label': 'Display',
                                'icon':'../gui/images/bunny.png',
                                'action': stock.displayGltf,
                            };
                        }
                        if (rel == "collada" && !up) {
                            result.displayCollada = {
                                "separator_before": false,
                                "separator_after": false,
                                'icon':'../gui/images/bunny.png',
                                'label': 'Display',
                                'action': stock.displayCollada,
                            };
                            result.convert = {
                                "separator_before": false,
                                "separator_after": false,
                                'icon':'../gui/images/convert.png',
                                'label': 'Convert',
                                'action': stock.convertMenu,
                            };
                        }
                        if(node.li_attr.description) {
                            result.descript = {
                                "separator_before": false,
                                "separator_after": false,
                                'label': 'Description',
                                'icon': '../gui/images/info.png',
                                'action' : function(){
                                    $("#dialog").dialog("close");
                                    var gitHtml = $('<div id="dialog"></div>');
                                    $('body').append(gitHtml);
                                    $("#dialog").dialog({
                                        title: stock.nodeContext.text, 
                                        open: function () {
                                            gitHtml.append("<img src="+stock.nodeContext.li_attr.iconUri+" style='text-align: center !important; vertical-align: middle !important; display: table-cell;'/>");
                                            gitHtml.append("<hr>");
                                            gitHtml.append(node.li_attr.description);
                                        },
                                        close: function () {
                                            gitHtml.remove();
                                        },
                                    });
                                    $("#dialog").css({
                                        'min-height': 'none !important;'
                                    });
                                }
                            }
                        }
                        if (node.li_attr.previewUri) {
                            result.preview = {
                                "separator_before": false,
                                "separator_after": false,
                                'label': 'Preview model',
                                'icon': '../gui/images/preview.png',
                                'action': stock.previewWarehouse,
                            };
                        }
                        if (node.li_attr.modelUri) {
                            result.original = {
                                "separator_before": false,
                                "separator_after": false,
                                'label': 'Open original page',
                                'icon': '../gui/images/warehouse_icon.png',
                                'action': function(){
                                    var win = window.open(node.li_attr.modelUri, '_blank');
                                    win.focus();
                                },
                            };
                        }
                        return result;
                    }
                },
            })
    if(stock.name !== "warehouse"){
        stock.tree["tree_" + stock.name].bind("rename_node.jstree", function(e, data){
            $('#'+data.node.id).attr('name',data.text);
            $('#'+data.node.id).attr('path',data.text);
            if (stock.nodeContext == undefined){
                data.node.li_attr.path = data.text;
                var path = '';
            } else {
                $('#'+data.node.id).attr('path',stock.nodeContext.li_attr.path + '/' + data.text);
                var path = stock.nodeContext.li_attr.path;
            }
            $.post(stock.uploadUrl+path,{'collection':data.text}).done(function(){
                //stock.tree["tree_" + stock.name].jstree("refresh");
                //stock.tree.openAll();
            });
        });
    }
        }

        this.encodeToId = function (name,path) { // FUNCTION TO ENCODE ANY STRING TO AN ID HANDLED BY HTML/ REEEAAAALLLY IMPORTANT
            if(stock.name=="tmp") {
                if(path) name = path+'/'+name;
            }
            // SUPPORT HTML
            name = "a" + encodeURI(name);
            name = name.split('(').join("");
            name = name.split(')').join("");
            name = name.split('@').join("");
            name = name.split('~').join("");
            name = name.split('*').join("");
            name = name.split('!').join("");
            name = name.split(' ').join("");
            name = name.split(',').join("");
            name = name.split('/').join("");
            name = name.split('\\').join("");
            name = name.split('\'').join("");
            name = name.split(';').join("");
            name = name.split('?').join("");
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

        this.checkIfIdExist = function (name) {
            while (true) {
                if ($("#" + name).length == 1) {
                    name += '_1';
                }
                else {
                    break;
                }
            }
            return name;
        }

        this.extensionToType = function (ext) {
            var result;
            if (ext == null) {
                return "folder";
            }
            else {
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
        this.addNodeRoot = function (object) {
            this.tree["tree_" + this.name].jstree('create_node', '#', object, 'last');
        }

        this.addNode = function (object) {
            if(object.li_attr.type=='folder'){
                this.tree["tree_" + this.name].jstree('create_node', stock.parentTree, object, 'last');
            } else {
                this.tree["tree_" + this.name].jstree('create_node', stock.parentTree, object, 'last');
            }
            //stock.tree["tree_" + stock.name].jstree("refresh");

        }

        this.setUpload = function () {
            this.nodeRoot = $("#" + this.id)
            var upload = {
                parent: this.area,
                id: this.id,
                url: location.protocol + "//" + location.host + '/rest3d/' + this.name + '/',
                tree: this.tree["tree_" + this.name],
            };
            this.uploadPlugin = setViewer6Upload(upload);
            this.addFiles = this.uploadPlugin.button;
            this.dropFlag = false; //flag used to determine whether or not the file has been draged&droped
            var stock = this;

            this.addFiles_contextMenu = function (node) {
                stock.parentTree = node;
                stock.addFiles();
            }

            this.uploadPlugin.refresh.click(function () {
                stock.tree["tree_" + stock.name].jstree("refresh");
                stock.tree.openAll();
            })
            this.uploadPlugin.rootCollection.click(function () {
                stock.createCollection();
            })
            this.uploadPlugin.jquery.bind('fileuploaddrop', function (e, data) {
                window.pleaseWait(true);
                setTimeout(function () {
                    window.pleaseWait(false)
                }, 1000)
                if (data.files.length < 200) {
                    if (e.idToDrop == "") {
                        stock.parentTree = false;
                    }
                    else if ($('#' + e.idToDrop).length == 0) {
                        stock.parentTree = false;
                    }
                    else if ($('#' + e.idToDrop).attr('type') !== undefined) {
                        var rel = $('#' + e.idToDrop).attr('type')
                        if (rel == "collection" || rel == "model" || rel == "zip" || rel == "folder") {
                            stock.parentTree = $('#' + e.idToDrop);
                        }
                        else {
                            var buffer = $('#' + e.idToDrop);
                            var foundFlag = false;
                            for (var i = 0; i < 4; i++) {
                                buffer = buffer.parent();
                                if (buffer.attr('type') !== undefined) {
                                    var rel = buffer.attr('type');
                                    if (rel == "collection" || rel == "model" || rel == "zip" || rel == "folder") {
                                        stock.parentTree = buffer;
                                        foundFlag = true;
                                        break;
                                    }
                                }
                            }
                            if (!foundFlag) {
                                stock.parentTree = -1;
                            }
                        }
                    }
                    else {
                        e.stopPropagation();
                        e.preventDefault();
                        console.log("Couldn't add files directly to the root, please create a root collection before uploading");
                    }
                }
                else {
                    e.stopPropagation();
                    e.preventDefault();
                    console.log("Too many files draged at once, limit sets at 100")
                }
            })
            this.timer = function(){
                var i = 0;
                while(i<100000000){
                    i++;
                }
                return;
            }
            this.uploadPlugin.jquery.bind('fileuploadadd', function (e, data) {
                if(data.files[0].name.indexOf("DS_Store") > -1){
                    return;
                } 
                if (stock.parentTree == false) {
                    stock.parentTree = "#";
                    var flagRoot = true;
                }
                var origin = stock.parentTree;
                //var flagRoot=true;
                if (data.files[0].relativePath) {
                    var relativePath = data.files[0].relativePath.split("/");
                    relativePath.forEach(function (folder) {
                        if (folder !== "") {
                            if(stock.parentTree!=="#"){
                                var objectId = stock.encodeToId(folder,stock.parentTree.attr("path"));
                            } else {
                                var objectId = stock.encodeToId(folder);
                            }
                            if ($('#' + objectId).length !== 1) {
                                var object = {};
                                object.text = folder;
                                object.li_attr = {};
                                object.li_attr.type = "folder";
                                object.icon = stock.setIcon(object.li_attr.type);
                                if (stock.parentTree == "#") object.li_attr.path = folder;
                                else object.li_attr.path = stock.parentTree.attr("path") + '/' + folder;
                                objectId = stock.checkIfIdExist(objectId);
                                object.id = objectId;
                                if (stock.parentTree == "#"){
                                    stock.addNodeRoot(object)
                                }
                                else stock.addNode(object)
                            }
                            stock.parentTree = $("#" + objectId);
                        }
                    })
                }
                if(stock.parentTree!=='#'){
                    while(stock.parentTree.length==0){}
                }
                var tmp = {};
                tmp.text = data.files[0].name;
                var id = stock.encodeToId(tmp.text);
                id = stock.checkIfIdExist(id);
                tmp.li_attr = {};
                tmp.id = id;
                tmp.li_attr.upload = true;
                tmp.li_attr.type = stock.extensionToType(tmp.text.match(/\.[^.]+$/));
                tmp.icon = stock.setIcon(tmp.li_attr.type);
                if (stock.parentTree == "#") {
                    data.url = stock.uploadUrl + tmp.text;
                    tmp.li_attr.path = tmp.text;
                }
                else {
                    data.url = stock.uploadUrl + stock.parentTree.attr("path");
                    tmp.li_attr.path = stock.parentTree.attr("path") + '/' + tmp.text;
                    data.files[0].relativePath = tmp.li_attr.path;
                }
                if (stock.parentTree == "#"){
                    stock.addNodeRoot(tmp);
                }
                else stock.addNode(tmp)
                var checkbox = $('<input type="checkbox" style="position:absolute;float:right;right:15px !important;" checked=true>')
                setTimeout(function(){$("#" + id).append(checkbox)},300);
                stock.uploadPlugin.setting.click(function () {
                    stock.timer();
                    if ($("#" + id).find('input').is(':checked')) {
                        var request = data.submit();
                        if (stock.parentTree == false) {
                            request.abort();
                        }
                    }
                })
                if (flagRoot) {
                    stock.image.remove();
                }
                stock.parentTree = origin;
                stock.tree.openAll();
            })
            this.uploadPlugin.jquery.bind('fileuploadstart', function (e) {
                window.fl4reStatus("UPLOAD", stock.progress);
            });
            this.uploadPlugin.jquery.bind('fileuploadprogressall', function (e, data) {
                var progress = parseInt(data.loaded / data.total * 100, 10);
                stock.progress.val(progress);
                if (data.total == data.loaded) {
                    setTimeout(function () {
                        window.fl4reStatus("READY");
                        stock.tree["tree_" + stock.name].jstree("refresh");
                        setTimeout(function(){stock.tree.openAll();},600);
                    }, 500)
                }
            })
            window.renderMenu["tab_" + stock.name].focusTab(function () {
                stock.tree["tree_" + stock.name].jstree("refresh");
            })
            return;
        }
        this.init();
    }
    return rest3dToTree;
})