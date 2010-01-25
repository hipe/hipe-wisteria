/**
* conventions in this document:
*
* private and protected methods will have leading underscores.  don't
* access methods with leading underscores unless you know what you are
* doing.
*
* all data members of an object should be considered private unless
* a prototype explicitly states otherwise in its header comments.
* don't access anybody else's members unless you know what you are doing.
* For readability, data members will not have leading underscores
* even though they should be considered private.
* Data members will have leading underscores only when necessary to
* distinguish them from methods with the same name, or in cases where
* it is nessary to indicate that they are extremely hacky or experimental.
*
* Some prototypes methods will have verbose names, like point.inspectPoint()
* instead of point.inspect(), when it is anticipated that other 'mixins'
* might want to use the same name (the same object might want to
* obj.inspectVector() too
*
* For now, the typical javascript prototype pattern is employed
* even for prototype objects that will never be used directly,
* but rather used as mixins. This is to avoid warnings from
* google closure compiler.
* whenever you see empty function "constructors" that is this.
*
* methods in general should not exceed around 40 lines unless you
* are in a hurry.  Ideally a method will have a number of local variables
* that will not exceed the limit that will comfortably fit
* in the 'watch' panel of a firebug debugger session ;)
*
* keep the jquery widgets light and do the heavy lifting in
* controller prototypes.  jquery widgets should be for getting handles to
* dom elements and interacting with the event model (receiving certain events)
*
* controllers, in turn, should only have handles to as few dom elements
* as they need, if any.   Widgets appear at the bottom of this file, and the
* controller prototypes they use will appear above them, and data
* structure prototypes that those controllers use appear above them,
* and any "mixin-like" prototype objects will (necessarily) need to appear
* before the prototypes that use them,
* and so on so that this file will be bottom-up when reading it top-down,
* with the most granular structures at the top and the most business-logicy
* ones at the bottom, which will yeild the likely candidates for reuse
* floating towards the top of this file, because of the nature of the universe
*
*
* if you put something in the wrong place you will have trouble finding
* it later
*
*
* The deep dup irony here is that we desparately wanted to have this thing
* working so we could architect and model this thing better
*
*
* terms invented/used in this document:
*   - glixel: the abstract idea of a pixel, possibly represented as a glyph,
*             possibly composed of several pixels.  the utitliy of this as a
*             concept is not yet clear.
*   - node: an entity in an erd. visually usually a rectangle. contrast w/ arc
*   - arc: see graph theory.
*   - cardinal: directions like south, south by south west. "south" is a
*               "primary" cardinal , "south west" is a "secondary" cardinal,
*                "south by south west" is a tertiary, (only used in tests)
*
* we stopped using $ui.mouse b/c of issues relating to triggering events for testing.
*
*/

(function(x) {
  var $ = x;
  if (! $.widget)  /* early warning about dependencies of this file */
    throw new Error("to use arrows.js you need jquery.ui.core.js!");


  /***************** file-local constant-like *******************************/

  var STILL      = 'STILL'     ;
  var NORTH      = 'NORTH'     ;
  var EAST       = 'EAST'      ;
  var SOUTH      = 'SOUTH'     ;
  var WEST       = 'WEST'      ;
  var NORTH_EAST = 'NORTH_EAST';
  var SOUTH_EAST = 'SOUTH_EAST';
  var SOUTH_WEST = 'SOUTH_WEST';
  var NORTH_WEST = 'NORTH_WEST';
  var PRIMARY    = 'PRIMARY'   ;
  var SECONDARY  = 'SECONDARY' ;

  var DefaultGlyphMap = {
    line: {
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
    arrowHead: {
      STILL     : '*',
      NORTH     : '^',
      EAST      : '&gt;',
      SOUTH     : 'v',
      WEST      : '&lt;',
      NORTH_EAST: '7',
      SOUTH_EAST: '&gt;',
      SOUTH_WEST: 'L',
      NORTH_WEST: '&lt;'
    }
  };

  var AsciiGlyph = {
    arrowHead: function(vector){
      return DefaultGlyphMap.arrowHead[vector.secondCardinal()];
    },
    line: function(vector){
      return DefaultGlyphMap.line[vector.secondCardinal()];
    }
  };

  var CardinalMeta = {
    STILL       : {ordinal: STILL},
    NORTH       : {ordinal: PRIMARY},
    EAST        : {ordinal: PRIMARY},
    SOUTH       : {ordinal: PRIMARY},
    WEST        : {ordinal: PRIMARY},
    NORTH_EAST  : {ordinal: SECONDARY},
    SOUTH_EAST  : {ordinal: SECONDARY},
    SOUTH_WEST  : {ordinal: SECONDARY},
    NORTH_WEST  : {ordinal: SECONDARY}
  };




  /***************** file-local functions ***********************************/

  /* define our own just so we understand it */
  var extend = function(target,source){
    for (var i in source){
      target[i] = source[i];
    }
    if (arguments.length > 2) {
      for (i=2; i<arguments.length; i++){
        for (var j in arguments[i]) {
          target[j] = arguments[i][j];
        }
      }
    }
    return target;
  };

  /* temp debugging function @todo */
  var puts = window.console ? window.console.log : function(m){};


  /*************** awesome file-local prototypes and mixins *****************/

  var Erroneous = {
    error: function(msg){
      var self = this;
      if (msg) {
        self.lastErrorMessage = msg;
        return false;
      } else {
        return this.lastErrorMessage;
      }
    },
    clearErrors: function(){
      var self = this;
      self.lastErrorMessage = null;
    }
  };

  var List = function(){
    var arr = arguments.length ? arguments[0] : [];
    return extend(arr, List.prototype);
  };
  List.prototype = {
    listLike: true,
    last: function(){
      return this.length == 0 ? false : this[this.length - 1];
    },
    penultimate: function(){
      return this.length >= 2 ? this[this.length - 2] : false;
    }
  };

  /** @constructor */
  var Stack = function(){
    return extend([], Stack.prototype);
  };
  Stack.prototype = {
    stackLike: true,
    top: function(){
      return this.length == 0 ? false : this[this.length - 1];
    }
  };

  /** @constructor */
  var Point = function(x,y){
    var arr = (arguments.length == 1) ?
      [arguments[0][0], arguments[0][1]] : [x,y];
    extend(arr, Point.prototype);
    return arr;
  };

  Point.averagePoint = function(){
    var sumz = [0,0];
    for (var i=0; i<arguments.length; i++) {
      sumz[0] += arguments[i][0];
      sumz[1] += arguments[i][1];
    }
    sumz[0] /= arguments.length;
    sumz[1] /= arguments.length;
    return new Point(sumz);
  };

  Point.prototype = {
    pointLike: true,
    inspectPoint: function(){ return "["+this[0]+"]["+this[1]+"]"; },
    pointHashKey: function(){ return this.inspect(); },
    copyPoint:    function(){ return new Point(this[0], this[1]);},
    pointEquals: function(point){
      return this[0] == point[0] && this[1] == point[1];
    },
    pointSharesAtLeastOneAxisWith: function(pt){
      return this[0]==pt[0] || this[1]==pt[1];
    },
    vectorize: function(pointB) {
      if (!this.vectorLike) {
        extend(this, Vector.prototype);
        this.pointA = this; // ! :/
      } else {
        this.clearVectorCache();
      }
      this.pointB = pointB;
      return this;
    },
    revectorize: function(arg){
      return this.vectorize(arg);
    },
    pointPlusEquals: function(pt){
      this[0] += pt[0];
      this[1] += pt[1];
      return this;
    }
  };


  var CardinalLike = function(){};
  CardinalLike.CoffeeCup = 0.403;
  CardinalLike.OnMujiGraphPaper = 2.48;

  CardinalLike.prototype = {
    cardinalLike: true,
    cardinalIsPrimary: function(){
      return (PRIMARY == CardinalMeta[this.secondCardinal()].ordinal );
    },
    cardinalIsSecondary:function(){
      return (SECONDARY == CardinalMeta[this.secondCardinal()].ordinal );
    },

    /**
    * @todo decide if we still need cardinal, see if this really
    * does anything differently.  'Cardinal' is supposed to return
    * STILL or one of the four, unless it is a perfect second cardinal.
    * somehow i think some trig would make this prettier,
    * alghough i never thought i'd hear myself say that.
    */
    secondCardinal: function(){
      if (!this._secondCardinal) {
        var _c=false,delta,absDelta,up,left,wider,absSlope,result;
        delta     = this.pointDelta();
        absDelta  = [Math.abs(delta[0]), Math.abs(delta[1])];
        up        = delta[1] < 0;
        left      = delta[0] < 0;
        wider     = absDelta[0] > absDelta[1];
        absSlope  = (delta[0]==0) ? NaN : Math.abs(this.slope());

        if (delta[0]==0 && delta[1]==0) {
          result = STILL;
        } else if (wider && absSlope <= CardinalLike.CoffeeCup) {
          result = left ? WEST : EAST;
        } else if (!wider &&
          (isNaN(absSlope) || absSlope >= CardinalLike.OnMujiGraphPaper)) {
          result = up ? NORTH : SOUTH;
        } else {
          result = up ?
              ( left ? NORTH_WEST : NORTH_EAST) :
              ( left ? SOUTH_WEST : SOUTH_EAST) ;
        }
        this._secondCardinal = result;
      }
      //puts("second card: "+this._secondCardinal+' cached: '+_c);
      return this._secondCardinal; // cacheing never looked so good
    }
  };


  /** @constructor
  * if arguments are provided they must be two point objects
  */
  var Vector = function(){
    if (arguments.length) {
      var a0 = arguments[0], a1 = arguments[1];
      this.pointA = a0.pointLike ? a0 : new Point(a0);
      this.pointB = a1.pointLike ? a1 : new Point(a1);
    }
  };
  Vector.revectorizePoints = function(pts,start,end){
    for(var i=start; i<=end; i++){
      pts[i].revectorize(pts[i+1]);
    }
  };
  Vector.prototype = extend({}, CardinalLike.prototype, {
    vectorLike: true,
    slope: function(){
      if (!this._slope){
        this._slope =
          (this.pointB[1] - this.pointA[1]) /
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
    // just return -1, 0, or 1 for x and y
    binaryPointDelta: function(){
      var x = (x = this.pointB[0] - this.pointA[0]) > 1 ? 1 : (x<-1) ? -1 : x;
      var y = (y = this.pointB[1] - this.pointA[1]) > 1 ? 1 : (y<-1) ? -1 : y;
      return [x,y];
    },
    absPointDelta: function(){
      return [Math.max(),
              Math.abs(this.pointB[1] - this.pointA[1])];
    },
    clearVectorCache: function(){
      this._secondCardinal = null;
      this._magnitude = null;
      this._slope = null;
    },
    vectorsInVectorShallow: function(){
      switch(this.magnitude()){
        case 0: return new List([this]);
        case 1: return new List([
          this.pointA, this.pointB.vectorize(this.pointB)]);
        default: return BresenhamAlgorithm.pointsInVector(this);
      }
    },
    inspectVector: function(){
      return this.pointA.inspectPoint()+"->"+this.pointB.inspectPoint();
    },
    copyVector: function(){
      return new Vector( this.pointA.copyPoint(), this.pointB.copyPoint() );
    }
  });

  /**
  * adapted from _AI for Game Developers_, Bourg & Seeman,
  * O'Reilly, 2004.  page 14.
  * modified origininal, which didn't handle the simple
  * base cases of going straight up or down, or straight left
  * or right.  And reduced the code in half by
  * letting 'a' and 'b' point to either 'x' and 'y' or
  * 'y' and 'x' based on which abs delta is longer
  *
  */
  var BresenhamAlgorithm = extend({}, Erroneous, {
    /**
    * @return a List array of points or (false and set error)
    *
    * whether or not we use references to or new copies of the
    * start and endpoints of the vector is undefined! (in flux)
    *
    */
    pointsInVector: function(vector){
      var result, endPoint, delta, step, absDelta, fraction, nextPoint, done;
      var sanity, a,b;
      if (vector.magnitude() <= 1) return this.error(
        "Won't calculate interceding points for short vectors,"+
        "even though it might be ok"
      );
      result = new List([vector.pointA]);
      endPoint = vector.pointB;
      delta = vector.pointDelta();
      step = [
        delta[0] == 0 ? 0 : (delta[0] < 0 ? -1 : 1 ),
        delta[1] == 0 ? 0 : (delta[1] < 0 ? -1 : 1 )
      ];
      absDelta = [Math.abs(delta[0]), Math.abs(delta[1])];
      if (absDelta[0] > absDelta[1]) {a=0; b=1;} else {a=1; b=0;}
      fraction = absDelta[a] * 2 - absDelta[b];
      nextPoint = vector.pointA.copyPoint();
      done = nextPoint.pointEquals(endPoint);
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
          nextPoint = nextPoint.copyPoint();
        }
      }
      return result;
    }
  });

  /** @constructor */
  var Path = function(){
    var me = [];
    extend(me, Path.prototype);
    me._compress = true;
    if (arguments.length) {
      for (var i=0; i<arguments.length; i++) {
        var pt = new Point(arguments[i]);
        this.addPoint(pt);
      }
    }
    return me;
  };
  Path.prototype = extend({}, Erroneous, List.prototype, {
    /**
    * If there is a last point of the path and this is equal to it,
    * does nothing and returns null. Else, either adds this point to the list
    * of vector points or,
    * if (_compress is on, and if this would be the third or greater point in
    * the path, and it makes a straight line with the last two either
    * perfectly horizontally or vertically (this is, if it continues such
    * a straight line formerly in progress)) change the last point of the path
    * to be this point.
    * Return a point vector that represents the added length, (maybe zero)
    * with the head referencing the previous last point of the path, or if
    * the path formerly had zero members the argument point; and the tail
    * being the argument point.  This vector will have zero magnitude iff
    * this point was the first point added.
    * @todo this return value might become optional.
    * @dependency 2 - encapsuation violation with _pathIndex
    */
    addPoint: function(pt){
      if (!pt.pointLike) pt = new Point(pt);
      var last = this.last();
      if (last && pt.pointEquals(last)) return null;
      var penultimate = this.penultimate();
      if (this._compress && penultimate){
        var delta = penultimate.pointDelta();
        if ( (delta[0]==0 && pt[0]==penultimate[0]) ||
             (delta[1]==0 && pt[1]==penultimate[1]) ){
          var formerLast = last;
          this[this.length-1] = pt;
          penultimate.revectorize(pt);
          formerLast.revectorize(pt);
          return formerLast;
        }
      }
      this.push(pt);
      if (last) {
        last.revectorize(pt);
        return last;
      } else {
        pt.vectorize(pt); // the first point added has zero magnitude
        return pt;
      }
    },
    getBoundingRect: function(){
      if (this.length == 0) return null;
      var last,ceil,starboard,floor,port;
      last = this.last();
      floor = ceil = last[1];
      starboard = port = last[0];
      for (var i=this.length-1; i>=0; i--){
        var x = this[i][0];
        var y = this[i][1];
        if (x<port) {
          port = x;
        } else if (x>starboard) {
          starboard = x;
        }
        if (y>floor) {
          floor = y;
        } else if (y<ceil) {
          floor = ceil;
        }
      }
      var x1,y1,x2,y2,x3,y3,x4,y4;
      x1 = x4 = port;
      x2 = x4 = starboard;
      y1 = y2 = ceil;
      y3 = y4 = floor;
      var path = new Path([x1,y1],[x2,y2],[x3,y3],[x4,y4]);
      path.closePath();
      return path;
    },
    roundVectorAt: function(idx){
      //var prevDelta, thisDelta, avgDelta;
      if (idx <= 0 || idx >= this.length-1) return;
      prevDelta = this[idx-1].binaryPointDelta();
      thisDelta = this[idx].binaryPointDelta();
      avgDelta = Point.averagePoint(prevDelta, thisDelta);
      this[idx].revectorize(avgDelta.pointPlusEquals(this[idx]));
    }
  });


  /** @constructor
  * A blit map is simply a 2-d matrix.
  * we usually usually for "blitting" (rendering as quickly at possible)
  * a bunch of glixels to the screen
  * this may be used to hold ascii glyphs, it may be more abstract
  *
  * encapsulation violations at: @dependency 1
  */
  var BlitMap = function(){
   this.matrix = [];
   this._recordOverwrite = false;
   this._recordChangedRows = false;
   this._doFillEmptiesWith = false;
  };

  BlitMap.prototype = {
    sanity: 200,
    clearBlitMap: function(){
      for(var i=this.matrix.length-1; i>=0; i--) {
        for(var j=this.matrix[i].length; j>=0; j--) {
          this.matrix[i][j] = null;
        }
      }
      if (this._recordOverwrite) { this._overwrote = false; }
      if (this._recordChangedRows) { this._changedRows.length = 0; }
    },
    mergePoint: function(pt,value){
      if (!this.matrix[pt[1]]) {
        if (pt[1] > this.sanity) return;
        var last = this.matrix.length;
        for (var j=pt[1]; j>=last; j--) {
          this.matrix[j] = [];
        }
      }
      if (this._recordOverwrite && this.matrix[pt[1]][pt[0]]){
        this._overwrote = true;
      }
      if (this._recordChangedRows && -1 == this._changedRows.indexOf(pt[1])) {
        this._changedRows.push(pt[1]);
      }
      if (this._doFillEmptiesWith && this.matrix[pt[1]].length < pt[0]) {
        this._fillEmpties(pt[1], pt[0]-1);
      }
      this.matrix[pt[1]][pt[0]] = value;
    },
    mergePoints: function(points,value){
      for(var i=0; i<points.length; i++){
        this.mergePoint(points[i], value);
      }
    },
    mergeBlitMap: function(blitMap) {
      for (var i=blitMap.matrix.length-1; i>=0; i--) {
        if (undefined===this.matrix[i]) {
          this.matrix[i] = [];
        }
        if (this._doFillEmptiesWith &&
            this.matrix[i].length < blitMap.matrix[i].length){
          this._fillEmpties(i, blitMap.matrix[i].length - 2);
        }
        for (var j=blitMap.matrix[i].length; j>=0; j--) {
          if (undefined!==blitMap.matrix[i][j]){
            if (this._recordOverwrite && this.matrix[i][j]) {
              this._overwrote = true;
            }
            if (this._recordChangedRows && -1==this._changedRows.indexOf(i)){
              this._changedRows.push(i);
            }
            this.matrix[i][j] = blitMap.matrix[i][j];
          }
        }
      }
    },
    _fillEmpties: function(row,lastIdx){
      for (lastIdx; lastIdx>=0; lastIdx--) {
        if (undefined===this.matrix[row][lastIdx]) {
          this.matrix[row][lastIdx] = this._fillEmptiesWithValue;
        }
      }
    },
    hasPoint:function(pt){
      return this.matrix[pt[1]] && this.matrix[pt[1]][pt[0]];
    },
    recordOverwrite: function(){
      this._recordOverwrite = true;
      return this;
    },
    overwrote: function(){ return this._overwrote; },
    clearOverwrote: function(){ this._overwrote = false; },
    recordChangedRows: function(){
      this._changedRows = new List();
      this._recordChangedRows = true;
      return this;
    },
    fillNewEmptiesWith: function(value){
      this._doFillEmptiesWith = true;
      this._fillEmptiesWithValue = value;
      return this;
    },
    changedRows: function(){ return this._changedRows; },
    clearRecordedChangedRows: function(){ this._changedRows.length = 0; }
  };

  var AbstractPathLayer = function(){};
  AbstractPathLayer.factory = function(){
    var layer;
    if (false) { //@todo canvas
      //layer = CanvasPathLayer.canvasPathLayerFactory(arguments);
    } else {
      layer = new AsciiPathLayer(arguments);
    }
    return layer;
  };

  AbstractPathLayer.prototype = {
    _initAbstractPathLayer: function(){
      var controller = arguments[0], options = arguments[1];
      this.isBuilding = true;
      this.viewPath = new Path();
      this.clickHalo = new BlitMap();
      this.clickHalo.recordOverwrite();
    },
    _wantsMouseDown: function(pt){
      return this.clickHalo.hasPoint(pt);
    },
    _mouseDown: function(pt){
      if (this.viewPath.length != 0) return null;
      return this._mouseDownOrMove(pt);
    },
    _mouseDownOrMove: function(pt){
      if (!this.isBuilding) return;
      this.lastPoint = pt; // only for _mouseMove check. pt is always new loc.
      var lengthBefore = this.viewPath.length;
      var vec = this.viewPath.addPoint(pt);
      var lengthAfter = this.viewPath.length;
      var vecs = vec.vectorsInVectorShallow();
      this._addedLengthVector = vec;
      this._addedPointVectors = vecs;
      var penultimate = this.viewPath.penultimate();
      if (lengthBefore > 1) {
        if (lengthAfter>lengthBefore) {
          this.penultimateBeforeRounding = penultimate.copyVector();
          this.viewPath.roundVectorAt(lengthBefore-1);
        } else {
          this.penultimateBeforeRounding = penultimate;
        }
      } else {
        this.penultimateBeforeRounding = penultimate;
      }
      this.clickHalo.mergePoints(vecs,true);
      this.redrawArc();
    },
    _mouseMove: function(pt){
      if (this.viewPath.length==0) return null;
      if (this.lastPoint.pointEquals(pt)) return null;
      return this._mouseDownOrMove(pt);
    },
    _mouseUp: function(pt){
      if (!this.isBuilding) return;
      if (!this.viewPath.length > 0) return;
      puts("mouse up ignored for now");//alert("here comes the fun");
    },
    domElement: function(){
      return this._domElement;
    },
    wantsMouseDown:function(e){ return this._wantsMouseDown(e); },
    mouseDown: function(e){ return this._mouseDown(e); },
    mouseMove: function(e){ return this._mouseMove(e); },
    mouseUp:   function(e){ return this._mouseUp(e); }
  };

  /** @constructor */
  var AsciiPathLayer = function(){
    this._domElement = $('<div></div>');
    this._domElement.addClass('path-layer');
    this._initAbstractPathLayer(arguments);
    this.viewMatrix = new BlitMap().recordChangedRows().
      fillNewEmptiesWith(' ');
    this.linesCache = [];
  };
  AsciiPathLayer.prototype = extend({}, AbstractPathLayer.prototype,{
    redrawArc: function() {
      var v, vector, points, last, penultimate, bm;
      Thiz = this;
      vector = this._addedLengthVector;
      points = this._addedPointVectors;
      if (points.length > 2) {
        Vector.revectorizePoints(points,1,points.length-2);
      }
      last = points.last();
      bm = new BlitMap();
      for(var i=points.length-2; i>=0; i--){
        v = points[i];
        bm.mergePoint(v, AsciiGlyph.line(v));
      }
      // last point always has zero magnitude. but we want not rounded vector.
      if (this.penultimateBeforeRounding) {
        bm.mergePoint(last,
          AsciiGlyph.arrowHead(this.penultimateBeforeRounding));
      } else if (last) {
        bm.mergePoint(last, AsciiGlyph.arrowHead(last));
      }
      this.blitThisMap(bm);
    },
    blitThisMap: function(bm) {
      this.viewMatrix.clearRecordedChangedRows();
      this.viewMatrix.mergeBlitMap(bm);
      var rowsChanged = this.viewMatrix.changedRows();
      for(var i=rowsChanged.length-1; i>=0; i--){
        var idx = rowsChanged[i];
        this.linesCache[idx] = this.viewMatrix.matrix[idx].join('');
      }
      var newHtml = this.linesCache.join("\n");
      this._domElement.html(newHtml);
    }
  });

  /** @constructor */
  var ZoomState = function(factor){
    this.factor = factor;
    this.level = 0;
    this.origin = null;
  };
  ZoomState.prototype = {
    factor:function(){ return this.factor; },
    level: function(){ return this.level; },
    origin: function(){ return this.origin; }
  };

  /**
  * this should be the widgets's only handle to all the entities and arcs
  * on the screen.
  *
  * whether we are rendering squares, arcs, circles, green clovers or purple
  * horseshoes, they all:
  *   - can choose to represent themselves to the browser maybe as a div,
  *       maybe as as a canvas element, may as something else; based on
  *       messages received from the widget about the environment
  *   - can receive messages from the controller about view metrics:
  *       and view portal scaling (zooming) or view portal moving
  *   - have a matrix of glixels that represent them, maybe abstractly
  *   - exist somewhere in a linear stack, either at the top, at the bottom
  *     (or both if the only member,) and may have one above and one below.
  *   - glixels in their matrix can be obscured visually by ones above them
  *   - need to detect which glixel was clicked
  *   - can be moved and scaled (we need to distinguish view from state here)
  */

  /** @constructor */

  var PathStackController = function(widget,options){
    this.homeElement = $(widget.element);
    this.snapX = options.grid[0];
    this.snapY = options.grid[1];
    this.options = options;
    this.stack = new Stack();
  };
  PathStackController.prototype = {
    childOptions: function(){
      if (!this._childOptions) {
        this._childOptions = this.options; // careful. shallow
        if (!this._childOptions['zoom']) {
          this._childOptions['zoom'] = new ZoomState(0.20);
        }
        this._childOptions['grid'] = new Point(this.options['grid']);
      }
      return this._childOptions;
    },
    mousedown: function(e,e2){
      puts("md");
      if (e2) e=e2;
      this.mouseDown = true;
      var localSnappedPoint = this._localizeAndSnap(e);
      this.lastPoint = localSnappedPoint;
      this.activeLayer = null;
      for(var i=this.stack.length-1; i>=0; i--){
        if (this.stack[i].wantsMouseDown(localSnappedPoint)) {
          this.activeLayer = this.stack[i];
          break;
        }
      }
      if (!this.activeLayer) {
        var layer = AbstractPathLayer.factory(this, this.childOptions());
        var newEl = layer.domElement();
        this.homeElement.append(newEl);
        puts("appended new _el to _home");
          _el = newEl; _home=this.homeElement;
        this.stack.push(layer);
        this.activeLayer = layer;
      }
      this.activeLayer.mouseDown(localSnappedPoint);
      return null;
    },
    mousemove: function(e,e2){
      if (!this.mouseDown) return;
      if (e2) e=e2;
      if (this.activeLayer) {
        var localSnappedPt = this._localizeAndSnap(e);
        if (this.lastPoint.pointEquals(localSnappedPt)) return;
        this.activeLayer.mouseMove(localSnappedPt);
      }
    },
    mouseup: function(e,e2){
      if (e2) e=e2;
      this.mouseDown = false;
      if (this.activeLayer) {
        var localSnappedPt = this._localizeAndSnap(e);
        this.activeLayer.mouseUp(localSnappedPt);
      }
    },
    _localizeAndSnap: function(e) {
      if (!this.normalizer) {
        this.normalizer = this.homeElement.offset();
      }
      // we don't want round we want floor! if fm is 10x10 per character,
      // a click at [9][9] should map to [0][0]
      var pt = new Point(
        Math.floor((e.pageX - this.normalizer.left) / this.snapX),
        Math.floor((e.pageY - this.normalizer.top ) / this.snapY)
      );
      return pt;
    }
  };


  // ************************ widgets ***********************************


  $.widget("ui.hipe_arrows_path_controller", {
    _init: function() {
      var self = this;
      self.element.data('widget',self); // let this come before below
      if (!self.options['grid']) return;
      self.keyRegistry = {};
      cnt = new PathStackController(self, self.options);
      self.controller = cnt;
      var el = self.element;
      el.bind('mousedown',function(e1,e2){return cnt.mousedown(e1,e2);});
      el.bind('mousemove',function(e1,e2){return cnt.mousemove(e1,e2);});
      el.bind('mouseup',function(e1,e2){return cnt.mouseup(e1,e2);});
      $(window.document).bind('keypress',function(e){self.keypress(e);});
    },
    library: function(){
      return { 'Vector':Vector, 'Point':Point, 'Path':Path,
        'BresenhamAlgorithm':BresenhamAlgorithm };
    },
    keypress: function(e){
      var self = this;
      var key = String.fromCharCode(e.charCode);
      if (self.keyRegistry[key]) {
        var entry = self.keyRegistry[key];
        return entry[0][entry[1]](e);
      } else {
        return false;
      }
    },
    registerKeyListener: function(listener, key, method) {
      var self = this;
      self.keyRegistry[key] = [listener,method];
    }
  });

})(window.jQuery);
