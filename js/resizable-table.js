(function($) {


  // ************** local functions ****************

  var puts = window.console ? window.console.log : function(msg){};

  var extend = function(target,source){
    for (var i in source){
      target[i] = source[i];
    }
    return target;
  };

  var xy = function(x,y){ return '['+x+']['+y+']'; };

  var parsePx = function(str){
    var capture = /^-?(\d+(?:\.\d+)?)px$/.exec(str);
    return parseFloat(capture);
  };

  var snapToRange = function(value,min,max){
    if (value<min) return min;
    if (value>max) return max;
    return value;
  };

  // ************** local prototypes ****************
  var ListLike = {};
  ListLike.prototype = {
    last: function(){ return this[this.length-1]; }
  };


  var AsciiBarHackMethods = {};

  /** @constructor */
  var ResizableTable = function(element, options){
    this._lastErrorMessage = null;
    if (!this.setGrid(options.grid || [5,5])) return this;
    this.semantifyTable(element); // ignore return value. client should check if table is valid.
    return this;
  };
  ResizableTable.re = /\b([wce]drag)\b/;
  ResizableTable.validCelNodeNames = ['TH','TD'];
  ResizableTable.prototype = {
    top :    function(){return parsePx(this.table.css('top'));},
    right :  function(){return this.left() + this.width();},
    bottom : function(){return this.top() + this.height();},
    left :   function(){return parsePx(this.table.css('left'));},
    width:   function(){return this.table.width();},
    height:  function(){return this.table.height();},
    setRight: function(x){
      var delta = x - this.normalizeWith[0];
      if (Math.abs(delta) >= this.grid[0]){
        var snappedDelta = delta - (delta % this.grid[0]);
        this.normalizeWith[0] += snappedDelta;
        var newWidth = this.width() + snappedDelta;
        if (!this.setWidth(newWidth)) return false;
      }
      return true;
    },
    setLeft: function(x){
      var delta = x - this.normalizeWith[0];
      if (Math.abs(delta) >= this.grid[0]){
        var leftPx = this.left();
        if (isNaN(leftPx)) {
          return this.error('Can\'t setLeft() when table\'s css \'left\' property is set to "'+this.table.css('left')+'"');
        }
        var snappedDelta = delta - (delta % this.grid[0]);
        this.normalizeWith[0] += snappedDelta;
        var newLeft = leftPx + snappedDelta;
        this.table.css('left',newLeft);
        if (newLeft != parsePx(this.table.css('left'))){
          return this.error("problem moving left? current new left is "+parsePx(this.table.css('left'))+" and should be "+newLeft);
        }
        var newWidth = this.width() + (snappedDelta * -1.0);
        if (!this.setWidth(newWidth)) return false;
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
    isValid: function(){ return (null===this._lastErrorMessage); },
    semantifyTable: function(element){
      this.table = null;
      this.barHackRows = [];
      this.indexesOfResizableColumns = extend([], ListLike.prototype);
      if (!'TABLE'==element.nodeName) return this.error("need table had "+element.nodeName);
      var table = $(element);
      var i, tr, separatorTrs = [], dataTrs = [], barHackRows = [], semanticTr;
      var trs = table.find('tr');
      for (i = 0; i < trs.length; i++){
        tr = $(trs[i]);
        if (tr.hasClass('decorative-separator')) {
          separatorTrs.push(tr);
          if (this.separatorRowMatchesBarHackPattern(tr)) barHackRows.push(tr);
        } else {
          if (! (semanticTr = this.semantifyRow(tr,i))) return false;
          dataTrs.push(semanticTr);
        }
      }
      if (barHackRows.length) {
        extend(this,AsciiBarHackMethods.prototype);
        this.barHackRows = this.enhanceBarHackRows(barHackRows);
        this.extendBarHackRowContentIfNecessary(0);
      }
      if (!dataTrs.length) return this.error("no data trs in this table");
      this.dataTrs = dataTrs;
      this.table = table;
      return this.isValid();
    },
    semantifyRow: function(tr,y){
      var x, md, cel, divIn, children, myColumnsMeta, colsMeta, columnMeta;
      if (tr.length != 1) return this.error("expecting one tr row had "+tr.length+" at row offset "+y);
      children = tr.children();
      if (!children.length) return this.error("found tr ("+tr[0].nodeName+") with no children at row offset "+y);
      myColumnsMeta = Array(children.length);
      colsMeta = (this.colsMeta) ? false : Array(children.length);
      for (x=0; x<children.length; x++) {
        cel = $(children[x]); // a th or a td
        if (-1==ResizableTable.validCelNodeNames.indexOf(cel[0].nodeName))
          return this.error("invalid cel type "+cel[0].nodeName);
        if ((md = ResizableTable.re.exec(cel.attr('class')))) {
          switch(md[1]){
            case 'edrag':
            case 'wdrag': break; // can be anywhere, e.g. a table whose leftmost column is checkboxes
            case 'cdrag':
              if(x<1 || (!myColumnsMeta[x-1]) || (!myColumnsMeta[x-1].hasDivs) || x == children.length-1 ) {
                this.myColumnsMeta = myColumnsMeta;
                return this.error("cdrag must come between resizable cels at "+xy(x,y)+" (see this.myColumnsMeta)");
              }
              break;
            default: return this.error("for now, unrecognized drag type: "+md[1]);
          }
          if (colsMeta) colsMeta[x] = {dragType: md[1]};
        } else {
          if ( 0 == (divIn = cel.find('div.out div.in')).length ){
            return this.error("need div.out and div.in for resizable cels at "+xy(x,y));
          } else {
            columnMeta = {hasDivs:true};
            myColumnsMeta[x] = columnMeta;
            var currWidth = divIn.css('width');
            divIn.css('width', currWidth); // need to lock it? @todo
            if (colsMeta) {
              columnMeta.isFixedWidth = cel.hasClass('fixed-width');
              colsMeta[x] = columnMeta;
              if (!columnMeta.isFixedWidth) this.indexesOfResizableColumns.push(x);
            }
          }
        }
      }
      if (colsMeta) this.colsMeta = colsMeta;
      return tr;
    },
    setCdragHandle: function(handle){
      var idx, i, children;
      if (false === (idx = this.indexOfThisHandle(handle))) return false; // callee set error message
      this.leftOuts = [];
      this.riteOuts = [];
      for(i=0; i<this.dataTrs.length; i++){
        children = this.dataTrs[i].children(); // should be only td's and th's
        this.leftOuts.push($(children[idx-1]).find('div.out'));
        this.riteOuts.push($(children[idx+1]).find('div.out'));
      }
      return true;
    },
    /**
    * create a matrix of jquery elements, one for each cel that will resize
    * @return [bool] false on error (sets error message)
    */
    setWedragHandle: function(handle){
      var i,j,x,y,children,el;
      if (!this.dataTrs[0]) return this.error("no data trs, can't wedrag");
      var idxs = this.indexesOfResizableColumns;
      this.horizontalScaleMatrix = new Array(this.dataTrs.length);
      for (i = 0; i < this.dataTrs.length; i++) {
        this.horizontalScaleMatrix[i] = new Array(this.colsMeta.length);
        for (j = 0; j < idxs.length; j++){
          x = idxs[j];
          children = this.dataTrs[i].children();
          el = $(children[x]).find('div.out');
          if (!(el.length == 1)) {
            return this.error("expecting div.out at [i][x]: "+xy(i,x)+" (see this.dataTrs)");
          }
          this.horizontalScaleMatrix[i][x] = el;
        }
      }
      return true;
    },
    indexOfThisHandle: function(handle){
      var children = handle.parent().children();
      var found = false;
      for(var handleIdx = 0; handleIdx < children.length; handleIdx++){
        if (children[handleIdx] == handle[0]){
          found = true;
          break;
        }
      }
      if (!found) return this.error("idx of handle not found");
      return handleIdx;
    },

    /**
    * determine the normalized delta of the move of a column separator and apply the changes.
    * A negative delta means you are moving a column separator to the left, etc.
    * Add and remove width to each cel of the columns immediately to the left and right of the handle appropriately.
    * @return [bool] success or failure.  This should never fail provided newX is an int.
    */
    cdrag: function(newX){
      if (!this.leftOuts.length) return this.error("cdrag called when leftOuts not set or zero length");
      var delta = newX - this.normalizeWith[0];
      if (Math.abs(delta) < this.grid[0]) return true;
      var snappedDelta = delta - (delta % this.grid[0]);
      currLeftWidth = this.leftOuts[0].width();
      currRiteWidth = this.riteOuts[0].width();

      // snap the delta to within the valid bounds, based on the current left or right cel's width,
      // and the fact that cels should not be able to be shrunken down to below the grid snap amount
      if (snappedDelta < 0) {
        if (currLeftWidth <= this.grid[0]) return true;
        snappedDelta = snapToRange(snappedDelta, Math.min(0, currLeftWidth * -1 + this.grid[0]), 0);
      } else if (snappedDelta > 0) {
        if (currRiteWidth <= this.grid[0]) return true;
        snappedDelta = snapToRange(snappedDelta, 0, Math.max(0, currRiteWidth - this.grid[0]));
      }
      if (snappedDelta == 0) return true;
      //puts ("altering widths by snapped delta: "+snappedDelta);
      for(var i=0; i<this.leftOuts.length; i++){
        this.leftOuts[i].css('width', currLeftWidth + snappedDelta);
        this.riteOuts[i].css('width', currRiteWidth - snappedDelta);
      }
      this.normalizeWith[0] += snappedDelta;
      return true;
    },
    setBottom: function(y){

    },
    setTop: function(y){

    },
    // distribute the new width evenly across resizable cels
    setWidth: function(newWidth){
      var x, idxs = this.indexesOfResizableColumns;
      if (!this.calculateScaleHorizontal(newWidth)) return false;
      for(var i = 0; i < this.horizontalScaleMatrix.length; i++){
        for(var j=0; j<idxs.length; j++){
          x = idxs[j];
          this.horizontalScaleMatrix[i][x].css('width', this.colsMeta[x].newWidth);
        }
      }
      if (this.barHackRows.length > 0) {
        if (this.totalDeltaAfterDivision > 0){
          this.extendBarHackRowContentIfNecessary(this.totalDeltaAfterDivision);
        } else if (this.totalDeltaAfterDivision < 0) {
          this.shortenBarHackRows(this.totalDeltaAfterDivision);
        }
      }
      return (! this._lastErrorMessage);
    },

    calculateScaleHorizontal: function(newWidth){
      var matrix, x,y,i,j, colMeta;
      matrix = this.horizontalScaleMatrix;
      if (! matrix) return this.error("where is horizontal scale matrix?");
      if (0==matrix.length) return this.error("no rows in horizontal scale matrix");
      if (0==matrix[0].length)
        return this.error("can't scale table with no resizable columns");
      var idxs = this.indexesOfResizableColumns;
      if (!idxs.length>0){ return this.error("can't scale a table w/o resizable columns"); }
      var totalWidthOfDataCels = 0.0;
      if (!(newWidth>=0)) return this.error("width cannot be negative: "+newWidth);
      var totalRequestedDelta = newWidth - this.width();
      for(i = 0; i < idxs.length; i++){
        x = idxs[i];
        var currWidth = parsePx(matrix[0][x].css('width'));
        this.colsMeta[x].currWidth = currWidth;
        totalWidthOfDataCels += currWidth;
      }
      if (totalRequestedDelta == 0) return true;
      if (totalRequestedDelta < 0 && (-1 * totalRequestedDelta) > totalWidthOfDataCels){
        //The client shouldn't know about or care about total width of our data cels
        //return this.error("can't shrink table smaller than zero width");
        return true;
      }
      var totalDeltaAfterDivision = 0.0, celDelta;
      var last = idxs.length - 1;
      for(i = 0; i < idxs.length; i++) {
        x = idxs[i];
        colMeta = this.colsMeta[x];
        if (0==totalWidthOfDataCels) celDelta = totalRequestedDelta / idxs.length;
        else celDelta = totalRequestedDelta * colMeta.currWidth / totalWidthOfDataCels; // scale widths proportionally
        colMeta.celDelta = celDelta;
        totalDeltaAfterDivision += celDelta;
        if (i==last) {
          // adjust actual total delta to match requestsed total delta, sacrificing accuracy of last column @todo necessary?
          // this is supposed to ensure that snap is ok even after loss of accuracy with floats
          colMeta.celDelta -= (totalDeltaAfterDivision - totalRequestedDelta);
        }
        colMeta.newWidth = colMeta.currWidth+colMeta.celDelta;
        if (colMeta.newWidth < 0) {
          return this.error("can't set column width to less than zero");
        }
      }
      this.totalDeltaAfterDivision = totalDeltaAfterDivision;
      return true;
    },
    separatorRowMatchesBarHackPattern: function(row){
      return (row.find('td div.out div.in').html().trim().length >= 1); // @todo untested greater than one
    }
  };

  AsciiBarHackMethods.prototype = {
    enhanceBarHackRows: function(rows){
      rows = $(rows);
      for(i=0; i < rows.length; i++){
        var theTd = $($(rows[i]).find('td')[1]);
        rows[i].theTd = theTd;
        theTd.divOut = theTd.find('div.out');
        var divIn = theTd.divOut.find('div.in');
        theTd.divOut.divIn = divIn;
        divIn.repeaterString = divIn.html().trim();
        divIn.html(divIn.repeaterString);
        divIn.repeaterStringWidth = divIn.width();
      }
      return rows;
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
    }
  };

  $.widget("ui.resizable_table", $.extend({}, $.ui.mouse, {
    error: function(msg){
      puts("error from ResizableTable (window.T): "+msg);
      return false;
    },
    _init: function() {
      var self = this;
      if (( window.T = self.table = new ResizableTable(self.element, self.options)).isValid()) {
        puts("table is valid");
      } else {
        return puts("table not valid for resizable: "+self.table.lastErrorMessage());
      }
      self._mouseInit();
      return true;
    },
    _mouseCapture: function(event) {
      var self = this;
      var md, re = ResizableTable.re, curr = $(event.target), res;
      while( !re.exec(curr.attr('class')) && curr.parent().length > 0 ) curr = curr.parent();
      if (! (md = re.exec(curr.attr('class')))) return false;
      self.currentHandleType = md[1];
      res = null;
      self.table.normalizeWith = [event.pageX, event.pageY];
      switch(self.currentHandleType){
        case 'cdrag': res = self.table.setCdragHandle(curr); break;
        case 'wdrag':
        case 'edrag': res = self.table.setWedragHandle(curr); break;
        default: return self.error("unsupported handle type: "+self.currentHandleType);
      }
      if (false === res) {
        this.error(self.table.lastErrorMessage());
        return false;
      }
      return true;
    },
    _mouseMove: function(event){
      var res = null;
      switch(this.currentHandleType){
        case 'wdrag':
          res = this.table.setLeft(event.pageX);
          break;
        case 'edrag':
          res = this.table.setRight(event.pageX);
          break;
        case 'cdrag':
          res = this.table.cdrag(event.pageX);
          break;
      }
      if (false===res) {
        this.error(this.table.lastErrorMessage());
        return false;
      }
      return true;
    }
  }));
})(window.jQuery);
