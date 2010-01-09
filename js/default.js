jQuery(function(){

  var gridw = Math.ceil($('#width-registration').width()/21)
  var gridh = Math.ceil($('#width-registration').height()/2)
  $("#square").draggable({ grid: [gridw,gridh], containment: 'parent'});
	$("#square").resizable({grid: [10,10]});
	$("#resizable").resizable();
 
});