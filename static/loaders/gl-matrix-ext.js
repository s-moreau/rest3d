
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
/**
  calculate Translation, Rotation and Scale from a matrix
*/

vec3.getColumnFromMat4 = function(out, mat,col)
{
    return vec3.set(out, mat[col],mat[col+4],mat[col+8]);
};

vec3.getRowFromMat3 = function(out, mat,row)
{
    return vec3.set(out, mat[row*3],mat[row*3+1],mat[row*3+2]);
};

quat.getRotationfromMat4 = function(out, mat)
{
    return quat.rotationTo(
            out,
            vec3.getColumnFromMat4(mat,2), 
            vec3.getColumnFromMat4(mat,1)
        );
};
vec3.getScaleFromMat4 = function(out, mat)
{
    return vec3.set( out,
        vec3.length(vec3.getColumnFromMat4(mat,0)),
        vec3.length(vec3.getColumnFromMat4(mat,1)),
        vec3.length(vec3.getColumnFromMat4(mat,2))
        );
};
vec3.getTranslationFromMat4 = function(out, mat)
{
    return vec3.getColumnFromMat4(out, mat,3);
};

mat4.fromTRS = function (out, v, q, s) {
    
    // Quaternion math
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

    out[0] = sz*(1 - (yy + zz));
    out[1] = sx*(xy + wz);
    out[2] = sx*(xz - wy);
    out[3] = 0;
    out[4] = sy*(xy - wz);
    out[5] = sy*(1 - (xx + zz));
    out[6] = sy*(yz + wx);
    out[7] = 0;
    out[8] = sz*(xz + wy);
    out[9] = sz*(yz - wx);
    out[10] = sz*(1 - (xx + yy));
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    
    return out;
};


// TODO - a aabb = null should be same as infinite small aabb
 var aabb = {};

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

if(typeof(exports) !== 'undefined') {
    exports.aabb = aabb;
};

// todo -> use a floar[10] vertex array and views?
 var TRS = function () {
        var localTranslation   = vec3.create(),
            localRotation      = quat.create(),
            localScale         = vec3.fromValues(1., 1., 1.),
            localToWorldMatrix = mat4.create();
    };

    TRS.fromMat4 = function(out,_mat) {
        mat4.clone(out.localToWorldMatrix, _mat)
        vec3.getTranslationFromMat4 (out.localTranslation,_mat);
        quat.getRotationfromMat4(out.localRotation,_mat);
        vec3.getScaleFromMat4(out.localScale,_mat);
        return out;
     };

    TRS.fromPRS = function(_position,_rotation,_scale) {
        vec3.copy(localTranslation,_position);
        quat.copy(localRotation, _rotation);
        vec3.copy(localScale, _scale);
        this.updateMat();
        return this;
    };

    TRS.updateMat = function() {
        fromTRS(localToWorldMatrix, localTranslation, localRotation, localScale);
    }

    TRS.localToWorldMatrix = function() {
        return localToWorldMatrix;
}


if(typeof(exports) !== 'undefined') {
    exports.TRS = TRS;
}
;



  })(shim.exports);
})(this);



