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

  /** @constructor */
  var Color = function(r,g,b){
    var me = new Array(3);
    extend(me,Color.prototype);
    me.setRgb(r,g,b);
    return me;
  };
  Color.prototype = {
    defaultIncrement: 40,
    brightnessLevel: 0,
    inspectColor: function(){
      return '['+this.join(',')+']';
    },
    isValid: function(){
      for(var i=2; i>=0; i--){
        var x = this[i];
        if ('number'!=typeof(x) || x<0 || x>Color.max) return false;
      }
      return true;
    },
    setRgb: function(){
      this.innate = null;
      this.brightnessLevel = 0;
      var ok=true;
      var args=arguments;
      if (args.length==1 && 'object'===typeof(args[0])) args=args[0];
      if (undefined===args.length || args.length!=3)
        return this.setRgb(null,null,null);
      for(var i=2; i>=0; i--){
        if ('number'!==typeof(args[i])) {
          if ((/^\d+$/).exec(args[i])) {
            args[i] = parseInt(args[i],10);
          } else {
            args[i] = null;
          }
        }
        if (null!==args[i]) {
          if (args[i]<0 || args[i] > Color.max){
            args[i] = null;
          }
        }
        this[i] = args[i];
      }
      return this;
    },
    css: function(){
      return this.isValid() ? ('rgb('+this.join(',')+')') : null;
    },
    randomize:function(){
      return this.setRgb(
        Math.floor(Math.random() * Color.steps),
        Math.floor(Math.random() * Color.steps),
        Math.floor(Math.random() * Color.steps)
      );
    },
    isBright: function(){
      if (!this.isValid()) return null;
      return Color.delta(this, Color.white).maxValue() < 128;
    },
    isDark: function(){
      return ! this.isBright();
    },
    /**
    * arbitrary algorithm: find the most significant axis,
    * find the distance from it to white, add the fixed increment amount
    * to it, and add a proportional amount to the other two.
    */
    brighten: function(){
      var levelDelta = ('number'===typeof(arguments[0])) ?
        arguments[0] : 1;
      var increment = this.defaultIncrement; // @todo
      if (!this.innate) {
        this.innate = [this[0],this[1],this[2]];
      }
      var innate = this.innate;
      if (levelDelta<0){
        var cd2 = Color.delta(this,Color.black);
        if (0 == cd2.minValue()) return false;
      }
      var d = Color.delta(this, Color.white);
      var sigIdx = d.maxIndex();
      var sigDelta = d.maxValue();
      if (sigDelta == 0 && levelDelta > 0) return false;
      var nextBrightnessLvl = (this.brightnessLevel + levelDelta);
      var useIncrement = nextBrightnessLvl * increment;
      var newSigValue = Color.boundarize(innate[sigIdx]+useIncrement);
      this[sigIdx] = newSigValue;
      var usedIncrement = newSigValue - innate[sigIdx];
      var proportion = (sigDelta==0 ? 1.0 : (usedIncrement / sigDelta));
      for (var i=0;i<=2;i++){
        if (i==sigIdx) continue;
        var inc = Math.floor(d[i] * proportion);
        var newValue = Color.boundarize(this[i] + inc);
        this[i] = newValue;
      }
      this.brightnessLevel = nextBrightnessLvl;
      return true;
    },
    darken: function(){
      var levelDelta = ('number'===typeof(arguments[0])) ?
        (-1 * arguments[0]) : -1;
      return this.brighten(-1);
    }
  };
  Color.min = 0;
  Color.max = 255;
  Color.steps = 256;
  Color.white = new Color(Color.max,Color.max,Color.max);
  Color.black = new Color(Color.min,Color.min,Color.min);
  Color.boundarize = function(value){
    if ('number'!==typeof(value)) return null;
    return value<Color.min ? Color.min : value>Color.max ? Color.max : value;
  };


  /** @constructor */
  ColorDelta = function(){
    var me=arguments;
    extend(me,ColorDelta.prototype);
    return me;
  };
  ColorDelta.prototype = {
    maxIndex: function(){
      var max = -1 * Color.steps, idx = null;
      for(var i=this.length-1;i>=0;i--) {
        if (this[i]>max) {max = this[i]; idx = i;}}
      return idx;
    },
    minIndex: function(){
      var min = Color.steps, idx = null;
      for(var i=this.length-1;i>=0;i--) {
        if (this[i]<min) {min = this[i]; idx = i;}}
      return idx;
    },
    minValue: function(){
      var idx = this.minIndex();
      return (null===idx) ? null : this[idx];
    },
    maxValue: function(){
      var idx = this.maxIndex();
      return (null===idx) ? null : this[idx];
    }
  };

  Color.delta = function(c0,c1) {
    return new ColorDelta(c1[0]-c0[0],c1[1]-c0[1],c1[2]-c0[2]);
  };





  /** @constructor */
  var ColorController = function(el, jqWidget, options) {
    this.targetEl = el;
    this.widget = jqWidget;
    this.options = options;
    this.color = new Color(null,null,null);
  };
  ColorController.prototype = {
    fatal: function(msg){
      throw new Error("color controller "+msg);
    },
    setRgb:function(r,g,b){
      this.color.setRgb(r,g,b);
      this._colorUpdated();
    },
    _colorUpdated: function(){
      this.displayRgb(this.color[0],this.color[1],this.color[2]);
      if (this.color.isValid()) {
        var css = this.color.css();
        this.targetEl.css('background-color',css);
        this._updateDescriptions();
      } else {
        puts("_color not valid: "+this.color.inspectColor()+
          ". making it white"); _color = this.color;
        this.targetEl.css('background-color','rgb(255,255,255)');
      }
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
      if (this.color.brighten()) {
        return this._colorUpdated();
      } else {
        this.setStatusMessage("already as bright as can be");
        return null;
      }
    },
    darken: function(){
      if (this.color.darken()) {
        return this._colorUpdated();
      } else {
        this.setStatusMessage("already as dark as can be");
        return null;
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
    _init: function(){
      var self = this;
      self.element.data('hipe_color_theory',self);
      var cnt = new ColorController(self.element, self, self.options);
      self.controller = cnt;
      var them = ['rand','brighten','darken',
        'hotten','coolen','flourescenten'];
      for(var i=them.length-1; i>=0; i--){
        var func = them[i];
        buttons = this.element.find('.controls .'+func);
        if (!cnt[func]) {
          return this.fatal("please implement "+func+" in your controller");
        }
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
