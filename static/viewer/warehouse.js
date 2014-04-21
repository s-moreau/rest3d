        'use strict';
    define(   ['viewer','gui','uploadViewer'    , 'rest3d','q','collada','gltf','renderer','state','channel'], 
  function(viewer  , gui , setViewer6Upload , rest3d  , Q , COLLADA , glTF , RENDERER , State , Channel) {
        var nodeBuffer;
        window.renderMenu.addTab({
            id: "tree",
            text: "  Warehouse",
        });
        function parseWarehouseJson(param_in,param_out){
            function children(param_in,param_out){
                for (var j=0; j<param_in.length;j++){
                    var result = {};
                    var tmp =param_in[j];
                        var ext = tmp.name.match(/\.[^.]+$/);
                        if(ext=='.dae'){
                            ext = "collada";
                             result.data = tmp.name.substr(0,60);
                        result.attr = {"id":result.data,"rel":ext,"name":result.data};
                        param_out.push(result);
                        }
                        else if(ext=='.kml'){
                            ext = "kml";
                             result.data = tmp.name.substr(0,60);
                        result.attr = {"id":result.data,"rel":ext,"name":result.data};
                        param_out.push(result);
                        }
                        else if(ext=='.jpg'||ext=='.png'||ext=='.jpeg'||ext=='.tga'){
                            ext = "image";
                             result.data = tmp.name.substr(0,60);
                        result.attr = {"id":result.data,"rel":ext,"name":result.data};
                        param_out.push(result);
                        }
                        else if(ext=='.txt'){
                            ext = "text";
                             result.data = tmp.name.substr(0,60);
                        result.attr = {"id":result.data,"rel":ext,"name":result.data};
                        param_out.push(result);
                        }
                        else{
                            ext = "folder";
                            result.data = tmp.name.substr(0,60)||"folder";
                            result.attr = {"id":result.data,"rel":ext,"name":result.data};
                            result.children = [];
                            result.children = children(tmp.children,result.children);
                            param_out.push(result);
                        }
                    }
                    return param_out;
                }
            if(param_in.hasOwnProperty("assets")){
                var assets = param_in.assets;
            }
            if(assets&&(assets.length==0||assets==null)){
                if(nodeBuffer){try{nodeBuffer.attr("rel","empty");}catch(e){}};
            }
            else if(param_in.type == "folder"||param_in.type == "asset"){
                var result = {};
                var path = param_in.children;
                try{result.data = param_in.name.substr(0,60)}
                catch(err){
                    result.data = "folder";}
                result.attr = {"id":result.data,"rel":"folder","name":result.data};
                result.children = [];
                result.children = children(param_in.children,result.children);
                param_out.push(result);
            }
            else{
                for(var i =0;i<assets.length;i++){
                    var result = {};
                    var asset = assets[i];
                    result.data = asset.name.substr(0,60);
                    result.state = "closed";
                    result.attr = {"id":asset.id,"rel":asset.type,"iconuri":asset.iconUri,"name":result.data,"previewuri":asset.previewUri,"asseturi":asset.assetUri};
                    param_out.push(result);
                }
            }
            return param_out;        
        };

        function download(node){
            var href = $('<a style="display:none" href="/rest3d/warehouse/data/'+node.attr("id")+'" target="_blank"></a>');
            $('body').append(href);
            href[0].click();
            href[0].remove();
        }
        function convert(node){
            var url = node.attr("path").split("/");
            var params= {};
            params.file = {};
            params.file.uri = "";
            for(var i=5;i<url.length;i++){
                params.file.uri += '/'+url[i];
            }
            var callback = function(data){
                var html = "<ul>";
                var buffer = [];
                for(var i = 0; i<data.result.files.length;i++){
                    var tmp = data.result.files[i];
                    var ext = tmp.name.match(/\.[^.]+$/);
                    var url = location.protocol+'//'+location.hostname+'/rest3d/upload/'+tmp.name;
                    if(ext[0]=='.DAE'||ext[0]=='.dae'||ext[0]=='.json'){
                        var id = 'model_'+tmp.size+'_'+Math.floor(Math.random() * 1000000) + 1;
                        html += '<li><a>name: '+tmp.name+' </a>'+'<a>size: '+tmp.size+' </a>'+'<a href="'+url+'">download</a>'+'<button id="'+id+'">Display</button>'+'</li>';
                        buffer.push({'id':'#'+id,'url':url});
                    }
                    else{
                        html += '<li><a>name: '+tmp.name+' </a>'+'<a>size: '+tmp.size+' </a>'+'<a href="'+url+'">download</a></li>';
                    }
                }
                 html += '</ul>';
                 GUI.notification({
                title: "convert "+node.attr("name"),
                text: html,
                type: "notice"
            });
                 setTimeout(function(){
           for(var j=0;j<buffer.length;j++){
                var uri = buffer[j].url;
               $(buffer[j].id).click(function(){
                    window.pleaseWait(true);
                    glTF.load(uri, viewer.parse_gltf).then(
                    function(flag){
                          window.pleaseWait(false);
                          window.notif(uri);
                    }).fail(function(){
                        window.pleaseWait(false);
                        console.error("loading failed!!");
                    });
                });
       }
       },500);
                }
            rest3d.convert(params,callback);
        }

        function display(node){
            node.attr("type","uploaded");
            var uri = node.attr("asseturi");
            var call = function(data){
                var deferred = Q.defer();
       //          var html = '<ul>';
       //          var buffer = [];
       //          data = JSON.parse(data);
       //          var position = data.files;
       //          for(var i=0;i<data.files.length;i++){
       //              var name = data.files[i].name;
       //              var size = data.files[i].size;
       //              var path = data.files[i].path;
       //              var url = location.protocol+'//'+location.host+'/rest3d/'+path;
       //              var ext = name.match(/\.[^.]+$/);
       //              if(ext[0]=='.DAE'||ext[0]=='.dae'){
       //                  node.attr("path",url);
       //                  html += '<li><a>name: '+name+' </a>'+'<a>size: '+size+' </a>'+'<a href="'+url+'">download</a>'+'<button id="model_'+size+'">Display</button>'+'</li>';
       //                  buffer.push({'id':'#model_'+size,'url':url});}
       //              else{
       //                  html += '<li><a>name: '+name+' </a>'+'<a>size: '+size+' </a>'+'<a href="'+url+'">download</a></li>';}
       //      }
       //      html += '</ul>';
       //      GUI.notification({
       //          title: "Upload "+node.attr("path"),
       //          text: html,
       //          type: "notice"
       //      });
       //      deferred.resolve(true);
       //      // if($button){
       //      //     $('#'+name+'_'+size).append($button);
       //      // }
       //  setTimeout(function(){
       //     for(var j=0;j<buffer.length;j++){
       //          var uri = buffer[j].url;
       //         $(buffer[j].id).click(function(){
       //              window.pleaseWait(true);
       //              COLLADA.load(uri, viewer.parse_dae).then(
       //              function(flag){
       //                    window.pleaseWait(false);
       //                    window.notif(uri);
       //              }).fail(function(){
       //                  window.pleaseWait(false);
       //                  console.error("loading failed!!");
       //              });
       //          });
       // }
       // },500);
        //      GUI.notification({
       //          title: "Upload "+node.attr("path"),
       //          text: html,
       //          type: "notice"
       //      });

                var e = {};
                e.idToDrop = "c_"+viewer.idUser;
                data = jQuery.parseJSON(data);
                window.sortAssetDrop(e,data);
                window.visualize(data);
                deferred.resolve();
                renderMenu.render.focusTab();
                return deferred.promise;
            };
            rest3d.urlUpload(uri,call,viewer.idUser);
        }
        function preview(node){
            $("#dialog").dialog("close");
            var gitHtml = $('<div id="dialog"><iframe id="myIframe" src="" style="height:100% !important; width:100% !important; border:0px;"></div>');
            gitPanel = $('body').append(gitHtml);
            $("#dialog").dialog({
                title: node.attr('name'),
                width: '600',
                height: '500',
                open: function () {
                    $('#myIframe').attr('src',node.attr("previewuri"));
                },
                close: function(){
                    gitHtml.remove();
                },
            });
           $("#dialog").css({'min-height':'none !important;'});
        }
        function icon(node){
             $("#dialog").dialog("close");
            var gitHtml = $('<div id="dialog"><img src="'+node.attr("iconuri") + '" /></div>');
            gitPanel = $('body').append(gitHtml);
            $("#dialog").dialog({
                title: node.attr('name'),
                width: '300',
                height: '300',
                open: function () {
                    $('#myIframe').attr('src',node.attr("iconuri"));
                },
                close: function(){
                    gitHtml.remove();
                },
            });
           $("#dialog").css({'min-height':'none !important;'});
        }
        var accor = GUI.accordion({
            id:"warehouse_accor",
            parent:renderMenu.tree,
              item: [{
                id: "sample",
                text: "Sample of collections"
            }, {
                id: "search",
                text: "Search among the warehouse"
            }, ]
        })
        GUI.treeBis({
            id:'warehouse',
            parent: accor.sample,
            json:  {
                "ajax" : {
                    "type": 'GET',
                    "url": function (node) {
                        nodeBuffer = node;
                        var nodeId = "";
                        var url = "";
                        if (node == -1)
                        {
                            url = location.protocol+"//"+location.host+"/rest3d/warehouse/";
                        }
                        else if(node.attr('rel')=="collection"||"model")
                        {
                            nodeId = node.attr('id');
                            url = location.protocol+"//"+location.host+"/rest3d/warehouse/" + nodeId;
                        }
                        return url;
                    },
                    "success": function (new_data) {

                        var result = [];
                        result=parseWarehouseJson(new_data,result);
                        return result;
                    }
                }
            },
           "contextmenu" : {
                "items" : function (node) {
                    var result = {};
                    if(node.attr("iconuri")){
                        result.icon = {'label':'Display icon','action':icon,};}
                    if(node.attr("rel")=="model"){
                        result.display = {'label':'Upload','action':display,};
                        result.download = {'label':'Download','action':download,};
                    }
                    if(node.attr("previewuri")){
                        result.preview = {'label':'Preview model','action':preview,};}
                    return result;
                }
            },
            type:  { "types": {
                "folder": {
                    "icon" : {
                        "image" : "../gui/images/folder.png",
                    },
                    },
                "collection": {
                    "icon" : {
                        "image" : "../gui/images/menu-scenes.png",
                    },
                    },
                "collada": {
                    "icon" : {
                        "image" : "../favicon.ico",
                    },
                    },
                "text": {
                    "icon" : {
                        "image" : "../gui/images/file.png",
                    },
                    },
                "kml": {
                    "icon" : {
                        "image" : "../gui/images/kml.png",
                    },
                    },
                 "image": {
                    "icon" : {
                        "image" : "../gui/images/media-image.png",
                    },
                    },
                "model": {
                    "icon" : {
                        "image" : "../gui/images/bunny.png",
                    },
                    },
                "empty": {
                    "icon" : {
                        "image" : "../gui/images/cross.jpg",
                    },
                    },
            }},
            themes:{
            "theme":"apple",
            },
    })
        
        var searchInput = GUI.addInput("searchInputWarehouse", "Paris", accor.search).width("77%");
        searchInput.keypress(
          function(e){
          if (e.keyCode==13){
            var im = GUI.image(accor.search, "img-loadingWarehouse", "../gui/images/loadingV2.gif", 15, 15);
            searchTree.warehouseSearch.jstree("refresh");
            } 
        });
        var submitSearch = GUI.button("search", accor.search, function(){
            var im = GUI.image(accor.search, "img-loadingWarehouse", "../gui/images/loadingV2.gif", 15, 15);
            searchTree.warehouseSearch.jstree("refresh");
        });
        var searchTree = GUI.treeBis({
            id:'warehouseSearch',
            parent: accor.search,
            json:  {
                "ajax" : {
                    "type": 'GET',
                    "url": function (node) {
                        nodeBuffer = node;
                        var nodeId = "";
                        var url = "";
                        // var type = node.attr('type'); 
                        if (node == -1)
                        {
                            url = location.protocol+"//"+location.host+"/rest3d/warehouse/search/"+searchInput.val();
                        }
                        else if(node.attr('rel')=="collection"||"model")
                        {
                            nodeId = node.attr('id');
                            url = location.protocol+"//"+location.host+"/rest3d/warehouse/" + nodeId;
                        }
                        return url;
                    },
                    "success": function (new_data) {
                        var result = [];
                        $("#img-loadingWarehouse").remove();
                        result=parseWarehouseJson(new_data,result);
                        return result;
                    }
                }
            },
            "contextmenu" : {
                "items" : function (node) {
                    var result = {};
                    if(node.attr("iconuri")){
                        result.icon = {'label':'Display icon','action':icon,};}
                    if(node.attr("rel")=="model"){
                        result.display = {'label':'Upload','action':display,};
                        result.download = {'label':'Download','action':download,};
                    }
                    if(node.attr("previewuri")){
                        result.preview = {'label':'Preview model','action':preview,};}
                    return result;
                }
            },
            type:  { "types": {
                "folder": {
                    "icon" : {
                        "image" : "../gui/images/folder.png",
                    },
                    },
                "collection": {
                    "icon" : {
                        "image" : "../gui/images/menu-scenes.png",
                    },
                    },
                "collada": {
                    "icon" : {
                        "image" : "../favicon.ico",
                    },
                    },
                "text": {
                    "icon" : {
                        "image" : "../gui/images/file.png",
                    },
                    },
                "kml": {
                    "icon" : {
                        "image" : "../gui/images/kml.png",
                    },
                    },
                 "image": {
                    "icon" : {
                        "image" : "../gui/images/media-image.png",
                    },
                    },
                    //select_node : function () {return false;}
                "model": {
                    "icon" : {
                        "image" : "../gui/images/bunny.png",
                    },
                    },
                "empty": {
                    "icon" : {
                        "image" : "../gui/images/cross.jpg",
                    },
                    },
            }},
            themes:{
            "theme":"apple",
            // "icons": false,
            },
    })

        submitSearch.prop("id","submitSearch")
        GUI.image(renderMenu.tree.title, "img-render", "../gui/images/menu-scenes.png", 12, 14, "before");

});