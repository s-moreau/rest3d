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

// extend math library with deg2rad if needed
define("camera", (function (global) {

  if (!Math.deg2rad) {
    Math.deg2rad = function (_deg) {
      return .0174532925 * _deg;
    }
  }

  Camera = this.Camera = {};

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
  
return function () {
        return global.Camera;
    };
}(this)));