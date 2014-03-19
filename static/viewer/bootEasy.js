
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
        glmatrix: '../deps/gl-matrix',
        glmatrixExt: '../lib/gl-matrix-ext',
        toolbar: "../deps/jquery.toolbar",
        terminal: "../deps/jquery.terminal-0.7.10.min",
        pnotify: "../deps/jquery.pnotify.min",
        colorpicker: "../deps/colorpicker/colorpicker",
        eye: "../deps/colorpicker/eye",
        utils: "../deps/colorpicker/utils",
        webglUtils: "../deps/webgl-utils",
        WebGLDebugUtils:"../deps/webgl-debug",
        collada:"../loaders/collada",
        gltf:"../loaders/gltf",
        console:"../deps/console",
        screenfull:"../deps/screenfull",
        gui:"../gui/gui6",
        utilMatrix: '../lib/utils',
        viewer: '../viewer/viewer6'
    },
    shim: {
        'codemirror':{
            exports: 'CodeMirror'
        },
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
        'glmatrixExt':{
            deps: ['glmatrix','utilMatrix'],
            exports: 'vec3',
        },
        'webglUtils':{
            deps: ['glmatrixExt'],
            exports: 'WebGLUtils',
        },
        'WebGLDebugUtils':{
            exports: 'WebGLDebugUtils',
        },
        'collada':{
            exports: 'COLLADA',
        },
        'gltf':{
            deps:['glmatrixExt'],
            exports: 'glTF',
        },
        'console':{
            deps: ['jquerymin'],
            exports: 'CONSOLE',
        },
        'renderer':{
            deps: ['jquerymin'],
            exports: 'RENDERER',
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
    },
})

require(['viewer'], function(viewer) { 
    viewer.easyINIT(); 
});
