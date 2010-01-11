(function($) {

  var extend = function(target,source){
    for (var i in source){
      target[i] = source[i];
    }
    return target;
  };

  var parse = function(str){
    var capture = /^(\d+(?:\.\d+)?)px$/.exec(str);
    return parseFloat(capture);
  };

  var puts = window.console.log;

  var error = function(msg){
    var myMsg = ("ERROR! " + msg);
    if (window.console) {
      window.console.log(myMsg);
    } else {
      alert(myMsg);
    }
    return false;
  };

  var ListLike = {
    last: function(){
      return this.length == 0 ? false : this[this.length - 1];
    }
  };

  var PointLike = {
    equals: function(point){
      return this[0] == point[0] && this[1] == point[1];
    },
    inspect: function(){ return "["+this[0]+"]["+this[1]+"]"; }
  };

  var getNormalizer = function(mouseEvent){
    var el = $(mouseEvent.target);
    var offset = [0,0];
    var done = false;
    var nextEl;
    do{
      done = ((nextEl = el.parent()).length == 0 || (/^__absolute__/).exec(el.attr('id')) );
      var topOffset =  -1 * (parse(el.css('top')));
      var leftOffset = -1 * (parse(el.css('left')));
      offset[0] += leftOffset;
      offset[1] += topOffset;
      // puts("changing normalizer with: ["+leftOffset+']['+topOffset+'] new vector: ['+offset[0]+']['+offset[1]+']');
      el = nextEl;
    } while (! done);
    if (el.length == 0) return false;
    return offset;
  };

  /** @constructor */
  var BlitMap = function(){
    this.matrix = [];
  };
  BlitMap.prototype = {
    set: function(x,y,value){
      if (!this.matrix[y]) this.matrix[y] = [];
      this.matrix[y][x] = value;
    }
  };

  var AsciiArcCanvas = {};
  AsciiArcCanvas.prototype = {
    initAsciiArcCanvas: function(options){
      this.options = options;
      this.matrix = [];
      this.linesCache = [];
      this.snapX = options.grid[0];
      this.snapY = options.grid[1];
    },
    startArc: function(point){
      var myPoint = this._normalize(point);
      puts("startArc at "+myPoint.inspect());
      this.points = extend([myPoint],ListLike);
      myPoint.vector = new Vegdor(myPoint, myPoint);
      myPoint.glyph = myPoint.vector.asciiArrowGlyph();
      var bm = new BlitMap();
      bm.set(myPoint[0], myPoint[1], myPoint.glyph);
      this._blit(bm);
    },
    extendArc: function(point){
      var myPoint, prevLineGlyph, prevPoint, blitMap, newPrevGlyph;
      prevPoint = this.points.last();
      myPoint = this._normalize(point);
      if (prevPoint.equals(myPoint)) return;
      puts("extending arc to "+myPoint.inspect());

      blitMap = new BlitMap();
      myPoint.vector = new Vegdor(prevPoint, myPoint);
      myPoint.glyph = myPoint.vector.asciiArrowGlyph();

      //prevPoint.vector.changePointB(myPoint);
      prevPoint.vector.changePoints(prevPoint, myPoint);
      newPrevGlyph = prevPoint.vector.asciiLineGlyph();

      if (prevPoint.glyph != newPrevGlyph) {
        prevPoint.glyph = newPrevGlyph;
        blitMap.set(prevPoint[0],prevPoint[1],newPrevGlyph);
      }
      if (myPoint.vector.magnitude() > 1) {
        //this.blitInterceding(blitMap,myPoint);
      }
      blitMap.set(myPoint[0], myPoint[1], myPoint.glyph);
      this.points.push(myPoint);
      this._blit(blitMap);
    },
    _blit: function(blitMap){
      while (this.matrix.length < blitMap.matrix.length) {
        this.linesCache[this.matrix.length] = '';
        this.matrix.push([]);
      }
      for (var i = 0; i < blitMap.matrix.length; i++) {
        if (!blitMap.matrix[i]) continue;
        while (this.matrix[i].length < blitMap.matrix[i].length) {
          this.matrix[i].push(' ');
        }
        for (var j = 0; j < blitMap.matrix[i].length; j++){
          if (!blitMap.matrix[i][j]) continue;
          this.matrix[i][j] = blitMap.matrix[i][j];
        }
        this.linesCache[i] = this.matrix[i].join('');
      }
      this.html(this.linesCache.join("\n"));
    },
    _normalize: function(point){
      var myPoint = [Math.floor(point[0] / this.snapX), Math.floor(point[1] / this.snapY)];
      return extend(myPoint,PointLike);
    }
  };

  /** @constructor */
  var Arcs = function(canvas,options){
    this.canvas = $(canvas);
    this.options = options;
    this.arcs = [];
  };
  Arcs.prototype = {
    size: function(){ return this.arcs.length; },
    newAsciiArcCanvas: function(){
      if (!this.options.grid) return error("must have grid for now");
      var id = this.canvas.parent().attr('id')+'-arc'+(this.arcs.length+1);
      var newCanvas = $('<div></div>').addClass('arc-canvas').attr('id',id);
      this.canvas.parent().append(newCanvas);
      puts("appended a new ArcCanvas to Canvas"); window.Canvas = this.canvas; window.ArcCanvas = newCanvas;
      extend(newCanvas, AsciiArcCanvas.prototype);
      newCanvas.initAsciiArcCanvas(this.options);
      return newCanvas;
    },
    last: function(){
      return (this.arcs.length == 0) ? false : this.arcs[this.arcs.length-1];
    },
    push: function(newArc){
      this.arcs.push(newArc);
    }
  };

  var STILL      = 'STILL';
  var NORTH      = 'NORTH';
  var EAST       = 'EAST';
  var SOUTH      = 'SOUTH';
  var WEST       = 'WEST';
  var NORTH_EAST = 'NORTH_EAST';
  var SOUTH_EAST = 'SOUTH_EAST';
  var SOUTH_WEST = 'SOUTH_WEST';
  var NORTH_WEST = 'NORTH_WEST';

  /** @constructor */
  var Vegdor = function(pointA, pointB){
    this.pointA = pointA;
    this.pointB = pointB;
  };
  window.Vector = Vegdor;
  Vegdor.prototype = {

    asciiLineGlyphs : {
      STILL     : '+',
      NORTH     : '|',
      EAST      : '-',
      SOUTH     : '|',
      WEST      : '-',
      NORTH_EAST: '/',
      SOUTH_EAST: '\\',
      SOUTH_WEST: '/',
      NORTH_WEST: '\\'
    },
    asciiArrowGlyphs: {
      STILL     : '*',
      NORTH     : '^',
      EAST      : '>',
      SOUTH     : 'v',
      WEST      : '<',
      NORTH_EAST: '7',
      SOUTH_EAST: '>',
      SOUTH_WEST: 'L',
      NORTH_WEST: '<'
    },
    slope: function(){
      if (!this._slope){
        this._slope = (this.pointB[1] - this.pointA[1]) / (this.pointB[0] - this.pointA[0]);
      }
      return this._slope;
    },
    magnitude: function(){
      if (!this._magnitude){
        this._magnitude =
          Math.sqrt( Math.pow(this.pointB[0] - this.pointA[0], 2) + Math.pow(this.pointB[1] - this.pointA[1], 2));
      }
      return this._magnitude;
    },
    cardinal: function(){
      var absSlope = Math.abs(this.slope());
      if (!this._cardinal) {
        if (isNaN(absSlope)) {
          this._cardinal = STILL;
        } else if (absSlope<1){
          this._cardinal =  this.pointA[0] < this.pointB[0] ? EAST : WEST;
        } else if (absSlope>1) {
          this._cardinal = this.pointA[1] < this.pointB[1] ? SOUTH : NORTH; // flipped! lower y values are higher
        } else if (this.pointA[0] < this.pointB[0]) {
          this._cardinal = this.pointA[1] < this.pointB[1] ? SOUTH_EAST : NORTH_EAST;
        } else {
          this._cardinal = this.pointA[1] < this.pointB[1] ?  SOUTH_WEST : NORTH_WEST;
        }
      }
      return this._cardinal;
    },
    asciiLineGlyph: function(){
      return this.asciiLineGlyphs[this.cardinal()];
    },
    asciiArrowGlyph: function(){
      return this.asciiArrowGlyphs[this.cardinal()];
    },
    changePointB: function(point){
      this.pointB = point;
      this.clearCache();
    },
    changePoints: function(pointA, pointB){
      this.point = pointA; this.pointB = pointB;
      this.clearCache();
    },
    clearCache: function(){
      this._cardinal = null;
      this._magnitude = null;
      this._slope = null;
    }
  };

  /** @constructor */
  var Arc = function(controller,mouseEvent){
    this.controller = controller;
    this.points = extend([],ListLike);
    this.startsAt(mouseEvent);
  };
  Arc.prototype = {
    startsAt: function(mouseEvent){
      var normPoint;
      this.normalizer = getNormalizer(mouseEvent);
      normPoint = this.normalize(mouseEvent);
      this.myCanvas = this.controller.arcs.newAsciiArcCanvas();
      this.controller.arcs.push(this); // wasn't sure where this belonged
      this.myCanvas.startArc(normPoint);
      this.points.push(normPoint);
    },
    moveTo: function(mouseEvent){
      var normPoint = this.normalize(mouseEvent);
      var lastPoint = this.points.last();
      if (normPoint[0] == lastPoint[0] && normPoint[1] == lastPoint[1]){
        // puts("We are skipping NormPoint!");
        return;
      } else {
        this.myCanvas.extendArc(normPoint);
        this.points.push(normPoint);
      }
    },
    normalize: function(mouseEvent){
      var point, s1;
      point = [
        mouseEvent.pageX + this.normalizer[0],
        mouseEvent.pageY + this.normalizer[1]
      ];
      //s1 = "mouse event at normalized point "+point[0]+" "+point[1];
      point[0] -= (point[0] % this.controller.options.grid[0]);
      point[1] -= (point[1] % this.controller.options.grid[1]);
      //puts(s1+" snapped to ["+point[0]+"]["+point[1]+"]");
      return point;
    }
  };
  Arc.factory = function(controller,event){
    return new Arc(controller,event);
  };


  $.widget("ui.arrows", $.extend({}, $.ui.mouse, {

    _init: function() {
      self = this;
      this._mouseInit();
      self.arcs = new Arcs(this.element, this.options);
    },
    _mouseCapture: function(event) {
      puts("got mouse event Ev"); window.Ev = event;
      return !! Arc.factory(this,event);
    },
    _mouseMove: function(event){
      var lastArc = this.arcs.last();
      if (lastArc){
        lastArc.moveTo(event);
      }
    }
  }));

})(window.jQuery);
