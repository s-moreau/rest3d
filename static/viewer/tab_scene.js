/*
The MIT License (MIT)

Copyright (c) 2014 Rémi Arnaud - Advanced Micro Devices, Inc.

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
'use strict';
define(['viewer'], function (viewer) {
    function scene_init(parent) {
        var treeScene = false;
        window.treeScene = treeScene;
        var treeJson = {};
        var callbackArray = [];
        var $flagScene = $("<h3 style='text-align:center !important;'>No scenes loaded yet</h3>");
        if(!parent.hasOwnProperty("scenes"))parent.script = parent;
        parent.scenes.append($flagScene);

        window.refreshScenesTree = function () {
            $flagScene.hide();
            if (treeScene) {
                treeScene.remove();
            }
            callbackArray = [];
            treeJson.data = [];

            function displayConfig(parent, object, attr) {
                if (parent.hasOwnProperty(attr)) {
                    if (parent.hasOwnProperty('pickid')) {
                        var id = attr + "___" + (Math.floor(Math.random() * 1000000) + 1) + "__" + parent.pickid;
                    }
                    else {
                        var id = attr + "___" + (Math.floor(Math.random() * 1000000) + 1);
                    }

                    var data = {};
                    data.text = attr;
                    data.id = id;
                    if (attr == "znear" || attr == "zfar" || attr == "yfov" || attr == "projection" || attr == "aspect_ratio") {
                        data.icon = "../gui/images/camera.png";
                        data.li_attr = {
                            'rel': 'camera_child'
                        }
                    }
                    else if (attr == "local") {
                        data.icon = "../gui/images/Photoshop3DAxis.png";
                        data.li_attr = {
                            'rel': 'local'
                        }
                    }
                    else {
                        data.icon = "../gui/images/material.png";
                        data.li_attr = {
                            'rel': 'material'
                        }
                    }
                    object.push(data); //TODO change to an ID more elaborated
                    var tmp = {}
                    tmp.id = id;
                    tmp.type = attr;
                    tmp.value = parent[attr];
                    tmp.parent = parent;
                    callbackArray.push(tmp);
                };
                return object;
            }

            window.material = function (param_in) {
                var stock = param_in;
                var material = {};
                material.children = [];
                if (param_in.hasOwnProperty('pickid')) {
                    var pickId = param_in.pickid;
                }
                if (stock.hasOwnProperty('materials')) {
                    for (var z = 0; z < stock.materials.length; z++) {
                        var subsel_material = stock.materials[z];
                        material.text = subsel_material.name || subsel_material.id || subsel_material.symbol || subsel_material.target;
                        if (pickId) {
                            var id = material.text + "___" + (Math.floor(Math.random() * 1000000) + 1) + "__" + pickId;
                        }
                        else {
                            var id = material.text + "___" + (Math.floor(Math.random() * 1000000) + 1);
                        }
                        material.state = {'opened':true};
                        material.id = id;
                        material.li_attr = {
                            "rel": "children",
                        };
                        material.children = [];
                        var material_parameter = subsel_material.overrides || subsel_material.parameters;
                        if (pickId) {
                            material_parameter.pickid = pickId;
                        }
                        displayConfig(material_parameter, material.children, "ambient");
                        displayConfig(material_parameter, material.children, "diffuse");
                        displayConfig(material_parameter, material.children, "emission");
                        displayConfig(material_parameter, material.children, "index_of_refraction");
                        displayConfig(material_parameter, material.children, "reflective");
                        displayConfig(material_parameter, material.children, "reflectivity");
                        displayConfig(material_parameter, material.children, "shininess");
                        displayConfig(material_parameter, material.children, "specular");
                        displayConfig(material_parameter, material.children, "transparent");
                    }
                }
                return material;
            }

            window.geometry = function (param_in, param_out) {
                if (param_in.hasOwnProperty("pickid")) {
                    var pickID = param_in.pickid;
                }
                if (param_in.hasOwnProperty("geometries") && $.isArray(param_in.geometries)) {
                    for (var i = 0; i < param_in.geometries.length; i++) {
                        var subsel_geometries = param_in.geometries[i];
                        if (pickID) {
                            subsel_geometries.pickid = pickID;
                        }
                        var material = self.material(subsel_geometries);
                        var title = "geometry_" + i;
                        if (i == 0) {
                            title = "geometry"
                        }
                        var id = title + "__" + pickID;
                        var subchild = {
                            "text": title,
                            "state": {'opened':true},
                            "id": id,
                            "li_attr": {
                                "rel": "geometry",
                            },
                            "children": [{
                                "text": "materials",
                                "state": {'opened':true},
                                "id": "material" + "__" + pickID,
                                "li_attr": {
                                    "rel": "children",
                                },
                                "children": [material],
                            }, ],
                        };
                        param_out.push(subchild);
                    }
                }
                return param_out;
            }

            window.camera = function (param_in, param_out) {
                if (param_in.hasOwnProperty("pickid")) {
                    var pickID = param_in.pickid;
                }
                if (param_in.hasOwnProperty("camera")) {
                    var subsel_camera = param_in.camera;
                    if (pickID) {
                        subsel_camera.pickid = pickID;
                    }
                    displayConfig(subsel_camera, param_out, "aspect_ratio");
                    displayConfig(subsel_camera, param_out, "projection");
                    displayConfig(subsel_camera, param_out, "yfov");
                    displayConfig(subsel_camera, param_out, "zfar");
                    displayConfig(subsel_camera, param_out, "znear");
                }
                return param_out;
            }

            window.children = function (param_in, param_out) {
                if (param_in.hasOwnProperty("children")) {
                    for (var i = 0; i < param_in.children.length; i++) {
                        var sel = param_in.children[i];
                        if (sel.hasOwnProperty("geometries")) {
                            var pickId = sel.geometries[0].glprimitives[0].pickID;
                            sel.pickid = pickId;
                        }
                        else {
                            for (var z = 0; z < length; z++) {
                                if (param_in.children[z].hasOwnProperty("pickid")) {
                                    var pickId = target[z].pickid;
                                    sel.pickid = pickId;
                                }
                            }
                        }
                        var child = {};
                        var title = sel.id || sel.name || "undefined_" + Math.floor(Math.random() * 1000000) + 1;
                        child.text = sel.id || sel.name || title;
                        child.state = {'closed':true};
                        var id = child.text;
                        if (pickId) {
                            id = id + "__" + pickId
                        }
                        window[id] = sel;
                        child.id = id;
                        child.li_attr = {
                            "rel": "child"
                        };
                        child.li_attr["type"] = sel.id;
                        child.children = true;
                        param_out.push(child);
                    }
                }
                return param_out;
            }
            window.main = function (param_in, param_out) {
                for (var i = 0; i < param_in.length; i++) { //{
                    var sel = param_in[i]
                    var scene = {};
                    scene.text = sel.url.replace(/^.*[\\\/]/, ''); //data:
                    scene.state = {'closed':true};
                    var id = scene.text + "___" + Math.floor(Math.random() * 1000000) + 1;
                    window[id] = sel;
                    scene.id = id;
                    scene.li_attr = {
                        "rel": "main"
                    }
                    scene.children=true;
                    param_out.push(scene);
                }
                return param_out;
            }
            window.sub = function (param_in, param_out) {
                var length = param_in.length;
                var target = param_in;
                if (param_in.hasOwnProperty("id")) {
                    length = 1;
                    target = [];
                    target[0] = param_in;
                }
                for (var j = 0; j < length; j++) {
                    var position = target[j];
                    var sub = {};

                    sub.text = position.id || position.name;
                    if (position.hasOwnProperty("geometries")) {
                        var pickId = position.geometries[0].glprimitives[0].pickID;
                        position.pickid = pickId;
                    }
                    else {
                        for (var z = 0; z < length; z++) {
                            if (target[z].hasOwnProperty("pickid")) {
                                var pickId = target[z].pickid;
                                position.pickid = pickId;
                            }
                        }
                    }
                    var id = sub.text;
                    if (pickId) {
                        id = id + "__" + pickId;
                    }
                    sub.state = {'opened':true};
                    sub.id = id;
                    if (position.hasOwnProperty("camera")) {
                        sub.li_attr = {
                            "rel": "camera",
                        };
                    }
                    if (position.hasOwnProperty("geometries")) {
                        sub.li_attr = {
                            "rel": "geometry"
                        };
                    }
                    if (position.hasOwnProperty("children")) {
                        sub.li_attr = {
                            "rel": "children"
                        };
                    }
                    // if(position.hasOwnProperty("local")){
                    //      sub.attr = {"id":id,"rel":"local"};
                    // }
                    else {
                        sub.li_attr = {
                            "rel": "sub"
                        };
                    }
                    // sub.attr["type"] = position.id;
                    sub.children = [];
                    window.geometry(position, sub.children);
                    window.camera(position, sub.children);
                    window.children(position, sub.children);
                    displayConfig(position, sub.children, "local");
                    param_out.push(sub);
                }
                return param_out;
            }

            function removeModel() {
                var id = window.nodeStocked.id.split("___")[0];
                for (var i = 0; i < viewer.scenes.length; i++) {
                    if (viewer.scenes[i].hasOwnProperty("url")) {
                        if (viewer.scenes[i].url.replace(/^.*[\\\/]/, '') == id) {
                            viewer.scenes[i] = [];
                            viewer.flagTick=false;
                            viewer.draw();
                            viewer.scenes.splice(i, 1);
                            setTimeout(function(){
                                viewer.draw},200)
                            setTimeout(function(){
                                viewer.draw},400)
                        }
                    }
                }
                $("#Treedef").jstree('delete_node', window.nodeStocked);
                $('#Treedef').jstree("refresh");
            }

            var nodeBuffer;
            window.treeScene = GUI.treeBis({
                id: 'Treedef',
                parent: parent.scenes,
                core: {
                    "data": {
                        "type": 'GET',
                        "url": function (node) {
                            nodeBuffer = node;
                            var nodeId = "";
                            var url = "/rest3d/info/";
                            return url;
                        },
                        "dataFilter": function (new_data) {
                            var result = [];
                            if(viewer.scenes==undefined||viewer.scenes.length == 0){
                                $("#img-emptyboxScenes").remove();
                                GUI.image(parent.scenes, "img-emptyboxScenes", "../gui/images/empty_box.gif", 60, 60, "before");
                            }
                            else if (nodeBuffer.id == "#") {
                                window.main(viewer.scenes, result)
                                $("#img-emptyboxScenes").remove();
                            }
                            else {
                                var viewerObject;
                                $("#img-emptyboxScenes").remove();
                                switch (nodeBuffer.li_attr.rel) {
                                case "main":
                                    viewerObject = window[nodeBuffer.id];
                                    window.sub(viewerObject, result);
                                    break;
                                case "child":
                                    viewerObject = window[nodeBuffer.id];
                                    window.sub(viewerObject, result);
                                    break;
                                }
                            }
                            window.callbacks();
                            return result;
                        },
                    },
                    'check_callback' : true,
                    'themes' : {
                            'responsive' : false,
                            'variant' : 'small',
                            'stripes' : true
                        },
                },
                "contextmenu": {
                    "items": function (node) {
                        var result = {};
                        window.nodeStocked = node;
                        if (node.li_attr.rel == "main") {
                            result.icon = {
                                'icon': '../gui/images/trash.png',
                                'label': 'Remove',
                                'action': removeModel,
                            };
                        }
                        return result;
                    }
                },
            });

            // treeScene.Tree.bind(
            // "select_node.jstree", function(evt, data){
            //     var tmp = data.inst.get_json()[0];
            //     if(tmp.attr.hasOwnProperty("id")){
            //         var id = tmp.attr.id.split("__").pop();
            //         if(viewer.pickName[id]!="undefined"&&viewer.pickName[id]!=null){
            //                 if (!viewer.channel.selected) viewer.channel.selected = {};
            //                 if (viewer.channel.selected[id]) {
            //                     delete viewer.channel.selected[id];
            //                     window.fl4reStatus("",$("#mainLayout-south"),"selected "+viewer.pickName[Object.keys(viewer.channel.selected)[0]]);
            //                 } else {
            //                     viewer.channel.selected[id] = true;
            //                     window.fl4reStatus("",$("#mainLayout-south"),"selected "+viewer.pickName[id]);
            //                 }  
            //             } else{ 
            //                 window.fl4reStatus("READY",$("#mainLayout-south"));
            //                 delete viewer.channel.selected;
            //             }
            //             viewer.draw();
            //         }
            //     });

            window.callbacks = function () {
                setTimeout(function () {
                    function display(array, index) {
                        var id = array[index].id;
                        var value = array[index].value;
                        var elem = $("#" + id);
                        elem.click(function () {
                            console.debug(id + " |")
                            console.debug(value)
                        });
                        if (value !== undefined && typeof (value) !== 'object') elem.append("<a style='float:right'>" + value + "</a>");
                    }

                    function local(array, index) {
                        var id = array[index].id;
                        var value = array[index].value;
                        $("#" + id).click(function () {
                            $('#localNotif').remove()
                            var tmp = trs.create();
                            trs.fromMat4(tmp, value);
                            var e = euler.create();
                            euler.fromQuat(e, tmp.rotation);
                            // console.debug("translation", tmp.translation);
                            // console.debug("scale", tmp.scale);
                            // console.debug("rotation", e);
                            var html = "<div id='infplay" + id + "'></div>";
                            GUI.notification({
                                title: id,
                                text: html,
                                type: "notice",
                            });
                            html = $("#infplay" + id);
                            html.parent().parent().parent().attr("id","localNotif");


                            function createSliders(parent, type, element) {
                                switch (type) {
                                case "Translation":
                                    var min = -1000,
                                        max = 1000,
                                        step = 0.01;
                                    break;
                                case "Scale":
                                    var min = 0.1,
                                        max = 1,
                                        step = 0.05;
                                    break;
                                case "Rotation":
                                    var min = -5,
                                        max = 5,
                                        step = 0.1;
                                    break;
                                }
                                var callback = function (element) {
                                    switch (type) {
                                    case "Translation":
                                        decodeAndPush(element, e, tmp.scale);
                                        break;
                                    case "Scale":
                                        decodeAndPush(tmp.translation, e, element);
                                        break;
                                    case "Rotation":
                                        decodeAndPush(tmp.translation, element, tmp.scale);
                                        break;
                                    }
                                }
                                parent.append("<a>" + type + "</a><br>")
                                var title = $("<a>X: " + element[0] + "</a>");
                                parent.append(title);
                                var tmp1 = GUI.addSlider(type + "X_" + id, html, min, max, step, element[0]);
                                tmp1.on("slide", function () {
                                    var result = $(this).slider("value");
                                    title.text("X: " + result);
                                    element[0] = result;
                                    callback(element);
                                })
                                var title1 = $("<a>Y: " + element[1] + "</a>");
                                parent.append(title1);
                                var tmp2 = GUI.addSlider(type + "Y_" + id, html, min, max, step, element[1]);
                                tmp2.on("slide", function () {
                                    var result = $(this).slider("value");
                                    title1.text("Y: " + result);
                                    element[1] = result;
                                    callback(element);
                                })
                                var title2 = $("<a>Z: " + element[2] + "</a>");
                                parent.append(title2);
                                var tmp3 = GUI.addSlider(type + "Z_" + id, html, min, max, step, element[2]);
                                tmp3.on("slide", function () {
                                    var result = $(this).slider("value");
                                    title2.text("Z: " + result);
                                    element[2] = result;
                                    callback(element);
                                })
                            }
                            createSliders($(html), "Translation", tmp.translation);
                            createSliders($(html), "Rotation", e);
                            createSliders($(html), "Scale", tmp.scale);

                            function decodeAndPush(trans, rot, scale) {
                                var q = quat.create();
                                quat.fromEuler(q, rot);
                                var trs1 = trs.fromValues(trans, q, scale);
                                var mat1 = mat4.create();
                                mat4.fromTrs(mat1, trs1);
                                array[index].parent[array[index].type] = mat1;
                                viewer.draw();
                            }
                        });

                        //TEST DECODE/ENCODE ALGO WORKS
                        // $("#"+id).click(function(){
                        //     console.debug("input",value);
                        //     var tmp = trs.create();
                        //     trs.fromMat4(tmp, value);
                        //     var e = euler.create();
                        //     euler.fromQuat(e,tmp.rotation);
                        //     console.debug("translation",tmp.translation);
                        //     console.debug("scale",tmp.scale);
                        //     console.debug("rotation",e);

                        //     var q = quat.create();
                        //     quat.fromEuler(q,e);
                        //     console.debug(q);

                        //     var trs1 = trs.fromValues(tmp.translation,q,tmp.scale);
                        //     var mat1 = mat4.create();
                        //     mat4.fromTrs(mat1,trs1);
                        //     console.debug("output",mat1);
                        // });
                    }
                    for (var g = 0; g < callbackArray.length; g++) {
                        var setValue = function (value) {
                            return callbackArray[g].parent[callbackArray[g].type] = value;
                        };
                        if (callbackArray[g].type == "local") {
                            local(callbackArray, g)
                        }
                        else {
                            display(callbackArray, g);
                        }
                    }
                }, 500);
            }
        }
        window.refreshScenesTree();
            window.renderMenu.scenes.focusTab(function(){
                $('#Treedef').jstree("refresh");
                if(window.treeScene)window.treeScene.openAll();
            })
    

    }
    return scene_init;
});