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
define(['jquerymin','gui','console', 'gltf', 'collada', 'renderer','camera','glmatrixExt','rest3d','uploadViewer','q'], function ($,GUI,CONSOLE,glTF,COLLADA,renderer,camera,mat3,rest3d,setViewer6Upload,Q) {
var viewer  = {};
var scenes = [];
viewer.currentZoom = 1;
var mvMatrixStack = [];
var mvMatrix = mat4.create();
var deg2rad = 0.0174532925; // constant
viewer.currentRotationX = 0;
viewer.currentRotationY = 0;
var deferred = Q.defer();
var pmMatrix = mat4.create();

var canvas = null;

var mainCamera = null;
var channel = null;

// associate primitive name with picking ID
viewer.pickName = [null];
viewer.nowParsing;

viewer.dropTick=false;


if (!window.performance || !window.performance.now) {
    window.performance = window.performance || {};
    window.performance.now = $.now
};

viewer.parse_dae = function(dae) {

    // set the image load callback to redraw
    dae.onload = function(e) {
        e.preventDefault();
        viewer.draw();
    }

    // (viewer global) set current uri
    viewer.nowParsing = dae.url;

    var starttime = window.performance.now();
    // get the scene
    var scene = dae.parse_visual_scene(dae.sceneID);
    scene.url = dae.url;
    // pull out the Z-up flag
    scene.upAxis = dae.up_axis;
    if (!scene.upAxis) scene.upAxis = "Y_UP";

    // traverse the scene, collect the geometry and make webGL objects out of those

    function buildMe() {

        // this is the bounding box for all geometries instanced in this node
        var bounds = aabb.empty();
        if (!this.geometries || this.geometries.length === 0) return bounds;

        var geometries = this.geometries;
        // there can be several instance_geom per node
        // each instance is a single mesh
        // each mesh has several primitives


        for (var j = 0; j < geometries.length; j++) {
            var geometry = geometries[j];

            // each geometry has a mesh : an array of primitives
            // and a glprimitives - whcih contains the webGL primitives for each primitives in the mesh
            if (geometry.glprimitives) continue;
            geometry.glprimitives = [];

            // let's store the Type Arrays in each primitives

            var primitives = geometry.mesh;

            for (var p = 0; p < primitives.length; p++) {


                var triangles = primitives[p];
                // fill up my primitive structure
                var primitive = {};
                var position = null;
                var normal = null;
                var texcoord = null;
                var color = null;


                // speed-up function call

                if (triangles.VERTEX) {
                    position = [];
                    var ppush = position.push;
                    var vget = triangles.VERTEX;
                    for (var i = 0; i < triangles.count * 3; ++i)
                        ppush.apply(position, vget.call(triangles, i));
                    primitive.position = new Float32Array(position);
                }
                if (triangles.NORMAL) {
                    normal = []
                    var npush = normal.push;
                    var nget = triangles.NORMAL;
                    for (var i = 0; i < triangles.count * 3; ++i)
                        npush.apply(normal, nget.call(triangles, i));
                    primitive.normal = new Float32Array(normal);
                }
                if (triangles.TEXCOORD_0) {
                    texcoord = [];
                    var tpush = texcoord.push;
                    var tget = triangles.TEXCOORD_0;
                    for (var i = 0; i < triangles.count * 3; ++i)
                        tpush.apply(texcoord, tget.call(triangles, i))
                    primitive.texcoord = new Float32Array(texcoord);
                }

                if (triangles.COLOR) {
                    color = [];
                    var cpush = color.push;
                    var cget = triangles.COLOR;
                    for (var i = 0; i < triangles.count * 3; ++i)
                        cpush.apply(color, cget.call(triangles, i))
                    primitive.color = new Float32Array(color);
                }

                primitive.index = null;

                var state = State.clone(State.basicState);
                var material = geometry.materials[p];

                // check for a bind_vertex_input - this is for warning only
                if (material.bind_vertex_input && material.bind_vertex_input.length !== 0) {
                    var param = null;
                    var bind_vertex_input = material.bind_vertex_input[0]
                    var set = bind_vertex_input.input_set || 0;
                    var input_semantic = bind_vertex_input.input_semantic + '_' + set;
                    var search = null;
                    for (var attribute in state.program.attributes) {
                        if (state.program.attributes[attribute].semantic === input_semantic) {
                            search = bind_vertex_input.semantic;
                            break;
                        }
                    }
                    // if not found, try with set = 0 
                    input_semantic = bind_vertex_input.input_semantic + '_0';

                    if (!search) {
                        for (var attribute in state.program.attributes) {
                            if (state.program.attributes[attribute].semantic === input_semantic) {
                                search = bind_vertex_input.semantic;
                                break;
                            }
                        }
                    }
                    if (!search) {
                        console.log('could not find attribute ' + bind_vertex_input.input_semantic + '_' + set +
                            ' in primitive');
                    }
                }

                // only intersting paramter for that simple shader is the diffuse texture
                if (material.parameters && typeof material.parameters.diffuse === 'object') {
                    var diffuse = material.parameters.diffuse;
                    if (!diffuse.texcoord) {
                        /*
                        search = null;
                        for (var attribute in state.program.attributes) {
                            if (state.program.attributes[attribute].semantic === 'COLOR') {
                                search = state.program.attributes[attribute];
                                break;
                            }
                        }
                        */
                        
                        if (diffuse.color) {
                            state.values.COLOR = diffuse.color;
                        } else {
                            state.values.COLOR = [1, 1, 1, 0.5];
                        }

                    } else if (search !== diffuse.texcoord) {
                        console.log('semantic ' + search + ' does not match diffuse semantic of ' + diffuse.texcoord);
                    } else if (diffuse && diffuse.image) {
                        state.values.diffuse = {
                            "path": diffuse.path,
                            "image": diffuse.image,
                            "magFilter": diffuse.magFilter,
                            "minFilter": diffuse.minFilter,
                            "wrapS": diffuse.wrapS,
                            "wrapT": diffuse.wrapT,
                            "flipY": true,
                            "textureUnit": 0
                        };
                    }
                }
                
                var glprim = new RENDERER.primitive( primitive.position, primitive.color,
                                                     primitive.normal, null, primitive.texcoord, 
                                                     primitive.index, state);

                // initialize picking ID
                var pickID = viewer.pickName.length;
                viewer.pickName.push(viewer.nowParsing+"#"+this.id+"["+p+"]");
                glprim.pickColor = [(pickID & 0xff)/255,((pickID>>8)&0xff)/255,((pickID>>16)&0xff)/255,1];
                glprim.pickID = pickID;

                geometry.glprimitives.push(glprim);

            }
            // a mesh has a bounding box
            aabb.add(bounds, bounds, geometry.mesh.bounds);
        }
        // we're done, return the calculated bounding box
        return bounds;
    };

    // depth first traversal, create primitives and bounding boxes

    scene.bounds = viewer.build_scene(scene, buildMe);

    mainCamera = Camera.create();
    Camera.lookAtAabb(mainCamera, scene.bounds, scene.upAxis);

    viewer.currentRotationX = viewer.currentRotationY = 0;
    viewer.clearStack();
    scene.starttime = starttime;
    scene.endtime = window.performance.now();

    scenes.push(scene);
    $('#loadtimer').text('load time=' + (scene.endtime - scene.starttime));
    viewer.draw();
    if (viewer.onload)
        viewer.onload.call();
};

viewer.parse_gltf = function(gltf) {

 // (viewer global) set current uri
    viewer.nowParsing = gltf.url;
    var starttime = window.performance.now();

    // set the image load callback to redraw
    gltf.onload = function(e) {
        e.preventDefault();
        viewer.draw();
    }
    // traverse the scene, collect the geometry and make webGL objects out of those
    function buildMe() {
        // this is the bounding box for all geometries instanced in this node
        var bounds = aabb.empty();
        if (!this.geometries || this.geometries.length === 0) return bounds;

        var geometries = this.geometries;
        // there can be several instance_geom per node
        // each instance is a single mesh
        // each mesh has several primitives




        for (var j = 0; j < geometries.length; j++) {
            var geometry = geometries[j];



            // each geometry has a mesh : an array of primitives
            // and a glprimitives - whcih contains the webGL primitives for each primitives in the mesh
            if (geometry.glprimitives) continue;
            geometry.glprimitives = [];

            // let's store the Type Arrays in each primitives

            var primitives = geometry.meshes;
            var materials = geometry.materials;

            for (var i = 0; i < primitives.length; i++) {

                var triangles = primitives[i];
                var material = materials[i];

                // create a new state with this material override
                //console.debug(material.pass);
                var state = State.fromPassAndOverrides(material.pass, material.overrides);
                // fill up my primitive structure
                var primitive = {};

                primitive.position = triangles.POSITION;
                primitive.normal = triangles.NORMAL;
                primitive.texcoord = triangles.TEXCOORD_0;
                primitive.index = triangles.INDEX;

                var glprim = new RENDERER.primitive(primitive.position, null, 
                                                    primitive.normal, null, 
                                                    primitive.texcoord, primitive.index, state);

                  // initialize picking ID
                var pickID = viewer.pickName.length;
                viewer.pickName.push(viewer.nowParsing+"#"+this.id+"["+i+"]");
                glprim.pickColor = [(pickID & 0xff)/255,((pickID>>8)&0xff)/255,((pickID>>16)&0xff)/255,1];
                glprim.pickID = pickID;

                geometry.glprimitives.push(glprim);

            }
            // a gltf mesh has a bounding box
            aabb.add(bounds, bounds, primitives.bounds);
        }
        // we're done, return the calculated bounding box
        return bounds;
    };


    // get the scene
    var scene = gltf.parse_visual_scene(gltf.sceneID);
    scene.url = gltf.url;
    scene.upAxis = "Y_UP";

    // depth first traversal, create primitives, states and bounding boxes

    scene.bounds = viewer.build_scene(scene, buildMe);


    mainCamera = Camera.create();
    Camera.lookAtAabb(mainCamera, scene.bounds, scene.upAxis);

    viewer.currentRotationX = viewer.currentRotationY = 0;
    viewer.clearStack();

    scene.starttime = starttime;
    scene.endtime = window.performance.now();
    $('#loadtimer').text('load time=' + (scene.endtime - scene.starttime));
    scenes.push(scene);
    viewer.draw();
    if (viewer.onload)
        viewer.onload.call();
};

viewer.pushMatrix = function(m) {
    if (m) {
        mvMatrixStack.push(mat4.clone(m));
        mvMatrix = mat4.clone(m);
    } else {
        mvMatrixStack.push(mat4.clone(mvMatrix));
    }
};

viewer.popMatrix = function() {
    if (mvMatrixStack.length == 0) throw "Invalid popMatrix!";
    mvMatrix = mvMatrixStack.pop();
    return mvMatrix;
};

viewer.clearStack = function() {
    mvMatrixStack = [];
    mvMatrix = mat4.create();
};

viewer.drawnode = function() {
    if (!this.geometries || this.geometries.length == 0)
        return true;

    for (var j = 0, len = this.geometries.length; j < len; j++) {
        var primitives = this.geometries[j].glprimitives;
        if (primitives) {
            State.setModelView(mvMatrix);
            for (var i = 0; i < primitives.length; i++)
                primitives[i].render(viewer.channel);
        }
    }
    return true;
}

viewer.render_scene = function(_nodes, _callback) {

    for (var j = 0, lenj = _nodes.length; j < lenj; j++) {

        var node = _nodes[j];
        // console.debug("node: ");
        // console.debug(node.local)

        viewer.pushMatrix();
        mat4.multiply(mvMatrix, mvMatrix, node.local) ;
        //State.setModelView(this.state,mvMatrix);

        if (node.children)
            viewer.render_scene.call(this, node.children, _callback)

        var cont = _callback.call(node);

        viewer.popMatrix();
    }


    return cont;
};


viewer.draw = function(pick,x,y) {

    if (!scenes || scenes.length < 1 ) return null;
    if (viewer.dropTick && !pick) {
         console.log("dropTick activated"); 
         return;
     }


    if (!pick) {
        $('#zoom').text('currentZoom is ' + viewer.currentZoom);
        $('#rot').text('currentRotation is ' + viewer.currentRotationX.toFixed(2) + ',' + viewer.currentRotationY.toFixed(2));
    } 

    if (pick) {
        viewer.dropTick=true;
        Channel.pickMode(viewer.channel,true);      
    }
   
    if (pick)
       Channel.clear(viewer.channel, [0,0,0,0]); 
    else
       Channel.clear(viewer.channel, [0,0,0,0]); // transparent background - so we see through the canvas

    Camera.rotateAround(mainCamera, viewer.currentZoom, viewer.currentRotationX, viewer.currentRotationY);

    mat4.multiply(pmMatrix, mainCamera.projection, mainCamera.lookAt);

    var state = viewer.channel.state;
    viewer.scenes = scenes;
    for (var i = 0; i < scenes.length; i++) {
        viewer.pushMatrix();

        if (scenes[i].upAxis === 'Z_UP') {
            mat4.rotate(mvMatrix, mvMatrix, -90 * deg2rad, vec3.fromValues(1, 0, 0));
        };

        //State.setModelView(mvMatrix);
        State.setViewProj(pmMatrix);

        // depth first scene drawing
        viewer.render_scene.call(viewer.channel, scenes[i], viewer.drawnode);

        viewer.popMatrix();
    } 

    if (pick)
    {                     
        viewer.dropTick = false;
        return Channel.pickMode(viewer.channel,false,x,y);
   }

};

viewer.build_scene = function(_nodes, _callback) {
    var bounds = aabb.empty();
    for (var j = 0; j < _nodes.length; j++) {
        var node = _nodes[j];

        var nodebb = aabb.empty();
        if (node.children && node.children.length !== 0)
            aabb.add(nodebb, nodebb,
                viewer.build_scene(node.children, _callback));

        aabb.add(nodebb, nodebb,
            _callback.call(node));

        aabb.transform(nodebb, nodebb, node.local);
        aabb.add(bounds, bounds, nodebb);
    }
    return bounds;
};

viewer.FPSCounter = function() {
    function counter(){
        var counterID;
        var intervalID;

        (function () {
            this.check = true;
        })();

        return {
            'createElement': function (elem) {
                counterID = elem.id;
                this.fps = 0;
                this.averageFPS = 0;
                this.averageCount = 0;
            },
            'increment': function () {
                ++this.fps;
            },
            'clear': function () {
                this.fps = 0;
            },
            'UpdateFPS': function () {
                var fpsDiv = document.getElementById(counterID);
                fpsDiv.innerHTML = this.fps + " FPS";
                this.averageFPS = (this.averageFPS * this.averageCount + this.fps) / (1+this.averageCount);
                this.averageCount ++;
                this.fps = 0;
            },
            'getAverageFPS': function() {
                return this.averageFPS;
            },
            'run': function () {
                var that = this;
                intervalID = setInterval(function () { that.UpdateFPS.call(that); }, 1000);
            },
            'stop': function () {
                clearInterval(intervalID);
                this.fps = 0;
                this.UpdateFPS();
            }
        }
    }
return new counter();
};

    
viewer.INIT =  function (){
    
        "use strict";//
          var mask;
        var win =$('');
          
if (!window.performance || !window.performance.now) {
    window.performance = window.performance || {};
    window.performance.now = $.now
};
        var listThemes = ["black-tie", "blitzer", "cupertino", "dark-hive", "dot-luv", "eggplant", "excite-bike", "flick", "hot-sneaks", "humanity", "le-frog", "mint-choc", "overcast", "pepper-grinder", "redmond", "smoothness", "south-street", "start", "sunny", "swanky-purse", "trontastic", "ui-darkness", "ui-lightness", "vader"];
        var renderMenu = $('');
        var flagStatus = false;
        var url = "http://www.google.com/custom?q=fl4re&btnG=Search";
        var bufferGen = $("");

        window.fl4reStatus = function (type, _parent, text ) {
            $('#copyButton').remove();
            $('#iconStatus').remove();
            $('#defaultText').remove();
            $('#defaultTextBis').remove();
            if (type == 'CLEAR' || type == 'READY') {
                GUI.label("defaultText", "ready", _parent);
                GUI.addIcon(_parent, "ui-icon-circle-check", "float:left;margin:3px;", "before").attr('id', 'iconStatus');
            } else if (type == 'BUSY') {
                GUI.label("defaultText", text, _parent);
                GUI.addIcon(_parent, "ui-icon-clock", "float:left;margin:3px;", "before").attr('id', 'iconStatus');;
            } else if (type == 'ERROR') {
                GUI.label("defaultText", text, _parent);
                GUI.addIcon($("#mainLayout-south"), "ui-icon-circle-close", "float:left;margin:3px;", "before").attr('id', 'iconStatus');;
            } else if (type == 'WARNING') {
                GUI.label("defaultText", text, _parent);
                GUI.addIcon($("#mainLayout-south"), "ui-icon-alert", "float:left;margin:3px;", "before").attr('id', 'iconStatus');;
            } else {
                var label = GUI.label("defaultTextBis", text, _parent);
                GUI.addIcon(_parent, "ui-icon-info", "float:left;margin:3px;", "before").attr('id', 'iconStatus');
                var clear = GUI.button("Clear", label, function () {
                    GUI.copyToClipboard(text.slice(15, -1));
                    GUI.addTooltip({
                        parent: $('this'),
                        content: "copy completed!"
                    });
                });
                clear.prop("id", "copyButton");
                clear.html('');
                GUI.addIcon(clear, "ui-icon-copy", "", "before");
                GUI.addTooltip({
                    parent: clear,
                    content: "copy URL to clipboard"
                });
            }
        };

        window.loadCss = function (item) {
            var link = "../gui/themes/" + item + "/jquery-ui.css";
            GUI.destroyCurrentCssTheme();
            GUI.loadCssFile(link);
            GUI.currentCssTheme = link;
            setTimeout(function () {
                GUI.setColorJqueryTheme();
                GUI.refreshJqueryTheme();
            }, 10);


        }
        function pleaseWait(_displayMode) {
            if (_displayMode == true) {
                 var deferred = Q.defer();
                mask = GUI.mask("mask-loading", "Please wait ...", $("body"));
                GUI.image($('#mask-loading'), "img-loading", "../gui/images/loading.gif", 30, 30, "before");
                return deferred;
            } else if (_displayMode == false) {
                setTimeout(function(){mask.remove();},500);
            }
        };
        window.pleaseWait = pleaseWait;
        var layout = GUI.Layout("mainLayout", 1);


        
        var titleLabel =GUI.label("auteur", "@ rest3d.org", layout.jqueryObjectSouth);
        titleLabel.click(function(){
            $("#dialog").dialog("close");
            var gitHtml = '<div id="dialog"><iframe id="myIframe" src="" style="height:100% !important; width:100% !important; border:0px;"></iframe></div>';
            gitPanel = $('body').append(gitHtml);
            $("#dialog").dialog({
                width: '600',
                height: '500',
                open: function (ev, ui) {
                    $('#myIframe').attr('src', "http://rest3d.wordpress.com/");
                },
                // close: function(){
                //     gitHtml.empty();
                // },
            });
            $("#dialog").css({
            "padding":"0",
                })
        })
        CONSOLE.open(layout);

         ////////////
//        GUI.button('rambler-min', accordion.collada, function () {

        window.callbackFullscreen =function(){
              if (screenfull.enabled) {
                        screenfull.request();
                    } else {
                        console.error("browser doesn't allow the fullscreen mode")
                    }
        };
        var $html = $('<a href="#" onClick="window.callbackFullscreen()"></a>')
        $('body').append()
        $html.hide();

        var menu = GUI.menu({
            id: "menu",
            parent: layout.jqueryObjectNorth,
            item: [{
                text: "COLLADA",
                id: "load"
            },
            {
                text: "glTF",
                id: "loadgl"
            }, {
                text: "Settings",
                id: "settings"
            }, {
                text: "Themes UI",
                id: "themes"
            }, {
                text: "Support",
                id: "support"
            }, {
                text: "b",
                id: "fullscreen",
                callback: function () {
                   $html.click();
                },
            }]
        });

        GUI.mainMenu = menu;


         // --------------------------------------------------------- support and help ----------------------------------

        var supportMenu = GUI.menu({
            id: "support-menu",
            parent: menu.support,
            item: [{
                id: "help-panel",
                text: "Help",
                callback: "window.onHelp()"
            }, {
                id: "google",
                text: "Google",
                callback: "window.onGithub()"
            }]
        })

         var helpPanel = $([]);

         //help dialog
        window.onHelp = function () {}

        var gitPanel = $([]);
        window.onGithub = function () {
            $("#dialog").dialog("close");
            var gitHtml = '<div id="dialog"><iframe id="myIframe" src="" style="height:100% !important; width:100% !important; border:0px;"></iframe></div>';
            gitPanel = $('body').append(gitHtml);
            $("#dialog").dialog({
                width: 600,
                height: 500,
                open: function (ev, ui) {
                    $('#myIframe').attr('src', url);
                },
                //  close: function(){
                //     gitHtml.empty();
                // },
            });
            $("#dialog").css({
            "padding":"0",
                })
            
        }

         //////////////
         // THEMES MENU

        var listCallback = [];
        var jsonTheme = {
            id: 'theme-menu',
            parent: menu.themes,
            item: []
        };
        for (var lgt = 0; lgt < listThemes.length; lgt++) {
            jsonTheme.item[lgt] = {
                text: listThemes[lgt],
                id: listThemes[lgt],
                callback: function (theme) {
                    return function () {
                        pleaseWait(true);
                        window.loadCss(theme);
                         pleaseWait(false);
                    }
                }(listThemes[lgt])

            };
        }
        var theme = GUI.menu(jsonTheme);
        theme.setAutoHeight();


         //------------------------------ all menu icons ---------------------------------------------------------------------------------------------

         // //add icons to the men
        menu.load.text.text("");
        GUI.image(menu.load.text, "img-settings", "../gui/images/collada.png", 70, 80, "before");
        menu.loadgl.text.text("");
        GUI.image(menu.loadgl.text, "img-settings1", "../gui/images/glTF.png", 40, 40, "before");

        GUI.image(menu.settings.text, "img-settings", "../gui/images/icon-cog.png", 16, 16, "before");
        GUI.image(menu.support.text, "img-help", "../gui/images/menu-help.png", 15, 15, "before");
        GUI.image(menu.themes.text, "img-themes", "../gui/images/jquery.png", 15, 15, "before");
        GUI.addIcon(menu.fullscreen.text, "ui-icon-arrow-4-diag", "position: relative !important; right:10px !important;bottom: 10px !important;", "before");
        menu.fullscreen.moveToRightFromLeft();
        menu.support.moveToRightFromLeft(25);
        menu.themes.moveToRightFromLeft();
        menu.settings.moveToRightFromLeft(220);

         //------------------------------//render menu ---------------------------------------------------------------------------------------------

        var renderMenu = GUI.tab({
            id: "renderMenus",
            parent: layout.jqueryObjectCenter,
            item: [{
                    id: "render",
                    text: "  Load DAE/glTF"
                }, {
                    id: "tree",
                    text: "  Warehouse",
                },
                {
                    id: "scenes",
                    text:" Scenes",
                }

            ]
        })
        renderMenu.sortable();
        renderMenu.tabManager();
        var $flagScene = $("<h3 style='text-align:center !important;'>No scenes loaded yet</h3>");
        renderMenu.scenes.append($flagScene);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        var treeScene =false;
        var treeJson = {};
        var callbackArray =[];

        window.refreshScenesTree = function(){
            $flagScene.hide();
            if(treeScene){treeScene.remove();}
            callbackArray=[];
            treeJson.data = [];
            function displayConfig (parent,object,attr){
                if(parent.hasOwnProperty(attr)){
                    if(parent.hasOwnProperty('pickid')){
                         var id = attr+"_"+(Math.floor(Math.random() * 1000000) + 1)+"__"+parent.pickid;
                    }
                    else{
                        var id = attr+"_"+(Math.floor(Math.random() * 1000000) + 1);
                    }
                   
                    // {"data":attr,"attr":{"id":id}}
                    var data = {};
                    data.data = attr;
                    if(attr == "znear"||attr =="zfar"||attr =="yfov"||attr =="projection"||attr =="aspect_ratio"){
                        data.attr = {"id":id,'rel':'camera_child'}
                    }   
                    else if(attr == "local"){
                        data.attr = {"id":id,'rel':'local'}
                    }
                    else{
                        data.attr = {"id":id,'rel':'material'}
                    }
                    object.push(data);//TODO change to an ID more elaborated
                    var tmp ={}
                    tmp.id = id;
                    tmp.type = attr;
                    tmp.value = parent[attr];
                    callbackArray.push(tmp);
                };
                return object;
            }

            window.material = function (param_in){
                var stock = param_in;
                var material ={};
                material.children = [];
                if(param_in.hasOwnProperty('pickid')){
                    var pickId = param_in.pickid;
                }
              if(stock.hasOwnProperty('materials')){
                for(var z=0; z<stock.materials.length;z++){
                    var subsel_material = stock.materials[z];
                    material.data  = subsel_material.name||subsel_material.id||subsel_material.symbol||subsel_material.target;
                    if(pickId){
                        var id = material.data+"_"+(Math.floor(Math.random() * 1000000) + 1)+"__"+pickId;
                    }
                    else{
                        var id = material.data+"_"+(Math.floor(Math.random() * 1000000) + 1);
                    }
                    material.attr =  {"rel":"children","id":id};
                    material.children = [];
                    var material_parameter = subsel_material.overrides||subsel_material.parameters;
                    if(pickId){ 
                        material_parameter.pickid = pickId; }
                    displayConfig(material_parameter,material.children,"ambient");
                    displayConfig(material_parameter,material.children,"diffuse");
                    displayConfig(material_parameter,material.children,"emission");
                    displayConfig(material_parameter,material.children,"index_of_refraction");
                    displayConfig(material_parameter,material.children,"reflective");
                    displayConfig(material_parameter,material.children,"reflectivity");
                    displayConfig(material_parameter,material.children,"shininess");
                    displayConfig(material_parameter,material.children,"specular");
                    displayConfig(material_parameter,material.children,"transparent");
                }
            }
            return material;
            } 

            window.geometry = function(param_in,param_out){
                if(param_in.hasOwnProperty("pickid")){
                    var pickID = param_in.pickid;
                }
                if(param_in.hasOwnProperty("geometries")&&$.isArray(param_in.geometries)){
                    for(var i=0;i<param_in.geometries.length;i++){
                        var subsel_geometries = param_in.geometries[i];
                        if(pickID){subsel_geometries.pickid=pickID;}
                        var material =  self.material(subsel_geometries);
                        var title = "geometry_"+i;
                        if(i==0){title = "geometry"}
                        var id = title+"__"+pickID;
                        var subchild = {
                            "data":title,
                            "attr":{"rel":"geometry","id":id},
                            "children":[
                                {"data":"materials",
                                "attr":{"rel":"children","id":"material"+"__"+pickID},
                                "children":[material],
                                },
                            ],
                    };
                    param_out.push(subchild);
                    }
                }
                return param_out;
            }

            window.camera = function (param_in,param_out){
                if(param_in.hasOwnProperty("pickid")){
                    var pickID = param_in.pickid;
                }
                if(param_in.hasOwnProperty("camera")){
                    var subsel_camera = param_in.camera;
                    if(pickID){
                        subsel_camera.pickid = pickID;
                    }
                    displayConfig(subsel_camera,param_out,"aspect_ratio");
                    displayConfig(subsel_camera,param_out,"projection");
                    displayConfig(subsel_camera,param_out,"yfov");
                    displayConfig(subsel_camera,param_out,"zfar");
                    displayConfig(subsel_camera,param_out,"znear");
                }
                return param_out;
            }

            window.children = function(param_in,param_out){
                if(param_in.hasOwnProperty("children")){
                    for(var i=0; i<param_in.children.length;i++){
                        var sel = param_in.children[i];
                        if(sel.hasOwnProperty("geometries")){
                            var pickId = sel.geometries[0].glprimitives[0].pickID;
                            sel.pickid = pickId;
                        }
                        else{
                            for(var z=0;z<length;z++){
                                if(param_in.children[z].hasOwnProperty("pickid")){
                                    var pickId = target[z].pickid;
                                    sel.pickid = pickId;
                                }
                            }
                        }
                        var child = {};
                        var title = sel.id||sel.name||"undefined_"+Math.floor(Math.random() * 1000000) + 1;
                        child.data = sel.id||sel.name||title;
                        child.state = 'closed'; 
                        var id = child.data;
                        if(pickId){id=id+"__"+pickId}
                        window[id] = sel;         
                        child.attr = {"id":id,"rel":"child"};
                        child.attr["type"] = sel.id;
                        param_out.push(child);
                    }
                }
                return param_out;
            }
            window.main = function(param_in,param_out){
                for(var i =0;i<param_in.length;i++){                          //{
                    var sel =  param_in[i]
                    var scene = {};
                    scene.data = sel.url.replace(/^.*[\\\/]/, '');                  //data:
                    scene.state = 'closed'; 
                    var id = scene.data+"_"+Math.floor(Math.random() * 1000000) + 1;
                    window[id] = sel;         
                    scene.attr = {"id":id,"rel":"main"}
                    param_out.push(scene);                                                            
                }
                return param_out;
            }
            window.sub = function(param_in,param_out){
                var length = param_in.length;
                var target = param_in;
                if(param_in.hasOwnProperty("id")){
                    length=1;
                    target = [];
                    target[0]= param_in;
                }
                for(var j=0;j<length;j++){
                    var position =target[j];
                    var sub = {};
               
                    sub.data = position.id||position.name;
                    if(position.hasOwnProperty("geometries")){
                        var pickId = position.geometries[0].glprimitives[0].pickID;
                        position.pickid = pickId;
                    }
                    else{
                        for(var z=0;z<length;z++){
                            if(target[z].hasOwnProperty("pickid")){
                                var pickId = target[z].pickid;
                                position.pickid = pickId;
                            }
                        }
                    }
                    var id = sub.data;
                    if(pickId){id = id+"__"+pickId;}
                    sub.state = 'open'; 

                    if(position.hasOwnProperty("camera")){
                        sub.attr = {"id":id,"rel":"camera"};
                    } 
                    if(position.hasOwnProperty("geometries")){
                        sub.attr = {"id":id,"rel":"geometry"};
                    }
                    if(position.hasOwnProperty("children")){
                        sub.attr = {"id":id,"rel":"children"};
                    }
                    // if(position.hasOwnProperty("local")){
                    //      sub.attr = {"id":id,"rel":"local"};
                    // }
                    else{
                        sub.attr = {"id":id,"rel":"sub"};
                    }
                    // sub.attr["type"] = position.id;
                    sub.children = [];
                    window.geometry(position,sub.children);
                    window.camera(position,sub.children);
                    window.children(position,sub.children);
                    displayConfig(position,sub.children,"local");
                    param_out.push(sub);
                }
                return param_out;
            }

            treeScene = GUI.treeBis({
                id:'Tree',
                parent: renderMenu.scenes,
                json:  {
                "ajax" : {
                    "type": 'GET',
                    "url": function (node) {
                        nodeBuffer = node;
                        var nodeId = "";
                        var url = "/rest3d/warehouse/";
                        return url;
                    },
                    "success": function (new_data) {
                        var result = [];
                        if(nodeBuffer==-1){
                            window.main(viewer.scenes,result)
                        }
                        else{
                            var viewerObject;
                            switch(nodeBuffer.attr('rel')){
                                case "main":
                                    viewerObject = window[nodeBuffer.attr('id')];
                                    window.sub(viewerObject,result);
                                    break;
                                case "child":
                                    viewerObject = window[nodeBuffer.attr('id')];
                                    window.sub(viewerObject,result);
                                    break;
                            }
                        }
                        window.callbacks();
                        return result;
                    },
                },
            },
            "plugins": ["themes", "json_data", "ui", "types", "sort","search"],
             type:  { "types": {
                "main": {
                    "icon" : {
                        "image" : "../favicon.ico",
                    },
                    },
                "camera": {
                    "icon" : {
                        "image" : "../gui/images/camera-anim.gif",
                    },
                    },
                "children": {
                    "icon" : {
                        "image" : "../gui/images/folder.png",
                    },
                    },
                "local": {
                    "icon" : {
                        "image" : "../gui/images/Photoshop3DAxis.png",
                    },
                    },
                "geometry": {
                    "icon" : {
                        "image" : "../gui/images/geometry.png",
                    },
                    },
                 "sub": {
                    "icon" : {
                        "image" : "../gui/images/folder.png",
                    },
                    },
                "child": {
                    "icon" : {
                        "image" : "../gui/images/folder.png",
                    },
                    },
                "empty": {
                    "icon" : {
                        "image" : "../gui/images/cross.jpg",
                    },
                    },
                "material": {
                    "icon" : {
                        "image" : "../gui/images/material.png",
                    },
                    },
                "camera_child": {
                    "icon" : {
                        "image" : "../gui/images/camera.png",
                    },
                    },
            }},
                themes:{
                    "theme":"apple",
                },
            });
        
        treeScene.Tree.bind(
        "select_node.jstree", function(evt, data){
            var tmp = data.inst.get_json()[0];
            if(tmp.attr.hasOwnProperty("id")){
                var id = tmp.attr.id.split("__").pop();
                if(viewer.pickName[id]!="undefined"&&viewer.pickName[id]!=null){
                        if (!viewer.channel.selected) viewer.channel.selected = {};
                        if (viewer.channel.selected[id]) {
                            delete viewer.channel.selected[id];
                            window.fl4reStatus("",$("#mainLayout-south"),"selected "+viewer.pickName[Object.keys(viewer.channel.selected)[0]]);
                        } else {
                            viewer.channel.selected[id] = true;
                            window.fl4reStatus("",$("#mainLayout-south"),"selected "+viewer.pickName[id]);
                        }  
                    } else{ 
                        window.fl4reStatus("READY",$("#mainLayout-south"));
                        delete viewer.channel.selected;
                    }
                    viewer.draw();
                }
            //     if(viewer.pickId.hasOwnProperty(id)){
            //         if (!viewer.channel.selected) viewer.channel.selected = {};
            //         if (viewer.channel.selected[id]) {
            //             console.debug(id+" "+"selected")
            //             delete viewer.channel.selected[id];
            //             window.fl4reStatus("",$("#mainLayout-south"),"selected "+viewer.pickId[Object.keys(viewer.channel.selected)[0]]);
            //         } else {
            //             viewer.channel.selected[id] = true;
            //             window.fl4reStatus("",$("#mainLayout-south"),"selected "+viewer.pickId[id]);
            //              console.debug(id+" "+"selected")
            //         }  
            //     } else{ 
            //         window.fl4reStatus("READY",$("#mainLayout-south"));
            //          console.debug("no selected")
            //         delete viewer.channel.selected;
            //     }
            // }
            // console.debug(tmp.attr.id+" "+tmp.attr.rel);
            //selected node object: data.inst.get_json()[0];
            //selected node text: data.inst.get_json()[0].data
        });

        window.callbacks = function(){
            setTimeout(function(){
                function display(id,value){
                    $("#"+id).click(function(){
                        console.debug(id+" |")
                        console.debug(value)
                    });
                }
                function local(id,value){
                    $("#"+id).click(function(){
                        var tmp = trs.create();
                        trs.fromMat4(tmp, value);
                        var e = euler.create();
                        euler.fromQuat(e,tmp.localRotation);
                        console.debug("translation",tmp.localTranslation);
                        console.debug("scale",tmp.localScale);
                        console.debug("rotation",e);

                        // var q = quat.create();
                        // quat.fromEuler(q,e);
                        // console.debug(q);
                        // var trs1 = trs.fromValues(tmp.localTranslation,q,tmp.localScale);
                        // var mat1 = mat4.create();
                        // mat4.fromTrs(mat1,trs1);
                        // console.debug("output "+mat1);
                        });
                    }
            for(var g=0;g<callbackArray.length;g++){
                if(callbackArray[g].type=="local"){
                    local(callbackArray[g].id,callbackArray[g].value);}
                else{
                    display(callbackArray[g].id,callbackArray[g].value);}
                }
            },500);
}
        }

        viewer.onload = refreshScenesTree;
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        var nodeBuffer;
        function parseWarehouseJson(param_in,param_out){
            function children(param_in,param_out){
                for (var j=0; j<param_in.length;j++){
                    var result = {};
                    var tmp =param_in[j];

                        var ext = tmp.name.match(/\.[^.]+$/);
                        if(ext=='.dae'){
                            ext = "collada";
                             result.data = tmp.name.substr(0,60);
                        result.attr = {"id":result.data,"rel":ext,"name":result.data};
                        param_out.push(result);
                        }
                        else if(ext=='.kml'){
                            ext = "kml";
                             result.data = tmp.name.substr(0,60);
                        result.attr = {"id":result.data,"rel":ext,"name":result.data};
                        param_out.push(result);
                        }
                        else if(ext=='.jpg'||ext=='.png'||ext=='.jpeg'||ext=='.tga'){
                            ext = "image";
                             result.data = tmp.name.substr(0,60);
                        result.attr = {"id":result.data,"rel":ext,"name":result.data};
                        param_out.push(result);
                        }
                        else if(ext=='.txt'){
                            ext = "text";
                             result.data = tmp.name.substr(0,60);
                        result.attr = {"id":result.data,"rel":ext,"name":result.data};
                        param_out.push(result);
                        }
                        else{
                            ext = "folder";
                            result.data = tmp.name.substr(0,60)||"folder";
                            result.attr = {"id":result.data,"rel":ext,"name":result.data};
                            result.children = [];
                            result.children = children(tmp.children,result.children);
                            param_out.push(result);
                        }
                        
                       
                    }
                    return param_out;
                }
            if(param_in.hasOwnProperty("assets")){
                var assets = param_in.assets;
            }
            if(assets&&(assets.length==0||assets==null)){
                if(nodeBuffer){nodeBuffer.attr("rel","empty");}
            }
            else if(param_in.type == "folder"||param_in.type == "asset"){
                var result = {};
                var path = param_in.children;
                try{result.data = param_in.name.substr(0,60)}
                catch(err){
                    result.data = "folder";}
                result.attr = {"id":result.data,"rel":"folder","name":result.data};
                result.children = [];
                result.children = children(param_in.children,result.children);
                param_out.push(result);
            }
            else{
                for(var i =0;i<assets.length;i++){
                    var result = {};
                    var asset = assets[i];
                    result.data = asset.name.substr(0,60);
                    result.state = "closed";
                    result.attr = {"id":asset.id,"rel":asset.type,"iconuri":asset.iconUri,"name":result.data,"previewuri":asset.previewUri,"asseturi":asset.assetUri};
                    param_out.push(result);
                }
            }
            return param_out;        
        };

        function download(node){
            var href = $('<a style="display:none" href="/rest3d/warehouse/data/'+node.attr("id")+'" target="_blank"></a>');
            $('body').append(href);
            href[0].click();
            href[0].remove();
        }
        function display(node){
            var uri = node.attr("asseturi");
            var call = function(data){
                var html = '<ul>';
                data = JSON.parse(data);
                console.debug(data);
                console.debug(data["files"]);
                var position = data.files;
                for(var i=0;i<data.files.length;i++){
                    var name = data.files[i].name;
                    var size = data.files[i].size;
                    var path = data.files[i].path;
                    var url = 'http://'+location.host+'/rest3d/'+path;
                    var ext = name.match(/\.[^.]+$/);
                    if(ext[0]=='.DAE'||ext[0]=='.dae'){
                        html += '<li><a>name: '+name+' </a>'+'<a>size: '+size+' </a>'+'<a href="'+url+'">path</a>'+'<button id="'+name+'_'+size+'"></button>'+'</li>';}
                    else{
                        html += '<li><a>name: '+name+' </a>'+'<a>size: '+size+' </a>'+'<a href="'+url+'">path</a>'+'<a id="'+name+'_'+size+'"></a>'+'</li>';}
            }//://node.fl4re.com/viewer/node.fl4re.com/rest3d/upload/5e968750-b05c-11e3-81c0-1b60def22770/doc.kmlnode.fl4re.com/viewer/node.fl4re.com/rest3d/upload/5e968750-b05c-11e3-81c0-1b60def22770/doc.kml
            html += '</ul>';
            GUI.notification({
                title: "Upload "+node.id,
                text: html,
                type: "notice"
            })
            // if($button){
            //     $('#'+name+'_'+size).append($button);
            // }
           $('#'+name+'_'+size).click(function(){
                window.pleaseWait(true);
                COLLADA.load(url, viewer.parse_dae).then(
                function(flag){
                      window.pleaseWait(false);
                      window.notif(url);
                });
            });
            };
            rest3d.urlUpload(uri,call);
        }
        function preview(node){
            $("#dialog").dialog("close");
            var gitHtml = $('<div id="dialog"><iframe id="myIframe" src="" style="height:100% !important; width:100% !important; border:0px;"></div>');
            gitPanel = $('body').append(gitHtml);
            $("#dialog").dialog({
                title: node.attr('name'),
                width: '600',
                height: '500',
                open: function (ev, ui) {
                    $('#myIframe').attr('src',node.attr("previewuri"));
                },
                // close: function(){
                //     gitHtml.remove();
                // },
            });
           $("#dialog").css({'min-height':'none !important;'});
        }
        function icon(node){
             $("#dialog").dialog("close");
            var gitHtml = $('<div id="dialog"><img src="'+node.attr("iconuri") + '" /></div>');
            gitPanel = $('body').append(gitHtml);
            $("#dialog").dialog({
                title: node.attr('name'),
                width: '300',
                height: '300',
                open: function (ev, ui) {
                    $('#myIframe').attr('src',node.attr("iconuri"));
                },
                close: function(){
                    gitHtml.remove();
                },
            });
           $("#dialog").css({'min-height':'none !important;'});
        }
        var accor = GUI.accordion({
            id:"warehouse_accor",
            parent:renderMenu.tree,
              item: [{
                id: "sample",
                text: "Sample of collections"
            }, {
                id: "search",
                text: "Search among the warehouse"
            }, ]
        })
        GUI.treeBis({
            id:'warehouse',
            parent: accor.sample,
            json:  {
                "ajax" : {
                    "type": 'GET',
                    "url": function (node) {
                        nodeBuffer = node;
                        var nodeId = "";
                        var url = "";
                        if (node == -1)
                        {
                            url = "/rest3d/warehouse/";
                        }
                        else if(node.attr('rel')=="collection"||"model")
                        {
                            nodeId = node.attr('id');
                            url = "/rest3d/warehouse/" + nodeId;
                        }
                        return url;
                    },
                    "success": function (new_data) {
                        var result = [];
                        result=parseWarehouseJson(new_data,result);
                        return result;
                    }
                }
            },
            "contextmenu" : {
                "items" : function (node) {
                    var result = {};
                    if(node.attr("iconuri")){
                        result.icon = {'label':'Display icon','action':icon,};}
                    if(node.attr("asseturi")){
                        result.display = {'label':'Upload','action':display,};}
                    if(node.attr("rel")=="model"){
                        result.download = {'label':'Download','action':download,};
                    }
                    if(node.attr("previewuri")){
                        result.preview = {'label':'Preview model','action':preview,};}
                    return result;
                }
            },
            type:  { "types": {
                "folder": {
                    "icon" : {
                        "image" : "../gui/images/folder.png",
                    },
                    },
                "collection": {
                    "icon" : {
                        "image" : "../gui/images/menu-scenes.png",
                    },
                    },
                "collada": {
                    "icon" : {
                        "image" : "../favicon.ico",
                    },
                    },
                "text": {
                    "icon" : {
                        "image" : "../gui/images/file.png",
                    },
                    },
                "kml": {
                    "icon" : {
                        "image" : "../gui/images/kml.png",
                    },
                    },
                 "image": {
                    "icon" : {
                        "image" : "../gui/images/media-image.png",
                    },
                    },
                "model": {
                    "icon" : {
                        "image" : "../gui/images/bunny.png",
                    },
                    },
                "empty": {
                    "icon" : {
                        "image" : "../gui/images/cross.jpg",
                    },
                    },
            }},
            themes:{
            "theme":"apple",
            },
    })
        
        var searchInput = GUI.addInput("searchInputWarehouse", "Paris", accor.search).width("77%");
        searchInput.keypress(
          function(e){
          if (e.keyCode==13){
            var im = GUI.image(accor.search, "img-loadingWarehouse", "../gui/images/loadingV2.gif", 15, 15);
            searchTree.warehouseSearch.jstree("refresh");
            } 
        });
        var submitSearch = GUI.button("search", accor.search, function(){
            var im = GUI.image(accor.search, "img-loadingWarehouse", "../gui/images/loadingV2.gif", 15, 15);
            searchTree.warehouseSearch.jstree("refresh");
        });
        var searchTree = GUI.treeBis({
            id:'warehouseSearch',
            parent: accor.search,
            json:  {
                "ajax" : {
                    "type": 'GET',
                    "url": function (node) {
                        nodeBuffer = node;
                        var nodeId = "";
                        var url = "";
                        // var type = node.attr('type'); 
                        if (node == -1)
                        {
                            url = "/rest3d/warehouse/search/"+searchInput.val();
                        }
                        else if(node.attr('rel')=="collection"||"model")
                        {
                            nodeId = node.attr('id');
                            url = "/rest3d/warehouse/" + nodeId;
                        }
                        return url;
                    },
                    "success": function (new_data) {
                        var result = [];
                        $("#img-loadingWarehouse").remove();
                        result=parseWarehouseJson(new_data,result);
                        return result;
                    }
                }
            },
            "contextmenu" : {
                "items" : function (node) {
                    var result = {};
                    if(node.attr("iconuri")){
                        result.icon = {'label':'Display icon','action':icon,};}
                    if(node.attr("rel")=="model"){
                        result.display = {'label':'Upload','action':display,};
                        result.download = {'label':'Download','action':download,};
                    }
                    if(node.attr("previewuri")){
                        result.preview = {'label':'Preview model','action':preview,};}
                    return result;
                }
            },
            type:  { "types": {
                "folder": {
                    "icon" : {
                        "image" : "../gui/images/folder.png",
                    },
                    },
                "collection": {
                    "icon" : {
                        "image" : "../gui/images/menu-scenes.png",
                    },
                    },
                "collada": {
                    "icon" : {
                        "image" : "../favicon.ico",
                    },
                    },
                "text": {
                    "icon" : {
                        "image" : "../gui/images/file.png",
                    },
                    },
                "kml": {
                    "icon" : {
                        "image" : "../gui/images/kml.png",
                    },
                    },
                 "image": {
                    "icon" : {
                        "image" : "../gui/images/media-image.png",
                    },
                    },
                    //select_node : function () {return false;}
                "model": {
                    "icon" : {
                        "image" : "../gui/images/bunny.png",
                    },
                    },
                "empty": {
                    "icon" : {
                        "image" : "../gui/images/cross.jpg",
                    },
                    },
            }},
            themes:{
            "theme":"apple",
            // "icons": false,
            },
    })

        submitSearch.prop("id","submitSearch")
        GUI.image(renderMenu.render.title, "img-render", "../gui/images/menu-render.png", 12, 14, "before");
        GUI.image(renderMenu.tree.title, "img-render", "../gui/images/menu-scenes.png", 12, 14, "before");
        GUI.image(renderMenu.scenes.title, "img-render", "../gui/images/scene-root.png", 12, 14, "before");
    
         //---------- SCRIPT tab --------------------------------------------------------------------------------------

        renderMenu.addTab({
            id: "script",
            text: "  Script"
        });

        var sample = "$('body').keypress(\n  function(e){\n  if (e.keyCode==113){\n//if key 'q' \n console.debug(e.keyCode)\n  //tape your code here \n } \n});";

        var script = GUI.script({
            id: "scriptArea",
            parent: renderMenu.script,
            content: sample
        });

        script.object.setSize("100%", "93%");
        renderMenu.refresh();

        var play;
        var stop;
        var clear;
        var help;
        var save;
        var load;

        GUI.image(renderMenu.script.title, "img-script", "../gui/images/script.png", 20, 14, "before");
        play = GUI.button("Play", renderMenu.script, function () {
            window.runStatus();
            window.interprate();
            script.parent.on('keyup', function () {
                window.interprate();
            })
            play.addClass("disablehide");
            stop.removeClass("disablehide");
            clear.addClass("disablehide");
            flagStatus = true;
            if (CONSOLE.flagError) {
                CONSOLE.flagError = false;
                window.errorStatus();
            }
        });
        play.html('');
        GUI.addIcon(play, "ui-icon-play", "", "before");
        GUI.addTooltip({
            parent: play,
            content: "Run script"
        });
        stop = GUI.button("Stop", renderMenu.script, function () {
            script.parent.off();
            play.removeClass("disablehide");
            stop.addClass("disablehide");
            clear.removeClass("disablehide");
            flagStatus = false;
            window.readyStatus();
        });
        stop.addClass("disablehide");
        stop.html('');
        GUI.addIcon(stop, "ui-icon-stop", "", "before");
        GUI.addTooltip({
            parent: stop,
            content: "Stop script"
        });
        clear = GUI.button("Clear", renderMenu.script, function () {
            script.parent.off();
            script.object.setValue(sample);
            script.object.clearHistory();
            window.readyStatus();
            flagStatus = false;
        });
        clear.html('');
        GUI.addIcon(clear, "ui-icon-trash", "", "before");
        GUI.addTooltip({
            parent: clear,
            content: "Clear script"
        });
        help = GUI.button("Help", renderMenu.script, function () {
            var html = "<dl><dt>Ctrl-F / Cmd-F</dt><dd>Start searching</dd><dt>Ctrl-G / Cmd-G</dt><dd>Find next</dd><dt>Shift-Ctrl-G / Shift-Cmd-G</dt><dd>Find previous</dd><dt>Shift-Ctrl-F / Cmd-Option-F</dt><dd>Replace</dd> <dt>Shift-Ctrl-R / Shift-Cmd-Option-F</dt><dd>Replace all</dd><dt>Ctrl-Space / Cmd-Space</dt><dd>Auto-complete</dd></dl>"
            GUI.notification({
                title: "Script hotkeys",
                text: html,
                type: "notice"
            })
        });
        help.html('');
        help.prop('id', "helpScript");
        GUI.addIcon(help, "ui-icon-note", "", "before");
        GUI.addTooltip({
            parent: help,
            content: "Hotkeys"
        });

        save = GUI.button("Save", renderMenu.script, function () {

        })
         save.html('');
        save.prop('id', "saveScript");
        GUI.addIcon(save, "ui-icon-disk", "", "before");
        GUI.addTooltip({
            parent: save,
            content: "Save current script"
        });

        var loadInput = GUI.input({
            id: "loadScript",
            parent: renderMenu.script,
            hide: true,
            extension: "application/javascript",
            mode: "readText",
            callback: function (FILE) {
                script.object.setValue(FILE.target.result);
                GUI.notification({
                    text: "Script loaded",
                    time: "5000",
                    type: "notice"
                });
            }
        });
        load = GUI.button("Load", renderMenu.script, function () {
            loadInput.click();
            script.refresh();
        });
        load.html('');
        GUI.addIcon(load, "ui-icon-folder-open", "", "before");
        GUI.addTooltip({
            parent: load,
            content: "Load script"
        });

        var runStatus = GUI.image(renderMenu.script, "traffic-light", "../gui/images/traffic-cone_blue.png", '20', '20');
        GUI.addTooltip({
            parent: runStatus,
            content: "Ready to run"
        })


         window.interprate = function () {
            //$('body').unbind();
            // $(document).unbind();
            window.runStatus();
            $('#scriptElement').remove();
            $('#scriptElement').empty();
            $('#scriptElement').html('');
            var js = script.object.getValue();
            var variable = document.createElement('script');
            variable.id = 'scriptElement';
            variable.textContent = js;
            document.body.appendChild(variable);
            if (CONSOLE.flagError) {
                CONSOLE.flagError = false;
                window.errorStatus();
            }
        }

        window.readyStatus = function () {
            runStatus.remove();
            runStatus = GUI.image(renderMenu.script, "traffic-light", "../gui/images/traffic-cone_blue.png", '20', '20');
            GUI.addTooltip({
                parent: runStatus,
                content: "Ready to run"
            })
        }

        window.errorStatus = function () {
            runStatus.remove();
            runStatus = GUI.image(renderMenu.script, "traffic-light", "../gui/images/traffic-cone_red.png", '20', '20');
            GUI.addTooltip({
                parent: runStatus,
                content: "Error detected into the script, please consult the console"
            });
        }

        window.runStatus = function () {
            runStatus.remove();
            runStatus = GUI.image(renderMenu.script, "traffic-light", "../gui/images/traffic-cone_green.png", '20', '20');
            GUI.addTooltip({
                parent: runStatus,
                content: "Running..."
            });
        }




         /////////////// VIEWER WEBGL WORKAROUD ///////////////////////////////////////////////
   
  

        function jumpLine() {
            renderMenu.render.append("<br></br>");
        }

        GUI.label('welcome1', "Upload your own model:", renderMenu.render);
        jumpLine();

        // renderMenu.render.append("<h4>Welcome to rest3d's viewer!</h4>");
        var accordionUp = GUI.accordion({
            id: "Upload",
            parent: renderMenu.render,
            item: [{
                id: "upload",
                text: "Upload"
            }]
        })

        var upload = GUI.upload({parent:accordionUp.upload, id:"upModel", url:'/rest3d/upload'});
        upload.button.width("80%");
        upload.progress.progress_upModel.width("100%");
        $.getScript("viewer6-upload.js").done(function( script, textStatus ) {
            setViewer6Upload(upload,rest3d,viewer);
          }).fail(function(err){
            console.error("upload external script failed to load");
          });

        jumpLine();
        GUI.label('welcome', "Load some sample models among those accordions:", renderMenu.render);
        jumpLine();

        var accordion = GUI.accordion({
            id: "menu-render",
            parent: renderMenu.render,
            item: [{
                id: "collada",
                text: "COLLADA"
            }, {
                id: "gltf",
                text: "glTF"
            }, ]
        })
        accordion.autoScrollDown();

        jumpLine();

        window.notif = function(object){
            win.parent().parent().find(".ui-icon-close").click();
            win.remove();
            GUI.notification({
                title: object + " successfuly loaded",
                text: "<div id='informationDisplay'></div>",
                type: "notice",
            });
            win = $('#informationDisplay');
            GUI.label( "zoom", "currentZoom is 1", win);win.append('</br>');
            GUI.label('rot', 'rotation goes here', win);win.append('</br>');
            GUI.label('loadtimer', 'loading time: 0', win);win.append('</br>');
            GUI.label('rdm1','Initializing canvas mouse events', win);win.append('</br>');
            GUI.label('rdm12','Use left mouse click to rotate', win);win.append('</br>');
            GUI.label('rdm13','Use mouse wheel to zoom', win);
        }

        GUI.button('duck rest3d(need database)', accordion.collada, function () {
            pleaseWait(true);
            var url = "/rest3d/assets/duck/duck.dae";
            COLLADA.load(url, viewer.parse_dae).then(
            function(flag){
                  pleaseWait(false);
                  window.notif(url);
            }
            ,function (error) {
                // If there's an error or a non-200 status code, log the error.
                console.error("cs "+error);
            });
                        
          
        }).width("90%");
        accordion.collada.append("<hr></hr>");

        GUI.button('duck', accordion.collada, function () {
            pleaseWait(true);
            var url = "/models/duck/duck.dae"
            COLLADA.load(url, viewer.parse_dae).then(
            function(flag){
                  pleaseWait(false);
                  window.notif(url);
            }
            ,function (error) {
                // If there's an error or a non-200 status code, log the error.
                 pleaseWait(false);
                console.error("cs "+error);
            });
        }).width("90%");
        accordion.collada.append("<hr></hr>");

        GUI.button('creature', accordion.collada, function () {
            pleaseWait(true);
            var url = "/models/Amahani/Amahani.dae";
            COLLADA.load(url, viewer.parse_dae).then(
            function(flag){
                  pleaseWait(false);
                  window.notif(url);
            })
        }).width("90%");
        accordion.collada.append("<hr></hr>");

        GUI.button('skinned creature (fix me!!)', accordion.gltf, function () {
            pleaseWait(true);
            var url = "/models/Amahani/Amahani.json";
            glTF.load(url, viewer.parse_gltf).then(
            function(flag){
                  pleaseWait(false);
                  window.notif(url);
            })
        }).width("90%");
        accordion.gltf.append("<hr></hr>");

        GUI.button('duck', accordion.gltf, function () {
            pleaseWait(true);
            var url = "/models/duck-glft/duck_triangulate.json"
            glTF.load(url, viewer.parse_gltf).then(
            function(flag){
                  pleaseWait(false);
                  window.notif(url);
            })
        }).width("90%");
        accordion.gltf.append("<hr></hr>");

        GUI.button('rambler', accordion.gltf, function () {
              pleaseWait(true);
            var url = "/models/rambler/Rambler.json";
            glTF.load(url, viewer.parse_gltf).then(
            function(flag){
                  pleaseWait(false);
                  window.notif(url);
            })

        }).width("90%");
        accordion.gltf.append("<hr></hr>");

        GUI.button('rambler-min', accordion.collada, function () {
            pleaseWait(true);
            var url = "/models/rambler/Rambler-min.dae";
            COLLADA.load(url, viewer.parse_dae).then(
            function(flag){
                  pleaseWait(false);
                  window.notif(url);
            })

        }).width("90%");
        accordion.collada.append("<hr></hr>");

        GUI.button('rambler', accordion.collada, function () {
            pleaseWait(true);
            var url = "/models/rambler/Rambler.dae";
            COLLADA.load(url, viewer.parse_dae).then(
            function(flag){
                  pleaseWait(false);
                  window.notif(url);
            })
        }).width("90%");
        accordion.collada.append("<hr></hr>");

        GUI.button('supermurdoch', accordion.collada, function () {
              pleaseWait(true);
              var url = "/models/SuperMurdoch/SuperMurdoch.dae";
            COLLADA.load(url, viewer.parse_dae).then(
            function(flag){
                  pleaseWait(false);
                  window.notif(url);
            })
        }).width("90%");
        accordion.collada.append("<hr></hr>");

        GUI.button('supermurdoch', accordion.gltf, function () {
              pleaseWait(true);
              var url = "/models/SuperMurdoch/SuperMurdoch.json";
            glTF.load(url, viewer.parse_gltf).then(
            function(flag){
                  pleaseWait(false);
                  window.notif(url);
            })
        }).width("90%");
        accordion.gltf.append("<hr></hr>");

        GUI.button('wine', accordion.collada, function () {
              pleaseWait(true);
              var url = "/models/wine/wine.dae";
            COLLADA.load(url, viewer.parse_dae).then(
            function(flag){
                  pleaseWait(false);
                  window.notif(url);
            })
        }).width("90%");
        accordion.collada.append("<hr></hr>");

        GUI.button('wine', accordion.gltf, function () {
              pleaseWait(true);
              var url = "/models/wine/wine.json";
            glTF.load(url, viewer.parse_gltf).then(
            function(flag){
                  pleaseWait(false);
                  window.notif(url);
            })
        }).width("90%");
        accordion.gltf.append("<hr></hr>");


        GUI.button('uh-1n', accordion.collada, function () {
              pleaseWait(true);
              var url = "/models/uh-1n/uh-1n.dae"
              COLLADA.load(url, viewer.parse_dae).then(
            function(flag){
                  pleaseWait(false);
                  window.notif(url);
            })
        }).width("90%");
        accordion.collada.append("<hr></hr>");

        GUI.button('uh-1n', accordion.gltf, function () {
              pleaseWait(true);
              var url = "/models/uh-1n/uh-1n.json";
            glTF.load(url, viewer.parse_gltf).then(
            function(flag){
                  pleaseWait(false);
                  window.notif(url);
            })
        }).width("90%");
        accordion.gltf.append("<hr></hr>");

        GUI.button('cow', accordion.collada, function () {
              pleaseWait(true);
              var url = "/models/cow/cow.dae"
            COLLADA.load(url, viewer.parse_dae).then(
            function(flag){
                  pleaseWait(false);
                  window.notif(url);
            })
        }).width("90%");

        GUI.button('cow', accordion.gltf, function () {
              pleaseWait(true);
              var url = "/models/cow/cow.json";
            glTF.load(url, viewer.parse_gltf).then(
            function(flag){
                  pleaseWait(false);
                  window.notif(url);
            })
        }).width("90%");

        var colladaMenu = [];
        accordion.collada.find('button').each(function(i){
            var stock = $(this);
            colladaMenu[i]={};
            colladaMenu[i].id="loadCollada_"+i;
            colladaMenu[i].text=$(this).find('span').html();
            colladaMenu[i].callback = function(){
                stock.click();      };    
        })

        GUI.menu({
            id: "load-menu",
            parent: menu.load,
            item: colladaMenu,
        })

        var gltfMenu = [];
        accordion.gltf.find('button').each(function(i){
            var stock = $(this);
            gltfMenu[i]={};
            gltfMenu[i].id="loadgltf_"+i;
            gltfMenu[i].text=$(this).find('span').html();
            gltfMenu[i].callback = function(){
                stock.click();      };    
        });
        
        GUI.menu({
            id: "gltf-menu",
            parent: menu.loadgl,
            item: gltfMenu,
        });

        var canvas = GUI.canvas(layout.jqueryObjectWest);
         // layout.resetOverflow('west');

         // initialize webGL
        viewer.channel = Channel.create(canvas, false); // true for debug context

        var button1 = GUI.button('Simulate Context Loss', renderMenu.render, function () {
            if ($(this).find('.ui-button-text').text() == "Simulate Context Loss") {
                Channel.forceContextLoss();
                $(this).find('.ui-button-text').text("Simulate Restore Context");
            } else {
                Channel.forceContextRestore();
                $(this).find('.ui-button-text').text("Simulate Context Loss");
            }
        });
        initCanvasUI();

        // var currentZoom =0;
        // var currentRotationX, currentRotationY = 0;

        function initCanvasUI() {
            var mouseDown = false;
            var lastX, lastY = 0;
            var downX, downY = 0;
            // attach mouse events to canvas

            function mouseDownHandler(ev) {
                if (!mouseDown) {
                   mouseDown = true;
                   downX = ev.screenX; 
                   downY = ev.screenY;
                }
                lastX = ev.screenX;
                lastY = ev.screenY;

                return true;
            }

            function mouseMoveHandler(ev) {
                if (!mouseDown) return false;

                viewer.currentZoom = 1;
                var mdelta = ev.screenX - lastX;
                lastX = ev.screenX;
                viewer.currentRotationX -= mdelta / 2.5;


                var mdelta = ev.screenY - lastY;
                lastY = ev.screenY;
                viewer.currentRotationY -= mdelta / 2.5;


                viewer.draw();
                return true;
            }

            function mouseUpHandler(ev) {
                mouseDown = false;
                viewer.currentZoom = 1;
                // pick
                if ((downX === ev.screenX) && (downY === ev.screenY)) {

                    var x = ev.layerX / ev.currentTarget.clientWidth;
                    var y = 1.0 - (ev.layerY / ev.currentTarget.clientHeight);

                    var id=viewer.draw(true,x,y);
                    
                    if(viewer.pickName[id]!="undefined"&&viewer.pickName[id]!=null){
                        if (!viewer.channel.selected) viewer.channel.selected = {};
                        if (viewer.channel.selected[id]) {
                            delete viewer.channel.selected[id];
                            window.fl4reStatus("",$("#mainLayout-south"),"selected "+viewer.pickName[Object.keys(viewer.channel.selected)[0]]);
                        } else {
                            var realId = viewer.pickName[id].split("#").pop();
                            realId = realId.split("[")[0];
                            // console.debug("#"+realId+'__'+id+' '+$("#"+realId+'__'+id).length);
                            treeScene.Tree.jstree("select_node", "#"+realId+'__'+id); 
                            viewer.channel.selected[id] = true;
                            window.fl4reStatus("",$("#mainLayout-south"),"selected "+viewer.pickName[id]);
                        }  
                    } else{ 
                        window.fl4reStatus("READY",$("#mainLayout-south"));
                        treeScene.Tree.jstree("deselect_all");
                        delete viewer.channel.selected;
                    }
                    viewer.draw();

                }
            }

            function mouseWheelHandler(ev) {

                var mdelta = ev.wheelDelta;
                viewer.currentZoom = Math.exp(mdelta / 2500);

                viewer.draw();
                return true;
            }

            canvas.removeEventListener("mousedown", mouseDownHandler, false);
            canvas.removeEventListener("mousemove", mouseMoveHandler, false);
            canvas.removeEventListener("mouseup", mouseUpHandler, false);
            canvas.removeEventListener("mousewheel", mouseWheelHandler, false);
            canvas.addEventListener("mousedown", mouseDownHandler, false);
            canvas.addEventListener("mousemove", mouseMoveHandler, false);
            canvas.addEventListener("mouseup", mouseUpHandler, false);
            canvas.addEventListener("mousewheel", mouseWheelHandler, false);
            // redraw on resize

            $(canvas).resize(function (evt) {
                viewer.draw();
            });
        };

        button1.hide();

        //$('#tabindex_2').find('input').click();
        // $('#tabindex_1').find('input').click();

       // layout.jqueryObject.sizePane("west", $(window).width() - 450);
        setTimeout(function () {
            layout.jqueryObject.sizePane("west", $(window).width() - 499);
        },1000);

        layout.jqueryObject.resizeAll();
        layout.jqueryObject.initContent("center");
        layout.jqueryObject.initContent("west");

         GUI.notification({
                title: "Welcome to rest3d's viewer!",
                text: "We are proposing a new version of our viewer elaborated with gui6. You are able to display some model samples in COLLADA/glTF format or explore 3D warehouse for displaying your favorite objects.",
                type: "notice",
                time:"10000",
            })
              window.loadCss("pepper-grinder");
        
        // $("#mainLayout-west").append('<div id="colorSelector"  style="z-index:9999!important;"><div style="background-color: #0000ff"></div></div>');
        GUI.button("undefined",$("#mainLayout-west")).prop("id","colorSelector");
        var tmpPicker;
        var flagColorPicker='show';
        $('#colorSelector div').css('backgroundColor', '#ffffff');

        $('#colorSelector').ColorPicker({
            color: '#ffffff',
            onShow: function (colpkr) {
                $(".colorpicker").css("margin-left","-320px");
                $(colpkr).fadeIn(200);
                tmpPicker = $(colpkr);
                return false;
            },
            onHide: function (colpkr) {
                $(colpkr).fadeOut(200);
                tmpPicker = $(colpkr);
                return false;
            },
            onSubmit: function (hsb, hex, rgb) {
                $('#colorSelector div').css('backgroundColor', '#' + hex);
                $('#mainLayout-west').css('backgroundColor', '#' + hex);
                $("#mainLayout-west").css({"background-image":"none"});
                tmpPicker.fadeOut(200);
            }
        });
        // $("#tmp, #colorSelector, .colorpicker").mouseover(function(){
        //     $('#colorSelector').show();
        // })
        //   $("#tmp, #colorSelector, .colorpicker").mouseleave(function(){
        //     $('#colorSelector').hide();
        // })


        var settingMenu =GUI.menu({
            id: "settings-menu",
            parent: menu.settings,
            item: [
            {id:"contextLoss",text:'Context Loss',callback:function(){button1.click();}},
            {type:"separator"},
        {
            id:"pickerEnable", type:"checkbox", text:"Enable colorpicker", isChecked:function(){
                $('#colorSelector').show();
            }
            ,
            noChecked:function(){
                $('#colorSelector').hide();
            },
            checked: true,
        },
        {
            id:"animationFrame", type:"checkbox", text:"Request Animation Frame", isChecked:function(){
                $("#fpsCounterSetting").removeClass("disable");
                flagTick = true;
                tick();
            },
            noChecked: function(){
                $("#fpsCounterSetting").addClass("disable");
                if($('#fpsCounterSetting').find('input').prop("checked") == true){
                    $('#fpsCounterSetting').find('input').attr("checked", false);
                    $("#fps").hide();
                }
                flagTick = false;
            }
        },
        {
            id:"fpsCounterSetting", type:"checkbox", text:"Show fps counter", isChecked:function(){
                $("#fps").show();
            },
            noChecked:function(){
                $("#fps").hide();
            },
        },
        ]});
        
        function FPSCoounter() {
    var counterID;
    var intervalID;

    // (function () {
    //     this.check = true;
    // })();

    return {
        'createElement': function (elem) {
            counterID = elem.id;
            this.fps = 0;
            this.averageFPS = 0;
            this.averageCount = 0;
        },
        'increment': function () {
            ++this.fps;
        },
        'clear': function () {
            this.fps = 0;//
        },
        'UpdateFPS': function () {
            var fpsDiv = document.getElementById(counterID);
            fpsDiv.innerHTML = this.fps + " FPS";
            this.averageFPS = (this.averageFPS * this.averageCount + this.fps) / (1+this.averageCount);
            this.averageCount ++;
            this.fps = 0;
        },
        'getAverageFPS': function() {
            return this.averageFPS;//
        },
        'run': function () {
            var that = this;
            intervalID = setInterval(function () { that.UpdateFPS.call(that); }, 1000);
        },
        'stop': function () {
            clearInterval(intervalID);
            this.fps = 0;
            this.UpdateFPS();
        }
    }
}
    var htmlFps = '<div class="yasuo" style="z-index: 999 !important;"><a id="fps" class="ui-widget-content" style="float:right;" >? FPS</a></div>';
    $("#mainLayout-west").append(htmlFps);

    var but1 = GUI.button('fullscreen',$("#mainLayout-west"),function(){
        if (screenfull.enabled) {
        screenfull.request($("#mainLayout-west")[0]);
    }
    }).prop("id","fullCanvas");
    but1.html('');
    GUI.addIcon(but1, "ui-icon-arrow-4-diag", "", "before");
    GUI.addTooltip({
        parent: but1,
        content: "Fullscreen mode",
    });
    $('#colorSelector').html('');
    GUI.addIcon($('#colorSelector'), "ui-icon-key", "", "before");
    GUI.addTooltip({
        parent: $('#colorSelector'),
        content: "Set a color to the background",
    });
    $('#colorSelector').css({"background":"none !important;"})
    var inputImage = GUI.input({
        id: "loadImage",
        parent: renderMenu.script,
        hide: true,
        extension: "image/*",
        mode: "displayImage",
    });
    var button = GUI.button('',$("#mainLayout-west"),function(){
        inputImage.click();
    }).prop("id","imageCanvas");
    button.html('');
    GUI.addIcon(button, "ui-icon-image", "", "before");
    GUI.addTooltip({
        parent: button,
        content: "Load an image as background",
    });

    var fpsCounter = new FPSCoounter();
    var flagTick = false;
    fpsCounter.createElement( document.getElementById("fps"));
    fpsCounter.run();
    $("#fps").hide();
    function tick() {
        if(flagTick){
            requestAnimFrame(tick);
            viewer.draw();
            fpsCounter.increment();}
    }
     window.fl4reStatus("READY",$("#mainLayout-south"));
      GUI.container.resizeAll();
                GUI.container.initContent("center");
                GUI.container.initContent("west");
}

viewer.easyINIT = function(){

 var $canvas;

if (!window.performance || !window.performance.now) {
    window.performance = window.performance || {};
    window.performance.now = $.now
};
function args() {
          // This function is anonymous, is executed immediately and 
          // the return value is assigned to QueryString!
          var query_string = {};
          var query = window.location.search.substring(1);
          var vars = query.split("&");
          for (var i=0;i<vars.length;i++) {
            var pair = vars[i].split("=");
                // If first entry with this name
            if (typeof query_string[pair[0]] === "undefined") {
              query_string[pair[0]] = pair[1];
                // If second entry with this name
            } else if (typeof query_string[pair[0]] === "string") {
              var arr = [ query_string[pair[0]], pair[1] ];
              query_string[pair[0]] = arr;
                // If third or later entry with this name
            } else {
              query_string[pair[0]].push(pair[1]);
            }
          } 
            return query_string;
        };
var $background = $('<div style="position: absolute; top: 0px; bottom: 0px; right:0px; left:0px; height: 100%; width:100%; background-color: white;">'); 
$('body').append($background);
$canvas = $('<canvas id="tmp" class="ui-resize-me" style="position: absolute; top: 0px; bottom: 0px; right:0px; margins: 0px;height: 100%; width:100%; " ></canvas>');
$background.append($canvas);
// initialize webGL
viewer.channel = Channel.create($canvas[0]); 

initCanvasUI();

function initCanvasUI() {
            var mouseDown = false;
            var lastX, lastY = 0;
            // attach mouse events to canvas

            function mouseDownHandler(ev) {
                mouseDown = true;
                lastX = ev.screenX;
                lastY = ev.screenY;
                return true;
            }

            function mouseMoveHandler(ev) {
                if (!mouseDown) return false;

                viewer.currentZoom = 1;
                var mdelta = ev.screenX - lastX;
                lastX = ev.screenX;
                viewer.currentRotationX -= mdelta / 2.5;


                var mdelta = ev.screenY - lastY;
                lastY = ev.screenY;
                viewer.currentRotationY -= mdelta / 2.5;


                viewer.draw();
                return true;
            }

            function mouseUpHandler(ev) {
                mouseDown = false;
            }

            function mouseWheelHandler(ev) {

                var mdelta = ev.wheelDelta;
                viewer.currentZoom = Math.exp(mdelta / 2500);

                viewer.draw();
                return true;
            }

            $canvas[0].removeEventListener("mousedown", mouseDownHandler, false);
            $canvas[0].removeEventListener("mousemove", mouseMoveHandler, false);
            $canvas[0].removeEventListener("mouseup", mouseUpHandler, false);
            $canvas[0].removeEventListener("mousewheel", mouseWheelHandler, false);
            $canvas[0].addEventListener("mousedown", mouseDownHandler, false);
            $canvas[0].addEventListener("mousemove", mouseMoveHandler, false);
            $canvas[0].addEventListener("mouseup", mouseUpHandler, false);
            $canvas[0].addEventListener("mousewheel", mouseWheelHandler, false);
            // redraw on resize

            $($canvas).resize(function (evt) {
                viewer.draw();
            });
        };


var arg = args();
if (arg.file) {
    var ext = arg.file.match(/\.[^.]+$/);
    if(ext==".json"){
    glTF.load(arg.file,  viewer.parse_gltf);
} 
    else if(ext==".dae"){
    COLLADA.load(arg.file, viewer.parse_dae)
    }
    else{
        console.log("This file couldn't be loaded. Please make sure the file specified is a dae or json model");
    }
}
    else{
        console.log("any file specified in url for loading");
    }



        function FPSCoounter() {
    var counterID;
    var intervalID;

    // (function () {
    //     this.check = true;
    // })();

    return {
        'createElement': function (elem) {
            counterID = elem.id;
            this.fps = 0;
            this.averageFPS = 0;
            this.averageCount = 0;
        },
        'increment': function () {
            ++this.fps;
        },
        'clear': function () {
            this.fps = 0;//
        },
        'UpdateFPS': function () {
            var fpsDiv = document.getElementById(counterID);
            fpsDiv.innerHTML = this.fps + " FPS";
            this.averageFPS = (this.averageFPS * this.averageCount + this.fps) / (1+this.averageCount);
            this.averageCount ++;
            this.fps = 0;
        },
        'getAverageFPS': function() {
            return this.averageFPS;
        },
        'run': function () {
            var that = this;
            intervalID = setInterval(function () { that.UpdateFPS.call(that); }, 1000);
        },
        'stop': function () {
            clearInterval(intervalID);
            this.fps = 0;
            this.UpdateFPS();
        }
    }
}
    var htmlFps = '<div class="yasuo" style="z-index: 999 !important; position:absolute; right:0;"><a id="fps" style="float:right;" >? FPS</a></div>';
    $("body").append(htmlFps);
      // GUI.notification({
      //           title: "Frame rate",
      //           text: htmlFps,
      //           type: "notice"
      //       })
    var fpsCounter = new FPSCoounter();
    var flagTick = true;
    fpsCounter.createElement( document.getElementById("fps"));
    tick();
    fpsCounter.run();

    function tick() {
        if(flagTick){
            requestAnimFrame(tick);
            viewer.draw();
            fpsCounter.increment();}
    }

     $("body").append('<div id="colorSelector"  style="z-index:9999!important; right:38px !important; bottom:35px !important;"><div style="background-color: #0000ff"></div></div>');
        var tmpPicker;
        var flagColorPicker="show";
        $('#colorSelector div').css('backgroundColor', '#ffffff');
        $('#colorSelector').ColorPicker({
            color: '#ffffff',
            onShow: function (colpkr) {
                $(".colorpicker").css("margin-left","35px");
                if(flagColorPicker=='show'){$(colpkr).fadeIn(500);}
                tmpPicker = $(colpkr);
                flagColorPicker = "hide";
                return false;
            },
            onHide: function (colpkr) {
                if(flagColorPicker=='hide'){$(colpkr).fadeOut(500);}
                tmpPicker = $(colpkr);
                flagColorPicker = "show";
                return false;
            },
            onSubmit: function (hsb, hex, rgb) {
                $('#colorSelector div').css('backgroundColor', '#' + hex);
                $background.css('backgroundColor', '#' + hex);
                tmpPicker.fadeOut(500);
            }
        });

        $('#colorSelector').css({'right':'100px !important'})
};

  return viewer;
});
