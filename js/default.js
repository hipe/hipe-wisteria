jQuery(function(){

  var gridw = Math.ceil($('#width-registration').width()/21)
  var gridh = Math.ceil($('#width-registration').height()/2)
  $("#square").resizable_table({ grid: [gridw, gridh] });  /* must come before draggable.  why? */
  $("#square").draggable({ grid: [gridw,gridh], containment: 'parent'});
	$("#resizable").resizable( );
 
});