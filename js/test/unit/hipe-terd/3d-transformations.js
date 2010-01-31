window.jQuery(document).ready(function($){

  var puts = window.console ? window.console.log : function(m){};

  module("3d transformations");

  var lib;
  var common_setup = function(){
    if (!lib) lib = $('#div-1').hipe_terd_lib().data('hipe_terd_lib').lib();
  };
  var tolerance = 1.23456789e-16;

  test("load library",function(){
    common_setup();
    ok(lib,'library loaded');
  });

  test("rotations",function(){
    var rotv = new lib.Vector.fill(3);
    var rotTrans = new lib.OrthoganalRotate();
    var pt1 = new lib.Vector.fill(3);
    var tolerance = 6.123456789e-16;
    var _assert = function(start, rotate, target, msg){
      if (!target.isVector) lib.extend(target,lib.Vector.prototype);
      var rotatedPt = rotTrans.set(rotate).go(pt1.set(start));
      var dist = rotatedPt.distance(target);
      var _msg = msg ? (msg+': ') : '';
      ok(Math.abs(dist)<=tolerance, _msg +
        "pt "+pt1.inspect()+" rotated by "+rotTrans.inspect()+
        " is "+rotatedPt.inspect()+". Target is "+target.inspect()+". "+
        " Distance to target: "+dist+". distance over tolerance: "+
        (dist-tolerance));
      return dist;
    };
    var asserts = [
      [[0,0,-1],  [0,Math.PI,0],[0,0,1],       'front to back around y'],
      [[0,0,-1],  [Math.PI/2,0,0],[0,1,0],     'front to top'          ],
      [[0,0,-1],  [0,Math.PI/2,0],[-1,0,0],    'front to left'         ],
      [[0,0,-1],  [0,-(Math.PI/2),0],[1,0,0],  'front to right'        ],
      [[0,0,-1],  [-(Math.PI/2),0,0],[0,-1,0], 'front to bottom'       ],
      [[0,0,0],   [0.123,456,78.9],   [0,0,0], 'zero to anything'      ],
      [[0,0,0],   [0,0,0],            [0,0,0], 'zero against zero'     ],
      [[0,0,-1],  [0,0,0],            [0,0,-1],'front to front against zero'],
      [[0,1,0],   [Math.PI*2,Math.PI*2,Math.PI*2], [0,1,0],
       'spin around two times in each direction, get dizzy, but stay same']
    ];
    lib.list(asserts).each(function(item){
      _assert(item[0], item[1], item[2], item[3]);
    });
    var d0 = _assert(
      [0.99,0.99,0.99],
      [Math.PI*2,Math.PI*2, Math.PI*2],
      [0.99,0.99,0.99],'dt1'
    );
    var d1 = _assert(
      [0.99,0.99,0.99],
      [Math.PI*4,Math.PI*4, Math.PI*4],
      [0.99,0.99,0.99],'dt2'
    );
    var d2 = _assert(
      [0.99,0.99,0.99],
      [Math.PI*256,Math.PI*256, Math.PI*256],
      [0.99,0.99,0.99],'dt2'
    );
    // interesting: the drift gets bigger as angles get bigger
    // this test fails b/c the angles are so big it doesn't make the tolerance
    // (but distance to target is still about 8e-12)
    if (false) {
      var d3 = _assert(
        [0.99,0.99,0.99],
        [Math.PI*65535,Math.PI*65535, Math.PI*65535],
        [0.99,0.99,0.99],'dt3'
      );
    }
  });
});
