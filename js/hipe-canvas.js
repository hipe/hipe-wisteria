(function($) {

  var puts = window.console ? window.console.log : function(m){};

  var parsePx = function(str){
    return parseFloat(/^-?(\d+(?:\.\d+)?)px$/.exec(str));
  };
  var pt = function(pt){ return "["+pt[0]+"]["+pt[1]+"]"; };

  $.widget("ui.hipe_canvas_font_metrics", {
    _init: function() {
      this.recalculate() || puts(this.error());
    },
    error: function(msg){
      if (msg) {
        this.last_error_message = msg;
        return false;
      } else {
        return "font_metrics fail: "+this.last_error_message;
      }
    },
    recalculate: function(){
      var w, h, tw, th, wf, hf, nh, nh2, nh3, t1;
      t1 = (new Date).getTime();
      w = this.element.width();
      tw = this.element.parent().width();
      wf = Math.floor(tw / w);
      nh = this.element.html();
      if (wf<1)
        return this.error("registration text is wider than parent div");
      if (wf!=1) {
        nh = new Array(wf+1).join(nh);
        this.element.html(nh);
        w = this.element.width();
        if (w>tw) return this.error("new width wider than target?");
      }
      w = parsePx(this.element.css('width'));
      th = this.element.parent().height();
      nh2 = "A<br/>B<br/>C<br/>D<br/>E<br/>F<br/>G<br/>"; // hard-coded 7 belo
      this.element.html(nh2);
      h = this.element.height();
      if (h>th)
        return this.error("registration height is greater than parent");
      hf = Math.floor(th / h);
      if (hf!=1) {
        nh2 = new Array(hf+1).join(nh2);
        this.element.html(nh2);
        h = this.element.height();
        if (h>th) return this.error("new height wider than target?");
      }
      var charsHigh = 7 * hf;
      var charsWide = nh.length;
      h = parsePx(this.element.css('height'));
      var dim = [w/charsWide,h/charsHigh];
      window.fm = this;
      puts('window.fm dimensions w:'+w+" h:"+h+" dim:"+pt(dim)+
        ' in '+((new Date).getTime() - t1)+' msec');
      this.element.data('dimensions',dim);
      this.element.html(nh+'<br/>'+nh2); //just for visual debugging
      return true;
    }
  });


  $.widget("ui.hipe_canvas_dots", {
    _init: function() {
      this.context = this.element[0].getContext("2d");
      this.context.fillStyle = this.element.css('color');
      this.gridX = this.options.grid[0];
      this.gridY = this.options.grid[1];
      if (!this.gridX || !this.gridY) return;
      this.width = this.element.attr('width');
      this.height = this.element.attr('height');
      this.goDots();
    },
    goDots: function(){
      for(var i = 0; i<this.height; i+= this.gridY){
        for(var j = 0; j<this.width; j+= this.gridX){
          this.context.fillRect(j,i,1,1);
        }
      }
    }
  });

})(window.jQuery);
