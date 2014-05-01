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
'use strict';
define([], function () {
    function script_init() {
        var flagStatus = false;
        window.renderMenu.addTab({
            id: "script",
            text: "  Script"
        });

        var sample = "$('body').keypress(\n  function(e){\n  if (e.keyCode==113){\n//if key 'q' \n console.debug(e.keyCode)\n  //tape your code here \n } \n});";

        var script = GUI.script({
            id: "scriptArea",
            parent: window.renderMenu.script,
            content: sample
        });

        window.renderMenu.script.append("<br><hr></br>");

        script.object.setSize("100%", "93%");
        window.renderMenu.refresh();

        var play;
        var stop;
        var clear;
        var help;
        var save;
        var load;

        GUI.image(window.renderMenu.script.title, "img-script", "../gui/images/script.png", 20, 14, "before");
        play = GUI.button("Play", window.renderMenu.script, function () {
            window.runStatus();
            window.interprate();
            script.parent.on('keyup', function () {
                window.interprate();
            })
            play.addClass("disablehide");
            stop.removeClass("disablehide");
            clear.addClass("disablehide");
            flagStatus = true;
            if (CONSOLE.flagError) {
                CONSOLE.flagError = false;
                window.errorStatus();
            }
        });
        play.html('');
        GUI.addIcon(play, "ui-icon-play", "", "before");
        GUI.addTooltip({
            parent: play,
            content: "Run script"
        });
        stop = GUI.button("Stop", window.renderMenu.script, function () {
            script.parent.off();
            play.removeClass("disablehide");
            stop.addClass("disablehide");
            clear.removeClass("disablehide");
            flagStatus = false;
            window.readyStatus();
        });
        stop.addClass("disablehide");
        stop.html('');
        GUI.addIcon(stop, "ui-icon-stop", "", "before");
        GUI.addTooltip({
            parent: stop,
            content: "Stop script"
        });
        clear = GUI.button("Clear", window.renderMenu.script, function () {
            script.parent.off();
            script.object.setValue(sample);
            script.object.clearHistory();
            window.readyStatus();
            flagStatus = false;
        });
        clear.html('');
        GUI.addIcon(clear, "ui-icon-trash", "", "before");
        GUI.addTooltip({
            parent: clear,
            content: "Clear script"
        });
        help = GUI.button("Help", window.renderMenu.script, function () {
            var html = "<dl><dt>Ctrl-F / Cmd-F</dt><dd>Start searching</dd><dt>Ctrl-G / Cmd-G</dt><dd>Find next</dd><dt>Shift-Ctrl-G / Shift-Cmd-G</dt><dd>Find previous</dd><dt>Shift-Ctrl-F / Cmd-Option-F</dt><dd>Replace</dd> <dt>Shift-Ctrl-R / Shift-Cmd-Option-F</dt><dd>Replace all</dd><dt>Ctrl-Space / Cmd-Space</dt><dd>Auto-complete</dd></dl>"
            GUI.notification({
                title: "Script hotkeys",
                text: html,
                type: "notice"
            })
        });
        help.html('');
        help.prop('id', "helpScript");
        GUI.addIcon(help, "ui-icon-note", "", "before");
        GUI.addTooltip({
            parent: help,
            content: "Hotkeys"
        });

        save = GUI.button("Save", window.renderMenu.script, function () {

        })
        save.html('');
        save.prop('id', "saveScript");
        GUI.addIcon(save, "ui-icon-disk", "", "before");
        GUI.addTooltip({
            parent: save,
            content: "Save current script"
        });

        var loadInput = GUI.input({
            id: "loadScript",
            parent: window.renderMenu.script,
            hide: true,
            extension: "application/javascript",
            mode: "readText",
            callback: function (FILE) {
                script.object.setValue(FILE.target.result);
                GUI.notification({
                    text: "Script loaded",
                    time: "5000",
                    type: "notice"
                });
            }
        });
        load = GUI.button("Load", window.renderMenu.script, function () {
            loadInput.click();
            script.refresh();
        });
        load.html('');
        GUI.addIcon(load, "ui-icon-folder-open", "", "before");
        GUI.addTooltip({
            parent: load,
            content: "Load script"
        });

        var runStatus = GUI.image(window.renderMenu.script, "traffic-light", "../gui/images/traffic-cone_blue.png", '20', '20');
        GUI.addTooltip({
            parent: runStatus,
            content: "Ready to run"
        })


        window.interprate = function () {
            //$('body').unbind();
            // $(document).unbind();
            window.runStatus();
            $('#scriptElement').remove();
            $('#scriptElement').empty();
            $('#scriptElement').html('');
            var js = script.object.getValue();
            var variable = document.createElement('script');
            variable.id = 'scriptElement';
            variable.textContent = js;
            document.body.appendChild(variable);
            if (CONSOLE.flagError) {
                CONSOLE.flagError = false;
                window.errorStatus();
            }
        }

        window.readyStatus = function () {
            runStatus.remove();
            runStatus = GUI.image(window.renderMenu.script, "traffic-light", "../gui/images/traffic-cone_blue.png", '20', '20');
            GUI.addTooltip({
                parent: runStatus,
                content: "Ready to run"
            })
        }

        window.errorStatus = function () {
            runStatus.remove();
            runStatus = GUI.image(window.renderMenu.script, "traffic-light", "../gui/images/traffic-cone_red.png", '20', '20');
            GUI.addTooltip({
                parent: runStatus,
                content: "Error detected into the script, please consult the console"
            });
        }

        window.runStatus = function () {
            runStatus.remove();
            runStatus = GUI.image(window.renderMenu.script, "traffic-light", "../gui/images/traffic-cone_green.png", '20', '20');
            GUI.addTooltip({
                parent: runStatus,
                content: "Running..."
            });
        }
    }
    return script_init;
});