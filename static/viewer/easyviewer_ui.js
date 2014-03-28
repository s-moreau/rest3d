define(['viewer', 'rest3d', 'collada', 'gltf', 'channel', 'colorpicker'],
  function (viewer, rest3d, COLLADA, glTF, Channel) {

    viewer.easyINIT = function () {

      var $canvas;

      if (!window.performance || !window.performance.now) {
        window.performance = window.performance || {};
        window.performance.now = $.now
      };

      function args() {
        // This function is anonymous, is executed immediately and 
        // the return value is assigned to QueryString!
        var query_string = {};
        var query = window.location.search.substring(1);
        var vars = query.split("&");
        for (var i = 0; i < vars.length; i++) {
          var pair = vars[i].split("=");
          // If first entry with this name
          if (typeof query_string[pair[0]] === "undefined") {
            query_string[pair[0]] = pair[1];
            // If second entry with this name
          } else if (typeof query_string[pair[0]] === "string") {
            var arr = [query_string[pair[0]], pair[1]];
            query_string[pair[0]] = arr;
            // If third or later entry with this name
          } else {
            query_string[pair[0]].push(pair[1]);
          }
        }
        return query_string;
      };
      var $background = $('<div style="position: absolute; top: 0px; bottom: 0px; right:0px; left:0px; height: 100%; width:100%; background-color: white;">');
      $('body').append($background);
      $canvas = $('<canvas id="tmp" class="ui-resize-me" style="position: absolute; top: 0px; bottom: 0px; right:0px; margins: 0px;height: 100%; width:100%; " ></canvas>');
      $background.append($canvas);
      // initialize webGL
      viewer.channel = Channel.create($canvas[0]);

      initCanvasUI();

      function initCanvasUI() {
        var mouseDown = false;
        var lastX, lastY = 0;
        // attach mouse events to canvas

        function mouseDownHandler(ev) {
          mouseDown = true;
          lastX = ev.screenX;
          lastY = ev.screenY;
          return true;
        }

        function mouseMoveHandler(ev) {
          if (!mouseDown) return false;

          viewer.currentZoom = 1;
          var mdelta = ev.screenX - lastX;
          lastX = ev.screenX;
          viewer.currentRotationX -= mdelta / 2.5;


          var mdelta = ev.screenY - lastY;
          lastY = ev.screenY;
          viewer.currentRotationY -= mdelta / 2.5;


          viewer.draw();
          return true;
        }

        function mouseUpHandler(ev) {
          mouseDown = false;
        }

        function mouseWheelHandler(ev) {

          var mdelta = ev.wheelDelta;
          viewer.currentZoom = Math.exp(mdelta / 2500);

          viewer.draw();
          return true;
        }

        $canvas[0].removeEventListener("mousedown", mouseDownHandler, false);
        $canvas[0].removeEventListener("mousemove", mouseMoveHandler, false);
        $canvas[0].removeEventListener("mouseup", mouseUpHandler, false);
        $canvas[0].removeEventListener("mousewheel", mouseWheelHandler, false);
        $canvas[0].addEventListener("mousedown", mouseDownHandler, false);
        $canvas[0].addEventListener("mousemove", mouseMoveHandler, false);
        $canvas[0].addEventListener("mouseup", mouseUpHandler, false);
        $canvas[0].addEventListener("mousewheel", mouseWheelHandler, false);
        // redraw on resize

        $($canvas).resize(function (evt) {
          viewer.draw();
        });
      };


      var arg = args();
      if (arg.file) {
        var file=decodeURIComponent(arg.file);
        var ext = file.match(/\.[^.]+$/);
        console.log('ext='+ext);
        if (ext == ".json") {
          glTF.load(file, viewer.parse_gltf);
        } else if (ext == ".dae") {
          COLLADA.load(file, viewer.parse_dae)
        } else {
          console.log(file+" couldn't be loaded. Please make sure the file specified is a dae or json model");
        }
      } else {
        console.log("any file specified in url for loading");
      }

      if (arg.background) {
        var hex = arg.background;
        console.log('setting background to '+hex);
        $('#colorSelector div').css('backgroundColor', '#' + hex);
        $background.css('backgroundColor', '#' + hex);
      }

      var htmlFps = '<div class="yasuo" style="z-index: 999 !important; position:absolute; right:0;"><a id="fps" style="float:right;" >? FPS</a></div>';
      $("body").append(htmlFps);

      viewer.fpsCounter = new viewer.FPSCounter();
      viewer.flagTick = true;
      viewer.fpsCounter.createElement(document.getElementById("fps"));
      viewer.fpsCounter.run();
      viewer.tick();

      $("body").append('<div id="colorSelector"  style="z-index:9999!important; right:38px !important; bottom:35px !important;"><div style="background-color: #0000ff"></div></div>');
      var tmpPicker;
      var flagColorPicker = "show";
      $('#colorSelector div').css('backgroundColor', '#ffffff');
      $('#colorSelector').ColorPicker({
        color: '#ffffff',
        onShow: function (colpkr) {
          $(".colorpicker").css("margin-left", "35px");
          if (flagColorPicker == 'show') {
            $(colpkr).fadeIn(500);
          }
          tmpPicker = $(colpkr);
          flagColorPicker = "hide";
          return false;
        },
        onHide: function (colpkr) {
          if (flagColorPicker == 'hide') {
            $(colpkr).fadeOut(500);
          }
          tmpPicker = $(colpkr);
          flagColorPicker = "show";
          return false;
        },
        onSubmit: function (hsb, hex, rgb) {
          $('#colorSelector div').css('backgroundColor', '#' + hex);
          $background.css('backgroundColor', '#' + hex);
          tmpPicker.fadeOut(500);
        }
      });

      $('#colorSelector').css({
        'right': '100px !important'
      })
    };

    return viewer;
  });