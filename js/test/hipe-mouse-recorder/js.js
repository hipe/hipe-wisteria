(function(x) {
  var $ = x;
  var puts = window.console ? window.console.log : function(m){};
  var error = function(msg){ throw new Exception(msg); };

  var Point = function(x,y){
    var arr = [x,y];
    $.extend(arr, Point.prototype);
    return arr;
  };

  Point.prototype = {
    pointLike: true,
    pointInspect: function(){ return "["+this[0]+"]["+this[1]+"]"; }
  };


  var Controller = function(el){
    this.element = el;
    this.canvasEl = el.find('canvas');
    this.goCanvas();
    this.statusEl = el.find(".status");
    this.state = 'ready';
  };
  Controller.prototype = {
    keypress : function(e){
      puts(e.charCode);
      switch(e.charCode){
        case 114: this.rec(); return true;
        case 115: this.stop(); return true;
        case 112: this.pb();  return true;
        case 118: this.view();  return true;
      }
      return false;
    },
    rec: function(){
      this.setStatusMsg('recording...');
      puts('rec');
    },
    stop: function(){
      this.setStatusMsg('stopped.');
      puts('stop');
      this.element.find('.status').html("stopped");
    },
    pb: function(){
      this.setStatusMsg('playing back...');
      puts('pb');
    },
    setStatusMsg: function(msg){
      this.statusEl.html(msg);
    },
    view: function(){
      this.setStatusMsg('viewing...');
    },
    mouseCapture: function(e){
      if (this.canvasEl[0] == e.target) {
        var pt = new Point(e.layerX, e.layerY);
        switch(this.state) {
          case 'ready':
            this.state = 'transient dots';
            this.goTransientDot(pt, this.transientDotColor);
            break;
        }
        return true;
      }
    },
    mouseMove: function(e){
      switch(this.state){
        case 'transient dots':
          var pt = new Point(e.layerX, e.layerY);
          this.goTransientDot(pt, this.transientDotColor);
          break;
      }
    },
    mouseUp: function(e){
      switch(this.state){
        case 'transient dots':
          this.state = 'ready';
          break;
      }
    },
    goCanvas: function(){
      this.context = this.canvasEl[0].getContext("2d");
      this.dotColor = this.canvasEl.css('color');
      this.transientDotColor = 'rgb(255,255,255)';
      this.blankColor = this.canvasEl.css('background-color');
      this.context.fillStyle = this.canvasEl.css('color');
    },
    goTransientDot: function(pt,color){
      this.context.fillStyle = this.transientDotColor;
      this.context.fillRect(pt[0],pt[1],1,1);
      var self=this;
      setTimeout(function(){
        self.transoDottoOffo(pt);
      },1000);
    },
    transoDottoOffo: function(pt){
      this.context.fillStyle = this.blankColor;
      this.context.fillRect(pt[0],pt[1],1,1);
    }
  };

  $.widget("ui.hipe_mouse_recorder", $.extend({}, $.ui.mouse, {
    _init: function(){
      this._mouseInit();
      el = $(this.element);
      cnt = new Controller(el);
      puts("C"); window.C = cnt;
      el.data('controller',cnt);
      $(window.document).keypress(function(e){cnt.keypress(e);});
      el.find('.rec').click(function(){cnt.rec();});
      el.find('.stop').click(function(){cnt.stop();});
      el.find('.pb').click(function(){cnt.pb();});
      el.find('.view').click(function(){cnt.view();});
      this._cnt = cnt;
    },
    _mouseCapture: function(e){return this._cnt.mouseCapture(e);},
    _mouseMove: function(e){return this._cnt.mouseMove(e);},
    _mouseUp: function(e){return this._cnt.mouseUp(e);}
  }));
})(jQuery);
