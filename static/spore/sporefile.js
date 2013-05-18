/*
 Copyright (c) 2013 Rémi Arnaud -- remi (at) acm (dot) org

 Permission is hereby granted, free of charge, to any person
 obtaining a copy of this software and associated documentation
 files (the "Software"), to deal in the Software without
 restriction, including without limitation the rights to use,
 copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the
 Software is furnished to do so, subject to the following
 conditions:

 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 OTHER DEALINGS IN THE SOFTWARE.
*/

// This is a rewrite of the SporeFile.js, providing the SporeFile() interface to COLLADA.js - used by *unmodified* sporeview.js

function runSoon(f) {
  setTimeout(f, 0);
};

function SporeFile() {
}

SporeFile.prototype = {
  load: function spore_load (src) {
    COLLADA._validate = false;
    COLLADA.load(src,this.parse.bind(this));
  },

  parse: function spore_parse (dae) {



    // pull out the Z-up flag
    var isYUp = true;
    if (dae.up_axis === "Z_UP") 
        isYUp = false;
    
    // pull out the mesh geometry
    var triangles = dae.parse_geometry('mesh');

   
    // there's only one triangle mesh
    var triangle = triangles[0];

    document.getElementById("info").innerHTML="This model has "+triangle.count+" triangles";

    // figure out the bounding box
    var minx = Infinity, miny = Infinity, minz = Infinity;
    var maxx = -Infinity, maxy = -Infinity, maxz = -Infinity;
    var npoints = triangle.POSITION.count;
    for (var i = 0; i < npoints; ++i) {
      var x = triangle.POSITION(i)[0];
      var y = triangle.POSITION(i)[1];
      var z = triangle.POSITION(i)[2];

      minx = Math.min(minx, x);
      miny = Math.min(miny, y);
      minz = Math.min(minz, z);

      maxx = Math.max(maxx, x);
      maxy = Math.max(maxy, y);
      maxz = Math.max(maxz, z);
    }


    // fill up my mesh structure
    var mesh = {};
    mesh.position=[];
    mesh.normal=[];
    mesh.texcoord=[];
    mesh.bbox = {
          min: { x: minx, y: miny, z: minz },
          max: { x: maxx, y: maxy, z: maxz }
    };

    // speed-up function call
    var ppush=mesh.position.push;
    var npush=mesh.normal.push;
    var tpush=mesh.texcoord.push;
    var vget=triangle.VERTEX;
    var nget=triangle.NORMAL;
    var tget=triangle.TEXCOORD_0;
    for (var i = 0; i < triangle.count*3; ++i) {
      ppush.apply(mesh.position,vget.call(triangle,i));
      npush.apply(mesh.normal,nget.call(triangle,i));
      tpush.apply(mesh.texcoord,tget.call(triangle,i))
    }

    this.mesh = mesh;

    // now load the textures and kick off the loads
    var textures = { };
    
    var iIDs = ["diffuse-image", "normal-image", "specular-image"];
    var inames = ["diffuse", "normal", "specular"];

    for (var i = 0; i < iIDs.length; ++i) {

    var node = dae.xml.getElementById(iIDs[i]);
       if (!node)
        continue;

      var name = node.textContent.trim();

      // convert tga's to png's
      if (name.substr(-4).toLowerCase() == ".tga")
        name = name.substr(0, name.length-3) + "png";

      var uri = dae.xml.baseURI.toString();
      uri = uri.substr(0, uri.lastIndexOf("/")) + "/" + name;

      var img = new Image();
      img.src = uri;

      textures[inames[i]] = img;
    }

    this.textures = textures;


  
    if (this._loadHandler) 
      this._loadHandler.apply(window); 
      //runSoon(function () { this._loadHandler.apply(window); });
    return true;
  }
};
