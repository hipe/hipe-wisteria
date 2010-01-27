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

  var debug = false;

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

  var Context = function(){};
  Context.prototype = {
    isContext : true,
    initContext: function(){
      if(debug)puts('_ct xt initted'); _ct=this;
      this.map = {};
      this.cube = new Matrix();
    },
    cubeInspect: function(){
      var num=0;
      for(var x in this.map){ num++; }
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
      //puts('remove '+id+" from cube at \n"+matrix.matrixInspect());
      return this._addOrRemoveIdFromCubeAt(false, id, matrix);
    },
    _addIdToCubeAt: function(id,matrix){
      //puts('remove '+id+" from cube at \n"+matrix.matrixInspect());
      return this._addOrRemoveIdFromCubeAt(true, id, matrix);
    },
    _addOrRemoveIdFromCubeAt: function(doAdd, id, matrix){
      //puts("cube before "+(doAdd?"add:":"remove:"));
      //puts("\n"+this.cubeInspect());
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
      if(debug)puts("_addNewZoneage for #"+entry.id+
        " "+entry.zoneage.zoneDim.dimensionsInspect());
      if (this.map[entry.id])
        return fatal("already have zoneage on record for #"+entry.id);
      this.map[entry.id] = entry;
      this._addIdToCubeAt(entry.id,entry.zoneage);
      return [];
    },
    _alterExistingZoneage: function(entry){
      if (!this.map[entry.id]) {
        return fatal("no zoneage on record for "+entry.id);
      }
      var prevEntry = this.map[entry.id];
      var prevZoneage = prevEntry.zoneage;
      var newZoneage = entry.zoneage;
      if(debug)puts("_alterExistingZoneage for #"+entry.id+
        ": "+prevZoneage.zoneDim.dimensionsInspect()+" => "+
        newZoneage.zoneDim.dimensionsInspect());
      var diff = Matrix.binaryDiff(prevZoneage,newZoneage);
      //puts("left diff: \n"+diff.left.matrixInspect());
      //puts("right diff: \n"+diff.right.matrixInspect());
      this._removeIdFromCubeAt(entry.id,diff.left);
      if (diff.right.length){
        this._addIdToCubeAt(entry.id,diff.right);
      }
      this.map[entry.id] = entry; // update with new zoneage
      return null;
    },
    _reportCollisions: function(matrix,id){
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
      var dims = [];
      for(i in collisions){
        dims.push(this.map[i].dimensional);
      }
      return dims;
    },
    zoneageChange:function(el,zoneage){
      var entry = {
        dimensional: el,
        zoneage:     zoneage,
        id:          el.widgetId()
      };
      if(this.map[entry.id]) {
        this._alterExistingZoneage(entry);
      } else {
        this._addNewZoneage(entry);
      }
      //puts("cube after zonechange:\n"+this.cubeInspect());
      return this._reportCollisions(entry.zoneage,entry.id);
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
      this.__subRects = {};   // with this one
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
    drag: function() {
      var screenDim = this.dimensions();
      var zoneDim = Zoneage.dimensions(screenDim, this.grid);
      //puts("drag: "+screenDim.dimensionsInspect()+" "+
      // zoneDim.dimensionsInspect());
      var prevZoneDim = this.lastZoneage.zoneDim;
      if (! zoneDim.dimensionsEqual(prevZoneDim)) {
        if (debug)
          puts("zoneage change detectected in drag():"+
          "prev: "+prevZoneDim.dimensionsInspect()+" curr: "+
          zoneDim.dimensionsInspect());
        var z = this._buildNewZoneage(zoneDim);
        var rects = this.options.context.zoneageChange(this,z);
        this._setRects(rects);
      }
      if (0===this.__subRectIds.length){
        if(debug)puts("no sub rects to check in this drag");
      } else {
        for(var i=0; i<this.__subRectIds.length; i++){
          var id = this.__subRectIds[i];
          var rect = this.__subRects[id];
          var myDim = this.dimensions();
          var dim = this._localizeAndSqueezeDimensions(rect,myDim);
          if (dim===false){
            rect.element.hide();
          } else {
            rect.element.css({
              display: 'block',
              top:dim.top, left: dim.left,
              width: dim.width, height: dim.height
            });
          }
        }
      }
    },
    dimensions: function() {
      var o = this.element.offset();
      o.width = this.element.width();
      o.height = this.element.height();
      o.zIndex = this.element.css('z-index');
      $.extend(o,Dimensions.prototype);
      return o;
    },
    color: function(){
      return this.element.css('background-color');
    },
    _setRects: function(rects){
      if(debug)puts('#'+this.widgetId()+" got "+rects.length+" rects.");
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
      if (0===idsAdded.length && 0===idsRemoved.length){
        if(debug)puts("nothing added or removed in this zone change.");
        return null;
      }
      if (idsRemoved.length) {
        this._doSomethingWithRemovedSubrects(idsRemoved);
      }
      if (idsAdded.length) {
        var newSubRects = [];
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
            color: rect.color(),
            origId: origId,
            myRectId: myRectId,
            cssId: 'sub-rect-'+myRectId+'-in-'+this.widgetId()+'-from-'+origId
          };
          this.__subRects[id] = entry;
          this.__subRectIds.push(id);
          newSubRects.push(entry);
        }
        this._addDivsForNewSubRects(newSubRects);
      }
      return null;
    },
    _doSomethingWithRemovedSubrects: function(ids){
      for(var i=ids.length-1;i>=0;i--){
        var id = ids[i];
        var entry = this.__subRects[id];
        var idx = this.__subRectIds.indexOf(id);
        this.__subRectIds[idx] = false;
        entry.element.remove();
        if(debug)puts("REMOVED #"+entry.cssId);
        this.__subRects[id] = false;
      }
      var newList = [];
      for (i=this.__subRectIds.length-1;i>=0;i--){
        if (false!==this.__subRectIds[i]) {
          newList.push(this.__subRectIds[i]);
        }
      }
      this.__subRectIds = newList;
    },
    _addDivsForNewSubRects: function(rects){
      for(var i=0;i<rects.length; i++){
        var entry = rects[i];
        var div = $('<div></div>');
        div.css({
          backgroundColor: entry.color,
          border: '1px solid grey',
          position: 'absolute',
          zIndex: -1 // @todo
        });
        div.attr('id',entry.cssId);
        var myDim = this.dimensions();
        var dim = this._localizeAndSqueezeDimensions(entry,myDim);
        if (false===dim){
          div.css({
            width: 0, height: 0, top: 0, left: 0, display: 'none'
          });
        } else {
          div.css({ top: dim.top, left: dim.left, width: dim.width,
            height: dim.height});
        }
        this.element.append(div);
        if(debug)puts("ADDED SUBRECT DIV "+entry.cssId);
        var divAgain = $('#'+entry.cssId);
        entry['element'] = divAgain;
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
    drag: function(event, ui) {
      $(this).data("hipe_color_theory_ridiculous_demo").drag();
    }
  });

})(jQuery);
