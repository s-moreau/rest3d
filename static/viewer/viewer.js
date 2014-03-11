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

var viewer = {};
var scenes = [];
var currentZoom = 1;
var mvMatrixStack = [];
var mvMatrix = mat4.create();
var deg2rad = 0.0174532925; // constant
var currentRotationX = 0;
var currentRotationY = 0;

var pmMatrix = mat4.create();

var canvas = null;

var mainCamera = null;
var channel = null;

var tree = null;
var scene_tree = null;
var warehouse_tree = null;

// associate primitive name with picking ID
viewer.pickName = [null];
viewer.nowParsing;

viewer.dropTick=false;

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
                glprim.pickID = [(pickID & 0xff)/255,((pickID>>8)&0xff)/255,((pickID>>16)&0xff)/255,1];

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

    currentRotationX = currentRotationY = 0;
    viewer.clearStack();
    scene.starttime = starttime;
    scene.endtime = window.performance.now();

    scenes.push(scene);
    $('#loadtimer').text('load time=' + (scene.endtime - scene.starttime));
    viewer.draw();
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
                glprim.pickID = [(pickID & 0xff)/255,((pickID>>8)&0xff)/255,((pickID>>16)&0xff)/255,1];

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
    scene.upAxis = "Y_UP";

    // depth first traversal, create primitives, states and bounding boxes

    scene.bounds = viewer.build_scene(scene, buildMe);


    mainCamera = Camera.create();
    Camera.lookAtAabb(mainCamera, scene.bounds, scene.upAxis);

    currentRotationX = currentRotationY = 0;
    viewer.clearStack();

    scene.starttime = starttime;
    scene.endtime = window.performance.now();
    $('#loadtimer').text('load time=' + (scene.endtime - scene.starttime));
    scenes.push(scene);
    viewer.draw();
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
                primitives[i].render(channel);
        }
    }

    return true;
}

viewer.render_scene = function(_nodes, _callback) {

    for (var j = 0, lenj = _nodes.length; j < lenj; j++) {
        var node = _nodes[j];

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
    $('#zoom').text('currentZoom is ' + currentZoom);
    $('#rot').text('currentRotation is ' + currentRotationX.toFixed(2) + ',' + currentRotationY.toFixed(2));
    } 

    if (pick) {
        viewer.dropTick=true;
        Channel.pickMode(channel,true);      
    }
   
    if (pick)
       Channel.clear(channel, [0,0,0,0]); 
    else
       Channel.clear(channel, [0,0,0,0]); // transparent background - so we see through the canvas

    Camera.rotateAround(mainCamera, currentZoom, currentRotationX, currentRotationY);

    mat4.multiply(pmMatrix, mainCamera.projection, mainCamera.lookAt);

    var state = channel.state;

    for (var i = 0; i < scenes.length; i++) {
        viewer.pushMatrix();

        if (scenes[i].upAxis === 'Z_UP') {
            mat4.rotate(mvMatrix, mvMatrix, -90 * deg2rad, vec3.fromValues(1, 0, 0));
        };

        //State.setModelView(mvMatrix);
        State.setViewProj(pmMatrix);

        // depth first scene drawing
        viewer.render_scene.call(channel, scenes[i], viewer.drawnode);

        viewer.popMatrix();
    } 

    if (pick)
    {                     
        viewer.dropTick = false;
        return Channel.pickMode(channel,false,x,y);
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
