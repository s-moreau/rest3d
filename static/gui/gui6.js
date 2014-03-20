/*
 GUI.js 

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

 GUI.js needs jquery, jqueryUI and jqueryUI layout
*/
/***
  Require Underscore, if we're on the server, and it's not already present.
  var _ = root._;
  if (!_ && (typeof require !== 'undefined')) _ = require('underscore')._;
***/
// UI library
// Initial Setup
// -------------
// Save a reference to the global object (`window` in the browser, `exports`
// on the server).
/**
 * Load external script and return a promise
 * to be resolved when script is loaded
 */

    // The top-level namespace. All public GUI classes and modules will
    // be attached to this. Exported for both CommonJS and the browser.


define(['channel','codemirror','webglUtils', 'WebGLDebugUtils','pnotify','colorpicker','jquerylayout','toolbar','terminal','jstree','upload','searchCursor','search','dialog','screenfull','javacriptHint','showHint','javascript'], 
  function () {
    
    var GUI;

    GUI = this.GUI = {};

    // Current version of the library. Keep in sync with `package.json`.
    GUI.VERSION = '0.0.1';

    GUI.bufferLayout = [];

    GUI.mainMenu = '';

    GUI.flagResize = true;

    GUI.makeScrollable = function (guiObj) {
        guiObj.on("mousewheel DOMMouseScroll", function (e) {
            $(this).scrollTop($(this).scrollTop() - e.originalEvent.wheelDelta);
            e.preventDefault();
        })
    };


    // add button
    GUI.button = function (_txt, _parent, _callback, _x1, _y1, _x2, _y2, _textEnabled, _icon) {
        var $button = $('<button></button>');
        var callback = _callback;

        $button.button().click(function (event) {
            if (callback) callback.call(this);
            event.preventDefault();
        });
        // create unique ID
        $button.button().uniqueId();
        var id = $button.attr('id');
        if (_txt !== undefined && _txt !== null) {
            var params = {
                label: _txt
            };
            if (_icon != undefined)
                params["icons"] = {
                    primary: _icon
                };
            if (_textEnabled != undefined)
                params["text"] = _textEnabled;

            $button.button(params);
        }
        if (_x1 !== undefined && _y1 !== undefined) {
            $button.css('position', 'absolute');
            $button.css('left', _x1);
            $button.css('top', _y1);
            if (_y2 !== undefined && _y1 !== undefined) {
                _y2 -= _y1;
                _x2 -= _x1;
            }
        }
        if (_y2 !== undefined && _y1 !== undefined) {
            $button.css('height', _y2);
            $button.css('width', _x2);
        }

        if (!_parent)
            $('body').append($button);
        else
            $(_parent).append($button);
        return $button
    };

    GUI.label = function (_id, _txt, _parent, _style, _mode) {
        var label = '';
        if (_mode == "isolate") {
            label = '<p';
            if (_id) label += ' id= "p' + _id;
            label += '" >';
        }
        if (_mode == "justify") {
            label += '<div style="text-align: justify">';
        }
        label += '<span style="' + _style;
        if (_id) label += '" id= "' + _id;
        label += '">' + _txt + '</span>';
        if (_mode == "justify") {
            label += '</div>';
        }
        if (_mode == "isolate") {
            label += '</p>';
        }
        var $label = $(label);
        if (!_parent)
            $('body').append($label);
        else if (_mode == "replace")
            $(_parent).appendTo($label);
        else
            $(_parent).append($label);
        return $label;
    };

    GUI.progress = function(_json){
        function Progress(_json){
            this.id = _json.id;
            this.parent = _json.parent;
            this.generateHTML = function(){
                this.html = '<progress id="'+this.id+'" value=0 max=100 />';
            }
            this.setValue = function(x){
                this[this.id].prop("value",x);
            }
            this.createWidget = function(){
                this.parent.append(this.html);
                this.createJqueryObject();
            }
            this.createJqueryObject = function(){
                this[this.id]=$("#"+this.id);
            }
        }
        var tmp = new Progress(_json);
        tmp.generateHTML();
        tmp.createWidget();
        return tmp;
    }

    GUI.upload = function(_json){
        function Upload(_json){
            this.id = _json.id;
            this.parent = _json.parent;
            this.url = _json.url;
            this.generateHTML = function(){
                this.html = "<div id='"+this.id+"' class='container'>";
                this.html+="<input id='fileupload_"+this.id+"' style='display:none;' type='file' name='files[]' multiple>"
            }
            this.createWidget = function(){   
                this.parent.append(this.html);
                this.createJqueryObject();
                var stock=this;
                this.button = GUI.button("Add files...",this[this.id],function(){
                    $('#fileupload_'+stock.id).click();
                }).width("100%");
                this[this.id].append("<hr>");

                this.dropzone = GUI.image(this[this.id],"image_"+this.id,"../gui/images/upload_d.png","100%","100px");
                GUI.addTooltip({
                        parent: this.dropzone,
                        content: "Drag&drop area",
                    });
                this[this.id].css("text-align","center");
                this[this.id].append("<hr>");//

                this.progress = GUI.progress({
                    id:"progress_"+this.id,
                    parent:this[this.id],
                });
                this[this.id].append('<div id="fileArea_'+this.id+'"></div>');
                
               // $('#fileArea_'+this.id).append('<div style="border: 1px solid grey; border-top: none; width:100%;" ><span style="float:left !important;">Fildsdsdsdsde</span></div>');
            }
            this.callOnClick = function(cb){
                this.button.on('click',function(){
                    cb.call();
                })
            }
            this.jqueryUpload = function(){
                var stock = this;                                                                                                                                                                        
                this.object = this.upload1.fileupload({
                    url: stock.url,
                    dataType: 'json',
                    autoUpload: false,
                    acceptFileTypes: /(\.|\/)(dae|png|tga)$/i,
                    maxFileSize: 100000000, // 100 MB
                    loadImageMaxFileSize: 15000000, // 15MB
                    disableImageResize: false,
                    previewMaxWidth: 100,
                    previewMaxHeight: 100,
                    previewCrop: true,
                    dropZone: stock.dropzone,      
            });
            }
            this.createJqueryObject = function(){
                this[this.id]=$('#'+this.id);
                this.upload1 = $('#fileupload_'+this.id);
                this.filesArea = $('#fileArea_'+this.id);
            }
            function htmlSpan(parent,percentage,html){
                    if(!html){html="";}
                    var $result = $('<span style="display:inline-block !important; width:'+percentage+'% !important;">'+html+'</span>');
                    parent.append($result);
                    if(percentage<20)$result.addClass("btn-upload");
                    return $result;
                }

            function htmlDiv(parent,head){
                    if(head){
                        var $result = $('<div style="border: 1px solid grey; width:100%;"></div>');}
                    else{
                        var $result = $('<div style="border: 1px solid grey; border-top:none; width:100%;"></div>');}
                    parent.append($result);
                    return $result;
                }

            this.header = function(flag){
                var stock = this;
                this.filesArea.append('<br>');
                var $frame = $('<div class="upload_header"></div>');
                this.filesArea.append($frame);
                var $head = htmlDiv($frame,true);
                if(flag){
                    var $span = htmlSpan($head,90,GUI.time(true)+" convert "+flag);
                }
                else{var $span = htmlSpan($head,90,GUI.time(true)+" Upload");}
                $span.css("font-weight","bold");
                var $spanButton = htmlSpan($head,10);
                var $j = $("<button>X</button>").on('click', function (){
                    $frame.hide();
                    stock.filesArea.children("br").last().remove();
                });
                $spanButton.append($j);
                return $frame;
            };
            this.upload = function(parent,link,button,button1,button2){
                var $newLine = htmlDiv(parent,false);
                if(!button&&!button1&&!button2){
                    var $span = htmlSpan($newLine,100,link);
                    $span.css("text-align","left");}
                else if(!button1&&!button2){
                    var $span = htmlSpan($newLine,70,link);
                    $span.css("text-align","left");
                    var $spanButton = htmlSpan($newLine,10);
                    $spanButton.append(button);
                }
                else{
                    var $span = htmlSpan($newLine,70,link);
                    $span.css("text-align","left");
                    var $spanButton = htmlSpan($newLine,10);
                    var tooltip = button1.html();
                    button1.html("");
                    GUI.addIcon(button1, "ui-icon-play", "", "before");
                    $spanButton.append(button1);
                    button1.addClass("btn-upload");
                    GUI.addTooltip({
                        parent: button1,
                        content: tooltip,
                    });
                    button1.hide();
//
                    var $spanButton2 = htmlSpan($newLine,10);
                    var tooltip = button.html();
                    button.html("");
                    GUI.addIcon(button, "ui-icon-newwin", "", "before");
                    $spanButton2.append(button);//
                     button.addClass("btn-upload");
                    GUI.addTooltip({
                        parent: button,
                        content: tooltip,
                    });
                    button.hide();

                    var $spanButton1 = htmlSpan($newLine,10);
                    var tooltip = button2.html();
                    button2.html("");
                    var arrowre = GUI.addIcon(button2, "ui-icon-arrowrefresh-1-n", "", "before");
                    $spanButton1.append(button2);
                    button2.addClass("btn-upload");
                    GUI.addTooltip({
                        parent: button2,
                        content: tooltip,
                    });
                    var array = ["ui-icon-arrowrefresh-1-n","ui-icon-arrowrefresh-1-e","ui-icon-arrowrefresh-1-s","ui-icon-arrowrefresh-1-w"]
                    button2.click(function(){
                        var i = 1;
                        setInterval(function(){
                            if(i>3){i=0;}
                            arrowre.remove();
                            arrowre = GUI.addIcon(button2, array[i], "", "before");
                            i++;
                        },500)
                    });
                }
            }
            this.download = function(parent,link,button){
                var $newLine = htmlDiv(parent,false);
                var $span = htmlSpan($newLine,90,link);
                $span.css("text-align","left");
                var $spanButton1 = htmlSpan($newLine,10);
                var tooltip = button.html();
                button.html("");
                GUI.addIcon(button, "ui-icon-disk", "", "before");
                button.addClass("btn-upload");
                $spanButton1.append(button);
                GUI.addTooltip({
                        parent: button,
                        content: tooltip,
                    });
            }
            this.convert = function(parent,link,launch,download,preview){
                var $newLine = htmlDiv(parent,false);
                var $span = htmlSpan($newLine,70,link);
                $span.css("text-align","left");
                var $spanButton1 = htmlSpan($newLine,10);
                var tooltip = launch.html();
                
           
                launch.html("");
                GUI.addIcon(launch, "ui-icon-play", "", "before");
                $spanButton1.append(launch).addClass("btn-upload");
                GUI.addTooltip({
                        parent: launch,
                        content: tooltip,
                    });
                var width = $spanButton1.width();
                //launch.width(width);

                var $spanButton2 = htmlSpan($newLine,10);
                tooltip = download.html();
                width = download.parent().width();
                download.html("");
                GUI.addIcon(download, "ui-icon-disk", "", "before");
                $spanButton2.append(download).addClass("btn-upload");
                GUI.addTooltip({
                        parent: download,
                        content: tooltip,
                    });
                width = $spanButton2.width();
                // download.width(width);

                var $spanButton3 = htmlSpan($newLine,10);
                tooltip = preview.html();
                preview.html("");
                GUI.addIcon(preview, "ui-icon-newwin", "", "before");
                $spanButton3.append(preview).addClass("btn-upload");
                GUI.addTooltip({
                        parent: preview,
                        content: tooltip,
                    });
                width = $spanButton3.width();
                // preview.width(width);
            }
            // this.createInfo = function(name,href,button){
            //     var tmp = this.header();
            //     this.upload(tmp,"tefa.js",$("<button>Upload</button>"))
            //     this.convert(tmp,"tefadsssss.js",$("<button>Dialog</button>"),$("<button>Display</button>"),$("<button>Downlo</button>"))
            // }
        }   
        var tmp = new Upload(_json);
        tmp.generateHTML();
        tmp.createWidget();
        tmp.createJqueryObject();
        tmp.jqueryUpload();
        return tmp;
    }

    GUI.treeBis = function(_json){
        function Tree(_json){
            this.json=_json;
            this.id=_json.id;
            this.parent=_json.parent;
            if(_json.hasOwnProperty("json")){
                this.jsonData = _json.json;
                this.mode= 1;
            }
            else if(_json.hasOwnProperty("html")){
                this.htmlInput = _json.html;
                this.mode= 2;
            }
            else if(_json.hasOwnProperty("xml")){
                this.xml = _json.xml;
                this.mode= 3;
            }
            else{
                console.error("No data type precised");}
            this.generateHTML = function(){
                this.html = "<div id="+this.id+"></div>";
                this.parent.append(this.html);
                if(this.mode=="html"){
                    $("#"+this.id).append(this.htmlInput);
                }
            }   
            this.generateJSON = function(){
                this.jsonInput={};
                if(this.json.hasOwnProperty("themes")){
                    this.jsonInput["themes"]=this.json.themes;}
                if(this.json.hasOwnProperty("type")){
                    this.jsonInput["types"]=this.json.type;
                }
                if(this.json.hasOwnProperty("contextmenu")){
                    this.jsonInput["contextmenu"]=this.json.contextmenu;
                }
                if(this.json.hasOwnProperty("search")){
                    this.jsonInput["search"]=this.json.search;
                }
                if(this.json.hasOwnProperty("core")){
                    this.jsonInput["core"]=this.json.core;
                }
                if(this.json.hasOwnProperty("plugin")){
                    this.jsonInput["plugins"]=this.json.plugin;
                }
                else{
                    this.jsonInput["plugins"]=["themes", "json_data", "ui", "types", "sort","contextmenu","search"];
                }
                console.debug(this.jsonInput)
            }
            this.createJqueryObject = function(){
                this[this.id] =$("#"+this.id);
            }
            this.createWidget = function(){
                switch(this.mode){
                    case 1:
                        this.jsonInput["json_data"]=this.jsonData;
                        this[this.id].jstree(this.jsonInput);
                        break;
                    case 2:
                        break;
                    case 3:
                        break;
                }
            }
            this.addEvent = function(event,_cb){
                this[this.id].on(event, function(a,b){_cb(a,b)});
            }
            this.remove = function(){
                this[this.id].remove();
                delete this;
            }
        }
        var tmp = new Tree(_json);
        tmp.generateHTML();
        tmp.createJqueryObject();
        tmp.generateJSON();
        tmp.createWidget();
        return tmp;
    }

    GUI.canvas = function (_parent) {
        $canvas = $(
            '<canvas id="tmp" class="ui-resize-me" style="padding: 0; margin: 0;" ></canvas>');
        if (!_parent)
            $('body').append($canvas);
        else {

            $parent = $(_parent);
            $parent.append($canvas);
        }
        return $canvas[0];
    };

    //----------------------------------------------------------------------------------------------------------------------------------------


    GUI.time = function (ms) {
        var html = '';
        var a = new Date();
        var myDate = a.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
        html += myDate;
        if(!ms){var ms = '.' + String((a.getUTCMilliseconds() / 1000).toFixed(3)).slice(2, 5);
        html +=  ms;}
        return html;
    }

    GUI.addInput = function (_id, _defaultValue, _parent, _onChangeCallback) {
        var html = '<span><input type="text" id="' + _id + '" name="' + _id + '"></span>';
        var jqueryObjectInput = $(html);
        var input = jqueryObjectInput.find("input");
        input.val(_defaultValue);

        if (_onChangeCallback != undefined)
            input.on('blur', _onChangeCallback);

        _parent.append(jqueryObjectInput);
        return input;
    }

    GUI.InputInteractive = function (_parent, _id, _min, _max, _defaultValue, _precision, _sensibility, _newLine) {
        function Object(_parent, _id, _min, _max, _defaultValue, _precision, _sensibility) {
            this.parent = _parent;
            this.id = _id;
            this.min = _min;
            this.max = _max;
            this.defaultValue = _defaultValue;
            this.input = $([]);
            this.html = '';
            this.callback = '';
            this.precision = _precision;
            this.sensibility = _sensibility;
            this.jqueryObjectInput = $([]);
            this.jqueryObjectButton = $([]);

            this.createButton = function () {
                this.jqueryObjectButton = GUI.button("", this.parent, '', '', '', '20', '23');
                this.jqueryObjectButton.css("position:relative; top: 10px !important;")
                /* GUI.addIcon = function (_parent, _cssClass, _style, _position)*/
                GUI.addIcon(this.jqueryObjectButton, "ui-icon-carat-2-n-s", "position:relative; bottom:6px !important; left:1px;");
                this.jqueryObjectButton.wrapAll('<span style="display:inline;"></span>')
            }

            this.buttonEvent = function () {
                var precision = this.precision;
                var input = this.jqueryObjectInput.find("input");
                var max = this.max;
                var min = this.min;
                var sensibility = this.sensibility;
                var callback = this.callback;
                this.jqueryObjectButton.click(function () {
                    var tmp = input.val() - (-precision); /*-(-this.precision);*/
                    var newPrecision = 1 / precision;
                    tmp = Math.round(tmp * newPrecision) / newPrecision;
                    if (tmp > max) {
                        tmp = max;
                    }
                    input.val(tmp);
                })
                this.jqueryObjectButton.mousedown(function () {

                    $(this).data("mousedown", true);
                    $(this).data("mouseup", true);

                    var element = $(this);
                    $(this).mouseleave(function () {
                        if (element.data("mouseup")) {
                            $(this).addClass('ui-state-active');
                        }
                    })
                    $('body').mouseup(function () {
                        element.removeClass('ui-state-active');
                        element.data("mouseup", false);
                        if (callback) {
                            callback.call();
                        };
                    })
                    var mY = 0;

                    $('body').mousemove(function (e) {
                        if (element.data("mouseup")) {
                            if (e.clientY < mY) {
                                var tmp = input.val() - (-precision);
                                var newPrecision = 1 / precision;
                                tmp = Math.round(tmp * newPrecision) / newPrecision;
                                if (tmp > max) {
                                    tmp = max;
                                }
                                if (tmp < min) {
                                    tmp = min;
                                }
                                if (sensibility) {
                                    setTimeout(function () {
                                        input.val(tmp)
                                    }, sensibility);
                                } else {
                                    input.val(tmp)
                                }
                            } else {
                                var tmp4 = input.val() - precision;
                                var newPrecision1 = 1 / precision;
                                tmp4 = Math.round(tmp4 * newPrecision1) / newPrecision1;
                                if (tmp4 > max) {
                                    tmp4 = max;
                                }
                                if (tmp4 < min) {
                                    tmp4 = min;
                                }
                                if (sensibility) {
                                    setTimeout(function () {
                                        input.val(tmp4)
                                    }, sensibility);
                                } else {
                                    input.val(tmp);
                                }
                            }
                            mY = e.clientY;
                        }
                    });
                })
            }

            this.createInput = function () {
                this.html = '<span style="display:inline; position: relative; left: 25px;"><input type="text" id="' + this.id + '" name="' + this.id + '" style="right: 40px !important; width: 80% !important;"></span>';
                this.jqueryObjectInput = $(this.html);
                this.input = this.jqueryObjectInput.find("input");
                this.parent.append(this.jqueryObjectInput);
            }

            this.inputEvent = function () {
                var max = this.max;
                var min = this.min;
                var precision = this.precision;
                var input = this.input;
                input.val(this.defaultValue);
                input.width(35);
                input.keypress(function (event) {

                    var check = $(this).data("check");
                    var charCode = (event.which) ? event.which : event.keyCode
                    if (charCode == 13) {
                        var check = Math.round(-Math.log(precision) / Math.LN10);
                        var value = input.val();
                        var valueNum = parseFloat(value);
                        var finalVal = valueNum.toFixed(check);
                        if (valueNum > max && value != '') {
                            finalVal = max;
                        }
                        if (valueNum < min && value != '') {
                            finalVal = min;
                        }
                        input.val(finalVal);
                        if ($(this).data("changeCallback") != undefined) {
                            $(this).data("changeCallback")();
                        }
                    }
                    if (charCode > 31 && (charCode < 48 || charCode > 57) && charCode != 46) {
                        if (charCode == 45) {
                            return true;
                        } else {
                            return false;
                        }
                    } else {
                        return true;
                    }
                })
                input.on('blur', function () {
                    var check = Math.round(-Math.log(precision) / Math.LN10);
                    var value = input.val();
                    var valueNum = parseFloat(value);
                    if (valueNum > max && value != '') {
                        $(this).val(max);
                        return;
                    }
                    if (valueNum < min && value != '') {
                        $(this).val(min);
                        return;
                    }
                    input.val(valueNum.toFixed(check));
                });
            }


            this.onChange = function (callback) {
                this.jqueryObjectInput.find("input").on('blur', callback);
                this.jqueryObjectInput.find("input").data("changeCallback", callback);
                this.callback = callback;
                this.buttonEvent();
            }
        }

        var tefa = new Object(_parent, _id, _min, _max, _defaultValue, _precision, _sensibility);
        tefa.parent.append('<div id="content-' + tefa.id + '" style="" >'); /*float: left !important*/
        tefa.createButton();
        tefa.createInput();
        tefa.buttonEvent();
        tefa.inputEvent();
        tefa.parent.append('</div>');
        if (_newLine) {
            tefa.parent.append("</br>");
        }
        return tefa;
    }


    GUI.accordion = function (_json) {
        function Accordion(_json) {
            this.idObject = _json.id;
            this.parent = _json.parent;
            this.items = [];
            this.links = [];
            this.id = [];
            this.listJqueryObjectElement = [];
            var stock = this;
            for (var nbItem = 0; nbItem < _json.item.length; nbItem++) {
                this.items[nbItem] = _json.item[nbItem].text;
                this.id[nbItem] = _json.item[nbItem].id;
                if (_json.item[nbItem].hasOwnProperty("content")) {
                    this.links[nbItem] = _json.item[nbItem].content;
                } else {
                    this.links[nbItem] = false;
                }
            }

            this.init = function () {
                this.html = '<div id="' + this.idObject + '" >'
                for (var i = 0; i < this.items.length; i++) {
                    this.html += '<h3 id="' + this.id[i] + '_header">' + this.items[i] + '</h3><div id="' + this.id[i] + '" >';
                    if (this.links[i]) {
                        this.html += this.links[i];
                    }
                    this.html += '</div>';
                }

                this.html += '</div>';
            }

            this.create = function () {
                this.parent.append(this.html);
                this.jqueryObjectRoot =  $("#"+this.idObject);
                this.jqueryObjectRoot.accordion({
                    header: "h3",
                    navigation: true,
                    collapsible: true,
                    active: false,
                    heightStyle: "content"
                });
            }


            this.refresh = function () {
                stock = this;
                this.jqueryObjectRoot.accordion("refresh");
            }

            this.createJqueryObjects = function () {
                for (var nbId = 0; nbId < this.id.length; nbId++) {
                    this[this.id[nbId]] = $("#" + this.id[nbId]);
                    this[this.id[nbId]]["header"] = $("#" + this.id[nbId] + "_header");
                    this.listJqueryObjectElement[nbItem] = this[this.id[nbId]];
                }
            }
            $.fn.removeJqueryObjectA = function () {
                delete stock[this.prop("id")];
            }

            $.fn.recallItem = function (id) {
                this.removeJqueryObjectA();
                this.removeAttr('id');
                this.prop("id", id);
                stock[id] = $('#' + id);
                this.header.removeJqueryObjectA();
                this.header.removeAttr('id');
                this.header.prop("id", id + "_header");
                stock[id]["header"] = $('#' + id + '_header');
            }

            $.fn.removeItem = function () {
                this.removeJqueryObjectA();
                this.header.removeJqueryObjectA();
                this.header.remove();
                this.remove();
                stock.refresh();
            }

            this.removeAllAccordion = function () {
                this.refresh();
                this.jqueryObjectRoot.remove();
                this.refresh();
                for (var key in this) {
                    delete this[key];
                }
                delete this;
            }


            this.addItem = function (_json) {
                this.html = '';
                this.html += '<h3 id="' + _json.id + '_header">' + _json.text + '</h3><div id="' + _json.id + '" >';
                if (_json.content) {
                    this.html += _json.content;
                }
                this.html += '</div>';

                this.html += '</div>';

                if (_json.hasOwnProperty("before") && _json.before) {
                    if (_json.hasOwnProperty("position")) {
                        this[_json.position]["header"].before(this.html);
                    } else {
                        this.jqueryObjectRoot.before(this.html);
                    }
                } else {
                    if (_json.hasOwnProperty("position")) {
                        this[_json.position].after(this.html);
                    } else {
                        this.jqueryObjectRoot.after(this.html);
                    }
                }

                this.refresh();
                this[_json.id] = $('#' + _json.id);
                this[_json.id]["header"] = $("#" + _json.id + "_header");
                this["listJqueryObjectElement"].push(stock[_json.id]);
            }

            $.fn.onClick = function (_callback) {
                this.header.on("click", function (event) {
                    _callback.call();
                });
            }

            this.allOpenable = function () {
                this.jqueryObjectRoot.on("accordionbeforeactivate", function (event, ui) {
                    if ((($.trim($(ui.newPanel).html()).length == 0) && ($(ui.oldHeader).length == 0)) || (($.trim($(ui.newPanel).html()).length == 0) && ($(ui.newHeader).length))) {
                        event.preventDefault();
                    }
                    if (ui.newHeader[0]) {
                        var currHeader = ui.newHeader;
                        var currContent = currHeader.next('.ui-accordion-content');
                        // console.debug(currHeader.offset().top);
                        // $("#renderMenus_content").scrollTop(currHeader.offset().top+($("#renderMenus_content").scrollTop()/2));
                    } else {
                        var currHeader = ui.oldHeader;
                        var currContent = currHeader.next('.ui-accordion-content');
                    }
                    var isPanelSelected = currHeader.attr('aria-selected') == 'true';
                    currHeader.toggleClass('ui-corner-all', isPanelSelected).toggleClass('accordion-header-active ui-state-active ui-corner-top', !isPanelSelected).attr('aria-selected', ((!isPanelSelected).toString()));
                    currHeader.children('.ui-icon').toggleClass('ui-icon-triangle-1-e', isPanelSelected).toggleClass('ui-icon-triangle-1-s', !isPanelSelected);
                    currContent.toggleClass('accordion-content-active', !isPanelSelected)
                    if (isPanelSelected) {
                        currContent.slideUp();

                    } else {
                        currContent.slideDown();
                    }
                    return false;
                });
            }
            this.autoScrollDown = function () {
                $(".ui-accordion-header").on("click", function (event, ui) {
                    var buffer = this;
                    var container = $("#renderMenus_content"),
                        scrollTo = $(this);
                    setTimeout(function () {
                        // console.debug(scrollTo.offset().top + "  " +scrollTo.next().height()+"  "+container.height())
                        if (scrollTo.offset().top + scrollTo.next().height() > container.height()) {
                            container.scrollTop(
                                scrollTo.offset().top - container.offset().top + container.scrollTop()
                            );
                        }
                    }, 300);

                });
            }

        }

        var tmp = new Accordion(_json);
        tmp.init();
        tmp.create();
        tmp.createJqueryObjects();
        tmp.allOpenable();
        return tmp;
    };

    GUI.script = function (_json) {
        function Script(_json) {
            this.idObject = _json.id;
            this.parent = _json.parent;
            this.content = _json.content;
            var stock = this;
            this.init = function () {
                this.html = '';
                this.html += '<form><textarea id="' + this.idObject + '" name="' + this.idObject + '">' + this.content + '</textarea></form>';
            }
            this.create = function () {
                this.jqueryObjectRoot = this.parent.append(this.html);
                CodeMirror.commands.autocomplete = function (cm) {
                    CodeMirror.showHint(cm, CodeMirror.hint.javascript);
                };
                this.object = CodeMirror.fromTextArea(document.getElementById(stock.idObject), {
                    lineNumbers: true,
                    styleActiveLine: true,
                    matchBrackets: true,
                    mode: "javascript",
                    autofocus: true,
                    extraKeys: {
                        "Ctrl-Space": "autocomplete"
                    },
                    smartIndent: false,
                });
                this.form = $("#" + this.idObject).parent();
            }
            this.refresh = function () {
                $('.CodeMirror').each(function (i, el) {
                    el.CodeMirror.refresh();
                });
            }
        }
        var tmp = new Script(_json);
        tmp.init();
        tmp.create();
        return tmp;
    }

    GUI.tab = function (_json) {
        function Tab(_json) {
            this.idObject = _json.id;
            this.parent = _json.parent;
            this.item = _json.item;
            this.json = _json;
            this.listJqueryObjectElement = [];
            this.id = [];
            this.listTab = [];
            for (var nbItem = 0; nbItem < _json.item.length; nbItem++) {
                this.id[nbItem] = _json.item[nbItem].id;
            }
            var stock = this;
            this.listUnchecked = [];
            this.optionManager = false;

            this.init = function () {
                this.html = '<ul id="' + this.idObject + '_header" ><li><a href="#' + this.item[0].id + '">' + this.item[0].text + '</a></li></ul>';
                this.html += '<div id="' + this.idObject + '_content" class="ui-widget-content ui-layout-content ui-corner-top" >';
                this.html += '<div id="' + this.item[0].id + '" class="content">';
                if (this.item[0].hasOwnProperty('content')) {
                    this.html += this.item[0].content;
                }
                this.html += '</div></div>'
            }

            this.children = function () {
                for (var nbItem = 1; nbItem < _json.item.length; nbItem++) {
                    this.addTab(_json.item[nbItem])
                }
            }

            this.create = function () {
                this.jqueryObjectRoot = this.parent.append(this.html);
                this.jqueryObjectRoot = this.jqueryObjectRoot.tabs({
                    activate: function (event, ui) {
                        $('.CodeMirror').each(function (i, el) {
                            el.CodeMirror.refresh();
                        });
                    }
                });
            }

            this.createJqueryObjects = function () {
                this['header'] = $('#' + this.idObject + '_header');
                this['content'] = $('#' + this.idObject + '_content');
                this[this.id[0]] = $('#' + this.idObject + '_content').find(".content");
                this[this.id[0]]["title"] = $('#' + this.idObject + '_header').find("li:nth-child(1) a");
                this.listJqueryObjectElement[0] = this[this.id[0]];
                for (var nbId = 1; nbId < this.id.length; nbId++) {
                    this[this.id[nbId]] = $("#" + this.id[nbId]);
                    this[this.id[nbId]]["title"] = $('#' + this.idObject + '_header').find("li[aria-controls='"+this.id[nbId]+"'] a");
                    this.listJqueryObjectElement[nbItem] = this[this.id[nbId]];
                }
            }

            this.refresh = function () {
                this.jqueryObjectRoot.tabs("refresh");
                stock = this;
            }

            this.addTab = function (_json) {
                this.html = '';
                this.html += '<li><a href="#' + _json.id + '">' + _json.text + '</a></li>';
                this.header.append(this.html);
                this.html = '';
                this.html += '<div id="' + _json.id + '">';
                if (_json.hasOwnProperty('content')) {
                    this.html += _json.content;
                }
                this.html += '</div>';
                this.content.append(this.html);
                this.id.push(_json.id);
                this.refresh();
                this.createJqueryObjects();
                if (_json.text.trim() != "Material" && this.optionManager) {
                    this.manager();
                }
            }

            $.fn.removeTab = function (_idTabWindow, id) {
                this.removeJqueryObjectTab();
                $('li[aria-controls="' + this.prop('id') + '"]').remove();
                $('#' + this.prop('id')).remove();
                this.remove();
                stock.refresh();
            }

            $.fn.removeJqueryObjectTab = function () {
                try {
                    delete stock[this.prop("id")].title;
                } catch (err) {};
                delete stock[this.prop("id")];
                var result = true;
                while (result) {
                    result = stock.id.lastIndexOf(this.prop("id"));
                    if (result == -1) {
                        result = false;
                        break;
                    }
                    stock.id.splice(result, 1)
                }
                stock.refresh();
            }

            this.sortable = function () {
                this.jqueryObjectRoot.find(".ui-tabs-nav").sortable({
                    axis: "x",
                    stop: function () {
                        stock.refresh();
                    }
                });
            }

            this.refreshTabList = function () {
                this.listTab = [];
                var buffer = this;
                this.jqueryObjectRoot.find("ul>li").each(function (index) {
                    var text = $(this).find('a').text();
                    var json = {};
                    json["index"] = index;
                    json["text"] = text;
                    if (text) {
                        buffer.listTab.push(json)
                    };
                });
            }

            this.manager = function () {
                $('#tabManager').remove();
                var html = '<div id="tabManager"><div>';
                $('body').append(html);
                this.refreshTabList();
                var buffer = this;
                var indexII = -1;
                var check = '';
                for (var i = 0; i < this.listTab.length; i++) {
                    var indexII = this.listTab[i].index;
                    var check = GUI.addCheckBox("tabindex_" + indexII, this.listTab[i].text.trim(), $('#tabManager')).find('input').prop('checked', true);
                    check.on('change', function (e) {
                        var indexI = $(this).parent().prop("id").substr(9);
                        if ($(this).is(":checked")) {
                            buffer.jqueryObjectRoot.tabs('enable', indexI * 1);
                            buffer.jqueryObjectRoot.tabs("option", "active", indexI * 1);
                            var posit = buffer.listUnchecked.indexOf(indexI * 1);
                            while (posit != -1) {
                                posit = buffer.listUnchecked.indexOf(indexI * 1);
                                if (posit != -1) {
                                    buffer.listUnchecked.splice(posit, 1);
                                }
                            }
                        } else {
                            buffer.jqueryObjectRoot.tabs('disable', indexI * 1);
                            buffer.listUnchecked.push(indexI * 1);
                            for (var j = 0; j < 6; j++) {
                                buffer.jqueryObjectRoot.tabs("option", "active", j);
                            }
                        }
                        buffer.hidePanel();

                    });
                    for (var z = 0; z < buffer.listUnchecked.length; z++) {
                        $('#' + "tabindex_" + buffer.listUnchecked[z]).find("input").prop("checked", false);
                    }
                }
                $('#tabManager').addClass('ui-widget-header');
                $('#tabManager').hide();
            }

            this.hidePanel = function () {
                var disabled = this.jqueryObjectRoot.tabs("option", "disabled");
                var buffer = this;
                if (disabled.toString() == "true") {
                    $("#tab").remove();
                    $('#mainLayout-center').hide();
                    $('.ui-layout-resizer-west').hide();
                    GUI.flagResize = false;
                    $('#tabManager').hide();
                    GUI.mainMenu.addElement({
                        id: 'tab',
                        text: 'Tabs',
                        position: 'settings'
                    });
                    var array = [];
                    var json = {};
                    for (var i = 0; i < this.listTab.length; i++) {
                        var json = {};
                        json['id'] = this.listTab[i].text.trim() + "_check";
                        json['text'] = this.listTab[i].text.trim();
                        json['type'] = "checkbox";
                        array.push(json);
                    }
                    var menu = GUI.menu({
                        id: 'tabs-menu',
                        parent: GUI.mainMenu.tab,
                        item: array
                    });
                    GUI.image(GUI.mainMenu.tab.text, "img-tab", "../gui/images/icon-cog.png", 15, 15, "before");
                    menu.jqueryObjectRoot.find("li").each(function (index) {
                        $(this).on('change', 'input[type=checkbox]', function (e) {
                            var position = $(this).parent().prop("id").replace('_check', '');
                            $('#tabManager').find("li").each(function (index) {
                                if ($(this).text() == position) {
                                    $(this).find('input').click();
                                    buffer.showPanel();
                                    GUI.container.resizeAll();
                                    GUI.container.initContent("center");
                                    GUI.container.initContent("west");
                                }
                            })
                        });
                    });
                }
                GUI.flagResize = false;
            }

            this.showPanel = function () {
                var disabled = this.jqueryObjectRoot.tabs("option", "disabled");
                if (disabled.toString() != "true") {
                    $('#tab').remove();
                    $('#mainLayout-center').show();
                    $('.ui-layout-resizer-west').show();
                    for (var j = 0; j < 6; j++) {
                        this.jqueryObjectRoot.tabs("option", "active", j);
                    }
                    GUI.resize();
                    GUI.flagResize = true;
                }
            }

            this.tabManager = function () {
                this.optionManager = true;
                var buffer = this;
                this.closeButton = GUI.button("closeTab", this.header, function () {
                    var activeTab = buffer.jqueryObjectRoot.tabs('option', 'active');
                    var condition = buffer.jqueryObjectRoot.find("ul>li").eq(activeTab).text().trim();
                    if (condition != "Material") {
                        buffer.jqueryObjectRoot.tabs('disable', activeTab);
                        $("#tabindex_" + activeTab).find('input').prop('checked', false)
                        for (var j = 0; j < 6; j++) {
                            buffer.jqueryObjectRoot.tabs("option", "active", j);
                        }
                        buffer.hidePanel();
                    }
                });
                this.closeButton.prop("id", "closeTab");
                this.closeButton.html('');
                GUI.addIcon(this.closeButton, "ui-icon-squaresmall-close", "", "before");
                var flagPanel = false;
                this.menuButton = GUI.button("menuTab", this.header, function () {
                    if (!flagPanel) {
                        $('#tabManager').show();
                        flagPanel = true;
                    } else if (flagPanel) {
                        $('#tabManager').hide();
                        flagPanel = false;
                    }

                });
                this.menuButton.prop("id", "menuTab");
                this.menuButton.html('');
                GUI.addIcon(this.menuButton, "ui-icon-squaresmall-plus", "", "before");

                this.refresh();

            }
        }


        var tmp = new Tab(_json);
        tmp.init();
        tmp.create();
        tmp.createJqueryObjects();
        tmp.children();
        return tmp;
    }

    //checked        
    GUI.addSlider = function (_id, _parent, _min, _max, _step, _defaultValue, _style) {
        var slider = '<div id="' + _id + '"'
        if (_style) {
            slider += 'style="' + _style + '" ';
        }
        slider += '></div>';
        if (_parent == "code") {
            return slider;
        }
        var $slider = $(slider);
        _parent.append($slider);
        $("#" + _id, _parent).slider({
            animate: true,
            min: _min,
            max: _max,
            step: _step,
            value: _defaultValue
        });
        return $slider;
    };

    //checked
    GUI.addIcon = function (_parent, _cssClass, _style, _position, _isolate) {
        var icon = '';
        if (_isolate) {
            icon += "<p>"
        }
        if (_style) {
            icon += '<span id="' + _cssClass + '" class="ui-icon ' + _cssClass + '" style="' + _style + '"';
        } else {
            icon += '<span class="ui-icon ' + _cssClass + '"';
        }
        icon += '></span>';
        if (_isolate) {
            icon += "</p>";
        }
        if (_parent == "0") {
            return icon;
        } else {
            var $icon = $(icon);
            if (_position == "before") {
                _parent.prepend($icon);
            } else {
                _parent.append($icon);
            }
            return $icon
        }
    };

    GUI.image = function (_parent, _id, _url, _width, _height, _position) {
        var image = '<img id=' + _id + ' src="' + _url + '" />';
        var $image = $(image);
        if (_position == "before") {
            _parent.prepend($image);
        } else {
            _parent.append($image);
        }
        if (_width) {
            $image.width(_width);
        }
        if (_height) {
            $image.width(_height);
        }
        return $image;
    }


    GUI.mask = function (_id, _HTMLtext, _parent) {
        var dialog = '<div id=' + _id + ' ><span id="text-mask" style="position:relative;left:15px;bottom:10px;">' + _HTMLtext + '</span></div>';
        var $dialog = $(dialog);
        if (_parent.find('#' + _id).length) {
            _parent.appendTo($dialog);
        } else {
            _parent.append($dialog);
        }
        $("#" + _id, _parent).dialog({
            dialogClass: 'alert',
            resizable: true,
            height: '105',
            width: '250',
            modal: true
        });
        $(".ui-dialog-titlebar").hide();
        $("#" + _id).parent().css("top", "40%");
        $("#" + _id).parent().width("150px");
        return $("#" + _id, _parent);
    };


    //checked
    GUI.messageDialog = function (_id, _title, _HTMLtext) {
        var dialog = '<div id=' + _id + ' title=' + _title + '>' + _HTMLtext + '</div>';

        var $dialog = $(dialog);
        if ($('.ui-layout-west').find('#' + _id).length) {
            $('.ui-layout-west').appendTo($dialog);
        } else {
            $('.ui-layout-west').append($dialog);
        }
        $("#" + _id).dialog({
            resizable: true,
            height: '500',
            width: '900',
            modalType: Boolean,
            Default: false
        });
        return $("#" + _id);
    };

    //checked
    GUI.confirmDialog = function (_id, _title, _text, _titleConfirmButton, _callback) {
        var dialog = '<div id=' + _id + ' title=' + _title + '><span style= "margin: 0 7px 20px 35px;" >' + _text + '</span></div>';
        var $dialog = $(dialog);
        $('.ui-layout-west').append($dialog);
        $("#" + _id).dialog({
            resizable: false,
            height: '150',
            width: '300',
            modal: true,
            buttons: {
                Yes: function () {
                    _callback();
                    $(this).dialog("close");
                },
                No: function () {
                    $(this).dialog("close");
                    $dialog.remove();
                }
            }
        })
        //GUI.addIcon($("#"+_id),"ui-icon-alert","margin: 0 7px 0 100px;","before");
        $('.ui-dialog :button').blur();
        return $("#" + _id);
    };

    // checked except mod vertical
    GUI.addStickyButton = function (_id, _items, _parent, _mode) {
        var size_list = _items.length;
        var stickyButton = '';
        if (size_list != 1) {
            stickyButton += '<div id="' + _id + '">';
        }
        for (var i = 0; i < size_list; i++) {
            stickyButton += '<input type="checkbox" id="' + _id + '-' + _items[i] + '"';
            stickyButton += '/><label for="' + _id + '-' + _items[i] + '">' + _items[i] + '</label>';
        }
        if (size_list != 1) {
            stickyButton += '</div>';
        }
        if (_mode == "code") {
            return stickyButton;
        } else {
            var $stickyButton = $(stickyButton);
            _parent.append($stickyButton);
            if (size_list == 1) {
                $("#" + _id + '-' + _items[0], _parent).button();
            } else if (_mode == "vertical") {
                $("#" + _id, _parent).buttonsetvertical();
            } else {
                $("#" + _id, _parent).buttonset();
            }
            return $stickyButton;
        }
    };

    GUI.addCheckBox = function (_id, _text, _parent, checked) {
        // /var debugShowSoundOverlay = GUI.addCheckBox("debugShowSoundOverlay", "Show sound overlay", soundTab);
        if (!_text && !_parent) {
            var Checkbox = function (_id) {
                this.json = _id;
                this.idObject = this.json.id;
                this.html = '';
                this.text = this.json.text;
                if (this.json.hasOwnProperty('parent')) {
                    this.parent = this.json.parent;
                }
                if (this.json.hasOwnProperty('tooltip')) {
                    this.tooltip = this.json.tooltip;
                }
                if (this.json.hasOwnProperty('change')) {
                    this.change = this.json.change;
                }
                if (this.json.hasOwnProperty('isChecked')) {
                    this.isChecked = this.json.isChecked;
                }
                if (this.json.hasOwnProperty('noChecked')) {
                    this.noChecked = this.json.noChecked;
                }
                if (this.json.hasOwnProperty('state')) {
                    this.state = this.json.state;
                }
                this.generateHTML = function () {
                    this.html = '<li id="' + this.idObject + '" style="list-style:none;" class="checkbox" ><input type="checkbox"';
                    if (this.state)
                        this.html += ' checked="true"';
                    this.html += '><span>' + this.text + '</span></li>';
                }
                this.create = function () {
                    if (this.parent) {
                        this.parent.append(this.html);
                        this.link();
                    }
                }
                this.link = function () {
                    this.selector = $('#' + this.idObject);
                    this.input = $('#' + this.idObject).find('input');
                    this.title = $('#' + this.idObject).find('span');
                    var stock = this;
                    this.selector.on('change', function () {
                        if (stock.change) {
                            stock.change.call();
                        }
                        if (stock.isChecked) {
                            if ($(this).find('input').prop("checked") == true) {
                                stock.isChecked.call();
                            }
                        }
                        if (stock.noChecked) {
                            if ($(this).find('input').prop("checked") == false) {
                                stock.noChecked.call();
                            }
                        }
                    });
                    if (this.tooltip) {
                        this.selector.addTooltip(this.tooltip);
                    }
                }
                this.queryState = function () {
                    return this.input.is(':checked');
                }

            }
            var tmp = new Checkbox(_id);
            tmp.generateHTML();
            tmp.create();
            return tmp;

        } else {
            var checkBox = '<li id="' + _id + '" style="list-style:none;" class="checkbox" ><input type="checkbox"';
            if (checked)
                checkBox += ' checked="true"';
            checkBox += '><span>' + _text + '</span></li>';
            if (_parent) {
                var $checkBox = $(checkBox);
                _parent.append($checkBox);
                return $checkBox;
            } else {
                return checkBox;
            }
        }
    };

    // checked except mod vertical  
    GUI.addStickyList = function (_id, _items, _parent, _mode, _selectedIndex, _callback) {
        var size_list = _items.length;
        var stickyList = '<form><div id="' + _id + '" >';
        // if(_id.length==0)
        for (var i = 0; i < size_list; i++) {
            var tmp = '';
            if (i == _selectedIndex) {
                tmp = 'checked="checked"';
            }
            stickyList += '<input type="radio" id="' + _id + '-' + i + '" name="radio" ' + tmp + ' /><label for="' + _id + '-' + i + '">' + _items[i] + '</label>';
        }
        stickyList += '</div></form>';
        if (_mode == "code") {
            return stickyList;
        } else {
            var $stickyList = $(stickyList);
            _parent.append($stickyList);
            if (_mode == "vertical") {
                $("#" + _id, _parent).buttonsetv();
            } else {
                $("#" + _id, _parent).buttonset();
            }
            if (_callback != undefined) {
                $stickyList.on('change', 'input[type=radio]', function (e) {
                    if ($(e.target).is(":checked")) {
                        var splitArray = $(e.target).attr('id').split('-');
                        _callback(parseInt(splitArray[splitArray.length - 1]));
                    }
                });
            }
            return $stickyList;
        }
    };

    GUI.addSelect = function (_id, _items, _parent, _selectedIndex, _callback) {
        var html = "";
        html += "<div>";
        html += "<select";
        html += " id='" + _id + "' ";
        html += ">";
        for (var i = 0; i < _items.length; i++) {
            html += "<option"
            html += " value='" + _items[i] + "' ";
            if (i == _selectedIndex)
                html += " selected='selected' ";
            html += ">";
            html += _items[i];
            html += "</option>";
        }
        html += "</select>";
        html += "</div>";
        $(_parent).append(html);
        var jquerySelect = $('#' + _id);

        jquerySelect.skinner();
        if (_callback != undefined) {
            jquerySelect.change(_callback);
        }
        $('.select-skinned-cont').addClass('ui-widget-header');
        jquerySelect.change(function () {
            $('.select-skinned-cont').addClass('ui-widget-header');
        });
        jquerySelect.parent().click(function () {
            //console.debug($(this).parent().html())
            // var heightArea = $(this).parent().position().top;
            var childPos = $(this).parent().offset();
            var parentPos = $(this).parent().parent().offset();
            var heightArea = childPos.top - parentPos.top;
            var height = $(this).parent().parent().height();
            $(".select-skinned ul").css("max-height", height - heightArea - 10);
        })
        return jquerySelect;
    }

    GUI.addRadioList = function (_position, _id, _value, _text, _parent) {
        if (!_id && !_value && !_text && !_parent) {
            var Radio = function (_json) {
                this.html = "";
                this.items = [];
                this.links = [];
                this.tooltips = [];
                this.onchange = [];
                this.id = [];
                this.state = [];
                this.json = _json;
                this.idObject = _json.id;
                this.header = '';
                if (_json.hasOwnProperty("parent")) {
                    this.parent = _json.parent;
                }
                if (_json.hasOwnProperty("change")) {
                    this.change = _json.change;
                }
                for (var nbItem = 0; nbItem < _json.item.length; nbItem++) {
                    this.items[nbItem] = _json.item[nbItem].text;
                    this.id[nbItem] = _json.item[nbItem].value;
                    if (_json.item[nbItem].hasOwnProperty("tooltip")) {
                        this.tooltips[nbItem] = _json.item[nbItem].tooltip;
                    }
                    if (_json.item[nbItem].hasOwnProperty("callback")) {
                        this.links[nbItem] = _json.item[nbItem].callback;
                    }
                    if (_json.item[nbItem].hasOwnProperty("state")) {
                        this.state[nbItem] = _json.item[nbItem].state;
                    }
                }
                this.generateHTML = function () {
                    this.html = '<li id=' + this.idObject + ' style="list-style:none;display: block;float: left;white-space: nowrap;">';
                    var tefa = "Z" + Math.floor((Math.random() * 100000) + 1);
                    for (var i = 0; i < this.id.length; i++) {
                        var tmp = "";
                        if (true == this.state[i]) {
                            tmp = "checked";
                        }
                        this.html += '<div class="radio_contain"><input type="radio" name="' + tefa + '" value="' + this.id[i] + '" ' + tmp + ' ></div><span style="bottom: 2px;">' + this.items[i] + '</span><br>';
                    }
                    this.html += '</li>';
                }

                this.create = function () {
                    if (this.parent) {
                        this.parent.append(this.html);
                        this.link();
                    };
                }
                this.link = function () {
                    this.header = $("#" + this.idObject);
                    if (this.change) {
                        var call = this.change;

                        this.header.on('change', function (e) {
                            call.call();
                        });
                    }
                    var stock = this;
                    this.header.find('input').each(function (index) {
                        stock[stock.id[index]] = $(this);
                        stock[stock.id[index]]["text"] = $(this).parent().next();
                        if (stock.tooltips[index]) {
                            $(this).parent().next().addTooltip(stock.tooltips[index]);
                        }
                        if (stock.links[index]) {
                            var call = stock.links[index];
                            $(this).on('change', function (e) {
                                call.call();
                            });
                        }
                    })
                }
            }

            var tmp = new Radio(_position);
            tmp.generateHTML();
            tmp.create();
            return tmp;
        } else {
            var radioList = '<li id=' + _id + ' style="list-style:none;display: block;float: left;white-space: nowrap;">';
            for (var i = 0; i < _text.length; i++) {
                var tmp = "";
                if (i == _position - 1) {
                    tmp = "checked";
                }
                if (!(_id instanceof Array)) {
                    radioList += '<div class="radio_contain"><input type="radio" name="' + _id + '" value="' + _value[i] + '" ' + tmp + ' ></div><span style="bottom: 2px;">' + _text[i] + '</span><br>';
                } else {
                    radioList += '<div class="radio_contain"><input type="radio" name="' + _id[0] + '" value="' + _value[i] + '"' + tmp + '></div><span style="bottom: 2px;">' + _text[i] + '</span><br>';
                }
            }
            radioList += '</li>';
            if (_parent) {
                var $radioList = $(radioList);
                _parent.append($radioList);
                return $radioList;
            } else {
                return radioList;

            }
        }
    };

    GUI.listMenu = [];

    GUI.menu = function (_json) {
        if (_json.hasOwnProperty('replace')) {
            var soundMenu = _json.replace;
            if (soundMenu) {
                soundMenu.removeAllMenu();
                soundMenu = GUI.appendMenu(_json);
                return soundMenu;
            } else {
                console.error("'replace' property is wrong");
            }
        } else {
            var tmp = GUI.appendMenu(_json);
            return tmp;
        }

    }

    GUI.appendMenu = function (_json) {
        function Menu(_json) {
            this.items = [];
            this.links = [];
            this.tooltips = [];
            this.onchange = [];
            this.rightItems = [];
            this.id = [];
            this.idObject = _json.id;
            for (var nbItem = 0; nbItem < _json.item.length; nbItem++) {
                if (_json.item[nbItem].hasOwnProperty("text")) {
                    this.items[nbItem] = _json.item[nbItem].text;
                }
                if (_json.item[nbItem].hasOwnProperty("id")) {
                    this.id[nbItem] = _json.item[nbItem].id;
                }
                if (_json.item[nbItem].hasOwnProperty("tooltip")) {
                    if (_json.item[nbItem].type != "checkbox") {
                        this.tooltips[nbItem] = {
                            content: _json.item[nbItem].tooltip,
                            id: _json.item[nbItem].id
                        };
                    }
                }
                if (_json.item[nbItem].hasOwnProperty("callback")) {
                    this.links[nbItem] = _json.item[nbItem].callback;
                } else {
                    this.links[nbItem] = "#";
                }
            }
            this.json = _json;

            this.parent = _json.parent;
            this.html = '';
            this.listJqueryObjectElement = [];
            this.jqueryObjectHead = $(".head-menu");
            this.tmp = [];
            this.checkRadio = [];
            this.checkBox = [];
            var stock = this;
            this.init = function () {
                this.html = '<ul id=' + this.idObject;
                if (GUI.listMenu.length == 0) {
                    this.html += ' class="head-menu"';
                }
                this.html += '>';
                var buffer1 = function () {};
                for (var i = 0; i < this.json.item.length; i++) {
                    if (((typeof this.json.item[i]) == "string") || (typeof this.json.item[i] instanceof String)) {
                        this.html += this.json.item[i];
                    } else if (this.json.item[i].type == "checkbox") {
                        delete this.json.item[i].parent;
                        var checked = null;
                        if (this.json.item[i].hasOwnProperty('checked'))
                            this.json.item[i]['state'] = true;
                        var object = GUI.addCheckBox(this.json.item[i]);
                        this.checkBox.push(object);
                        this.html += object.html;
                    } else if (this.json.item[i].type == "radioList") {
                        if (!this.json.item[i].hasOwnProperty("text")) {
                            delete this.json.item[i].type;
                            delete this.json.item[i].parent;
                            var tmp = GUI.addRadioList(this.json.item[i]);
                            this.checkRadio.push(tmp);
                            this.html += tmp.html;
                        } else {
                            this.html += GUI.addRadioList(1, this.id[i], this.items[i], this.items[i]);
                        }
                    } else if (this.json.item[i].type == "menu") {
                        this.html += '<li id="' + this.id[i] + '">';
                        this.html += '<a href="';
                        if (this.links[i] != "#") {
                            buffer1 = this.links[i];
                            if (typeof buffer1 != "string") {
                                var num = Math.floor((Math.random() * 100000) + 1);
                                window["x" + num] = buffer1;
                                window["z" + num] = function (item) {
                                    window["x" + item].call();
                                }
                                this.html += "javascript:window.z" + num + "(" + num + ");";
                            } else {
                                this.html += "javascript:" + this.links[i] + ";";
                            }
                        } else {
                            this.html += '#"';
                        }
                        this.html += '">' + this.items[i] + '</a>';
                        this.html += '</li>';
                        this.json.item[i].json["parent"] = $("#" + this.id[i]);
                        this.tmp.push(this.json.item[i].json);
                    } else if (this.json.item[i].type == "separator") {
                        this.html += "<span class='separator' ><hr></hr></span>";
                    } else {
                        this.html += '<li id="' + this.id[i] + '">';
                        this.html += '<a href="';
                        if (this.links[i] != "#") {
                            buffer1 = this.links[i];
                            if (typeof buffer1 != "string") {
                                var num = Math.floor((Math.random() * 100000) + 1);
                                window["x" + num] = buffer1;
                                window["z" + num] = function (item) {
                                    window["x" + item].call();
                                }
                                this.html += "javascript:window.z" + num + "(" + num + ");";
                            } else {
                                this.html += "javascript:" + this.links[i] + ";";
                            }
                        } else {
                            this.html += '#"';
                        }
                        this.html += '">' + this.items[i] + '</a>';
                        this.html += '</li>';
                    }

                }
                this.html += '</ul>';
            }

            this.create = function () {
                this.jqueryObjectRoot = this.parent.append(this.html);
                if (GUI.listMenu.length == 0) {
                    this.jqueryObjectRoot = $(".head-menu").menu({
                        position: {
                            at: "left bottom"
                        },
                        icons: {
                            submenu: "ui-icon-carat-1-e"
                        },
                    });
                } else {
                    this.refresh();
                }
                GUI.listMenu.push(this.jqueryObjectRoot);
                this.jqueryObjectRoot.area = this.jqueryObjectRoot.find('ul');
                var buffer1 = this.parent;
                $('#menu').find('> li').each(function (index) {
                    $(this).find('> a > span').removeClass();
                    $(this).find('> a > span').addClass('ui-menu-icon ui-icon ui-icon-carat-1-s');
                })
                this.parent.beforeShow(function () {
                    var tmp = buffer1.parent();
                    if (tmp.prop("tagName") == "UL") {
                        tmp = tmp.parent();
                        if (tmp.prop("tagName") == "LI") {
                            tmp = tmp.parent();
                            if (tmp.prop("id") == "menu") {
                                var left = buffer1.parent().width() + 2;
                                var top = buffer1.position().top;
                                buffer1.find('ul').attr('style', "position: absolute !important; left: " + left + "px !important; top: " + top + "!important;");
                                buffer1.find('ul').hide(); //buffer1
                            }
                        }
                    }
                });
                if (this.parent.parent().hasClass("head-menu")) {
                    var width = this.parent.find('ul').width() + 40;
                    this.parent.find('ul li a').css("width", width);
                }
                for (var f = 0; f < this.checkRadio.length; f++) {
                    this.checkRadio[f].link();
                }
                for (var c = 0; c < this.checkBox.length; c++) {
                    this.checkBox[c].link();
                }
            }

            this.applyTooltip = function () {
                for (var z = 0; z < this.tooltips.length; z++) {
                    this[this.tooltips[z].id].addTooltip(this.tooltips[z].content);
                }
            }

            this.callSubmenu = function () {
                var example = '';
                for (var leng = 0; leng < this.tmp.length; leng++) {
                    example = this.tmp[leng]
                    GUI.menu(example);
                }
            }

            this.refresh = function () {
                this.jqueryObjectHead.menu("refresh");
                stock = this;
            }
            this.createJqueryObjects = function () {
                for (var nbId = 0; nbId < this.id.length; nbId++) {
                    this[this.id[nbId]] = $("#" + this.id[nbId]);
                    this[this.id[nbId]]["text"] = $("#" + this.id[nbId]).find('>a');
                    this[this.id[nbId]]["icon"] = $("#" + this.id[nbId]).find('>span');
                    this["listJqueryObjectElement"][nbItem] = this[this.id[nbId]];
                }
                for (var t = 0; t < this.checkRadio.length; t++) {
                    this[this.checkRadio[t].idObject] = this.checkRadio[t];
                }
                for (var x = 0; x < this.checkBox.length; x++) {
                    this[this.checkBox[x].idObject] = this.checkBox[x];
                }
            }
            $.fn.removeJqueryObject = function () {
                delete stock[this.prop("id")];
            }

            $.fn.recall = function (id) {
                this.removeJqueryObject();
                this.removeAttr('id');
                this.prop("id", id);
                stock[id] = this;
                this.text.removeJqueryObject();
                stock[id]['text'] = this.find('>a');
                this.icon.removeJqueryObject();
                stock[id]['icon'] = this.find('>span');
            }
            $.fn.removeElement = function () {
                this.removeJqueryObject();
                this.remove();
                stock.refresh();
            }

            this.removeAllMenu = function () {
                this.parent.find("ul").remove();
                this.parent.find("span").remove();
                this.refresh();
                for (var key in this) {
                    delete this[key];
                }
                delete this;
            }

            this.removeAllChildren = function () {
                this.parent.find("ul").remove();
                this.parent.find("span").remove();
                this.refresh();
                for (var key in this) {
                    delete this[key];
                }

            }

            this.addElement = function (_json) {
                var element = '';
                var radioList = '';
                var checkbox = '';
                if (_json.type == "checkbox") {
                    delete _json.type;
                    delete _json.parent;
                    checkbox = GUI.addCheckBox(_json);
                    element += checkbox.html;
                } else if (_json.type == "radioList") {
                    if (!_json.hasOwnProperty("text")) {
                        delete _json.type;
                        delete _json.parent;
                        var tmp = GUI.addRadioList(_json);
                        radioList = tmp;
                        element += tmp.html;
                    } else {
                        element += GUI.addRadioList(1, _json.id, _json.text, _json.text);
                    }
                } else {
                    element += '<li id="' + _json.id + '" class="ui-menu-item" role="presentation">';
                    element += '<a href="';
                    if (_json.hasOwnProperty("callback")) {
                        element += "javascript:" + _json.callback + ";";
                    } else {
                        element += '#"';
                    }
                    element += '" class="ui-corner-all" role="menuitem">' + _json.text + '</a>';
                    element += '</li>';
                }

                if (_json.hasOwnProperty("before") && _json.before) {
                    if (_json.hasOwnProperty("position")) {
                        this[_json.position].before(element);
                    } else {
                        this.jqueryObjectRoot.before(element);
                    }
                } else {
                    if (_json.hasOwnProperty("position")) {
                        this[_json.position].after(element);
                    } else {
                        this.jqueryObjectRoot.after(element);
                    }
                }

                radioList.link();
                checkbox.link();

                this.refresh();
                this[_json.id] = $('#' + _json.id);
                this[_json.id]["text"] = $("#" + _json.id).find('>a');
                this[_json.id]["icon"] = $("#" + _json.id).find('>span');

                this[radioList.idObject] = radioList;
                this[checkbox.idObject] = checkbox;

                this["listJqueryObjectElement"].push(stock[_json.id]);
            }
            $.fn.disableElement = function () {
                //console.debug($(this).prop("id"))
                this.addClass("disable");
            }
            $.fn.enableElement = function () {
                this.removeClass("disable");
            }
            $.fn.checkDisable = function () {
                return this.hasClass("disable");
            }
            $.fn.beforeShow = function (_callback) {
                this.on("mouseenter", function (event) {
                    _callback.call();
                });
            }
            $.fn.attachCallback = function (_callback) {
                this.text.attr("href", "javascript:" + _callback + ";");
            }
            $.fn.detachCallback = function (_callback) {
                this.text.attr("href", '#');
            }

            $.fn.moveToRightFromLeft = function (pixels) {
                var width = 0;
                if (!pixels) {
                    if (stock.rightItems.length != 0) {
                        width = stock.rightItems.slice(-1)[0] + 90;
                    }
                } else if (pixels) {
                    width = pixels;
                }
                this.attr("style", "position: absolute !important; right: " + width + "px !important;");
                stock.rightItems.push(width);
            }

            this.setAutoHeight = function () {
                var elem = this.jqueryObjectRoot.area;
                var height = "innerHeight" in window ? window.innerHeight : document.documentElement.offsetHeight;
                var elemHeight = '';
                elem.children().wrapAll('<div id="scrollPanel-' + GUI.listMenu.length + '"></div>');
                var wrap = $('#scrollPanel-' + GUI.listMenu.length);
                var tmp = this.parent;
                this.jqueryObjectHead.on("menufocus", function (event, ui) {
                    var heightArea = tmp.position().top;
                    elemHeight = elem.height();
                    if (elemHeight > height - 90) {
                        elem.css("max-height", height - heightArea - 65);
                        wrap.css("height", height - heightArea - 65);
                        $(window).on('resize orientationChanged', function () {
                            var heightBis = "innerHeight" in window ? window.innerHeight : document.documentElement.offsetHeight;
                            elem.css("max-height", heightBis - heightArea - 65);
                            wrap.css("height", heightBis - heightArea - 65); //88
                        });
                        wrap.scroll(function () {
                            var value = wrap.scrollTop();
                            var maxScrollTop = wrap[0].scrollHeight - elem.outerHeight();
                            if (!value) {}
                            if (value == maxScrollTop) {}
                        })
                    }
                    else{
                        //elem.css("max-height", height);
                        // wrap.css("height", height - heightArea);
                    }
                });
            }
            this.closeAll = function () {
                $(".head-menu").menu("collapseAll", null, true);
            }
            this.setSentivityFocus = function (_time_ms) {
                var blurTimer;
                var blurTimeAbandoned = _time_ms; // time in ms for when menu is consider no longer in focus
                $(".head-menu").on('menufocus', function () {
                    clearTimeout(blurTimer);
                });
                $(".head-menu").on('menublur', function (event) {
                    blurTimer = setTimeout(function () {
                        $(".head-menu").menu("collapseAll", null, true);
                    }, blurTimeAbandoned);
                });

                // this.parent.find('>a').on("mouseleave",function(){
                //     // console.debug("helloWorld");
                //     var titi = $(this);
                //     var tefa = setInterval(function(){titi.trigger("mouseover");$(this).trigger("focus");},100);
                //     setTimeout(function(){clearTimeout(tefa)},500);
                // })
            }
        }

        var tmp = new Menu(_json);
        tmp.init();
        tmp.create();
        tmp.createJqueryObjects();
        if (tmp.tmp != 0) {
            tmp.callSubmenu();
        }
        tmp.applyTooltip();
        tmp.setSentivityFocus(1000);
        return tmp;

    }



    GUI.toolBar = function (_id, _parent, _icones, _links, _position) {
        var tomp = '<div id="icon-' + _id + '" class="settings-button" style="width:20px;height:20px;border-radius: 1px;">' + GUI.addIcon("0", "ui-icon-gear") + '</div>';
        var $tomp = $(tomp);
        _parent.append($tomp);
        var size_toolbar = _icones.length;
        var toolbar = '<div id="' + _id + '" class="toolbar-icons" style="display:none;">';
        for (var i = 0; i < size_toolbar; i++) {
            toolbar += '<a onclick="' + _links[i] + '"><i class="' + _icones[i] + '"></i></a>';
        }
        toolbar += '</div>';
        var $toolbar = $(toolbar);
        _parent.append($toolbar);
        var result = $tomp.toolbar({
            content: '#' + _id,
            position: _position,
            hideOnClick: true
        });
        $tomp.onmouseover = "this.style.cursor='pointer'";
        //$("div.tool-items a:first-child").remove();
        return result;
    };
    //---------------------------------------------------------------------------------------------------------------------------------------
    GUI.getCSSRule = function (className) {
        for (var i = 0; i < document.styleSheets.length; i++) {
            var classes = document.styleSheets[i].rules || document.styleSheets[i].cssRules
            for (var x = 0; x < classes.length; x++) {
                if (classes[x].selectorText.search(className)) {
                    (classes[x].cssText) ? console.debug(classes[x].cssText) : console.debug(classes[x].style.cssText);
                }
            }
        }
    }


    GUI.killCssRule = function (ruleName) {
        function getCSSRule(ruleName, deleteFlag) {
            if (document.styleSheets) {
                var i = document.styleSheets.length - 1;
                var styleSheet = document.styleSheets[i];
                var ii = 0;
                var cssRule = false;
                do {
                    try {
                        if (styleSheet.cssRules) {
                            cssRule = styleSheet.cssRules[ii];
                        } else {
                            cssRule = styleSheet.rules[ii];
                        }
                    } catch (err) {}
                    if (cssRule) {
                        if (cssRule.selectorText == ruleName) {
                            if (deleteFlag == 'delete') {
                                if (styleSheet.cssRules) {
                                    styleSheet.deleteRule(ii);
                                } else {
                                    styleSheet.removeRule(ii);
                                }
                                return true;
                            } else {
                                return cssRule;
                            }
                        }
                    }
                    ii++;
                } while (cssRule)

            }
            return false;
        }
        return getCSSRule(ruleName, 'delete');
    }


    GUI.addCssRule = function (selector, rule) {
        if (document.styleSheets) {
            if (!document.styleSheets.length) {
                var head = document.getElementsByTagName('head')[0];
                head.appendChild(bc.createEl('style'));
            }

            var i = document.styleSheets.length - 1;
            var ss = document.styleSheets[i];

            var l = 0;
            try {
                if (ss.cssRules) {
                    l = ss.cssRules.length;
                } else if (ss.rules) {
                    // IE
                    l = ss.rules.length;
                }
                if (ss.insertRule) {
                    ss.insertRule(selector + ' {' + rule + '}', l);
                } else if (ss.addRule) {
                    // IE
                    ss.addRule(selector, rule, l);
                }
            } catch (ERR) {};
        }
    };

    GUI.borderTheme = '';
    GUI.colorTheme = '';
    GUI.fontTheme = '';
    GUI.setColorJqueryTheme = function () {
        GUI.colorTheme = $("#header-renderMenus").parent().css("background-color");
        GUI.borderTheme = $("#auteur").css("color");
        GUI.fontTheme = $('#content-renderMenus').css("background-color");
    }

    GUI.refreshJqueryTheme = function () {
        var colorvalue = GUI.colorTheme;
        $('#mainLayout-south').addClass('ui-widget-content');
        $("#console").addClass('ui-widget-header');
        $(".ui-layout-resizer-west").addClass('ui-widget-header');
        $('.ui-slider').addClass('ui-widget-header');
        $('.select-skinned-cont').addClass('ui-widget-header');
        GUI.killCssRule('#menu');
        GUI.addCssRule('#menu', 'border-bottom-color: ' + GUI.borderTheme + ' !important;');
        GUI.killCssRule('#mainLayout-south');
        GUI.addCssRule('#mainLayout-south', 'border-top-color: ' + GUI.borderTheme + ' !important;');
        GUI.killCssRule('#icon-toolConsole');
        GUI.addCssRule('#icon-toolConsole', 'border-right-color: ' + GUI.borderTheme + ' !important;');
        GUI.killCssRule('#content-console');
        GUI.addCssRule('#content-console', 'border-top-color: ' + GUI.borderTheme + ' !important;');
        GUI.killCssRule('#console');
        GUI.addCssRule('#console', 'border-right-color: ' + GUI.borderTheme + ' !important; border-top-color: ' + GUI.borderTheme + ' !important;');
        GUI.killCssRule('#auteur');
        GUI.addCssRule('#auteur', 'border-left-color: ' + GUI.borderTheme + ' !important;');
        GUI.killCssRule('.ui-dialog');
        GUI.addCssRule('.ui-dialog', 'border-color: ' + GUI.borderTheme + ' !important;');
        GUI.killCssRule('.ui-menu ul');
        GUI.addCssRule('.ui-menu ul', 'border-color: ' + GUI.borderTheme + ' !important;');
        GUI.killCssRule('.ui-menu ul li ul');
        GUI.addCssRule('.ui-menu ul li ul', 'border-left-color: ' + GUI.borderTheme + ' !important; border-bottom-color: ' + GUI.borderTheme + ' !important; border-right-color: ' + GUI.borderTheme + ' !important;');
        GUI.killCssRule('body *::-webkit-scrollbar-track');
        GUI.addCssRule('body *::-webkit-scrollbar-track', '-webkit-box-shadow: inset 0 0 6px rgba(0,0,0,0.3) !important; border-radius: 10px; background-color: ' + GUI.colorTheme + ' !important;');
        GUI.killCssRule("body *::-webkit-scrollbar");
        GUI.addCssRule("body *::-webkit-scrollbar", "width: 10px; height: 10px; background-color:" + GUI.colorTheme + "!important;");
        GUI.killCssRule("body *::-webkit-scrollbar-thumb");
        GUI.addCssRule("body *::-webkit-scrollbar-thumb", "border-radius: 10px;-webkit-box-shadow: inset 0 0 6px rgba(0,0,0,.3);background-color:" + GUI.borderTheme + "!important;");
        GUI.killCssRule(".ui-accordion-content");
        GUI.addCssRule(".ui-accordion-content", "border-bottom-color: " + GUI.borderTheme + " !important;border-left-color: " + GUI.borderTheme + " !important;border-right-color: " + GUI.borderTheme + " !important;");
        GUI.killCssRule(".ui-layout-resizer-west");
        GUI.addCssRule(".ui-layout-resizer-west", "border-right: 1px solid " + GUI.borderTheme + "!important; border-left: 1px solid " + GUI.borderTheme + "!important;");
    }
    GUI.currentCssTheme = '';
    GUI.loadCssFile = function (filename) {
        var cssLink = $("<link>");
        $("head").append(cssLink);
        cssLink.attr({
            rel: "stylesheet",
            type: "text/css",
            href: filename
        });
    }
    GUI.destroyCurrentCssTheme = function () {
        $("link[href='" + GUI.currentCssTheme + "']").remove();
    }

    GUI.addTooltip = function (_json) {
        var content = _json.content;
        var parent = _json.parent;
        parent.prop('title', content);
        parent.tooltip();
        if (_json.hasOwnProperty("hide")) {
            var hide = _json.hide;
            parent.tooltip("option", "hide", {
                delay: hide
            })
        }
        if (_json.hasOwnProperty("show")) {
            var show = _json.show;
            parent.tooltip("option", "show", {
                delay: show
            })
        }
    }

    GUI.Layout = function (id, position) {

        function Frame(id, position) {
            this.id = id;
            this.position = position;
            this.parent = {};
            this.jqueryObject = $([]);
            this.jqueryObjectPanes = $([]);
            this.jqueryObjectNorth = $([]);
            this.jqueryObjectSouth = $([]);
            this.jqueryObjectWest = $([]);
            this.jqueryObjectEst = $([]);
            this.jqueryObjectCenter = $([]);
            this.north = {};
            this.south = {};
            this.west = {};
            this.est = {};
            this.center = {};
            this.html = '';
            this.pane = [0, 0, 0, 0, 0];
            this.pane.size = 0;
            GUI.bufferLayout.push(this);

            this.reset = function () {
                this.id = '';
                this.position = 0;
                this.idWrap = '';
                this.parent = {};
                this.child = {};
                this.jqueryObject = $([]);
                this.html = '';
                this.north = {};
                this.south = {};
                this.west = {};
                this.est = {};
                this.center = {};
                this.pane = [0, 0, 0, 0, 0];
                this.pane.size = 0;
            }

            //check layout compatibility, if there are enough components to create a layout
            this.checkIn = function () {
                var checkNorth = jQuery.isEmptyObject(this.north) ? false : true;
                if (checkNorth && !this.pane[0]) {
                    this.pane[0] = "1";
                    this.pane.size++;
                }
                var checkSouth = jQuery.isEmptyObject(this.south) ? false : true;
                if (checkSouth && !this.pane[1]) {
                    this.pane[1] = "1";
                    this.pane.size++;
                }
                var checkEst = jQuery.isEmptyObject(this.est) ? false : true;
                if (checkEst && !this.pane[2]) {
                    this.pane[2] = "1";
                    this.pane.size++;
                }
                var checkWest = jQuery.isEmptyObject(this.west) ? false : true;
                if (checkWest && !this.pane[3]) {
                    this.pane[3] = "1";
                    this.pane.size++;
                }
                var checkCenter = jQuery.isEmptyObject(this.center) ? false : true;
                if (checkCenter && !this.pane[4]) {
                    this.pane[4] = "1";
                    this.pane.size++;
                }
                var checkEmpty = jQuery.isEmptyObject(this.north) && jQuery.isEmptyObject(this.south) && jQuery.isEmptyObject(this.est) && jQuery.isEmptyObject(this.west) && jQuery.isEmptyObject(this.center) ? true : false;
                if ((checkEmpty) || (this.pane.size < 2)) {
                    return false;
                } else {
                    return true;
                }
            }

            this.checkOut = function () {
                var txt = "Layout{" + this.id + "} which has " + this.pane.size + " panes. North:" + this.pane[0] + " South:" + this.pane[1] + " Est:" + this.pane[2] + " West:" + this.pane[3] + " Center:" + this.pane[4];
                return txt;
            }

            this.paneInfo = function (nb) {
                if ((!nb) && ((this.pane[nb]))) {
                    return {
                        name: 'north',
                        link: this.north,
                        object: this.jqueryObjectNorth
                    };
                }
                if ((nb == 1) && (this.pane[nb])) {
                    return {
                        name: "south",
                        link: this.south,
                        object: this.jqueryObjectSouth
                    };
                }
                if ((nb == 2) && (this.pane[nb])) {
                    return {
                        name: 'est',
                        link: this.est,
                        object: this.jqueryObjectEst
                    };
                }
                if ((nb == 3) && (this.pane[nb])) {
                    return {
                        name: 'west',
                        link: this.west,
                        object: this.jqueryObjectWest
                    };
                }
                if ((nb == 4) && (this.pane[nb])) {
                    return {
                        name: 'center',
                        link: this.center,
                        object: this.jqueryObjectCenter
                    };
                } else {
                    return false;
                }
            }

            //Creation Layout
            this.create = function () {
                if (this.checkIn()) {
                    var layoutBuffer = {};
                    layoutBuffer['togglerLength_open'] = 0;
                    var selector = "";
                    for (var i = 0; i < this.pane.length; i++) {
                        var info = this.paneInfo(i);
                        if (info) {
                            if (selector) {
                                selector += ',';
                            }
                            this.html += '<div id="' + this.id + '-' + info.name + '" class="ui-layout-' + info.name + '"></div>';
                        }
                        layoutBuffer[info.name] = info.link;
                    }
                    if (this.position == 1) {
                        selector = "#" + this.id + "-west,#" + this.id + "-center";
                    }
                    this.jqueryObject = $(this.html);
                    if (this.position == 1) {
                        this.parent = $('body');
                    }
                    this.parent.append(this.jqueryObject);
                    this.jqueryObject = this.parent.layout(layoutBuffer);
                    this.jqueryObjectPanes = $(selector);
                    this.jqueryObjectWest = $('#' + this.id + '-west');
                    this.jqueryObjectNorth = $('#' + this.id + '-north');
                    this.jqueryObjectSouth = $('#' + this.id + '-south');
                    this.jqueryObjectEst = $('#' + this.id + '-est');
                    this.jqueryObjectCenter = $('#' + this.id + '-center');
                } else {
                    console.error("Can't create " + this.checkOut());
                }
            }

            this.randomColor = function () {
                for (var i = 0; i < this.pane.length; i++) {
                    if (this.paneInfo(i)) {
                        var color = '#' + Math.floor(Math.random() * 16777215).toString(16); //paul irish 
                        $('#' + this.id + '-' + this.paneInfo(i).name).css('background', color);
                    }
                }
            }



            this.wrap = function (id, idSearch) {
                var selector = $('#' + idSearch);
                if (selector.html()) {
                    selector.children().wrapAll('<div id="' + id + '-center" class="ui-layout-center" style="height:100%;width:100%"></div>');
                } else {
                    selector.append('<div id="' + id + '-center" class="ui-layout-center" style="height:100%;width:100%"></div>');
                }
            }


            this.cutH = function (id, position, idSearch) {
                var positionOrigin = position;
                this.wrap(id, idSearch);
                var tmp = new Frame(id, this.position + 1);
                tmp.north = {
                    size: position + "%"
                };
                position = 100 - position;
                tmp.center = {
                    size: position + "%"
                };
                tmp.parent = $('#' + idSearch);
                tmp.create();
                tmp.randomColor();
                tmp.parent = this;
            }

            this.cutV = function (id, position, idSearch) {
                var positionOrigin = position;
                this.wrap(id, idSearch);
                var tmp = new Frame(id, this.position + 1);
                tmp.west = {
                    size: position + "%"
                };
                position = 100 - position;
                tmp.center = {
                    size: position + "%"
                };
                tmp.parent = $('#' + idSearch);
                tmp.create();
                tmp.randomColor();
                tmp.parent = this;
            }
        }


        var obj = new Frame(id, 1);
        obj.south = {
            closable: false,
            resizable: false,
            slidable: false,
            spacing_open: 0,
            spacing_closed: 0,
        };
        obj.center = {
            onresize: GUI.resize,
            resizable: true,
        };
        obj.north = {
            closable: false,
            resizable: false,
            slidable: false,
            spacing_open: 0,
            spacing_closed: 0,
        };
        obj.south = {
            resizable: false,
            closable: false,
            slidable: false,
            spacing_open: 0,
            spacing_closed: 0,
        };
        obj.west = {
            resizerCursor: "move",
             resizable: true,
            onresize: GUI.resize,
        };
        obj.create();
        //obj.jqueryObject.options.west.minSize = '10%';
        //obj.jqueryObject.options.west.maxSize = '90%';

        // obj.jqueryObject.resize("west", $(window).width() - 245);
        GUI.container = obj.jqueryObject;
       window.onresize = function(event) {
        GUI.flagResize = true;

            if (GUI.flagResize) {
                obj.jqueryObject.sizePane("west", $(window).width() - 600);
                GUI.container.resizeAll();
                GUI.container.initContent("center");
                GUI.container.initContent("west");
            } else {}
    }
        obj.jqueryObject.sizePane("west", $(window).width() - 600);
        obj.jqueryObjectWest.append("<div id='support-layout' class='ui-layout-center' style='height:100%;width:100%'></div>");
        obj.jqueryObject.sizePane("north", 37);
        obj.jqueryObject.allowOverflow("north");
        obj.jqueryObject.sizePane("south", 25);
        return obj;
    }
    // does not work without this
    GUI.offset = false;

    GUI.resize = function () {
    };

    GUI.copyToClipboard = function (text) {
        $('body').append('<textarea id="clipboardholder" style="display:none;"></textarea>');
        var clipboardholder = document.getElementById("clipboardholder");
        clipboardholder.style.display = "block";
        clipboardholder.value = text;
        clipboardholder.select();
        document.execCommand("Copy");
        clipboardholder.style.display = "none";
    }

    /*  role : it shows up a notification, it is automatically removed from the DOM when hidden/closed
    function : GUI.notification(_json);
    parameter : 
        type : json
        attributes :
            text : 
                type : string
                role : text of the 33`1 hn21¡  (required)
            title :
                type : string
                role : title of the notification
            type :
                type : string
                value : "notice", "info", "success", or "error". 
                role : specify the type of the notification. The default type is "info" 
            time :
                type : number
                value : ms
                role : Delay before the notice is removed. The default state add a "close" button to remove the notification
    variable returned: 
        type : Object <Notification>
    Example : GUI.notification({title:"tefa",text:"text",time:"4000"})
            GUI.notification({text:"jajajaaaaa",type:"notice"})*/

    GUI.notification = function (_json) {
        function Notification(_json) {
            this.text = _json.text;
            if (_json.hasOwnProperty("title")) {
                this.title = _json.title;
            } else {
                this.title = false;
            }
            this.json = _json;
            this.create = function () {
                $.pnotify.defaults.styling = "jqueryui";
                $.pnotify.defaults.history = false;
                var entry = {
                    title: this.title,
                    text: this.text,
                    sticker: false,
                    remove: true
                }
                if (this.json.hasOwnProperty("time")) {
                    entry["delay"] = this.json.time;
                    entry["closer"] = false;
                    entry["hide"] = true;
                } else {
                    entry["hide"] = false;
                    entry["closer"] = true;
                }
                if (this.json.hasOwnProperty("type")) {
                    entry["type"] = this.json.type;
                }
                $.pnotify(entry);
            }
            // this.disableHistory = function(){

            // }
            // this.enableHistory = function(){
            //     $.pnotify.defaults.history = true;
            // }
        }
        var tmp = new Notification(_json);
        tmp.create();
        // tmp.disableHistory();
        return tmp;
    }

    GUI.hideAllNotifications = function () {
        $(".ui-pnotify").remove();
        $(".ui-pnotify").hide();
    }


    GUI.searchBox = function (_json) {
        function Search(_json) {
            this.parent = _json.parent;
            this.id = _json.id;
            this.create = function () {
                this.input = GUI.addInput(this.id, "", this.parent);
                this.input.css("float:right;top:0px;")
            }
            this.search = function () {
                var stock = this;
                var buffer = $(''),
                    scrollTo = $(''),
                    container = $('#help'),
                    index = 0;
                this.input.keyup(function (event) {
                    // console.debug($("#help").find( ".ui-tabs-panel" )[$('#help').tabs( "option", "active" )])
                    if (event.keyCode == 13) {
                        index++;
                        scrollTo.css("background-color", " #CCCCCC")
                        scrollTo = $('.highlight').eq(index);
                        if (scrollTo.length) {
                            container.scrollTop(
                                scrollTo.offset().top - container.offset().top + container.scrollTop() - 80
                            );
                            scrollTo.css("background-color", "yellow")
                        } else {
                            index = 0;
                            if (scrollTo.length) {
                                container.scrollTop(
                                    scrollTo.offset().top - container.offset().top + container.scrollTop() - 80
                                );
                                scrollTo.css("background-color", "yellow")
                            }

                        }
                    } else {
                        $('#help').removeHighlight();
                        $($("#help").find(".ui-tabs-panel")[$('#help').tabs("option", "active")]).highlight(this.value);
                        if ($('.highlight').length) {
                            index = 0;
                            scrollTo = $('.highlight').eq(index);
                            container.scrollTop(
                                scrollTo.offset().top - container.offset().top + container.scrollTop() - 80
                            );
                            scrollTo.css("background-color", "yellow")
                        }
                    }
                });
            }

            $.fn.highlight = function (pat) {
                function innerHighlight(node, pat) {
                    var skip = 0;
                    if (node.nodeType == 3) {
                        var pos = node.data.toUpperCase().indexOf(pat);
                        if (pos >= 0) {
                            var spannode = document.createElement('span');
                            spannode.className = 'highlight';
                            var middlebit = node.splitText(pos);
                            var endbit = middlebit.splitText(pat.length);
                            var middleclone = middlebit.cloneNode(true);
                            spannode.appendChild(middleclone);
                            middlebit.parentNode.replaceChild(spannode, middlebit);
                            skip = 1;
                        }
                    } else if (node.nodeType == 1 && node.childNodes && !/(script|style)/i.test(node.tagName)) {
                        for (var i = 0; i < node.childNodes.length; ++i) {
                            i += innerHighlight(node.childNodes[i], pat);
                        }
                    }
                    return skip;
                }
                return this.length && pat && pat.length ? this.each(function () {
                    innerHighlight(this, pat.toUpperCase());
                }) : this;
            };

            $.fn.removeHighlight = function () {
                return this.find("span.highlight").each(function () {
                    this.parentNode.firstChild.nodeName;
                    with(this.parentNode) {
                        replaceChild(this.firstChild, this);
                        normalize();
                    }
                }).end();
            };

        }
        var tmp = new Search(_json);
        tmp.create();
        tmp.search();
        return tmp;
    }

    GUI.input = function (_json) {
        function InputDialog(_json) {
            this.json = _json;
            this.parent = this.json.parent;
            this.idObject = this.json.id;
            var stock = this;
            if (this.json.hasOwnProperty('callback')) {
                this.callback = this.json.callback;
            }
            if (this.json.hasOwnProperty('onchange')) {
                this.onchange = this.json.onchange;
            }
            if (this.json.hasOwnProperty('hide')) {
                this.hide = this.json.hide;
            }
            if (this.json.hasOwnProperty('extension')) {
                this.extension = this.json.extension;
            }
            this.mode = '';
            if (this.json.hasOwnProperty('mode')) {
                this.mode = this.json.mode;
            } else {
                this.mode = "none";
            }
            this.generateHTML = function () {
                this.html = '<input type="file" id="' + this.idObject + '" name="files[]"';
                if (this.extension) {
                    this.html += ' accept="' + this.extension + '"';
                }
                if(this.mode != "displayImage"){this.html += ' multiple ';}
                if (this.mode == 'readText') {
                    this.html += ' onchange="window.readFile(this.files)"/>';
                }
                if (this.mode == 'displayImage'){
                   this.html += 'onchange="window.displayImage(this.files)"/>'; 
                }
                // else{
                //    this.html += '/>'; 
                // }
            }
            this.create = function () {
                this.parent.append(this.html);
                this.header = $('#' + this.idObject);
                var stock = this;
                if (this.hide) {
                    this.header.hide();
                }
                stock = this;
                this.header.on("change", function () {
                    this.value = null;
                });
            }
            window.displayImage = function(file){
                    //var file = $('#loadImage').get(0).files;
                    var file = file[0];
                    var reader = new FileReader();
                    reader.onload = (function(theFile) {
                        return function(e) {
                            var image = e.target.result;
                            $div = $("<div></div>")
                            $("#renderMenus_content").append($div);
                            $("#mainLayout-west").css({
                                "background-image":"url("+image+")",
                                "background-size": "cover",
                                "-webkit-background-size": "cover", /* For WebKit*/
                                "-moz-background-size": "cover",    /* Mozilla*/
                                "-o-background-size": "cover",      /* Opera*/
                                "background-size": "cover",         /* Generic*/
                            });
                        };
                    })(file);
                    reader.readAsDataURL(file);
                        
                    }
                // reader.readAsDataURL(files[0]);
            window.readFile = function (files) {
                for (i = 0; i < files.length; i++) {
                    var file = files[i];
                    var reader = new FileReader();
                    var ret = [];
                    reader.onload = function (e) {
                        stock.callback.call(undefined, e);
                    }
                    reader.onerror = function (stuff) {
                        console.log("error", stuff)
                        console.log(stuff.getMessage())
                    }
                    reader.readAsText(file);
                    delete reader;
                }
            }
            this.click = function () {
                this.header.click();
            }
        }
        var tmp = new InputDialog(_json);
        tmp.generateHTML();
        tmp.create();
        return tmp;
}
return GUI;
});
