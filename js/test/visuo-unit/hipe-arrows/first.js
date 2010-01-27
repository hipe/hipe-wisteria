window.jQuery(document).ready(function($){

  var puts = window.console ? window.console.log : function(m){};

  module("first visuo-unit test");

  var lib = 1;

  var t1, t2, t3;

  var common_setup = function(){
    // el = $('#div-1').hipe_arrows_path_controller();
    // lib = el.data('widget').library();
  };

  test("load library",function(){
    common_setup();
    ok(lib,'library loaded');
    setTimeout(function(){t2();}, 800);
  });

  t2 = function(){
    test("second",function(){
      ok(1,'second one passed');
      setTimeout(function(){t3();}, 800);
    });
  };

  t3 = function(){
    test("second",function(){
      ok(1,'second one passed');
    });
  };



});
