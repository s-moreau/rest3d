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

// Here's a simple webGL  renderer

// if (window.WebGLUtils === undefined) {
//     document.write('<script src="/deps/webgl-utils.js"><\/' + 'script>');
//     document.write('<script src="/deps/webgl-debug.js"><\/' + 'script>');
// }

// if (window.mat4 === undefined)
// {
//     document.write('<script src="/deps/gl-matrix.js"><\/'+'script>');
//     document.write('<script src="/loaders/gl-matrix-ext.js"><\/'+'script>');
// }

/*
if (window.TextureUtil === undefined)
{
    document.write('<script src="/deps/texture-util.min.js"><\/'+'script>');
}
*/
define("renderer", (function (global) {
  // Initial Setup
  // -------------

  // Save a reference to the global object (`window` in the browser, `exports`
  // on the server).
  // var root = this;
  // The top-level namespace. All public COLLADA classes and modules will
  // be attached to this. Exported for both CommonJS and the browser.
  var RENDERER = this.RENDERER = {};
  // if (typeof exports !== 'undefined') {
  //   RENDERER = exports;
  // } else {
  //   RENDERER = root.RENDERER = {};
  // } 


  
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
      this.defaultVertex = new Float32Array([0, 0, 0]); 
      this.defaultNormal = new Float32Array([0, 0, 1]); 
      this.defaultBinormal = new Float32Array([0, 0, 1]); 
      this.defaultColor= new Float32Array([1, 1, 1, 1]); 
      this.defaultTexcoord = new Float32Array([0, 0]); 
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
              if (_channel.VertexAttribBool[attribute.location] !== undefined) {
                gl.disableVertexAttribArray(attribute.location); 
                delete _channel.VertexAttribBool[attribute.location];
              }

              // per state value if exists, then per program value
              var value = state.values[semantic] || attribute.value || this.value[semantic];
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

        for (var location in _channel.VertexAttribBool) 
          _channel.VertexAttribBool[location] = false; // lazy disable
        
      }

    }
};

return function () {
        return global.RENDERER;
    };
}(this)));
