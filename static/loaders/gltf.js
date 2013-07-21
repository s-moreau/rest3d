/*
 gltf.js 

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
THE SOFTWARE.

 gltf.js needs gl-matrix.js and its extensions
*/

if (window.mat4 === undefined)
{
	document.write('<script src="../deps/gl-matrix-min.js"><\/'+'script>');
	document.write('<script src="../src/gl-matrix-ext.js"><\/'+'script>');
}

(function(){
	// Initial Setup
	// -------------

	// Save a reference to the global object (`window` in the browser, `exports`
	// on the server).
	var root = this;
	// The top-level namespace. All public glTF classes and modules will
	// be attached to this. Exported for both CommonJS and the browser.
	var glTF;
	if (typeof exports !== 'undefined') {
		glTF = exports;
	} else {
		glTF = root.glTF = {};
	}
	// TODO: Current version of the library. Keep in sync with `package.json`.
	glTF.VERSION = '0.0.1';

	glTF.log = function(msg){
		if (console && console.log) console.log(msg);
	};

	glTF.logError = function(msg) {
		if (console && console.logError) console.logError(msg)
		else glTF.log('ERROR '+msg);
	};

	glTF.document = function () {};

	glTF.document.prototype = {
		// this gets all referenced files (binary shaders, shader programs)
		parse_glTF: function(_callback){
			var cb = _callback;
			var document=this;
			// now find the buffers and load them
			var count= Object.keys(this.json.buffers).length;
			document.buffers={};
			for (var key in this.json.buffers) {
				var buffer = this.json.buffers[key];
				(function(xhr, key, buffer) {
					xhr.onreadystatechange = function (aEvt){
						if (xhr.readyState == 4) {
							if (xhr.status == 200 || xhr.status == 0) {
								if (xhr.response == null) 
									glTF.log("Error loading "+buffer.path+" [most likely a cross origin issue]");
								else 
									document.buffers[key]=xhr.response;
							}
							else {
								glTF.log("Error Loading "+buffer.path+" [http request status="+xhr.status+"]");
							}
							count --;

							if (count ===0)
								document.gotAllBuffers(cb);
						};
					}
					xhr.open("GET", document._path+buffer.path, true);
					xhr.responseType = "arraybuffer";
					xhr.send(null);
					
				})(new XMLHttpRequest(),key, buffer);

			}
		},
		gotAllBuffers: function(_callback){

			var cb = _callback;
			var document=this;
			// get default scene 
			this.sceneID = this.json.scene;

			this.meshes = {};
			this.geometries = [];
			this.shaders = {};

			// ok, now load all the shaders
			var shaders = this.json.shaders;
			var count= Object.keys(this.json.shaders).length;
			for (var key in shaders){
				var shader = this.json.shaders[key];
				
				(function(xhr,key,shader) { 
					xhr.onreadystatechange = function (aEvt){
						if (xhr.readyState == 4) {
							if (xhr.status == 200 || xhr.status == 0) {
								if (xhr.responseText == null) 
									glTF.log("Error loading "+shader.path+" [most likely a cross origin issue]");
								else 
									document.shaders[key]=xhr.responseText;
							}
							else {
								glTF.log("Error Loading "+shader.path+" [http request status="+xhr.status+"]");
							}
							count --;

							if (count ===0)
								document.gotShaderProgram(cb);
						};
					};
					xhr.open("GET", document._path+shader.path, true);
					//xhr.responseType = "arraybuffer"; // What should this be?
					xhr.send(null);
				})(new XMLHttpRequest(),key,shader);
			}
		},
		gotShaderProgram: function(_callback){

			// ok, now let's load the techniques
			var techniques = this.json.techniques;
			this.techniques = {};
			this.materials={};
            for (var techniqueID in techniques) {
                var technique_json = techniques[techniqueID];
                var technique = {};
                technique.passes={};
                for (var passID in technique_json.passes) {
                	var pass_json = technique_json.passes[passID];
                	var pass={};
                	var instance_program = pass_json.instanceProgram;
                	pass.vertexShader = this.shaders[this.json.programs[instance_program.program].vertexShader];
  					pass.fragmentShader = this.shaders[this.json.programs[instance_program.program].fragmentShader];
  					if (!pass.vertexShader)
  						glTF.logError('Could not find vertex shader = '+pass_json.program["VERTEX_SHADER"]);
  					if (!pass.fragmentShader)
  						glTF.logError('Could not find fragment shader = '+pass_json.program["FRAGMENT_SHADER"]);

  					pass.attributes = [];
  					for (var symbol in instance_program.attributes) {
  						var paramID = instance_program.attributes[symbol];
  						var attribute = {};
  						/*
  						        "semantic": "NORMAL",
                                "symbol": "a_normal",
                                "type": "FLOAT_VEC3"
                         */
                         attribute.semantic = technique_json.parameters[paramID].semantic; // this correspond to the mesh attribute
                         attribute.symbol = symbol; // this correspond the symbol in the program
                         attribute.type = technique_json.parameters[paramID].type; // this is the type of one element of the attribute
                         pass.attributes.push(attribute);
  					}

  					pass.uniforms = [];
  					for (var symbol in instance_program.uniforms) {
  						var uniforID = instance_program.uniforms[symbol]

  						var uniform = {};
  						/*
  						        "semantic": "WORLDVIEWINVERSETRANSPOSE",
                                "symbol": "u_normalMatrix",
                                "type": "FLOAT_MAT3"
							OR !!
                              NO SEMANTIC
                                "symbol": "u_diffuseTexture",
                                "type": "SAMPLER_2D"
                         */
                         uniform.semantic = technique_json.parameters[uniforID].semantic || uniforID; // this correspond to the engine parameter
                         uniform.symbol = symbol; // this correspond the symbol in the program
                         uniform.type = technique_json.parameters[uniforID].type;; // this is the type of the uniform

                         pass.uniforms.push(uniform);
  					}

  					var states = {};
  					for (var stateID in pass_json.states) {
				      var arg_json = pass_json.states[stateID];
				      var arg;
				      if (typeof arg_json !== 'object')
				      	arg = arg_json;
				      else {
				      	// convert object into an array
				      	arg=[];
				      	switch (stateID) {
				      		case 'blendEquationSeparate':
				      			arg.push(arg_json.rgb);
				      			arg.push(arg_json.alpha);
				      			break;
				      		case 'blendFunc':
				      			arg.push(arg_json.sfactor);
				      			arg.push(arg_json.dfactor);
				      			break;
				      		case 'blendFuncSeparate':
				      			arg.push(arg_json.srcRGB);
				      			arg.push(arg_json.srcAlpha);
				      			arg.push(arg_json.dstRGB);
				      			arg.push(arg.json.dstAlpha);
				      			break;
				      		case 'colorMask':
				      			arg.push(arg_json.red);
				      			arg.push(arg_json.green);
				      			arg.push(arg_json.blue);
				      			arg.push(arg_json.alpha);
				      			break;
				      		case 'depthRange':
				      			arg.push(arg_json.zNear);
				      			arg.push(arg_json.zFar);
				      			break;
				      		case 'polygonOffset':
				      			arg.push(arg_json.factor);
				      			arg.push(arg_json.units);
				      			break;
				      		case 'sampleCoverage':
				      			arg.push(arg_json.value);
				      			arg.push(arg_json.invert);
				      			break;
				      		case 'scissor':
				      			arg.push(arg_json.x);
				      			arg.push(arg_json.y);
				      			arg.push(arg_json.width);
				      			arg.push(arg_json.height);
				      			break;
				      		case 'stencilFunc':
				      			arg.push(arg_json.func);
				      			arg.push(arg_json.ref);
				      			arg.push(arg_json.mask);
				      			break;
				      		case 'stencilFuncSeparate':
				      			arg.push(arg_json.front);
				      			arg.push(arg_json.back);
				      			arg.push(arg_json.ref);
				      			arg.push(arg_json.mask);
				      			break;
				      		case 'stencilOp':
				      			arg.push(arg_json.fail);
				      			arg.push(arg_json.zfail);
				      			arg.push(arg_json.pass);
				      			break;
				      		case 'stencilOpSeparate':
				      			arg.push(arg_json.face);
				      			arg.push(arg_json.fail);
				      			arg.push(arg_json.zfail);
				      			arg.push(arg_json.zpass);
				      			break;
				      		default:
				      			glTF.logError('Error - could not read state '+stateID);
				      			break;
				      		}
				      }
				      states[stateID] = arg;
				    } // end for states
				    pass.states = states;
				    technique.passes[passID]=pass;
                } // end for passes

                technique.defaultPass = technique.passes[technique_json.pass];
                this.techniques[techniqueID] = technique;
            }


			if (_callback)
				_callback(this);
			return this;
		},
		parse_camera: function(_cameraID){
			var _camera= this.json.cameras[_cameraID];
			camera = {};
            camera.aspect_ratio = _camera.aspect_ratio;
            camera.projection = _camera.projection;
            camera.yfov = _camera.yfov;
            camera.zfar = _camera.zfar;
            camera.znear = _camera.znear;

            return camera;
		},
		parse_node: function(_nodeID) {
			var node = this.json.nodes[_nodeID];
			var transform = {};
			transform.id = _nodeID; 
            if (node.name) transform.name = node.name;
            if (node.tags) transform.tags = node.tags; 

			for (var i=0, len=node.children.length; i<len; i++) {
				var childID=node.children[i];
				var childTransform = this.parse_node(childID);
				if (!transform.children) transform.children=[];
                transform.children.push(childTransform);
                childTransform.parent = transform;
			}
			var mat=mat4.create();
			if (node.matrix)  {
				mat4.copy(mat,node.matrix);
			}
			transform.mat4 = mat;

            if (node.camera) transform.camera = this.parse_camera(node.camera);

            // note - as discussed, geometry will be its own separate object in the future
            if (node.meshes) {
            	for (var i=0, l2=node.meshes.length; i<l2; i++) {
            		var meshID = node.meshes[i];
            		if (!transform.geometries) transform.geometries=[];
            		transform.geometries.push(this.instance_geometry(meshID));
            	}
            };

			if (!this.transforms) this.transforms=[];
			this.transforms.push(transform);

			return transform;

		},
		// this create a geometry (mesh,material) for the scene
		// as discussed for glTF spec
		instance_geometry: function(_meshID)
		{
			var geometry = {};
            geometry.mesh = this.meshes[_meshID];
        	if (!geometry.mesh) geometry.mesh=this.parse_geometry(_meshID);

        	// find all the materials
        	materials = [];
        	for (var i=0,len=geometry.mesh.length;i<len;i++){
        		var primitive = geometry.mesh[i];
        		var mat = primitive.material;
        		materials.push(this.parse_material(mat));
        	}
            geometry.materials = materials;

            this.geometries.push(geometry);
            return geometry;




		},
		parse_material: function(_matID) {
			if (this.materials[_matID]) return this.materials[_matID];

			var material_json = this.json.materials[_matID];
			var techniqueID = material_json.instanceTechnique.technique;

			var technique_json = this.json.techniques[techniqueID];
			var document = this;
			
     
                var overrides = {};
                var parameters_json = technique_json.parameters;
                
                for (var i=0; i< material_json.instanceTechnique.values.length; i++) {

                	var value = material_json.instanceTechnique.values[i];
                    
                    var parameterID = value.parameter;
                	// check if this is a texture or a value
                	// create an override as propose for glTF spec
                	// { semantic, value }
                	// type has to match type in technique
                	// value is either a float or array or typearray
                	if (technique_json.parameters[parameterID]) {
                		overrides[parameterID] = {};
	                	overrides[parameterID].type = technique_json.parameters[parameterID].type;
	                	if (overrides[parameterID].type  !== "SAMPLER_2D")
	                		overrides[parameterID].value=value.value;
	                	else {
				            // kick off image loading
				            if (!document.images) document.images={};

				            var textureID = value.value;
	                        var imageID = this.json.textures[textureID].source;
			                var imagePath = this.json.images[imageID].path;
	                        var samplerID = this.json.textures[textureID].sampler;
	                        var sampler = this.json.samplers[samplerID];
	                        
			                var uri = document._path+imagePath;
			                if (!document.images[imageID]) {
				                document.images[imageID] = new Image();
				                if (this.onload) this.images[imageID].onload = this.onload;
				                document.images[imageID].src = uri;
				            }
				            overrides[parameterID].value={ 
	                            "path": imagePath,
	                            "image": document.images[imageID],
	                            "magFilter": (sampler.magFilter ? sampler.magFilter : "LINEAR"),
	                            "minFilter": (sampler.minFilter ? sampler.minFilter : "LINEAR_MIPMAP_LINEAR"),
	                            "wrapS": (sampler.wrapS ? sampler.wrapS : 'REPEAT'),
	                            "wrapT": (sampler.wrapT ? sampler.wrapT : 'REPEAT')
	                        };
	                    }
                	}
                	
            }
            var material = { pass: this.techniques[techniqueID].defaultPass, overrides: overrides, id: _matID};
            //if (!this.materials) this.materials={};
            this.materials[_matID] = material;
            return material;
		},
		parse_visual_scene: function(_sceneID)
		{

			var roots = this.json.scenes[_sceneID].nodes;
			var scene = [];
			for (i=0; i< roots.length; i++)
				scene.push(this.parse_node(roots[i]));
			return scene;
		} ,
		// parse the mesh id="_mesh"
		parse_geometry: function(_meshID) {

			var json_mesh = this.json.meshes[_meshID];
			var triangles=[];

			var prim, attr, bufferview, buffer, count, size, byteStride, offset;

			triangles.bounds = aabb.create();

			for (var primID in json_mesh.primitives){
				var mesh={};
			    prim = json_mesh.primitives[primID];
			    // get indices
			    attr = this.json.indices[prim.indices];
			    bufferview = this.json.bufferViews[attr.bufferView];
			    buffer = this.buffers[bufferview.buffer];
			    count = attr.count;
			    offset = attr.byteOffset+bufferview.byteOffset;
			    byteStride = attr.byteStride;

			    switch (attr.type){
			    	case 'UNSIGNED_SHORT':
			   			mesh.INDEX = new Int16Array(buffer,offset,count);
			    		break;
			    	default:
			    		glTF.log('indices '+attr.type+' is not allowed');
			    }

			    for (var semantic in prim.semantics) {
			    	attr = this.json.attributes[prim.semantics[semantic]];
			    	bufferview = this.json.bufferViews[attr.bufferView];
			    	buffer = this.buffers[bufferview.buffer];
			    	count = attr.count;
			    	byteStride = attr.byteStride;

			    	offset = attr.byteOffset+this.json.bufferViews[attr.bufferView].byteOffset;
			    	switch (attr.type) {
			    		case 'FLOAT_VEC3':
			    			mesh[semantic] = new Float32Array(buffer,offset,count*3);
			    			break;
			    		case 'FLOAT_VEC2':
			    			mesh[semantic] = new Float32Array(buffer,offset,count*2);
			    			break;
			    		default:
			    			glTF.log('attribute '+attr.type+' is not allowed');
			    	}
			    	// get bounding box
			    	if (semantic === "POSITION"){
			    		var lbound = aabb.fromMinMax(attr.min, attr.max);
			    		aabb.add(triangles.bounds,triangles.bounds,lbound);
			    	}
			    }
			    // one material per primitive.
			    mesh.material = prim.material;
			    triangles.push(mesh);
			}
			this.meshes[_meshID] = triangles;
			return triangles;
		}
	};

	glTF.load = function(url, callback) {
		var document = new glTF.document();
		var cb=callback;

		document.url = url;
		document.baseURI = url.substring(0,url.lastIndexOf('/'));

		var lastslash = url.lastIndexOf('/');
		if (lastslash > 0)
		document._path = url.substring(0,lastslash+1);
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function (aEvt){
			
			if (xhr.readyState == 4) {
				if (xhr.status == 200 || xhr.status == 0) {
					if (xhr.responseText == null) {
						if (xhr.response == null) {
							glTF.log("Error loading "+document.url+" [most likely a cross origin issue]")
						} else
						{
							glTF.log("Error loading "+document.url+" [most likely not a glTF json document]")
						}
					} else {
						document.json=JSON.parse(xhr.responseText);
						document.parse_glTF(cb);
					}
				}
				else {
					glTF.log("Error Loading "+document.url+" [http request status="+xhr.status+"]");
				}
			}
		};

		xhr.open("GET", url, true);

	    xhr.send(null);
	    return document;
	};
	
}).call(this);