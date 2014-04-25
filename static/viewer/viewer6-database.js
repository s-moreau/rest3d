'use strict';
define(['viewer', 'gui', 'uploadViewer', 'rest3d', 'q', 'collada', 'gltf', 'renderer', 'state', 'channel'],
    function (viewer, gui, setViewer6Upload, rest3d, Q, COLLADA, glTF, RENDERER, State, Channel) {
        function databaseTab(_json) {
            this.name = _json.name;
            this.login = _json.login;
            this.picture = _json.picture;
            this.description = _json.description;
            this.signin = _json.signin;
            var nodeBuffer;
            var stock = this;
            window.renderMenu.addTab({
                id: stock.name + "_tab",
                text: "  " + stock.name,
            });
            this.parseDatabaseJson = function (param_in, param_out) {
                function children(param_in, param_out) {
                    for (var j = 0; j < param_in.length; j++) {
                        var result = {};
                        var tmp = param_in[j];
                        var ext = tmp.name.match(/\.[^.]+$/);
                        if (ext == '.dae') {
                            ext = "collada";
                            result.data = tmp.name.substr(0, 60);
                            result.attr = {
                                "id": result.data,
                                "rel": ext,
                                "name": result.data
                            };
                            param_out.push(result);
                        }
                        else if (ext == '.kml') {
                            ext = "kml";
                            result.data = tmp.name.substr(0, 60);
                            result.attr = {
                                "id": result.data,
                                "rel": ext,
                                "name": result.data
                            };
                            param_out.push(result);
                        }
                        else if (ext == '.jpg' || ext == '.png' || ext == '.jpeg' || ext == '.tga') {
                            ext = "image";
                            result.data = tmp.name.substr(0, 60);
                            result.attr = {
                                "id": result.data,
                                "rel": ext,
                                "name": result.data
                            };
                            param_out.push(result);
                        }
                        else if (ext == '.txt') {
                            ext = "text";
                            result.data = tmp.name.substr(0, 60);
                            result.attr = {
                                "id": result.data,
                                "rel": ext,
                                "name": result.data
                            };
                            param_out.push(result);
                        }
                        else {
                            ext = "folder";
                            result.data = tmp.name.substr(0, 60) || "folder";
                            result.attr = {
                                "id": result.data,
                                "rel": ext,
                                "name": result.data
                            };
                            result.children = [];
                            result.children = children(tmp.children, result.children);
                            param_out.push(result);
                        }
                    }
                    return param_out;
                }
                if (param_in.hasOwnProperty("assets")) {
                    var assets = param_in.assets;
                }
                if (assets && (assets.length == 0 || assets == null)) {
                    if (nodeBuffer) {
                        try {
                            nodeBuffer.attr("rel", "empty");
                        }
                        catch (e) {}
                    };
                }
                else if (param_in.type == "folder" || param_in.type == "asset") {
                    var result = {};
                    var path = param_in.children;
                    try {
                        result.data = param_in.name.substr(0, 60)
                    }
                    catch (err) {
                        result.data = "folder";
                    }
                    result.attr = {
                        "id": result.data,
                        "rel": "folder",
                        "name": result.data
                    };
                    result.children = [];
                    result.children = children(param_in.children, result.children);
                    param_out.push(result);
                }
                else {
                    for (var i = 0; i < assets.length; i++) {
                        var result = {};
                        var asset = assets[i];
                        result.data = asset.name.substr(0, 60);
                        result.state = "closed";
                        result.attr = {
                            "id": asset.id,
                            "rel": asset.type,
                            "iconuri": asset.iconUri,
                            "name": result.data,
                            "previewuri": asset.previewUri,
                            "asseturi": asset.assetUri
                        };
                        param_out.push(result);
                    }
                }
                return param_out;
            };

            this.download = function (node) {
                var href = $('<a style="display:none" href="/rest3d/' + stock.name + '/data/' + node.attr("id") + '" target="_blank"></a>');
                $('body').append(href);
                href[0].click();
                href[0].remove();
            };

            this.display = function (node) {
                node.attr("type", "uploaded");
                var uri = node.attr("asseturi");
                var call = function (data) {
                    var deferred = Q.defer();
                    var e = {};
                    e.idDatabase = "c_" + viewer.idUser;
                    data = jQuery.parseJSON(data);
                    window.sortAssetDrop(e, data);
                    window.visualizeDatabase(data);
                    renderMenu.render.focusTab();
                    deferred.resolve();
                    return deferred.promise;
                };
                rest3d.urlUpload(uri, call, viewer.idUser);
            }
            this.preview = function (node) {
                $("#dialog").dialog("close");
                var gitHtml = $('<div id="dialog"><iframe id="myIframe" src="" style="height:100% !important; width:100% !important; border:0px;"></div>');
                gitPanel = $('body').append(gitHtml);
                $("#dialog").dialog({
                    title: node.attr('name'),
                    width: '600',
                    height: '500',
                    open: function () {
                        $('#myIframe').attr('src', node.attr("previewuri"));
                    },
                    close: function () {
                        gitHtml.remove();
                    },
                });
                $("#dialog").css({
                    'min-height': 'none !important;'
                });
            }
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
            this.trees;
            this.generateCoreTab = function () {
                renderMenu[stock.name + "_tab"].append("<a style='text-decoration:underline'>Features:</a><br></br>");
                this.accor = GUI.accordion({
                    id: stock.name + "_accor",
                    parent: renderMenu[stock.name + "_tab"],
                    item: [{
                        id: "sample_" + stock.name,
                        text: "Sample of collections"
                    }, {
                        id: "search_" + stock.name,
                        text: "Search"
                    }, ]
                })
                this.flagTrees = true;
                this.treeCallback = function () {
                    if (stock.flagTrees) {
                        GUI.treeBis({
                            id: stock.name,
                            parent: stock.accor["sample_" + stock.name],
                            json: {
                                "ajax": {
                                    "type": 'GET',
                                    "url": function (node) {
                                        nodeBuffer = node;
                                        var nodeId = "";
                                        var url = "";
                                        if (node == -1) {
                                            url = location.protocol + "//" + location.host + "/rest3d/" + stock.name + "/";
                                        }
                                        else if (node.attr('rel') == "collection" || "model") {
                                            nodeId = node.attr('id');
                                            url = location.protocol + "//" + location.host + "/rest3d/" + stock.name + "/" + nodeId;
                                        }
                                        return url;
                                    },
                                    "success": function (new_data) {
                                        var result = [];
                                        result = stock.parseDatabaseJson(new_data, result);
                                        return result;
                                    }
                                }
                            },
                            "contextmenu": {
                                "items": function (node) {
                                    var result = {};
                                    if (node.attr("iconuri")) {
                                        result.icon = {
                                            'label': 'Display icon',
                                            'action': stock.icon,
                                        };
                                    }
                                    if (node.attr("rel") == "model") {
                                        result.display = {
                                            'label': 'Upload',
                                            'action': stock.display,
                                        };
                                        result.download = {
                                            'label': 'Download',
                                            'action': stock.download,
                                        };
                                    }
                                    if (node.attr("previewuri")) {
                                        result.preview = {
                                            'label': 'Preview model',
                                            'action': stock.preview,
                                        };
                                    }
                                    return result;
                                }
                            },
                            type: {
                                "types": {
                                    "folder": {
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
                                    "text": {
                                        "icon": {
                                            "image": "../gui/images/file.png",
                                        },
                                    },
                                    "kml": {
                                        "icon": {
                                            "image": "../gui/images/kml.png",
                                        },
                                    },
                                    "image": {
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
                        })
                        var searchTree;
                        var searchInput = GUI.addInput("searchInput" + stock.name, "Paris", stock.accor["search_" + stock.name]).width("77%");
                        searchInput.keypress(
                            function (e) {
                                if (e.keyCode == 13) {
                                    var im = GUI.image(stock.accor["search_" + stock.name], "img-loadingWarehouse", "../gui/images/loadingV2.gif", 15, 15);
                                    searchTree[stock.name + "Search"].jstree("refresh");
                                }
                            });
                        var submitSearch = GUI.button("search", stock.accor["search_" + stock.name], function () {
                            var im = GUI.image(accor.search, "img-loadingWarehouse", "../gui/images/loadingV2.gif", 15, 15);
                            searchTree[stock.name + "Search"].jstree("refresh");
                        });

                        submitSearch.prop("id", "submitSearch")
                        searchTree = GUI.treeBis({
                            id: stock.name + 'Search',
                            parent: stock.accor["search_" + stock.name],
                            json: {
                                "ajax": {
                                    "type": 'GET',
                                    "url": function (node) {
                                        nodeBuffer = node;
                                        var nodeId = "";
                                        var url = "";
                                        // var type = node.attr('type'); 
                                        if (node == -1) {
                                            url = location.protocol + "//" + location.host + "/rest3d/" + stock.name + "/search/" + searchInput.val();
                                        }
                                        else if (node.attr('rel') == "collection" || "model") {
                                            nodeId = node.attr('id');
                                            url = location.protocol + "//" + location.host + "/rest3d/" + stock.name + "/" + nodeId;
                                        }
                                        return url;
                                    },
                                    "success": function (new_data) {
                                        var result = [];
                                        $("#img-loadingWarehouse").remove();
                                        result = stock.parseDatabaseJson(new_data, result);
                                        return result;
                                    }
                                }
                            },
                            "contextmenu": {
                                "items": function (node) {
                                    var result = {};
                                    if (node.attr("iconuri")) {
                                        result.icon = {
                                            'label': 'Display icon',
                                            'action': stock.icon,
                                        };
                                    }
                                    if (node.attr("rel") == "model") {
                                        result.display = {
                                            'label': 'Upload',
                                            'action': stock.display,
                                        };
                                        result.download = {
                                            'label': 'Download',
                                            'action': stock.download,
                                        };
                                    }
                                    if (node.attr("previewuri")) {
                                        result.preview = {
                                            'label': 'Preview model',
                                            'action': stock.preview,
                                        };
                                    }
                                    return result;
                                }
                            },
                            type: {
                                "types": {
                                    "folder": {
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
                                    "text": {
                                        "icon": {
                                            "image": "../gui/images/file.png",
                                        },
                                    },
                                    "kml": {
                                        "icon": {
                                            "image": "../gui/images/kml.png",
                                        },
                                    },
                                    "image": {
                                        "icon": {
                                            "image": "../gui/images/media-image.png",
                                        },
                                    },
                                    //select_node : function () {return false;}
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
                                // "icons": false,
                            },
                        });

                        stock.flagTrees = false;
                    }
                };

                stock = this;
                if (this.login != 2) {
                    renderMenu[stock.name + "_tab"].focusTab(function () {
                        stock.treeCallback();
                    });
                }
                else {
                    // treeCallback(); 
                    window.treeCallback = stock.treeCallback();
                }

            };

            //window["trees_"+stock.name]
            this.loginArea = function () {
                // var html = $("<div id='loginDiv' style='border:2px solid red'></div>");
                // renderMenu[stock.name + "_tab"].append(html)"login_"+stock.name
                var im;
                stock = this;
                var loginButton = GUI.button("", renderMenu[stock.name + "_tab"], function () {
                    var tmp = '<div id="frame_' + stock.name + '"></div>';
                    var notif = GUI.notification({
                        title: stock.name + " login",
                        text: tmp,
                        type: "text",
                    });
                    //GUI.addInput = function (_id, _defaultValue, _parent, _onChangeCallback) {
                    tmp = $("#frame_" + stock.name);
                    var username = GUI.addInput("username_" + stock.name, "Username", tmp);
                    var pwd = GUI.addInput("pwd_" + stock.name, "pwd", tmp, "", "pwd");
                    var callbackAuth = function () {
                        window.pleaseWait(true);

                        function async() {
                            var defer = Q.defer();
                            $.ajax({
                                type: "POST",
                                url: '/rest3d/' + stock.name + '/login',
                                data: {
                                    "user": username.val(),
                                    "passwd": pwd.val()
                                },
                                success: function (data) {
                                    data = jQuery.parseJSON(data);
                                    im.prop("src", "../gui/images/traffic-cone_blue.png");
                                    loginButton.prop('disabled', true);
                                    GUI.addTooltip({
                                        parent: loginButton,
                                        content: data.message,
                                    });
                                    tmp2.prop('disabled', true);
                                    notif.remove();
                                    GUI.notification({
                                        title: stock.name + " login",
                                        text: data.message,
                                        type: "info",
                                    });
                                    $("#header_" + stock.name).text("Welcome " + data.message.split(" ").pop() + "!");
                                    stock.generateCoreTab();
                                    window.treeCallback
                                    defer.resolve();
                                },
                                error: function (data) {
                                    // data = jQuery.parseJSON(data);
                                    GUI.notification({
                                        title: stock.name + " login",
                                        text: "Authentification failed",
                                        type: "info",
                                    });
                                    defer.resolve();
                                },
                                contentType: 'application/x-www-form-urlencoded',
                            });
                            return defer.promise;
                        }
                        async().then(
                            function () {
                                window.pleaseWait(false);
                            })
                    }
                    var tmp2 = GUI.button("", tmp, callbackAuth);
                    pwd.keypress(
                        function (e) {
                            if (e.keyCode == 13) {
                                tmp2.click();
                            }
                        });
                    tmp2.find("span").remove();
                    GUI.addIcon(tmp2, "ui-icon-unlocked");
                });
                loginButton.css({
                    "float": "right"
                });
                loginButton.find("span").remove();
                GUI.addTooltip({
                    parent: loginButton,
                    content: "Not connected",
                });
                im = GUI.image(loginButton, "traffic-light", "../gui/images/traffic-cone_red.png", '20', '20');


            };
            this.descriptionArea = function () {
                renderMenu[stock.name + "_tab"].append("<br>");
                var html = $('<div style="background:white;box-shadow: 5px 5px 5px #888888;">');
                renderMenu[stock.name + "_tab"].append(html);
                html.append(stock.description);
                renderMenu[stock.name + "_tab"].append("<br>");
            }
            stock = this;
            window["login_" + stock.name] = function () {
                if (typeof stock.signin == "string") {
                    $("#dialog").dialog("close");
                    var gitHtml = $('<div id="dialog"><iframe id="myIframe" src="" style="height:100% !important; width:100% !important; border:0px;"></div>');
                    $('body').append(gitHtml);
                    $("#dialog").dialog({
                        title: stock.name + " sign in!",
                        width: '600',
                        height: '500',
                        open: function () {
                            console.debug(stock.signin);
                            $('#myIframe').attr('src', stock.signin);
                            console.debug(gitHtml.find('iframe').contents())
                        },
                        close: function () {
                            gitHtml.remove();
                        },
                    });
                    $("#dialog").css({
                        'min-height': 'none !important;'
                    });
                }
                else {
                    var win = window.open(stock.signin[0], '_blank');
                    win.focus();
                }
            }
            // this.generateCoreTab();
            stock = this;

            switch (this.login) {
            case 0, 3:
                if (this.login == 0) {
                    var text = '(no authentification required)';
                }
                else {
                    var text = '(authentification not yet implemented)';
                }
                var tmp = $("<a style='color: red;'>" + text + "</a>");
                renderMenu[stock.name + "_tab"].append(tmp);
                renderMenu[stock.name + "_tab"].append("<br><br>");
                this.descriptionArea();
                renderMenu[stock.name + "_tab"].append("<br><hr><br>")
                this.generateCoreTab();
                break;
            case 1:
                var tmp = $("<a style='color: red;'>(authentification is optional)</a>");
                renderMenu[stock.name + "_tab"].append(tmp);
                this.loginArea();
                renderMenu[stock.name + "_tab"].append("<br><br>");
                this.descriptionArea();
                renderMenu[stock.name + "_tab"].append("<a style='float:right;' href='javascript:window.login_" + stock.name + "()'>+Sign in</a><br><hr></br>");
                this.generateCoreTab();
                break;
            case 2:
                var tmp = $("<a id='header_" + stock.name + "' style='color: red;'>(authentification is required)</a>");
                renderMenu[stock.name + "_tab"].append(tmp);
                this.loginArea();
                renderMenu[stock.name + "_tab"].append("<br><br>");
                this.descriptionArea();
                renderMenu[stock.name + "_tab"].append("<a style='float:right;' href='javascript:window.login_" + stock.name + "()'>+Sign in</a><br><hr><br>");
                break;
            }
            GUI.image(renderMenu[stock.name + "_tab"].title, "img-render", stock.picture, 12, 14, "before");

        };
        return databaseTab;
    });