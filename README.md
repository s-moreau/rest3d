# rest3D project

see www.rest3d.org

## Description

This is a MIT licensed open source work-in-progress implementation of a rest3D client/server system.
A goal for this project is to limit drastically the dependencies, to facilitate re-use of the code.

* static/  
  This contains all the files that will be served by a static http server
  * loaders  
    Contains a collada.js loader, a gltf.js loader. Those loaders are written to be usable in as-is in other projects
  * gui/  
    Contains a simple Graphical User Interface API based on jquery-ui / jquery-layout. img/ contains the GUI images, themes/ contain the themes used by jquery-ui
  * deps/  
    Contans all the external dependences used by all the scripts in static, in source and min. 
    gl-matrix.js, jquery.js, jquery-ui.js, jquery.layout.js, webgl-debug.js, webgl-utils.js
  * models/  
    Sample models in COLLADA and glTF format
  * spore/  
    The spore creature viewer modified to use collada.js loader
  * viewer/  
    A simple viewer that evolves to be a rest3D interface

* server/  
  This contains a choice of node.js servers
  * A simple static_server that can be used to http serve the static/ folder
  * A rest3d_server 
  * A rest3d_database_server 

* database/  
  This will contains a XML database server

## Setup
1. git clone https://github.com/amd/rest3d.git
2. cd server; npm install
3. node static_server
4. point your WebGL enabled web browser to http://127.0.0.1:8000

## Openshift (Redhat) deployement
 The package.json at the root and .openshift folder are ready for the nodejs server to be deployed on openshift. TODO: database server deployement
 Note: there is a server of this rest3d github instanced at http://rest3d-remi.rhcloud.com/ 
