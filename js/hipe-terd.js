/**
* hipe-terd 0.0.0pre
*
* terd: Three-dimensional engine for ECMAScript Redundantly Duplicated
*
* Copyright 2010, Mark Meves
* Dual licensed under the MIT or GPL Version 2 licenses.
* (the same license as jquery: http://docs.jquery.com/License)
*
* At the core of this is some code from devirtuoso, without whom
*   i would have had to spend many many more hours on this
*  www.devirtuoso.com
*
* Depends:
* ui.core.js
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
    throw new Error(msg);
  };

  var list=function(){
    var args = arguments.length===1&&('number'===typeof(arguments[0].length))?
     arguments[0] : arguments;
    args.each = function(f){
      for(var i=0; i<args.length; i++){
        f(args[i]);
      };
      return args;
    };
    return args;
  };


  // ************ core prototypes *****************************

  var Vector = function(arr){
    return extend(arr,Vector.prototype);
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
    plusEquals: function(vector){
      return this.each(function(val,idx){ this[idx]+=vector[idx];});
    },
    timesEquals: function(vector){
      return this.each(function(val,idx){ this[idx]*=vector[idx];});
    },
    minusEquals: function(vector){
      return this.each(function(val,idx){ this[idx]-=vector[idx];});
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
    isCamera: true,
    scaleRatio: function(item){
      // @todo -- divide by zero!! FIXME @FIXME TODO @TODO
      return this.focalLength/(this.focalLength + item[2] - this[2]);
    }
  };

  var Moveable = function(){};
  Moveable.prototype = {};

  var AbstractWireframe = function(length){
    var me =
      extend(new Vector(new Array(length)), AbstractWireframe.prototype);
    me._beforeRun = [];
    me._afterRun = [];
    me.state = 'ready';
    me.stateListeners = null;
    return me;
  };
  AbstractWireframe.prototype = {
    isAbstractWireframe: true,
    prototypeFunction: AbstractWireframe,
    abstractWireframePostInit: function(){
      this.screenPoints = new Vector(new Array(this.length));
      var wireframe = this;
      this.screenPoints.each(function(value,idx){
        this[idx] = wireframe.makeEmptyScreenPoint(wireframe[idx], idx);
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
    setCamera:function(c){this.camera = c;},
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
    render: function() {
      if ('ready'!==this.state) return;
      // @todo unwrapping the calls to map
      var rotation = this.currentAxisRotation;
      var sin = rotation.map(function(x){return Math.sin(x);});
      var cos = rotation.map(function(x){return Math.cos(x);});
      var screenPoints = this.screenPoints;
      this.each(function(pt,idx){
        var _cos = cos, _sin = sin; // @todo just for debugging
        // rotation around x
        var xy = cos[0]*pt[1] - sin[0]*pt[2];
        var xz = sin[0]*pt[1] + cos[0]*pt[2];
        // rotation around y
        var yz = cos[1]*xz - sin[1]*pt[0];
        var yx = sin[1]*xz + cos[1]*pt[0];
        // rotation around z
        var zx = cos[2]*yx - sin[2]*xy;
        var zy = sin[2]*yx + cos[2]*xy;

        var scaleFactor = this.camera.focalLength/
          (this.camera.focalLength + yz);
        var x = zx*scaleFactor;
        var y = zy*scaleFactor;
        //var z = -yz;

        var screenPt = screenPoints[idx];
        screenPt.setPointAndRender(x,y,scaleFactor);
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
      wireframe.setCamera(this.camera);
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
    setPointAndRender: function(x,y,scaleFactor){
      var cssRequest = {
        fontSize: 100 * scaleFactor + '%',
        left: y+'px',
        top: x+'px',
        opacity: scaleFactor - 0.5
      };
      this.element.css(cssRequest);
    }
  };


  var MoveableSceneObject = function(widget){
    this._init(widget);
    return this;
  };
  MoveableSceneObject.prototype = {
    isMoveableSceneObject:true,
    // a mouse's positive y goes down, a rot. vector's positive y goes up
    changeMouseMoveToRotation: new Vector([0.0035, -0.0035]),
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
    },
    _mouseVector: function(e){
      var v = Vector([e.pageX, e.pageY]);
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
      if ('down'!==this.mouseState) return false; /* @todo */
        puts('mm _mme'); _mme = e;
      e.stopPropagation();
      var m2 = this._mouseVector(e);
      var move = m2.copy().minusEquals(this.m1);
      var rotDelta = move.copy().timesEquals(this.changeMouseMoveToRotation);
      rotDelta[2] = 0.0; // ignoring z-axis for now.. @todo
      var rotationRequest = {
        rotationDelta : rotDelta, m1: this.m1, m2:m2,
        requester: this, stateAfterRotation: 'paused'
      };
      // this.wireframe.clearRotationDelta(); //
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
    }
  };

  var CssWireframe = function(sc, ul){
    ul = $(ul);
    var me, li = ul.children();
    me = extend(new AbstractWireframe(li.length),CssWireframe.prototype);
    me.sceneController = sc;
    ul.data('wireframe',me);
    new CssWireframe.Parse(me, ul, li); // has state but we don't keep it
    me.abstractWireframePostInit();
    return me;
  };
  CssWireframe.prototype = {
    makeEmptyScreenPoint: function(innatePt, idx){
      var rslt = new CssScreenPoint(innatePt.element);
      return rslt;
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

  // ****************** end jquery-specific code ***********************

})(jQuery);
