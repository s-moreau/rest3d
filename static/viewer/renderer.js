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
THE SOFTWARE.


  renderer.js needs webgl-utils.js and webgl-debug.js
  gl-matrix and gl-matrix-extended
  textureloader
*/

// Here's a simple webGL  renderer

if (window.WebGLUtils === undefined) {
    document.write('<script src="/deps/webgl-utils.js"><\/' + 'script>');
    document.write('<script src="/deps/webgl-debug.js"><\/' + 'script>');
}

if (window.mat4 === undefined)
{
    document.write('<script src="/deps/gl-matrix.js"><\/'+'script>');
    document.write('<script src="/loaders/gl-matrix-ext.js"><\/'+'script>');
}
/*
if (window.TextureUtil === undefined)
{
    document.write('<script src="/deps/texture-util.min.js"><\/'+'script>');
}
*/
(function(){
  // Initial Setup
  // -------------

  // Save a reference to the global object (`window` in the browser, `exports`
  // on the server).
  var root = this;
  // The top-level namespace. All public COLLADA classes and modules will
  // be attached to this. Exported for both CommonJS and the browser.
  var RENDERER;
  if (typeof exports !== 'undefined') {
    RENDERER = exports;
  } else {
    RENDERER = root.RENDERER = {};
  } 


  // extend math library with deg2rad if needed

  if (!Math.deg2rad) {
    Math.deg2rad = function (_deg) {
      return .0174532925 * _deg;
    }
  }
  // log wrapper
  RENDERER.log = function(_msg) { 
    if (console && console.log) console.log(_msg);
  }
  // log error wrapper
  RENDERER.logError = function(_msg) { 
    throw _msg;
    /*
    if (console && console.logError) console.logError(_msg);
    else RENDERER.log(_msg);
    */
  }

  var verbose=true;
  var ext=null;


  Camera = {};

  Camera.create = function () {
    out = {
      eye            : vec3.fromValues(0., 0., -200.),
      aim            : vec3.fromValues(0., 0., 0.),
      upVector       : vec3.fromValues(0., 1., 0.),
      FOV            : 60.0,
      nearClipPlane  : 1.0,
      farClipPlane   : 1000.0,
      projectionMode : "PERSPECTIVE",
      projection     : mat4.create(),
      lookAt         : mat4.create(),
    }
    Camera.updateMatrices(out);
    return out;
  };

  Camera.updateMatrices = function (_out) {
    mat4.perspective(_out.projection, Math.deg2rad(_out.FOV), 1, _out.nearClipPlane, _out.farClipPlane);
    mat4.lookAt(_out.lookAt, _out.eye, _out.aim, _out.upVector);
  }

  Camera.lookAt = function(_out, _target){

    vec3.copy(_out.aim, _target);
    Camera.updateMatrices(_out);
  }

  Camera.lookAtAabb = function(_out, _bbox, _upAxis) {
   // get bounding box and set Camera
    var midx = _bbox.center[0];
    var midy = _bbox.center[1];
    var midz = _bbox.center[2];
    var maxdim = _bbox.maxdim;

    if (_upAxis === 'Z_UP') {
        var tmp=midz;
        midz = -midy;
        midy = tmp;
    };

    vec3.set(_out.eye, midx, midy, midz + (maxdim / Math.sin(Math.deg2rad(_out.FOV/2.))) );
    vec3.set(_out.upVector, 0., 1., 0.);
    vec3.set(_out.aim, midx, midy, midz);
    _out.nearClipPlane = maxdim/100.;
    _out.farClipPlane = maxdim*100.;

    Camera.updateMatrices(_out);

   return _out;

  }

  Camera.rotateAround = (function() {
    var tmpvec3 = new Float32Array(3);

    return function(_out,_zoom,_rotateX, _rotateY) {
        vec3.subtract(tmpvec3,_out.eye,_out.aim);

        var rrr=false;

        while (_rotateY < -180) _rotateY += 360;
        while (_rotateY > 180) _rotateY -= 360;
        if (_rotateY <= -90 || _rotateY >= 90) 
           vec3.set(_out.upVector,0,-1,0);
        else
          vec3.set(_out.upVector,0,1,0);

        var radius = vec3.length(tmpvec3)*_zoom;
        var xRad = Math.deg2rad(_rotateX);
        var yRad = Math.deg2rad(_rotateY);

        // spherical position 
        var cy = Math.cos(yRad)*radius;
        vec3.set(_out.eye,
          _out.aim[0] + Math.sin(xRad)*cy,
          _out.aim[1] + Math.sin(yRad)*radius,
          _out.aim[2] + Math.cos(xRad)*cy);

        Camera.updateMatrices(_out);
    }
  })();
  
  if(typeof(exports) !== 'undefined') {
      exports.Camera = Camera;
  }

  Channel= {};

  Channel.create = function(_canvas, _debug) {
      this.canvas = _canvas;

      var devicePixelRatio = window.devicePixelRatio || 1;
 
      // set the size of the drawingBuffer based on the size it's displayed.
      this.canvas.width = canvas.clientWidth * devicePixelRatio;
      this.canvas.height = canvas.clientHeight * devicePixelRatio;

      var ctx = WebGLUtils.setupWebGL(this.canvas);

      // find extensions
      ext = (
        ctx.getExtension('WEBGL_lose_context') ||
        ctx.getExtension('EXT_texture_filter_anisotropic') ||
        ctx.getExtension('MOZ_EXT_texture_filter_anisotropic') ||
        ctx.getExtension('WEBKIT_EXT_texture_filter_anisotropic')
      );

      var gl=null;

      if (_debug){
        function throwOnGLError(err, funcName, args) {
          throw WebGLDebugUtils.glEnumToString(err) + " was caused by call to " + funcName;
        };
        function validateNoneOfTheArgsAreUndefined(functionName, args) {
          for (var ii = 0; ii < args.length; ++ii) {
            if (args[ii] === undefined) {
              console.error("undefined passed to gl." + functionName + "(" +
                             WebGLDebugUtils.glFunctionArgsToString(functionName, args) + ")");
            }
          }
        } 
 

      gl = WebGLDebugUtils.makeDebugContext( ctx, throwOnGLError, validateNoneOfTheArgsAreUndefined);


      } else {
        gl = ctx;
         WebGLDebugUtils.init(gl);
      }
     
      //gl.clearColor(1.0, 0.0, 0.0, 1.0); // Set clear color to black, fully opaque

      //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear the color as well as the depth buffer.
      this.canvas.addEventListener('webglcontextlost', this.handleContextLost.bind(this), false);
      this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored.bind(this), false);

      // create an immediate state

      this.state =  State.create(gl);


      // This is ugly - FIXME
      //State.apply(this.state,State.createBasic())
      var basicState = State.createBasic();

      State.applyProgram(this.state,basicState);

      this.clear();

      return this;

    };

  Channel.handleContextLost= function(e) {
        RENDERER.logError("handle context lost");
        e.preventDefault();
    };

  Channel.handleContextRestored = function() {
        RENDERER.logError("handle context restored");
        this.init(this.canvas);
        // recreate all primitive buffers
        for (var i=0, len=State.primitives.length;i<len; i++)
          State.primitives[i].createAttributeBuffers(this.state) ;
        for (var i=0, len=State.textures.length;i<len;i++)
          State.textures[i].createTextureBuffer(this.state);
        //for (var i=0, len=this.state.programs.length;i<len; i++)
        // finally send a resize event on the canvas to trigger app redraw
        $(canvas).resize();
    };


    Channel.forceContextLoss= function() {
      if (ext && ext.loseContext) ext.loseContext();

    };

    Channel.forceContextRestore =function() {
      if (ext && ext.restoreContext) ext.restoreContext();
      
    };

    Channel.viewport= function(_x1,_y1,_x2,_y2) {
      // todo - var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight; 
      // .perspective(fieldOfView, aspect, zNear, zFar); 
      //this.x1 = _x1; this.x2=_x2; this.y1=_y1; this.y2=_y2;
      State.setViewport(this.state, _x1,_y1, _x2, _y2);
    };

    Channel.clear=function(){

      var state = this.state;

      State.setClearColor(state, 1, 0, 0, 1);
      State.setScissorTestEnable(state, false);
      State.setDepthClear(state, 1.);
      State.setClear(state, State.COLOR_BUFFER_BIT | State.DEPTH_BUFFER_BIT);


      State.setDepthTestEnable(state, true);
      State.setDepthFunc(state, State.LESS);
        

      State.setScissorTestEnable(state,true);
      State.setScissor(state, 1, 1, State.canvasWidth() - 2, State.canvasHeight() - 2);
      State.setClearColor(state, 0, 1, 0, 1);
      State.setClear(state, State.COLOR_BUFFER_BIT);

  };


  if(typeof(exports) !== 'undefined') {
      exports.Channel = Channel;
  }


  State = {};

  State.isInitialized = false;

  State.create = function(_gl) {


    if (!State.isInitialized && _gl) {

/*
      // copy gl constants, so we can use those values without a context
      State.TRIANGLES = _gl.TRIANGLES;
      State.VERTEX_SHADER = _gl.VERTEX_SHADER;
      State.FRAGMENT_SHADER = _gl.FRAGMENT_SHADER;
      State.FRONT = _gl.FRONT;
      State.BACK = _gl.BACK;
      State.FRONT_AND_BACK = _gl.FRONT_AND_BACK;
      State.FUNC_ADD = _gl.FUNC_ADD;
      State.FUNC_SUBTRACT = _gl.FUNC_SUBTRACT;
      State.FUNC_REVERSE_SUBTRACT = _gl.FUNC_REVERSE_SUBTRACT;
      State.ZERO = _gl.ZERO;
      State.ONE = _gl.ONE;
      State.SRC_COLOR = _gl.SRC_COLOR;
      State.ONE_MINUS_SRC_COLOR = _gl.ONE_MINUS_SRC_COLOR;
      State.DST_COLOR = _gl.DST_COLOR;
      State.ONE_MINUS_DST_COLOR = _gl.ONE_MINUS_DST_COLOR;
      State.SRC_ALPHA = _gl.SRC_ALPHA;
      State.ONE_MINUS_SRC_ALPHA = _gl.ONE_MINUS_SRC_ALPHA;
      State.DST_ALPHA = _gl.DST_ALPHA;
      State.ONE_MINUS_DST_ALPHA = _gl.ONE_MINUS_DST_ALPHA
      State.CONSTANT_COLOR= _gl.CONSTANT_COLOR
      State.ONE_MINUS_CONSTANT_COLOR= _gl.ONE_MINUS_CONSTANT_COLOR;
      State.CONSTANT_ALPHA = _gl.CONSTANT_ALPHA;
      State.ONE_MINUS_CONSTANT_ALPHA= _gl.ONE_MINUS_CONSTANT_ALPHA;
      State.SRC_ALPHA_SATURATE = _gl.SRC_ALPHA_SATURATE;
      State.NEVER = _gl.NEVER;
      State.LESS = _gl.LESS;
      State.LEQUAL = _gl.LEQUAL;
      State.EQUAL = _gl.EQUAL;
      State.GREATER = _gl.GREATER;
      State.NOTEQUAL = _gl.NOTEQUAL;
      State.GEQUAL = _gl.GEQUAL;
      State.ALWAYS = _gl.ALWAYS;
      State.CW = _gl.CW;
      State.CCW = _gl.CCW;
      State.KEEP = _gl.KEEP;
      State.REPLACE = _gl.REPLACE;
      State.INCR = _gl.INCR;
      State.DECR = _gl.DECR;
      State.INVERT = _gl.INVERT;
      State.INCR_WRAP = _gl.INCR_WRAP;
      State.DECR_WRAP = _gl.DECR_WRAP;
      State.BLEND = _gl.BLEND;
      State.CULL_FACE = _gl.CULL_FACE;
      State.DEPTH_TEST = _gl.DEPTH_TEST;
      State.POLYGON_OFFSET_FILL = _gl.POLYGON_OFFSET_FILL;
      State.SAMPLE_ALPHA_TO_COVERAGE = _gl.SAMPLE_ALPHA_TO_COVERAGE;
      State.SAMPLE_COVERAGE = _gl.SAMPLE_COVERAGE;
      State.SCISSOR_TEST = _gl.SCISSOR_TEST;
      State.STENCIL_TEST = _gl.STENCIL_TEST;
      State.COLOR_BUFFER_BIT = _gl.COLOR_BUFFER_BIT;
      State.DEPTH_BUFFER_BIT = _gl.DEPTH_BUFFER_BIT;
      State.STENCIL_BUFFER_BIT = _gl.STENCIL_BUFFER_BIT;
*/
      State.glEnums = {};

      for (var propertyName in _gl) {
        if (typeof _gl[propertyName] == 'number' && propertyName[0] >= 'A') {
          State.glEnums[_gl[propertyName]] = propertyName;
          State[propertyName] = _gl[propertyName];
        }
      }

      State.canvasWidth = function(size) {
        if (!size) return _gl.canvas.width;
        else _gl.canvas.width = size;
      }

      State.canvasHeight = function (size) {
        if (!size) return _gl.canvas.height;
        else _gl.canvas.height = size;
      }
      State.isInitialized = true;

      // convert string to function
      State.fn = {
         "blendEnable":  State.setBlendEnable,
         "blendEquation": State.setBlendEquation,
         "blendEquationSeparate": State.setBlendEquationSeparate,
         "blendFunc": State.setBlendFunc,
         "blendFuncSeparate": State.setBlendFuncSeparate,
         "colorMask": State.setColorMask,
         "clearColor": State.setClearColor,
         "clear": State.clear,
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
      }

    // allocate shadred uniforms
    // also from rendermonkey:
    // ViewDirection, ViewPosition, ViewSideVector, ViewUpVector, FOV, NearClipPlane, FarClipPlane

      State.Uniforms = {
        WORLD: mat4.create(),
        WORLDINVERSE: mat4.create(),
        WORLDTRANSPOSE: mat4.create(),
        WORLDINVERSETRANSPOSE: mat4.create(),

        VIEW: mat4.create(),
        VIEWINVERSE: mat4.create(),
        VIEWTRANSPOSE: mat4.create(),
        VIEWINVERSETRANSPOSE: mat4.create(),

        PROJECTION: mat4.create(),
        PROJECTIONINVERSE: mat4.create(),
        PROJECTIONTRANSPOSE: mat4.create(),
        PROJECTIONINVERSETRANSPOSE: mat4.create(),

        WORLDVIEW: mat4.create(),
        WORLDVIEWINVERSE: mat4.create(),
        WORLDVIEWTRANSPOSE: mat4.create(),
        WORLDVIEWINVERSETRANSPOSE: mat4.create(),

        VIEWPROJECTION: mat4.create(),
        VIEWPROJECTIONINVERSE: mat4.create(),
        VIEWPROJECTIONTRANSPOSE: mat4.create(),
        VIEWPROJECTIONINVERSETRANSPOSE: mat4.create(),

        WORLDVIEWPROJECTION: mat4.create(),
        WORLDVIEWPROJECTIONINVERSE: mat4.create(),
        WORLDVIEWPROJECTIONTRANSPOSE: mat4.create(),
        WORLDVIEWPROJECTIONINVERSETRANSPOSE: mat4.create(),

        NORMAL: mat3.create(), // 3x3 version of WORLDVIEWINVERSETRANSPOSE

      };
      State.formatEnum = {
        FLOAT: {type: _gl.FLOAT, size:3},
        FLOAT_VEC2: {type: _gl.FLOAT, size:2},
        FLOAT_VEC3: {type: _gl.FLOAT, size:3},
        FLOAT_VEC4: {type: _gl.FLOAT, size:4}
      };

      State.formatFn = {
        FLOAT: _gl.vertexAttrib1f,
        FLOAT_VEC2: _gl.vertexAttrib2fv,
        FLOAT_VEC3: _gl.vertexAttrib3fv,
        FLOAT_VEC4: _gl.vertexAttrib4fv,
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

      // some State global values
      State.states = []; // list of all states that have been created
      State.programs = []; // list of all programs that have been created
      State.primitives = []; // list of all primitives that have been created
      State.textures = []; // list of textures that have been created

    }; 

    
    var state={}; 
    state.ID = State.states.length;
    State.states.push(state);

    state.program = null;  // this state does not have a program yet
    if (_gl) state.gl=_gl; else state.gl=null;

    // default state values

    State.setViewport(state,0,0,State.canvasWidth(), State.canvasHeight());
    state.viewportDirty = false;

    State.setBlendEnable(state,false);     // set value and apply if gl
    state.blendEnableDirty = false;  // state not modified

    State.setBlendEquation(state,State.FUNC_ADD); 
    state.blendEquationDirty = false;  

    State.setBlendEquationSeparate(state,State.FUNC_ADD, State.FUNC_ADD); 
    state.blendEquationSeparateDirty = false;

    State.setBlendFunc(state,State.ONE, State.ZERO);
    state.blendFuncDirty = false;

    State.setBlendFuncSeparate(state,State.ONE, State.ONE, State.ZERO, State.ZERO);
    state.blendFuncSeparateDirty = false;

    State.setColorMask(state,true,true,true,true);
    state.colorMaskDirty = false;

    State.setClearColor(state,0,0,0,0);
    state.clearColorDirty = false;

    State.setClear(State.COLOR_BUFFER_BIT | State.DEPTH_BUFFER_BIT | State.STENCIL_BUFFER_BIT);
    state.clearDirty = false;

    State.setCullFace(state,State.BACK);
    state.cullFaceDirty = false;

    State.setCullFaceEnable(state,true); // note gltf says default is false?
    state.cullFaceEnableDirty = false;

    State.setDepthFunc(state,State.LESS);
    state.depthFuncDirty = false;

    State.setDepthClear(state,1);
    state.depthClearDirty=false;

    State.setDepthMask(state,true);
    state.depthMaskDirty = false;

    State.setDepthRange(state,0., 1.);
    state.depthRangeDirty = false;

    State.setDepthTestEnable(state,true);
    state.depthTestDirty = false;

    State.setFrontFace(state,State.CCW);
    state.frontFaceDirty = false;

    State.setLineWidth(state,1.);
    state.lineWidthDirty = false;

    State.setPolygonOffset(state,0.,0.);
    state.polygonOffsetDirty = false;

    State.setPolygonOffsetFillEnable(state,true);
    state.polygonOffsetFillEnableDirty = false;

    State.setSampleAlphaToCoverageEnable(state,false);
    state.sampleAlphaToCoverageEnableDirty = false;

    State.setSampleCoverage(state,1.,false);
    state.sampleCoverageDirty = false;

    State.setSampleCoverageEnable(state,false);
    state.sampleCoverageEnableDirty=false;

    State.setScissor(state,0.,0.,0.,0.);
    state.scissorDirty = false;

    State.setScissorTestEnable(state,false);
    state.scissorTestEnableDirty = false;

    State.setStencilFunc(state,State.ALWAYS,0,0); 
    state.stencilfuncDirty = false;

    State.setStencilFuncSeparate(state,State.FRONT, State.ALWAYS, 0, 0);
    state.stencilFuncSeparateDirty = true;

    State.setStencilMask(state,0);
    state.stencilMaskDirty = false;

    State.setStencilOp(state,State.KEEP, State.KEEP, State.KEEP) ;
    state.stencilOpDirty = false;

    State.setStencilOpSeparate(state,State.FRONT_AND_BACK, State.KEEP, State.KEEP, State.KEEP);
    state.stencilOpSeparateDirty = false;

    State.setStencilTestEnable(state,false)
    state.stencilTestEnableDirty = false;


    return state;
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
  State.fromPassAndOverrides = function(_pass,_overrides) {
    var state = State.fromPass(_pass); // this state is not attached to a context

    // need to create uniform values for those overrides
    // possible to access those through API / semantic
    for (var overrideID in _overrides) {
      var override = _overrides[overrideID];
      if (state.program.uniforms[overrideID]) {
        // convert strings into gl enums
       if (override.type === 'SAMPLER_2D') {
          for (var key in override.value) {
            // only parameters of type 'string'
            if (typeof override.value[key] === 'string'){
                var translate = State[override.value[key]];
                if (translate) 
                    override.value[key] = translate;
                else
                    override.value[key] = override.value[key]
            } 
          }
        }
        State.setUniform(state,state.program.uniforms[overrideID], override.value);
      } else if (state.program.attributes[overrideID]) {
        RENDERER.logError('ERROR - need to write override of attributes')
      }
    }
    return state;
  };
  State.fromPass = function(_pass){

    var state = State.create(); // this state is not attached to a context
    state.program = {};

    state.program.vertexShader = _pass.vertexShader;
    state.program.fragmentShader = _pass.fragmentShader;

    state.program.compileMe = true;
    state.program.glProgram = null;

    state.program.attributes = _pass.attributes;
    /*
    for (var key in attributes) {
      var attribute = attributes[key];
      var semantic = attribute.semantic; // e.g. "NORMAL"       "TEXCOORD_0"     "POSITION"
      var symbol = attribute.symbol; // e.g.     "a_normal"     "a_texcoord0"    "a_position"
      var type = attribute.type; // e.g.         "FLOAT_VEC3"   "FLOAT_VEC2"     "FLOAT_VEC3"
    }
    */

    // todo - those can have a default value ?
    // todo -  move this to a function -> allocate uniformss

    State.allocateUniforms(state,_pass.uniforms);

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
    //State.compileProgram(state);
    return state;
  };

  State.allocateUniforms = function(_state,_uniforms) {
    var textureUnit=0;
    _state.program.uniforms={};
    
    for (var key in _uniforms){
      var uniform = _uniforms[key];
      var semantic = (uniform.semantic || key);  // so this loop works for arrays or object                    
      var symbol = uniform.symbol; 
      var type = uniform.type; 
      var value = uniform.value; 

      // special case because of glTF current state
      if (semantic === 'WORLDVIEWINVERSETRANSPOSE' && type === 'FLOAT_MAT3') 
        semantic = 'NORMAL';

      _state.program.uniforms[semantic] = {};

      // see if this is a special shared uniform
      if (State.Uniforms[semantic]) {
        value = new Float32Array(State.Uniforms[semantic].buffer);
      } else {
        // otherwise, allocate it for this state

        // TODO -- what about a new shared uniform?

        switch (type) {
          case 'FLOAT':
            if (!value) value = 0;
            break;
          case 'FLOAT_VEC2':
            if (!value) value=vec2.create(); else value=vec2.clone(value);
            break;
          case 'FLOAT_VEC3':
            if (!value) value=vec3.create(); else value=vec3.clone(value);
            break;
          case 'FLOAT_VEC4':
            if (!value) value=vec4.create(); else value=vec4.clone(value);
            break;
          case 'FLOAT_MAT3':
            if (!value) value=mat3.create(); else value=mat3.clone(value);
            break;
          case 'FLOAT_MAT4':
            if (!value) value=mat4.create(); else value=mat4.clone(value);
            break;
          case 'SAMPLER_2D':
            // assign a texture unit, setUniform will create the glTexture
            // TODO - is there a (value) passed in?
            if (value && value.textureUnit) {
              var newvalue={};
              newvalue.textureUnit = value.textureUnit;
              if (value.flipY) newvalue.flipY = value.flipY; else newvalue.flipY=false;
              value=newvalue;
            } else {
              value={};
              value.textureUnit = textureUnit++;
              value.flipY = false;
            }
            break;
          default:
            RENDERER.logError('unknown type '+type+' in State.fromPass')
            break;
        }
      }
      // create uniforms dictionary for this state
      _state.program.uniforms[semantic] = {
        symbol:symbol,
        type: type,
        value: value
      }
    }
  };
 State.createBasic = function(){

  var state;

  if (!State.createBasic.basicState) {
    // no gl context for basicState
    state = State.create(); 
    state.program = {}; // allocate new program for basicState

    state.program.vertexShader =  
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

    state.program.fragmentShader = 
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



    state.program.compileMe = true;
    state.program.glProgram = null;

    state.program.attributes = [ { semantic: 'POSITION', symbol: 'aVertex', type: 'FLOAT_VEC3' },
                                 { semantic: 'NORMAL', symbol: 'aNormal', type: 'FLOAT_VEC3'} ,
                                 { semantic: 'TEXCOORD_0', symbol: 'aTexCoord0', type: 'FLOAT_VEC2'},
                                 { semantic: 'COLOR', symbol: 'aColor', type: 'FLOAT_VEC4'}];

    var uniforms = [ { semantic: 'WORLDVIEW', symbol: 'uMVMatrix' , type: 'FLOAT_MAT4' },
                     { semantic: 'PROJECTION',  symbol: 'uPMatrix' , type: 'FLOAT_MAT4' },
                     { semantic: 'NORMAL', symbol: 'uNMatrix', type: 'FLOAT_MAT3'},
                     { semantic: 'diffuse', symbol: 'uTexture0', type: 'SAMPLER_2D' },
                     { semantic: 'alphaScale', symbol: 'uAlphaScale', type: 'FLOAT', value: 1}];

    State.allocateUniforms(state,uniforms);

    // note: those are default state create by channel
    //State.setBlendEnable(state,false);
    //State.setDepthMask(state,true);
    //State.setDepthTestEnable(state,true);

    State.compileProgram(state);
    State.createBasic.basicState = state;
  }
    state = State.clone(State.createBasic.basicState);
    return state;
  };
  
  State.clone = function(_state) {
    // create default state
    var state = State.create();
    // copy program
    if (_state.program) {
      var program = {};
      program.compileMe = _state.program.compileMe;
      program.glProgram = _state.program.glProgram;
      program.attributes = [];
      // copy everything except values?
      for (var i =0; i<_state.program.attributes.length;i++) {
          var attribute = _state.program.attributes[i];
          var newattribute = {}
          newattribute.location = attribute.location;
          newattribute.semantic = attribute.semantic;
          newattribute.symbol = attribute.symbol;
          newattribute.type = attribute.type;
          program.attributes.push(newattribute);
      }
      var uniforms = _state.program.uniforms;
    
      program.vertexShader = _state.program.vertexShader;
      program.fragmentShader = _state.program.fragmentShader;
      state.program = program;
      // alocate new values, copy old values in
      State.allocateUniforms(state,uniforms);
    }
    // copy state
    for (var key in _state) {
      var statelet=_state[key];
      if (key !== 'ID')
        if ((typeof statelet === 'number') || (typeof statelet === 'bool') || (statelet === undefined) || (statelet === null))
          state[key] = statelet;
    }
    return state;
  };

    State.createShader= function(_state,_shaderType, _shaderCode) {
      var gl=_state.gl;
      var shader = gl.createShader(_shaderType);
      if (shader == null) return null;
      gl.shaderSource(shader, _shaderCode);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          var error = gl.getShaderInfoLog(shader);
          RENDERER.logError("Error compiling shader:\n" + error);
          print(gl.getShaderInfoLog(shader));
          gl.deleteShader(shader);
          return null;
      }
      return shader;
  };
  State.applyProgram = function(_old,_new) {
    if (_old.program === _new.program) return;


    _old.program = _new.program;

    if (_old.program.compileMe) 
      State.compileProgram(_old);

    var gl = _old.gl;
    if (!gl) return;

    // call useProgram and remap attrbutes if there is a change
    if (_old.programinuse !== _old.program.glProgram) {
     _old.programinuse = _old.program.glProgram
     gl.useProgram(_old.program.glProgram);

     // unifom values need to be re-applied as we switched program

      for (var uniformID in _old.program.uniforms) {
        var uniform=_old.program.uniforms[uniformID];
        State.applyUniform(_old, uniform, uniform.value); // silly, copy value into itself ...  but then apply the change
      }
      
    } else {
      // apply uniforms if new values are different than old valies
    }
    

  },
  State.compileProgram = function(_state) {


    // search if that program already exists
    for (var i=0,len=State.programs.length;i<len;i++){
      var program = State.programs[i];
      if (program.vertexShader == _state.program.vertexShader && program.fragmentShader == _state.program.fragmentShader) {
        if (program.compileMe === true) {
          RENDERER.logError('this is impossible ... program should be compiled already')
        }
        // copy only what we need, so we don't erase Material specifics values
        _state.program.glProgram = program.glProgram;
        for (var i=0;i<program.attributes.length;i++) {
          _state.program.attributes[i].location = program.attributes[i].location;
          //if (program.value) _state.program.attributes[i].value = program.value;
        }

        for (var uniformID in program.uniforms) _state.program.uniforms[uniformID].location = program.uniforms[uniformID].location;
        _state.program.compileMe=false;

        return 
      }
    }
    var gl = _state.gl; 

    if (!gl) return _state.program;
    // note: do not delete the previous program as this is not the owner 
    // TODO - State:delete

    var glVertexShader = State.createShader(_state,gl.VERTEX_SHADER,_state.program.vertexShader); 
    var glFragmentShader = State.createShader(_state,gl.FRAGMENT_SHADER,_state.program.fragmentShader); 

    var glProgram = gl.createProgram();
    if (glProgram == null) 
      RENDERER.logError("Creating program failed");

    gl.attachShader(glProgram, glVertexShader);
    gl.attachShader(glProgram, glFragmentShader);

    gl.linkProgram(glProgram);


    if (!gl.getProgramParameter(glProgram, gl.LINK_STATUS) && !gl.isContextLost()) {
        RENDERER.logError(gl.getProgramInfoLog(glProgram));
    }


    var program = {};
    program.ID = State.programs.length; 
    program.glProgram = glProgram;
    program.vertexShader = _state.program.vertexShader;
    program.fragmentShader = _state.program.fragmentShader;
    program.compileMe = false;
    program.uniforms = _state.program.uniforms;
    program.attributes = _state.program.attributes;

    for (var i=0;i<program.attributes.length;i++)
    {
      var attribute = program.attributes[i];
      program.attributes[i].location = gl.getAttribLocation(glProgram, attribute.symbol);
    }
      
    // find uniforms location
    for (var uniformID in program.uniforms)
    {
      var uniform = program.uniforms[uniformID];
      program.uniforms[uniformID].location = gl.getUniformLocation(glProgram, uniform.symbol);
    }

    State.programs.push(program);

    _state.program = State.programs[program.ID];

    return _state.program;
  };


  State.setUniform=function(_state,_uniform,_value){
    // _semantic needs to match a semantic in the program
    var type = _uniform.type;

    var gl=_state.gl;
    switch (type){
      case 'FLOAT_VEC2':
        if (_uniform.value !== _value) {
          vec2.copy(_uniform.value, _value);    
          if (gl && _uniform.location) gl.uniform2fv(_uniform.location, _value);  
        }
        break;
      case 'FLOAT_VEC3':
        if (_uniform.value !== _value) {
          vec3.copy(_uniform.value, _value);
          if (gl && _uniform.location) gl.uniform3fv(_uniform.location, _value);
        }
        break;
      case 'FLOAT_VEC4':
        if (_uniform.value !== _value) {
          vec4.copy(_uniform.value, _value);
          if (gl && _uniform.location) gl.uniform4fv(_uniform.location, _value);
        }
        break;
      case 'FLOAT_MAT4':
        if (_uniform.value !== _value) {
          mat4.copy(_uniform.value, _value);
          if (gl && _uniform.location) gl.uniformMatrix4fv(_uniform.location, false, _value);
        }
        break;
      case 'FLOAT_MAT3':
        if (_uniform.value !== _value) { 
          mat3.copy(_uniform.value, _value);
          if (gl && _uniform.location) gl.uniformMatrix3fv(_uniform.location, false, _value);
        }
        break;
      case 'FLOAT':
        if (_uniform.value !== _value) {
          _uniform.value = _value;
          if (gl && _uniform.location) gl.uniform1f(_uniform.location, _value);
        }
        break;
      case 'SAMPLER_2D':
      /*  value is this object:
          "image": document.images[parameter.image],
          "magFilter": parameter.magFilter,
          "minFilter": parameter.minFilter,
          "wrapS": parameter.wrapS,
          "wrapT": parameter.wrapT};
          "glTexture" : texture created from image
          "textureUnit" : which texture unit to use
          "flipY": do we need to flip Y 
      */        
      if (_uniform.value !== _value) {
        for (key in _value) _uniform.value[key] = _value[key];
      }
      // keep trying until image is ready
      if (gl && !_uniform.value.glTexture) 
            State.createTextureBuffer(_state,_uniform);

      if (gl && _uniform.location)
        if (_uniform.value.glTexture) {
                gl.activeTexture(gl.TEXTURE0 + _uniform.value.textureUnit);
                gl.bindTexture(gl.TEXTURE_2D, _uniform.value.glTexture); 
                gl.uniform1i(_uniform.location, _uniform.value.textureUnit);
        } else {
                // texture is not ready, or there is no texture, let's use the default white texture
                gl.activeTexture(gl.TEXTURE0 + _uniform.value.textureUnit);
                gl.bindTexture(gl.TEXTURE_2D, State.whiteTexture); 
                gl.uniform1i(_uniform.location, _uniform.value.textureUnit);
        }
      break;
    default:
      RENDERER.logError('unknown type='+type+' in State.setUniform');
      return this;
      break;
    }

    State.applyUniform(_state,_uniform,_value);
  };


  State.applyUniform=function(_state,_uniform,_value){
    // _semantic needs to match a semantic in the program
    var gl=_state.gl;
    if (gl && _uniform.location) {
      var type = _uniform.type;

      switch (type){
        case 'FLOAT_VEC2':
          gl.uniform2fv(_uniform.location, _value);
          
          break;
        case 'FLOAT_VEC3':
          gl.uniform3fv(_uniform.location, _value);
          
          break;
        case 'FLOAT_VEC4':
          gl.uniform4fv(_uniform.location, _value);
          
          break;
        case 'FLOAT_MAT4':
             gl.uniformMatrix4fv(_uniform.location, false, _value);
          break;
        case 'FLOAT_MAT3':
              gl.uniformMatrix3fv(_uniform.location, false, _value);
          
          break;
        case 'FLOAT':
             gl.uniform1f(_uniform.location, _value);
          
          break;
        case 'SAMPLER_2D':
          if (_uniform.value.glTexture) {
            gl.activeTexture(gl.TEXTURE0 + _uniform.value.textureUnit);
            gl.bindTexture(gl.TEXTURE_2D, _uniform.value.glTexture); 
            gl.uniform1i(_uniform.location, _uniform.value.textureUnit);
           } else {
            // texture is not ready, or there is no texture, let's use the default white texture
            gl.activeTexture(gl.TEXTURE0 + _uniform.value.textureUnit);
            gl.bindTexture(gl.TEXTURE_2D, State.whiteTexture); 
            gl.uniform1i(_uniform.location, _uniform.value.textureUnit);
           }

        break;
      default:
        RENDERER.logError('unknown type='+type+' in State.applyUniform');
        return this;
        break;
      }
    }
  };
  State.createTextureBuffer = function(_state, _uniform) {

    var gl = _state.gl;
      if (!_uniform.value.glTexture) {
       var textureID = _uniform.value.path + (_uniform.value.flipY ? 'F' : 'f');
        if (State.textures[textureID])
          _uniform.value.glTexture = State.textures[textureID].glTexture;
        else {
          if (_uniform.value.image && _uniform.value.image.complete) {
            _uniform.value.glTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, _uniform.value.glTexture);
            if (_uniform.value.flipY)
             gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            else
             gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
             // load image
            gl.texImage2D(gl.TEXTURE_2D, /* level */ 0, /* internal format */ gl.RGBA, /* image format */ gl.RGBA, gl.UNSIGNED_BYTE, _uniform.value.image);
            //gl.generateMipmap(gl.TEXTURE_2D);
            if (_uniform.value.magFilter)
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, _uniform.value.magFilter);
            if (_uniform.value.minFilter)
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, _uniform.value.minFilter);
            if (_uniform.value.wrapS)
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, _uniform.value.wrapS);
            if(_uniform.value.wrapT)
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, _uniform.value.wrapT);
            // if not POT
            var width = _uniform.value.image.width;
            var height = _uniform.value.image.height;
            if (((width&(width-1)) === 0 ) && ((height&(height-1)) === 0)) {
              gl.generateMipmap(gl.TEXTURE_2D);
            } else {
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            }
            gl.bindTexture(gl.TEXTURE_2D,  null);
            State.textures[textureID] = { glTexture:_uniform.value.glTexture, 
                                                 image: _uniform.value.image, 
                                                 flipY: _uniform.value.flipY,
                                               };

          }
       }
     }
    
  };
  
  State.setModelView = (function() {
    var tmpmat3 = new Float32Array(9);

    return function (_state, _mv)  {
        State.setUniform(_state, _state.program.uniforms.WORLDVIEW, _mv);

        mat3.fromMat4(tmpmat3, _mv)
        mat3.transpose(tmpmat3,mat3.invert(tmpmat3,tmpmat3))
        if (_state.program.uniforms.NORMAL) 
          State.setUniform(_state,_state.program.uniforms.NORMAL, tmpmat3);

      return _state;
    }
  })();

  State.setViewProj= function (_state,_mat) { 

    State.setUniform(_state,_state.program.uniforms.PROJECTION, _mat);
    return _state;
  };
  
  State.setDiffuseTexture = function(_state,_textureUnit, _glTexture) {
    State.setUniform(_state, _state.program.uniforms.diffuse, params);
  
    return _state;
  };

  State.apply = function(_old, _new) {
    // apply program
    // FIXME - this is not good to copy uniforms and attributes by reference

    State.applyProgram(_old,_new);

    // TODO - optimize this.
    // issue is that if texture is not complete, then need to call this 
    // set values to uniform
    for (var uniformID in _old.program.uniforms) {
      var uniform=_old.program.uniforms[uniformID];

      State.setUniform(_old,uniform,uniform.value); // apply only if value changed ? ? ?

    }

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
      State.setClear(_new.clear);
  };

if(typeof(exports) !== 'undefined') {
    exports.State = State;
}

/// need state !?!
RENDERER.primitive = function(_vertices, _colors, _normals, _binormals, _texcoords, _indices, _state) { 

    this.clear();
    this.buffer = {};
    this.glBuffer = {};
    this.value = {};

    this.setprimitive(_vertices, _colors, _normals, _binormals, _texcoords, _indices);

    this.state = _state;

    // add primitive to list of primitives - needed for context loss
    this.primitiveID = State.primitives.length;
    State.primitives.push(this);
}

RENDERER.primitive.prototype = {
    delete: function () {
      this.clear();
      // remove this primitive from the list of primitives
      State.primitives.splice(State.primitiveID,1);
      // delete this
      this.primitiveID = -1;
    },
    clear: function () {
      this.prim = State.TRIANGLES;
      this.defaultVertex = [0, 0, 0]; 
      this.defaultNormal = [0, 0, 1]; 
      this.defaultBinormal = [0, 0, 1]; 
      this.defaultColor= [0.9, 0.9, 0.9, 0.9]; 
      this.defaultTexcoord = [0, 0]; 
      this.defaultID = 0; 
      this.hasColorBuffer = false; 
      this.numIndices = this.numVertices = 0; 

      // should we call gldeletebuffer?

      this.indexBuffer = this.indices = this.idBuffer = this.ids = this.texcoordsBuffer = null; 
      this.texcoords = this.binormalBuffer = this.binormals = this.normalBuffer = this.normals = null; 
      this.colorBuffer = this.colors = this.vertexBuffer = this.vertices = null; 

      this.updateMe = this.createMe = false; 
      this.numIndices = this.numVertices = 0;

    },
    setprimitive: function (_vertices, _colors, _normals, _binormals, _texcoords, _indices) {

        if (_vertices) {
          this.vertices = _vertices;
          this.numVertices = this.vertices.length/3;
          this.buffer.POSITION = this.vertices;
          delete this.value.POSITION;
        } else {
          this.vertices = this.defaultVertex;
          this.numVertices = 1;
          this.value.POSITION = this.vertices;
          delete this.buffer.POSITION;
        }


        if (_colors ) {
          this.colors = _colors;
          this.buffer.COLOR = this.colors;
          delete this.value.COLOR;
        } else {
          this.colors = this.defaultColor;
          this.value.COLOR = this.colors;
          delete this.buffer.COLOR;
        }

        if (_normals) {
          this.normals = _normals;
          this.buffer.NORMAL = this.normals;
          delete this.value.NORMAL;
        } else {
          this.normals = this.defaultNormal;
          delete this.buffer.NORMAL;
          this.value.NORMAL = this.normals;
        }

        if (_binormals  ) {
          this.binormals = _binormals;
          this.buffer.BINORMAL = this.binormals
          delete this.value.BINORMAL;
        } else {
          this.binormals = this.defaultBinormal;
          delete this.buffer.BINORMAL;
          this.value.BINORMAL = this.binormals;
        }

        if (_texcoords) {
          this.texcoords = _texcoords;
          this.buffer.TEXCOORD_0 = this.texcoords;
          delete this.value.TEXCOORD_0;
        } else {
          this.texcoords = this.defaultTexcoord;
          delete this.buffer.TEXCOORD_0;
          this.value.TEXCOORD_0 = this.texcoords;
        }
 
        if (_indices ) {
          this.indices = _indices, this.numIndices=_indices.length;
          this.buffer.INDEX = _indices;
        } else {

          this.indices = null;
          delete this.buffer.INDEX;
        }

        this.createMe=true;
    },
    // separate function to be called in context loss
    createAttributeBuffers: function(_state){
      var gl=_state.gl;
      if (!gl) return _state;
      for (var i=0,len = _state.program.attributes.length; i<len;i++){
        var attribute = _state.program.attributes[i];
        if (this.buffer[attribute.semantic])
        {
          this.glBuffer[attribute.semantic] = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffer[attribute.semantic]);
          gl.bufferData(gl.ARRAY_BUFFER, this.buffer[attribute.semantic], gl.STATIC_DRAW);
        } 
      }
      // special case for indexes, they are not referenced by the program directly
      if (this.buffer.INDEX) {
            this.glBuffer.INDEX = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.glBuffer.INDEX);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.buffer.INDEX, gl.STATIC_DRAW);
        };
        this.createMe = false; 
        this.updateMe = false;
    },

    getNumPrims: function () {
        return this.numIndices > 0 
          ? this.numIndices / 3 
          : this.numVertices / 3 
    },
    updateAttributeBuffers: function(_state) {
      var gl = _state.gl;
      if (!gl) return _state;

      for (var i=0,len=_state.program.attributes;i<len;i++)
      {
        var attribute = _state.program.attributes[i];
        if (this.glBuffer[attribute.semantic] ) {
           gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffer[attribute.semantic]);
           gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.buffer[attribute.semantic]);
        } 
      }
      // special case for index
      if (this.glBuffer.INDEX) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.glBuffer.INDEX);
        gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, this.buffer.INDEX);
      }
      this.updateMe = false;
    },
    // this take a primitive (this), applies _state, and render to channel

    render: function(_channel) {

      var state = this.state;
      var gl = _channel.state.gl;
        if (0 !== this.numVertices) {

          // this deals with gl states and uniforms
          State.apply(_channel.state,state);

          if(this.createMe === true)
              this.createAttributeBuffers(_channel.state);
          if (this.updateMe === true) 
              this.updateAttributeBuffers(_channel.state);

          // deal with attributes, they point to the primitive buffers
          // need to add possible override ?

          for (var i=0,len=_channel.state.program.attributes.length;i<len;i++) {
            var attribute = _channel.state.program.attributes[i];
            if (attribute.location>=0) {
              // if this attribute is connected to an array
              if (this.glBuffer[attribute.semantic]) {            
                gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffer[attribute.semantic]);
                gl.enableVertexAttribArray(attribute.location);
                gl.vertexAttribPointer(attribute.location, State.formatEnum[attribute.type].size, State.formatEnum[attribute.type].type, false, 0, 0);
              
              // if the material overide the primitive settings
              } else if (attribute.value) {
                 State.formatFn[attribute.type](attribute.location, attribute.value);
              // get value from the primitive
              } else {
                State.formatFn[attribute.type](attribute.location,this.value[attribute.semantic]); 
              }
            }        
          }

          
          if (this.glBuffer.INDEX) {
              gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.glBuffer.INDEX);
              gl.drawElements(this.prim, this.numIndices, gl.UNSIGNED_SHORT, 0);
          } else
              gl.drawArrays(this.prim, 0, this.numVertices);

          for (var i=0,len=state.program.attributes.length;i<len;i++)
            gl.disableVertexAttribArray(i);
        }

    },
};

}).call(this);
