
require.config({
    paths: {
        jquerymin: "../deps/jquery-2.0.3.min",
        jqueryui: '../deps/jquery-ui-1.9.2.min',
        codemirror: "../deps/codemirror/codemirror.min",
        javascript: "../deps/codemirror/javascript",
        showHint: "../deps/codemirror/show-hint",
        javacriptHint: "../deps/codemirror/javascript-hint",
        dialog:"../deps/codemirror/dialog",
        search:"../deps/codemirror/search",
        searchCursor:"../deps/codemirror/search-cursor",
        jquerylayout: "../deps/jquery.layout-1.3.0.min",
        upload: '../deps/upload/jquery.fileupload',
        uploadProcess: '../deps/upload/jquery.fileupload-process',
        uploadValidate: '../deps/upload/jquery.fileupload-validate',
        uploadTransport: '../deps/upload/jquery.iframe-transport',
        skinner: '../deps/jquery-skinner',
        jstree: '../deps/jstree/jquery.jstree',
        glmatrix: '../deps/gl-matrix-min',
        glmatrixExt: '../lib/gl-matrix-ext',
        toolbar: "../deps/jquery.toolbar.min",
        terminal: "../deps/jquery.terminal-0.7.10.min",
        pnotify: "../deps/jquery.pnotify-1.3.1.min",
        colorpicker: "../deps/colorpicker/colorpicker",
        eye: "../deps/colorpicker/eye",
        utils: "../deps/colorpicker/utils",
        webglUtils: "../deps/webgl-utils",
        WebGLDebugUtils:"../deps/webgl-debug",
        collada:"../loaders/collada",
        gltf:"../loaders/gltf",
        console:"../deps/console",
        screenfull:"../deps/screenfull.min",
        gui:"../gui/gui6",
        utilMatrix: '../lib/utils',
        viewer: '../viewer/viewer6',
        uploadViewer: '../viewer/viewer6-upload',
        q: '../deps/q',
        fpsCounter: '../viewer/fpscounter'
    },
    shim: {
        'jqueryui':{
            deps: ['jquerymin'],
            exports: '$.ui'
        },
        'jquerylayout':{
            deps: ['jquerymin','jqueryui'],
            exports: '$.fn.layout;'
        },
        'skinner':{
            deps: ['jquerymin'],
            exports: '$.fn.skinner'
        },
        'uploadProcess':{
             deps: ['upload'],
             exports: 'originalAdd',
        },
        'uploadValidate':{
            deps: ['uploadProcess'],
            exports: '$.blueimp.fileupload',
        },
        'uploadTransport':{
             deps: ['jquerymin'],
             exports: '$',
        },
        'upload':{
            deps: ['jquerymin','jqueryui'],
            exports: "$.fn.fileupload",
        },
        'toolbar':{
            deps: ['jquerymin'],
            exports: "$.fn.toolbar",
        },
        'terminal':{
            deps: ['jquerymin'],
            exports: '$.fn.terminal',
        },
        'pnotify':{
            deps: ['jquerymin'],
            exports: '$.pnotify',
        },
        'jstree':{
           deps: ['jquerymin'],
           exports: '$.fn.jstree' 
        },
        'colorpicker':{
            deps: ['jquerymin'],
            exports: '$.fn.ColorPicker',
        },
        'eye':{
            deps: ['jquerymin'],
            exports: 'window.EYE',
        },
        'utils':{
            deps: ['eye'],
            exports: 'window.EYE',
        },
        'webglUtils':{
            exports: 'WebGLUtils',
        },
        'WebGLDebugUtils':{
            exports: 'WebGLDebugUtils',
        },
        'console':{
            deps: ['jquerymin'],
            exports: 'CONSOLE',
        },
        'state':{
            deps: ['jquerymin'],
            exports: 'State',
        },
        'camera':{
            exports: 'Camera',
        },
        'channel':{
            deps: ['webglUtils','state'],
            exports: 'Channel',
        },
        'screenfull':{
            exports: 'screenfull',
        },
        'javascript':{
            deps: ['codemirror']
        },
        'showHint':{
            deps: ['codemirror']
        },
        'javacriptHint':{
            deps: ['codemirror']
        },
        "dialog":{
            deps: ['codemirror']
        },
        "search":{
            deps: ['codemirror']
        },
        "searchCursor":{
            deps: ['codemirror']
        },
        'codemirror':{
            exports: 'CodeMirror'
        },
        'q':{
            exports: 'Q'
        },
    },
})

var css = [
"../gui/gui6.css",
"../deps/codemirror/css/eclipse.css",
"../deps/css/jquery-skinner.css",
"../deps/codemirror/css/codemirror.css",
"../deps/codemirror/css/show-hint.css",
"../deps/codemirror/css/dialog.css",
"../deps/css/bootstrap.icons.css",
"../deps/css/jquery.toolbars.css",
"../deps/css/jquery.terminal.css",
"../deps/jstree/themes/apple/style.css",
"../deps/css/jquery.pnotify.default.css",
"../deps/colorpicker/css/colorpicker.css",
"../deps/colorpicker/css/layout.css",
]

function loadStyle(){
    for(var i=0;i<css.length;i++){
        var s = document.createElement('link');
        s.rel = 'stylesheet';
        s.href = css[i];
        document.getElementsByTagName('head').item(0).appendChild(s);
    }
};

loadStyle();
require(['viewer','fpsCounter'], function(viewer, FPSCounter) { 
    viewer.INIT(); 
});

