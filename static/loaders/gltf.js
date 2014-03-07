/*
gltf.js -  a simple glTF loader   

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

 gltf.js needs gl-matrix.js gl-matrix-ext.js and glproperties.js
*/

(function(_global) {
  "use strict";

  var shim = {};
  if (typeof(exports) === 'undefined') {
    if(typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
      shim.exports = {};
      define(function() {
        return shim.exports;
      });
    } else {
      // gl-matrix lives in a browser, define its namespaces in global
      shim.exports = typeof(window) !== 'undefined' ? window : _global;
    }
  }
  else {
    // gl-matrix lives in commonjs, define its namespaces in exports
    shim.exports = exports;
  }

  (function(exports) {
  	var glTF={};

  	glTF.glProperties={};
     for (var property in WebGLRenderingContext)
       glTF.glProperties[WebGLRenderingContext[property]] = property;

	glTF.log = function(msg){
		if (console && console.log) console.log(msg);
	};

	glTF.logError = function(msg) {
		if (console && console.logError) console.logError(msg)
		else if (console && console.error) console.error(msg)
		else glTF.log('ERROR '+msg);
	};

	glTF.document = function () {};

	glTF.document.prototype = {
		// this gets all referenced files (binary shaders, shader programs)
		parse_glTF: function(_callback){
			var document=this;
			document.callback = _callback;
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
								document.gotAllBuffers();
						};
					}
					xhr.open("GET", document._path+buffer.path, true);
					xhr.responseType = "arraybuffer";
					xhr.send(null);
					
				})(new XMLHttpRequest(),key, buffer);

			}
		},
		gotAllBuffers: function(){

			var document=this;
			// get default scene 
			this.sceneID = this.json.scene;

			// per object type dictionaries
			this.meshes = {};
			this.geometries = {};
			this.lights = {};
			this.cameras = {};
			this.shaders = {};
			this.transforms = {};
			this.images = {};
			this.materials = {};

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
									document.shaders[key]={};
								    document.shaders[key].str=xhr.responseText;
							}
							else {
								glTF.log("Error Loading "+shader.path+" [http request status="+xhr.status+"]");
							}
							count --;

							if (count ===0)
								document.gotAllShaderPrograms();
						};
					};
					xhr.open("GET", document._path+shader.path, true);
					//xhr.responseType = "arraybuffer"; // What should this be?
					xhr.send(null);
				})(new XMLHttpRequest(),key,shader);
			}
		},
		getItemSize: function(_type) {
			switch(_type) {
				case WebGLRenderingContext.FLOAT_VEC2:
					return 2;
				case WebGLRenderingContext.FLOAT_VEC3:
					return 3;
				case WebGLRenderingContext.FLOAT_VEC4:
					return 4;
				default:
					glTF.logError('unkown type=\"'+_type+'['+glTF.glProperties[_type]+']\"');
			}
		},
		gotAllShaderPrograms: function(){

			// copy the programs
			// Note: a shader is either a vertex or a fragment shader
            // spec should be changed so shader type is in 'shaders'
            // also, spec should be changed so shader could be embedded as string
			this.programs = {};
			var _programs = this.json.programs;
			for (var programID in _programs){
				this.programs[programID]={};
				var vertexShaderID = _programs[programID].vertexShader;
				var vertexShader = this.shaders[vertexShaderID];
				var fragmentShaderID = _programs[programID].fragmentShader;
				var fragmentShader = this.shaders[fragmentShaderID];
				this.programs[programID].vertexShader = this.shaders[vertexShaderID];
				this.programs[programID].fragmentShader = this.shaders[fragmentShaderID];

				if (!this.programs[programID].vertexShader) {
					glTF.logError('Could not find vertex shader = '+_programs[programID].vertexShader);
					return;
				}
				if (!this.programs[programID].fragmentShader) {
					glTF.logError('Could not find fragment shader = '+_programs[programID].fragmentShader);
					return;
				}
					
				this.shaders[vertexShaderID].type='vertex';
				this.shaders[fragmentShaderID].type='fragment';
			}

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

                	pass.program = this.programs[pass_json.instanceProgram.program];
               
  					pass.program.attributes = {};
  					for (var symbol in instance_program.attributes) {
  						var _parameters = technique_json.parameters[instance_program.attributes[symbol]];
  						var attribute = {};
  						/*
  						        "semantic": "NORMAL",
                                "type": "FLOAT_VEC3"
                         */
                         attribute.semantic = _parameters.semantic; // this correspond to the mesh attribute
                         attribute.symbol = symbol; // this correspond the symbol in the program
                         attribute.type = _parameters.type; // this is the type of one element of the attribute
                         attribute.itemSize = this.getItemSize(attribute.type);
                         pass.program.attributes[attribute.semantic]=(attribute);
  					}

  					pass.program.uniforms = {};
  					for (var symbol in instance_program.uniforms) {

  						var uniform = {};
  						var _parameters = technique_json.parameters[instance_program.uniforms[symbol]]
  						/*
  						        "semantic": "WORLDVIEWINVERSETRANSPOSE",
                                "type": "FLOAT_MAT3"
							OR 
                                "type": "SAMPLER_2D"
                            OR 
                    			"source": "Lamp",
                    			"type": "FLOAT_MAT4"
                    		OR
                    			"value":
                    			"type"
                         */
                         uniform.semantic = _parameters.semantic ||  instance_program.uniforms[symbol];// this correspond to the engine internal parameters
                         uniform.symbol = symbol; // this is the symbol in the program
                         uniform.type = _parameters.type; // this is the type of the uniform
                         if (_parameters.source) uniform.source = _parameters.source; // this points to another object in the scene
                         if (_parameters.value) uniform.value = this.cloneValue(_parameters.value,_parameters.type); // this provides a default value
                         pass.program.uniforms[uniform.semantic]=(uniform);
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


			if (this.callback) this.callback(this);
			return this;
		},
		parse_camera: function(_cameraID){
			var _camera= this.json.cameras[_cameraID];
			var camera = {};
			if (!_camera.aspect_ratio)
				_camera=_camera[_camera.type];
            camera.aspect_ratio = _camera.aspect_ratio;
            camera.projection = _camera.projection;
            if (_camera.xfov) {
            	camera.xfov = _camera.xfov;
            	camera.yfov = camera.xfov*camera.aspect_ratio;
            } else {
            	camera.yfov = _camera.yfov;
            	camera.xfov = camera.yfov/camera.aspect_ratio;
            }
            camera.zfar = _camera.zfar;
            camera.znear = _camera.znear;

            this.cameras[_cameraID]=(camera);
            return camera;
		}, // only load point lights for now
		parse_light: function(_lightID){
			var _light = this.json.lights[_lightID];
			var light = {};
			light.id = _lightID;
			if (_light.point){
				light.type = "point";
				light.color = _light.point.color.slice(0); // clone array
				light.constantAttenuation = _light.point.constantAttenuation;
				light.linearAttenuation = _light.point.linearAttenuation;
				light.quadraticAttenuation = _light.point.quadraticAttenuation;
			}

			this.lights[_lightID]=(light);
			return light;
		},
		parse_node: function(_nodeID, _transform) {
			var _node = this.json.nodes[_nodeID];
			var transform = {};
			transform.id = _nodeID; 
			var bb = undefined; 
            if (_node.name) transform.name = _node.name;
            if (_node.tags) transform.tags = _node.tags; 

            transform.local=mat4.create();
			if (_node.matrix) 
				mat4.copy(transform.local,_node.matrix);

            transform.global=mat4.create();
            mat4.multiply(transform.global,transform.global,transform.local);


            if (_node.children && _node.children.length>0) {
            	transform.children=[];
				for (var i=0, len=_node.children.length; i<len; i++) {
					var childTransform = this.parse_node(_node.children[i],transform.global);
					if (childTransform.bounds){
						if (!bb) bb=aabb.create();
					 	aabb.add(bb, bb,childTransform.bounds);
					 }
	                transform.children.push(childTransform);
	                childTransform.parent = transform;
	            }
			}

            if (_node.camera) {
            	var camera = this.parse_camera(_node.camera);
            	camera.transform = transform;
            	transform.camera = camera;

            }

            if (_node.light ) {
            	var light = this.parse_light(_node.light);
            	light.transform = transform;
            	transform.light=light;
            }
            // note - as discussed, geometry will be its own separate object in the future
            if (_node.meshes && _node.meshes.length>0) {
            	transform.geometries=[];
            	if (!bb) bb=aabb.create();
            	for (var i=0, len=_node.meshes.length; i<len; i++) {
            		var geo = this.instance_geometry(_node.meshes[i]);
            		geo.transform = transform;
            		transform.geometries.push(geo);
            		aabb.add(bb,bb,geo.bounds);
            	}
            };
            if (bb) transform.bounds=bb;
			this.transforms[_nodeID]=(transform);

			return transform;

		},
		// this create a geometry (mesh,material) for the scene
		// as discussed for glTF spec
		instance_geometry: function(_meshID)
		{
			var geometry = {};
            geometry.meshes = this.meshes[_meshID];
            geometry.bounds = aabb.create();
        	if (!geometry.meshes) geometry.meshes=this.parse_geometry(_meshID);

        	// find all the materials
        	// and geometry bounds
        	var json_mesh = this.json.meshes[_meshID];

        	var materials = [];
        	for (var i=0; i<geometry.meshes.length;i++){
        		var primitive = geometry.meshes[i];
        		var mat = json_mesh.primitives[i].material;
        		materials.push(this.parse_material(mat));
        		aabb.add(geometry.bounds, geometry.bounds, geometry.meshes.bounds);
        	}
            geometry.materials = materials;

            this.geometries[_meshID]=(geometry);
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
                
                for (var parameterID in material_json.instanceTechnique.values) {
                	var value = material_json.instanceTechnique.values[parameterID];
                    
                  
                	// check if this is a texture or a value
                	// create an override as propose for glTF spec
                	// { semantic, value }
                	// type has to match type in technique
                	// value is either a float or array or typearray
                	if (technique_json.parameters[parameterID]) 
                		overrides[parameterID] = this.cloneValue(value,technique_json.parameters[parameterID].type);	
                	else
                	  glTF.log("Error loading "+document.url+" expected technique parameter="+parameterID)
                	
            }
            var material = { pass: this.techniques[techniqueID].defaultPass, overrides: overrides, id: _matID};

            this.materials[_matID] = material;
            return material;
		},
		cloneValue: function(_value,_type)
		{
			var document = this;
			if (!_value) {
				return undefined;
			}else if (!isNaN(_value)) {
        		// this is a number
        		return _value;
        	}else if (_type  === WebGLRenderingContext.SAMPLER_2D) {
	            // kick off image loading

	            var textureID = _value;
                var imageID = this.json.textures[textureID].source;
                var imagePath = this.json.images[imageID].path;
                var samplerID = this.json.textures[textureID].sampler;
                var sampler = this.json.samplers[samplerID];
                
                var uri = this._path+imagePath;
                if (!this.images[imageID]) {
	                this.images[imageID] = new Image();
	                if (this.onload) this.images[imageID].onload = this.onload;
	                this.images[imageID].onerror = function () {
                        glTF.logError('Could not load "'+imagePath+'"');
                    }
	                this.images[imageID].src = uri;
	            }
	            return { 
                    "path": imagePath,
                    "image": this.images[imageID],
                    "magFilter": (sampler.magFilter ? sampler.magFilter : WebGLRenderingContext.LINEAR),
                    "minFilter": (sampler.minFilter ? sampler.minFilter : WebGLRenderingContext.LINEAR_MIPMAP_LINEAR),
                    "wrapS": (sampler.wrapS ? sampler.wrapS : WebGLRenderingContext.REPEAT),
                    "wrapT": (sampler.wrapT ? sampler.wrapT : WebGLRenderingContext.REPEAT)
                };
            } else {
            	// this must be an array, clone it
            	return _value.slice(0);
            }
		},
		parse_visual_scene: function(_sceneID)
		{
			var roots = this.json.scenes[_sceneID].nodes;
			// scene is an array so we keep nodes in order
			var scene = [];
			var bb=aabb.create();
			var identity=mat4.create();
			for (var i=0; i< roots.length; i++){
				var node = this.parse_node(roots[i],identity);
				scene.push(node);
				if (node.bounds) aabb.add(bb,bb,node.bounds);
			}
			this.bounds=bb; // do not add bounds to scene, incase there is a node called bounds
			this.scene=scene;
			this.upAxis = vec3.fromValues(0,1,0); // gltf is always Y_up
			return scene;
		} ,
		// parse the mesh id="_mesh"
		parse_geometry: function(_meshID) {

			var json_mesh = this.json.meshes[_meshID];
			var triangles=[];

			var prim, attr, bufferview, buffer, count, size, byteStride, offset;

			triangles.bounds = aabb.create();

			for (var i=0; i< json_mesh.primitives.length; i++){
				var mesh={};
			    prim = json_mesh.primitives[i];
			    // get indices
			    attr = this.json.accessors[prim.indices];
			    bufferview = this.json.bufferViews[attr.bufferView];
			    buffer = this.buffers[bufferview.buffer];
			    count = attr.count;
			    offset = attr.byteOffset+bufferview.byteOffset;
			    byteStride = attr.byteStride;

			    switch (attr.type){
			    	case WebGLRenderingContext.UNSIGNED_SHORT:
			   			mesh.INDEX = new Int16Array(buffer,offset,count);
			    		break;
			    	default:
			    		glTF.log('indices '+attr.type+'['+glTF.glProperties[attr.type]+'] is not allowed');
			    }

			    for (var semantic in prim.attributes) {
			    	attr = this.json.accessors[prim.attributes[semantic]];
			    	bufferview = this.json.bufferViews[attr.bufferView];
			    	buffer = this.buffers[bufferview.buffer];
			    	count = attr.count;
			    	byteStride = attr.byteStride;

			    	offset = attr.byteOffset+this.json.bufferViews[attr.bufferView].byteOffset;
			    	switch (attr.type) {
			    		case WebGLRenderingContext.FLOAT_VEC3:
			    			mesh[semantic] = new Float32Array(buffer,offset,count*3);
			    			break;
			    		case WebGLRenderingContext.FLOAT_VEC2:
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

			    triangles.push(mesh);
			}
			this.meshes[_meshID] = triangles;
			return triangles;
		}
	};

	glTF.load = function(_url, _callback) {
		var document = new glTF.document();
		var cb = _callback;

		document.url = _url;
		document.baseURI = _url.substring(0,_url.lastIndexOf('/'));

		var lastslash = _url.lastIndexOf('/');

		document._path = _url.substring(0,lastslash+1);
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

		xhr.open("GET", _url, true);

	    xhr.send(null);
	    return document;
	};
	
	if(typeof(exports) !== 'undefined') {
	    exports.glTF = glTF;
	};



  })(shim.exports);
})(this);

