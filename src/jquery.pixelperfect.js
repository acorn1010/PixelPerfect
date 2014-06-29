/**
The MIT License (MIT)

Copyright (c) 2014 Alexandria Cornwall

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

// Our namespace
var CodePeg = CodePeg || {};

(function ($) {
    "use strict";

    // Private methods
    
    /**
     * Scales an image using the nearest neighbor algorithm.
     * @param  {Array} srcData A packed array containing pixels in the source
     *                  image. From left to right, top to bottom, pixels are
     *                  stored as R, G, B, A. So to access the red channel at
     *                  (x, y) it would be srcData[(sw * y + x) << 2]
     * @param  {Integer} sw      The width in pixels of srcData's image
     * @param  {Integer} sh      The height in pixels of srcData's image
     * @param  {Array} dstData Same as srcData, but for the destination
     * @param  {Integer} dw      Same as sw, but for the destination
     * @param  {Integer} dh      Same as sh, but for the destination
     * @return {None}
     */
    function scaleNearestNeighbor(srcData, sw, sh, dstData, dw, dh) {
        // For each row in new image
        for (var y = dh - 1; y >= 0; --y) {
            // For each column in new image
            for (var x = dw - 1; x >= 0; --x) {
                var ox = ~~(sw * x / (dw - 1)), 
                    oy = ~~(sh * y / (dh - 1)),
                    dstIndex, srcIndex;
                if (ox >= sw) {
                    ox = sw - 1;
                }
                if (oy >= sh) {
                    oy = sh - 1;
                }
                dstIndex = ((dw * y + x) << 2) - 1;
                srcIndex = ((sw * oy + ox) << 2) - 1;
                dstData[++dstIndex] = srcData[++srcIndex];
                dstData[++dstIndex] = srcData[++srcIndex];
                dstData[++dstIndex] = srcData[++srcIndex];
                dstData[++dstIndex] = srcData[++srcIndex];
            }
        }
    }

    /**
     * Performs initial setup, destruction, and calling of an image filter.
     * @param  {[type]} dstCanvas [description]
     * @param  {[type]} img       [description]
     * @param  {[type]} scaleX    [description]
     * @param  {[type]} scaleY    [description]
     * @param  {[type]} closure   [description]
     * @return {[type]}           [description]
     */
    function doFilter(dstCanvas, img, scaleX, scaleY, closure) {
        var srcCanvas = document.createElement('canvas');
        srcCanvas.width = img.width;
        srcCanvas.height = img.height;
        var srcContext = srcCanvas.getContext('2d');
        srcContext.drawImage(img, 0, 0);
        var srcData = srcContext.getImageData(0, 0, img.width, img.height).data;
        var ow = img.width, // original width / height
            oh = img.height,
            sw = ow * scaleX, // scaled width / height
            sh = oh * scaleY;

        // Scale our destination canvas
        if (scaleX <= 0) {
            sw = dstCanvas.width;
        } else {
            dstCanvas.width = sw;
        }
        if (scaleY <= 0) {
            sh = dstCanvas.height;
        } else {
            dstCanvas.height = sh;
        }

        var dstContext = dstCanvas.getContext('2d'),
            dstImageData = dstContext.createImageData(sw, sh),
            dstData = dstImageData.data;

        closure(srcData, ow, oh, dstData, sw, sh);

        dstContext.putImageData(dstImageData, 0, 0);
    }

    /**
     * Constructs a CodePeg.PixelPerfect object.
     * 
     * @param {Object} element The element or selector to attach to
     * @param {Object} options A dictionary of options that we will use
     */
    CodePeg.PixelPerfect = function(element, options) {
        // The selector that we're attaching to
        this.attach(element);

        // Set up our options
        this.setOptions(options);

        // Init
        this.init();
    };

    CodePeg.PixelPerfect.prototype = {

        /**
         * All events used by CodePeg.PixelPerfect.  This is a list of available
         * events that can be registered on a PixelPerfect object.
         *
         * Events can be registered like so, where object is a PixelPerfect object:
         * object.on("eventName", closure);
         * 
         * @type {Array}
         */
        events: [],

        /**
         * The default options.
         * @type {Object}
         */
        defaultOptions: {
            urlTag: 'url', // The name of the data tag for the url
            scaleTag: 'scale', // The data tag for the image's scale factor
            filter: 'nearestneighbor', // The image scaling filter to apply. string or function
        },

        init: function() {
            this.scale();
        },

        /**
         * Attaches CodePeg.PixelPerfect to an element
         * 
         * @param  {Object} element The element or selector to attach to
         * @return void
         */
        attach: function(element) {
            this.detach();
            this.element = element;
            if (!(this.element && (this.element instanceof jQuery))) {
                throw new Error("Invalid PixelPerfect element.  For now, only jQuery objects are supported.");
            }
            if (this.element.PixelPerfect) {
                throw new Error("PixelPerfect already attached.");
            }
            this.element.PixelPerfect = true;
        },

        /**
         * Detaches from an element if possible.
         * 
         * @return {Object|null} Returns the object that was detached, else null
         */
        detach: function() {
            var result = null;

            if (this.element) {
                result = this.element;
                delete this.element;
            }

            return result;
        },

        /**
         * Sets up the options by combining the default options, user-supplied
         * options, and element options.
         * 
         * @param {Object} options A dictionary of options that we will use
         */
        setOptions: function(options) {
            var elementOptions;

            this.element.verify = this;
            this.options = $.extend({}, this.defaultOptions, options !== null ? options : {});

            // This must be extended separately because getElementOptions needs
            // to know about any additional selectors
            elementOptions = this.getElementOptions(this.element);
            this.options = $.extend(true, this.options, elementOptions);

            // Perform checks on options that must be included
        },

        /**
         * Retrieves all options contained in the actual DOM element, such as
         * inputs.
         * @param  {Object} element The element to retrieve options from
         * @return {Object}         A dictionary of options that can be combined
         *                          with this.options
         */
        getElementOptions: function(element) {
            var result = {};

            return result;
        },

        /**
         * scales the images in our canvas
         * @return {[type]} [description]
         */
        scale: function() {
            var that = this,
                options = this.options;
            this.element.each(function() {
                var $this = $(this),
                    canvas = this,
                    url = $this.data(options.urlTag),
                    scaleX = -1,
                    scaleY = -1,
                    img = new Image(),
                    closure;
                if ($this.data(options.scaleTag)) {
                    scaleX = scaleY = $this.data(options.scaleTag);
                } else {
                    // w and h are determined by canvas width / height
                }

                img.src = url;
                img.onload = function() {
                    if (typeof options.filter == 'function') {
                        options.filter(canvas, this, scaleX, scaleY);
                    } else {
                        // TODO: Clean up our filter implementation
                        switch (options.filter) {
                            case 'nearestneighbor':
                                closure = scaleNearestNeighbor;
                                break;
                            default:
                                closure = scaleNearestNeighbor;
                                break;
                        }
                        doFilter(canvas, this, scaleX, scaleY, closure);
                    }
                };
            });
        }
    };

    // Restore the constructor
    Object.defineProperty(CodePeg.PixelPerfect.prototype, "constructor", {
        enumerable: false,
        value: CodePeg.PixelPerfect
    });
})(jQuery);
