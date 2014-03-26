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
/// 'use strict'; problem witd defining function inside test
define(['state'], function (State) {
  var Channel=  {};

  // active channel
  Channel.active=null;

  Channel.create = function(_canvas, _debug) {

     
      var ctx = WebGLUtils.setupWebGL(_canvas);
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
        WebGLDebugUtils.init(ctx);
      }

      _canvas.addEventListener('webglcontextlost', Channel.handleContextLost.bind(gl), false);
      _canvas.addEventListener('webglcontextrestored', Channel.handleContextRestored.bind(gl), false);

      // create a channel object with an immediate state
      var channel={};
      channel.gl = gl;
      channel.state =  State.create(gl);
      Channel.active = channel;

      //Channel.initPickBuffer(channel);
      
      // keep track of vertexArrayAttrib enable/disable for lazy evaluation
      channel.VertexAttribBool = {};

      return channel;

    };

    // private function
    function resizeCanvas(_channel) {

      var canvas = _channel.gl.canvas;
       
      var devicePixelRatio = window.devicePixelRatio || 1;
      var width = canvas.clientWidth * devicePixelRatio;
      var height = canvas.clientHeight * devicePixelRatio;

       // only change the size of the canvas if the size it's being displayed
       // has changed.
       if (canvas.width != width ||
           canvas.height != height) {
         // Change the size of the canvas to match the size it's being displayed
         canvas.width = width;
         canvas.height = height;

         State.setViewport(_channel.state, 0, 0, width, height);
       }

    };

  Channel.handleContextLost= function(e) {
        // this is bind to then channel that lost its context
        RENDERER.logError("handle context lost");
        e.preventDefault();
    };

  Channel.handleContextRestored = function() {
        // this is bind to the channel that got its context back
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


    // todo -> set sky/earth ...
    Channel.clear=function(_channel, _c){
      var state = _channel.state;

      resizeCanvas(_channel);

      if (_c !== undefined)
        State.setClearColor(state, _c[0], _c[1], _c[2], _c[3]);
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
    
    Channel.initPickBuffer = function(_channel) 
    {
      var gl = _channel.gl;



        _channel.rttFramebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, _channel.rttFramebuffer);
        _channel.rttFramebuffer.width = 512;
        _channel.rttFramebuffer.height = 512;

        _channel.rttTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, _channel.rttTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, _channel.rttFramebuffer.width, _channel.rttFramebuffer.height,
            0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        var renderbuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, _channel.rttFramebuffer.width, _channel.rttFramebuffer.height);

        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, _channel.rttTexture, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);

        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    }

    Channel.pickMode = function(_channel,_bool,_x,_y)
    {
      var gl = _channel.gl;
     

      
      _channel.picking = _bool;
      if (_bool) {
        //gl.bindFramebuffer(gl.FRAMEBUFFER, channel.rttFramebuffer);
      } else {
        // Read Pixel Color
        var x=_x*_channel.gl.canvas.width;
        var y=_y*_channel.gl.canvas.height; 
        var PixelColor= new Uint8Array(4);
        gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,PixelColor);
//console.log('pick x='+x+' y='+y+"color=",PixelColor);
        //gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return PixelColor[0]+(PixelColor[1]<<8)+(PixelColor[2]<<16);
        
      }
    }
  return Channel;

});
