(function () {
    CONSOLE = this.CONSOLE = {};
    CONSOLE.terminal = '';
    CONSOLE.window = 'all';
    CONSOLE.open = function (object) {

        var timer;

        object.jqueryObjectWest.append("<div id='support-console' style='height:100%;width:100%'></div>");
        $('#support-console').append('<div id="console" class="ui-layout-south"></div><div id="mainLayout-westBis" class="ui-layout-center"></div>')
        var newLayout = $('#support-console').layout({
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
        consoleObject.hide();
        GUI.image(toggle_button, "img-console", "img/console.png", '20', '30');
        toggle_button.on('change', function (e) {
            if ($(this).is(':checked')) {
                consoleObject.show();
                stopSignal();
                $("#layout-console").scrollTop(5000);
                newLayout.sizePane("south", 120);
            } else {
                consoleObject.hide();
                newLayout.sizePane('south', '0');
                // $('#support-layout').css("height", '100%');
                stopSignal();
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
                greetings: 'Welcome to the fl4re console',
                name: 'js_command',
                width: 150,
                prompt: 'fl4re> ',
                outputLimit: -1,
            });

        };


        $("#viewerFrame").hide();
        // $("#support-layout").hide();
        $(".ui-layout-resizer.ui-layout-resizer-south.ui-layout-resizer-open.ui-layout-resizer-south-open").hide();
        var linksTool = ["window.scriptGo();", "window.debug();", "window.error();", "window.log();", "window.warn();"];
        var itemTool = ["icon-comment", "icon-info-sign", "icon-remove-sign", "icon-ban-circle", "icon-warning-sign "];
        var toolbar = GUI.toolBar("toolConsole", $('#console'), itemTool, linksTool, "top", $('#normal-button-bottom'));
        GUI.label('title_console', "Console : ", $('#console'));
        var title = GUI.label('mode_console', "All", $('#console '));
        consoleObject.append("<div id='content-console'><div id='layout-console'></div></div>");
        window.scriptGo();

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
            CONSOLE.terminal.echo("fl4re_ERROR> " + GUI.time() + ", line: " + linenumber + ", " + message + " url: " + url);
            linesToColor();
            playSignal(1, 0, 0, 0);
            check();
        };

        //catch debug from console firebug API
        //var oldAlert = alert;
        alert = function (message) {
            message = decodeJson(message);
            CONSOLE.terminal.echo("fl4re_ALERT> " + GUI.time() + ": " + message);
            linesToColor();
            check();
            playSignal(1, 0, 0, 0);
            oldDebug.apply(console, arguments);
        };

        //catch debug from console firebug API
        var oldDebug = console.debug;
        console.debug = function (message) {
            message = decodeJson(message);
            CONSOLE.terminal.echo("fl4re_DEBUG> " + GUI.time() + ": " + message);
            linesToColor();
            check();
            playSignal(0, 1, 0, 0);
            oldDebug.apply(console, arguments);
        };

        //catch log from console firebug API
        var oldLog = console.log;
        console.log = function (message) {
            message = decodeJson(message);
            CONSOLE.terminal.echo("fl4re_LOG> " + GUI.time() + ": " + message);
            linesToColor();
            check();
            playSignal(0, 0, 1, 0);
            oldDebug.apply(console, arguments);
        };

        //catch error from console firebug API
        var oldError = console.error;
        console.error = function (message) {
            message = decodeJson(message);
            CONSOLE.terminal.echo("fl4re_ERROR> " + GUI.time() + ": " + message);
            linesToColor();
            check();
            playSignal(1, 0, 0, 0);
            oldError.apply(console, arguments);
        };

        //catch warning from console firebug API
        var oldWarn = console.warn;
        console.warn = function (message) {
            message = decodeJson(message);
            CONSOLE.terminal.echo("fl4re_WARNING> " + GUI.time() + ": " + message);
            linesToColor();
            check();
            playSignal(0, 0, 0, 1);
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
                if (tmp.match("fl4re_DEBUG")) {
                    $(this).find('div').css('color', 'white');
                }
                if (tmp.match("fl4re_ERROR")) {
                    $(this).find('div').css('color', 'red');
                }
                if (tmp.match("fl4re_ALERT")) {
                    $(this).find('div').css('color', 'red');
                }
                if (tmp.match("fl4re_WARNING")) {
                    $(this).find('div').css('color', 'yellow');
                }
                if (tmp.match("fl4re_LOG")) {
                    $(this).find('div').css('color', '#2e7db2');
                }
            });
        }

        function hideELements(error, debug, log, warn) {
            $("div.terminal-output > div").each(function (index) {
                var tmp = $(this).find('div').text();
                if (tmp.match("fl4re_DEBUG") && debug) {
                    $(this).hide();
                }
                if (tmp.match("fl4re_ERROR") && error) {
                    $(this).hide();
                }
                if (tmp.match("fl4re_ALERT") && error) {
                    $(this).hide();
                }
                if (tmp.match("fl4re_WARNING") && warn) {
                    $(this).hide();
                }
                if (tmp.match("fl4re_LOG") && log) {
                    $(this).hide();
                }
            });
        }

        function showELements(error, debug, log, warn) {
            $("div.terminal-output > div").each(function (index) {
                var tmp = $(this).find('div').text();
                if (tmp.match("fl4re_DEBUG") && debug) {
                    $(this).show();
                }
                if (tmp.match("fl4re_ERROR") && error) {
                    $(this).show();
                }
                if (tmp.match("fl4re_ALERT") && error) {
                    $(this).show();
                }
                if (tmp.match("fl4re_WARNING") && warn) {
                    $(this).show();
                }
                if (tmp.match("fl4re_LOG") && log) {
                    $(this).show();
                }
            });
        }

        function decodeJson(entry) {
            if (entry == '[object Object]') {
                var tmp = JSON.stringify(entry);
                return tmp;
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
}).call(this);