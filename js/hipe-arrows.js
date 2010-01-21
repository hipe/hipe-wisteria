(function(x) {
  var $ = x;

  if (!$.widget)
    throw new Error("to use arrows.js you need jquery.ui.core.js!");

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

  var puts = window.console ? window.console.log : function(m){};


  var error = function(msg){
    var myMsg = ("ERROR! " + msg);
    if (window.console) {
      window.console.log(myMsg);
    } else {
      alert(myMsg);
    }
    return false;
  };


  var Erroneous = {
    clearErrors: function(){
      var self = this;
      this.lastErrorMessage = null;
    },
    error: function(msg){
      var self = this;
      if (msg) {
        self.lastErrorMessage = msg;
        return false;
      } else {
        return this.lastErrorMessage;
      }
    }
  };

  var ListLike = {
    is_list_like: true,
    last: function(){
      return this.length == 0 ? false : this[this.length - 1];
    },
    penultimate: function(){
      return this.length >= 2 ? this[this.length - 2] : false;
    }
  };

  var ObjectExtras = {
    keys: function(){
      var ret = [];
      for(var i in self){
        ret.push(i);
      }
      return ret;
    }
  };

  var PointLike = {
    is_pt: true,
    equals: function(point){
      return this[0] == point[0] && this[1] == point[1];
    },
    inspect: function(){ return "["+this[0]+"]["+this[1]+"]"; },
    hashKey: function(){ return this.inspect(); },
    pointCopy: function(){
      return new Point(this[0], this[1]);
    }
  };

  /** @constructor */
  var Point = function(x,y){
    var arr = [x,y];
    extend(arr, PointLike);
    return arr;
  };
  //Point.prototype = PointLike;

  var getNormalizingPoint = function(mouseEvent){
    var el = $(mouseEvent.target);
    var offset = [0,0];
    var done = false;
    var nextEl;
    do{
      done = ((nextEl = el.parent()).length == 0 ||
        (/^__absolute__/).exec(el.attr('id')) );
      var topOffset =  -1 * (parse(el.css('top')));
      var leftOffset = -1 * (parse(el.css('left')));
      offset[0] += leftOffset;
      offset[1] += topOffset;
      // puts("changing normalizer with: ["+leftOffset+']['+topOffset+']'+
      //' new vector: ['+offset[0]+']['+offset[1]+']');
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

  /**
  * adapted from _AI for Game Developers_, Bourg & Seeman,
  * O'Reilly, 2004.  page 14.
  * modified origininal, which didn't handle the simple
  * base cases of going straight up or down, or straight left
  * or right.
  */
  var BresenhamAlgorithm = {
    /**
    * @return a ListLike array of points or (false and set error)
    *
    * whether or not we use references to or new copies of the
    * start and endpoints of the vector is undefined! (in flux)
    *
    * @internal{
    *   we reduce the code in half by letting 'a' and 'b' point to
    *   either 'x' and 'y' or 'y' and 'x' based on which abs delta is longer
    * }
    */
    pointsInVector: function(vector){
      var result, endPoint, delta, step, absDelta, fraction, nextPoint, done;
      var a,b;
      if (vector.magnitude() <= 1) return this.error(
        "Won't calculate interceding points for short vectors,"+
        "even though it might be ok"
      );
      result = [vector.pointA];
      endPoint = vector.pointB;
      delta = vector.pointDelta();
      step = [
        delta[0] == 0 ? 0 : (delta[0] < 0 ? -1 : 1 ),
        delta[1] == 0 ? 0 : (delta[1] < 0 ? -1 : 1 )
      ];
      absDelta = [Math.abs(delta[0]), Math.abs(delta[1])];
      if (absDelta[0] > absDelta[1]) {a=0; b=1;} else {a=1; b=0;}
      fraction = absDelta[a] * 2 - absDelta[b];
      nextPoint = vector.pointA.pointCopy();
      done = nextPoint.equals(endPoint);
      var insane = 0; sanity = 100;
      while (!done) {
        if (insane++ > sanity)
          return this.error("exceded sanity limit of "+sanity);
        if (fraction >= 0) {
          nextPoint[b] += step[b];
          fraction -= delta[a];
        }
        nextPoint[a] += step[a];
        fraction += delta[b];
        if (nextPoint[a] == endPoint[a]){
          done = true;
          // next point can be off the map at this point
          result.push(endPoint);
        } else {
          result.push(nextPoint);
          nextPoint = nextPoint.pointCopy();
        }
      }
      extend(result, ListLike);
      return result;
    }
  };
  extend(BresenhamAlgorithm, Erroneous);


  /**
  * we use point history and points history to detect
  * when an arc has crossed over itself, and to draw rectangles
  * from it.  it tracks when crossovers happen, and the outer bounds
  * of the shape.
  */
  var PointHistory = function(firstPoint){
    return extend( extend([firstPoint], ListLike), _PointHistory );
  };
  var _PointHistory = {
    addPoint: function(point){
      this.push(point);
    },
    depth: function(){
      return this.length;
    }
  };
  var PointsHistory = function(startPoint){
    var me = extend([], _PointsHistory);
    me.keyToIndex = {};
    me._depth = 0;
    me._lastAdded = false;
    me._starboard = false;
    me._port = false;
    me._ceil = false;
    me._floor = false;
    return me;
  };
  var _PointsHistory = {
    addPoint: function(point){
      this._lastAdded = point;
      var key = point.hashKey();
      if (undefined==this.keyToIndex[key]) {
        this.push( new PointHistory(point) );
        this.keyToIndex[key] = this.length - 1;
        if(this._depth == 0)
          this._depth = 1;
        if(this._floor===false || this._floor < point[1])
          this._floor = point[1];
        if(this._ceil===false || this._ceil > point[1])
          this._ceil = point[1];
        if(this._starboard===false || this._starboard<point[0])
          this._starboard=point[0];
        if(this._port===false || this._port>point[0])
          this._port=point[0];
      } else {
        var ptHistory = this[this.keyToIndex[key]];
        ptHistory.addPoint(point);
        if (ptHistory.depth() > this._depth) {
          this._depth = ptHistory.depth();
        }
      }
    },
    depth: function(){return this._depth;},
    lastAdded: function(){return this._lastAdded;},
    minLeft: function(){return this._port;},
    maxRight: function(){return this._starboard;},
    minTop: function(){return this._ceil;},
    maxBottom: function(){return this._floor;}
  };


  var Poly = function(){
    var me = extend([], _Poly);
    if (arguments.length < 3){
      return this.error("polys need at least 3 verts");
    }
    for(var i=0; i < arguments.length; i++){
      me[i] = extend(arguments[i], PointLike);
    }
    return me;
  };
  extend(Poly,Erroneous);
  var _Poly = {
    inspect: function(){
      var a = [];
      for(var i=0; i < this.length; i++){
        a.push(this[i].inspect());
      }
      return a.join(',');
    },
    buildBlitMap: function(){
      PTS = [];
      var veg, pts, last, last2, g, g2, p1, p2;
      blitMap = new BlitMap();
      veg = new Vegdor(null,null);
      veg2 = new Vegdor(null,null);
      last = this.length - 1;
      for(var i=0; i<=last; i++){
        p1 = this[i];
        if (i==last) {
          p2 = this[0];
        } else {
          p2 = this[i+1];
        }
        puts("i iz: "+i+" is these two: "+p1.inspect()+" and "+p2.inspect());
        veg.changePoints(p1, p2);
        if(veg.magnitude()>1){
          pts = BresenhamAlgorithm.pointsInVector(veg);
          last2 = pts.length - 1;
          PTS[i] = pts;
          for(var j=1; j<last2; j++){
            veg2.changePoints(pts[j-1], pts[j]);
            g2 = veg2.asciiLineGlyphSecondary();
            blitMap.set(veg2.pointB[0], veg2.pointB[1], g2);
          }
        }
        veg.collapse();
        g = veg.asciiLineGlyphSecondary();
        puts("blitting "+g+" at "+p2.inspect());
        blitMap.set(p2[0], p2[1], g);
      }
      return blitMap;
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
      this.poly = false;
    },
    startArc: function(point){
      var myPoint = this._normalize(point);
      puts("startArc at "+myPoint.inspect());
      this.pointsHistory = new PointsHistory();
      this.pointsHistory.addPoint(myPoint);
      myPoint.vector = new Vegdor(myPoint, myPoint);
      myPoint.glyph = myPoint.vector.asciiArrowGlyph();
      var bm = new BlitMap();
      bm.set(myPoint[0], myPoint[1], myPoint.glyph);
      this._blit(bm);
    },
    stopArc: function(point){
      //var myPoint = this._normalize(point);
      //puts("stopArc at "+myPoint.inspect()+'this is Thiz'); Thiz = this;
      return this.pointsHistory;
    },
    convertToRect: function(){
      var x1, y1, x2, y2, x3, y3, x4, y4, ph;
      ph = this.pointsHistory;
      x1 = x4 = ph.minLeft();
      x2 = x3 = ph.maxRight();
      y1 = y2 = ph.minTop();
      y3 = y4 = ph.maxBottom();
      this.poly = new Poly([x1,y1],[x2,y2],[x3,y3],[x4,y4]);
      puts("i try to make rect: l:"+x1+" r:"+x3+" t:"+y1+" b:"+y3);
      puts("i made rect for you: "+this.poly.inspect());
      polyBlit = this.poly.buildBlitMap();
      this.clearCanvas();
      this._blit(polyBlit);
    },
    extendArc: function(point){
      var myPoint, prevLineGlyph, prevPoint, blitMap, newPrevGlyph;
      prevPoint = this.pointsHistory.lastAdded();
      myPoint = this._normalize(point);
      if (prevPoint.equals(myPoint)) return;
      //puts("extending arc to "+myPoint.inspect());

      blitMap = new BlitMap();
      myPoint.vector = new Vegdor(prevPoint, myPoint);
      myPoint.glyph = myPoint.vector.asciiArrowGlyph();

      prevPoint.vector.changePointB(myPoint);
      //prevPoint.vector.changePoints(prevPoint, myPoint);
      if (prevPoint.vector.cardinalIsSecondary()){
        prevPoint.vector.collapse();
      }

      newPrevGlyph = prevPoint.vector.asciiLineGlyph();

      if (prevPoint.glyph != newPrevGlyph) {
        prevPoint.glyph = newPrevGlyph;
        blitMap.set(prevPoint[0],prevPoint[1],newPrevGlyph);
      }
      if (myPoint.vector.magnitude() > 1) {
        this.blitInterceding(blitMap,myPoint);
      }
      blitMap.set(myPoint[0], myPoint[1], myPoint.glyph);
      this.pointsHistory.addPoint(myPoint);
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
    clearCanvas: function(){
      for (var i=0; i<this.matrix.length; i++) {
        this.linesCache[i] = '';
        var last = this.matrix[i].length - 1;
        for (var j=0; j<=last; j++){
          this.matrix[i][j] = ' ';
        }
      }
      this.html(this.linesCache.join("\n"));
    },

    /**
    * This is called when the last mouse move went farther in one "sample"
    * than one of our squares ("pixels"), and if we didn't do this there would
    * be breaks in the line.  Note that for now, this may be the only way
    * that we will end up with cardinal directions in points that are not
    * among the four primaries?
    *
    * use Bresenham to put interceding glyphs on the blitMap
    * @todo this won't be necessary in canvas context (?)
    *
    * @precondition: point.vector
    *
    * the resulting series of points will have the original pointA and pointB
    * at the endcaps.  make the new interceding points (0..n) each have
    * a vector pointing to the point before it and point after it.  Update
    * the two endcap vectors to be self and intermediate point,
    # (or other endcap when there are no new points.)
    * and update the 2 + (0..n) glyphs in the blitMap
    */
    blitInterceding: function(blitMap, point){
      var points =
        BresenhamAlgorithm.pointsInVector(point.vector);
      if (!points) return this.error(BresenhamAlgorithm.error());
      if (points.length < 2) return this.error("expecting at least 2 pts");
      if (! points[0].vector || ! points.last().vector ){
        return this.error("expecting original pts w/ vectors ?");
      }
      points[0].vector.pointA = points[0];
      points[0].vector.pointB = points[1];
      points.last().vector.pointB = points.last();
      points.last().vector.pointA = points.penultimate();
      var last = points.length - 1;
      for (var i=0; i<=last; i++) {
        if (i>0 && i<last){
          points[i].vector = new Vegdor(points[i-1], points[i+1]);
          this.pointsHistory.addPoint(points[i]);
        }
        blitMap.set(points[i][0], points[i][1],
          points[i].vector.asciiLineGlyphSecondary());
      }
      puts("blit probably "+points.length+" bresenhamized glyphs");
      return true;
    },

    _normalize: function(point){
      var myPoint = [Math.floor(point[0] / this.snapX),
                     Math.floor(point[1] / this.snapY)];
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
      puts("appended a new ArcCanvas to Canvas @todo");
        window.Canvas = this.canvas; window.ArcCanvas = newCanvas;
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

  var STILL      = 'STILL'     ;
  var NORTH      = 'NORTH'     ;
  var EAST       = 'EAST'      ;
  var SOUTH      = 'SOUTH'     ;
  var WEST       = 'WEST'      ;
  var NORTH_EAST = 'NORTH_EAST';
  var SOUTH_EAST = 'SOUTH_EAST';
  var SOUTH_WEST = 'SOUTH_WEST';
  var NORTH_WEST = 'NORTH_WEST';


  /** @constructor */
  var Vegdor = function(pointA, pointB){
    if (null!==pointA && null!==pointB) {
      if (!pointA.is_pt) extend(pointA, PointLike);
      if (!pointB.is_pt) extend(pointB, PointLike);
      this.pointA = pointA;
      this.pointB = pointB;
    }
  };

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
      EAST      : '&gt;',
      SOUTH     : 'v',
      WEST      : '&lt;',
      NORTH_EAST: '7',
      SOUTH_EAST: '&gt;',
      SOUTH_WEST: 'L',
      NORTH_WEST: '&lt;'
    },
    slope: function(){
      if (!this._slope){
        this._slope = (this.pointB[1] - this.pointA[1]) /
          (this.pointB[0] - this.pointA[0]);
      }
      return this._slope;
    },
    magnitude: function(){
      if (!this._magnitude){
        this._magnitude =
          Math.sqrt( Math.pow(this.pointB[0] - this.pointA[0], 2) +
                     Math.pow(this.pointB[1] - this.pointA[1], 2));
      }
      return this._magnitude;
    },
    pointDelta: function(){
      return [this.pointB[0] - this.pointA[0],
              this.pointB[1] - this.pointA[1]];
    },
    cardinalIsPrimary: function(){
      return ! this.cardinalIsSecondary() && 'STILL' !== this.cardinal();
    },
    cardinalIsSecondary:function(){
      // the most glorious hack ever
      return -1 != this.cardinal().indexOf('_');
    },
    cardinal: function(){
      var c = true;
      if (!this._cardinal) {
        c = false;
        var absSlope = Math.abs(this.slope());
        if (isNaN(absSlope)) {
          this._cardinal = STILL;
        } else if (absSlope<1){
          this._cardinal =  this.pointA[0] < this.pointB[0] ? EAST : WEST;
        } else if (absSlope>1) {
          // flipped! lower y values are higher on the screen
          this._cardinal = this.pointA[1] < this.pointB[1] ?
            SOUTH : NORTH;
        } else if (this.pointA[0] < this.pointB[0]) {
          this._cardinal = this.pointA[1] < this.pointB[1] ?
            SOUTH_EAST : NORTH_EAST;
        } else {
          this._cardinal = this.pointA[1] < this.pointB[1] ?
            SOUTH_WEST : NORTH_WEST;
        }
      }
      //puts ('first card: '+this._cardinal+" c'd: "+c);
      return this._cardinal;
    },

    // somehow i think some trig would make this prettier,
    // alghough i never thought i'd hear myself say that.
    CoffeeCup: 0.403,
    OnMujiGraphPaper: 2.48,
    secondCardinal: function(){
      var cached = true;
      if (!this._second_cardinal) {
        cached = false;
        //var absSlope, delta, absDelta, slopeExists, up, right;
        delta = this.pointDelta();
        if (delta[0]==0 && delta[1]==0) {
          this._second_cardinal = STILL;
        } else {
          absDelta = [Math.abs(delta[0]), Math.abs(delta[1])];
          if (absDelta[0] == absDelta[1]) {
             // they are not both zero because we checked above,
             // and since they are equal they are both not zero.
             up = delta[1] < 0;
             right = delta[0] > 0;
             this._second_cardinal = up ?
               ( right ? NORTH_EAST : NORTH_WEST ) :
               ( right ? SOUTH_EAST : SOUTH_WEST );
          } else {
            if (absDelta[0] > absDelta[1]) {
              absSlope = Math.abs(this.slope());
              if (delta[0] > 0) {
                // it's not equal to zero because it's absolute value
                // is greater than another absolute value
                this._second_cardinal = (absSlope <= this.CoffeeCup) ?
                  EAST : (delta[1] > 0 ? SOUTH_EAST : NORTH_EAST);
              } else {
                this._second_cardinal = (absSlope <= this.CoffeeCup) ?
                  WEST : (delta[1] > 0 ? SOUTH_WEST : NORTH_WEST);
              }
            } else {
              var slopeExists = (absDelta[1] != 0);
              if (slopeExists) {
                absSlope = Math.abs(this.slope());
              } else {
                absSlope = NaN;
              }
              if (delta[1] < 0) {
                this._second_cardinal =
                  (!slopeExists || absSlope >= this.OnMujiGraphPaper) ?
                    NORTH : (delta[0] > 0 ? NORTH_EAST : SOUTH_EAST);
              } else {
                this._second_cardinal =
                  (!slopeExists || absSlope >= this.OnMujiGraphPaper) ?
                    SOUTH : (delta[0] > 0 ? SOUTH_EAST : SOUTH_WEST);
              }
            }
          }
        }
      }
      //puts("second card: "+this._second_cardinal+' cached: '+cached);
      return this._second_cardinal; // cacheing never looked so good
    },
    asciiLineGlyphSecondary: function(){
      return this.asciiLineGlyphs[this.secondCardinal()];
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
      this.pointA = pointA;
      this.pointB = pointB;
      this.clearCache();
    },
    clearCache: function(){
      this._cardinal = null;
      this._second_cardinal = null;
      this._magnitude = null;
      this._slope = null;
    },
    collapse: function(){
      this.pointA = [0,0];
      this.pointB = [0,0];
      this.clearCache();
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
      this.normalizer = getNormalizingPoint(mouseEvent);
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
    stopsAt: function(mouseEvent){
      var pointsHistory = this.myCanvas.stopArc(this.normalize(mouseEvent));
      if (pointsHistory.depth() > 1) {
        this.myCanvas.convertToRect();
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


  /**
  * @todo this is an ugly hack b/c we are anal about namespaces
  */
  $.widget("ui.hipe_arc_lib", $.extend({}, {
    _init: function() {
      var lib = {
        'Bresenham'         : BresenhamAlgorithm,
        'Vector'            : Vegdor,
        'Point'             : Point
      };
      this.element.data("library", lib);
    }
  }));

  $.widget("ui.hipe_arrows", $.extend({}, $.ui.mouse, {

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
    },
    /* @todo we are using the api all wrong */
    _mouseUp: function(event) {
      var arc;
      puts("got mouse up event Ev"); window.Ev = event;
      $(document)
        .unbind('mousemove.'+this.widgetName, this._mouseMoveDelegate)
        .unbind('mouseup.'+this.widgetName, this._mouseUpDelegate);

      if (this._mouseStarted) {
        this._mouseStarted = false;
        this._preventClickEvent =
          (event.target == this._mouseDownEvent.target);
        this._mouseStop(event);
      }
      if ((arc = this.arcs.last()))
        arc.stopsAt(event);
      return false;
    }
  }));

})(window.jQuery);
