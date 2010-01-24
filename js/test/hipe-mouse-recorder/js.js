(function(x) {
  var $ = x;

  // var puts = window['console'] ? window.console.log : function(m){};
  var puts = function(m){
    if (window.console)
      window.console.log(m);
    else
      alert(m);

  };

  var error = function(msg){ throw new Exception(msg); };

  var Point = function(x,y){
    var arr = [x,y];
    $.extend(arr, Point.prototype);
    return arr;
  };

  Point.prototype = {
    pointLike: true,
    inspectPoint: function(){ return "["+this[0]+"]["+this[1]+"]"; }
  };


  var Controller = function(el, jqWidget, name){
    this.jqWidget = jqWidget;
    this.recorderName = name || '[no name]';
    this.puts = puts;
    this.element = el;
    this.canvasEl = el.find('canvas');
    this.targetEl = null;
    this.goCanvas();
    this.statusEl = el.find(".status");
    this.state = 'ready';
  };
  Controller.prototype = {
    goCanvas: function(){
      this.context = this.canvasEl[0].getContext("2d");
      this.dotColor = this.canvasEl.css('color');
      this.transWarm = 'rgb(255,255,255)';
      this.transCool = 'rgb(100,100,100)';
      this.transHot  = 'rgb(0,255,0)';
      this.recWarm =   'rgb(0,255,0)';
      this.recCool =   'rgb(0,0,255)';
      this.recHot =    'rgb(255,0,0)';
      this.blankColor = this.canvasEl.css('background-color');
      this.context.fillStyle = this.canvasEl.css('color');
    },
    setTarget: function(e){
      puts("set target playback element for "+this.recorderName);
      this.targetEl = $(e);
    },
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
      puts('rec');
      if ('recording'==this.state) return false;
      this.startTime = null;
      this.recordings = null;
      this.setStatusMessage('recording...');
      this.state = 'recording';
      return false;
    },
    recordMouseEvent: function(event, type, normPoint){
      if (null===this.startTime) {
        this.startTime = (new Date).getTime();
        this.recordings = [];
      }
      var timeOffset = event.timeStamp - this.startTime;
      var recording = [type,normPoint[0],normPoint[1],timeOffset];
      this.recordings.push(recording);
    },
    stop: function(){
      if (this.state=='recording') {
        this.setStatusMessage('stopped.');
        puts('stop');
        this.element.find('.status').html("stopped");
        this.element.find('.view').removeClass('disabled');
        this.state = 'ready';
      } else {
        this.setStatusMessage('not recording.');
      }
      return false;
    },
    pb: function(){
      this.setStatusMessage('playing back...');
      puts('pb');
      this.state = 'playback';
      this.runAnimation();
      return false;
    },
    setStatusMessage: function(msg){
      this.statusEl.html(msg);
    },
    view: function(){
      if (!this.recordings || this.recordings.size==0) {
        this.setStatusMessage('no recordings to view');
      } else {
        this.setStatusMessage('viewing...');
      }
      return false;
    },
    normalizeMouseEventPoint: function(e){
      var x,y;
      x = Math.round(e.pageX - this.normalizer.left);
      y = Math.round(e.pageY - this.normalizer.top);
      return new Point(x,y);
    },
    mouseCapture: function(e){
      puts("got mc");
      var pt;
      if (this.canvasEl[0] == e.target) {
        this.md = true;
        this.normalizer = this.canvasEl.offset();
        pt = this.normalizeMouseEventPoint(e);
        switch(this.state) {
          case 'ready':
            this.goTransientDot(pt, this.transHot);
            break;
          case 'recording':
            this.recordMouseEvent(e,'_mouseCapture',pt);
            this.goTransientDot(pt, this.recHot);
            break;
        }
        return true;
      }
      return false;
    },
    mouseMove: function(e){
      puts("got mm");
      var pt = this.normalizeMouseEventPoint(e);
      switch(this.state){
        case 'ready':
          this.goTransientDot(pt, this.md ? this.transWarm : this.transCool);
          break;
        case 'recording':
          this.recordMouseEvent(e,'_mouseMove',pt);
          this.goTransientDot(pt, this.md ? this.recWarm : this.recCool);
          break;
      }
    },
    mouseUp: function(e){
      puts("got mu");
      this.md = false;
      var pt = this.normalizeMouseEventPoint(e);
      switch(this.state){
        case 'ready':
          this.goTransientDot(pt, this.transCool);
          break;
        case 'recording':
          this.recordMouseEvent(e,'_mouseUp',pt);
          this.goTransientDot(pt, this.recCool);
          break;
      }
    },
    goTransientDot: function(pt,color){
      this.context.fillStyle = color;
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
      cnt = new Controller(el, this, this.options.name);
      puts("C"); window.C = cnt;
      el.data('controller',cnt);
      $(window.document).keypress(function(e){cnt.keypress(e);});
      el.find('.rec').click(function(){return cnt.rec();});
      el.find('.stop').click(function(){return cnt.stop();});
      el.find('.pb').click(function(){return cnt.pb();});
      el.find('.view').click(function(){return cnt.view();});
      this._cnt = cnt;
    },
    _mouseCapture: function(e){return this._cnt.mouseCapture(e);},
    _mouseMove: function(e){return this._cnt.mouseMove(e);},
    _mouseUp: function(e){return this._cnt.mouseUp(e);}
  }));
})(jQuery);
