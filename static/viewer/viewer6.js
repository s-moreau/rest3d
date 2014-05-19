/*

The MIT License (MIT)

Copyright (c) 2013 RÃ©mi Arnaud - Advanced Micro Devices, Inc.

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
define(['jquery', 'gltf', 'collada', 'renderer', 'camera', 'state', 'channel', 'q', 'console', 'glmatrixExt'],
    function ($, glTF, COLLADA, RENDERER, Camera, State, Channel, Q, CONSOLE) {

        var viewer = {};
        viewer.flagPick = false;
        viewer.flagAnimation = true;


        var scenes = [];
        var animations = {};
        var animation_timer = 0;
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

        viewer.dropTick = false;


        if (!window.performance || !window.performance.now) {
            window.performance = window.performance || {};
            window.performance.now = $.now
        };

        viewer.parse_dae = function (dae) {

            // set the image load callback to redraw
            try{
                dae.onload = function (e) {
                    e.preventDefault();
                    viewer.draw();
                }
            }catch(e){
                console.error("Collada loader failed to parse the incoming file");
                return;
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
                            primitive.POSITION = new Float32Array(position);
                        }
                        if (triangles.NORMAL) {
                            normal = []
                            var npush = normal.push;
                            var nget = triangles.NORMAL;
                            for (var i = 0; i < triangles.count * 3; ++i)
                                npush.apply(normal, nget.call(triangles, i));
                            primitive.NORMAL = new Float32Array(normal);
                        }
                        if (triangles.TEXCOORD_0) {
                            texcoord = [];
                            var tpush = texcoord.push;
                            var tget = triangles.TEXCOORD_0;
                            for (var i = 0; i < triangles.count * 3; ++i)
                                tpush.apply(texcoord, tget.call(triangles, i))
                            primitive.TEXCOORD_0 = new Float32Array(texcoord);
                        }

                        if (triangles.COLOR) {
                            color = [];
                            var cpush = color.push;
                            var cget = triangles.COLOR;
                            for (var i = 0; i < triangles.count * 3; ++i)
                                cpush.apply(color, cget.call(triangles, i))
                            primitive.COLOR = new Float32Array(color);
                        }

                        primitive.INDEX = null;

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
                                }
                                else {
                                    state.values.COLOR = [1, 1, 1, 0.5];
                                }

                            }
                            else if (search !== diffuse.texcoord) {
                                console.log('semantic ' + search + ' does not match diffuse semantic of ' + diffuse.texcoord);
                            }
                            else if (diffuse && diffuse.image) {
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

                        var glprim = new RENDERER.primitive(primitive, state);

                        // initialize picking ID
                        var pickID = viewer.pickName.length;
                        viewer.pickName.push(viewer.nowParsing + "#" + this.id + "[" + p + "]");
                        glprim.pickColor = [(pickID & 0xff) / 255, ((pickID >> 8) & 0xff) / 255, ((pickID >> 16) & 0xff) / 255, 1];
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
            viewer.scenes = scenes;
            if (viewer.onload)
                viewer.onload.call();
        };

        viewer.parse_gltf = function (gltf) {

            // (viewer global) set current uri
            viewer.nowParsing = gltf.url;
            var starttime = window.performance.now();

            // set the image load callback to redraw
            gltf.onload = function (e) {
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


                        // special case for skins
                        if (this.skin) {
                            if (!material.overrides) material.overrides = {};
                            material.overrides.JOINT_MATRIX = this.skin.jointMatrix;
                            // this is where we store the values for the skinning uniform
                        }



                        var state = State.fromPassAndOverrides(material.pass, material.overrides);
                        // fill up my primitive structure
                        var primitive = {};

                        primitive.POSITION = triangles.POSITION;
                        primitive.NORMAL = triangles.NORMAL;
                        primitive.TEXCOORD_0 = triangles.TEXCOORD_0;
                        primitive.WEIGHT = triangles.WEIGHT;
                        primitive.COLOR = triangles.COLOR;
                        primitive.BINORMAL = triangles.BINORMAL;
                        primitive.INDEX = triangles.INDEX;
                        primitive.JOINT = triangles.JOINT;

                        var glprim = new RENDERER.primitive(primitive, state);

                        // initialize picking ID
                        var pickID = viewer.pickName.length;
                        viewer.pickName.push(viewer.nowParsing + "#" + this.id + "[" + i + "]");
                        glprim.pickColor = [(pickID & 0xff) / 255, ((pickID >> 8) & 0xff) / 255, ((pickID >> 16) & 0xff) / 255, 1];
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


            // do this after scene parse so it can resolve links to transforms
            animations = gltf.parse_animations();

            // resolve links to 'sources' in uniforms
            for (var programID in this.programs) {
                var program = this.programs[programID];
                // look for sources ... could this be done in gltf with a deffered resolution ?
                for (var uniformID in program.uniforms) {
                    var uniform = program.uniforms[uniformID];
                    if (uniform.source) {
                        var source = this.transforms[uniform.source].world;
                        uniform.value = source;
                    }
                }
            }


            // depth first traversal, create primitives, states and bounding boxes

            scene.bounds = viewer.build_scene(scene, buildMe);


            mainCamera = Camera.create();
            Camera.lookAtAabb(mainCamera, scene.bounds, scene.upAxis);

            viewer.currentRotationX = viewer.currentRotationY = 0;
            viewer.clearStack();

            scene.starttime = starttime;
            scene.endtime = window.performance.now();
            //$('#loadtimer').html('load time=' + (scene.endtime - scene.starttime));
            scenes.push(scene);
            viewer.draw();
            if (viewer.onload)
                viewer.onload.call();
        };

        viewer.pushMatrix = function (m) {
            if (m) {
                mvMatrixStack.push(mat4.clone(m));
                mvMatrix = mat4.clone(m);
            }
            else {
                mvMatrixStack.push(mat4.clone(mvMatrix));
            }
        };

        viewer.popMatrix = function () {
            if (mvMatrixStack.length == 0) throw "Invalid popMatrix!";
            mvMatrix = mvMatrixStack.pop();
            return mvMatrix;
        };

        viewer.clearStack = function () {
            mvMatrixStack = [];
            mvMatrix = mat4.create();
        };

        // temporary storage space
        var tmpMat = mat4.create();
        var resultMat = mat4.create();
        var inverseBindMatrix = mat4.create();

        viewer.drawnode = function () {

            if (!this.geometries || this.geometries.length == 0)
                return true;

            if (this.skin) {
                // calculate matrices 
                // inverse skin node world matrix * joint[i]*world matrix * inverse bind matrix[i] * bindshapematrix
                // TODO -> create and use temporary matrices
                var inverseSkinWorldMatrix = mat4.invert(tmpMat, this.world);
                // this.world is mvMatrix ?
                var bindShapeMatrix = this.skin.bindShapeMatrix;

                var jointMatrix = this.skin.jointMatrix;

                for (var i = 0, j = 0, k = 0; i < this.skin.joints.length; i++) {

                    var nodeWorldMatrix = this.skin.joints[i].world;

                    inverseBindMatrix[0] = this.skin.inverseBindMatrices[k++];
                    inverseBindMatrix[1] = this.skin.inverseBindMatrices[k++];
                    inverseBindMatrix[2] = this.skin.inverseBindMatrices[k++];
                    inverseBindMatrix[3] = this.skin.inverseBindMatrices[k++];
                    inverseBindMatrix[4] = this.skin.inverseBindMatrices[k++];
                    inverseBindMatrix[5] = this.skin.inverseBindMatrices[k++];
                    inverseBindMatrix[6] = this.skin.inverseBindMatrices[k++];
                    inverseBindMatrix[7] = this.skin.inverseBindMatrices[k++];
                    inverseBindMatrix[8] = this.skin.inverseBindMatrices[k++];
                    inverseBindMatrix[9] = this.skin.inverseBindMatrices[k++];
                    inverseBindMatrix[10] = this.skin.inverseBindMatrices[k++];
                    inverseBindMatrix[11] = this.skin.inverseBindMatrices[k++];
                    inverseBindMatrix[12] = this.skin.inverseBindMatrices[k++];
                    inverseBindMatrix[13] = this.skin.inverseBindMatrices[k++];
                    inverseBindMatrix[14] = this.skin.inverseBindMatrices[k++];
                    inverseBindMatrix[15] = this.skin.inverseBindMatrices[k++];

                    // inverseSkinWorldMatrix * nodeWorldMatrix * inverseBindMatrix * bindShapeMatrix;
                    // (v * BSM * BSMi * BSMi) * weight

                    mat4.multiply(resultMat, inverseSkinWorldMatrix,nodeWorldMatrix);
                    mat4.multiply(resultMat, resultMat,inverseBindMatrix);
                    mat4.multiply(resultMat, resultMat, bindShapeMatrix);


                    jointMatrix[j++] = resultMat[0];
                    jointMatrix[j++] = resultMat[1];
                    jointMatrix[j++] = resultMat[2];
                    jointMatrix[j++] = resultMat[3];
                    jointMatrix[j++] = resultMat[4];
                    jointMatrix[j++] = resultMat[5];
                    jointMatrix[j++] = resultMat[6];
                    jointMatrix[j++] = resultMat[7];
                    jointMatrix[j++] = resultMat[8];
                    jointMatrix[j++] = resultMat[9];
                    jointMatrix[j++] = resultMat[10];
                    jointMatrix[j++] = resultMat[11];
                    jointMatrix[j++] = resultMat[12];
                    jointMatrix[j++] = resultMat[13];
                    jointMatrix[j++] = resultMat[14];
                    jointMatrix[j++] = resultMat[15];
                }
            }

            for (var j = 0, len = this.geometries.length; j < len; j++) {
                var primitives = this.geometries[j].glprimitives;
                if (primitives) {
                    State.setModelView(this.world);
                    for (var i = 0; i < primitives.length; i++)
                        primitives[i].render(viewer.channel);
                }
            }
            return true;
        }

        viewer.render_scene = function (_nodes, _callback) {

            for (var j = 0, lenj = _nodes.length; j < lenj; j++) {

                var node = _nodes[j];
                // console.debug("node: ");
                // console.debug(node.local)

                viewer.pushMatrix();
                mat4.multiply(node.world, mvMatrix, node.local);
                mat4.copy(mvMatrix, node.world);

                if (node.children)
                    viewer.render_scene.call(this, node.children, _callback)

                var cont = _callback.call(node);

                viewer.popMatrix();
            }


            return cont;
        };

        // temporary vectors are pre-alocated
        var v1 = vec3.create();
        var v2 = vec3.create();
        var v3 = vec3.create();

        // private function
        // call viewer.draw() from outside
        var draw = function (pick, x, y) {

            if (!scenes || scenes.length < 1) return null;


            if (viewer.flagAnimation) {

                var delta = window.performance.now() - animation_timer;
                animation_timer += delta;
                if (delta > 1000) // one frame per second
                {
                    delta = 1000; // jump in time, breakpoint?
                }
                for (var key in animations) {
                    //var keys = Object.keys(animations); var key=keys[1]; {
                    for (var i = 0; i < animations[key].length; i++) {
                        var animation = animations[key][i];
                        if (!viewer.flagTick) {
                            if (animation.currentIndex === undefined)
                                animation.currentIndex = 0;
                            else {
                                animation.currentIndex += 1;
                                if (animation.currentIndex >= animation.count)
                                    animation.currentIndex = 0;
                            }
                            var index = animation.currentIndex;
  
                            if (animation.path === 'rotation') {
                                vec3.normalize(v1, [animation.output[index * 4], animation.output[index * 4 + 1], animation.output[index * 4 + 2]]);
                                var angle = animation.output[index * 4 + 3];
                                quat.setAxisAngle(animation.target.trs.rotation, v1, angle);
                            } else if (animation.path === 'scale') {
                                vec3.set(v1, animation.output[index*3], animation.output[index*3+1],animation.output[index*3+2]);
                                vec3.copy(animation.target.trs.scale, v1);
                            } else if (animation.path === 'translation') {
                                vec3.set(v1, animation.output[index*3], animation.output[index*3+1],animation.output[index*3+2]);
                                vec3.copy(animation.target.trs.translation, v1);
                            } else {
                                console.log('unknown animation path='+animation.path);
                                continue;
                            }

                        }
                        else {
                            var index_min = 0;
                            var index_max = animation.count;
                            var index = index_min;

                            var time = animation_timer / 1000;

                            var k = Math.floor((time - animation.time_min) / (animation.time_max - animation.time_min));

                            time -= k * (animation.time_max - animation.time_min);

                            // find time interval using dychotomia
                            while (index_max - index_min > 1) {
                                index = (index_max + index_min) >> 1;
                                if (time > animation.input[index]) {
                                    index_min = index;
                                }
                                else {
                                    index_max = index;
                                }
                            }

                            // interpolate output to find result

                            var interp = (animation.input[index_min] - time) / (animation.input[index_min] - animation.input[index_max]);

                            // This is axis / angle ...
                            if (animation.path === 'rotation') {
                                // interpolate axis
                                vec3.normalize(v1, [animation.output[index_min * 4], animation.output[index_min * 4 + 1], animation.output[index_min * 4 + 2]]);
                                vec3.normalize(v2, [animation.output[index_max * 4], animation.output[index_max * 4 + 1], animation.output[index_max * 4 + 2]]);
                                vec3.lerp(v3, v1, v2, interp);

                                // interpolate angle
                                var angle = (animation.output[index_min * 4 + 3] * (1-interp)) + (animation.output[index_max * 4 + 3]*interp);

                                quat.setAxisAngle(animation.target.trs.rotation, v3, angle);

                            } else if (animation.path === 'translation') {
                                vec3.set(v1, animation.output[index_min * 3], animation.output[index_min * 3 + 1], animation.output[index_min *3 +2]);
                                vec3.set(v2, animation.output[index_max * 3], animation.output[index_max * 3 + 1], animation.output[index_max *3 +2]);
                                vec3.lerp(animation.target.trs.translation, v1, v2, interp);

                            } else if (animation.path === 'scale') {
                                vec3.set(v1, animation.output[index_min * 3], animation.output[index_min * 3 + 1], animation.output[index_min *3 +2]);
                                vec3.set(v2, animation.output[index_max * 3], animation.output[index_max * 3 + 1], animation.output[index_max *3 +2]);
                                vec3.lerp(animation.target.trs.scale, v1, v2, interp);
                            } else
                                console.error('unknown animation type');
                        }

                        mat4.fromTrs(animation.target.local, animation.target.trs);

                    }

                }
            }

            if (!pick) {
                $('#zoom').text('currentZoom is ' + viewer.currentZoom);
                $('#rot').text('currentRotation is ' + viewer.currentRotationX.toFixed(2) + ',' + viewer.currentRotationY.toFixed(2));
            }

            if (pick) {
                Channel.pickMode(viewer.channel, true);
            }

            if (pick)
                Channel.clear(viewer.channel, [0, 0, 0, 0]);
            else
                Channel.clear(viewer.channel, [0, 0, 0, 0]); // set clear color here

            Camera.rotateAround(mainCamera, viewer.currentZoom, viewer.currentRotationX, viewer.currentRotationY);

            mat4.multiply(pmMatrix, mainCamera.projection, mainCamera.lookAt);

            var state = viewer.channel.state;
            viewer.scenes = scenes;
            for (var i = 0; i < scenes.length; i++) {
                viewer.pushMatrix();

                if (scenes[i].upAxis === 'Z_UP') {
                    mat4.rotate(mvMatrix, mvMatrix, -90 * deg2rad, vec3.fromValues(1, 0, 0));
                };

                State.setViewProj(pmMatrix);

                // depth first scene drawing
                viewer.render_scene.call(viewer.channel, scenes[i], viewer.drawnode);

                viewer.popMatrix();
            }

            if (pick) {
                return Channel.pickMode(viewer.channel, false, x, y);
            }

        };

        viewer.build_scene = function (_nodes, _callback) {
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


        viewer.tick = function () {
            if (viewer.flagTick) {
                requestAnimFrame(viewer.tick);
                draw();
                viewer.fpsCounter.increment();
            }
        }

        viewer.draw = function () {
            if (viewer.flagTick)
                return; // update will be done automatically
            else
                draw();
        }

        viewer.pick = function (x, y) {
            return draw(true, x, y);
        }

        return viewer;
    });