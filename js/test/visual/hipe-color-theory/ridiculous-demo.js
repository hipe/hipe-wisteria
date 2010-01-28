/**
* hipe-color-theory-ridiculous-demo 0.0.0pre
*
* copyright (c) 2010 mark meves
* dual licensed under the MIT (MIT-LICENSE.txt)
* and GPL (GPL-LICENSE.txt) licenses.
*
* Depends:
* ui.core.js
* ui.hipe_color_theory
* ui.draggable
*/
(function($) {

  var debug = true;
  var debugZoneage = false;
  var debugDrag = false;

  var puts = function(msg){
    msg = 'ctr '+msg;
    return window['console'] ? window.console.log(msg) : null;
  };

  var fatal = function(msg) {
    msg = 'color theory ridiculous '+msg;
    throw new Error(msg);
  };

  var valueInspect = function(mixed){
    return ""+mixed;
  };

  var arrayInspect = function(arr){
    if ('number'!==typeof(arr.length)){
      return "Not an array: "+valueInspect(arr);
    }
    var cels = [];
    for (var i=0; i<arr.length; i++){
      cels.push(valueInspect(arr[i]));
    }
    return '['+cels.join(',')+']';
  };

  var _3dPointInspect = function(y,x,z){
    return "["+y+"]["+x+"]["+z+"]";
  };

  var Matrix = function(){
    me = new Array();
    return $.extend(me, Matrix.prototype);
  };
  Matrix.prototype = {
    isMatrix: true,
    matrixInspect: function(){
      if (0===this.length) return "[empty matrix]";
      var lines = [];
      for(var i=0;i<this.length;i++){
        if (!this[i]) {
          lines.push(''+i+": "+valueInspect(this[i]));
          continue;
        }
        var cels = [];
        for (var j=0; j<this[i].length; j++){
          if (!this[i][j]) {
            cels.push(valueInspect(this[i][j]));
          } else {
            cels.push(''+this[i][j]);
          }
        }
        lines.push(''+i+": ["+cels.join('][')+']');
      }
      return lines.join("\n");
    }
  };

  /**
  * given two matrices with elements treated as true-ish and false-ish,
  * return an object with a 'left' and 'right' property, the left
  * being a matrix of elements that are true-ish before and not after, and
  * the right being those that are true-ish after but not before.
  * no center is returned for now.
  */
  Matrix.binaryDiff = function(before,after){
    var left = new Matrix();
    var right = new Matrix();
    var i = Math.max(before.length, after.length)-1;
    for (; i>=0; i--){
      if (undefined===before[i]){
        if (undefined===after[i]){ }
        else{ right[i] = after[i];}  // shallow
      } else {
        if (undefined===after[i]){
          left[i] = before[i]; // shallow
        } else {
          var j = Math.max(before[i].length, after[i].length)-1;
          for (;j>=0;j--){
            if (before[i][j]){
              if (after[i][j]){
                // nothing for now - no center returned
              } else {
                if (!left[i]) left[i] = [];
                left[i][j] = 1;
              }
            } else {
              if (after[i][j]){
                if (!right[i]) right[i] = [];
                right[i][j] = 1;
              }
            }
          }
        }
      }
    }
    return {left:left, right:right};
  };

  /** @constructor */
  var Dimensions = function(){};
  Dimensions.prototype = {
    // watch out! this does [top,left] not [x,y]
    dimensionsInspect: function(){
      return "["+this.top+","+this.left+"]("+this.width+
      "x"+this.height+")";
    },
    dimensionsEqual: function(dim){
      return this.top == dim.top && this.left == dim.left &&
        this.height == dim.height && this.width == dim.width;
    }
  };

  /**
  * collision detection manager?
  * @see comments at zoneageChange()
  */
  var Context = function(){};
  Context.prototype = {
    isContext : true,
    initContext: function(){
      if (debug) puts('_ct xt initted'); _ct=this;
      this.entries = {}; // keys are ids
      this.cube = new Matrix();
      this.listenerMap = {}; // id keys to arrays of ids
    },
    cubeInspect: function(){
      var num=0;
      for(var x in this.entries){ num++; }
      var lines = [];
      for(var i=0;i<this.cube.length;i++){
        if (!this.cube[i]) continue;
        var cels = [];
        for (var j=0; j<this.cube[i].length; j++){
          if (!this.cube[i][j]) {
            cels.push(new Array(num+1).join(' '));
          } else {
            var s = '';
            for (var k=0; k<num; k++){
              var val = this.cube[i][j][k];
              s += (undefined===val) ? '_' :
               (null===val) ? 'n' : val;
            }
            cels.push(s);
          }
        }
        lines.push(i+": ["+cels.join('][')+']');
      }
      return lines.join("\n");
    },
    _removeIdFromCubeAt: function(id,matrix){
      if (debugZoneage)
        puts('remove '+id+" from cube at \n"+matrix.matrixInspect());
      return this._addOrRemoveIdFromCubeAt(false, id, matrix);
    },
    _addIdToCubeAt: function(id,matrix){
      if (debugZoneage)
        puts('remove '+id+" from cube at \n"+matrix.matrixInspect());
      return this._addOrRemoveIdFromCubeAt(true, id, matrix);
    },
    _addOrRemoveIdFromCubeAt: function(doAdd, id, matrix){
      if (debugZoneage) {
        puts("cube before "+(doAdd?"add:":"remove:"));
        puts("\n"+this.cubeInspect());
      }
      var cube = this.cube;
      for(var i=matrix.length-1; i>=0; i--){
        if (undefined===matrix[i]) continue;
        if (doAdd && !cube[i]) cube[i] = [];
        for(var j=matrix[i].length-1; j>=0; j--){
          if (!matrix[i][j]) continue;
          var k;
          if (doAdd) {
            if (!cube[i][j]) cube[i][j] = [];
            k = (-1 == (k = cube[i][j].indexOf(null))) ?
              cube[i][j].length : k;
            cube[i][j][k] = id;
          } else {
            k = cube[i][j].indexOf(id);
            if (-1==k) {
              return fatal("why didn't our cube have it? stack: "+
              +arrayInspect(cube[i][j])+" at point: "+
                _3dPointInspect(i,j,'#'+id)
              );
            }
            cube[i][j][k] = null;
          }
        }
      }
      return null;
    },
    _addNewZoneage: function(entry){
      if (debug) puts("#"+entry.id+" reports new zoneage: "+
        entry.zoneage.zoneDim.dimensionsInspect());
      if (this.entries[entry.id])
        return fatal("already have zoneage on record for #"+entry.id);
      this.entries[entry.id] = entry;
      this._addIdToCubeAt(entry.id,entry.zoneage);
      return [];
    },
    _alterExistingZoneage: function(entry){
      if (!this.entries[entry.id]) {
        return fatal("no zoneage on record for "+entry.id);
      }
      var prevEntry = this.entries[entry.id];
      var prevZoneage = prevEntry.zoneage;
      var newZoneage = entry.zoneage;
      if (debug) puts("#"+entry.id+" alters existing zoneage: "+
        prevZoneage.zoneDim.dimensionsInspect()+" => "+
        newZoneage.zoneDim.dimensionsInspect());
      var diff = Matrix.binaryDiff(prevZoneage,newZoneage);
      if (debugZoneage) {
        puts("left diff: \n"+diff.left.matrixInspect());
        puts("right diff: \n"+diff.right.matrixInspect());
      }
      this._removeIdFromCubeAt(entry.id,diff.left);
      if (diff.right.length){
        this._addIdToCubeAt(entry.id,diff.right);
      }
      this.entries[entry.id] = entry; // update with new zoneage
      return null;
    },
    _reportCollisionsAndNoteListeners: function(matrix,id){
      var collisions = {};
      for(var i=matrix.length-1; i>=0;i--){
        if (undefined===matrix[i]) continue;
        for(var j=matrix[i].length-1;j>=0;j--){
          if (!matrix[i][j]) continue; // zero or undefined
          var stack = this.cube[i][j];
          for(var k=stack.length-1;k>=0;k--){
            if(null===stack[k] || id===stack[k]) continue;
            collisions[stack[k]] = true;
          }
        }
      }
      var dimensionals = [];
      var listenerList = [];
      for(i in collisions){
        listenerList.push(i);
        dimensionals.push(this.entries[i].dimensional);
      }
      this.listenerMap[id] = listenerList;
      return dimensionals;
    },

    /**
    * This thing manages a dependency network in two dimensional space
    * of 'dimensionals', and reports on collisions or near collisions
    * of dimensionals in that space.  A 'dimensional' that reports its
    * 'zoneage' to this thing must implement:
    *
    *    - widgetId(),
    *   [- dimensions()
    *    - cssColorString()]
    *
    * (the last two aren't a requirement of this thing but of other
    * dimensionals in this specific project @todo).
    *
    * A 'zoneage' is a two dimensional matrix of false-ish or true-ish
    * that reports the 'squares' (zones) this dimensional is taking up in this
    * coordinate space. (this coordinate space is typically blockier than
    * the screen coordinate space, e.g. 100x100 pixes per square ('zone'),
    * and maybe less than a dozen 'zones' on the screen.)
    *
    * When a dimensional reports its zoneageChange() with this thing,
    * it will get back a list of 'dimensionals' it is occupying
    * any of the same zone squares as it. (that is, close to or touching or
    * overlapping, etc.)
    *
    * Whenever anybody sends startMovingNotify(),
    * all other dimensionals that are close or touching this one will
    * get notified with the widget id of the moving dimensional.
    */
    zoneageChange:function(dimensional,zoneage){
      var entry = {
        dimensional: dimensional,
        zoneage:     zoneage,
        id:          dimensional.widgetId()
      };
      if(this.entries[entry.id]) {
        this._alterExistingZoneage(entry);
      } else {
        this._addNewZoneage(entry);
      }
      if (debugZoneage) puts("cube after zonechange:\n"+this.cubeInspect());
      return this._reportCollisionsAndNoteListeners(entry.zoneage,entry.id);
    },
    startMovingNotify: function(movingThingId){
      this._notifyCozoners(movingThingId,'cozonerMovingNotify');
    },
    stopMovingNotify: function(movingThingId){
      this._notifyCozoners(movingThingId,'cozonerStopMovingNotify');
    },
    _notifyCozoners: function(movingThingId,callbackName){
      // once a thing has started or stopped moving
      // we need to tell all of its co-zoners about it.
      var list = this.listenerMap[movingThingId];
      for (var i=list.length-1;i>=0;i--){
        var listenerId = list[i];
        var listeningDimensional = this.entries[listenerId].dimensional;
        listeningDimensional[callbackName](movingThingId);
      }
    }
  };

  var Zoneage = function(){
    return $.extend(new Matrix(), Zoneage.prototype);
  };
  Zoneage.prototype = {
    isZoneage : true
  };
  Zoneage.dimensions = function(screenDim, grid){
    var ret = {
      left:   Math.floor( screenDim.left/grid[0] ),
      top:    Math.floor( screenDim.top/grid[1] )
    };
    var x2, y2;
    x2 = Math.ceil((screenDim.left+screenDim.width)/grid[0]);
    y2 = Math.ceil((screenDim.top+screenDim.height)/grid[1]);
    ret.width = x2 - ret.left;
    ret.height = y2 - ret.top;
    $.extend(ret,Dimensions.prototype);
    return ret;
  };
  Zoneage.fromRect = function(screenDim,zoneDim,grid){
    if (!zoneDim) zoneDim = Zoneage.dimensions(screenDim,grid);
    var x1=zoneDim.left, w=zoneDim.width, y1=zoneDim.top, h=zoneDim.height;
    var z = new Zoneage();
    z.screenDim = screenDim;
    z.zoneDim = zoneDim;
    var s ='['+(x1>0?'0':'')+(x1>1? new Array(x1).join(',0') : '')+
          (x1>0?',':'') + new Array(w).join('1,') + (w ? '1' : '')+']';
    for (var y=y1+h; y>=y1; y--) z[y] = eval(s);
    return z;
  };

  var widgetId;
  (function() {
    var id = 0;
    widgetId = function() {
      var newId = ++id;
      this.widgetId = function() { return newId; };
      return newId;
    };
  })();


  $.widget("ui.hipe_color_theory_ridiculous_demo", {
     widgetId : widgetId,
    _init:function(){
      var ctxt = this.options.context;
      this.grid = this.options.context.grid;
      if ( ! ctxt.isContext  ) {
        $.extend(ctxt,Context.prototype);
        ctxt.initContext();
      }
      this.__subRectIds = []; // crazy name as a reminder to keep it parallel
      this.__subRectEntries = {};   // with this one
      var newRects = ctxt.zoneageChange(this,this._buildNewZoneage());
      this._setRects(newRects);
    },
    _buildNewZoneage:function(){
      var zoneDim = arguments[0]; // null ok
      //puts("_buildNewZoneage() #"+this.widgetId());
      this.lastDim = this.dimensions();
      this.lastZoneage = Zoneage.fromRect(this.lastDim,zoneDim,this.grid);
      return this.lastZoneage;
    },
    startDrag: function() {
      /*
      * this is sort of a hack because whatever div is on top is the only one
      * that needs any internal animation.  we need to tell our listeners that
      * whatever subrects they have of ours are now invalid.  When they start
      * their drag, they will need to, like, get the new data somehow.
      */
      this.drag(true); // @todo this might be too expensive, causes a blip
      this.options.context.startMovingNotify(this.widgetId());
    },
    stopDrag: function() {
      this.options.context.stopMovingNotify(this.widgetId());
    },
    cozonerStopMovingNotify: function(id){
      this.cozonerMovingNotify(id); // i guess
    },
    cozonerMovingNotify: function(id) {
      var entries = this.__subRectEntries;
      // we won't have a record of this dimensional if it moved on
      // top of us at its own volition. only if we moved on top of it.
      if (entries[id]) {
        if (debug) puts (this._debugId()+" KNOWS that #"+id+" is moving.");
        this._handleHidingASubrect(entries[id]);
      } else {
        if(debug) puts (this._debugId()+" DOESN'T CARE that #"+id+
          " is moving.");
      }
    },
    _debugId: function(){ return '#'+this.widgetId(); },
    drag: function(isStart) {
      var screenDim = this.dimensions();
      var zoneDim = Zoneage.dimensions(screenDim, this.grid);
      if (debugDrag) puts("drag: "+screenDim.dimensionsInspect()+" "+
        zoneDim.dimensionsInspect());
      var prevZoneDim = this.lastZoneage.zoneDim;
      if (isStart || ! zoneDim.dimensionsEqual(prevZoneDim)) {
        var z = this._buildNewZoneage(zoneDim);
        var rects = this.options.context.zoneageChange(this,z);
        this._setRects(rects);
      }
      if (0===this.__subRectIds.length){
        if (debugDrag) puts("#"+this.widgetId()+" has no sub rects "
          +"to check in this drag");
      } else {
        for(var i=0; i<this.__subRectIds.length; i++){
          var id = this.__subRectIds[i];
          var entry = this.__subRectEntries[id];
          var myDim = this.dimensions();
          var dim = this._localizeAndSqueezeDimensions(entry,myDim);
          if (dim===false) {
            if (entry.overlapExists) {
              this._handleHidingASubrect(entry);
            }
          } else {
            if (!entry.overlapExists) {
              this._handleShowingASubrect(entry,dim);
            } else {
              // the thing is already visible, alter its coordinates
              entry.element.css({
                top:dim.top, left: dim.left,
                width: dim.width, height: dim.height
              });
            }
          }
        }
      }
    },
    // this is a state change.  the subrect is still in our zoneage, but out
    // of our 'viewing portal' (our screen dimensions)
    _handleHidingASubrect: function(entry){
      // and for that, we do this:
      entry.overlapExists = false;
      entry.element.hide();
    },
    _handleShowingASubrect: function(entry,dim){
      entry.overlapExists = true;
      entry.element.css({
        top:dim.top, left: dim.left,
        width: dim.width, height: dim.height, display: 'block'
      });
    },
    dimensions: function() {
      var o = this.element.offset();
      o.width = this.element.width();
      o.height = this.element.height();
      o.zIndex = this.element.css('z-index');
      $.extend(o,Dimensions.prototype);
      return o;
    },
    cssColorString: function(){
      return this.element.css('background-color');
    },
    newMyColorObject: function(){
      var myStr = this.cssColorString();
      if ('transparent'===myStr) {
        return false;
      } else {
        var lib = this.element.data('hipe_color_theory').library();
        return lib.Color.fromCssRgbString(myStr);
      }
    },
    _setRects: function(rects){
      if (debug) puts('#'+this.widgetId()+" got "+rects.length+" rects"+
      " in response.");
      var id, i;
      var idsPresent = [];
      var idsAdded = [];
      var idsRemoved = [];
      var rectsById = {};
      for(i=rects.length-1;i>=0;i--){
        var rect = rects[i];
        id = rect.widgetId();
        rectsById[id] = rect;
        idsPresent.push(id);
        if (-1===this.__subRectIds.indexOf(id)) {
          idsAdded.push(id);
        }
      }
      for(i=this.__subRectIds.length-1;i>=0;i--){
        id = this.__subRectIds[i];
        if (-1===idsPresent.indexOf(id)) {
          idsRemoved.push(id);
        }
      }
      if (0===idsAdded.length && 0===idsRemoved.length) {
        if (debug) puts("#"+this.widgetId()+
        " had nothing added or removed in this zone change.");
        return null;
      }
      if (idsRemoved.length) {
        this._doSomethingWithRemovedSubrects(idsRemoved);
      }
      if (idsAdded.length) {
        this._createEntriesAndAddSubrectDivs(rectsById, idsAdded);
      }
      return null;
    },
    _createEntriesAndAddSubrectDivs: function(rectsById, idsAdded){
      var newSubRects = new Array(idsAdded.length);
      idsAdded.sort();
      for(i=0;i<idsAdded.length; i++){
        id = idsAdded[i];
        rect = rectsById[id];
        var dim = rect.dimensions();
        var origId = rect.widgetId();
        var myRectId = widgetId(); // make a new id!
        var entry = {
          id : id,
          top: dim.top,
          left: dim.left,
          width: dim.width,
          height: dim.height,
          origId: origId,
          myRectId: myRectId,
          cssId: 'sub-rect-in-'+this.widgetId()+'-from-'+origId+
            '-called-'+myRectId
        };
        this._doColorStuff(rect,entry);
        this.__subRectEntries[id] = entry;
        this.__subRectIds.push(id);
        newSubRects[i] = entry;
      }
      this._addDivsForNewSubRects(newSubRects);
    },
    _doSomethingWithRemovedSubrects: function(ids){
      for(var i=ids.length-1;i>=0;i--){
        var id = ids[i];
        var entry = this.__subRectEntries[id];
        var idx = this.__subRectIds.indexOf(id);
        this.__subRectIds[idx] = false;
        entry.element.remove();
        if (debug) puts("REMOVED #"+entry.cssId);
        this.__subRectEntries[id] = false;
      }
      var newList = [];
      for (i=this.__subRectIds.length-1;i>=0;i--){
        if (false!==this.__subRectIds[i]) {
          newList.push(this.__subRectIds[i]);
        }
      }
      this.__subRectIds = newList;
    },
    _getBlendedColorObject: function(cssSourceColorStr){
      var lib = this.element.data('hipe_color_theory').library();
      var c1 = lib.Color.fromCssRgbString(cssSourceColorStr);
      var c2 = this.newMyColorObject();
      if (!c1) {
        if (!c2) return false;  // both transparent, e.g.
        return c2;
      } else {
        if (!c2) return c1;
        c2.blendIn(c1);
        return c2;
      }
    },
    _doColorStuff: function(rect,entry){
      entry.sourceColorCssString = rect.cssColorString();
      var color = this._getBlendedColorObject(entry.sourceColorCssString);
      if (color) {
        entry.blendedColorCssString = color.cssRgbString();
        entry.blendedColorNoteString = color.cssHexString();
      } else {
        entry.blendedColorCssString = 'transparent';
        entry.blendedColorNoteString = 'transparent';
      }
    },
    _addDivsForNewSubRects: function(entries){
      var myDim = this.dimensions();
      for(var i=0;i<entries.length; i++){
        var entry = entries[i];
        var div = $('<div class="subrect"><div class="note"></div></div>');
        div.css({
          backgroundColor: entry.blendedColorCssString,
          position: 'absolute',
          zIndex: -1 // @todo
        });
        div.attr('id',entry.cssId);
        var dim = this._localizeAndSqueezeDimensions(entry,myDim);
        if (false===dim){
          entry.overlapExists = false;
          div.css({
            width: 0, height: 0, top: 0, left: 0, display: 'none'
          });
        } else {
          entry.overlapExists = true;
          div.css({ top: dim.top, left: dim.left, width: dim.width,
            height: dim.height});
        }
        this.element.append(div);
        if (debug) puts('#'+this.widgetId()+" ADDED SUBRECT DIV "+
          entry.cssId);
        var divAgain = $('#'+entry.cssId);
        divAgain.find('.note').html(entry.blendedColorNoteString);
        entry.element = divAgain;
      }
      return;
    },
    _localizeAndSqueezeDimensions: function(dimInner,dimOuter){
      var myX  = dimOuter.left;
      var myX2 = myX + dimOuter.width;
      var yourX = dimInner.left;
      var yourX2 = yourX+dimInner.width;
      var myY = dimOuter.top;
      var myY4 = myY + dimOuter.height;
      var yourY = dimInner.top;
      var yourY4 = yourY+dimInner.height;
      if (myX>=yourX2 || myX2<=yourX || myY>=yourY4 || myY4<=yourY)
        return false;
      var newDim = {
        top:    yourY <= myY ? 0 : yourY-myY,
        left:   yourX <= myX ? 0 : yourX-myX,
        width:  Math.min(myX2,yourX2) - Math.max(myX,yourX),
        height: Math.min(myY4,yourY4) - Math.max(myY,yourY)
      };
      return newDim;
    }
  });

  $.ui.plugin.add("draggable", "ridiculous", {
    start: function(event,ui){
      $(this).data("hipe_color_theory_ridiculous_demo").startDrag();
    },
    drag: function(event, ui) {
      $(this).data("hipe_color_theory_ridiculous_demo").drag(false);
    },
    stop: function(event,ui){
      $(this).data("hipe_color_theory_ridiculous_demo").stopDrag();
    }
  });

})(jQuery);
