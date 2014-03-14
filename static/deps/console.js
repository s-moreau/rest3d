define("console", (function (global) {
    CONSOLE = this.CONSOLE = {};
    CONSOLE.terminal = '';
    CONSOLE.window = 'all';
    CONSOLE.jqueryObject = "";
    CONSOLE.flagError = false;
    CONSOLE.statusOpen = false;
    CONSOLE.open = function (object) {

        var timer;

        object.jqueryObjectWest.append('<div id="console" class="ui-layout-south"></div><div id="viewerFrame" class="ui-layout-center"></div>')
        var newLayout = object.jqueryObjectWest.layout({
            togglerLength_open: 0, // HIDE the toggler button

            south: {
                size: 140,

            },
            center: {
                resizable: true,
                onresize: GUI.resize,
                resizerCursor: "move",
            }
        });

        
        var toggle_button = GUI.addStickyButton('buttonLayout', [""], object.jqueryObjectSouth);
        toggle_button.width(35);
        toggle_button.height(25);
        var consoleObject = $('#console');
        var modeConsoleObject = $('#mode_console');
        CONSOLE.jqueryObject = consoleObject;
        consoleObject.hide();
        GUI.image(toggle_button, "img-console", "../gui/images/console.png", '20', '30');
        toggle_button.on('change', function (e) {
            if ($(this).is(':checked')) {
                consoleObject.show();
                stopSignal();
                $("#layout-console").click();
                $("#layout-console").scrollTop(5000);
                // if(!flagStatus){window.unbindEventToConduit()};
                linesToColor();
                var flagSelect = true;
                $(".prompt").next().on("mouseup",function(e){
                    if(flagSelect){
                    var select = document.getSelection().toString();
                    var value = $(".prompt").next().html();
                    var res = value.replace(select,"");
                    $('body').keydown(
                          function(e){
                          if (e.keyCode==8||e.keyCode==46){
                                //console.debug(res)
                                $(".prompt").next().text("");
                                setTimeout(function(){$(".prompt").next().text(res)},100);
                                // console.debug($(".prompt").next().text())
                                e.preventDefault();
                                $("body").unbind("keydown");};
                         });

                    flagSelect = false;}
                        
                });
                // $(".prompt").next().on("mousedown",function(e){
                //     $(this).off("mouseup");
                //     flagSelect = true;
                //  });
                        CONSOLE.statusOpen = true;
            } else {
                consoleObject.hide();
                stopSignal();
                $("body").click();
                // if(!flagStatus){window.bindEventToConduit()};
                CONSOLE.flagError = false;
                linesToColor();
                CONSOLE.statusOpen = false;
            }
        });

        newLayout.allowOverflow("south");

        window.debug = function () {
            window.scriptGo();
            CONSOLE.windowFlag = 'debug';
            modeConsoleObject.remove();
            title.remove();
            title = GUI.label('mode_console', "debug", consoleObject);
            hideELements(1, 0, 1, 1);
            linesToColor();
        };

        window.log = function () {
            window.scriptGo();
            CONSOLE.windowFlag = 'log';
            modeConsoleObject.remove();
            title.remove();
            title = GUI.label('mode_console', "log", consoleObject);
            hideELements(1, 1, 0, 1);
            linesToColor();
        };

        window.warn = function () {
            window.scriptGo();
            CONSOLE.windowFlag = 'warn';
            modeConsoleObject.remove();
            title.remove();
            title = GUI.label('mode_console', "warning", consoleObject);
            hideELements(1, 1, 1, 0);
            linesToColor();
        };

        window.error = function () {
            window.scriptGo();
            CONSOLE.windowFlag = 'error';
            modeConsoleObject.remove();
            title.remove();
            title = GUI.label('mode_console', "error", consoleObject);
            hideELements(0, 1, 1, 1);
            linesToColor();
        };


        window.scriptGo = function () {
            CONSOLE.windowFlag = 'all';
            modeConsoleObject.remove();
            title.remove();
            showELements(1, 1, 1, 1);
            title = GUI.label('mode_console', "All", $('#console '));
            CONSOLE.terminal = $('#layout-console').terminal(function (command, term) {
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
                width: 150,
                prompt: 'rest3d> ',
                outputLimit: -1,
            });

        };


        $("#viewerFrame").hide();
        $("#support-layout").hide();
        $(".ui-layout-resizer.ui-layout-resizer-south.ui-layout-resizer-open.ui-layout-resizer-south-open").hide();
        var linksTool = ["window.scriptGo();", "window.debug();", "window.error();", "window.log();", "window.warn();"];
        var itemTool = ["icon-comment", "icon-info-sign", "icon-remove-sign", "icon-ban-circle", "icon-warning-sign "];
        var toolbar = GUI.toolBar("toolConsole", $('#console'), itemTool, linksTool, "top", $('#normal-button-bottom'));
        GUI.label('title_console', "Console : ", $('#console'));
        var title = GUI.label('mode_console', "All", $('#console '));
        consoleObject.append("<div id='content-console'><div id='layout-console'></div></div>");
        window.scriptGo();

        $("#layout-console").on("mousewheel DOMMouseScroll", function (e) {
            if (e.originalEvent.wheelDelta / 120 > 0) {
                $(this).scrollTop($(this).scrollTop() + 20);
            } else {
                $(this).scrollTop($(this).scrollTop() - 20);
            }
        })
        //handling errors,warnings,debugs,logs
        //catch error 

        window.onerror = function (message, url, linenumber) {
            //message = decodeJson(message);
            if (!url) {
                url = "undefined";
            }
            if (!linenumber) {
                linenumber = "undefined";
            }
            var checkVisible = false;
            if (consoleObject.is(':hidden')) {
                checkVisible = true;
                consoleObject.show();
            }
            CONSOLE.terminal.echo("rest3d_ERROR> " + GUI.time() + ", line: " + linenumber + ", " + message + " url: " + url);
            if (checkVisible) {
                consoleObject.hide();
            }
            linesToColor();
            CONSOLE.flagError = true;
            if(!CONSOLE.statusOpen){playSignal(1, 0, 0, 0);}
            check();
        };

        //catch debug from console firebug API
        //var oldAlert = alert;
        alert = function (message) {
            message = decodeJson(message);
            var checkVisible = false;
            if (consoleObject.is(':hidden')) {
                checkVisible = true;
                consoleObject.show();
            }
            CONSOLE.terminal.echo("rest3d_ALERT> " + GUI.time() + ": " + message);
            if (checkVisible) {
                consoleObject.hide();
            }
            linesToColor();
            check();
            if(!CONSOLE.statusOpen){playSignal(1, 0, 0, 0)};
            oldDebug.apply(console, arguments);
        };

        //catch debug from console firebug API
        var oldDebug = console.debug;
        console.debug = function (message) {
            message = decodeJson(message);
            var checkVisible = false;
            if (consoleObject.is(':hidden')) {
                checkVisible = true;
                consoleObject.show();
            }
            CONSOLE.terminal.echo("rest3d_DEBUG> " + GUI.time() + ": " + message);
            if (checkVisible) {
                consoleObject.hide();
            }
            linesToColor();
            check();
            if(!CONSOLE.statusOpen){playSignal(0, 1, 0, 0)};
            oldDebug.apply(console, arguments);
        };

        //catch log from console firebug API
        var oldLog = console.log;
        console.log = function (message) {
            message = decodeJson(message);
            var checkVisible = false;
            if (consoleObject.is(':hidden')) {
                checkVisible = true;
                consoleObject.show();
            }
            CONSOLE.terminal.echo("rest3d_LOG> " + GUI.time() + ": " + message);
            if (checkVisible) {
                consoleObject.hide();
            }
            linesToColor();
            check();
            if(!CONSOLE.statusOpen){playSignal(0, 0, 1, 0)};
            oldDebug.apply(console, arguments);
        };

        //catch error from console firebug API
        var oldError = console.error;
        console.error = function (message) {
            message = decodeJson(message);
            var checkVisible = false;
            if (consoleObject.is(':hidden')) {
                checkVisible = true;
                consoleObject.show();
            }
            CONSOLE.terminal.echo("rest3d_ERROR> " + GUI.time() + ": " + message);
            if (checkVisible) {
                consoleObject.hide();
            }
            linesToColor();
            check();
            CONSOLE.flagError = true;
            if(!CONSOLE.statusOpen){playSignal(1, 0, 0, 0)};
            oldError.apply(console, arguments);
        };

        //catch warning from console firebug API
        var oldWarn = console.warn;
        console.warn = function (message) {
            message = decodeJson(message);
            var checkVisible = false;
            if (consoleObject.is(':hidden')) {
                checkVisible = true;
                consoleObject.show();
            }
            CONSOLE.terminal.echo("rest3d_WARNING> " + GUI.time() + ": " + message);
            if (checkVisible) {
                consoleObject.hide();
            }
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
                    $(this).find('div').css('color', 'white');
                }
                if (tmp.match("rest3d_ERROR")) {
                    $(this).find('div').css('color', 'red');
                }
                if (tmp.match("rest3d_ALERT")) {
                    $(this).find('div').css('color', 'red');
                }
                if (tmp.match("rest3d_WARNING")) {
                    $(this).find('div').css('color', 'yellow');
                }
                if (tmp.match("rest3dLOG")) {
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
                // var tmp = JSON.stringify(entry);
                return entry;
            } else {
                return entry
            }
        }

        function playSignal(error, debug, log, warn) {
            if (!consoleObject.is(":visible"))
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
            timer = setInterval(function () {
                Timer()
            }, 350);
        }

        function stopSignal() {
            clearInterval(timer);
            toggle_button.removeClass('button-error');
            toggle_button.removeClass('button-warn');
            toggle_button.removeClass('button-log');
            toggle_button.removeClass('button-debug');
        }

        return
    };
return function () {
        return global.CONSOLE;
    };
}(this)));

