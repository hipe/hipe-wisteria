(function($) {

var puts = console.log;

var parse = function(str){
  var capture = /^(\d+(?:\.\d+)?)px$/.exec(str);
  return parseFloat(capture);
};

$.widget("ui.resizable_table", $.extend({}, $.ui.mouse, {

  tableStateConstructor : function(){
    var constructor = function(element, options){
      this.element = $(element);
      this.grid = options.grid;
      this.options = options;
      this.numCols = ($(this.element.find('tr')[1]).find('td').size()-1) / 2;
      this.initSeparatorRows();
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
          var newWidth = widths[i] + addThese[i];
          if (newWidth < 0) return; // this might be overly strict? w/o this separator bars get messed up
          newWidths.push(newWidth);
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
            //puts ("["+i+"]["+j+"] new width: "+newWidths[j]);
            var els = $(tds[j * 2 + 1]).find('div.out');
            els.css('width', newWidths[j]);
          }
        }
        if (this.barHackRows.length > 0) {
          if (delta > 0){
            this.extendBarHackRowContentIfNecessary(deltaAfterRounding);
          } else if (delta < 0) {
            this.shortenBarHackRows(deltaAfterRounding);
          }
        }
      },
      rowMatchesSeparatorPattern: function(row){
        var tds = row.find('td');
        if (tds.length != 3) return false;
        return true;  // @todo this might get false positives on single column tables!
      },
      separatorRowMatchesBarHackPattern: function(row){
        return (row.find('td div.out div.in').html().trim().length >= 1); // @todo untested greater than one
      },
      establishSeparatorRows: function(){
        var idxs = this.getPossibleSeparatorRowIndexes();
        this.separatorRows = [];
        this.barHackRows = [];
        for(var i in idxs) {
          var row = $(this.trs[idxs[i]]);
          if (this.rowMatchesSeparatorPattern(row)){
            this.separatorRows.push(row);
            if (this.separatorRowMatchesBarHackPattern(row)){
              this.barHackRows.push(row);
            }
          }
        }
        if (this.barHackRows.length > 0){
          this.barHackRows = $(this.barHackRows);
          for(var i=0; i < this.barHackRows.length; i++){
            var theTd = $($(this.barHackRows[i]).find('td')[1]);
            this.barHackRows[i].theTd = theTd;
            theTd.divOut = theTd.find('div.out');
            var divIn = theTd.divOut.find('div.in');
            theTd.divOut.divIn = divIn;
            divIn.repeaterString = divIn.html().trim();
            divIn.html(divIn.repeaterString);
            divIn.repeaterStringWidth = divIn.width();
          }
        }
      },
      getPossibleSeparatorRowIndexes: function(){
        if (!this.possibleSeparatorRowIndexes) {
          this.possibleSeparatorRowIndexes = [0,2];
          if (this.trs.length > 3) {
            this.possibleSeparatorRowIndexes.push(this.trs.length-1);
          }
        }
        return this.possibleSeparatorRowIndexes;
      },
      initSeparatorRows: function(){
        this.trs = this.element.find('tr');
        this.establishSeparatorRows();
        if (this.barHackRows.length > 0){
          this.extendBarHackRowContentIfNecessary(0);
        }
      },
      shortenBarHackRows: function(delta){
        if (delta >= 0) return;
        //puts("delta to shorten bar hack rows is "+delta+"px.");
        for(var i=0; i < this.barHackRows.length; i++){
          divOut = this.barHackRows[i].theTd.divOut;
          divIn = divOut.divIn;
          divOut.css('width', divOut.width() + delta);
        }
      },
      // we want the div.in to be as long or longer than div.out! (using overflow)
      extendBarHackRowContentIfNecessary: function(delta){
        if (delta < 0) return; // zero is ok
        var divOut, divIn, currWidth, targetWidth, factor, newHtml, numCharsToAdd, addThisString,
          neededWidth;
        for(var i=0; i < this.barHackRows.length; i++){
          divOut = this.barHackRows[i].theTd.divOut;
          divIn = divOut.divIn;
          divOut.css('width', divOut.width()+delta); // when delta is zero this this still "locks it down"
          outWidth = divOut.width();
          inWidth = divIn.width();
          if ((outWidth-4) > inWidth) { // this will always be true unless we ever lock down the outer width @todo borders hac
            neededWidth = outWidth - inWidth;
            repeatNumTimes = Math.ceil(neededWidth / divIn.repeaterStringWidth);
            addThisString = new Array(repeatNumTimes + 2).join(divIn.repeaterString);
            newHtml = divIn.html() + addThisString;
            /*puts(i+") to get from "+inWidth+"px to "+outWidth+"px we will need "+neededWidth+
              "px which we add with "+repeatNumTimes+" repeater strings (\""+ divIn.repeaterString+"\")");*/
            divIn.html(newHtml);
          } else {
            //puts(i+") not adding repeater strings.  threshold not reached (in: "+inWidth+"px out: "+outWidth+"px)");
          }
        }
      },
      cdrag: function(newX){
        var delta = newX - this.normalizeWith[0];
        if (Math.abs(delta) >= this.grid[0]){
          var snappedDelta = delta - (delta % this.grid[0]);
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
    this.table =  new (this.tableStateConstructor())(this.element, this.options);
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
