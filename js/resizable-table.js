(function($) {

$.widget("ui.resizable_table", $.extend({}, $.ui.mouse, {

  tableStateConstructor : function(){
    var constructor = function(element, grid){
      this.element = $(element);
      this.grid = grid;
      this.numCols = ($(this.element.find('tr')[1]).find('td').size()-1) / 2;
    }
    constructor.prototype = {
      top :    function(){return this.parse(this.element.css('top'));},
      right :  function(){return this.left() + this.width();},
      bottom : function(){return this.top() + this.height();},
      left :   function(){return this.parse(this.element.css('left'));},
      width:   function(){return this.element.width();},
      height:  function(){return this.element.height();},
      parse :  function(str){
        var capture = /^(\d+(?:\.\d+)?)px$/.exec(str);
        return parseFloat(capture);
      },
      setRight: function(x){
        var delta = x - this.normalizeWith[0];
        if (Math.abs(delta) >= this.grid[0]){
          var snappedDelta = delta - (delta % this.grid[0]);
          var newWidth = this.width() + snappedDelta;
          this.changeWidthTo(newWidth);
          this.normalizeWith[0] += snappedDelta;
        }
      },
      setLeft: function(x){

      },
      setBottom: function(y){

      },
      setTop: function(y){

      },
      // distribute the new width evenly across columns
      changeWidthTo: function(newWidth){
        this.oldWidth = this.width();
        var delta = newWidth - this.oldWidth;
        var tds = $(this.element.find('tr')[1]).find('td');
        var last = ( this.numCols * 2 ) - 1;
        var widths = [];
        var totalWidths = 0;
        for(var i = 1; i <= last; i += 2){
          var width = $(tds[i]).find('div.out').width();
          totalWidths += width;
          widths.push(width);
        }
        var addThese = [];
        var deltaAfterRounding = 0;
        for(var i = 0; i < widths.length; i++) {
          var addThis = Math.round(delta * widths[i] / totalWidths );
          addThese.push(addThis);
          deltaAfterRounding += addThis;
        }
        // make sure snap is still ok after rounding, sacrificing accuracy of last column
        addThese[addThese.length - 1] -= ( deltaAfterRounding - delta );

        var newWidths = [];
        for(var i = 0; i < addThese.length; i++) {
          newWidths.push(widths[i] + addThese[i]);
        }
        var trs =  this.element.find('tr');
        var last = trs.length - 2;
        this.addThese = addThese;
        this.widths = widths;
        this.newWidths = newWidths;
        for(var i = 1; i <= last; i++){
          if (i==2) continue;
          var tds = $(trs[i]).find('td');
          for(var j in newWidths){
            var els = $(tds[j * 2 + 1]).find('div.out');
            els.css('width', newWidths[j]);
          }
        }
        this.doBars(delta);
      },
      doBars: function(delta){
        var trs = this.element.find('tr');
        firstRow = trs[0];
        tds = $(firstRow).find('td');
        if (tds.length != 3) return;
        var widthOfThings = $(tds[0]).width() + $(tds[2]).width();
        var oldInnerWidth = this.oldWidth - widthOfThings;
        var newInnerWidth = oldInnerWidth += (delta - 8);
        var barRows = [0,2, trs.length-1];
        for(var i in barRows){
          var j = barRows[i];
          var el = $(trs[j]).find('div.out');
          console.log("tring to set nu inner width "+newInnerWidth+" to row "+j+" to "+el.length+" elements");
          el.css('width', newInnerWidth);
        }
      }
    };
    return constructor;
  },
  _init: function() {
    T = this;
    this.handleNames = 'wdrag,swdrag,sdrag,sedrag,edrag'
    this.table =  new (this.tableStateConstructor())(this.element, this.options.grid);
    n = this.handleNames.split(",");
    this.handleElements = [];
    for(var i = 0; i < n.length; i++) {
      var handleName = $.trim(n[i]);
      this._prepareHandles(handleName);
    }
    this._mouseInit();
  },
  _prepareHandles : function(handleName) {
    var self = this;
    this.element.find('.'+handleName).each(function(){
      self.handleElements = self.handleElements.concat(this);
    });
  },
  _mouseCapture: function(event) {
    for (var i in this.handleElements){
      if (this.handleElements[i] == event.target){
        this.table.normalizeWith = [event.pageX, event.pageY];
        currentHandle = this.handleElements[i];
        this.currentAxis = /\b([a-z]+drag)\b/.exec($(currentHandle).attr('class'))[1];
        return true;
      }
    }
    return false;
  },
  _mouseMove: function(event){
    switch(this.currentAxis){
      case 'edrag':
        this.table.setRight(event.pageX);
        break;
    }
  }
}));


})(jQuery);
