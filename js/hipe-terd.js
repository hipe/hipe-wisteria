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
* Code & Architecture Conventions:
*  - tabs are two space characters, no exceptions. no trailing whitespace on
*    lines.  all files end with exactly one newline.  Lines max 80 chars wide.
*  - keep dependency on jquery light -- widgets are only for crawling the dom
*    and interfacing to our controller classes.  these are jquery plugins,
*    but only superficially.
*  - never use globals.  never use globals.  window.* namespace is used
*    only for debugging.  use library pattern for exporting parts of this api.
*  - all members are private. if you access them know what
*    you are doing.  methods with leading underscores are private.  members
*    are named with leading underscores only to differentiate them from
*    methods with the same name.
*  - inheiritance hierarchies should never be more than 2 deep.  we are making
*    javascript software; not a neural network, and certainly not a java app.
*  - avoid long methods.  methods should fit into one screen.  this makes them
*    easier both to read/understand and to debug.
*  - as opposed to a heavy dependence on mixins, make spearate controller
*    objects for separate functionality. (avoid accidental god objects.)
*  - comments lie.  comment only when necessary to explain a complex
*    algorithm or ostensibly questionalble logic. avoid complex algorithms
*    and ostensibly questionable logic.
*
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
*  of about three and counting..).  I owe special thank you's to
*  ddfreyne and Tobias Bühlmann for exposing me to the kinds of
*  trig that would be necessary for this, and to Tobias
*  for even benchmarking three possible solutions for me.
*
*/
(function($) {

  // ************ "constants" **********************
  var X=0, Y=1, Z=2;
  var xyz = ['x','y','z']; // inverse of above, for messages

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
    args.last = function(){ return args[args.length-1]; };
    args.each = function(f){
      for(var i=0; i<args.length; i++){
        f(args[i]);
      };
      return args; // return the list when you call each()
    };
    return args; // return the argument when you build the list()
  };


  // ************ core data structures and transformations ************

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
			for (
			  var value = this[0];
        i < length && f.call(this, value, i) !== false;
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
    equals:function(v2){
      var rslt = true;
      this.each(function(val,idx){
        if (v2[idx]!==val) {rslt = false; return false;}
      });
      return rslt;
    },
    min: function(){return this[this.minIndex()];},
    max: function(){return this[this.maxIndex()];},
    minIndex: function(){return this.winnner(function(a,b){return a<b;});},
    maxIndex: function(){return this.winnner(function(a,b){return a>b;});},
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
    },
    selectIndexes: function(f){
      var rslt = [];
      this.each(function(val,idx){if(f(val)) rslt.push(idx);});
      return rslt;
    },
    sortedIndexes: function(f){
      var sortme = this.copy().sort(f);
      var map = {}, result = new Array(this.length);
      for(var i = this.length-1; i>=0; i--){
        var val = sortme[i];
        var minIdx = undefined===map[val] ? 0 : map[val];
        var idx = this.indexOf(val,minIdx);
        result[i] = idx;
        map[val] = idx;
      }
      return result;
    }
  };


  /** @constructor */
  var Rotate = function(){
    var me = extend(new Vector(new Array(3)), Rotate.prototype);
    if (arguments[0]) me.set(arguments[0]);
    me.focalLength = null;
    return me;
  };
  Rotate.prototype = {
    inspect: function(){
      return Vector.prototype.inspect.call(this) + ' fl: '+this.focalLength;
    },
    setFocalLength: function(len){ this.focalLength = len; },
    set:function(rotate){
      Vector.prototype.set.call(this, rotate);
      this.sin = this.map(function(x){return Math.sin(x);});
      this.cos = this.map(function(x){return Math.cos(x);});
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


  /**
  * Get the angle that a 3d point makes from 0,0,0 to it on one of the planes.
  */
  var Angle = {
    xyPlaneAngleUsingAtan: function(pt){ return this._atan(pt, Y, X); },
    yzPlaneAngleUsingAtan: function(pt){ return this._atan(pt, Y, Z); },
    xzPlaneAngleUsingAtan: function(pt){ return this._atan(pt, Z, X); },
    _atan: function(pt,oppIdx,adjIdx){
      if (pt[adjIdx]===0){
        if (pt[oppIdx]===0) {
          var e = new Error("angle undefined for "+xyz[oppIdx]+":0"+
            xyz[adjIdx]+":0 ");
          e.type = 'angleUndefined';
          throw e;
        }
        return 0.0;
      }
      return Math.atan(pt[oppIdx]/pt[adjIdx]);
    },
    /*
    * return a new vector whose each component is the point's angle of
    * rotation around that corresponding axis off the relevant plane.
    */
    vector: function(pt){
      return new Vector([
        this.yzPlaneAngleUsingAtan(pt),
        this.xzPlaneAngleUsingAtan(pt),
        this.xyPlaneAngleUsingAtan(pt)
      ]);
    }
  };
  Angle.xy = Angle.xyPlaneAngleUsingAtan;
  Angle.yz = Angle.yzPlaneAngleUsingAtan;
  Angle.xz = Angle.xzPlaneAngleUsingAtan;


  // ****** debugging support *******************

  var DataView = function(msg){
    this.msg = msg;
    this._init();
  };
  DataView.prototype = {
    _init:function(){
      this.element = $(
        "<div class='data-view-centering-wrap'>     "+
        "  <div class='data-view'>                  "+
        "    <span class='live-data'>hi</span>      "+
        "    <br/>                                  "+
        "    <button class='ok'>ok</button>         "+
        "  </div>                                   "+
        "</div>"
      );
      this.element.css('display','none');
      this.element.find('.live-data').html(this.msg);
      var me = this;
      this.element.find('button.ok').bind('click',function(e){
        me.destroy();
      });
      $('html body').append(this.element);
    },
    show:function(){
      this.element.show();
    },
    destroy: function(){
      this.element.remove();
    }
  };


  // ****** non-implementation specific modeling & scene classes ***********

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

  var AbstractModel = function(sceneController,options){
    this.sceneController = sceneController;
    this._init(options);
  };
  AbstractModel.prototype = {
    _init:function(opts) {
      this.element = opts.element;
      this._goWireframe(opts);
      var rotD = opts.initialRotationDelta || [0,0.01,0];
      var rot = opts.initialRotation || [0,0,0];
      this.wireframe.setCurrentAxisRotationAndRotationDelta(rot,rotD);
      if (opts.positionListener) this._goPosListener(opts);
      this.motionControllers = [];
      if (opts.rotatable) this.motionControllers.push(
        new RotationController(this, opts)
      );
      this.sceneController.addModel(this);
    },
    getWireframe:function(){
      if (!this.wireframe) return fatal('why no wireframe?');
      return this.wireframe;
    },
    _goWireframe:function(opts){
      var el = this.element.find(
      'ul.this-ul-is-actually-a-wireframe-model-of-a-three-dimensional-object'
      );
      if (1!==el.length) return fatal("for now need exactly 1 UL wireframe");
      opts.ul = el;
      this.wireframe = new CssWireframe(this.sceneController, this, opts);
      return null;
    },
    _goPosListener: function(opts){
      var els = opts.positionListener;
      this.wireframe.addPositionListener(function(data){
        var str = "current rotation:\n"+'x: '+data.rot.x.toFixed(3)+
        ' y: '+data.rot.y.toFixed(3)+' z: '+data.rot.z.toFixed(3);
        els.html(str);
      });
    }
  };


  var AbstractWireframe = function(length){
    return extend(new Vector(new Array(length)), AbstractWireframe.prototype);
  };
  AbstractWireframe.prototype = {
    isAbstractWireframe: true,
    prototypeFunction: AbstractWireframe,
    init: function(sceneController, model){
      this.model = model;
      this.sceneController = sceneController;
      this._beforeRun = [];
      this._afterRun = [];
      this.state = 'ready';
      this.posListeners = null;
      this.rotateTransform = new Rotate(new Array(3));
      this.rotateTransform.setFocalLength(
        this.sceneController.getCamera().getFocalLength()
      );
    },
    _initScreenPoints: function(){
      this.screenPoints = new Vector(new Array(this.length));
      var wireframe = this;
      this.screenPoints.each(function(value,idx){
        this[idx] = wireframe.makeEmptyScreenPoint(wireframe[idx]);
      });
    },
    addPositionListener:function(f){
      if (!this.posListeners) this.posListeners = [];
      this.posListeners.push(f);
    },
    _notifyPositionListeners: function(){
      var rot = this.currentAxisRotation;
      var data = { rot: {x:rot[0],y:rot[1],z:rot[2]}};
      list(this.posListeners).each(function(f){f(data);});
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
      if (this.posListeners) this._notifyPositionListeners();
      this.state = 'ready'; // watch this! ...
    },
    setCurrentAxisRotationAndRotationDelta: function(a,b){
      list(a,b).each(function(c){
        if (!c) return fatal("bad rotation data");
        if (!c.isVector) extend(c, Vector.prototype);
        return null;
      });
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

  var SceneController = function(options){
    var me = extend(new Vector([]), SceneController.prototype);
    me.options = options;
    me._init();
    return me;
  };
  SceneController.prototype = {
    isSceneController: true,
    _init: function(){
      var opts = this.options;
      this.state = 'ready';
      this._setTargetMsecPerFrame();
      // camera position is not used in this engine currently
      if (!opts.cameraPosition) opts.cameraPosition = [0,0,0];
      if (!opts.cameraFocalLength) opts.cameraFocalLength = 450;
      this.camera = new Camera(
        opts.cameraPosition,
        opts.cameraFocalLength
      );
      this.fipsListeners = null;
      if (opts.fipsListener) this._goFipsListener(opts);
      this.updateFipsEvery = 2000;
    },
    _goFipsListener: function(opts){
      var els = opts.fipsListener;
      this.addFipsListener(function(fpsData){
        var s = 'actual fps: '+fpsData.actualFps.toFixed(1)+' '+
                'capacity: '+fpsData.percentCapacity.toFixed(1)+"% "+
                'potential fps: '+fpsData.potentialFps.toFixed(1);
        els.html(s);
      });
    },
    addFipsListener: function(f){
      if (!this.fipsListeners) this.fipsListeners = [];
      this.fipsListeners.push(f);
    },
    addModel:function(model){
      this.push(model.getWireframe());
      if ( 'running'!==this.state &&
        'when model is added'===this.options.startEngine
      ) this.run();
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



  //****************** css-specific implementation ********************

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

  /** @constructor **/
  var RotationController = function(model,opts){
    this._init(model,opts);
  };
  RotationController.prototype = {
    isRotationController:true,
    _init:function(model, opts){
      this.bb = model.element; // bounding box
      this.wireframe = model.wireframe;
      this.mouseState = 'ready';
      var me = this;
      this.bb.bind('mousedown',function(e,f){return me.mousedown(e,f);});
      this.bb.bind('mousemove',function(e,f){return me.mousemove(e,f);});
      this.bb.bind('mouseup',function(e,f){return me.mouseup(e,f);});
      // find frontmost z value for normalizing mouse drags.
      var idx = this.wireframe.winner(function(a,b){ return a[Z]>b[Z]; });
      this.frontmostZ = this.wireframe[idx][Z];
      this.doRecordRotations = opts.recordRotations;
    },
    _mouseVector: function(e){
      var v = Vector([e.pageX, e.pageY, this.frontmostZ]);
      v.timeStamp = e.timeStamp;
      return v;
    },
    mousedown:function(e,f){
      e.stopPropagation();
      this.mouseState = 'down';
      this.m1 = this._mouseVector(e);
      this._startInteractiveRotationSession();
      return false;
    },
    _startInteractiveRotationSession: function(){
      this.wireframe.pause();
      if (this.doRecordRotations){
        this.recordings = [
          {type:'mousedown',vector: this.m1}
        ];
        var me = this;
        // we want to overwrite this at the beginning of each
        // session in case there are others
        window._view = function(){
          new DataView(me.json().stringify(me.recordings)).show();
        };
      }
    },
    json: function(){
      if (!window.JSON) return fatal("no native JSON implementation.");
      return window.JSON;
    },
    mousemove: function(e,f){
      if ('down'!==this.mouseState) return false; // @todo false?
      e.stopPropagation(); // don't highlight/select text @todo test browsers
      var m1 = this.m1;
      var m2 = this._mouseVector(e);
      if (m2.equals(m1)) return false;
      var car = this.wireframe.currentAxisRotation;
      var angleVectorVector =
        RotationController.getRotationDeltaFromMouseMove(car,m1,m2);
      var rotationRequest = {
        requester: this,
        rotationDelta:angleVectorVector,
        stateAfterRotation: 'paused',
        m2:m2
      };
      if (this.doRecordRotations) {
        var rotReqSubset = { // don't jsonify 'requester' etc
          rotationDelta:rotationRequest.rotationDelta,
          m2:rotationRequest.m2
        };
        this.recordings.push({
          type:   'mousemove',
          input: {car: car, m1: m1, m2: m2},
          rotationRequest: rotReqSubset
        });
      }
      this.wireframe.rotationRequest(rotationRequest);
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
      if (this.doRecordRotations){ puts('recorded. try _view();');}
    }
  };

  RotationController.getRotationDeltaFromMouseMove = function(
    currentAxisRotation, m1, m2
  ){
    var m1norm = new Vector([0,0,m1[Z]]);
    var m2norm = new Vector([m2[X]-m1[X], m2[Y]-m1[Y], m2[Z]]);
    // m2[2] and m1[2] (z depth) are expected to always be the same.
    var plexiglassRotation = new Rotate(currentAxisRotation).
      timesEquals([-1,-1,-1]);
    var dotOneRotated = plexiglassRotation.go(m1norm);
    var dotTwoRotated = plexiglassRotation.go(m2norm);
    var angleVectorOne = Angle.vector(dotOneRotated);
    var angleVectorTwo = Angle.vector(dotTwoRotated);
    var v = angleVectorTwo.copy().minusEquals(angleVectorOne);
    // a hack: we get bad results when points are close to origin
    // we probably shouldn't be returning three angles.
    // for now we zeroify the outlier unless the other two are zero @todo
    var s = v.sortedIndexes(function(a,b){
      return Math.abs(a) < Math.abs(b) ? -1 : 1;
    });
    if (!(0==v[s[0]] && 0==v[s[1]])) {
      var eraseme = Math.abs(v[s[0]]-v[s[1]]) > Math.abs(v[s[1]]-v[s[2]]) ?
        s[0] : s[2];
      v[eraseme] = 0.0;
    }
    // pos rotation is down, left, clockwise
    return v;
  };


  var CssWireframe = function(sc, model, opts){
    var ul = opts.ul;
    var li = ul.children(), me;
    me = extend(new AbstractWireframe(li.length),CssWireframe.prototype);
    opts.ul = ul;
    opts.li = li;
    me.init(sc, model, opts);
    return me;
  };
  CssWireframe.prototype = {
    init:function(sc, model, opts){
      AbstractWireframe.prototype.init.call(this, sc, model, opts);
        // a parse object has state but we don't keep it:
      new CssWireframe.Parse(this, opts.ul, opts.li);
      this._initScreenPoints();
    },
    makeEmptyScreenPoint: function(innatePt, idx){
      return new CssScreenPoint(innatePt.element);
    }
  };
  CssWireframe.enableDebugCoordinates = function(wireframe, pt){
    pt.element.bind('mouseover',function(e){
      var el = pt.element.find('.coordinates');
      if (!el.length) {
        var display = $('<pre class="coordinates">hi</pre>');
        pt.element.append(display);
        el = pt.element.find('.coordinates'); // just to be safe ?
        var sp = wireframe.screenPoints[pt.idx];
        wireframe.sceneController.addFipsListener(function(_){
          if (!pt.showCoords) return;
          var s = "innate: ["+pt.idx+"] x:"+pt[0]+" y:"+pt[1]+"\n"+
                  "screen: x:"+sp[0].toFixed(2)+
                  "y:"+sp[1].toFixed(2)+" sf:"+sp.scaleFactor.toFixed(2);
          el.html(s);
        });
      }
      el.show();
      pt.showCoords = true;
      setTimeout(function(){el.hide(); pt.showCoords = false; },15000);
    });
  };

  CssWireframe.Parse = function(wireframe, ul, li){
    this.wireframe = wireframe;
    this.doDebugCoordinates =
      wireframe.sceneController.options.debugCoordinates;
    this.parseIn(ul, li);
  };

  /**
  * to make life both a little easier and a little more complicated
  * we want to assert that all elements in some kind of group
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
        newPt.idx = this.idx;
        if (this.doDebugCoordinates) {
          CssWireframe.enableDebugCoordinates(this.wireframe, newPt);
        }
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
        wireframePt[Z] = normZ;
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
        newPt.idx = idx;
        if (this.doDebugCoordinates) {
          CssWireframe.enableDebugCoordinates(this.wireframe, newPt);
        }
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
      normV[Z] = normV.depth = zIndexNormalizer;
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

  // ********************* jquery-specific  ***************

  $.widget('ui.hipe_terd_scene',{
    _init: function(){
      var fl = this.element.find('.fps-listener .live-data');
      if (fl.length) this.options.fipsListener = fl;
      this.sceneController = new SceneController(this.options);
    }
  });

  $.widget('ui.hipe_terd_model',{
    _init:function(){
      var sceneController;
      var sl = this.element.find('.position-listener .live-data');
      if (sl.length) this.options.positionListener = sl;
      this.options.element = $(this.element);
      var ts = this.element.parents('.terd-scene:eq(0)');
      if (!ts.length) return fatal("parent scene not found");
      if (!(sceneController = ts.data('hipe_terd_scene').sceneController))
        return fatal("scene controller not found");
      this.model = new AbstractModel(sceneController, this.options);
      return null;
    }
  });

  $.widget('ui.hipe_terd_lib',{
    _init:function(){},
    lib:function(){
      return { Vector:Vector, Rotate: Rotate, list:list,
        extend:extend, Angle: Angle,
        RotationController: RotationController
      };
    }
  });

  // ****************** end jquery-specific code ***********************

})(jQuery);
