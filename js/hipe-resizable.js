/*
 * hipe resizable 0.0.0pre
 *
 * experimental!
 *
 * rewrite a shorter simpler version of jquery resizable b/c at first
 * we thought we couldn't specify individual axis.
 *
 * this allows you to set a subset of the 8 available handles in your css class name,
 * for e.g. "<div class='hipe-resizable hipe-resizable-n-ne-e-s-se'>..</div>"
 * sometimes code smell smells like flowers
 *
 * copyright (c) 2009 mark meves
 * dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 */

(function($) {

  // ************** local functions ***************

  var puts = window.console ? window.console.log : function(msg){};

  var xy = function(x,y){ return '['+x+']['+y+']'; };

  var parsePx = function(str){
    var capture = /^-?(\d+(?:\.\d+)?)px$/.exec(str);
    return parseFloat(capture);
  };

  // ************** local prototypes ****************

  /** @constructor */
  var HipeResizable = function(element, options){
    this._lastErrorMessage = null;
    if (!this.setGrid(options.grid || [5,5])) return this;
    if (!element) return this.error("where is element?");
    this.element = $(element);
    if (this.element.css('position') != 'relative')
      return this.error("for now, please set position:relative yourself on resizables"); //@todo
    if (!this.addHandles()) return this;
    return this;
  };

  var cardinals = '(?:[nesw]|[ns][ew])';
  HipeResizable.HandleRe  = new RegExp('\\b('+cardinals+'drag)\\b');
  var SelectorRe          = new RegExp('\\bhipe-resizable((?:-\\w+)*)?\\b','g');
  var SelectorReNonGlobal = new RegExp('\\bhipe-resizable(?:-(\\w+(?:-\\w+)*))?\\b');
  var CardinalRe          = new RegExp('^'+cardinals+'$');
  var XdragRe             = new RegExp('\\b[a-z]+drag\\b');
  var AllCardinals = ['n','ne','e','se','s','sw','w','nw'];
  HipeResizable.prototype = {
    setNormalizingPoint: function(point){ this.normalizeWith = point; },
    top :    function(){return parsePx(this.element.css('top'));},
    right :  function(){return this.left() + this.width();},
    bottom : function(){return this.top() + this.height();},
    left :   function(){return parsePx(this.element.css('left'));},
    width:   function(){return parsePx(this.element.css('width')); },
    height:  function(){return parsePx(this.element.css('height')); },

    /**
    * allow the user to indicate any possibly redundant list of classes and do the right thing.
    * e.g   <div class="my-resizable">..</div>         # will add all 8 handles with $('.my-resizable').hipe_resizable();
    *      <div class="hipe-resizable-n-s-w">..</div>  # adds the 3 handles
    *      <div class="hipe-resizable-n hipe-resizable-s hipe-resizable-e hipe-resizable-e">
    *                                                  # longer form of above. note the repetition.
    */
    addHandles: function(){
     //var cls, all, specificHandles, matches, existing
      specificHandles = [];
      cls = this.element.attr('class');
      all = cls.match(SelectorRe);
      if (all) { // if this didn't match they are using their own css name and want all 8 handles
        for(var i=0; i < all.length; i++){
          matches = SelectorReNonGlobal.exec(all[i]);
          if (!matches) return this.error("error with our regex");
          if (matches[1]){
            var subSpecificHandles = matches[1].split('-');
            for (var j=0; j < subSpecificHandles.length; j++){
              var handle = subSpecificHandles[j];
              if ('default'==handle || 'theme'==handle) continue; // ick
              if (-1 == specificHandles.indexOf(handle)) specificHandles.push(handle);
            }
          }
        }
      }
      if (0==specificHandles.length) specificHandles = AllCardinals;
      specificHandles.sort(); // consistency in order that divs are added, for testing
      existing = this.getHashOfExistingHandleTypes();
      for(i=0;i < specificHandles.length; i++){
        var cardinal = specificHandles[i];
        if (!CardinalRe.exec(cardinal))
          return this.error('unrecognized cardinal direction"'+cardinal+
          '". Please choose among '+AllCardinals.join(', '));
        cls = cardinal+'drag';
        if (existing[cls]) continue;
        var handleDiv = $('<div class="'+cls+' handle"></div>');
        // for now we won't store the handles but in the future we might if we have embedded resizables
        this.element.append(handleDiv);
      }
      return true;
    },
    getHashOfExistingHandleTypes: function(){
      result = {};
      var children = this.element.children();
      for(var i=0; i < children.length; i++){
        var child = $(children[i]), md = null;
        if (child.hasClass('handle') && (md = XdragRe.exec(child.attr('class')))){
          result[md[0]] = true;
        }
      }
      return result;
    },
    normalizeAndSnapOrdinate: function(axis, value){
      var zero_or_one = (axis == 'x') ? 0 : 1;
      var delta = value - this.normalizeWith[zero_or_one];
      if (Math.abs(delta) >= this.grid[zero_or_one]){
        var snappedDelta = delta - (delta % this.grid[zero_or_one]);
        this.normalizeWith[zero_or_one] += snappedDelta;
        return snappedDelta;
      } else {
        return null;
      }
    },
    setWidth: function(newWidth){
      var asFloat = parseFloat(newWidth);
      if (isNaN(asFloat)) return this.error("Can't set width when css property is "+this.element.css('width'));
      if (asFloat < 0) return true;
      if (newWidth != asFloat) return this.error("needed float had "+newWidth+" for setWidth()");
      this.element.css("width", asFloat);
      return true;
    },
    setHeight: function(newHeight){
      var asFloat = parseFloat(newHeight);
      if (isNaN(asFloat)) return this.error("Can't set height when css property is "+this.element.css('height'));
      if (asFloat < 0) return true;
      if (newHeight != asFloat) return this.error("needed float had "+newHeight+" for setHeight()");
      this.element.css("height", asFloat);
      return true;
    },
    setTop: function(y){
      var snappedDelta, curTop, curHeight, newTop, newHeight;
      if (null !== (snappedDelta=this.normalizeAndSnapOrdinate('y',y))){
        if (isNaN(curTop    = this.top()   )) return this.error("can't setTop with css top property "+this.element.css('top'));
        if (isNaN(curHeight = this.height())) return this.error("can't setTop with css height property "+this.element.css('height'));
        newTop = curTop + snappedDelta;
        newHeight = curHeight + snappedDelta * -1;
        if (newHeight < 0) return true;
        if (!this.setHeight(newHeight)) return false;
        this.element.css("top",newTop);
      }
      return true;
    },
    setRight: function(x){
      var snappedDelta;
      if (null !== (snappedDelta=this.normalizeAndSnapOrdinate('x',x))){
        var newWidth = this.width() + snappedDelta;
        if (!this.setWidth(newWidth)) return false;
      }
      return true;
    },
    setBottom: function(y){
      var snappedDelta, curHeight;
      if (null !== (snappedDelta=this.normalizeAndSnapOrdinate('y',y))){
        if (isNaN(curHeight = this.height())) return this.error("can't setBottom with css height property "+this.element.css('height'));
        var newHeight = curHeight + snappedDelta;
        if (!this.setHeight(newHeight)) return false;
      }
      return true;
    },
    setLeft: function(x){
      var snappedDelta, curLeft, curWidth;
      if (null !== (snappedDelta=this.normalizeAndSnapOrdinate('x',x))){
        if (isNaN(curLeft  = this.left() )) return this.error("can't setLeft with css left property "+this.element.css('left'));
        if (isNaN(curWidth = this.width())) return this.error("can't setWidth with css width property "+this.element.css('width'));
        var newLeft  = this.left() + snappedDelta;
        var newWidth = this.width() + snappedDelta * -1;
        if (!this.setWidth(newWidth)) return false;
        this.element.css("left", newLeft);
      }
      return true;
    },
    setGrid: function(grid){
      if (grid[0] > 0 && grid[1] > 0){
        this.grid = grid;
        return true;
      } else {
        return this.error("invalid grid coordinates, must be positive ints or floats: "+xy(grid[0],grid[1]));
      }
    },
    error: function(msg){
      this._lastErrorMessage = msg;
      return false;
    },
    lastErrorMessage: function(){ return this._lastErrorMessage; },
    isValid: function(){ return (null===this._lastErrorMessage); }
  };

  $.widget("ui.hipe_resizable", $.extend({}, $.ui.mouse, {
    error: function(msg){
      puts("error from HipeResizable (window.T): "+msg);
      return false;
    },
    _init: function() {
      var self = this;
      if (( window.R = self.controller = new HipeResizable(self.element, self.options)).isValid()) { //@todo
        // ok
      } else {
        return this.error(self.controller.lastErrorMessage());
      }
      self._mouseInit();
      return true;
    },
    _mouseCapture: function(event) {
      var md, curr = $(event.target), self = this;
      while(!(md=HipeResizable.HandleRe.exec(curr.attr('class'))) && curr.parent().length > 0 ) curr = curr.parent();
      if (!md) return false;
      self.currentHandleType = md[1];
      self.controller.setNormalizingPoint([event.pageX, event.pageY]);
      return true;
    },
    _mouseMove: function(event){
      var res = null;
      switch(this.currentHandleType){
        case 'ndrag':   res = this.controller.setTop(event.pageY); break;
        case 'nedrag':  res = (this.controller.setTop(event.pageY) && this.controller.setRight(event.pageX)); break;
        case 'edrag':   res = this.controller.setRight(event.pageX); break;
        case 'sedrag':  res = (this.controller.setBottom(event.pageY) && this.controller.setRight(event.pageX)); break;
        case 'sdrag':   res = this.controller.setBottom(event.pageY); break;
        case 'swdrag':  res = (this.controller.setBottom(event.pageY) && this.controller.setLeft(event.pageX)); break;
        case 'wdrag':   res = this.controller.setLeft(event.pageX); break;
        case 'nwdrag':  res = (this.controller.setTop(event.pageY) && this.controller.setLeft(event.pageX)); break;
        default:
          this.error("unexpected handle type: "+this.currentHandleType); break;
      }
      if (false===res) {
        this.error(this.controller.lastErrorMessage());
        return false;
      }
      return true;
    }
  }));
})(window.jQuery);
