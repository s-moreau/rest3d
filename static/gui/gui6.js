
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
"use strict";

if (window.$ === undefined) {
    document.write('<link rel="stylesheet" href="/gui/themes/custom-theme/jquery-ui-1.10.3.custom.css" />');

    document.write('<script src="/deps/jquery.js"><\/' + 'script>');
    document.write('<script src="/deps/jquery-ui.js"><\/' + 'script>');
    document.write('<script src="/deps/jquery.layout.min.js"><\/' + 'script>');

    document.write('<script type="text/javascript" src="/deps/jquery.cookie.js"><\/' + 'script>');
    document.write('<script type="text/javascript" src="/deps/jquery.hotkeys.js"><\/' + 'script>');
    document.write('<script type="text/javascript" src="/deps/jquery.jstree.js"><\/' + 'script>');
    document.write('<script type="text/javascript" src="/deps/jquery.terminal-0.7.3.js"><\/' + 'script>');
    document.write('<script type="text/javascript" src="/deps/jquery.toolbar.js"><\/' + 'script>');
    document.write('<script type="text/javascript" src="/deps/jquery.hover.js"><\/' + 'script>');
    document.write('<script type="text/javascript" src="/deps/console.js"><\/' + 'script>');

    document.write('<link rel="stylesheet" href="/gui/gui6.css" />');
    document.write('<link rel="stylesheet" href="/gui/themes/jquery.terminal.css" />');
    document.write('<link rel="stylesheet" href="/gui/themes/jquery.toolbars.css" />');
    document.write('<link rel="stylesheet" href="/gui/themes/bootstrap.icons.css" />');



}

/***
  Require Underscore, if we're on the server, and it's not already present.
  var _ = root._;
  if (!_ && (typeof require !== 'undefined')) _ = require('underscore')._;
***/
// UI library
(function () {


    // Initial Setup
    // -------------
    // Save a reference to the global object (`window` in the browser, `exports`
    // on the server).

    // The top-level namespace. All public GUI classes and modules will
    // be attached to this. Exported for both CommonJS and the browser.
    var GUI;
    if (typeof exports !== 'undefined') GUI = exports;
    else {
        GUI = this.GUI = {};
    };
    // Current version of the library. Keep in sync with `package.json`.
    GUI.VERSION = '0.0.1';

    GUI.bufferLayout = [];

    GUI.button = function (_txt, _parent, _callback, _x1, _y1, _x2, _y2) {
        var $button = $('<button></button>');

        $button.button().click(function (event) {
            if (_callback) _callback.call(this);
        });
        // create unique ID
        $button.button().uniqueId();
        var id = $button.attr('id');
        if (_txt !== undefined && _txt !== null)
            $button.button({
                label: _txt
            });
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
        label += '<span style="' + _style;
        if (_id) label += '" id= "' + _id;
        label += '">' + _txt + '</span>';
        if (_mode == "isolate") {
            label += '</p>';
        }
        var $label = $(label);
        //$label.button().uniqueId();
        if (!_parent)
            $('body').append($label);
        else if (_mode == "replace")
            $(_parent).appendTo($label);
        else
            $(_parent).append($label);
        return $label;
    };

    GUI.tree = function (_tree, _parent, _callback, _id) {
        var cb = _callback;
        var tree = '<div';
        if (_id) tree += ' id=' + _id;
        tree += '> </div>';
        var $tree = $(tree);
        if (!_parent)
            $('body').append($tree);
        else
            $(_parent).append($tree);


        $tree.jstree({
            plugins: ["dnd", "ui", "themeroller", "json_data", "crrm", "types"],
            animation: 0,
            /* ONLY FOR FOREIGN NODES
          dnd : {
            drag_target : ".jstree-draggable",
            drop_target : ".jstree-drop",
            drag_check : function (data) {
               if(data.r.attr("id") == "phtml_1") {
                  return false;
               }
               return {
                after : false,
                before : false,
                inside : true
               };
            },
            drop_check : function (data) {
                return false;
            },
            drop_finish : function () {
               alert("DROP");
            },
            drag_finish : function (data) {
                alert("DRAG OK");
            },
          },
            */
            crrm: {
                move: {
                    default_position: "inside",
                    always_copy: "multitree",
                    check_move: function (m) {
                        var ret = false;
                        // we can put a model in a scene
                        if (m.r.attr('rel') === 'scene' &&
                            (m.o.attr('rel') === 'model'))
                            ret = true;
                        return ret;

                    }
                }
            },

            types: {
                max_depth: -2,
                max_children: -2,
                valid_children: ["root", "scene"],
                types: {
                    root: {
                        icon: {
                            image: "/gui/img/drive.png"
                        },
                        valid_children: ["collection"],

                        hover_node: false,
                        //select_node : function () {return false;}
                    },
                    scene: {
                        icon: {
                            image: "/gui/img/scene-root22.png"
                        },
                        valid_children: ["model"],
                        //select_node : function () {return false;}
                    },
                    collection: {
                        icon: {
                            image: "/gui/img/folder.png"
                        },
                        valid_children: ["image", "shader", "model"],

                        hover_node: true,
                        //select_node : function () {return false;}
                    },
                    image: {
                        icon: {
                            image: "/gui/img/media-image.png"
                        },
                        valid_children: "none",
                    },
                    shader: {
                        icon: {
                            image: "/gui/img/GLSLStudioIcon22.png"
                        },
                        valid_children: "none",
                    },
                    model: {
                        icon: {
                            image: "/gui/img/bunny22.png"
                        },
                        valid_children: "none",
                    },
                    default: {
                        valid_children: ["default"]
                    }
                }
            },
            json_data: {
                data: [_tree]
            }
        }).bind("select_node.jstree", function (e, data) { // requires ui plugin
            // `data.rslt.obj` is the jquery extended node that was clicked
            if (cb) cb.call(data.inst, e, data.rslt);
            data.inst.deselect_node(data.rslt.obj);
        }).bind("move_node.jstree", function (e, data) { // requires crrm plugin
            if (cb) cb.call(data.inst, e, data.rslt);
        }).bind("dblclick.jstree", function (e, data) {
            //var node = $(e.target).closest("li");
            //var id = node[0].id; //id of the selected node
            if (cb) cb.call(data.inst, e, data.rslt);
        }).bind("create_node.jstree", function (e, data) {
            if (cb) cb.call(data.inst, e, data.rslt);
        }).bind("open_node.jstree", function (e, data) {
            if (cb) cb.call(data.inst, e, data.rslt);
        });

        return $tree;
    };

    GUI.canvas = function (_parent) {
        $canvas = $('<canvas class="ui-resize-me" style="padding: 0; margin: 0;" ></canvas>');

        resize = function (event) {
            $(this).height($(this).parent().parent().height() - 2);
            $(this).width($(this).parent().parent().width());
            if (this.width != this.clientWidth ||
                this.height != this.clientHeight) {
                // Change the size of the canvas to match the size it's being displayed
                this.width = this.clientWidth;
                this.height = this.clientHeight;
            }
        };

        //$canvas.button().uniqueId();
        if (!_parent)
            $('body').append($canvas);
        else {

            $parent = $(_parent);
            $parent.append($canvas);
            resize.call($canvas[0], null);
        }

        $canvas.bind('resize', resize);

        return $canvas[0];
    };

    //----------------------------------------------------------------------------------------------------------------------------------------
    GUI.autoScroll = function (_jqueryObject, _parentToScroll) {
        _jqueryObject.on("click", function (event, ui) {
            /*setTimeout(function () {
                _parentToScroll.scrollTop((_parentToScroll[0].scrollHeight) - (_parentToScroll.height()))
            }, 300);*/
            setTimeout(function () {
                _parentToScroll.scrollTop(658198126);
            }, 500);
        });
    };

    GUI.time = function () {
        var html = '';
        var a = new Date();
        var myDate = a.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
        var ms = '.' + String((a.getUTCMilliseconds() / 1000).toFixed(3)).slice(2, 5)
        html += myDate + ms;
        return html;
    }

    GUI.uniqueId = function () {
        var html = "ui-id-" + Math.round(Math.random() * 10000);
        return html;
    }


    GUI.InputInteractive = function (_parent, _id, _min, _max, _defaultValue, _precision, _sensibility) {

        function Object(_parent, _id, _min, _max, _defaultValue, _precision_sensibility) {
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
                this.html = '<span style="display:inline; position: relative; left: 25px;"><input type="text" id="' + this.id + '" name="' + this.id + '" style="right: 40px !important;"></span>';
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
                        input.val(parseFloat(input.val()).toFixed(check));
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
                input.keyup(function (event) {
                    var value = $(this).val()
                    if (value > max && value != '') {
                        $(this).val(max);
                        return false;
                    }
                    if (value < min && value != '') {
                        $(this).val(min);
                        return false;
                    }
                })
                input.on('blur', function () {
                    var check = Math.round(-Math.log(precision) / Math.LN10);
                    input.val(parseFloat(input.val()).toFixed(check));
                });
            }


            this.onChange = function (callback) {
                this.jqueryObjectInput.find("input").on('blur', callback);
                this.callback = callback;
                this.buttonEvent();
            }
        }

        var tefa = new Object(_parent, _id, _min, _max, _defaultValue, _precision);
        tefa.parent.append('<div id="content-' + tefa.id + '" style="" >'); /*float: left !important*/
        tefa.createButton();
        tefa.createInput();
        tefa.buttonEvent();
        tefa.inputEvent();
        tefa.parent.append('</div>');
        tefa.parent.append("</br>");
        return tefa;
    }


    //checked    
    GUI.addAccordion = function (_id, _items, _parent, _content, _mode) {
        if (_id == "console" || _id == "Console") return console.error("GUI.console: _id ever used, please enter a new one");
        var size_items = _items.length;
        var accordion = '<div id="' + _id + '" >'
        for (var i = 0; i < size_items; i++) {
            accordion += '<h3>' + _items[i] + '</h3><div id="' + _id + '-' + i + '" >';
            if (_content && (_content[i] != "0")) {
                accordion += _content[i];
            }
            accordion += '</div>';
        }
        accordion += '</div>';
        var $accordion = $(accordion);
        if (_mode == "before") {
            _parent.prepend($accordion);
        } else _parent.append($accordion);
        $('#' + _id).accordion({
            header: "h3",
            navigation: true,
            collapsible: true,
            active: false,
            heightStyle: "content"
        });
        return $accordion;
    };

    //checked
    GUI.addNewTab = function (_idTabWindow, _idTab, _headerTitle, _contentHTML) {
        var headerTab = '<li><a href="#' + _idTab + '">' + _headerTitle + '</a></li>';
        var $headerTab = $(headerTab);
        $("#header-" + _idTabWindow).append($headerTab);
        var contentTab = '<div id="' + _idTab + '">';
        if (_contentHTML) {
            contentTab += _contentHTML;
        }
        contentTab += '</div>';
        var $contentTab = $(contentTab);
        $("#content-" + _idTabWindow).append($contentTab);
        $("#header-" + _idTabWindow).parent().tabs("refresh");

        return $contentTab;
    }

    GUI.removeNewTab = function (_idTabWindow, id) {
        $('li[aria-controls="' + id + '"]').remove();
        $('#' + id).remove();
        $("#header-" + _idTabWindow).parent().tabs("refresh");
    }

    //checked
    GUI.addTabWindow = function (_parent, _idTab, _headerTitle, _contentHTML) {
        var tab = '<ul id="header-' + _idTab + '" ><li><a href="#' + _idTab + '">' + _headerTitle + '</a></li></ul>';
        tab += '<div id="content-' + _idTab + '" class="ui-widget-content ui-layout-content ui-corner-top" >';
        tab += '<div id="' + _idTab + '" class="content">';
        if (_contentHTML) {
            tab += _contentHTML;
        }
        tab += '</div></div>'
        var $tab = $(tab);
        _parent.append($tab);
        _parent.tabs();
        return $tab;
    };

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
        $("#" + _id).slider({
            animate: true,
            min: _min,
            max: _max,
            step: _step,
            value: _defaultValue
        });
        return $slider;
    };

    //checked
    GUI.addIcon = function (_parent, _cssClass, _style, _position) {
        var icon = '';
        if (_style) {
            icon = '<span id="' + _cssClass + '" class="ui-icon ' + _cssClass + '" style="' + _style + '"';
        } else {
            icon = '<span class="ui-icon ' + _cssClass + '"';
        }
        icon += '></span>';
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
        $("#" + _id).dialog({
            dialogClass: 'alert',
            resizable: true,
            height: '105',
            width: '250',
            modal: true
        });
        $(".ui-dialog-titlebar").hide();
        return $("#" + _id);
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
            height: '300',
            width: '850',
            modal: true
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
            height: 'auto',
            width: 'auto',
            modal: true,
            buttons: {
                Yes: function () {
                    eval(_callback);
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
                $("#" + _id + '-' + _items[0]).button();
            } else if (_mode == "vertical") {
                $("#" + _id).buttonsetvertical();
            } else {
                $("#" + _id).buttonset();
            }
            return $stickyButton;
        }
    };

    //checked
    GUI.addCheckBox = function (_id, _text, _parent) {
        var checkBox = '<li id="' + _id + '" style="list-style:none;"><input type="checkbox"';
        checkBox += '><span>' + _text + '</span></li>';
        if (_parent) {
            var $checkBox = $(checkBox);
            _parent.append($checkBox);
            return $checkBox;
        } else {
            return checkBox;
        }
    };

    // checked except mod vertical  
    GUI.addStickyList = function (_id, _items, _parent, _mode) {
        var size_list = _items.length;
        var stickyList = '<form><div id="' + _id + '" >';
        // if(_id.length==0)
        for (var i = 0; i < size_list; i++) {
            var tmp = '';
            if (i == _mode) {
                tmp = 'checked="checked"';
            }
            stickyList += '<input type="radio" id="' + _id + '-' + i + '" name="radio" ' + tmp + ' /><label for="' + _id + '-' + i + '">' + _items[i] + '</label>';
        }
        stickyList += '</div></form>';
        if (_mode = "code") {
            return stickyList;
        } else {
            var $stickyList = $(stickyList);
            _parent.append($stickyList);
            if (_mode == "vertical") {
                $("#" + _id).buttonsetv();
            } else {
                $("#" + _id).buttonset();
            }
            return $stickyList;
        }
    };

    //checked
    GUI.addRadioList = function (_position, _id, _value, _text, _parent) {
        var radioList = '<li id=' + _id + ' style="list-style:none">';
        for (var i = 0; i < _text.length; i++) {
            var tmp = "";
            if (i == _position - 1) {
                tmp = "checked";
            }
            if (!(_id instanceof Array)) {
                radioList += '<input type="radio" name="' + _id + '" value="' + _value[i] + '" style="border: red !important;" ' + tmp + ' ><span style="bottom: 2px;">' + _text[i] + '</span><br>';
            } else {
                radioList += '<input type="radio" name="' + _id[0] + '" value="' + _value[i] + '" style=" background-color: red  !important;"' + tmp + '><span style="bottom: 2px;">' + _text[i] + '</span><br>';
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
    };

    //checked GUI.addSlider = function (_id, _parent, _min, _max, _step, _defaultValue, _style) {
    GUI.addMenu = function (_item, _link, _position, _id) {
        var slider = false;
        if (!_link || !_position) return console.error("function:menuAddElement: miss argument");
        if (_item.length != _item.length) return console.error("function:menu invalid arguments, it must have same length");
        else {
            var menu = '<ul id="' + _id + '" class="z' + _position + '">';
            var size_menu = _item.length;
            if (_position != 0) {
                $('li#z' + _position).addClass("has-sub");
            }
            for (var i = 1; i < (size_menu + 1); i++) {
                if (_link[i - 1] != 0) {
                    if (_link[i - 1] == "checkbox") {
                        menu += GUI.addCheckBox('z' + _position + '_' + i, _item[i - 1]);
                    } else if (_link[i - 1] == "radioList") {
                        menu += GUI.addRadioList(1, 'z' + _position + '_' + i, _item[i - 1], _item[i - 1]);
                    } else if (_link[i - 1] == "slider") {
                        menu += '<li id="z' + _position + '_' + i + '">'
                        menu += GUI.addSlider('slider' + _position + '_' + i, "code");
                        menu += '</li>';
                        slider = i;
                    } else {
                        menu += '<li id="z' + _position + '_' + i + '">' + '<a href="' + _link[i - 1] + '"><span>' + _item[i - 1] + '</span></a></li>';
                    }
                } else {
                    menu += '<li id ="z' + _position + '_' + i + '">' + '<a href="#"><span>' + _item[i - 1] + '</span></a></li>';
                }
            }
            menu += '</ul>';
            var $menu = $(menu);
            if (_position == '0') {
                $('div.ui-layout-north').append($menu); /*$("#"+_id+">li").css("border-right","30px dotted white")*/
            } else {
                $('li#z' + _position).append($menu);
            }
            if (slider) {

                $('#slider' + _position + '_' + slider).slider({
                    animate: true,
                    min: _item[slider - 1][0],
                    max: _item[slider - 1][1],
                    step: _item[slider - 1][2],
                    value: _item[slider - 1][3],
                    slidechange: _item[slider - 1][4],
                }).width(175);
            }
            return $menu;
        }
    };

    //not udpdated,Broken
    GUI.addElementMenu = function (_item, _link, _position) {
        if (!_link || !_position || !_item) return console.error("function:menuAddElement: miss argument");
        if (_item.length != _item.length) return console.error("function:menu invalid arguments, it must have same length");
        else {
            var _parent = $('div.ui-layout-north');
            if (_position != 0) {
                var nb = ($('li#z' + _position).children().size()) + 1;
            } else {
                var nb = ($('ul.' + _position).children().size()) + 1;;
            }
            var size_menu = _item.length;
            var menu = '<!---->';
            for (var i = 1; i < (size_menu + 1); i++) {
                if (_link[i - 1] != 0) {
                    menu += '<li id=';
                    menu += '\'' + _position + '_' + nb + '\'>' + '<a href="' + _link[i - 1] + '">';
                    nb++;
                } else {
                    menu += '<li id =\'' + _position + '_' + nb + '\'>' + '<a href="#">';
                    nb++;
                }
                menu += '<span>' + _item[i - 1] + '</span></a></li>';
            }
            var $menu = $(menu);
            $('ul.' + _position).append($menu);
            return $menu;
        }
    };


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
    //----------------------------------------------------------------------------------------------------------------------------------------

    GUI.window = function (_txt, _pane, _float) {

        if (_pane)
            $parent = $(".ui-layout-" + _pane);

        // TODO - rename fragment-1 to something more useful
        var code =
            '<ul>' +
            '   <li><a href="#tabs-' + _pane + '-1" >' + _txt + '</a></li>' +
            '</ul>' +

        '<div class="ui-layout-content ui-widget-content" >' +
            '   <div id="tabs-' + _pane + '-1" class=" ui-widget-content" ></div>' +
            '</div>';
        var $window;

        if (!_pane || _float) {
            code = '<div class="ui-tabs ui-widget">' + code + '</div>';

            $window = $(code);
            $window.tabs();
            $('body').append($window);


            if (_float)
                $window.resizable({
                    helper: "ui-resizable-helper"
                })
                    .draggable();
        } else {
            $window = $(code);
            $parent.append($window);
            $parent.tabs()
            // allow tabs to be moved left/right
            .find(".ui-tabs-nav").sortable({
                axis: 'x',
                zIndex: 2
            });

        }

        //$window.uniqueId();
        //var id=$window.attr('id');

        return $window.find('.ui-widget-content');
    };

    GUI.searchClickId = function (event, element) {
        var idSearch = event.target.id;
        var check = true;
        var count = 0;
        var condition = ''
        while (check) {
            count++;
            var search = $('#' + idSearch).attr('class');
            if (search) {
                if (search.match("ui-layout-center") || search.match("ui-layout-south") || search.match("ui-layout-north") || search.match("ui-layout-est") || search.match("ui-layout-west")) {
                    check = false;
                    break;
                }
            }
            var $parent = $('#' + idSearch).parent();
            idSearch = $parent.attr('id');
            if (count == 20) {
                throw "didn't find any layouts";
                return false;
            }
        }
        element = $('#' + idSearch);
        var parentOffset = element.offset();
        var relX = event.pageX - parentOffset.left;
        var relY = event.pageY - parentOffset.top;
        var percentageY = Math.round(relY * (100 / $(element).height()));
        var percentageX = Math.round(relX * (100 / $(element).width()));
        return {
            id: idSearch,
            percentagex: percentageX,
            percentagey: percentageY
        };
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
        };
        obj.north = {
            closable: false,
            resizable: false,
            slidable: false,
            spacing_open: 0,
            spacing_closed: 0,
        };
        obj.south = {
            resizable: true,
            closable: false,
            slidable: false,
            spacing_open: 0,
            spacing_closed: 0,
        };
        obj.west = {
            resizerCursor: "move",
            onresize: GUI.resize,
        };
        obj.create();

        obj.jqueryObject.sizePane("west", $(window).width() - 250);
        $(window).on('resize orientationChanged', function () {
            setTimeout(function () {
                obj.jqueryObject.sizePane("west", $(window).width() - 250)
            }, 500);
        });
        obj.jqueryObject.allowOverflow("north");
        obj.jqueryObject.allowOverflow("south");
        obj.jqueryObjectWest.append("<div id='support-layout' class='ui-layout-center'></div>");
        return obj;
    }
    // does not work without this
    GUI.resize = function () {};

    GUI.setMenuSensitivity = function (sensitivity, timeoutMouseOver, timeoutMouseOut) {
        $('#mainLayout-north .has-sub .has-sub, #z0_5_3').hoverIntent({
            sensitivity: sensitivity,
            interval: timeoutMouseOver,
            over: function () {
                $(this).find('ul').css("display", "block")
            },
            timeout: timeoutMouseOut,
            out: function () {
                $(this).find('ul').css("display", "none")
            }

        });
    }

}).call(this);