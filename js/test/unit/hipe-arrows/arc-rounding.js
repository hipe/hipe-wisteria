window.jQuery(document).ready(function($){

  var puts = window.console ? window.console.log : function(m){};

  module("rounding vectors");

  var lib;

  var common_setup = function(){
    el = $('#div-1').hipe_arrows_path_controller();
    lib = el.data('widget').library();
  };

  test("load library",function(){
    common_setup();
    ok(lib,'library loaded');
  });

  test("three points not in a line report vectors",function(){
    common_setup();
    var p = new lib.Path();
    var v1 = p.addPoint([0,0]);
    ok(v1.pointEquals([0,0]), 'added length is orig pointvector');
    equals(v1.magnitude(),0,'zero magnitude first vector');
    var v2 = p.addPoint([1,0]);
    equals(v2.inspectVector(), "[0][0]->[1][0]", "[0][0]->[1][0]");
    var v3 = p.addPoint([1,1]);
    equals(v3.inspectVector(), "[1][0]->[1][1]", "[1][0]->[1][1]");
    equals(p.length, 3, '3 points result');
  });

  test("three point in a line result in two points",function(){
    common_setup();
    var p = new lib.Path();
    var v1 = p.addPoint([0,0]);
    var v2 = p.addPoint([1,0]);
    var v3 = p.addPoint([2,0]);
    equals(v3.inspectVector(), "[1][0]->[2][0]", "[1][0]->[2][0]");
    equals(p.length, 2, '2 points result from 3 points in a straight line.');
  });



});
