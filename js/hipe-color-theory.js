/**
* hipe-color-theory 0.0.0pre
*
* copyright (c) 2010 mark meves
* dual licensed under the MIT (MIT-LICENSE.txt)
* and GPL (GPL-LICENSE.txt) licenses.
*
*/

(function(x) {
  var $ = x;

  var puts = function(msg){
    msg = 'color theory '+msg;
    return window['console'] ? window.console.log(msg) : null;
  };

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


  aliases = function (proto,dict){
    var i;
    for(i in dict){
      proto[i] = proto[dict[i]];
    }
  };

  var fatal = function(msg){
    throw new Error("hipe color theory "+msg);
  };

  var Vector = function(){
    // we used to use 'arguments' "as" the starting object but it
    // didn't have Array functions like join()
    var args = ('object'===typeof(arguments[0]) && arguments.length===1) ?
      arguments[0] : arguments;
    me = new Array(args.length);
    for (var i=args.length-1; i>=0; i--) {
      if ('number'!==typeof(args[i])) {
        return fatal("vector had non-numeric value at "+i);
      }
      me[i] = args[i];
    }
    extend(me, Vector.prototype);
    return me;
  };
  Vector.fill = function(size,value){
    arr = new Array(size);
    for(var i=arr.length-1;i>=0;i--){
      arr[i] = value;
    }
    return extend(arr,this.prototype);
  };
  Vector.prototype = {
    prototypeFunction: Vector,
    isVector: true,
    // just as a favor to all the children, you can pass your prototype
    // as the only argument.
    vectorCopy: function(){
      var proto = arguments.length ? arguments[0] : Vector.prototype;
      var copy = new Array(this.length);
      for (var i=this.length-1; i>=0; i--) {
        copy[i] = this[i];
      }
      return extend(copy, proto);
    },
    copy: function(){
      return this.vectorCopy(this.prototypeFunction.prototype);
    },
    /**
    * given a list of zero or more other vectors, change the value
    * of this vector at each axis by iterating over the given list of
    * vectors and for each other vector (and within that each axis),
    * change the value of this vector at the axis by calling function f()
    * and passing it a pair of values: the first value will be the value
    * of this vector at this axis and the other value will be of that other
    * vector at that same axis.  This will raise an exception if each other
    * vector doesn't have the same number of axis as this one.
    * For example, with three vectors v1, v2 and v3, you could
    * add them all up: (altering the original v1:)
    * v1._mapBang([v2,v3],function(a,b){return a+b;})
    *
    * @return this vector (chaining)
    *
    * (the name is inspired by Ruby's Enumerable#map! method)
    *
    * as a special case, if you pass a single number for 'mixed',
    * it will be as if you passed an array one element in length
    * with one vector with as many axis as this one, and each value
    * is that number.
    *
    * as another special case, if you pass one vector.. etc.
    */
    _mapBang : function(mixed,f) {
      if ('number'==typeof(mixed) )
        arr = [this.prototypeFunction.fill(this.length, mixed)];
      else if (mixed.isVector)
        arr = [mixed];
      else
        arr = mixed;
      for(var i=arr.length-1;i>=0;i--){
        var v = arr[i];
        if (v.length != this.length)
          return fatal("vectors must be of same length");
        for (var j=this.length-1; j>=0; j--) {
          this[j] = f(this[j],v[j]);
        }
      }
      return this;
    },
    /**
    * return a new vector with each value of it being the result of
    * a call to function f() with each corresponding this value passed to it.
    */
    _map: function(f){
      var result = this.prototypeFunction.fill(this.length, null);
      for(var i=this.length-1;i>=0;i--){
        result[i] = f(this[i]);
      }
      return result;
    },
    /**
    * @return index of the axis with the 'max' value,
    * uses function f(a,b) to test what max means, where it
    * should return true-ish if +a+ is considered greater than +b+
    * (so we can use this to implement min() too.)
    * @return null for zero-length vectors
    */
    _max: function(f){
      if (this.length==0) return null;
      var maxVal = this[0];
      var maxIdx = 0;
      for(var i=this.length-1;i>=2;i--){
        if (f(this[i],maxVal)) {
          maxIdx = i;
          maxVal = this[i];
        }
      }
      return maxIdx;
    },
    vectorEquals: function(v){
      if (v.length !== this.length) return fatal(
        "won't compare vectors with different lengths"
      );
      for (var i=this.length-1; i>=0; i--) {
        if (this[i]!=v[i]) return false;
      }
      return true;
    },
    vectorMinusEquals: function(mixed){
      return this._mapBang(mixed,function(a,b){return a-b;});
    },
    vectorPlusEquals: function(mixed){
      return this._mapBang(mixed,function(a,b){return a+b;});
    },
    vectorDividedByEquals: function(mixed){
      return this._mapBang(mixed,function(a,b){return a/b;});
    },
    vectorTimesEquals: function(mixed){
      return this._mapBang(mixed,function(a,b){return a * b;});
    },
    ceilEquals: function(){
      return this._mapBang(this, function(a){return Math.ceil(a);});
    },
    floorEquals: function(){
      return this._mapBang(this, function(a){return Math.floor(a);});
    },
    inspect: function(){ return this.vectorInspect(); },
    vectorInspect: function(){'['+this.join(',')+']';},
    maxIdx: function(){return this._max(function(a,b){return a>b;});},
    minIdx: function(){return this._max(function(a,b){return a<b;});},
    max:function(){ return this[this.maxIdx()]; },
    min:function(){ return this[this.minIdx()]; }
  };
  aliases(Vector.prototype, {
    is              : 'vectorEquals',
    plusEquals      : 'vectorPlusEquals',
    minusEquals     : 'vectorMinusEquals',
    timesEquals     : 'vectorTimesEquals',
    dividedByEquals : 'vectorDividedByEquals'
  });

  /** @constructor */
  var Color = function(r,g,b){
    var me = new Vector(Color.bounds(r), Color.bounds(g), Color.bounds(b));
    return extend(me, Color.prototype);
  };
  Color.fill = Vector.fill; // need a better way? @see
  Color.delta = function(c1,c2){ return c2.copy().minusEquals([c1]); };
  Color.cssRegex = /^rgb\((\d+), *(\d+), *(\d+)\)$/;
  Color.fromCssRgbString = function(str){
    var md;
    if (null===(md=Color.cssRegex.exec(str))) return false;
    return new Color(md[1],md[2],md[3]);
  };
  Color.prototype = extend({}, Vector.prototype, {
    prototypeFunction: Color,
    isColor: true,
    setRgb: function(){
      if (arguments.length!==3) return fatal('need 3 arguments');
      return this._mapBang([arguments],function(a,b){
        return Color.bounds(b);
      });
    },
    cssRgbString: function(){return 'rgb('+this.join(',')+')';},
    cssHexString: function(){
      return '#'+this._map(function(v){
        var s = Number(v).toString(16);
        if (s.length===1) s = '0'+s;
        return s;
      }).join('');
    },
    randomize:function(){
      return this.setRgb(
        Math.floor(Math.random() * Color.steps),
        Math.floor(Math.random() * Color.steps),
        Math.floor(Math.random() * Color.steps)
      );
    },
    isBright: function(){
      return Color.delta(this, Color.white).max()<(Color.steps/2);},
    isDark: function(){return ! this.isBright();},
    brighten: function(){
      var delta = Color.white.copy().minusEquals(this);
      if (0==delta.max()) return this;
      return this.plusEquals(delta.dividedByEquals(2).ceilEquals());
    },
    darken: function(){
      var delta = Color.black.copy().minusEquals(this);
      if (0==delta.min()) return this;
      return this.plusEquals(delta.dividedByEquals(2).floorEquals());
    },
    /**
    * move this color towards the other color.
    * an optional second parameter is a float between 0 and 1 inclusive
    * that indicates what ratio of the delta to blend in. default 0.5.
    * (1.0 would result in changing this color to the other color completely,
    * zero will result in no change.)
    * throws fatal error if value is out of range. uses default if it's null.
    */
    blendIn: function(colorObj){
      if (-1 != [undefined,null].indexOf(arguments[1])) arguments[1] = 0.5;
      var ratio = arguments[1];
      if ('number'!=typeof(ratio)||0>ratio||1.0<ratio)
        return fatal("ratio out of bounds or wrong type: "+ratio);
      d = Color.delta(this, colorObj).timesEquals(ratio).floorEquals();
      return this.plusEquals(d);
    }
  });
  Color.min = 0;
  Color.max = 255;
  Color.steps = 256;
  Color.bounds = function(mixed){
    switch(typeof(mixed)) {
      case 'string':
        if (/^\d+$/.exec(mixed)) mixed = parseInt(mixed,10);
        else return fatal("non numeric value for color axis: "+mixed);
      case 'number':
        if (mixed < Color.min || mixed > Color.max)
          return fatal ("color axis out of bounds: "+mixed);
        break;
      default:
        return fatal(
          "invalid type for color axis: "+typeof(mixed)+"("+mixed+")");
    }
    return mixed;
  };
  Color.transformations =
    // a lot of these aren't defined yet
    ['rand','brighten','darken','hotten','coolen','flourescenten'];
    // primariten, secondariten, earthen, mudden

  Color.white = new Color(Color.max,Color.max,Color.max);
  Color.black = new Color(Color.min,Color.min,Color.min);


  /** @constructor */
  var ColorController = function(el, jqWidget, options) {
    this.targetEl = el;
    this.widget = jqWidget;
    this.options = options;
    this.color = Color.white.copy();
  };
  ColorController.prototype = {
    fatal: function(msg){
      throw new Error("color controller "+msg);
    },
    setRgb:function(r,g,b){
      try {
        this.color.setRgb(r,g,b);
      } catch (e) {
        this.setStatusMessage(e.message);
      }
      this._colorUpdated();
    },
    _colorUpdated: function(){
      this.displayRgb(this.color[0],this.color[1],this.color[2]);
      var css = this.color.cssRgbString();
      this.targetEl.css('background-color',css);
      this._updateDescriptions();
      return null;
    },
    _updateDescriptions: function(){
      var desc = {
        'isBright' : this.color.isBright(),
        'isDark' : this.color.isDark()
      };
      this.displayDescriptions(desc);
    },
    rand: function(){
      this.color.randomize();
      return this._colorUpdated();
    },
    brighten: function(){
      if (this.color.is(Color.white)) {
        this.setStatusMessage("already as bright as can be");
        return null;
      } else {
        this.color.brighten();
        return this._colorUpdated();
      }
    },
    darken: function(){
      if (this.color.is(Color.black)) {
        this.setStatusMessage("already as dark as can be");
        return null;
      } else {
        this.color.darken();
        return this._colorUpdated();
      }
    },
    hotten: function(){
      puts("hotten not yet defined :/");
    },
    coolen: function(){
      puts("coolen not yet defined :/");
    },
    flourescenten: function(){
      puts("flourescenten not yet defined :/");
    },
    setStatusMessage: function(msg){
      puts(msg);
      //...
    }
  };

  $.widget("ui.hipe_color_theory", {
    fatal: function(msg){
      throw new Error("color controller "+msg);
    },
    library: function(){ return { Color: Color, Vector: Vector }; },
    controller: function(){ return this.controller; },
    _init: function(){
      var self = this;
      var cnt = new ColorController(self.element, self, self.options);
      self.controller = cnt;
      var them = Color.transformations;
      for(var i=them.length-1; i>=0; i--){
        var func = them[i];
        buttons = this.element.find('.controls .'+func);
        (function(func2){
          buttons.bind('click',function(e){
            puts('do '+func2);
            return cnt[func2](e);
          });
        })(func);
      }
      them=['r','g','b'];
      var rgb = {};
      for(i=them.length-1;i>=0;i--){
        rgb[them[i]] = this.element.find(
          '.controls input[name="'+them[i]+'"]'
        );
        rgb[them[i]].bind('change',function(e){
          var r=rgb.r.attr('value');
          var g=rgb.g.attr('value');
          var b=rgb.b.attr('value');
          cnt.setRgb(r,g,b);
        });
      }
      cnt.displayRgb = function(r,g,b){
        rgb.r.attr('value',""+r);
        rgb.g.attr('value',""+g);
        rgb.b.attr('value',""+b);
        return null;
      };
      cnt.displayDescriptions = function(desc){
        var i;
        for(i in desc){
          self.element.find('.'+i).html(""+desc[i]);
        }
        return null;
      };
      return null;
    }
  });
})(jQuery);
