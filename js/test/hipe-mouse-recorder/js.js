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
        case 112: this.playback();  return true;
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
        //this.startTime = (new Date).getTime();
        this.startTime = event.timeStamp;
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
        this.softError('not recording.');
      }
      return false;
    },
    playback: function(){
      this.setStatusMessage('playing back...');
      puts('playback');
      this.state = 'playback';
      this.runAnimation();
      return false;
    },
    runAnimation: function(){
      if (!this.recordings || !this.recordings.length) {
        return this.softError("no recordings to play back.");
      }
      if (!this.targetEl) {
        return softError("no target element defined for playback!");
      }
      this.sleepOffset = 0;
      this.lastAnimationFrame = this.recordings.length - 1;
      this.runAnimationFrame(0);
      return null;
    },
    unnormalize : function(x,y){
      if (!this.unnormalizer) {
        var offset = this.targetEl.offset();
        this.unnormalizer = [Math.round(offset.left), Math.round(offset.top)];
      }
      return new Point(this.unnormalizer[0]+x, this.unnormalizer[1]+y);
    },
    runAnimationFrame: function(idx){
      var frame = this.recordings[idx];
      var pt = this.unnormalize(frame[1],frame[2]);
      var sleepFor =  frame[3] - this.sleepOffset;
      this.sleepOffset = frame[3];
      var mockMouseEvent = {
        pageX : pt[0],
        pageY : pt[1],
        target : this.targetEl[0]
      };
      var self = this;
      setTimeout(function(){
        puts("playback" + frame[0]);
        self.targetEl.trigger(frame[0],[mockMouseEvent]);
        if (idx < self.lastAnimationFrame) {
          self.runAnimationFrame(idx+1);
        }
      }, sleepFor);
    },
    softError: function(msg){
      this.setStatusMessage(msg);
      return null;
    },
    setStatusMessage: function(msg){
      this.statusEl.html(msg);
    },
    view: function(){
      if (!this.recordings || this.recordings.size==0) {
        this.softError('no recordings to view');
      } else {
        this.setStatusMessage('viewing...');
      }
      return false;
    },
    normalizeMouseEventPoint: function(e){
      if (!this.normalizer) {
        this.normalizer = this.canvasEl.offset();
      }
      var x,y;
      x = Math.round(e.pageX - this.normalizer.left);
      y = Math.round(e.pageY - this.normalizer.top);
      return new Point(x,y);
    },
    mousedown: function(e,e2){
      if(e2) e=e2;
      puts("md! E1 and E2"); E1 = e; E2 = e2;
      var pt;
      if (this.canvasEl[0] == e.target) {
        puts("target yes");
        this.md = true; // mouse dragging
        pt = this.normalizeMouseEventPoint(e);
        switch(this.state) {
          case 'ready':
          case 'playback':
            this.goTransientDot(pt, this.transHot);
            break;
          case 'recording':
            this.recordMouseEvent(e,'mousedown',pt);
            this.goTransientDot(pt, this.recHot);
            break;
        }
        return true;
      }
      return false;
    },
    mousemove: function(e,e2){
      if(e2) e=e2;
      puts("mm with mme1 && mme2"); mme1 = e; mme2 = e2;
      var pt = this.normalizeMouseEventPoint(e);
      switch(this.state){
        case 'ready':
        case 'playback':
          this.goTransientDot(pt, this.md ? this.transWarm : this.transCool);
          break;
        case 'recording':
          this.recordMouseEvent(e,'mousemove',pt);
          this.goTransientDot(pt, this.md ? this.recWarm : this.recCool);
          break;
      }
    },
    mouseup: function(e,e2){
      if(e2) e=e2;
      puts("mu with mue1 && mue2"); mue1 = e; mue2 = e2;
      this.md = false; // mouse dragging
      var pt = this.normalizeMouseEventPoint(e);
      switch(this.state){
        case 'ready':
        case 'playback':
          this.goTransientDot(pt, this.transCool);
          break;
        case 'recording':
          this.recordMouseEvent(e,'mousemove',pt);
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

  $.widget("ui.hipe_mouse_recorder", {
    _init: function(){
      //this._mouseInit();
      el = $(this.element);
      cnt = new Controller(el, this, this.options.name);
      puts("C"); window.C = cnt;
      el.data('controller',cnt);
      $(window.document).keypress(function(e){cnt.keypress(e);});
      el.bind('mousedown',function(e,e2){return cnt.mousedown(e,e2);});
      el.bind('mousemove',function(e,e2){return cnt.mousemove(e,e2);});
      el.bind('mouseup',function(e,e2){return cnt.mouseup(e,e2);});
      el.find('.rec').click(function(){return cnt.rec();});
      el.find('.stop').click(function(){return cnt.stop();});
      el.find('.pb').click(function(){return cnt.playback();});
      el.find('.view').click(function(){return cnt.view();});
      this._cnt = cnt;
    }
  });
})(jQuery);
