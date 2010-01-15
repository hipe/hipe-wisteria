(function($) {

  var puts = window.console.log;

  $.widget("ui.canvas", {
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
