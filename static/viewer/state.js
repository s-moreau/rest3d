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

(function(_global) {
  //"use strict"; - safari has issues

  var shim = {};
  if (typeof(exports) === 'undefined') {
    if(typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
      shim.exports = {};
      define(function() {
        return shim.exports;
      });
    } else {
      shim.exports = typeof(window) !== 'undefined' ? window : _global;
    }
  }
  else {
    shim.exports = exports;
  }

  (function(exports) {
    var State = {};

    State.create = function(_gl) {
      
      var state={}; 
      state.ID = State.states.length;
      State.states.push(state);
      State.glTexture={};

      // if _gl then this is an immediate State
      if (_gl) {
        state.gl=_gl; 
        // allocate shared uniforms
        // MODEL - mat4 or mat3 - Transforms from model to world coordinates using the transform's node and all of its parents.
        // VIEW - mat4 or mat3 - Transforms from world to view coordinates using the active camera node.
        // PROJECTION - mat4 or mat3 - Transforms from view to clip coordinates using the active camera node.
        // MODELVIEW - mat4 or mat3 - Combined MODEL and VIEW.
        // MODELVIEWPROJECTION - mat4 or mat3 - Combined MODEL, VIEW, and PROJECTION.
        
        //Inverses
        
        // MODELINVERSE - mat4 or mat3 - Inverse of MODEL.
        // VIEWINVERSE - mat4 or mat3 - Inverse of VIEW.
        // ROJECTIONINVERSE - mat4 or mat3 - Inverse of PROJECTION.
        // MODELVIEWINVERSE - mat4 or mat3 - Inverse of MODELVIEW.
        // MODELVIEWPROJECTIONINVERSE - mat4 or mat3 - Inverse of MODELVIEWPROJECTION.
        
        //Inverse transposes
        
        // MODELINVERSETRANSPOSE - mat3 or mat2 - The inverse-transpose of MODEL without the translation. This translates normals in model coordinates to world coordinates.
        // MODELVIEWINVERSETRANSPOSE - mat3 or mat2 - The inverse-transpose of MODELVIEW without the translation. This translates normals in model coordinates to eye coordinates.

        // shared between ALL channels/states
        State.Uniforms = {
          MODEL: mat4.create(),
          MODELINVERSE: mat4.create(),

          VIEW: mat4.create(),
          VIEWINVERSE: mat4.create(),

          PROJECTION: mat4.create(),
          PROJECTIONINVERSE: mat4.create(),

          MODELVIEW: mat4.create(),
          MODELVIEWINVERSE: mat4.create(),

          MODELVIEWPROJECTION: mat4.create(),
          MODELVIEWPROJECTIONINVERSE: mat4.create(),

          MODELINVERSETRANSPOSE: mat3.create(),
          MODELVIEWINVERSETRANSPOSE: mat3.create(), // NORMAL

        };


        // utilities

        State.createSolidTexture = function (r, g, b, a) {
          var data = new Uint8Array([r, g, b, a]);
          var texture = _gl.createTexture();
          _gl.bindTexture(_gl.TEXTURE_2D, texture);
          _gl.texImage2D(_gl.TEXTURE_2D, 0, _gl.RGBA, 1, 1, 0, _gl.RGBA, _gl.UNSIGNED_BYTE, data);
          _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, _gl.NEAREST);
          _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, _gl.NEAREST);
          return texture;
        };

        State.whiteTexture = State.createSolidTexture(255,255,255,255);


        // default state values - set value AND apply since this is immediate context

        State.setViewport(state, 0, 0, _gl.canvas.width, _gl.canvas.height);

        State.setBlendEnable(state,false);     

        State.setBlendEquation(state,State.FUNC_ADD); 

        State.setBlendEquationSeparate(state,State.FUNC_ADD, State.FUNC_ADD); 

        State.setBlendFunc(state,State.ONE, State.ZERO);

        State.setBlendFuncSeparate(state,State.ONE, State.ONE, State.ZERO, State.ZERO);

        State.setColorMask(state,true,true,true,true);

        State.setClearColor(state,0,0,0,0); // transparent, will show whatever is in the canvas

        State.setClear(State.COLOR_BUFFER_BIT | State.DEPTH_BUFFER_BIT | State.STENCIL_BUFFER_BIT);

        State.setCullFace(state,State.BACK);

        State.setCullFaceEnable(state,true); // note gltf says default is false?

        State.setDepthFunc(state,State.LESS);

        State.setDepthClear(state,1);

        State.setDepthMask(state,true);

        State.setDepthRange(state,0., 1.);

        State.setDepthTestEnable(state,true);

        State.setFrontFace(state,State.CCW);

        State.setLineWidth(state,1.);

        State.setPolygonOffset(state,0.,0.);

        State.setPolygonOffsetFillEnable(state,true);

        State.setSampleAlphaToCoverageEnable(state,false);

        State.setSampleCoverage(state,1.,false);

        State.setSampleCoverageEnable(state,false);

        State.setScissor(state,0.,0.,0.,0.);

        State.setScissorTestEnable(state,false);

        State.setStencilFunc(state,State.ALWAYS,0,0); 

        State.setStencilFuncSeparate(state,State.FRONT, State.ALWAYS, 0, 0);

        State.setStencilMask(state,0);

        State.setStencilOp(state,State.KEEP, State.KEEP, State.KEEP) ;

        State.setStencilOpSeparate(state,State.FRONT_AND_BACK, State.KEEP, State.KEEP, State.KEEP);

        State.setStencilTestEnable(state,false);

        // create default states

        State.pickState = State.clone(pickState);
        State.basicState = State.clone(basicState);

      };

      return state;
    };
    
  // TODO - pass Override into allocateUniforms
  State.fromPassAndOverrides = function(_pass,_overrides) {
   
    var state={}; 
    state.ID = State.states.length;
    State.states.push(state);

    state.program = {};

    state.program.vertexShader = _pass.program.vertexShader.str;
    state.program.fragmentShader = _pass.program.fragmentShader.str;

    state.program.compileMe = true;
    state.program.glProgram = null;


    // allocate values from default values in program
    allocateUniformsAndAttributes(state,_pass.program.uniforms, _pass.program.attributes, _overrides);

    // now take care of the gl states
    for (var key in _pass.states) {
      var fn = State.fn[key];
      var arg = _pass.states[key];
      if (arg[0] === undefined)
        State.fn[key](state,arg);
      else if (typeof arg === 'string')
        State.fn[key](state,State[arg]);
      else {
        var args=[state];
        for (var i=0; i<arg.length;i++) {
          if (typeof arg[i] ==='string') {
            var value = State[arg[i]];
            if (value === undefined) 
              RENDERER.logError("unknown parameter "+arg[i]+' in State.fromPass');

            args.push(State[arg[i]]); // convert string to enum value
          }
          else
            args.push(arg[i]);
        }
        // call with array as arguments. 'this' is undefined
        State.fn[key].apply(undefined,args);
      }
    }

    return state;
  };


  // this creates the program uniforms and attributes, as well as state specific values
  // _uniforms and _attributes can be sent as an array or an object
  // this will take the value from the program, and create state values
  var allocateUniformsAndAttributes = function(_state,_uniforms, _attributes, _overrides) {
    var textureUnit=0;
    _state.program.uniforms={};
    _state.values = {};
    if (!_overrides) _overrides={};

    // UNIFORMS

    for (var semantic in _uniforms){
      var uniform = _uniforms[semantic];
      var type = uniform.type; 
      var value = State.Uniforms[semantic] || _overrides[semantic] || uniform.value; 
      var newvalue=null;

      _state.program.uniforms[semantic] = {};

      // otherwise, allocate it for this state
      switch (type) {
        case WebGLRenderingContext.FLOAT:
          if (!value) _state.values[semantic] = 0; else _state.values[semantic] = value;
          break;
        case WebGLRenderingContext.FLOAT_VEC2:
          if (!value) _state.values[semantic]=vec2.create(); else _state.values[semantic]=value;
          break;
        case WebGLRenderingContext.FLOAT_VEC3:
          if (!value) _state.values[semantic]=vec3.create(); else _state.values[semantic]=value;
          break;
        case WebGLRenderingContext.FLOAT_VEC4:
          if (!value) _state.values[semantic]=vec4.create(); else _state.values[semantic]=value;
          break;
        case WebGLRenderingContext.INT_VEC4:
          if (!value) _state.values[semantic]=[0,0,0,0]; else _state.values[semantic]=value;
          break;
        case WebGLRenderingContext.FLOAT_MAT3:
          if (!value) _state.values[semantic]=mat3.create(); else _state.values[semantic]=value;
          break;
        case WebGLRenderingContext.FLOAT_MAT4:
          if (!value) _state.values[semantic]=mat4.create(); else _state.values[semantic]=value;
          break;
        case WebGLRenderingContext.SAMPLER_2D:

          if (value && value.textureUnit) {
            newvalue={};
            newvalue.textureUnit = value.textureUnit;
            if (value.flipY) newvalue.flipY = value.flipY; else newvalue.flipY=false;
          } else {
            newvalue={};
            newvalue.textureUnit = textureUnit++;
            newvalue.flipY = false;
          }
          _state.values[semantic] = value;
          break;
        default:
          RENDERER.logError('unknown type '+type+' in State.fromPass')
          break;
      }

      // allocate program uniforms
      _state.program.uniforms[semantic] = {
        symbol: uniform.symbol,
        type: type,
        value: newvalue 
      }
    }


    // ATTRIBUTES
    _state.program.attributes={};

    /*
    for (var key in attributes) {
      var attribute = attributes[key];
      var semantic = attribute.semantic; // e.g. "NORMAL"       "TEXCOORD_0"     "POSITION"
      var symbol = attribute.symbol; // e.g.     "a_normal"     "a_texcoord0"    "a_position"
      var type = attribute.type; // e.g.         "FLOAT_VEC3"   "FLOAT_VEC2"     "FLOAT_VEC3"
    }
    */

    for (var semantic in _attributes) {
      var attribute = _attributes[semantic];
      var value = attribute.value; 
      var type = attribute.type;

      if (value)
        _state.values[semantic] = value;
  
      // allocate program attributes
      _state.program.attributes[semantic] = {
        semantic: semantic,
        symbol: attribute.symbol,
        type: type
      }
    }
  };
   
  State.clone = function(_state) {
    var state={}; 
    state.ID = State.states.length;
    State.states.push(state);

    state.program = {};
     // consider those read-only for now
    state.program.vertexShader = _state.program.vertexShader;
    state.program.fragmentShader = _state.program.fragmentShader;
    state.program.compileMe = true;

    // allocate values from default values in program
    allocateUniformsAndAttributes(state, _state.program.uniforms, _state.program.attributes);

    // copy state overrides
    for (var key in _state.values) {
      var attribute=_state.program.uniforms[key] || _state.program.attributes[key];
      if (attribute) {
        var value=_state.values[key];
        var type = attribute.type;
        if (value)
          switch (type){
            case WebGLRenderingContext.FLOAT_VEC2:
               vec2.copy(state.values[key], value);
              break;
            case WebGLRenderingContext.FLOAT_VEC3:
               vec3.copy(state.values[key],value);
              break;
            case WebGLRenderingContext.FLOAT_VEC4:
               vec4.copy(state.values[key], value);
              break;
            case WebGLRenderingContext.FLOAT_MAT4:
               mat4.copy(state.values[key],value);
              break;
            case WebGLRenderingContext.FLOAT_MAT3:
               mat3.copy(state.values[key], value);
              break;
              // TODO -> should this be a pointer instead?
            case WebGLRenderingContext.FLOAT:
              state.values[key] = value;
              break;
            case WebGLRenderingContext.SAMPLER_2D:
              for (var item in value) 
                state.values[key][item] = value[item];
            break;
          default:
            State.logError('unknown key type='+type+' in State.clone');
            return this;
            break;
          }
        } else
        State.log('cannot find attribute/uniform '+key+" in State.clone");
    }
    // copy states
    for (var key in _state) {
      var statelet=_state[key];
      if (key !== 'ID')
        if ((typeof statelet === 'number') || (typeof statelet === 'bool') || (statelet === undefined) || (statelet === null))
          state[key] = statelet;
    }
    return state;
  };
  // private function
  var createShader = function(_gl,_shaderType, _shaderCode) {

    var shader = _gl.createShader(_shaderType);
    if (shader == null) return null;
    _gl.shaderSource(shader, _shaderCode);
    _gl.compileShader(shader);
    if (!_gl.getShaderParameter(shader, _gl.COMPILE_STATUS)) {
        var error = _gl.getShaderInfoLog(shader);
        RENDERER.logError("Error compiling shader:\n" + error);
        print(_gl.getShaderInfoLog(shader));
        _gl.deleteShader(shader);
        return null;
    }
    return shader;
  };
  
  // return a new {compiled program}
  //   check if same program already exists
  //   othewise create new {program}
  var compileProgram = function(_gl, _state) {


    // search if that program already exists
    for (var i=0,len=State.programs.length;i<len;i++){
      var program = State.programs[i];
      if (program.vertexShader === _state.program.vertexShader && program.fragmentShader === _state.program.fragmentShader) {
        if (program.compileMe === true) {
          RENDERER.logError('this is impossible ... program should be compiled already')
        }
        _state.program = program;
        return program;
      }
    }

    if (!_gl) { RENDERER.logError("Compiling program failed without context"); return _state.program;};
    // note: do not delete the previous program as this is not the owner 
    // TODO - State:delete

    var glVertexShader = createShader(_gl,State.VERTEX_SHADER,_state.program.vertexShader); 
    var glFragmentShader = createShader(_gl,State.FRAGMENT_SHADER,_state.program.fragmentShader); 

    var glProgram = _gl.createProgram();
    if (glProgram == null) 
      RENDERER.logError("Creating program failed");

    _gl.attachShader(glProgram, glVertexShader);
    _gl.attachShader(glProgram, glFragmentShader);

    _gl.linkProgram(glProgram);


    if (!_gl.getProgramParameter(glProgram, State.LINK_STATUS) && !_gl.isContextLost()) {
        RENDERER.logError(_gl.getProgramInfoLog(glProgram));
    }

    // TODO -> do not allocate a new object, use _state.program instead
    //var program = {};

    _state.program.glProgram = glProgram;
    //program.vertexShader = _state.program.vertexShader;
    //program.fragmentShader = _state.program.fragmentShader;
    _state.program.compileMe = false;
    //program.uniforms = _state.program.uniforms;
    //program.attributes = _state.program.attributes;

    // make sure we are using slot '0', otherwise performance will suffer
    _gl.bindAttribLocation(glProgram, "POSITION", 0);
    for (var semantic in _state.program.attributes)
    {
      var attribute = _state.program.attributes[semantic];
      attribute.location = _gl.getAttribLocation(glProgram, attribute.symbol);
    }
      
    // find uniforms location, remove non active ones
    for (var uniformID in _state.program.uniforms)
    {
      var uniform = _state.program.uniforms[uniformID];
      uniform.location = _gl.getUniformLocation(glProgram, uniform.symbol);
      if (uniform.location)
      {
        if (uniform.type !==WebGLRenderingContext.SAMPLER_2D)
          uniform.value = _gl.getUniform(glProgram, uniform.location);
      } else {
        delete _state.program.uniforms[uniformID];
      }
    }

    // for context loss
    _state.program.ID = State.programs.length; 
    State.programs.push(_state.program);

    //_state.program = program;

    return _state.program;
  };

  // compare velue by address, and apply values if different
  // should be compare by value ?
  // or why copy values?
    State.setUniform=function(_gl, _state, _uniformID) {
      var uniform = _state.program.uniforms[_uniformID];
      var type = uniform.type;
      var value = _state.values[_uniformID];
      var apply = false;

      switch (type){
        case WebGLRenderingContext.FLOAT_VEC2:
          if (vec2.squaredDistance(uniform.value,value)>1e-12){
            vec2.copy(uniform.value, value);    
            apply=true; 
          }
          break;
        case WebGLRenderingContext.FLOAT_VEC3:
          if (vec3.squaredDistance(uniform.value,value)>1e-12){
            vec3.copy(uniform.value, value);
            apply=true;
          }
          break;
        case WebGLRenderingContext.FLOAT_VEC4:
          if (vec4.squaredDistance(uniform.value,value)>1e-12){
            vec4.copy(uniform.value, value);
            apply=true;
          }
          break;
        case WebGLRenderingContext.INT_VEC4:
          if (uniform.value[0]!=value[0] || uniform.value[1]!=value[1] || uniform.value[2]!=value[2] || uniform.value[3]!=value[3]) {
            uniform.value[0]=value[0]; uniform.value[1]=value[1]; uniform.value[2]=value[2]; uniform.value[3]=value[3];
            apply=true;
          }
        case WebGLRenderingContext.FLOAT_MAT4:
        if (mat4.squaredDistance(uniform.value,value)>1e-12){
            mat4.copy(uniform.value, value);
            apply=true;
          }
          break;
        case WebGLRenderingContext.FLOAT_MAT3:
         if (mat3.squaredDistance(uniform.value,value)>1e-12){
            mat3.copy(uniform.value, value);
            apply=true;
          }
          break;
          // TODO -> should this be a pointer instead?
        case WebGLRenderingContext.FLOAT:
          if ((uniform.value - value) * (uniform.value-value)>1e-12) {
            uniform.value = value;
            apply=true;
          }
          break;
        case WebGLRenderingContext.SAMPLER_2D:
        /*  value is this object:
            "image": document.images[parameter.image],
            "magFilter": parameter.magFilter,
            "minFilter": parameter.minFilter,
            "wrapS": parameter.wrapS,
            "wrapT": parameter.wrapT};
            "glTexture" : texture created from image
            "textureUnit" : which texture unit to use
            "flipY": do we need to flip Y 

            need to check if the active texture _uniform.value.textureUnit
            is pointing to the same glTexture

        */        


        // keep trying until image is ready
        if (value && value.glTexture === undefined) 
              createTextureBuffer(_gl,value);

        for (var key in value) 
          if (uniform.value[key] !== value[key]) {
            uniform.value[key] = value[key];
            apply = true; // same shader, but different texture
          }

        // also check if gl has same texture selected
        if (State.glTexture[uniform.value.textureUnit] != uniform.value.glTexture)
          apply=true;

        break;
      default:
        RENDERER.logError('unknown type='+type+' in State.setUniform');
        return this;
        break;
      }
      if (apply)
        applyUniform(_gl,uniform,value);
    };

    // Call WebGL and set uniform value
    // 
    var applyUniform=function(_gl,_uniform,_value){

      var type = _uniform.type;
      var location = _uniform.location;

      switch (type){
        case WebGLRenderingContext.FLOAT_VEC2:
          _gl.uniform2fv(_uniform.location, _value);
          break;

        case WebGLRenderingContext.FLOAT_VEC3:
          _gl.uniform3fv(_uniform.location, _value);
          break;

        case WebGLRenderingContext.FLOAT_VEC4:
          _gl.uniform4fv(_uniform.location, _value);
          break;

        case WebGLRenderingContext.INT_VEC4:
          _gl.uniform4iv(_uniform.location, _value);
          break;

        case WebGLRenderingContext.FLOAT_MAT4:
          _gl.uniformMatrix4fv(_uniform.location, false, _value); // false = do no transpose
          break;

        case WebGLRenderingContext.FLOAT_MAT3:
          _gl.uniformMatrix3fv(_uniform.location, false, _value); // false = do not transpose
          break;

        case WebGLRenderingContext.FLOAT:
          _gl.uniform1f(_uniform.location, _value);

          break;

        case WebGLRenderingContext.SAMPLER_2D:
            State.glTexture[_uniform.value.textureUnit] = _uniform.value.glTexture;
          if (_uniform.value.glTexture) {
            _gl.activeTexture(_gl.TEXTURE0 + _uniform.value.textureUnit);
            _gl.bindTexture(_gl.TEXTURE_2D, _uniform.value.glTexture); 
            _gl.uniform1i(_uniform.location, _uniform.value.textureUnit);

           } else {
            // texture is not ready, or there is no texture, let's use the default white texture
            _gl.activeTexture(_gl.TEXTURE0 + _uniform.value.textureUnit);
            _gl.bindTexture(_gl.TEXTURE_2D, State.whiteTexture); 
            _gl.uniform1i(_uniform.location, _uniform.value.textureUnit);
           }

        break;
      default:
        RENDERER.logError('unknown type='+type+' in State.applyUniform');
        break;
      }
      
    };
    var createTextureBuffer = function(_gl, _value) {

        if (_value.glTexture === undefined) {
         var textureID = _value.path + (_value.flipY ? 'F' : 'f');
          if (State.textures[textureID])
            _value.glTexture = State.textures[textureID].glTexture;
          else {
            if (_value.image && _value.image.complete) {

              if (_value.image.naturalWidth === undefined || _value.image.naturalWidth === 0) {
                // there was a problem loading the image
                _value.glTexture = null;
              } else {
                _value.glTexture = _gl.createTexture();
                _gl.bindTexture(_gl.TEXTURE_2D, _value.glTexture);
                if (_value.flipY)
                 _gl.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL, true);
                else
                 _gl.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL, false);
                 // load image
                _gl.texImage2D(_gl.TEXTURE_2D, /* level */ 0, /* internal format */ _gl.RGBA, /* image format */ _gl.RGBA, _gl.UNSIGNED_BYTE, _value.image);

                if (_value.magFilter)
                  _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, _value.magFilter);
                if (_value.minFilter)
                  _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, _value.minFilter);
                if (_value.wrapS)
                  _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, _value.wrapS);
                if(_value.wrapT)
                  _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, _value.wrapT);
                // if not POT
                var width = _value.image.width;
                var height = _value.image.height;
                if (((width&(width-1)) === 0 ) && ((height&(height-1)) === 0)) {
                  _gl.generateMipmap(_gl.TEXTURE_2D);
                } else {
                  _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, _gl.LINEAR);
                  _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, _gl.LINEAR);
                  _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, _gl.CLAMP_TO_EDGE);
                  _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, _gl.CLAMP_TO_EDGE);
                }
                _gl.bindTexture(_gl.TEXTURE_2D,  null);
                State.textures[textureID] = { glTexture:_value.glTexture, 
                                                     image: _value.image, 
                                                     flipY: _value.flipY,
                                                   };
                return true;
              }
            }
         }
       }
      
    };
    
    State.setModelView = (function() {
      var tmpmat3 = new Float32Array(9);

      return function (_mv)  {
          mat4.copy(State.Uniforms.MODELVIEW, _mv);
          
          mat3.fromMat4(tmpmat3, _mv)
          mat3.transpose(State.Uniforms.MODELVIEWINVERSETRANSPOSE,mat3.invert(tmpmat3,tmpmat3));
      }
    })();

    State.setViewProj= function (_mat) { 
      mat4.copy(State.Uniforms.PROJECTION, _mat); 
    };
    
    State.setViewport = function(_state,_x1, _y1, _x2, _y2) {
      _state.viewportX1 = _x1;
      _state.viewportX2 = _x2;
      _state.viewportY1 = _y1;
      _state.viewportY2 = _y2;
      if (_state.gl)
        _state.gl.viewport(_x1,_y1,_x2,_y2);
      else
        _state.viewportDirty = true;
      return _state;
    }

    State.setBlendEnable = function (_state,_value) {
      _state.blendEnable = _value;
      if (_state.gl) {
        if (_value)
          _state.gl.enable(State.BLEND);
        else
          _state.gl.disable(State.BLEND)
      } else
        _state.blendEnableDirty = true;
      return _state;
    }
    // ["FUNC_ADD", "FUNC_SUBTRACT", "FUNC_REVERSE_SUBTRACT"]
    State.setBlendEquation = function(_state,_value) {
      _state.blendEquation = _value;
      if (_state.gl)
        _state.gl.blendEquation(_value);
      else
        _state.blendEquationDirty = true;
      return _state;
    }
    // ["FUNC_ADD", "FUNC_SUBTRACT", "FUNC_REVERSE_SUBTRACT"]

    State.setBlendEquationSeparate = function(_state,_rgb,_alpha) {
      _state.blendEquationSeparateRgb = _rgb;
      _state.blendEquationSeparateAlpha = _alpha;
      if (_state.gl)
        _state.gl.blendEquationSeparate(_rgb,_alpha)
      else
        _state.blendEquationSeparateDirty = true;
      return _state;
    }
    //"ZERO","ONE", "SRC_COLOR", "ONE_MINUS_SRC_COLOR", "DST_COLOR", "ONE_MINUS_DST_COLOR", "SRC_ALPHA", 
    //"ONE_MINUS_SRC_ALPHA", "DST_ALPHA", "ONE_MINUS_DST_ALPHA", "CONSTANT_COLOR", "ONE_MINUS_CONSTANT_COLOR", 
    //"CONSTANT_ALPHA", "ONE_MINUS_CONSTANT_ALPHA", "SRC_ALPHA_SATURATE"
    State.setBlendFunc = function(_state,_srcFactor,_dstFactor) {
      _state.blendFuncSrcFactor = _srcFactor;
      _state.blendFuncDstFactor = _dstFactor;
      if (_state.gl)
        _state.gl.blendFunc(_srcFactor,_dstFactor);
      else
        _state.blendFuncDirty = true;
      return _state;
    }
    State.setBlendFuncSeparate = function (_state,_srcRgb, _srcAlpha, _dstRgb, _dstAlpha) {
      _state.blendFuncSeparateSrcRgb = _srcRgb;
      _state.blendFuncSeparateSrcAlpha = _srcAlpha;
      _state.blendFuncSeparateDstRgb = _dstRgb;
      _state.blendFuncSeparateDstAlpha = _dstAlpha;
      if (_state.gl)
        _state.gl.blendFunc(_srcRgb,_srcAlpha,_dstRgb,_dstAlpha);
      else
        _state.blendFuncSeparateDirty = true;
      return _state;
    }
    State.setColorMask = function(_state,_red, _green, _blue, _alpha) {
      _state.colorMaskRed = _red;
      _state.colorMaskBlue = _blue;
      _state.colorMaskGreen = _green;
      _state.colorMaskAlpha = _alpha;
      if (_state.gl)
        _state.gl.colorMask(_red,_green,_blue,_alpha)
      else
        _state.colorMaskDirty = true;
      return _state;
    }
    State.setClearColor = function(_state,_red, _green, _blue, _alpha) {
      _state.clearColorRed = _red;
      _state.clearColorBlue = _blue;
      _state.clearColorGreen = _green;
      _state.clearColorAlpha = _alpha;
      if (_state.gl)
        _state.gl.clearColor(_red,_green,_blue,_alpha)
      else
        _state.clearColorDirty = true;
      return _state;
    }
    State.setClear = function(_state, _value) { 
      _state.clear = _value; 
      if (_state.gl)
        _state.gl.clear(_value);
      else
        _state.clearDirty = true;
      return _state;
    }
    State.setCullFace = function(_state, _value) { 
      _state.cullFace = _value;
      if (_state.gl)
        _state.gl.cullFace(_value);
      else
        _state.cullFaceDirty = true;
      return _state;
    }
    State.setCullFaceEnable = function(_state,_bool) {
      _state.cullFaceEnable = _bool
      if (_state.gl) {
        if (_bool)
          _state.gl.enable(State.CULL_FACE);
        else
         _state.gl.disable(Stata.CULL_FACE);
     } else
        _state.cullFaceEnableDirty = true;
      return _state;
    }
    State.setDepthFunc = function(_state, _value) {
      _state.depthFunc = _value;
      if (_state.gl)
        _state.gl.depthFunc(_value);
      else
        _state.depthFuncDirty = true;
      return _state;
    }
    State.setDepthClear = function(_state, _value) {
      _state.depthClear = _value;
      if (_state.gl)
        _state.gl.clearDepth(_value);
      else
        _state.clearDepthDirty = true;
      return _state;
    }
    State.setDepthMask = function(_state,_value) {
      _state.depthMask = _value;
      if (_state.gl)
        _state.gl.depthMask(_value);
      else
        _state.depthMaskDirty = true;
      return _state;
    }
    // [0,1] values
    State.setDepthRange = function(_state, _near, _far) {
      _state.depthRangeNear = _near;
      _state.depthRangeFar = _far;
      if (_state.gl)
        _state.gl.depthRange(_near,_far);
      else
        _state.depthRangeDirty = true;
      return _state;
    }
    State.setDepthTestEnable = function(_state,_bool) {
      _state.depthTestEnable = _bool;
      if (_state.gl) {
        if (_bool)
          _state.gl.enable(State.DEPTH_TEST);
        else 
          _state.gl.disable(State.DEPTH_TEST);
      } else
        _state.depthTestEnableDirty = true;
      return _state;
    }
    // "CW,", "CCW"
    State.setFrontFace = function(_state,_value){ 
      _state.frontFace = _value;
      if (_state.gl)
        _state.gl.frontFace(_value);
      else
        _state.frontFaceDirty=true;
      return _state;
    }
    // ]0,1]
    State.setLineWidth = function(_state, _value){ 
      _state.lineWidth=_value;
      if (_state.gl)
        _state.gl.lineWidth(_value);
      else
        _state.lineWidthDirty = true;
      return _state;
    }
    State.setPolygonOffset = function(_state,_factor,_units){
      _state.polygonOffsetFactor = _factor;
      _state.polygonOffsetUnits = _units;
      if (_state.gl)
        _state.gl.polygonOffset(_factor,_units);
      else
        _state.polygonOffsetDirty = true;
      return _state;
    }
    State.setPolygonOffsetFillEnable = function(_state,_bool) {
      _state.polygonOffsetFillEnable = _bool;
      if (_state.gl){
        if (_bool)
          _state.gl.enable(State.POLYGON_OFFSET_FILL);
        else
          _state.gl.disable(State.POLYGON_OFFSET_FILL);
      } else
        _state.polygonOffsetFillEnableDirty=true;
      return _state;
    }
    State.setSampleAlphaToCoverageEnable = function(_state,_bool) {
      _state.sampleAlphaToCoverageEnable = _bool;
      if (_state.gl) {
        if (_bool)
          _state.gl.enable(State.SAMPLE_ALPHA_TO_COVERAGE);
        else
          _state.gl.disable(State.SAMPLE_ALPHA_TO_COVERAGE);
      } else
        _state.sampleAlphaToCoverageEnableDirty = true;
      return _state;
    }
    // [0,1] + bool
    State.setSampleCoverage = function(_state, _value, _invert) {
      _state.sampleCoverageValue = _value;
      _state.sampleCoverageInvert = _invert;
      if (_state.gl)
        _state.gl.sampleCoverage(_value,_invert);
      else
        _state.sampleCoverageDirty = true;
      return _state;
    }
    State.setSampleCoverageEnable = function(_state,_bool) {
      _state.sampleCoverageEnable = _bool;
      if (_state.gl) {
        if (_bool)
          _state.gl.enable(State.SAMPLE_COVERAGE);
        else
          _state.gl.disable(State.SAMPLE_COVERAGE);
      } else
        _state.sampleCoverageEnableDirty = true;
      return _state;
    }
    State.setScissor = function(_state,_x,_y,_width,_height) {
      _state.scissorX = _x;
      _state.scissorY = _y;
      _state.scissorWidth = _width;
      _state.scissorHeight = _height;
      if (_state.gl)
        _state.gl.scissor(_x,_y,_width,_height)
      else
        _state.scissorDirty = true;
      return _state;
    }
    State.setScissorTestEnable = function(_state,_bool){
      _state.scissorTestEnable = _bool;
      if (_state.gl) {
        if (_bool)
          _state.gl.enable(State.SCISSOR_TEST)
        else
          _state.gl.disable(State.SCISSOR_TEST)
      } else
        _state.scissorTestEnableDirty=true;
      return _state;
    }
    //["NEVER", "LESS", "LEQUAL", "EQUAL", "GREATER", "NOTEQUAL", "GEQUAL", "ALWAYS"]
    State.setStencilFunc = function(_state,_func,_ref,_mask){
      _state.stencilFuncFunc = _func;
      _state.stencilFuncRef = _ref;
      _state.stencilFuncMask = _mask;
      if (_state.gl)
        _state.gl.stencilFunc(_func,_ref,_mask)
      else
        _state.stencilFuncDirty=true;
      return _state;
    }
    // "NEVER", "LESS", "LEQUAL", "EQUAL", "GREATER", "NOTEQUAL", "GEQUAL", "ALWAYS"]
    State.setStencilFuncSeparate = function(_state,_face,_func,_ref,_mask) { 
      _state.stencilFuncSeparateFace = _face;
      _state.stencilFuncSeparateFunc = _func
      _state.stencilFuncSeparateRef = _ref;
      _state.stencilFuncSeparateMask = _mask;
      if (_state.gl)
        _state.gl.stencilFuncSeparate(_face,_func,_ref,_mask);
      else
        _state.stencilFuncSeparateDirty = true;
      return _state;
    }
    State.setStencilMask = function(_state,_mask){
      _state.stencilMask = _mask;
      if (_state.gl)
        _state.gl.stencilMask(_mask);
      else
        _state.stencilMaskDirty = true;
      return _state;
    }
    // "KEEP", "ZERO", "REPLACE", "INCR", "DECR", "INVERT", "INCR_WRAP", "DECR_WRAP"]
    State.setStencilOp = function(_state,_fail,_zfail,_zpass) {
      _state.stencilOpFail = _fail;
      _state.stencilOpZFail = _zfail;
      _state.stencilOpZPass = _zpass;
      if (_state.gl)
        _state.gl.stencilOp(_fail,_zfail,_zpass);
      else
        _state.stencilOpDirty = true;
      return _state;
    }
    // ["FRONT", "BACK", "FRONT_AND_BACK"],
    State.setStencilOpSeparate = function(_state,_face,_fail,_zfail,_zpass){ 
      _state.stencilOpSeparateFace = _face;
      _state.stencilOpSeparateFail = _fail;
      _state.stencilOpSeparateSfail = _zfail;
      _state.stencilOpSeparateZpass = _zpass;
      if (_state.gl)
        _state.gl.stencilOpSeparate(_face,_fail,_zfail,_zpass);
      else
        _state.stencilOpSeparateDirty=true;
      return _state;
    }
    State.setStencilTestEnable = function(_state,_bool){
      _state.stencilTestEnable = _bool;
      if (_state.gl) {
        if (_bool)
          _state.gl.enable(State.STENCIL_TEST);
        else
          _state.gl.disable(State.STENCIL_TEST);
      } else
        _state.stencilTestEnableDirty = true;
      return _state;
    };
  

    // TODO - attibutes 
    State.apply = function(_old, _new) {
      var gl = _old.gl;

      if (!gl) {RENDERER.logError("no gl context in applyProgram"); return false};

      if (_new.program.compileMe) 
        compileProgram(gl,_new);

      // call useProgram and remap attrbutes if there is a change
      if (_new.program !== _old.program) {
         gl.useProgram(_new.program.glProgram);
         _old.program = _new.program;
      }
     
      // apply uniforms

      for (var uniformID in _new.program.uniforms) 
        State.setUniform(gl, _new, uniformID); 

      // apply new gl states
      if ((_new.viewportDirty === true)
      && ((_old.viewportX1 != _new.viewportX1)
      || (_old.viewportX2 != _new.viewportX2)
      || (_old.viewportY1 != _new.viewportY1)
      || (_old.viewportY2 != _new.viewportY2)))
        State.setViewport(_old, _new.viewportX1, _new.viewportY1, _new.viewportX2, _new.viewportY2);

      if ((_new.blendEnableDirty === true)
      && (_old.blendEnable != _new.blendEnable))
        State.setBlendEnable(_old, _new.blendEnable);

      if ((_new.blendEquationDirty === true)
      && (_old.blendEquation != _new.blendEquation))
        State.setBlendEquation(_old,_new.blendEquation); 

      if ((_new.blendEquationSeparateDirty === true)
      && ((_old.blendEquationSeparateRgb != _new.blendEquationSeparateRgb)
      || (_old.blendEquationSeparateAlpha != _new.blendEquationSeparateAlpha)))
        State.setBlendEquationSeparate(_old,_new.blendEquationSeparateRgb, _new.blendEquationSeparateAlpha); 

      if ((_new.blendFuncDirty === true)
      && ((_old.blendFuncSrcFactor != _new.blendFuncSrcFactor)
      || (_old.blendFuncDstFactor != _new.blendFuncDstFactor)))
        State.setBlendFunc(_old,_new.blendFuncSrcFactor, _new.blendFuncDstFactor);

      if ((_new.blendFuncSeparateDirty === true)
      && ((_old.blendFuncSeparateSrcRgb != _new.blendFuncSeparateSrcRgb)
      || (_old.blendFuncSeparateSrcAlpha != _new.blendFuncSeparateSrcAlpha)
      || (_old.blendFuncSeparateDstRgb != _new.blendFuncSeparateDstRgb)
      || (_old.blendFuncSeparateDstAlpha != _new.blendFuncSeparateDstAlpha)))
        State.setBlendFuncSeparate(_old,_new.blendFuncSeparateSrcRgb, _new.blendFuncSeparateSrcAlpha, _new.blendFuncSeparateDstRgb, _new.blendFuncSeparateDstAlpha);

      if ((_new.colorMaskDirty === true)
      && ((_old.colorMaskRed != _new.colorMaskRed)
      || (_old.colorMaskBlue != _new.colorMaskBlue)
      || (_old.colorMaskGreen != _new.colorMaskGreen)
      || (_old.colorMaskAlpha != _new.colorMaskAlpha)))
        State.setColorMask(_old,_new.colorMaskRed,_new.colorMaskBlue,_new.colorMaskGreen,_new.colorMaskAlpha);

      if ((_new.clearColorDirty === true)
      && ((_old.clearColorRed != _new.clearColorRed)
      || (_old.clearColorGreen != _new.clearColorGreen)
      || (_old.clearColorBlue != _new.clearColorBlue)
      || (_old.clearColorAlpha != _new.clearColorAlpha)))
        State.setClearColor(_old, _new.clearColorRed, _new.clearColorGreen,_new.clearColorBlue, _new.clearColorAlpha);

      if ((_new.cullFaceDirty === true)
      && (_old.cullFace != _new.cullFace))
        State.setCullFace(_old,_new.cullFace);

      if ((_new.cullFaceEnableDirty === true)
      && (_old.cullFaceEnable != _new.cullFaceEnable))
        State.setCullFaceEnable(_old,_new.cullFaceEnable); 

      if ((_new.depthFuncDirty === true)
      && (_old.depthFunc != _new.depthFunc))
        State.setDepthFunc(_old,_new.depthFunc);

      if ((_new.depthMaskDirty === true)
      && (_old.depthMask != _new.depthMask))
        State.setDepthMask(_old,_new.depthMask);

      if ((_new.depthClearDirty === true)
      && (_old.depthClear != _new.depthClear))
        State.setDepthClear(_old,_new.depthClear);

      if ((_new.depthRangeDirty === true)
      && ((_old.depthRangeNear != _new.depthRangeNear)
      || (_old.depthRangeFar != _new.depthRangeFar)))
        State.setDepthRange(_old,_new.depthRangeNear,_new.depthRangeFar);

      if ((_new.depthTestDirty === true)
      && (_old.depthTestEnable != _new.depthTestEnable))
        State.setDepthTestEnable(_old,_new.depthTestEnable);

      if ((_new.frontFaceDirty === true)
      && (_old.frontFace != _new.frontFace))
        State.setFrontFace(_old,_new.frontFace);

      if ((_new.lineWidthDirty === true)
      && (_old.lineWidth != _new.lineWidth))
        State.setLineWidth(_old,_new.lineWidth);

      if ((_new.polygonOffsetDirty === true)
      && ((_old.polygonOffsetFactor != _new.polygonOffsetFactor)
      && (_old.polygonOffsetUnits != _new.polygonOffsetUnits)))
        State.setPolygonOffset(_old,_new.polygonOffsetFactor,_new.polygonOffsetUnits);

      if ((_new.polygonOffsetFillEnableDirty === true)
      && (_old.polygonOffsetFillEnable != _new.polygonOffsetFillEnable))
        State.setPolygonOffsetFillEnable(_old,_new.polygonOffsetFillEnable);

      if ((_new.sampleAlphaToCoverageEnableDirty === true)
      && (_old.sampleAlphaToCoverageEnable != _new.sampleAlphaToCoverageEnable))
        State.setSampleAlphaToCoverageEnable(_old,_new.sampleAlphaToCoverageEnable);

      if ((_new.sampleCoverageDirty === true)
      && ((_old.sampleCoverageValue != _new.sampleCoverageValue)
      || (old.sampleCoverageInvert != _new.sampleCoverageInvert)))
        State.setSampleCoverage(_old,_new.sampleCoverageValue,_new.sampleCoverageInvert);

      if ((_new.sampleCoverageEnableDirty === true)
      && (_old.sampleCoverageEnable != _new.sampleCoverageEnable))
        State.setSampleCoverageEnable(_old,_new.blendEquationSeparateAlpha);

      if ((_new.scissorDirty === true)
      && ((_old.scissorX != _new.scissorX)
      || (_old.scissorY != _new.scissorY)
      || (_old.scissorWidth != _new.scissorWidth)
      || (_old.scissorHeight != _new.scissorHeight)))
        State.setScissor(_old,_new.scissorX,_new.scissorY,_new.scissorWidth,_new.scissorHeight);

      if ((_new.scissorTestEnableDirty === true)
      && (_old.scissorTestEnable != _new.scissorTestEnable))
        State.setScissorTestEnable(_old,_new.scissorTestEnable);

      if ((_new.stencilfuncDirty === true)
      && ((_old.stencilFuncFunc != _new.stencilFuncFunc)
      || (_old.stencilFuncRef != _new.stencilFuncRef)
      || (_old.stencilFuncMask != _new.stencilFuncMask)))
        State.setStencilFunc(_old,_new.stencilFuncFunc,_new.stencilFuncRef, _new.stencilFuncMask);
      
      if ((_new.stencilFuncSeparateDirty === true)
      && ((_old.stencilFuncSeparateFace != _new.stencilFuncSeparateFace)
      || (_old.stencilFuncSeparateFunc != _new.stencilFuncSeparateFunc)
      || (_old.stencilFuncSeparateRef != _new.stencilFuncSeparateRef)
      || (_old.stencilFuncSeparateMask != _new.stencilFuncSeparateMask)))
          State.setStencilFuncSeparate(_old,_new.stencilFuncSeparateFace,_new.stencilFuncSeparateFunc,_new.stencilFuncSeparateRef,_new.stencilFuncSeparateMask);
      
      if ((_new.stencilMaskDirty === true)
      && (_old.stencilMask != _new.stencilMask))
        State.setStencilMask(_old,_new.stencilMask);

      if ((_new.stencilOpDirty === true)
      && ((_old.stencilOpFail != _new.stencilOpFail)
      || (_old.stencilOpZFail != _new.stencilOpZFail)
      || (_old.stencilOpZPass != _new.stencilOpZPass)))
        State.setStencilOp(_old,_new.stencilOpFail,_new.stencilOpZFail,_new.stencilOpZPass);

      if ((_new.stencilOpSeparateDirty === true)
      && ((_old.stencilOpSeparateFace != _new.stencilOpSeparateFace)
      || (_old.stencilOpSeparateFail != _new.stencilOpSeparateFail)
      || (_old.stencilOpSeparateSfail != _new.stencilOpSeparateSfail)
      || (_old.stencilOpSeparateZpass != _new.stencilOpSeparateZpass)))
        State.setStencilOpSeparate(_old, _new.stencilOpSeparateFace, _new.stencilOpSeparateFail, _new.stencilOpSeparateSfail, _new.stencilOpSeparateZpass);

      if ((_new.stencilTestEnableDirty === true)
      && (_old.stencilTestEnable != _new.stencilTestEnable))
        State.setStencilTestEnable(_old,_new.stencilTestEnable);

      // not really a state, so do it even if same as before
      if (_new.setClearDirty === true)
        State.setClear(_new.clear_);
    };

    State.glEnums = {};

    State.fn = {
           "blendEnable":  State.setBlendEnable,
           "blendEquation": State.setBlendEquation,
           "blendEquationSeparate": State.setBlendEquationSeparate,
           "blendFunc": State.setBlendFunc,
           "blendFuncSeparate": State.setBlendFuncSeparate,
           "colorMask": State.setColorMask,
           "clearColor": State.setClearColor,
           "clear": State.setClear,
           "cullFace": State.setCullFace,
           "cullFaceEnable": State.setCullFaceEnable,
           "depthFunc": State.setDepthFunc,
           "depthClear": State.setDepthClear,
           "depthMask": State.setDepthMask,
           "depthRange": State.setDepthRange,
           "depthTestEnable": State.setDepthTestEnable,
           "frontFace": State.setFrontFace,
           "lineWidth": State.setLineWidth,
           "polygonOffset": State.setPolygonOffset,
           "polygonOffsetFillEnable": State.setPolygonOffsetFillEnable,
           "sampleAlphaToCoverageEnable": State.setSampleAlphaToCoverageEnable,
           "sampleCoverage": State.setSampleCoverage,
           "sampleCoverageEnable": State.setSampleCoverageEnable,
           "scissor": State.setScissor,
           "scissorTestEnable": State.setScissorTestEnable,
           "stencilFunc": State.setStencilFunc,
           "stencilFuncSeparate": State.setStencilFuncSeparate,
           "stencilMask": State.setStencilMask,
           "stencilOp": State.setStencilOp,
           "stencilOpSeparate": State.setStencilOpSeparate,
           "stencilTestEnable": State.setStencilTestEnable,
           "viewport": State.setViewport,
    } ;
    

    // initialize glEnum array to convert back and forth from Token to Value
    for (var propertyName in WebGLRenderingContext) {
      if (typeof WebGLRenderingContext[propertyName] == 'number' && propertyName[0] >= 'A') {
        State.glEnums[WebGLRenderingContext[propertyName]] = propertyName;
        State[propertyName] = WebGLRenderingContext[propertyName];
      }
    };


    // some State global values
    State.states = []; // list of all states that have been created
    State.programs = []; // list of all programs that have been created
    State.primitives = []; // list of all primitives that have been created
    State.textures = []; // list of textures that have been created

      // create a basic State

    var basicState ={}; 
    basicState.ID = "basicState";

    basicState.program = {}; // allocate new program for basicState

    basicState.program.vertexShader =  
          "attribute vec3 aVertex;"+
          "attribute vec3 aNormal;"+
          "attribute vec2 aTexCoord0;"+
          "attribute vec4 aColor;"+
          "uniform mat4 uPMatrix;"+
          "uniform mat4 uMVMatrix;"+
          "uniform mat3 uNMatrix;"+
          "uniform float uAlphaScale;"+
          "varying vec2 vTexCoord0;"+
          "varying vec4 vColor;"+
          "varying vec3 vNormal;"+
          "void main(void) {"+
          "    gl_Position = uPMatrix * uMVMatrix * vec4(aVertex, 1.0);"+
          "    vColor = vec4(aColor.xyz,aColor.w*uAlphaScale);"+
          "    vNormal = normalize(uNMatrix * aNormal);"+
          "    vTexCoord0 = aTexCoord0;"+
          "}";

    basicState.program.fragmentShader = 
          "precision mediump float;"+
          //"precision highp float;"+
          "varying vec2 vTexCoord0;"+
          "varying vec4 vColor;"+
          "varying vec3 vNormal;"+
          "uniform vec4 uColor;"+
          "uniform sampler2D uTexture0;"+
          "void main(void) {"+
            "float lambert = max(dot(vNormal,vec3(0.,0.,1.)), 0.2);"+
            "vec4 color = vColor * texture2D(uTexture0, vTexCoord0) * vec4(lambert,lambert,lambert,1.);"+
            "gl_FragColor = vec4(color.rgb * color.a, color.a);"+
          "}";



    basicState.program.compileMe = true;
    basicState.program.glProgram = null;

    basicState.program.attributes = { 'POSITION' : { semantic: 'POSITION', symbol: 'aVertex', type: WebGLRenderingContext.FLOAT_VEC3 },
                                      'NORMAL' : { semantic: 'NORMAL', symbol: 'aNormal', type: WebGLRenderingContext.FLOAT_VEC3} ,
                                      'TEXCOORD_0' : { semantic: 'TEXCOORD_0', symbol: 'aTexCoord0', type: WebGLRenderingContext.FLOAT_VEC2},
                                      'COLOR' : { semantic: 'COLOR', symbol: 'aColor', type: WebGLRenderingContext.FLOAT_VEC4}};

    basicState.program.uniforms =  { 'MODELVIEW' : { symbol: 'uMVMatrix' , type: WebGLRenderingContext.FLOAT_MAT4 },
                                     'PROJECTION' : { symbol: 'uPMatrix' , type: WebGLRenderingContext.FLOAT_MAT4 },
                                     'MODELVIEWINVERSETRANSPOSE' : { symbol: 'uNMatrix', type: WebGLRenderingContext.FLOAT_MAT3},
                                     'diffuse': { symbol: 'uTexture0', type: WebGLRenderingContext.SAMPLER_2D },
                                     'alphaScale' :{ symbol: 'uAlphaScale', type: WebGLRenderingContext.FLOAT, value: 1.}};


  // picking state
  // create a basic State (lambert)
    var pickState ={}; 
    pickState.ID = "pickState";

    pickState.program = {}; // allocate new program for basicState

    pickState.program.vertexShader =  
          "attribute vec3 aVertex;\n"+
          "uniform mat4 uPMatrix;\n"+
          "uniform mat4 uMVMatrix;\n"+
          "void main(void) {\n"+
          "    gl_Position = uPMatrix * uMVMatrix * vec4(aVertex, 1.0);\n"+
          "}";

    pickState.program.fragmentShader = 
          "precision mediump float;\n"+
          //"precision highp float;"+
          "uniform vec4 uColor;\n"+
          "void main(void) {\n"+
            "gl_FragColor = uColor;\n"+
          "}";



    pickState.program.compileMe = true;
    pickState.program.glProgram = null;

    pickState.program.attributes = { 'POSITION' : { semantic: 'POSITION', symbol: 'aVertex', type: WebGLRenderingContext.FLOAT_VEC3 }
                                    };

    pickState.program.uniforms =  {  'MODELVIEW' : { symbol: 'uMVMatrix' , type: WebGLRenderingContext.FLOAT_MAT4 },
                                     'PROJECTION' : { symbol: 'uPMatrix' , type: WebGLRenderingContext.FLOAT_MAT4 },
                                     'color' :{ symbol: 'uColor', type: WebGLRenderingContext.FLOAT_VEC4 }};
    // TODO  - disable blend
    

    if(typeof(exports) !== 'undefined') {
        exports.State = State;
    }

  })(shim.exports);
})(this);
