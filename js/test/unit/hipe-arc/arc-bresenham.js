window.jQuery(document).ready(function($){

  var puts = window.console ? window.console.log : function(m){};    

  module("bresenham algorithm");
  
  var Arc;
  var common_setup = function(){
    var el = $('#div-1').hipe_arc_lib();
    if (el.length > 0) {   
      Arc = el.data('library');
    }
  }
  
  test("load library",function(){
    common_setup();
    ok(Arc,'library loaded');
  });
  
  
  test("tic-tac-toe find center square",function(){
    common_setup();
    var vector, pts;
    expect(5);
    equals(!!Arc,true, "lib should exist");
    vector = new Arc.Vector([0,0], [2,2]);
    pts = Arc.Bresenham.pointsInVector(vector);
    equals(3, pts.length, "begin and endpoints included?");
    ok(pts[0].equals([0,0]),'begin should be [0][0]');
    ok(pts[1].equals([1,1]),'middle should be [1][1]');
    ok(pts[2].equals([2,2]),'end should be [2][2]');
  });  
  
  test("same point",function(){
    common_setup();    
    var vector, pts;
    vector = new Arc.Vector([0,0], [0,0]);
    pts = Arc.Bresenham.pointsInVector(vector);
    equals(pts, false, "should return error on zero magnitude vectors.");
    ok((/short vectors/i).exec(Arc.Bresenham.error()), 
      "won't do short vectors");
  });
  
  test("one point up, to the right, down, and left",function(){
     common_setup();
     var them = [
      [[1,1], [2,1], "one point to the right"],
      [[1,1], [0,1], "to the left to the the left"],
      [[1,1], [1,0], "one point up"],
      [[1,0], [1,1], "one point down"]
     ];
     $.each(them,function(i){
        var vector = new Arc.Vector(them[i][0], them[i][1]);
        var msg = them[i][2];        
        Arc.Bresenham.clearErrors();        
        var pts = Arc.Bresenham.pointsInVector(vector);
        equals(pts, false, "should return false on "+msg);
        ok((/short vectors/i).exec(Arc.Bresenham.error()), 
          "gives message when "+msg);              
     });
  });
});
