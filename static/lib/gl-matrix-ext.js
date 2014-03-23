/*

gl-matrix-ext.js

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

 this provide some extensions to the gl-matrix.js library.
 it also grew to include Axis Aligned Bounding Boxes, that probably should be 
 moved in its own file
*/
  "use strict";

define(['glmatrix'], function(glmatrix){

// defines glmatrix as globals
for (var key in glmatrix) {
  window[key] = glmatrix[key];
}

var clamp = function(number,min, max) {
  return Math.min(Math.max(number, min), max);
};//

vec3.getColumnFromMat4 = function(out, mat,col)
{
    return vec3.set(out, mat[col],mat[col+4],mat[col+8]);
};

vec3.getColumnFromMat3 = function(out, mat,col)
{
    return vec3.set(out, mat[col],mat[col+3],mat[col+6]);
};

vec3.getRowFromMat3 = function(out, mat,row)
{
    return vec3.set(out, mat[row*3],mat[row*3+1],mat[row*3+2]);
};


vec3.getRowFromMat4 = function(out, mat,row)
{
    return vec3.set(out, mat[row*4],mat[row*4+1],mat[row*4+2]);
};
/*
quat.getRotationfromMat4 = function() {
    var tmp1=vec3.create();
    var tmp2=vec3.create();
    return function(out, mat)
    {
        return quat.rotationTo(
                out,
                vec3.getRowFromMat4(tmp1,mat,2), 
                vec3.getRowFromMat4(tmp2,mat,1)
            );
    };
}();
*/
/**
 * Creates a quaternion from the given 3x3 rotation matrix.
 *
 * NOTE: The resultant quaternion is not normalized, so you should be sure
 * to renormalize the quaternion yourself where necessary.
 *
 * @param {quat} out the receiving quaternion
 * @param {mat3} m rotation matrix
 * @returns {quat} out
 * @function
 */
quat.fromMat4 = function(out, m) {
    // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
    // article "Quaternion Calculus and Fast Animation".
    var fTrace = m[0] + m[5] + m[10];
    var fRoot;

    if ( fTrace > 0.0 ) {
        // |w| > 1/2, may as well choose w > 1/2
        fRoot = Math.sqrt(fTrace + 1.0);  // 2w
        out[3] = 0.5 * fRoot;
        fRoot = 0.5/fRoot;  // 1/(4w)
        out[0] = (m[9]-m[6])*fRoot;
        out[1] = (m[2]-m[8])*fRoot;
        out[2] = (m[4]-m[1])*fRoot;
    } else {
        // |w| <= 1/2
        var i = 0;
        if ( m[5] > m[0] )
          i = 1;
        if ( m[10] > m[i*4+i] )
          i = 2;
        var j = (i+1)%3;
        var k = (i+2)%3;
        
        fRoot = Math.sqrt(m[i*4+i]-m[j*4+j]-m[k*4+k] + 1.0);
        out[i] = 0.5 * fRoot;
        fRoot = 0.5 / fRoot;
        out[3] = (m[k*4+j] - m[j*4+k]) * fRoot;
        out[j] = (m[j*4+i] + m[i*4+j]) * fRoot;
        out[k] = (m[k*4+i] + m[i*4+k]) * fRoot;
    }
    
    return out;
};

vec3.getScaleFromMat4 = function() {

    var tmp1=vec3.create();
    var tmp2=vec3.create();
    var tmp3=vec3.create();

    return function(out, mat)
    {
        return vec3.set( out,
            vec3.length(vec3.getColumnFromMat4(tmp1,mat,0)),
            vec3.length(vec3.getColumnFromMat4(tmp2,mat,1)),
            vec3.length(vec3.getColumnFromMat4(tmp3,mat,2))
            );
    };
}();

vec3.getTranslationFromMat4 = function(out, mat)
{
    return vec3.set(out,mat[12],mat[13],mat[14]);
};

mat4.fromTrs = function (out, trs) {
    
    // Quaternion math
    var q = trs.rotation;
    var s = trs.scale;
    var v = trs.translation;

    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        sx = s[0],
        sy = s[1],
        sz = s[2],

        xx = x * x2,
        xy = x * y2,
        xz = x * z2,
        yy = y * y2,
        yz = y * z2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = sx*(1 - (yy + zz));
    out[4] = sx*(xy + wz);
    out[8] = sx*(xz - wy);
    out[3] = 0;
    out[1] = sy*(xy - wz);
    out[5] = sy*(1 - (xx + zz));
    out[9] = sy*(yz + wx);
    out[7] = 0;
    out[2] = sz*(xz + wy);
    out[6] = sz*(yz - wx);
    out[10] = sz*(1 - (xx + yy));
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    
    return out;
};
/**
 * Calculates the square distance between two n dimention elements
 */
mat4.squaredDistance = function(a, b) {
    var c = b[0] - a[0],
        d = b[1] - a[1],
        e = b[2] - a[2],
        f = b[3] - a[3],
        g = b[4] - a[4],
        h = b[5] - a[5],
        i = b[6] - a[6],
        j = b[7] - a[7],
        k = b[8] - a[8],
        l = b[9] - a[9],
        m = b[10] - a[10],
        n = b[11] - a[11],
        o = b[12] - a[12],
        p = b[13] - a[13],
        q = b[14] - a[14],
        r = b[15] - a[15];

    return c*c+d*d+e*e+f*f+g*g+h*h+i*i+j*j+k*k+l*l+m*m+n*n+o*o+p*p+q*q+r*r;
};

mat3.squaredDistance = function(a, b) {
    var c = b[0] - a[0],
        d = b[1] - a[1],
        e = b[2] - a[2],
        f = b[3] - a[3],
        g = b[4] - a[4],
        h = b[5] - a[5],
        i = b[6] - a[6],
        j = b[7] - a[7],
        k = b[8] - a[8];

    return c*c+d*d+e*e+f*f+g*g+h*h+i*i+j*j+k*k;
};


// TODO - a aabb = null should be same as infinite small aabb
 window.aabb = {};

// create a new bounding box that includes all the give vertices
 aabb.fromPositions = function(_positions) {
    var out = {};
    var min = vec3.fromValues(Infinity, Infinity, Infinity);
    var max = vec3.fromValues(-Infinity, -Infinity, -Infinity);
    for (var i=0, j=0, len=_positions.length;i<len;i+=3)
    {
        max[0]=Math.max(max[0],_positions[j]);
        min[0]=Math.min(min[0],_positions[j++]);
        max[1]=Math.max(max[1],_positions[j]);
        min[1]=Math.min(min[1],_positions[j++]);
        max[2]=Math.max(max[2],_positions[j]);
        min[2]=Math.min(min[2],_positions[j++]);
    }

    out.min = min;
    out.max = max;

    out.center = vec3.fromValues((max[0]+min[0])/2.,(max[1]+min[1])/2.,(max[2]+min[2])/2.);
    out.size  = Math.max(max[0]-min[0],Math.max(max[1]-min[1],max[2]-min[2]));

    return out;
};

aabb.fromVec3Array = function(_array){
    var out = {};
    var min = vec3.fromValues(Infinity, Infinity, Infinity);
    var max = vec3.fromValues(-Infinity, -Infinity, -Infinity);
    for (var i=0, len=_array.length;i<len;i++)
    {
        max[0]=Math.max(max[0],_array[i][0]);
        min[0]=Math.min(min[0],_array[i][0]);
        max[1]=Math.max(max[1],_array[i][1]);
        min[1]=Math.min(min[1],_array[i][1]);
        max[2]=Math.max(max[2],_array[i][2]);
        min[2]=Math.min(min[2],_array[i][2]);
    }

    out.min = min;
    out.max = max;

    out.center = vec3.fromValues((max[0]+min[0])/2.,(max[1]+min[1])/2.,(max[2]+min[2])/2.);
    out.size  = Math.max(max[0]-min[0],Math.max(max[1]-min[1],max[2]-min[2]));

    return out;
}

// this allocate an infinite small aabb


aabb.empty = function(out) {
    if (!out)  out={}; 
    out.min = vec3.fromValues(Infinity, Infinity, Infinity);
    out.max = vec3.fromValues(-Infinity, -Infinity, -Infinity);
    out.center = vec3.create();
    out.maxdim = -Infinity;
    return out;
};
aabb.create = aabb.empty ;

aabb.copy = function(out,a) {

    vec3.copy(out.max,a.max);
    vec3.copy(out.min,a.min);
    vec3.copy(out.center,a.center);
    out.maxdim = a.maxdim;
    return out;
};

aabb.clone = function(a) {
    return aabb.fromMinMax(a.min, a.max);
},

// this calculate the bounding box that includes two bounding boxes
aabb.add = function(out,a,b) {

    out.max[0] = Math.max(a.max[0],b.max[0]);
    out.max[1] = Math.max(a.max[1],b.max[1]);
    out.max[2] = Math.max(a.max[2],b.max[2]);
    out.min[0] = Math.min(a.min[0],b.min[0]);
    out.min[1] = Math.min(a.min[1],b.min[1]);
    out.min[2] = Math.min(a.min[2],b.min[2]);

    out.center= vec3.fromValues((out.max[0]+out.min[0])/2., (out.max[1]+out.min[1])/2., (out.max[2]+out.min[2])/2.);
    out.maxdim = Math.max(out.max[0]-out.min[0],Math.max(out.max[1]-out.min[1],out.max[2]-out.min[2]));

    return out;
}

// create a new bounding box that matches the min and max vectors
aabb.fromMinMax = function(_min, _max){
    var out = {};
    out.min = vec3.clone(_min);
    out.max = vec3.clone(_max);
    out.center = vec3.fromValues((out.max[0]+out.min[0])/2., (out.max[1]+out.min[1])/2., (out.max[2]+out.min[2])/2.);
    out.maxdim = Math.max(out.max[0]-out.min[0],Math.max(out.max[1]-out.min[1],out.max[2]-out.min[2]));

    return out;
}

// multiply bbox _in with mat4 _m
aabb.transform = function(_out, _in, _m) {

    if (_in.maxdim === -Infinity) { aabb.empty(_out); return _out;}
    var x_max = _in.max[0], y_max = _in.max[1], z_max = _in.max[2];
    var x_min = _in.min[0], y_min = _in.min[1], z_min = _in.min[2];


    _out.max[0] = Math.max(_m[0] * x_max, _m[0] * x_min) + Math.max(_m[4] * y_max, _m[4] * y_min) + Math.max(_m[8] * z_max, _m[8] * z_min) + _m[12];
    _out.max[1] = Math.max(_m[1] * x_max, _m[1] * x_min) + Math.max(_m[5] * y_max, _m[5] * y_min) + Math.max(_m[9] * z_max, _m[9] * z_min) + _m[13];
    _out.max[2] = Math.max(_m[2] * x_max, _m[2] * x_min) + Math.max(_m[6] * y_max, _m[6] * y_min) + Math.max(_m[10] * z_max, _m[10] * z_min)+ _m[14];

    _out.min[0] = Math.min(_m[0] * x_max, _m[0] * x_min) + Math.min(_m[4] * y_max, _m[4] * y_min) + Math.min(_m[8] * z_max, _m[8] * z_min) + _m[12];
    _out.min[1] = Math.min(_m[1] * x_max, _m[1] * x_min) + Math.min(_m[5] * y_max, _m[5] * y_min) + Math.min(_m[9] * z_max, _m[9] * z_min) + _m[13];
    _out.min[2] = Math.min(_m[2] * x_max, _m[2] * x_min) + Math.min(_m[6] * y_max, _m[6] * y_min) + Math.min(_m[10] * z_max, _m[10] * z_min)+ _m[14];

/* the code above is doing the same as this, but much faster
    var pt0 = vec3.transformMat4(new Float32Array(3),vec3.fromValues( x_min, y_min, z_min), _m);
    var pt1 = vec3.transformMat4(new Float32Array(3),vec3.fromValues( x_max, y_min, z_min), _m);
    var pt2 = vec3.transformMat4(new Float32Array(3),vec3.fromValues( x_min, y_max, z_min), _m);
    var pt3 = vec3.transformMat4(new Float32Array(3),vec3.fromValues( x_max, y_max, z_min), _m);
    var pt4 = vec3.transformMat4(new Float32Array(3),vec3.fromValues( x_min, y_min, z_max), _m);
    var pt5 = vec3.transformMat4(new Float32Array(3),vec3.fromValues( x_max, y_min, z_max), _m);
    var pt6 = vec3.transformMat4(new Float32Array(3),vec3.fromValues( x_min, y_max, z_max), _m);
    var pt7 = vec3.transformMat4(new Float32Array(3),vec3.fromValues( x_max, y_max, z_max), _m);

    var test=aabb.fromVec3Array([pt0,pt1,pt2,pt3,pt4,pt5,pt6,pt7]);
*/

    vec3.set(_out.center,(_out.max[0]+_out.min[0])/2., (_out.max[1]+_out.min[1])/2., (_out.max[2]+_out.min[2])/2.);
    _out.maxdim = Math.max(_out.max[0]-_out.min[0],Math.max(_out.max[1]-_out.min[1],_out.max[2]-_out.min[2]));

    return _out;
}
/*
            An Efficient and Robust Ray–Box Intersection Algorithm  
            Amy Williams Steve Barrus R. Keith Morley Peter Shirley University of Utah
            Non optimized version
*/
aabb.intersect = function(_bbox, _origin, _direction) {

    var X = 0;
    var Y = 1;
    var Z = 2;
    var tmin, tmax;
    var tymin, tymax;
    var tzmin, tzmax;
    

    var min = _bbox.min;
    var max = _bbox.max;

    if (_direction[X] >= 0) {
        tmin = (min[X] - _origin[X]) / _direction[X];
        tmax = (max[X] - _origin[X]) / _direction[X];
    } else {
        tmin = (max[X] - _origin[X]) / _direction[X];
        tmax = (min[X] - _origin[X]) / _direction[X];
    }

    if (direction[Y] >= 0) {
        tymin = (min[Y] - _origin[Y]) / _direction[Y];
        tymax = (max[Y] - _origin[Y]) / _direction[Y];
    } else {
        tymin = (max[Y] - _origin[Y]) / _direction[Y];
        tymax = (min[Y] - _origin[Y]) / _direction[Y];
    }

    if ( (tmin > tymax) || (tymin > tmax) ) {
        return false;
    }

    if (tymin > tmin)
        tmin = tymin;
    if (tymax < tmax)
        tmax = tymax;

    if (direction[Z] >= 0) {
        tzmin = (min[Z] - _origin[Z]) / _direction[Z];
        tzmax = (max[Z] - _origin[Z]) / _direction[Z];
    } else {
        tzmin = (max[Z] - _origin[Z]) / _direction[Z];
        tzmax = (min[Z] - _origin[Z]) / _direction[Z];
    }

    if ( (tmin > tzmax) || (tzmin > tmax) ) {
        return false;
    }
    
    if (tzmin > tmin)
        tmin = tzmin;
    if (tzmax < tmax)
        tmax = tzmax;

    return true;

};

// todo -> use a floar[10] vertex array and views?
 window.trs = {};

 trs.create = function () {
    var out={};
    out.translation   = vec3.create();
    out.rotation      = quat.create();
    out.scale         = vec3.fromValues(1., 1., 1.);
    return out;
  };

  trs.clone = function(_in) {
     var out={};
     out.translation = vec3.clone(_in.translation);
     out.rotation = quat.clone(_in.rotation);
     out.scale = vec3.clone(_in.scale);

  };

  trs.copy = function(_out, _in){
    vec3.copy(_out.translation, _in.translation);
    quat.copy(_out.rotation, _in.rotation);
    vec3.copy(_out.scale, _in.scale);
  };

  trs.fromValues = function(t,r,s){
      var out={};
      out.translation   = vec3.clone(t);
      out.rotation      = quat.clone(r);
      out.scale         = vec3.clone(s);
      return out;

  }

  trs.fromMat4 = function(_out,_mat) {
      vec3.getTranslationFromMat4(_out.translation,_mat);
      quat.fromMat4(_out.rotation,_mat);
      vec3.getScaleFromMat4(_out.scale,_mat);
      return _out;
   };

  trs.fromPrs = function(_out,_position,_rotation,_scale) {
      vec3.copy(_out.translation,_position);
      quat.copy(_out.rotation, _rotation);
      vec3.copy(_out.scale, _scale);

      return _out;
  };


  window.euler = {};
  euler.create = function(){
      out = vec3.create();
      return out;
  };
  euler.fromQuat = function(_out,_quat){
      // ZXY
      var qx=_quat[0];
      var qy=_quat[1];
      var qz=_quat[2];
      var qw=_quat[3];
      var sqx = qx * qx;
      var sqy = qy * qy;
      var sqz = qz * qz;
      var sqw = qw * qw;
      vec3.set(_out,
               Math.asin(clamp( 2. * ( qx * qw + qy * qz ),-1., 1.)),
               Math.atan2( 2. * ( qy * qw - qz * qx ), ( sqw - sqx - sqy + sqz )),
               Math.atan2( 2. * ( qz * qw - qx * qy ), ( sqw - sqx + sqy - sqz )));
      return _out;
  };
  quat.fromEuler = function(_out,_euler){
      // ZXY
      var c1 = Math.cos(_euler[0] / 2. );
      var c2 = Math.cos(_euler[1] / 2. );
      var c3 = Math.cos(_euler[2] / 2. );
      var s1 = Math.sin(_euler[0] / 2. );
      var s2 = Math.sin(_euler[1] / 2. );
      var s3 = Math.sin(_euler[2] / 2. );
      quat.set(_out,
               s1 * c2 * c3 - c1 * s2 * s3,
               c1 * s2 * c3 + s1 * c2 * s3,
               c1 * c2 * s3 + s1 * s2 * c3,
               c1 * c2 * c3 - s1 * s2 * s3);

      return _out;
  };


});

