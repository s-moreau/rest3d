
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
        glmatrixExt: '../loaders/gl-matrix-ext',
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
            deps: ['glmatrix'],
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
        'rest3d':{
            deps: ['jquerymin','upload'],
            exports: 'rest3d',
        },
        'state':{
            deps: ['jquerymin'],
            exports: 'State',
        },
        'viewer':{
             deps: ['glmatrixExt'],
             exports: 'viewer',
        },
        'camera':{
            exports: 'Camera',
        },
        'channel':{
            deps: ['state'],
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
        "gui":{
            deps: ['jquerylayout'],
            exports: 'GUI',
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
require(['jquerymin','jqueryui','codemirror','javascript','showHint','javacriptHint','dialog','search','searchCursor','jquerylayout','upload','uploadProcess','uploadValidate','uploadTransport',
    'skinner','jstree','glmatrixExt','toolbar','terminal','pnotify','colorpicker','eye','utils','webglUtils','WebGLDebugUtils','collada','gltf','console','screenfull','gui',
    'camera','channel','renderer','rest3d','state','viewer'],function(e){
    INIT();
})


// var dep = [{
//     link: "../deps/codemirror/css/eclipse.css"
// }, {
//     link: "../deps/css/jquery-skinner.css"
// }, {
//     link: "../deps/codemirror/css/codemirror.css"
// }, {
//     link: "../deps/codemirror/css/show-hint.css"
// }, {
//     link: "../deps/codemirror/css/dialog.css"
// }, {
//     link: "../deps/css/bootstrap.icons.css"
// }, {
//     link: "../deps/css/jquery.toolbars.css"
// }, {
//     link: "../deps/css/jquery.terminal.css"
// },
//     {
//     link: "../gui/gui6.css"
// },
//     {
//     link: "../deps/css/jquery.pnotify.default.css"
// }, {
//     link: "../deps/jquery-2.0.3.min.js",
//     obj: "$('')"
// }, {
//     link: "../deps/jquery-ui-1.9.2.min.js",
//     obj: "$.ui"
// }, {
//     link: "../deps/codemirror/codemirror.min.js",
//     obj: "window.CodeMirror"
// }, {
//     link: "../deps/jquery.layout-1.3.0.min.js",
//     obj: "$.layout"
// },{
//     link: "../deps/jquery.toolbar.js",
//     obj: "$.toolbar"
// }, {
//     link: "../deps/jquery.terminal-0.7.10.min.js",
//     obj: "$.omap "
// }, {
//     link: "../deps/jquery.pnotify.min.js",
//     obj: "$.pnotify"
// }, {
//     link: "../deps/codemirror/javascript.js",
//     obj: "indentUnit"
// }, {
//     link: "../deps/codemirror/show-hint.js",
//     obj: "CodeMirror.showHint"
// }, {
//     link: "../deps/codemirror/javascript-hint.js"
// }, {
//     link: "../deps/codemirror/dialog.js"
// }, 
//  {
//     link: "../deps/codemirror/search.js"
// }, {link: "../deps/codemirror/search-cursor.js"}, 
// {link: "../deps/jquery-skinner.js",
//     obj: "$.skinner"
// },
// {link:"/deps/jstree/jquery.jstree.js"},
// {link:"/deps/upload/jquery.iframe-transport.js"},
// {link:"/deps/upload/jquery.fileupload.js"},
// {link:"/deps/upload/jquery.fileupload-process.js"},
// {link:"/deps/upload/jquery.fileupload-validate.js"},
// {link:"/deps/colorpicker/colorpicker.js"},
// {link:"/deps/colorpicker/eye.js"},
// {link:"/deps/colorpicker/utils.js"},
// {link:"/deps/colorpicker/css/colorpicker.css"},
// {link:"/deps/colorpicker/css/layout.css"},
// ];
//     dep.push({link:"/loaders/collada.js"});
//     dep.push({link:"/loaders/gltf.js"});
//     dep.push({link:"../deps/console.js"});
//     dep.push({link:"/deps/webgl-utils.js"});
//     dep.push({link:"/deps/webgl-debug.js"});
//     dep.push({link:"/deps/gl-matrix.js"});
//     dep.push({link:"/loaders/gl-matrix-ext.js"});
//     dep.push({link:"renderer.js"});
//     dep.push({link:"rest3d.js"});
//     dep.push({link:"viewer.js"});
//     dep.push({link:"state.js"});
//     dep.push({link:"camera.js"});
//     dep.push({link:"channel.js"});
//     dep.push({link:"/deps/screenfull.js"});


// function loadGUI(callback) {
//     var callback = callback;

//     function result() {
//         initGUI();
//         if(callback){callback.apply();}
//         h2.parentNode.removeChild(h2);
//         progress.parentNode.removeChild(progress);
//         container.parentNode.removeChild(container);
//         jump.parentNode.removeChild(jump);
//     }
//     var h2;
//     var container;
//     var progress;
//     var jump;
//     var countLog=0;
//     var flag = true;
//     var head =  document.getElementsByTagName('head').item(0),
//     body =document.getElementsByTagName('body')[0],
//         $script = null;
//     var s = document.createElement('script');
//     s.type = 'text/javascript';
//     s.src = "../deps/q-0.9.6.js";
//     s.async = true;
//     s.onreadystatechange = s.onload = function () {
//         var state = s.readyState;
//         if (!state || /loaded|complete/.test(state)) {
//             getScripts(dep);
//             addLog(s.src + " loaded");
//             removeScript();
//             // return true;
//         } else {
//             removeScript();
//         }
//     };
//     function addProgress(){
//         var body = document.getElementsByTagName('body')[0];
//         h2 = document.createElement("h2");
//         h2.style.position = "relative";
//         h2.style.left = "43%";
//         h2.innerHTML = "Rest3d UI loading...";
//         jump = document.createElement("p");
//         container = document.createElement("div");
//         container.style = "position:relative;left:12%;border:1px solid blue;width:76%;height:80%;overflow:auto";
//         container.style.position = "relative";
//         container.style.left = "12%";
//         container.style.border = '1px solid blue';
//         container.style.height='80%';
//         container.style.width='76%'
//         container.style.overflow = "auto";
//         progress = document.createElement("progress");
//         progress.value = "0";
//         progress.max ="100";
//         progress.id = "progress";
//         progress.style.position = "relative";
//         progress.style.width='76%'
//         progress.style.left = "12%";
//         body.appendChild(h2);
//         body.appendChild(progress);
//         body.appendChild(jump);
//         jump.appendChild(container);
//     }

//     function progressBar(){
//         var scale = 100/(dep.length-1);
//         progress.value = progress.value +scale;
//     }

//     function addLog(TXT,fl){
//         var newP=document.createElement("p");
//         newP.id='par_'+countLog;
//         var newT = document.createTextNode(TXT);
//         if(fl){newP.style.color="red";}
//         if(countLog==0){container.appendChild(newP);}
//         else{container.insertBefore(newP,document.getElementById('par_'+(countLog-1)));}
//         bufferElement=newP;
//         newP.appendChild(newT);
//         countLog++;
//     }
//     addProgress();
    
    

//     // function UrlExists(url) {
//     //     var http = new XMLHttpRequest();
//     //     http.open('HEAD', url, false);
//     //     http.send();
//     //     return http.status != 404;
//     // }
//     // use body if available. more safe in IE
//     head.appendChild(s);
//     $script = s;
//     var counter = 0;

//     var injectScriptPromise = function (url) {
//         var deferred = Q.defer();
//         counter++;
//         if (url.hasOwnProperty('obj')) {
//             try {
//                 var condition = eval("typeof " + url.obj);
//             } catch (err) {
//                 condition == 'undefined';
//             }
//         }
//         if (!condition || condition == 'undefined') {
//             var ext = url.link.match(/\.[^.]+$/);
//             if (ext[0] == ".js") {
//                 var s = document.createElement('script');
//                 s.type = 'text/javascript';
//                 s.src = url.link;
//                 s.async = true;
//                 var flagTimeout = true;
//                 setTimeout(function () {
//                     if (flagTimeout) {
//                         addLog(url.link +" couldn't be loaded",true);
//                         deferred.reject(new Error(url.link + " couldn't be loaded"));
//                     };
//                 }, 1500);
//                 s.onreadystatechange = s.onload = function () {
//                     var state = s.readyState;
//                     if (!state || /loaded|complete/.test(state)) {
//                         deferred.resolve(counter);
//                          addLog(s.src + " loaded");
//                         removeScript();progressBar();
//                         flagTimeout = false;
//                     } else {
//                         removeScript();
//                         console.debug("fail!");
//                         deferred.reject(new Error(url.link + " couldn't be loaded"));
//                         addLog(url.link +" couldn't be loaded",true)
//                         flagTimeout = false;
//                     }
//                 };
//             } else if (ext[0] == ".css") {
//                     var s = document.createElement('link');
//                     s.rel = 'stylesheet';
//                     s.href = url.link;
//                     addLog(s.href + " loaded");
//                     progressBar();
//                     deferred.resolve(counter);
//             }
//             // use body if available. more safe in IE
//             try{head.appendChild(s);}catch(err){addLog(url.link +" couldn't be loaded",true)}
//             $script = s;
//         } else {
//             deferred.resolve(counter);
//             // addLog("!!!" + s.src + " loaded");
//             console.warn(url.link.replace(/^.*[\\\/]/, '') + " already loaded");
//             addLog( url.link.replace(/^.*[\\\/]/, '') + " already loaded",true);
//         }
//         return deferred.promise;
//     };
//     var  removeScript = function () {
//         $script.onload = $script.onreadystatechange = null;
//         // Remove the script
//         if ($script.parentNode) {
//             $script.parentNode.removeChild($script);
//         }
//     };
//     var getScripts = function (files) {
//         var file = files;
//         var promise_chain = Q.fcall(function () {
//             return 0
//         });
//         var tabChar = [];

//         for (var i = 0; i < file.length; i++) {
//             var tmp = file[i];
//             var promise_link = function (tmp) {
//                 var tefa = file[tmp];
//                 return injectScriptPromise(tefa);
//             }
//             tabChar[i] = promise_link;
//             delete tmp, promise_link;
//         }

//         tabChar.forEach(function (f) {
//             promise_chain = promise_chain.then(f);
//         });
//         promise_chain.done(result);
//     };
// }
