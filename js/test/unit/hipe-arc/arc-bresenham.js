window.jQuery(document).ready(function($){

  var puts = window.console ? window.console.log : function(m){};

  module("bresenham algorithm");

  var Arc;
  var common_setup = function(){
    var el = $('#div-1').hipe_arc_lib();
    if (el.length > 0) {
      Arc = el.data('library');
      Arc.Bresenham.clearErrors();
    }
  };

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


  var run_matrix = function(them){
    for (var i=0; i < them.length; i++) {
       var vector = new Arc.Vector(them[i][0], them[i][1]);
       var msg = them[i][3];
       var pts = Arc.Bresenham.pointsInVector(vector);
       if (!pts) {
         ok(false, "bresenham fail: "+Arc.Bresenham.error());
         return;
       }
       equals(pts.length, 3, "expecting three resulting points");
       ok(pts[0].equals(them[i][0]), msg+' begin point same');
       ok(pts[2].equals(them[i][1]), msg+' end point same');
       var midPoint = new Arc.Point(them[i][2][0], them[i][2][1]);
       equals(pts[1].inspect(), midPoint.inspect(), msg+' midpoint ok');
    }
  };

  test("two points up, to the right, down, and left",function(){
    common_setup();
    expect(16);
    var them = [
      [[2,2], [2,0], [2,1], "two points up"],
      [[2,2], [4,2], [3,2], "two points right"],
      [[2,2], [2,4], [2,3], "two points down"],
      [[2,2], [0,2], [1,2], "two points left"]
    ];
    run_matrix(them);
  });

  test("that one chess move",function(){
    expect(32);
    common_setup();
    var them = [
      [[0,0], [1,2], [1,1], "SxSE"],
      [[1,0], [0,2], [0,1], "SxSW"],
      [[2,0], [0,1], [1,1], "WxSW"],
      [[2,1], [0,0], [1,0], "WxNW"],
      [[1,2], [0,0], [0,1], "NxNW (doesn't cover same ground as SxSE)"],
      [[0,2], [1,0], [1,1], "NxNE (doesn't cover same ground as SxSW)"],
      [[0,1], [2,0], [1,0], "ExNE (doesn't cover same ground as WxSW)"],
      [[0,0], [2,1], [1,1], "ExSE (doesn't cover same ground as WxNW)"]
    ];
    run_matrix(them);
  });

});
