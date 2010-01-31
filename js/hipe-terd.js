/**
* hipe-terd 0.0.0pre
*
* terd: Three-dimensional engine for ECMAScript Redundantly Duplicated
*
* Copyright 2010, Mark Meves
* Dual licensed under the MIT or GPL Version 2 licenses.
* (the same license as jquery: http://docs.jquery.com/License)
*
* Depends:
* ui.core.js
*
* Thank you's / credits:
*  This started out as a rewrite of an engine from devirtuoso,
*    without whose excellently well documented and accessible code
*    this would have taken many many more hours by about a factor of five.
*       www.devirtuoso.com
*  The underlying architecture is decidedly inspired by their engine.
*  (camera, scene, etc.)
*
*  I didn't anticipate that getting shapes to rotate with a mouse would
*  be more difficult than rendering them in the first place (by a factor
*  of about three and counting..).  The trig formulas at the core of this
*  I could have never come up with on my own without probably dozens or
*  hundreds of additional hours of trig study.  For every pixel that every
*  shape rotates with a mouse I owe a thank you to T. Bühlmann, who not
*  only solved the problem for me, but came up with three solutions and
*  benchmarked each of them.
*
*
*/
(function($) {

  // ************ common functions ******************

  var extend = function(x,y){
    var z;
    for(z in y){ x[z] = y[z]; }
    for(z in arguments[2]){ x[z] = arguemnts[2][z]; }
    return x;
  };

  var puts = function(msg){
    msg = 'terd '+msg;
    return window['console'] ? window.console.log(msg) : null;
  };

  var fatal = function(msg){
    msg = 'terd '+msg;
    throw(new Error(msg));
  };

  var list=function(){
    var args = arguments.length===1&&('number'===typeof(arguments[0].length))?
     arguments[0] : arguments;
    args.each = function(f){
      for(var i=0; i<args.length; i++){
        f(args[i]);
      };
      return args; // return the list when you call each()
    };
    return args; // return the argument when you build the list()
  };


  // ************ core prototypes *****************************

  var Vector = function(arr){
    return extend(arr,Vector.prototype);
  };
  Vector.fill = function(num){
    var val = (arguments.length > 0) ? arguments[1] : undefined;
    var v = new Vector(new Array(num));
    return v.each(function(_,idx){ this[idx] = val; });
  };

  Vector.prototype = {
    isVector: true,
    prototypeFunction: Vector,
    copy: function(){
      var me = new (this.prototypeFunction)(new Array(this.length));
      for (var i=this.length-1;i>=0;i--){
        me[i] = this[i];
      }
      return me;
    },
    each: function(f){
      var i = 0, length = this.length;
      //i < length && f(value,i) !== false; 				
			for (
			  var value = this[0];
        i < length && f.apply( this, [value,i] ) !== false;
        value = this[++i] ) {}
      return this;
    },
    map: function(f){
      var res = new Vector(new Array(this.length));
      for(var i=this.length-1; i>=0; i--){
        res[i] = f(this[i]);
      }
      return res;
    },
    winner: function(f){
      if (0===this.length) return -1;
      var winningVal = this[0];
      var winningIdx = 0;
      for (var i=this.length-1; i>0; i--){
        if (f(this[i],winningVal)) {
          winningVal = this[i];
          winningIdx = i;
        }
      }
      return winningIdx;
    },
    min: function(){
      return this[this.winnner(function(a,b){return a<b;})];
    },
    max: function(){
      return this[this.winnner(function(a,b){return a>b;})];
    },
    set: function(v2){
      return this.each(function(val,idx){ this[idx] = v2[idx]; });
    },
    plusEquals: function(vector){
      return this.each(function(val,idx){ this[idx]+=vector[idx];});
    },
    timesEquals: function(vector){
      return this.each(function(val,idx){ this[idx]*=vector[idx];});
    },
    minusEquals: function(vector){
      return this.each(function(val,idx){ this[idx]-=vector[idx];});
    },
    dividedByEquals: function(vector){
      return this.each(function(val,idx){ this[idx]/=vector[idx];});
    },
    distance: function(v2){
      var sum = 0;
      this.each(function(val,idx){ sum += Math.pow(v2[idx]-val,2); });
      return Math.sqrt(sum);
    },
    inspect: function(){
      return this.map(function(val){return '['+val+']';}).join('');
    }
  };

  var Camera = function(pos, focalLength){
    if (!pos) pos = [0,0,0];
    if (!focalLength) focalLength = 450;
    var me = new Vector(pos);
    me.focalLength = focalLength;
    return extend(me, Camera.prototype);
  };
  Camera.prototype = {
    getFocalLength:function(){return this.focalLength;},
    isCamera: true,
    scaleRatio: function(item){
      // @todo -- divide by zero!! FIXME @FIXME TODO @TODO
      return this.focalLength/(this.focalLength + item[2] - this[2]);
    }
  };

  var AbstractWireframe = function(length){
    return extend(new Vector(new Array(length)), AbstractWireframe.prototype);
  };
  AbstractWireframe.prototype = {
    isAbstractWireframe: true,
    prototypeFunction: AbstractWireframe,
    init: function(sceneController){
      this.sceneController = sceneController;
      this._beforeRun = [];
      this._afterRun = [];
      this.state = 'ready';
      this.stateListeners = null;
      this.rotateTransform = new Rotate();
      this.rotateTransform.setFocalLength(
        this.sceneController.getCamera().getFocalLength()
      );
    },
    initScreenPoints: function(){
      this.screenPoints = new Vector(new Array(this.length));
      var wireframe = this;
      this.screenPoints.each(function(value,idx){
        this[idx] = wireframe.makeEmptyScreenPoint(wireframe[idx]);
      });
    },
    addStateListener:function(f){
      if (!this.stateListeners) this.stateListeners = [];
      this.stateListeners.push(f);
    },
    _notifyStateListeners: function(){
      var rot = this.currentAxisRotation;
      var data = { rot: {x:rot[0],y:rot[1],z:rot[2]}};
      list(this.stateListeners).each(function(f){f(data);});
    },
    beforeRun: function(f){ this._beforeRun.push(f); },
    afterRun: function(f){ this._afterRun.push(f); },
    beforeRunNotify: function(){
      list(this._beforeRun).each(function(f){ f(); });
    },
    afterRunNotify: function(){
      list(this._afterRun).each(function(f){ f(); });
    },
    pause: function(){this.state='paused'; puts('paused a wf'); },
    resume: function(){this.state='ready';},
    currentRotation: function(){return this.currentAxisRotation;},
    rotationRequest: function(request){
      this.mostRecentRotationRequest = request;
      // this doesn't change the this.axisRotationDelta
      this.currentAxisRotation.plusEquals(request.rotationDelta);
      if (this.stateListeners) this._notifyStateListeners();
      this.state = 'ready'; // watch this! ...
    },
    setAxisRotationAndRotationDelta: function(a,b){
      this.currentAxisRotation = a;
      this.axisRotationDelta = b;
    },
    applyCurrentRotation: function(){
      if ('ready'!==this.state) return;
      this.currentAxisRotation.plusEquals(this.axisRotationDelta);
    },
    // old version in 8d8ed
    render: function() {
      if ('ready'!==this.state) return;
      this.rotateTransform.set(this.currentAxisRotation);
      this.each(function(pt,idx){
        this.rotateTransform.go(pt, this.screenPoints[idx]);
        this.screenPoints[idx].render();
      });
      if (this.mostRecentRotationRequest) {
        var req = this.mostRecentRotationRequest;
        this.mostRecentRotationRequest = null;
        req.requester.rotationFulfilled(req);
        this.state = req.stateAfterRotation;
      }
    }
  };

  /** @constructor */
  var Rotate = function(rotate){
    this.focalLength = null;
    if (rotate) this.set(rotate);
    return this;
  };
  Rotate.prototype = {
    inspect: function(){ return this.rotate.inspect(); },
    setFocalLength: function(len){ this.focalLength = len; },
    set:function(rotate){
      if (rotate.isVector) { this.rotate = rotate; }
      else {
        if (this._copied) {
          this.rotate.set(rotate);
        } else {
          // to be safe -- if user tries to alter argument array,
          // or if we alter it.
          this.rotate = new Vector(rotate).copy();
          this._copied = true;
        }
      }
      this.sin = rotate.map(function(x){return Math.sin(x);});
      this.cos = rotate.map(function(x){return Math.cos(x);});
      return this;
    },

    go: function(pt, resultPt){
      if (!resultPt) resultPt = Vector.fill(3);

      // rotate around z (roll)
      var x2 = pt[0] * this.cos[2]   - pt[1] * this.sin[2];
      var y2 = pt[0] * this.sin[2]   + pt[1] * this.cos[2];

      // rotate around x (pitch)
      resultPt[1] = y2 * this.cos[0] - pt[2] * this.sin[0];
      var z3 = y2 * this.sin[0]      + pt[2] * this.cos[0];

      // rotate around y (yaw)
      resultPt[2] = z3 * this.cos[1] - x2 * this.sin[1];
      resultPt[0] = z3 * this.sin[1] + x2 * this.cos[1];

      // as an optim we could take this cond. out & make it zero
      if (null!==this.focalLength) {
        var scaleFactor = this.focalLength /
          (this.focalLength + resultPt[2]);
        resultPt[0] *= scaleFactor;
        resultPt[1] *= scaleFactor;
        resultPt.scaleFactor = scaleFactor;
      }

      return resultPt;
    }
  };

  var SceneController = function(options){
    var me = extend(new Vector([]), SceneController.prototype);
    me.options = options;
    me.initSceneController();
    return me;
  };
  SceneController.prototype = {
    isSceneController: true,
    initSceneController: function(){
      var opts = this.options;
      this.state = 'ready';
      this._setTargetMsecPerFrame();
      this.axisRotationPrototype = new Vector([0.0,0.0,0.0]);
      this.currentRotationDeltaPrototype = new Vector(
        opts.initialRotationDelta);
      // camera position is not used in this engine currently
      if (!opts.cameraPosition) opts.cameraPosition = [0,0,0];
      if (!opts.cameraFocalLength) opts.cameraFocalLength = 450;
      this.camera = new Camera(
        opts.cameraPosition,
        opts.cameraFocalLength
      );
      this.fipsListeners = null;
      this.updateFipsEvery = 2000;
    },
    getCamera: function(){ return this.camera; },
    run: function(){
      if (this.fipsListeners) this.timeOfLastFipsUpdate = 0;
      this.each(function(wireframe){wireframe.beforeRunNotify();});
      this.state = 'running';
      this._renderThisFrameAndTheNextFrame();
    },
    stop: function(){
      this.state = 'ready';
    },
    _setTargetMsecPerFrame: function(){
      var arg = this.options.maxFps;
      if ('number'!==typeof(arg) || arg <= 0 || arg > 60)
        arg = 12;
      this.targetFps = this.options.maxFps;
      this.targetMsecPerFrame = 1000 / arg;
    },
    addWireframe: function(wireframe){
      wireframe.setAxisRotationAndRotationDelta(
        this.axisRotationPrototype.copy(),
        this.currentRotationDeltaPrototype.copy()
      );
      this.push(wireframe);
    },
    addFipsListener: function(f){
      if (!this.fipsListeners) this.fipsListeners = [];
      this.fipsListeners.push(f);
    },
    _debuggingMessage: function(msg){
      puts(msg);
    },
    _updateFipsListeners: function(now, overhead, sleepFor){
      this.timeOfLastFipsUpdate = now;
      var fipsData = {
        potentialFps: 1000 / overhead,
        actualFps: 1000 / (sleepFor + overhead),
        targetFps: this.targetFps,
        percentCapacity: 100 * (overhead / this.targetMsecPerFrame)
      };
      for (var i=this.fipsListeners.length-1; i>=0; i--){
        this.fipsListeners[i](fipsData);
      }
    },
    _renderThisFrameAndTheNextFrame: function(){
      var t1 = new Date().getTime();
      this.each(function(wireframe){
        wireframe.render();
        wireframe.applyCurrentRotation();
      });
      var t2 = (new Date().getTime());
      var overhead =  t2 - t1;
      var sleepFor = Math.max(0, this.targetMsecPerFrame - overhead);
      if (this.fipsListeners &&
          t2 - this.timeOfLastFipsUpdate > this.updateFipsEvery)
            this._updateFipsListeners(t2, overhead, sleepFor);
      if (this.state == 'running') {
        var me = this;
        setTimeout(
          function(){me._renderThisFrameAndTheNextFrame();},
          sleepFor
        );
      } else {
        this.each(function(wireframe){ wireframe.afterRunNotify(); });
      }
    }
  };



  //****************** start css-specific code ********************

  /**
  * holds a two dimensional point-vector (not really, actually)
  * and a jQuery handle on the element (li)
  */
  var CssScreenPoint = function(el){
    var me = new Vector([null,null]);
    me.element = el;
    return extend(me, CssScreenPoint.prototype);
  };
  CssScreenPoint.prototype = {
    render: function(){
      this.element.css({
          fontSize: 100 * this.scaleFactor + '%',
          left: this[0]+'px',
          top: this[1]+'px',
          opacity: this.scaleFactor - 0.5
      });
    }
  };

  /**
  * Get the angle that a 3d point makes from 0,0,0 to it on one of the planes.
  * This is ported blindly to Javascript from the thorough work of Thomas
  * Bühlmann, without whom we wouldn't have been able to rotate our shapes
  * without picking the laptop up off the desk.
  * http://pastie.org/802804
  * There are 3 variant formulas for this, and on top of that one variant
  * for each plane.  We will use what is presumed to be the fastest formula
  * (plane/vector) but the other two are included(?) for completeness and
  * possible future benchmarking.
  */
  var Tbuehlmann = {
    halfPi: Math.PI / 2,
    xyPlaneAngleUsingPlaneAndVector:function(pt){ return this._plane(pt,2);},
    xzPlaneAngleUsingPlaneAndVector:function(pt){ return this._plane(pt,1);},
    yzPlaneAngleUsingPlaneAndVector:function(pt){ return this._plane(pt,0);},
    _plane:function(pt, idx){
      return Math.asin(
        pt[idx] /       // took abs() off
        Math.sqrt(
          Math.pow(pt[0],2) + Math.pow(pt[1],2) + Math.pow(pt[2],2)
        )
      );
    },
    xyPlaneAngleUsingVectorVector:function(pt){return this._vector(pt,0,1);},
    xzPlaneAngleUsingVectorVector:function(pt){return this._vector(pt,0,2);},
    yzPlaneAngleUsingVectorVector:function(pt){return this._vector(pt,1,2);},
    _vector: function(v, a, b){
      var squared = [ Math.pow(v[0],2), Math.pow(v[1],2), Math.pow(v[2],2) ];
      var bottomTerm = (
        Math.sqrt( squared[0] + squared[1] + squared[2] ) *
        Math.sqrt( squared[a] + squared[b] )
      );
      return Math.acos( bottomTerm == 0 ? 0 :
        ( squared[a]+squared[b] / bottomTerm ) // took abs() off of top term
      );
    },
    xyPlaneAngleUsingPolar:function(pt){ return this._polar(pt,2,0,1); },
    xzPlaneAngleUsingPolar:function(pt){ return this._polar(pt,1,0,2); },
    yzPlaneAngleUsingPolar:function(pt){ return this._polar(pt,0,1,2); },
    _polar: function(pt,a,b,c){
      return this.halfPi - (
          this.halfPi - Math.atan(
            pt[a] / Math.sqrt( Math.pow(pt[b],2) + Math.pow(pt[c],2) )
          )
      );
    }
  };
  Tbuehlmann.xyAngle = Tbuehlmann.xyPlaneAngleUsingPlaneAndVector;
  Tbuehlmann.xzAngle = Tbuehlmann.xzPlaneAngleUsingPlaneAndVector;
  Tbuehlmann.yzAngle = Tbuehlmann.yzPlaneAngleUsingPlaneAndVector;


  var MoveableSceneObject = function(widget){
    this._init(widget);
    return this;
  };
  MoveableSceneObject.prototype = {
    isMoveableSceneObject:true,
    _init:function(widget){
      this.bb = widget.element; // bounding box
      this.wireframe = this.bb.find('ul').data('wireframe');
      if (this.bb.hasClass('spinnable')) this._initSpinnable();
    },
    getWireframe:function(){return this.wireframe;},
    _initSpinnable:function(){
      this.mouseState = 'ready';
      var me = this;
      this.bb.bind('mousedown',function(e,f){return me.mousedown(e,f);});
      this.bb.bind('mousemove',function(e,f){return me.mousemove(e,f);});
      this.bb.bind('mouseup',function(e,f){return me.mouseup(e,f);});
      // find frontmost z value for normalizing mouse drags.
      var idx = this.wireframe.winner(function(a,b){ return a[2]>b[2]; });
      this.frontmostZ = this.wireframe[idx][2];
    },
    _mouseVector: function(e){
      var v = Vector([e.pageX, e.pageY, this.frontmostZ]);
      v.timeStamp = e.timeStamp;
      return v;
    },
    mousedown:function(e,f){
        puts('md _mde'); _mde = e;
      e.stopPropagation();
      this.mouseState = 'down';
      this.wireframe.pause();
      this.m1 = this._mouseVector(e);
      return false;
    },
    mousemove: function(e,f){
      /*
      * mousedown happened and now mouse drag, so we have an x and y delta
      * (delta meaning how much was added or removed to x and y in this move.)
      * (often it's zero of one and one of the other). Imagine you have a pane
      * of plexiglass of the relevant 2 dimensions of the bounding box of the
      * object.
      * The edges have been sanded so you don't cut yourself.
      * The pane is parallel to the screen on the nose of the object
      * (at the frontmost z level when the object isn't rotated).
      * Your mousedrag makes a straight line segment between this current
      * point and the point of the last mousemove or mousedown.
      * Imagine we take a vis-a-vis® branch marker and draw a line on the
      * plexiglass, tracing the path of your mouse, but it starts from
      * world coordinates x:0 y:0 (probably the middle of the plexiglass)
      * to wherever. this line has the same orientation and length (magnitude)
      * as the line you drew with your mouse, but we have translated it to
      * start at world 0,0.
      * Rotations on the model (i.e. object) happen in terms of the
      * model's axes.  If the model has no rotation, a positive rotation
      * around X of (PI/4) will result in the model facing upward 45°.
      * No matter which direction the model is facing (no matter what
      * rotation the model currently has), if we apply this same rotation
      * the model will rotate the same way **relative to itself.**  If it's
      * facing downwards 45° and we apply X: +.25 π again, it
      * will end up looking straight at us. If it's facing us but upside down,
      * it will end up being still upside down but looking towards our feet.
      * (the model is a giant severed head, by the way.  Like a easter island
      * statue but more gruesome.)
      * So the problem is this: When we drag our mouse on the plexiglass
      * that's between the model and us, we expect it to move "that way",
      * but when we tell a model to rotate it has to be in terms of angles
      * relative to the model's
      * orientation at the time.  If we did a mouse drag up, but the model
      * is laying down on its right side and facing us, then we actually want
      * it to turn to its left.
      * The way we accomplish this is by rotating the plexiglass **with the
      * opposite rotation that the model has.**.  If the model is facing to
      * its right .5π (90ª) and looking up .25π (45º), and we dragged the
      * straight up on our plexiglass, we expect the model to fall to its
      * right a little and turn to its right a little (i think).
      * So in model coordinate terms, the model is floating in empty space
      * always facing us, with its origin at 0,0, and three numbers for its
      * current rotation amount.  We take our plexiglass and apply the
      * opposite  rotation (Y:-0.5π and an X: -0.25π) to it. (-1 times the
      * angles the model is rotated.)
      * In floating model universe, the plexiglass swivels around to the
      * model's left side (the right of the screen) and then tilts towards us
      * 45º (this last one acutally feels like a z-rotation roll kind of
      * movement to the plexiglass, but who cares.)
      * We have our little floating marker mark on the plexiglass still.
      * We want to treat the mark as a spherical vector.  We don't care
      * where it started and ended, we just care what the angles of change
      * are.  (3 dimensional rotations can be expressed with angles in only
      * two of the dimensions so we will get rotation around 2 of them.)
      * If we have a 3d point we can get its angle to the origin 0,0,0
      * with a magic trig formula (thanks a million tbuehlmann!)
      * If we do this to both points, we can take the difference of each
      * of their 2 angles to get the rotation that we want to pass
      * as a rotation request to the model.
      * that we pass of as a rotation request to the model.  Whew, that was
      * easy.  And you wonder why the trackball of your mouse always
      * used to jam up.  (maybe that's why then stopped making them?)
      */
      if ('down'!==this.mouseState) return false; // @todo false?
      e.stopPropagation(); // don't highlight/select text @todo test browsers

      var m1 = this.m1;
      var m2 = this._mouseVector(e);
      var m1norm = new Vector([0,0,m1[2]]);
      var m2norm = new Vector([m2[0]-m1[0], m2[1]-m1[1], m2[2]]);
      // m2[2] and m1[2] (z depth) are expected to always be the same.

      var plexiglassRotation = new
        Rotate(this.wireframe.currentAxisRotation.copy()).
          timesEquals([-1,-1,-1]);

      var dotOneRotated = plexiglassRotation.go(m1norm);
      var dotTwoRotated = plexiglassRotation.go(m2norm);


      var it = [m1[2],m1[2],m1[2]];
      m1vr.dividedByEquals(it);
      m2vr.dividedByEquals(it);


      tbuelmannXY = function(v){
        return Math.acos( Math.abs(v[2]) /
          Math.sqrt(Math.pow(v[0],2) + Math.pow(v[1],2) + Math.pow(v[2],2))
        );
      };
      // try acos(|v_2|/(1*sqrt(v_1^2 + v_2^2 + v_3^2)))
      tbuelmannXZ = function(v){
        return Math.acos(  Math.abs(v[1]) /
          Math.sqrt(Math.pow(v[0],2) + Math.pow(v[1],2) + Math.pow(v[2],2))
        );
      };
      var xyangle1 = tbuelmannXY(m1vr);
      var xyangle2 = tbuelmannXY(m2vr);
      var zrot = xyangle2 - xyangle1;
      var xzangle1 = tbuelmannXZ(m1vr);
      var xzangle2 = tbuelmannXZ(m2vr);
      var yrot = xzangle2 - xzangle1;
      var rotRequest = {requester: this, rotationDelta:[0, yrot, zrot],m2:m2};
      this.wireframe.rotationRequest(rotRequest);
      return false;
    },
    rotationFulfilled: function(origRequest){
      this.m1 = origRequest.m2;
    },
    mouseup:function(e,f){
      if ('down'!==this.mouseState) return;
      this.mouseState = 'ready';
      puts('mu _mue'); _mue = e;
      this.wireframe.resume();
    }
  };

  var CssWireframe = function(sc, ul){
    ul = $(ul);
    var me, li = ul.children();
    me = extend(new AbstractWireframe(li.length),CssWireframe.prototype);
    me.init(sc, ul, li);
    return me;
  };
  CssWireframe.prototype = {
    init:function(sc, ul, li){
      AbstractWireframe.prototype.init.call(this, sc);
        // for other widgets that need a handle to this:
      ul.data('wireframe',this);
      new CssWireframe.Parse(this, ul, li); // has state but we don't keep it
      this.initScreenPoints();
    },
    makeEmptyScreenPoint: function(innatePt, idx){
      return new CssScreenPoint(innatePt.element);
    }
  };
  CssWireframe.Parse = function(wireframe, ul, li){
    this.wireframe = wireframe;
    this.parseIn(ul, li);
  };

  /**
  * to make life both a little easier and a little more complicated
  * want to assert that all elements in some kind of group
  * (either all li's, or one ul) have top and left positions
  * that are each and all expressed using any unit but the same unit
  * (em, picas, pixels, cubits, etc.)  That is, each and every top
  * and left of each element parsed with this thing must use the same
  * unit as all the others parsed with this thing. For now it is constructed
  * with one element from that group, just to get the unit to use for the
  * assertions.
  */
  CssWireframe.Parse.UnitParser = function(el){
    var p = this.topAndLeft(el);
    this.assertUnit = p.left.unit;
    return this;
  };
  CssWireframe.Parse.UnitParser.prototype = {
    unitRe : /^(-?\d(?:\.d+)?)([a-z]+)$/,
    left: function(el){ return this._(el,'left'); },
    top: function(el){ return this._(el,'top'); },
    topAndLeft: function(el){
      var t = this._(el,'top');
      var l = this._(el,'left');
      if (t.unit !== l.unit) {
        return fatal('top and left units must be the same, had "'+
          t.orig+'" and "'+l.orig+'"');
      }
      return {left: l, top: t};
    },
    _:function(el,which){
      var str = el.css(which);
      var match = this.unitRe.exec(str);
      if (!match) return fatal('failed to parse '+which+': '+str);
      var rslt = {
        orig: match[0],
        unit: match[2],
        units: parseFloat(match[1])
      };
      if (this.assertUnit && rslt.unit !== this.assertUnit) {
        return fatal('ne "'+this.assertUnit+'" had "'+rslt.unit+'"'+
          " ("+rslt.orig+")");
      }
      return rslt;
    }
  };

  /** a lot of boring annoying code goes into trying to implement our
  * "represent models with css" bs.
  */
  CssWireframe.Parse.prototype = {
    intRe: /^-?\d+$/, // parseInt is too lenient
    parseIn:function(ul, li){
      this.idx = li.length - 1;
      if (this.idx===-1) return;
      this.front(ul, li);
      this.back(ul, li);
      this.lookForCenterOfRotationAndTranslate(ul, li);
    },
    front: function(ul,li){
      var parentOffset = ul.offset();
      var el = $(li[this.idx]);
      var frontZindex = this.zIndex(el);
      var zIndex = frontZindex;
      this.unitParser = new CssWireframe.Parse.UnitParser(el);
      var map = new Vector([new Vector([]), new Vector([])]);
      map[0].name = 'left'; map[1].name = 'top';
      map.left = map[0]; map.top = map[1];
      while (zIndex===frontZindex) {
        var o = el.offset();
        var relScreenX = o.left - parentOffset.left;
        var relScreenY = o.top - parentOffset.top;
        var pos = this.unitParser.topAndLeft(el);
        map.left.push({units:pos.left.units, screen:relScreenX});
        map.top.push({units:pos.top.units, screen:relScreenY});
        var newPt = new Vector([relScreenX, relScreenY, zIndex]);
        this.wireframe[this.idx] = newPt;
        newPt.element = el;
        if (-1===--this.idx) break;
        el = $(li[this.idx]);
        zIndex = this.zIndex(el);
      }
      if (1===li.length) return null; // not sure about this wrt zIndex
      this.norm = this.makeNormalizer(map, frontZindex);
      for (var i=this.wireframe.length-1; i>this.idx; i--){
        var wireframePt = this.wireframe[i];
        el = wireframePt.element;
        var normZ = this.norm.depth.relativeScreenPx(el);
        wireframePt[2] = normZ;
      }
      return null;
    },
    back: function(ul,li){
      var idx = this.idx, norm = this.norm;
      while(-1<idx){
        var el = $(li[idx]);
        var newPt = new Vector([
          norm.left.relativeScreenPx(el),
          norm.top.relativeScreenPx(el),
          norm.depth.relativeScreenPx(el)
        ]);
        newPt.element = el;
        this.wireframe[idx] = newPt;
        idx--;
      }
    },

    lookForCenterOfRotationAndTranslate: function(ul,li){
      var ctr = ul.find('li.center-of-rotation');
      if (0===ctr.length) return null;
      if (1!==ctr.length) return fatal('multiple centers?');
      var idx = ctr.prevAll().length;
      var pt = this.wireframe[idx];
      // if this is too ugly we can do it in front() and back()
      if (!pt || pt.element[0] !== ctr[0]) {
        return fatal("something wrong with our logic for finding center.");
      }
      var relScreenPxCtrPoint = pt.copy();
      var delta = relScreenPxCtrPoint.copy().timesEquals([-1,-1,-1]);
      // translate all points by the delta from this ctr point
      this.wireframe.each(function(pt,idx){
        pt.plusEquals(delta);
      });

      // this is just dick-tarded: translate the parent element (ul)
      // by the negative of the delta (that is, the original
      // relative screen top and screen left) to offset the change we just
      // made and for now assert that it is
      // in px (but if we need to we can let it handle other units somehow)
      // in practice the parent element is usually position: relative, 0px/0px

      var p = new CssWireframe.Parse.UnitParser(ul);
      var tl = p.topAndLeft(ul);
      if (! 'px'==tl.left.unit ) return fatal('for now need px for ul');
      var x = tl.left.units + relScreenPxCtrPoint[0];
      var y = tl.top.units + relScreenPxCtrPoint[1];
      var cssReq = {top: y+'px', left: x+'px'};
      var cssOld = {top: tl.top.units+'px', left: tl.left.units+'px'};
      this.wireframe.beforeRun(function(){ ul.css(cssReq); });
      this.wireframe.afterRun(function(){ ul.css(cssOld); });
      return null;
    },

    /*
    * you have a list of x and y points in terms of css element units
    * (e.g 'em' or 'px') and you have a list of the their relative screen
    * pixels (relative to the containing element).  Find out how long
    * a css unit is (e.g. an 'em') in terms of pixels (at this front level)
    * by subtracting the leftmost point from the rightmost, and topmost
    * from the bottom, and dividing by the number of units in between.
    * since you know the relative screen pixel location of these points,
    * you can make a normalizer.
    */
    makeNormalizer:function(map, frontZindex){
      var p = this;
      var normV = new Vector([null,null,null]);
      map.each(function(axis, idx){
        var minIdx = axis.winner(function(a,b){return a.units < b.units;});
        var maxIdx = axis.winner(function(a,b){return a.units > b.units;});
        var minRec = axis[minIdx], maxRec = axis[maxIdx];
        var min = minRec.units, max = maxRec.units;
        if (max - min < 1) return p.boundsTooClose(axis,min,max);
        var unitLength = (maxRec.screen-minRec.screen) /
          (maxRec.units - minRec.units);
        var normalizer = {
         unitLength:       unitLength,
         offsettingUnits:  minRec.units,
         offsettingAmount: minRec.screen,
         axisName:         axis.name
        };
        normalizer.relativeScreenPx = function(el){
          var thisUnits = p.unitParser[this.axisName](el).units;
          var rslt = (thisUnits - this.offsettingUnits) *
            this.unitLength + this.offsettingAmount;
          return rslt;
        };
        normV[idx] = normalizer;
        normV[axis.name] = normalizer;
        return null;
      });
      this.makeZindexNormalizer(normV, frontZindex);
      return normV;
    },
    makeZindexNormalizer: function(normV, frontZindex){
      var parse = this;
      var zIndexNormalizer = {
        // we arbitrarily choose left not top to normalize z-Index
        unitLength: normV.left.unitLength,
        frontZindex : frontZindex,
        relativeScreenPx: function(el){
          var zIndex = parse.zIndex(el);
          var rslt = (this.frontZindex - zIndex) * this.unitLength;
          return rslt;
        }
      };
      normV[2] = normV.depth = zIndexNormalizer;
      return null;
    },
    boundsTooClose: function(axis,min,max){
      return fatal("for now, min and max "+
        axis.name+' '+this.assertUnit+" must be at least one "+
        +this.assertUnit+" apart from each other in front level. "+
        "Had "+min+" and "+max);
    },
    zIndex:function(el){
      var str = el.css('zIndex'), rslt;
      if (!(this.intRe.exec(str))) return fatal("bad z-index: "+str);
      return parseInt(str,10);
    }
  };

  // ********************* end css-specific code ********************

  // ********************* start jquery-specific code ***************

  $.widget('ui.hipe_terd_scene',{
    _init: function(){
      this.sceneController = new SceneController(this.options);
      this.addFipsListenersIfThereAreAny();
      this.addWireframes();
      if (this.options.startRunningAnimationRightAway)
        this.sceneController.run();
    },
    addFipsListenersIfThereAreAny: function(){
      var els = this.element.find('.fps-listener .live-data');
      if (els.length) this.sceneController.addFipsListener(function(fpsData){
        var s = 'actual fps: '+fpsData.actualFps.toFixed(1)+' '+
                'capacity: '+fpsData.percentCapacity.toFixed(1)+"% "+
                'potential fps: '+fpsData.potentialFps.toFixed(1);
        els.html(s);
      });
    },
    addWireframes: function(){
      var me = this;
      var sc = this.sceneController;
      this.element.find(
      'ul.this-ul-is-actually-a-wireframe-model-of-a-three-dimensional-object'
      ).each(function(){
        var wf = new CssWireframe(sc, this);
        me.sceneController.addWireframe(wf);
      });
    }
  });

  $.widget('ui.hipe_terd_object',{
    _init:function(){
      var moveable = new MoveableSceneObject(this);
      var sl = this.element.find('.state-listener .live-data');
      if (sl.length) {
        var wf = moveable.getWireframe();
        wf.addStateListener(function(data){
          var str = "current rotation:\n"+'x: '+data.rot.x.toFixed(3)+
            ' y: '+data.rot.y.toFixed(3)+' z: '+data.rot.z.toFixed(3);
          sl.html(str);
        });
      }
    }
  });

  $.widget('ui.hipe_terd_lib',{
    _init:function(){},
    lib:function(){
      return { Vector:Vector, Rotate: Rotate, list:list,
        extend:extend, Tbuehlmann: Tbuehlmann
      };
    }
  });

  // ****************** end jquery-specific code ***********************

})(jQuery);
