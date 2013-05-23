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

if (window.$ === undefined) {
	//themes - start, base, black-tie, blitzer, cupertino, dark-hive, dot-luv, eggplant, excite-bike, flick, hot-sneaks, humanity
	//  le-frog, mint-choc, overcast, pepper-grinder, redmond, smoothness, south-street, sunny, swanky-purse, trontastic
	//  ui-darkness, ui-lightness, vader
    document.write('<link rel="stylesheet" href="http://ajax.googleapis.com/ajax/libs/jqueryui/1.9.2/themes/vader/jquery-ui.css" />');
    document.write('<script src="//ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js"><\/' + 'script>');
    document.write('<script src="//ajax.googleapis.com/ajax/libs/jqueryui/1.9.2/jquery-ui.min.js"><\/' + 'script>');
    document.write('<script src="//layout.jquery-dev.net/lib/js/jquery.layout-latest.min.js"><\/' + 'script>');

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
    var root = this;
    // The top-level namespace. All public GUI classes and modules will
    // be attached to this. Exported for both CommonJS and the browser.
    var GUI;
    if (typeof exports !== 'undefined') GUI = exports;
    else { GUI = root.GUI = {}; };
    // Current version of the library. Keep in sync with `package.json`.
    GUI.VERSION = '0.0.1';

    GUI.button = function (_txt, _parent, _x1, _y1, _x2, _y2) {
        var $button = $('<button></button>');
        $button.button().click(function (event) {
            event.preventDefault();
        });
        // create unique ID
        $button.button().uniqueId();
        var id=$button.attr('id');
        if (_txt !== undefined && _txt !== null)
        	$button.button({ label: _txt });
        if (_x1 !== undefined && _y1 !== undefined) {    	
        	$button.css('position','absolute');
    		$button.css('left',_x1);
    		$button.css('top',_y1);
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
        return $button[0];
    };
    GUI.label = function(_txt, _parent) {
    	var $label = $('<p class="ui-tabs ui-tabs-panel ui-widget-content">'+_txt+'</p>');
    	//$label.button().uniqueId();
		if (!_parent)
			$('body').append($label);
		else 
			$(_parent).append($label);
        return $label[0];
    };
    GUI.canvas = function(_parent) {
    	$canvas = $('<canvas style="padding: 0; margin: 0;" class="ui-tabs ui-tabs-panel ui-widget-content" id="canvas"></canvas>');
    	//$canvas.button().uniqueId();
    	if (!_parent)
			$('body').append($canvas);
		else {
			var $parent=$(_parent);
			//$parent=$(_parent);
			$parent.append($canvas);
			//$canvas.height($parent.children('div').height());
	        //$canvas.width($parent.children('div').width());
		}
/*
		$canvas.bind('resize', function(event) {
    		if (!$(event.target).hasClass('ui-resizable')) {
	        	$(this).height($(this).parent().height());
	        	$(this).width($(this).parent().width());
    		}
    	});
*/
        return $canvas[0];
    };
    GUI.window = function(_txt, _$parent, _float) {

    	// TODO - rename fragment-1 to something more useful
    	var code=
    		'<ul class="ui-tabs-nav ui-helper-reset ui-helper-clearfix ui-widget-header ui-corner-all ui-sortable" >'+
    		'<li class="ui-state-default ui-corner-top ui-tabs-active ui-state-active" >'+
    		'<a href="#fragment-1" class="ui-tabs-anchor" ><span>'+_txt+'</span></a></li></ul>'+
    		'<div class="ui-layout-content ui-widget-content" >'+
    		'<div id="fragment-1"> </div></div>'
    	var $window;

    	
    	if (_float)
    	  $window.resizable({helper: "ui-resizable-helper"})
    	  		 .draggable();
    	if (!_$parent || _float)
    	{
    		code = '<div class="ui-tabs ui-widget">'+code+'</div>';

    	    $window = $(code);
    		$window.tabs();
			$('body').append($window);
		}
		else {
			$window = $(code);
			_$parent.append($window);
    		_$parent.tabs()
	    	   // allow tabs to be moved left/right
	    	   .find(".ui-tabs-nav").sortable({ axis: 'x', zIndex: 2 });
			//$window.height(_$parent.height());
			//$window.width(_$parent.width());
		}
		
    	$window.uniqueId();
		var id=$window.attr('id');

        return $window[0];
    };
    GUI.layout = function (){
    	var that=this;
    	var $layout = $(
    		'<div class="ui-layout-north ui-widget-header" >GUI test</div>'+
			'<div class="ui-layout-west ui-widget-content ui-corner-all ui-layout-pane ui-layout-pane-west"></div>'+
			'<div class="ui-layout-center ui-widget-content"></div>'+
			'<div class="ui-layout-south ui-widget-header">&copy; R&eacute;mi Arnaud - Advanced Micro Devices, Inc. 2013</div>'+
			'<div class="ui-layout-resizer ui-layout-resizer-west ui-layout-resizer-open ui-layout-resizer-west-open" ></div>');
    	$('body').append($layout);

        // CREATE THE LAYOUT
        myLayout = $('body').layout();

        /*
        {
            resizeWhileDragging: true,
            sizable: false,
            animatePaneSizing: true,
            fxSpeed: 'slow',
            spacing_open: 0,
            spacing_closed: 0,
            togglerLength_open: 0,		// HIDE the toggler button
			togglerLength_closed: -1,
			closable: false,
            west: {
            	size: "70%",
            	spacing_closed: 8,
            	spacing_open: 8,
            	onresize: GUI.resize,
            	resizerCursor:"move",
            },	
            center: {
            	onresize: GUI.resize,
            },
        });
*/

        myLayout.options.west.minSize='10%';
        myLayout.options.west.maxSize='90%';


        return myLayout;
    };
    // does not work without this
    GUI.resize = function(pane, $pane, paneState, paneOptions){ 
    	//$pane.children(0).resize();
    };

}).call(this);

