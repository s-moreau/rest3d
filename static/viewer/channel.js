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

Channel= {};

  Channel.create = function(_canvas, _debug) {
      this.canvas = _canvas;

      var devicePixelRatio = window.devicePixelRatio || 1;
 
      // set the size of the drawingBuffer based on the size it's displayed.
      this.canvas.width = _canvas.clientWidth * devicePixelRatio;
      this.canvas.height = _canvas.clientHeight * devicePixelRatio;

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

      State.setClearColor(state, 0.5, 0.5, 0.5, 1);
      State.setScissorTestEnable(state, false);
      State.setDepthClear(state, 1.);
      State.setClear(state, State.COLOR_BUFFER_BIT | State.DEPTH_BUFFER_BIT);


      //State.setDepthTestEnable(state, true);
      State.setDepthFunc(state, State.LESS);
        

      //State.setScissorTestEnable(state,true);
      //State.setScissor(state, 1, 1, State.canvasWidth() - 2, State.canvasHeight() - 2);
      //State.setClearColor(state, 0, 1, 0, 1);
      //State.setClear(state, State.COLOR_BUFFER_BIT);

  };


  if(typeof(exports) !== 'undefined') {
      exports.Channel = Channel;
  }

