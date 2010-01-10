(function($) {

var puts = console.log;
var parse = function(str){
  var capture = /^(\d+(?:\.\d+)?)px$/.exec(str);
  return parseFloat(capture);
};

$.widget("ui.resizable_table", $.extend({}, $.ui.mouse, {

  tableStateConstructor : function(){
    var constructor = function(element, grid){
      this.element = $(element);
      this.grid = grid;
      this.numCols = ($(this.element.find('tr')[1]).find('td').size()-1) / 2;
    }
    constructor.prototype = {
      top :    function(){return parse(this.element.css('top'));},
      right :  function(){return this.left() + this.width();},
      bottom : function(){return this.top() + this.height();},
      left :   function(){return parse(this.element.css('left'));},
      width:   function(){return this.element.width();},
      height:  function(){return this.element.height();},
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
        var delta = newWidth - this.width();
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
        //this.doBars(delta);
      },
      doBars: function(delta){
        var trs = this.element.find('tr');
        firstRow = trs[0];
        tds = $(firstRow).find('td');
        if (tds.length != 3) return;
        var widthOfThings = $(tds[0]).width() + $(tds[2]).width();
        if (delta!=0) {
          wc = this.element.width() - this.oldWidth
          // var oldInnerWidth = this.oldWidth - widthOfThings;
          // var newInnerWidth = oldInnerWidth += (delta - 6);
        }
        var barRows = [0,2, trs.length-1];
        for(var i in barRows){
          var j = barRows[i];
          var outDiv = $(trs[j]).find('div.out');
          outDiv.css('width', newInnerWidth);
        }
      },
      cdrag: function(newX){
        var delta = newX - this.normalizeWith[0];
        if (Math.abs(delta) >= this.grid[0]){
          var snappedDelta = delta - (delta % this.grid[0]);
          puts("sd: "+snappedDelta);
          var parent = this.cdragHandle.parent();
          children = parent.children();
          for(var i = 0; i < children.length-1; i++){
            if (children[i] == this.cdragHandle[0]){
              break;
            }
          }
          if (i==0 || i == children.length-1) return;
          topRow = $(this.element.find('tr')[1]);
          currLeftWidth =  $(topRow.find('td')[i-1]).find('div.out').width();
          currRightWidth = $(topRow.find('td')[i+1]).find('div.out').width();
          if (snappedDelta < 0 && currLeftWidth < this.grid[0]) return;
          if (snappedDelta > 0 && currRightWidth < this.grid[0]) return;
          if (snappedDelta < 0){
            snappedDelta = Math.max(snappedDelta, (currLeftWidth * -1) + this.grid[0] );
          } else {
            snappedDelta = Math.min(snappedDelta, (currRightWidth) - this.grid[0] );
          }
          var trs = this.element.find('tr');
          last = trs.length - 2;

          for(var j=1; j<=last; j ++){
            if (j==2) continue;
            var tds = $(trs[j]).find('td');
            leftOut  = $(tds[i-1]).find('div.out');
            rightOut = $(tds[i+1]).find('div.out');
            leftOut.css('width', currLeftWidth + snappedDelta);
            rightOut.css('width', currRightWidth - snappedDelta);
          }
          this.normalizeWith[0] += snappedDelta;
        }
      },
    };
    return constructor;
  },
  _init: function() {
    T = this;
    this.handleNames = 'wdrag,swdrag,sdrag,sedrag,edrag,cdrag'
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
        var currentHandle = this.handleElements[i];
        this.currentAxis = /\b([a-z]+drag)\b/.exec($(currentHandle).attr('class'))[1];
        if ('cdrag'==this.currentAxis){
          this.table.cdragHandle = $(currentHandle);
        }
        this.table.normalizeWith = [event.pageX, event.pageY];
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
      case 'cdrag':
        this.table.cdrag(event.pageX);
        break;
    }
  }
}));


})(jQuery);
