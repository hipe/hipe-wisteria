jQuery(function(){

  var gridw = Math.ceil($('#width-registration-1').width()/21);
  var gridh = Math.ceil($('#width-registration-1').height()/2);
  $("#square-1").resizable_table({ grid: [gridw, gridh] });  /* must come before draggable.  why? */
  $("#square-1").draggable({ grid: [gridw,gridh], containment: 'parent'});
  //$("#resizable-1").resizable( );
  $('#canvas-1').arrows({grid: [gridw,gridh]});
  $('#canvas-1').canvas({grid: [gridw,gridh]});


});
