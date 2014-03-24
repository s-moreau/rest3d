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

/*
  renderer.js needs webgl-utils.js and webgl-debug.js
  gl-matrix and gl-matrix-extended
  textureloader
*/
"use strict";
define(['glmatrixExt'], function () {
  
  var RENDERER = {};
  RENDERER.default = {
    POSITION :new Float32Array([0, 0, 0]),
    NORMAL : new Float32Array([0, 0, 1]),
    BINORMAL : new Float32Array([0, 0, 1]),
    COLOR : new Float32Array([1, 1, 1, 1]),
    TEXCOORD_0 : new Float32Array([0, 0])
  };


  // log wrapper
  RENDERER.log = function(_msg) {
    if (console && console.log) console.log(_msg);
  };
  // log error wrapper
    // throw msg ??
  RENDERER.logError = function (msg) {
    if (console && console.logError) console.logError(msg);
    else if (console && console.error) console.error(msg);
    else RENDERER.log('ERROR ' + msg);

  };

  RENDERER.primitive = function(_primitive, _state) { 

    this.clear();
    
    // TODO call gldeletebuffer
    this.glBuffer = {};

    this.setprimitive(_primitive);

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
    // todo - create static default values in function constructor
    clear: function () {
      this.prim = State.TRIANGLES;
      this.value = {};


      this.buffer = {};

      this.value.POSITION = RENDERER.default.POSITION; 
      this.value.NORMAL = RENDERER.default.NORMAL;
      this.value.BINORMAL = RENDERER.default.BINORMAL;
      this.value.COLOR= RENDERER.default.COLOR;
      this.value.TEXCOORD_0 = RENDERER.default.TEXCOORD_0;

      this.numVertices = 1;
      this.numIndices  = 0; 

      this.updateMe = this.createMe = true; 

    },
    setprimitive: function (_primitive) {

      for (var key in _primitive) {
        switch (key) {
          case 'POSITION':
            if (_primitive.POSITION) {
              this.buffer.POSITION  = _primitive.POSITION;
              this.numVertices = _primitive.POSITION.length/3;
              delete this.value.POSITION;
            } else {
              this.vertices = RENDERER.default.POSITION;
              this.numVertices = 1;
              this.value.POSITION = this.vertices;
              delete this.buffer.POSITION;
            }
            break;
          case 'INDEX':
            if (_primitive.INDEX) {
              this.numIndices=_primitive.INDEX.length;
              this.buffer.INDEX = _primitive.INDEX;
            } else {    
              delete this.buffer.INDEX;
              this.numIndices  = 0; 
            }
            break;
          default:
            if (_primitive[key]){
              this.buffer[key] = _primitive[key];
              if (this.value[key])
                delete this.value[key];
            } else {
              this.value[key] = RENDERER.default[key];
              if (this.buffer[key])
                delete this.buffer[key];
            }
        }
      }

      this.createMe=true;
    },
    // separate function to be called in context loss
    createAttributeBuffers: function(_state){
      var gl=_state.gl;
      if (!gl) return _state;
      for (var semantic in _state.program.attributes)
      {
        if (this.buffer[semantic])
        {
          this.glBuffer[semantic] = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffer[semantic]);
          gl.bufferData(gl.ARRAY_BUFFER, this.buffer[semantic], gl.STATIC_DRAW);
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

      for (var semantic in _state.program.attributes){
        if (this.glBuffer[semantic] ) {
           gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffer[semantic]);
           gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.buffer[semantic]);
        } 
      }
      // special case for index
      if (this.glBuffer.INDEX) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.glBuffer.INDEX);
        gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, this.buffer.INDEX);
      }
      this.updateMe = false;
    },
    // optimize VertexAttrib
    VertexAttribBool: {},
    // this take a primitive (this), applies _state, and render to channel
    render: function(_channel) {

      var state = this.state;
      var gl = _channel.state.gl;

      if (_channel.picking) {
        state = State.pickState; 
        state.values.color = this.pickColor;
      } else if (_channel.selected && _channel.selected[this.pickID] !== true)
      {
          state = State.greyState;
      }

      if (0 !== this.numVertices) {

        // this deals with gl states and uniforms
        State.apply(_channel.state,state);

        if(this.createMe === true)
            this.createAttributeBuffers(_channel.state);
        if (this.updateMe === true) 
            this.updateAttributeBuffers(_channel.state);

        // deal with attributes, they point to the primitive buffers
        // need to add possible override ?

        for (var semantic in _channel.state.program.attributes) {
          var attribute = _channel.state.program.attributes[semantic];
          if (attribute.location>=0) {
            // if this attribute is connected to an array
            if (this.glBuffer[semantic]) {            
              
              // enable if not already enabled, or if marked for disable
              if (_channel.VertexAttribBool[attribute.location] === undefined) 
                gl.enableVertexAttribArray(attribute.location); 
              _channel.VertexAttribBool[attribute.location] = true;

              // todo - create State.bindBuffer() to optimize this
              gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffer[semantic]);
              
              switch (attribute.type) {
                case gl.FLOAT:
                  gl.vertexAttribPointer(attribute.location, 1, gl.FLOAT, false, 0, 0);
                  break;
                case gl.FLOAT_VEC2:
                  gl.vertexAttribPointer(attribute.location, 2, gl.FLOAT, false, 0, 0);
                  break;
                case gl.FLOAT_VEC3:
                  gl.vertexAttribPointer(attribute.location, 3, gl.FLOAT, false, 0, 0);
                  break;
                case gl.FLOAT_VEC4:
                  gl.vertexAttribPointer(attribute.location, 4, gl.FLOAT, false, 0, 0);
                  break;
              }
            // if the material overide the primitive settings
            } else {
              // lazy disable - if it was enabled, or marked for disable
              if (_channel.VertexAttribBool[attribute.location] !== undefined) {
                gl.disableVertexAttribArray(attribute.location); 
                delete _channel.VertexAttribBool[attribute.location];
              }

              // per state value if exists, then per program value, then per primitive value
              var value = state.values[semantic] || attribute.value || this.value[semantic] || RENDERER.default[semantic];
              switch (attribute.type) {
                case gl.FLOAT:
                  gl.vertexAttrib1f(attribute.location, value);
                  break;
                case gl.FLOAT_VEC2:
                  gl.vertexAttrib2fv(attribute.location, value);
                  break;
                case gl.FLOAT_VEC3:
                  gl.vertexAttrib3fv(attribute.location, value);
                  break;
                case gl.FLOAT_VEC4:
                  gl.vertexAttrib4fv(attribute.location, value);
                  break;
                }
              }
          }        
        }

        // flush remeining disable attributes
        for (var location in _channel.VertexAttribBool) {
          if (_channel.VertexAttribBool[location] === false) {
            delete _channel.VertexAttribBool[location] ;
            gl.disableVertexAttribArray(location);
          }
        }
        
        if (this.glBuffer.INDEX) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.glBuffer.INDEX);
            gl.drawElements(this.prim, this.numIndices, gl.UNSIGNED_SHORT, 0);
        } else
            gl.drawArrays(this.prim, 0, this.numVertices);

        // lazy vertex attrib disable
        for (var location in _channel.VertexAttribBool) 
          _channel.VertexAttribBool[location] = false; 
        
      }

    }
  };

  return RENDERER;
});
