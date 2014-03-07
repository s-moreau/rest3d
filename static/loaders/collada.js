/*
 COLLADA.js

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

 COLLADA.js needs gl-matrix.js
*/

// if (window.mat4 === undefined)
// {
//     document.write('<script src="/deps/gl-matrix.js"><\/'+'script>');
//     document.write('<script src="/loaders/gl-matrix-ext.js"><\/'+'script>');
// }
define("collada", (function (global) {
    // Initial Setup
    // -------------

    // Save a reference to the global object (`window` in the browser, `exports`
    // on the server).
    // var root = this;
    // The top-level namespace. All public COLLADA classes and modules will
    // be attached to this. Exported for both CommonJS and the browser.
    var COLLADA = {};
    global.COLLADA = COLLADA;
    // if (typeof exports !== 'undefined') {
    //     COLLADA = exports;
    // } else {
    //     COLLADA = root.COLLADA = {};
    // };
    // TODO: Keep in sync with `package.json`.
    // COLLADA.VERSION = '0.0.3';
    // COLLADA._validate = true;

    COLLADA.log = function(msg){
        if (console && console.log) console.log(msg);
    }

    COLLADA.logError = function(msg) {
        if (console && console.logError) console.logError(msg)
        else if (console && console.error) console.error(msg)
        else COLLADA.log('ERROR '+msg);
    }

    Element.prototype.getAttribute = function(attr) {
        if (this.attributes!= null && this.attributes[attr] !== undefined)
            return this.attributes[attr].value;
        else
            return null;
    }

    if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1)
    {
        XMLDocument.prototype.getElementById = function(id) {
            return this.querySelector("[id=" + id + "]");
        }
    }

    Element.prototype.getElementsByTagNameAndSemantic = function(tagName, semantic) {
        var elems = this.getElementsByTagName(tagName);
        var result = []
        for (var i=0,len=elems.length;i<len;i++)
            if (elems[i].getAttribute('semantic') === semantic)
                result.push(elems[i]);
        return result;
    }


    // return child elemens with specific tagName, or all of them if tagName='*'
    Element.prototype.getChildrenByTagName = function(tagName) {
        var children=[];
        var node = this.firstChild;
            while (node != null){
                if (node.nodeType === 1 && (tagName === '*' || node.tagName === tagName))
                    children.push(node); 
                node = node.nextSibling;
            }
        return children;
    };

    Document.prototype.getChildrenByTagName = Element.prototype.getChildrenByTagName;

    // return child elemens with specific tagName, or all of them if tagName='*'
    Element.prototype.getFirstChild = function() {
        var children=[];
        var node = this.firstChild;
            while (node != null && node.nodeType !== 1)
                node = node.nextSibling;
        return node;
    };
           
    COLLADA.document = function () {};
    COLLADA.document.prototype = {

        // parse the COLLADA document
        parseCOLLADA: function(_callback) {

            if (this.xml === undefined || this.xml === null) {
                // TODO - return message to callback!
                if (_callback) 
                    _callback.call(this);
                return null;
            }
            
            var colladaXML = this.xml;
            if (COLLADA._validate) {

                // Check it is a COLLADA document, and find the visual scenes
                if (colladaXML.firstChild.nodeName !== "COLLADA") {
                    COLLADA.log("Error Parsing "+this.url+" [first node is not <COLLADA>]")
                    return;
                }
                // check COLLADA asset
                var asset = colladaXML.firstChild.getChildrenByTagName('asset');
                if (asset.length !== 1)
                {
                    COLLADA.log("Error Parsing "+this.url+" [expected ONE <asset> element]"); 
                    return;
                }

                // find scenes
                var scene = colladaXML.getElementsByTagName('scene');
                if (scene.length !== 1){
                    COLLADA.log("Error Parsing "+this.url+" [expected ONE <scene> element]"); 
                    return;
                }
                var visual_scene = scene[0].getChildrenByTagName('instance_visual_scene');
                if (visual_scene.length !== 1){
                    COLLADA.log("Error Parsing "+this.url+" [expected ONE <instance_visual_scene> in <scene>]");
                    return;
                }
                for (var i=0; i<visual_scene.length; i++) {
                    var visual_sceneurl=visual_scene[i].attributes['url'];
                    if (visual_sceneurl === undefined || visual_sceneurl.value.length < 2 || visual_sceneurl.value[0] != '#') {
                        COLLADA.log("Error Parsing "+this.url+' [expected url="#url_" in <instance_visual_scene>]');
                        return;
                    }
                    var url=visual_sceneurl.value.substring(1); // remove the #
                    var the_scene = colladaXML.getElementById(url);
                    if (the_scene === null || the_scene.nodeName != 'visual_scene') {
                        COLLADA.log("Error Parsing "+this.url+' [could not find <visual_scene id="#'+url+'" /> ]');
                        return;
                    }
                }
            }
            // get the scene, or null if no scene is referenced
            var instance_visual_scene = colladaXML.getElementsByTagName('scene')[0].getElementsByTagName('instance_visual_scene');
            if (instance_visual_scene)
                this.sceneID = instance_visual_scene[0].getAttribute('url').substring(1);
            else
                this.sceneID = null;
            
            // get the up_axis 
            var asset = colladaXML.getElementsByTagName('asset')[0];
            this.up_axis = 'Y_UP';
            if (asset.getElementsByTagName('up_axis') && asset.getElementsByTagName('up_axis')[0])
                    this.up_axis = asset.getElementsByTagName('up_axis')[0].textContent;

            // initialize structures
            this.sources = {}; // all the sources in the dae
            this.transforms = []; // all the created transforms
            this.meshes={}; // all the meshes
            this.cameras={}; // all the cameras
            this.materials={}; // all the materials
            this.effects={}; // all the effects
            this.lights={}; // all the lights
            this.geometries=[]; // all the geometries
        
            if (_callback)
                _callback(this);

            return this;

        },
        parse_camera: function(_cameraID) {
            var camera= {};
            var cameraXML=this.xml.getElementById(_cameraID);
            if (COLLADA._validate) {
                if (cameraXML === null || cameraXML.tagName !== 'camera') {
                    COLLADA.log('Error cannot find <camera id="'+_cameraID+'">');
                    return null;
                }
                var opticsXML = cameraXML.getChildrenByTagName('optics');
                if (opticsXML.length !== 1){
                    COLLADA.log('Error expected ONE <optics> in <camera id="'+_cameraID+'">');
                    return null;
                }
                var techniqueXML = opticsXML[0].getChildrenByTagName('technique_common');
                if (techniqueXML.length !== 1){
                    COLLADA.log('Error expected ONE <technique_common>  in <camera id="'+_cameraID+'"> <optics>');
                    return null;
                }
                if (techniqueXML[0].childElementCount !== 1){
                    COLLADA.log('Error expected ONE child in <camera id="'+_cameraID+'"> <optics> <technique_common>');
                    return null;
                }
            }
            cameraXML = cameraXML.getElementsByTagName('technique_common')[0].firstElementChild;
            switch(cameraXML.tagName){
                case 'perspective':
                    camera.projection = 'perspective';

                    aspect_ratioXML = cameraXML.getChildrenByTagName('aspect_ratio')
                    yfovXML = cameraXML.getChildrenByTagName('yfov')
                    zfarXML = cameraXML.getChildrenByTagName('zfar')
                    znearXML = cameraXML.getChildrenByTagName('znear')

                    // NOTE - COLLADA does not define default values for camera properties!
                    if (COLLADA._validate) {
                        if (aspect_ratioXML.length > 1) {
                            COLLADA.log('Error expected at most ONE  <aspect_ratio> in <camera id="'+_cameraID+'"> <optics> <technique_common> <'+cameraXML.tagNane+'>');
                            return null;
                        }
                        if (yfovXML.length > 1) {
                            COLLADA.log('Error expected at most ONE  <yfov> in <camera id="'+_cameraID+'"> <optics> <technique_common> <'+cameraXML.tagNane+'>');
                            return null;
                        }
                        if (zfarXML.length > 1) {
                            COLLADA.log('Error expected at most ONE  <zfar> in <camera id="'+_cameraID+'"> <optics> <technique_common> <'+cameraXML.tagNane+'>');
                            return null;
                        }
                        if (znearXML.length > 1) {
                            COLLADA.log('Error expected at most ONE  <znear> in <camera id="'+_cameraID+'"> <optics> <technique_common> <'+cameraXML.tagNane+'>');
                            return null;
                        }
                    }

                    if (aspect_ratioXML.length !== 0) camera.aspect_ratio = parseFloat(aspect_ratioXML[0].textContent);
                    if (yfovXML.length !== 0) camera.yfov = parseFloat(yfovXML[0].textContent);
                    if (zfarXML.length !== 0) camera.zfar = parseFloat(zfarXML[0].textContent);
                    if (znearXML.length !== 0) camera.znear = parseFloat(znearXML[0].textContent);
                    break;
                default:
                    if (COLLADA._validate) {
                        COLLADA.log('Unsuported <'+cameraXML.tagNane+'> <camera id="'+_cameraID+'"> <optics> <technique_common>');
                    }
                    return null;
            }
            this.cameras[_cameraID] = camera;
            return camera;

        },
        _parseShaderComponent: function(_node){
            if (_node) 
            _node = _node.getFirstChild();
            if (!_node)
                return null;
            var result = {}
            if (_node.tagName === 'color')
            {
                result.color=JSON.parse("["+_node.textContent.trim().replace(/\s+/g,",")+"]");
            } else if (_node.tagName === 'texture') {
                result.texture=_node.getAttribute('texture');
                result.texcoord=_node.getAttribute('texcoord');

                // search newparam with sid = texture in parent
                var parent=_node.parentNode.parentNode.parentNode.parentNode;
                var children=parent.getChildrenByTagName('newparam');
                var newparam = null;
                for (var i=0;i<children.length;i++){
                    var child=children[i];
                    if (child.getAttribute('sid') === result.texture) {
                        newparam = child; break;
                    }
                }
                if (!newparam) {
                    COLLADA.logError('Error cannot find <newparam sid="'+result.texture+'"> in <'+parent.parentNode.tagName+' id="'+psrent.parentNode.getAttribute('id')+'">');
                    return result;
                }
                var sampler = newparam.getFirstChild();
                if (sampler.tagName != 'sampler2D') {
                    COLLADA.logError('Error was expecting <sampler2D> in  <'+parent.parentNode.tagName+' id="'+psrent.parentNode.getAttribute('id')+'"><newparam sid="'+result.texture+'">');
                    return result;
                }
                /*
                    <source>file2-surface</source>
                    <minfilter>LINEAR_MIPMAP_LINEAR</minfilter>
                    <magfilter>LINEAR</magfilter>
                */
                var source=sampler.getChildrenByTagName('source');
                if (source && source.length!==0) source=source[0].textContent.trim(); else source=null;
                var minfilter=sampler.getChildrenByTagName('minfilter');
                if (minfilter && minfilter.length!==0) minfilter=minfilter[0].textContent.trim(); else minfilter=null;
                var magfilter=sampler.getChildrenByTagName('magfilter');
                if (magfilter && magfilter.length!==0) magfilter=magfilter[0].textContent.trim(); else magfilter=null;
                var wrap_s=sampler.getChildrenByTagName('wrap_s');
                if (wrap_s && wrap_s.length!==0) wrap_s=wrap_s[0].textContent.trim(); else wrap_s=null;
                var wrap_t=sampler.getChildrenByTagName('wrap_t');
                if (wrap_t && wrap_t.length!==0) wrap_t=wrap_t[0].textContent.trim(); else wrap_t=null;
                var mipmap_maxlevel=sampler.getChildrenByTagName('mipmap_maxlevel');
                if (mipmap_maxlevel && mipmap_maxlevel.length!==0) mipmap_maxlevel=mipmap_maxlevel[0].textContent.trim(); else mipmap_maxlevel=null;
                var mipmap_bias=sampler.getChildrenByTagName('mipmap_bias');
                if (mipmap_bias && mipmap_bias.length!==0) mipmap_bias=mipmap_bias[0].textContent.trim(); else mipmap_bias=null;
                var border_color=sampler.getChildrenByTagName('border_color');
                if (border_color && border_color.length!==0) border_color=JSON.parse("["+border_color[0].textContent.trim().replace(/\s+/g,",")+"]");  else border_color=null;
                var format=sampler.getChildrenByTagName('format');
                if (format && format.length!==0) format=format[0].textContent.trim(); else format=null;

                newparam = null;
                for (var i=0;i<children.length;i++){
                    var child=children[i];
                    if (child.getAttribute('sid') === source) {
                        newparam = child; break;
                    }
                }

                if (!newparam) {
                    COLLADA.logError('Error cannot find <newparam sid="'+source+'"> in <'+parent.parentNode.tagName+' id="'+psrent.parentNode.getAttribute('id')+'">');
                    return result;
                }
                var surface = newparam.getChildrenByTagName('surface');
                if (COLLADA.validate && (surface.length !== 1 || surface[0].getAttribute('type') !== '2D')) {
                    COLLADA.logError('Error was expecting <surface type="2D"> in  <'+parent.parentNode.tagName+' id="'+psrent.parentNode.getAttribute('id')+'"><newparam sid="'+source+'">');
                    return result;
                }
                /*
                    <init_from>file2</init_from>
                    <format>A8R8G8B8</format>
                */
                surface = surface[0];
                var init_from=surface.getChildrenByTagName('init_from');
                if (init_from && init_from.length!==0) init_from=init_from[0].textContent.trim(); else init_from=null;
                var format=surface.getChildrenByTagName('format');
                if (format && format.length!==0) format=format[0].textContent.trim(); else format=null;
                if (!init_from) {
                    COLLADA.logError('Error could not find  <init_from> in  <'+parent.parentNode.tagName+' id="'+psrent.parentNode.getAttribute('id')+'"><newparam sid="'+source+'"><surface type="2D"');
                    return result;
                }

                if (minfilter) result.minfilter=minfilter;
                if (magfilter) result.magfilter=magfilter;
                if (wrap_s) result.wrap_s=wrap_s;
                if (wrap_t) result.wrap_t=wrap_t;
                if (mipmap_maxlevel) result.mipmap_maxlevel=mipmap_maxlevel;
                if (mipmap_bias) result.mipmap_bias=mipmap_bias;
                if (border_color) result.border_color=border_color;
                if (format) result.format=format


                // early exit if this image is already loading
                if (!this.images) this.images={}

                // kick off image loading
                var image = this.xml.getElementById(init_from);
                if (!image || image.tagName !== 'image'){
                    COLLADA.logError('Error could not find <image id="'+init_from+'"> in <library_images>');
                    return result;
                }
                // assuming there is a <init_from> in <image>
                var imagePath = image.childNodes[1].textContent.trim();
                if (!imagePath) {
                    COLLADA.logError('Error could not find  <init_from> in <image id="'+init_from+'">');
                    return result;
                }
                result.path = imagePath;
                var uri = this.baseURI + '/' + imagePath;

                if (!this.images[init_from]) {

                    this.images[init_from] = new Image();

                    if (this.onload) this.images[init_from].onload = this.onload;
                    this.images[init_from].onerror = function () {
                        COLLADA.logError('Could not load "'+imagePath+'"');
                    }
                    this.images[init_from].src = uri;
                }

                result.image = this.images[init_from];
                
            } else if (_node.tagName === 'float') {
                result.float = parseFloat(_node.textContent);
            }
            return result;
        },
        // parse an effect node
        parse_effect: function(_effectID) {
            if (!this.xml) return null;
            var effectXML = this.xml.getElementById(_effectID);
            if (COLLADA._validate) {
                if (effectXML === null || effectXML.tagName !== 'effect') {
                    COLLADA.log('Error cannot find <effect id="'+_effectID+'">');
                    return null;
                }
                var profiles=effectXML.getChildrenByTagName('profile_COMMON');
                if (profiles.length !== 1){
                    COLLADA.log('Error expected ONE <profile_COMMON> in <effect id="'+_effectID+'" >');
                    return null;
                }
                if (profiles[0].childElementCount === 0) {
                    COLLADA.log('Error expected children of <profile_COMMON> in <effect id="'+_effectID+'" >');
                    return null;
                }
                if (profiles[0].getChildrenByTagName('technique').length ===0) {
                    COLLADA.log('Error expected <technique> in <effect id="'+_effectID+'" > <profile_COMMON>');
                    return null;
                }
                var tagName = profiles[0].getChildrenByTagName('technique')[0].getFirstChild().tagName;
                if (tagName !== 'blinn' && tagName !== 'phong' && tagName !== 'constant' && tagName !== 'lambert') {
                    COLLADA.log('Error unknown shading <'+tagName+'> in <effect id="'+_effectID+'" > <profile_COMMON>');
                    return null;
                }
            }
            var shadingXML = effectXML.getElementsByTagName('technique')[0].getFirstChild();
            var child = shadingXML.firstChild;

            var parameters = {};
            while (child != null)
            {
                switch(child.tagName)
                {
                    case 'emission':
                        parameters.emission = this._parseShaderComponent(child);
                        break;
                    case 'ambient':
                        parameters.ambient = this._parseShaderComponent(child);
                        break;
                    case 'diffuse':
                        parameters.diffuse = this._parseShaderComponent(child);
                        break;
                    case 'shininess':
                        parameters.shininess = this._parseShaderComponent(child);
                        break;
                    case 'specular':
                        parameters.specular = this._parseShaderComponent(child);
                        break;
                    case 'reflective':
                        parameters.reflective = this._parseShaderComponent(child);
                        break;
                    case 'reflectivity':
                        parameters.reflectivity = this._parseShaderComponent(child);
                        break;
                    case 'transparent':
                        parameters.transparent = this._parseShaderComponent(child);
                        break;
                    case 'index_of_refraction':
                        parameters.index_of_refraction = this._parseShaderComponent(child);
                        break;
                        
                }
                child = child.nextSibling;
            }
            var effect = {};
            effect.parameters = parameters;
            effect.shader_type = shadingXML.tagName;

            var newparamsXML = effectXML.getElementsByTagName('newparams');
            var newparams = {};
            for (var i=0;i<newparamsXML.length;i++){
                newparamXML = newparamsXML[i];
                var sid = newparamXML.getAttribute('sid');
                newparams[sid] = this._parseEffectParam(newparamXML.firstChild);
            }
            effect.newparams = newparams;

            return effect;
        },
        _parseEffectParam: function(node) {
            var tagName = node.tagName;
            var children = node.getChildrenByTagName('*');
            var result={};
            for (var i=0;i<children.length;i++) {
                var child=children[i];
                result[child.tagName] = child.textContent;
            }
            for (var key in children.attributes)
            {
                result[key]=children.attributes[key].value;
            }
        },
        // recursive parse of a <node>
        parse_node: function(node)
        {
            // create a new transform for that node
            var transform = {};
            var id = node.getAttribute('id'); // TODO: check is this is unique ?
            if (id) transform.id = id;
            var name = node.getAttribute('name');
            if (name) transform.name = name;
            var type = node.getAttribute('type');  // JOINT or NODE
            if (type) transform.type = type
            var tags = node.getAttribute('layer')  // space separated list of layers
            if (tags) transform.tags = tags;

            this.transforms.push(transform);


            var mat=mat4.create();
            var child = node.firstChild;
            // TODO - a node can have multiple instance geometry/lights...
            while (child != null)
            {
                switch(child.tagName)
                {
                    case 'lookat':
                        var lookat = mat4.create();
                        var lookatmat = mat3.clone(JSON.parse("["+child.textContent.trim().replace(/\s+/g,",")+"]"));
                        mat4.lookat(lookat,vec3.getRowFromMat3(lookatmat,0),vec3.getRowFromMat3(lookatmat,1),vec3.getRowFromMat3(lookatmat,2));
                        mat4.multiply(mat,mat,lookat);
                        break;
                    case 'matrix':
                        cmat = mat4.transpose(new Float32Array(16),JSON.parse("["+child.textContent.trim().replace(/\s+/g,",")+"]"));
                        mat4.multiply(mat,mat,cmat);
                        break;
                    case 'rotate':
                        var rot=vec4.clone(JSON.parse("["+child.textContent.trim().replace(/\s+/g,",")+"]"));
                        mat4.rotate(mat,mat,rot[3]*0.0174532925,rot);
                        break;
                    case 'scale':
                        vec3.clone(JSON.parse("["+child.textContent.trim().replace(/\s+/g,",")+"]"));
                        break;
                    case 'skew':
                        /*
                            1) COLLADA uses the RenderMan standard:
                            [ 1+s*dx*ex   s*dx*ey   s*dx*ez  0 ]
                            [   s*dy*ex 1+s*dy*ey   s*dy*ez  0 ]
                            [   s*dz*ex   s*dz*ey 1+s*dz*ez  0 ]
                            [         0         0         0  1 ]
                            where s = tan(skewAngle), if the axises are normalized
                            */
                        break;
                    case 'translate':
                        mat4.translate(mat,mat,JSON.parse("["+child.textContent.trim().replace(/\s+/g,",")+"]"));
                        break;
                    case 'node':
                        var childTransform = this.parse_node(child);
                        if (!transform.children) transform.children=[];
                        transform.children.push(childTransform);
                        childTransform.parent = transform;
                        break;
                    case 'instance_camera':
                        transform.camera = this.parse_camera(child.getAttribute('url').substring(1));  // remove #
                        break;
                    case 'instance_geometry':
                        var geom = this.parse_instance_geometry(child);
                        if (geom) {
                            if (!transform.geometries) transform.geometries = [];
                            transform.geometries.push(geom);
                        }
                        break;

                    case 'instance_controller':
                        var geom = this.parse_instance_controller(child);
                        if (geom) {
                            if (!transform.geometries) transform.geometries = [];
                            transform.geometries.push(geom);
                        }
                        break;
                    case 'instance_light':
                        transform.light = this.parse_instance_light(child);
                }
                child = child.nextSibling;
            }

            // now set the matrix
            transform.local = mat;

            return transform;
        },
        parse_light: function(_lightID) {
            var light={};
             if (!this.xml) return null;
            var lightXML = this.xml.getElementById(_lightID);

            if (COLLADA._validate) {
                if (!lightXML || lightXML.tagName !== 'light') {
                    COLLADA.log("Error Parsing "+this.url+' [could not find <light id="#'+_lightID+'" /> ]');
                    return null;
                }
                if (lightXML.getFirstChild().tagName!== 'technique_common') {
                    COLLADA.log('Error expectd <technique_common> in <light id="'+_lightID+'">');
                    return null;
                }
                if (!lightXML.getFirstChild().getFirstChild()) {
                    COLLADA.log('Error expected at least one child in <light id="'+_lightID+'"> <technique_common>');
                    return null;
                }
                var tagName = lightXML.getFirstChild().getFirstChild().tagName;
                if (tagName !== 'ambient' && tagName !== 'point' && tagName !== 'directional' && tagName !== 'spot') {
                    COLLADA.log('Error unknown <'+tagName+'> in <light id="'+_lightID+'"> <technique_common>');
                    return null;
                }
            }
            light.name = lightXML.getAttribute('name');
            light.id = _lightID;

            lightXML = lightXML.getFirstChild().getFirstChild();
            light.type = lightXML.tagName;
            
            var parameters = lightXML.getChildrenByTagName('*');
            for (var i=0;i<parameters.length;i++){
                var parameter = parameters[i];
                switch (parameter.tagName) {
                    case 'color':
                        light.color = JSON.parse("["+parameter.textContent.trim().replace(/\s+/g,",")+"]");
                        break;
                    case 'constant_attenuation':
                    case 'linear_attenuation':
                    case 'quadratic_attenuation':
                    case 'zfar':
                    case 'falloff_angle':
                    case 'falloff_exponent':
                        light.constant_attenuation = parseFloat(parameter.textContent);
                        break;
                    default:
                        if (COLLADA._validate) {
                            COLLADA.log('Error unknown paramter <'+parameter.tagName+'> in <light id="'+_lightID+'"> <technique_common><'+light.type+'>');
                            return null;
                        }
                }
            }

            this.lights[_lightID] = light;
            return light;

        },

        parse_instance_camera: function(_instance_cameraXML) {
            
            var cameraID = _instance_cameraXML.getAttribute('url');
            if (COLLADA._validate){
                if (typeof cameraID !== "string"){
                    COLLADA.log('Error missing attribute url in <'+_instance_cameraXML.parentNode.tagName+' id="'+_instance_cameraXML.parentNode.getAttribute('id')+'">')
                    return null;    
                }
            }
            cameraID = cameraID.substring(1);
            var camera = this.cameras[lightID];
            if (!camera) camera=this.parse_camera(cameraID);

            return camera; 

        },
        parse_instance_light: function(_instance_lightXML) {
            
            var lightID = _instance_lightXML.getAttribute('url');
            if (COLLADA._validate){
                if (typeof lightID !== "string"){
                    COLLADA.log('Error missing attribute url in <'+_instance_geometryXML.parentNode.tagName+' id="'+_instance_geometryXML.parentNode.getAttribute('id')+'">')
                    return null;    
                }
            }
            lightID = lightID.substring(1);
            var light = this.lights[lightID];
            if (!light) light=this.parse_light(lightID);

            return light;

        },
        // Hack, turn an instance_controller into an instance_geometry
        parse_instance_controller: function(_instance_controllerXML){
            var controllerID = _instance_controllerXML.getAttribute('url').substring(1);
            var meshID = this.xml.getElementById(controllerID).getChildrenByTagName('skin')[0].getAttribute('source').substring(1);
            _instance_controllerXML.setAttribute('url','#'+meshID);
            return this.parse_instance_geometry(_instance_controllerXML);
        },
        // TODO -> give the option to not resolve geometries or materials
        parse_instance_geometry: function(_instance_geometryXML) {
            // create a geometry object, which is a mest + material
            var geometry = {};
            var meshID = _instance_geometryXML.getAttribute('url');
            if (COLLADA._validate){
                if (typeof meshID !== "string"){
                    COLLADA.log('Error missing attribute url in <'+_instance_geometryXML.parentNode.tagName+' id="'+_instance_geometryXML.parentNode.getAttribute('id')+'">')
                    return null;    
                }
            }
            meshID = meshID.substring(1);

            var mesh=this.meshes[meshID];
            if (!mesh) mesh=this.parse_geometry(meshID);
            if (!mesh || mesh.length === 0) return null;  //there was a problem parsing that geometry

            geometry.mesh=mesh;

            var bind_materials = _instance_geometryXML.getChildrenByTagName('bind_material');
            // default material
            if (bind_materials.length !== 1) {
                geometry.material = null;
            } else {
                var bind_material = bind_materials[0];
                if (COLLADA._validate){
                    var techniques = bind_material.getChildrenByTagName('technique_common');
                    if (techniques.length !== 1){
                        COLLADA.log('Expected ONE <technique_common> inside <instance_geometry url="#'+meshID+'"><bind_material>');
                        return null;
                    }

                    var instance_materials = techniques[0].getChildrenByTagName('instance_material');
                    if (instance_materials.length ===0) {
                        COLLADA.log('Error expected at least ONE <instance_material> inside <instance_geometry url="#'+meshID+'"><bind_material>');
                        return null;
                    }
                }
                // a visual scene is a bunch of nodes
                var instance_materials = bind_material.getElementsByTagName('instance_material');
                geometry.materials=[];
                for (var i=0; i<instance_materials.length;i++) {
                    material={};
                    var instance_material = instance_materials[i];
                    material.symbol = instance_material.getAttribute('symbol');
                    material.target = instance_material.getAttribute('target').substring(1);

                    var mat = this.materials[material.target];
                    if (!mat) mat = this.parse_material(material.target);

                    material.parameters = mat.parameters;

                    var bind_vertices = instance_material.getChildrenByTagName('bind_vertex_input');
                    material.bind_vertex_input = [];
                    for (var j=0; j<bind_vertices.length;j++){
                        var bind_vertex_input = {};
                        var bind_vertex=bind_vertices[j];
                        bind_vertex_input.semantic = bind_vertex.getAttribute('semantic');
                        bind_vertex_input.input_semantic = bind_vertex.getAttribute('input_semantic');
                        bind_vertex_input.input_set = parseInt(bind_vertex.getAttribute('input_set'));
                        material.bind_vertex_input.push(bind_vertex_input);
                    }   
                    geometry.materials.push(material);
                }
            }   
            this.geometries.push(geometry);
            return geometry;
        },
        // parse a scene 
        parse_visual_scene: function(_sceneID) {
            var root=[]
            if (!this.xml)
                return null;
            var colladaXML = this.xml;
            var scene=colladaXML.getElementById(_sceneID);
            if (scene === null || scene.tagName != 'visual_scene')
            {
                COLLADA.log("Error Parsing "+this.url+' [could not find <scene id="#'+_sceneID+'" /> ]');
                return null;
            }
            // a visual scene is a bunch of nodes
            var node = scene.firstChild;
            while (node != null){
                if (node.nodeType === 1 && node.tagName === 'node')
                    root.push(this.parse_node(node)); 
                node = node.nextSibling;
            }
            return root;
        },
        // parse a source - assume there is an accessor
        parse_source: function(_sourceID){
            if (this.xml === undefined || this.xml === null)
                return null;
            var colladaXML = this.xml;
            var sourceXML = colladaXML.getElementById(_sourceID);
            if (sourceXML === null) {
                    COLLADA.log("Error Parsing "+this.url+' [cannot find <source id="#'+_sourceID+'" /> ]');
                    return null;
            }
            var accessor = sourceXML.getElementsByTagName('accessor');
            if (COLLADA._validate) {
                if (accessor === null || accessor.length!=1) {
                    COLLADA.log("Error Parsing "+this.url+' [expected ONE <accessor> in <source id="#'+_sourceID+'" /> ]');
                    return null;
                }
                if (accessor[0].attributes.source === undefined || accessor[0].attributes.source.value.length <1 || accessor[0].attributes.source.value[0]!="#"){
                    COLLADA.log("Error Parsing "+this.url+' [expected source="#url_" in <source id="'+_sourceID+'""> <accessor>]');
                    return null;
                }
            }
            var array = colladaXML.getElementById(accessor[0].attributes['source'].value.substring(1));

            var source = {};
            source.values=JSON.parse("["+array.textContent.trim().replace(/\s+/g,",")+"]"); 
            if (COLLADA._validate) {
                if (accessor[0].attributes['stride'] === undefined || parseInt(accessor[0].attributes['stride'].value) <1){
                    COLLADA.log("Error Parsing "+this.url+' [expected stride > 1 in <source id="'+_sourceID+'""> <accessor>]');
                    return null;
                }
            }
            source.stride= parseInt(accessor[0].attributes['stride'].value);
            source.type = array.tagName;
            if (COLLADA._validate) {
                var count = parseInt(array.attributes['count'].value);
                if (count != source.values.length) {    
                    COLLADA.log("Error Parsing "+this.url+' [<source id="'+array.attributes['id'].value+'count ('+count+') is different than number of values in <'+source.type+'> ('+source.values.length+') in <source id="#'+_sourceID+'" /> ]');
                    return null;
                }
            }
            // TODO - use closure instead of eval, use _get and _set?
            this.sources[_sourceID] = source;
            return source;
        },
        // parse a material node
        parse_material: function(_matID) {
            if (this.xml === undefined || this.xml === null)
                return null;
            var materialXML = this.xml.getElementById(_matID);
            if (materialXML === null || materialXML.tagName !== 'material') {
                COLLADA.log("Error Parsing "+this.url+' [could not find <material id="#'+_matID+'" /> ]');
                return null;
            }
            if (COLLADA._validate) {
                var instance_effects = materialXML.getChildrenByTagName('instance_effect');
                if (instance_effects.length !== 1 && instance_effects.tagName !== 'instance_effect') {
                    COLLADA.log('Error expected ONE <instance_effect> in <material id="'+_matID+'" >');
                    return null;
                }
                if (!instance_effects[0].hasAttribute('url')) {
                    COLLADA.log('Error expected attribute url in <instance_effects> in <material id="'+_matID+'" >');
                    return null;
                }
            }
            var effectID = materialXML.getChildrenByTagName('instance_effect')[0].getAttribute('url').substring(1);
            if (!this.effects[effectID]) effect=this.parse_effect(effectID);
            material = {};
            material.name = materialXML.getAttribute('name');
            material.parameters = effect.parameters;
            this.materials[_matID] = material;
            return material;
        },
        // parse a geometry node = mesh
        parse_geometry: function(_geoID) {
            if (this.xml === undefined || this.xml === null)
                return null;
            var colladaXML = this.xml;
            var geometry=colladaXML.getElementById(_geoID);
            if (geometry === null || geometry.tagName!="geometry")
            {
                COLLADA.log("Error Parsing "+this.url+' [could not find <geometry id="#'+_geoID+'" /> ]');
                return null;
            }


            // find primitive type, Spec says only 1 primitive chid, so will ignore everything else
            var child = geometry.firstChild;
            var prim = null;
            while (child != null){
                if (child.nodeType === 1 && child.tagName != 'extra' && child.tagName != 'asset')
                {
                    prim=child;
                    break;
                }
                child = child.nextSibling;
            }
            if (COLLADA._validate){
                if (prim==null) {
                    COLLADA.log("Error Parsing "+this.url+' [cannot find primitive in <geometry id="#'+_geoID+'" /> ]');
                    return null;
                }
            }
            // TODO - support <convex_mesh> and <spline>
            if (prim.tagName != 'mesh') {
                COLLADA.log('Sorry, this geometry loader only support <mesh> primitive');
                // TODO - return empty geometry instead?
                return null;
            }
            // get vertices and topology
            child = prim.firstChild;
            var topoXML = [];
            var verticesXML = [];
            while (child != null){
                if (child.tagName === 'vertices')
                    verticesXML.push(child);
                else if (child.nodeType === 1 && child.tagName !== 'extra' && child.tagName !== 'source')
                    topoXML.push(child);
                child = child.nextSibling;
            }

            if (COLLADA._validate){
                if (verticesXML.length !== 1)
                {
                    COLLADA.log("Error Parsing "+this.url+' [expected ONE <vertices> in <geometry id="#'+_geoID+'" /> ]');
                    return null;
                }

                var test = verticesXML[0].getElementsByTagNameAndSemantic('input','POSITION');
                if (test.length !== 1)
                {
                    COLLADA.log("Error Parsing "+this.url+' [expected ONE <vertices> in <geometry id="#'+_geoID+'" /> ]');
                    return null;
                }
                test = test[0].getAttribute('source');
                if (test === null || test.length < 1 || test[0]!= '#')
                {

                    COLLADA.log("Error Parsing "+this.url+' [expected source="#id" in <vertices> in <geometry id="#'+_geoID+'" /> ]');
                    return null;
                }
            }
            // get all the per vertex data
            var vertices = {};
            var vinputsXML = verticesXML[0].getElementsByTagName('input');
            for (var i=0; i<vinputsXML.length; i++) 
                vertices[vinputsXML[i].getAttribute('semantic')] = vinputsXML[i].getAttribute('source').substring(1);

            // get mesh bounding box
            var bounds = aabb.empty();

            // get all the primitives
            var primitives=[];
            for (var i=0; i<topoXML.length;i++)
            {
                // only loading triangles for now
                if (!topoXML[i].tagName != 'triangles')
                    //COLLADA.log('Sorry. In <geometry id="'+_geoID+'"> found <'+topoXML[i].tagName+'>: this geometry loader only support <triangles> primitive');
                {
                    if (COLLADA._validate){
                        test = topoXML[i].getElementsByTagName('p');
                        if (test === null || test.length !== 1)
                        {
                            COLLADA.log("Error Parsing "+this.url+' [expected ONE <p> in <'+topoXML.tagName+'> /> ]');
                            return null;
                        }
                    }
                    var triangle = {};
                    triangle.material = topoXML[i].getAttribute('material');
                    triangle.count = parseInt(topoXML[i].getAttribute('count'));
                    // read <p>
                    triangle.p = JSON.parse("["+topoXML[i].getElementsByTagName('p')[0].textContent.trim().replace(/\s+/g,",")+"]"); 
                    // get all inputs for that triangle
                    triangle.inputs = {};
                    triangle.max_offset = 0;
                    inputsXML = topoXML[i].getElementsByTagName('input');
                    for (var j=0; j<inputsXML.length;j++){


                        var offset = parseInt(inputsXML[j].getAttribute('offset'));
                        if (offset > triangle.max_offset) triangle.max_offset = offset;

                        var semantic = inputsXML[j].getAttribute('semantic');
                        if (semantic === 'TEXCOORD') {
                            var setAttr = inputsXML[j].getAttribute('set');
                            if (setAttr)
                                semantic += '_'+setAttr;
                            else
                                semantic += '_0';
                        }

                        triangle.inputs[semantic] = { source: inputsXML[j].getAttribute('source').substring(1), offset: offset};
                        triangle.vertices = vertices; 


                    }
                    var vertex_offset = triangle.inputs.VERTEX.offset;
                    triangle.inputs.VERTEX.source= vertices.POSITION;
                    for (var vertex in vertices) {
                        if (vertex !== 'POSITION')
                            triangle.inputs[vertex] = { source: vertices[vertex], offset: vertex_offset}
                    }

                    // parse all the sources in that geometry
                    for (var input in triangle.inputs) {
                        var sourceID = triangle.inputs[input].source;
                        if (!this.sources[sourceID]) {
                            var source=this.parse_source(sourceID);
                            if (source === null) {
                                COLLADA.log("Error Parsing "+this.url+' [error parsing <source id="#'+sourceID+'" /> ]');
                                return null;
                            }
                        }
                    }
                    triangle.sources = this.sources;
                    // create easy accessors
                    for (var input in triangle.inputs) {
                        var source = this.sources[triangle.inputs[input].source];
                        var code = 'triangle[input] = function(i) {';
                            code += 'var p=this.p[i';
                            if (triangle.max_offset != 0)
                                code += '*'+(triangle.max_offset+1);
                            if (triangle.inputs[input].offset != 0)
                                code += '+'+triangle.inputs[input].offset;
                            code += ']';
                            if (source.stride != 1)
                                code += '*'+source.stride;
                            code += ';';
                            code += 'var v=this.sources["'+triangle.inputs[input].source+'"].values; ';
                            code += 'return [';
                        for (var j=0;j<source.stride;j++){
                            code += 'v[';
                            code += 'p';

                            if (j!==0)
                                code += '+'+j;
                            code += ']';
                            if (j!==source.stride-1) code += ' , ';
                        }
                        code += ']}';
                        eval(code);
                    }
                    // create POSITION accessor for directly accessing the vertices without index
                    var source = this.sources[triangle.inputs.VERTEX.source];
                    var code = 'triangle.POSITION = function(i) {';
                        code += 'var v=this.sources["'+triangle.inputs.VERTEX.source+'"].values; ';
                        code += 'var p=';
                        if (source.stride != 1)
                            code += source.stride+'*';
                        code += 'i; ';
                        code += 'return [';
                    for (var j=0;j<source.stride;j++){
                        code += 'v[p';
                        if (j!==0)
                            code += '+'+j;
                        code += ']';
                        if (j!==source.stride-1) code += ' , ';
                    }
                    code += ']}';
                    eval(code);
                    triangle.POSITION.count = Math.floor(source.values.length/3);
                    triangle.primitive ='TRIANGLES';
                    primitives.push(triangle);

                    // create bounding box
                    triangle.bounds =aabb.fromPositions(this.sources[triangle.inputs.VERTEX.source].values);
                    aabb.add(bounds,bounds,triangle.bounds);
                }
                
            }
            primitives.bounds = bounds; // weird, but one can add a field to an array
            this.meshes[_geoID]=primitives;
            return primitives;
        }
    };

    // download the document, and call the parser
    COLLADA.load = function(url, callback) {
        var document = new COLLADA.document();
        var cb=callback;
        document.url = url;
        document.baseURI = url.substring(0,url.lastIndexOf('/'));
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function (aEvt){
            
            if (xhr.readyState == 4) {
                if (xhr.status == 200 || xhr.status == 0) {
                    if (xhr.responseXML == null) {
                        if (xhr.responseText == null) {
                            COLLADA.log("Error loading "+document.url+" [most likely a cross origin issue]")
                        } else
                        {
                            COLLADA.log("Error loading "+document.url+" [most likely not a collada/xml document]")
                        }
                    }
                    document.xml=xhr.responseXML;
                    document.parseCOLLADA(cb);
                }
                else {
                    COLLADA.log("Error Loading "+document.url+" [http request status="+xhr.status+"]");
                }
            }
        };

        xhr.open("GET", url, true);
        //send a finish signal
        xhr.overrideMimeType("text/xml");
        xhr.setRequestHeader("Content-Type", "text/xml");
        xhr.send(null);
        return document;
    }
    global.COLLADA = COLLADA;
return function () {
        return global.COLLADA;
    };
}(this)));
