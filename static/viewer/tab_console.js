/*
The MIT License (MIT)

Copyright (c) 2014 Rémi Arnaud - Advanced Micro Devices, Inc.

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
THE SOFTWARE.*/
define("console", function () {
    CONSOLE = this.CONSOLE = {};
    CONSOLE.terminal = '';
    CONSOLE.window = 'all';
    CONSOLE.jqueryObject = "";
    CONSOLE.flagError = false;
    CONSOLE.statusOpen = false;
    CONSOLE.timer;
    window.test=function(){
        var message = "test";
        console.error(message);
        console.debug(message);
        console.warn(message);
        console.log(message);
    }
    function console_init(parent){
        if(!parent.hasOwnProperty("consoletab"))parent.consoletab = parent;
        toggle_button = $('li[aria-controls="consoletab"]')
        parent = parent.consoletab;
        parent.focusTab(function(){
            stopSignal()
        })
        // window.renderMenu.render.focusTab(function(){
        //     CONSOLE.statusOpen = false;
        // }) //TEST TAB
        window.renderMenu.scenes.focusTab(function(){
            CONSOLE.statusOpen = false;
        })
        window.renderMenu.script.focusTab(function(){
            CONSOLE.statusOpen = false;
        })
        

        parent.append('<div id="console"></div>');
        var errorCounter = 0, logCounter = 0, warnCounter = 0,  debugCounter = 0;
        function updateStatus(){
            var html="";
            if(errorCounter!==0){
                html+="<img src='../gui/images/console_error.png' style='width:10px;height:10px;'>"+errorCounter+"</img>";
            }
            if(logCounter!==0){
                html+="<img src='../gui/images/console_log.png' style='width:10px;height:10px;'>"+logCounter+"</img>";
            }
            if(debugCounter!==0){
                html+="<img src='../gui/images/console_debug.png' style='width:10px;height:10px;'>"+debugCounter+"</img>";
            }
            if(warnCounter!==0){
                html+="<img src='../gui/images/console_warning.png' style='width:10px;height:10px;'>"+warnCounter+"</img>";
            }
            html += ""
            window.consoleStatus.html(html);
            // $.each(html,function(element,index){
            //     if(element.text())
            // })
        }

        var consoleObject = $('#console');
        var modeConsoleObject = $('#mode_console');
        CONSOLE.jqueryObject = consoleObject;
    
        window.debug = function () {
            window.scriptGo();
            CONSOLE.windowFlag = 'debug';
            modeConsoleObject.remove();
           // title.remove();
           // title = GUI.label('mode_console', "debug", consoleObject);
            hideELements(1, 0, 1, 1);
            linesToColor();
        };

        window.log = function () {
            window.pleaseWait(false)
            logCounter++;
            window.scriptGo();
            CONSOLE.windowFlag = 'log';
            modeConsoleObject.remove();
           // title.remove();
          //  title = GUI.label('mode_console', "log", consoleObject);
            hideELements(1, 1, 0, 1);
            linesToColor();
        };

        window.warn = function () {
            warnCounter++;
            window.scriptGo();
            CONSOLE.windowFlag = 'warn';
            modeConsoleObject.remove();
           // title.remove();
           // title = GUI.label('mode_console', "warning", consoleObject);
            hideELements(1, 1, 1, 0);
            linesToColor();
        };

        window.error = function () {
            window.pleaseWait(false)

            window.scriptGo();
            errorCounter++;
            CONSOLE.windowFlag = 'error';
            modeConsoleObject.remove();
           // title.remove();
           // title = GUI.label('mode_console', "error", consoleObject);
            hideELements(0, 1, 1, 1);
            linesToColor();
        };


        window.scriptGo = function () {
            CONSOLE.windowFlag = 'all';
            modeConsoleObject.remove();
           // title.remove();
            showELements(1, 1, 1, 1);
           // title = GUI.label('mode_console', "All", $('#console '));
            CONSOLE.terminal = $('#console').terminal(function (command, term) {
                if (command !== '') {
                    try {
                        var result = window.eval(command);
                        if (result !== undefined) {
                            result = decodeJson(window.eval(command));
                            term.echo(new String(result));
                            linesToColor();
                        }
                    } catch (e) {
                        console.error(new String(e));
                    }
                } else {
                    term.echo('');
                    linesToColor();

                }

            }, {
                greetings: 'Welcome to the rest3d console',
                name: 'js_command',
                width: '95%',
                prompt: 'rest3d> ',
                outputLimit: -1,
            });
        };

        // $(".ui-layout-resizer.ui-layout-resizer-south.ui-layout-resizer-open.ui-layout-resizer-south-open").hide();
        var linksTool = ["window.scriptGo();", "window.debug();", "window.error();", "window.log();", "window.warn();"];
        var itemTool = ["icon-comment", "icon-info-sign", "icon-remove-sign", "icon-ban-circle", "icon-warning-sign "];
        var toolbar = GUI.toolBar("toolConsole", $('#console'), itemTool, linksTool, "bottom");
        //GUI.label('title_console', "Console : ", $('#console'));
        //var title = GUI.label('mode_console', "All", $('#console '));
        // consoleObject.append("<div id='content-console'><div id='layout-console'></div></div>");
        window.scriptGo();

        // $("#layout-console").on("mousewheel DOMMouseScroll", function (e) {
        //     if (e.originalEvent.wheelDelta / 120 > 0) {
        //         $(this).scrollTop($(this).scrollTop() + 20);
        //     } else {
        //         $(this).scrollTop($(this).scrollTop() - 20);
        //     }
        // })
        //handling errors,warnings,debugs,logs
        //catch error 
//
        window.onerror = function (message, url, linenumber) {
            window.pleaseWait(false)
            //message = decodeJson(message);
            errorCounter ++;
            updateStatus();
            if (!url) {
                url = "undefined";
            }
            if (!linenumber) {
                linenumber = "undefined";
            }
            CONSOLE.terminal.echo("rest3d_ERROR> " + GUI.time() + ", line: " + linenumber + ", " + message + " url: " + url);
            linesToColor();
            CONSOLE.flagError = true;
            if(!CONSOLE.statusOpen){playSignal(1, 0, 0, 0);}
            check();
        };

        //catch debug from console firebug API
        //var oldAlert = alert;
        alert = function (message) {
            window.pleaseWait(false)
            errorCounter ++;
            updateStatus();
            message = decodeJson(message);
            CONSOLE.terminal.echo("rest3d_ALERT> " + GUI.time() + ": " + message);
            linesToColor();
            check();
            if(!CONSOLE.statusOpen){playSignal(1, 0, 0, 0)};
            oldDebug.apply(console, arguments);
        };

        //catch debug from console firebug API
        var oldDebug = console.debug;
        console.debug = function (message) {
            window.pleaseWait(false)
            debugCounter ++;
            updateStatus();
            message = decodeJson(message);
            CONSOLE.terminal.echo("rest3d_DEBUG> " + GUI.time() + ": " + message);
            linesToColor();
            check();
            if(!CONSOLE.statusOpen){playSignal(0, 1, 0, 0)};
            oldDebug.apply(console, arguments);
        };

        //catch log from console firebug API
        var oldLog = console.log;
        console.log = function (message) {
            window.pleaseWait(false)
            logCounter ++;
            updateStatus();
            message = decodeJson(message);
            CONSOLE.terminal.echo("rest3d_LOG> " + GUI.time() + ": " + message);
            linesToColor();
            check();
            if(!CONSOLE.statusOpen){playSignal(0, 0, 1, 0)};
            oldDebug.apply(console, arguments);
        };

        //catch error from console firebug API
        var oldError = console.error;
        console.error = function (message) {
            window.pleaseWait(false)
            errorCounter ++;
            updateStatus();
            message = decodeJson(message);
            CONSOLE.terminal.echo("rest3d_ERROR> " + GUI.time() + ": " + message);
            linesToColor();
            check();
            CONSOLE.flagError = true;
            if(!CONSOLE.statusOpen){playSignal(1, 0, 0, 0)};
            oldError.apply(console, arguments);
        };

        //catch warning from console firebug API
        var oldWarn = console.warn;
        console.warn = function (message) {
            window.pleaseWait(false)
            warnCounter ++;
            updateStatus();
            message = decodeJson(message);
            CONSOLE.terminal.echo("rest3d_WARNING> " + GUI.time() + ": " + message);
            linesToColor();
            check();
            if(!CONSOLE.statusOpen){playSignal(0, 0, 0, 1)};
            oldWarn.apply(console, arguments);
        };

        check = function () {
            if (CONSOLE.windowFlag == 'all') {
                showELements(1, 1, 1, 1);
            } else if (CONSOLE.windowFlag == 'error') {
                hideELements(0, 1, 1, 1);
            } else if (CONSOLE.windowFlag == 'debug') {
                hideELements(1, 0, 1, 1);
            } else if (CONSOLE.windowFlag == 'warn') {
                hideELements(1, 1, 1, 0);
            } else if (CONSOLE.windowFlag == 'log') {
                hideELements(1, 1, 0, 1);
            }
        }

        function linesToColor() {

            $("div.terminal-output > div").each(function (index) {
                var tmp = $(this).find('div').text();
                if (tmp.match("rest3d_DEBUG")) {
                    $(this).find('div').css('color', 'green');
                }
                if (tmp.match("rest3d_ERROR")) {
                    $(this).find('div').css('color', 'red');
                }
                if (tmp.match("rest3d_ALERT")) {
                    $(this).find('div').css('color', 'red');
                }
                if (tmp.match("rest3d_WARNING")) {
                    $(this).find('div').css('color', 'purple');
                }
                if (tmp.match("rest3d_LOG")) {
                    $(this).find('div').css('color', '#2e7db2');
                }
            });
        }

        function hideELements(error, debug, log, warn) {
            $("div.terminal-output > div").each(function (index) {
                var tmp = $(this).find('div').text();
                if (tmp.match("rest3d_DEBUG") && debug) {
                    $(this).hide();
                }
                if (tmp.match("rest3d_ERROR") && error) {
                    $(this).hide();
                }
                if (tmp.match("rest3d_ALERT") && error) {
                    $(this).hide();
                }
                if (tmp.match("rest3d_WARNING") && warn) {
                    $(this).hide();
                }
                if (tmp.match("rest3d_LOG") && log) {
                    $(this).hide();
                }
            });
        }

        function showELements(error, debug, log, warn) {
            $("div.terminal-output > div").each(function (index) {
                var tmp = $(this).find('div').text();
                if (tmp.match("rest3d_DEBUG") && debug) {
                    $(this).show();
                }
                if (tmp.match("rest3d_ERROR") && error) {
                    $(this).show();
                }
                if (tmp.match("rest3d_ALERT") && error) {
                    $(this).show();
                }
                if (tmp.match("rest3d_WARNING") && warn) {
                    $(this).show();
                }
                if (tmp.match("rest3d_LOG") && log) {
                    $(this).show();
                }
            });
        }

        function decodeJson(entry) {
            if (entry == '[object Object]') {
                try{var tmp = JSON.stringify(entry);}
                catch(e){
                    try{
                        var tmp = jQuery.parseJSON(entry);
                    }
                    catch(e){
                       var tmp = entry; 
                    }
                }
                return tmp;
            } else {
                return entry
            }
        }

        function playSignal(error, debug, log, warn) {
            if (!CONSOLE.statusOpen)
            var classColor;
            if (error) {
                classColor = 'button-error';
            } else if (warn) {
                classColor = 'button-warn';
            } else if (log) {
                classColor = 'button-log';
            } else if (debug) {
                classColor = 'button-debug';
            }
            x = 1;
            stopSignal();

            function Timer() {
                set = 1;
                if (x == 0 && set == 1) {
                    toggle_button.addClass(classColor);
                    x = 1;
                    set = 0;
                }
                if (x == 1 && set == 1) {
                    toggle_button.removeClass(classColor);
                    x = 0;
                    set = 0;
                }
            }
            CONSOLE.timer = setInterval(function () {
                Timer()
            }, 350);
        }

        function stopSignal() {
            clearInterval(CONSOLE.timer);
            toggle_button.removeClass('button-error');
            toggle_button.removeClass('button-warn');
            toggle_button.removeClass('button-log');
            toggle_button.removeClass('button-debug');
        }  
      
        window.renderMenu.consoletab.css({"padding":0});
        CONSOLE.terminal.addClass("ui-widget-content");

        window.renderMenu.consoletab.focusTab(function(){
            CONSOLE.terminal.removeClass("ui-widget-header");
            setTimeout(function(){CONSOLE.terminal.resize();linesToColor();},100);
            });
        }

    return console_init;
});

