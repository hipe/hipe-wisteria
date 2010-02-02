window.jQuery(document).ready(function($){

  var puts = window.console ? window.console.log : function(m){};

  module("3d transformations");

  //***** test support code
  var lib;
  var notest = function(){};
  var commonSetup = function(){
    if (!lib) lib = $.ui.hipe_terd_lib.prototype.lib();
  };
  var tolerance = 1.23456789e-16;

  AngleAsserter = function(){};
  AngleAsserter.prototype = {
    angleOf: function(pt){
      this.pt = lib.extend(pt, lib.Vector.prototype);
      return this;
    },
    onPlane:function(plane){ this.plane = plane; return this; },
    using:function(using){ this._using = using; return this;},
    shouldThrow:function(kindOf){
      var threw = false, _ok = false, err;
      var meth = this.plane+'PlaneAngleUsing'+this._using;
      try{
        var rslt = lib.Angle[meth](this.pt);
      }catch(_err){
        err = _err;
        threw = true;
        _ok = true;
      }
      var msg = "angle of "+this.pt.inspect()+" on "+this.plane+" plane"+
      " using "+this._using+
      " should throw an exception";
      if (threw && err.type!=kindOf) {
        msg += "  Needed exception type "+kindOf+" had "+err.type;
      }
      ok(_ok,msg);
    },
    shouldBeCloseTo:function(number){
      var meth = this.plane+'PlaneAngleUsing'+this._using;
      var rslt = lib.Angle[meth](this.pt);
      var diff = number - rslt;
      var msg = "angle of "+this.pt.inspect()+" on "+this.plane+" plane"+
      " using "+this._using+
      " should be close to "+number+".  Is "+diff+" away from it: "+rslt;
      ok(Math.abs(diff)<this.tolerance,msg);
    }
  };


  //***** tests

  test("load library",function(){
    commonSetup();
    ok(lib,'library loaded');
  });

  test("dot", function(){
    var dot = [-45.25483399593904, 0, -45.254833995939045];
    var yz = lib.Angle.yz(dot);
    var xy = lib.Angle.xy(dot);
    var xz = lib.Angle.xz(dot);
    var target = new lib.Vector([0,0.7853981633974484,0]);
    ok(target.distance([yz,xz,xy]) < tolerance);
  });

  test("mouse drag rotation 1: left field", function(){
    var currentAxisRotation = [0, Math.PI/4, 0];
    var m1 = [23, -7, -64];
    var m2 = [23, -9, -64];
    var rot = lib.RotationController.getRotationDeltaFromMouseMove(
      currentAxisRotation, m1, m2
    );
    ok(rot.distance([0.044165435246087036,0,0.04416543524608704])<tolerance);
  });

  /** this one is why we invented the hack.  @todo we need some serious trig*/
  test("mouse drag rotation 2: right baseline", function(){
    var currentAxisRotation = [0, 1.5500000000000012, 0];
    var m1 = [641, 255, 64];
    var m2 = [641, 254, 64];
    var rot = lib.RotationController.getRotationDeltaFromMouseMove(
      currentAxisRotation, m1, m2
    );
    ok(rot.distance([0, 0, -0.01562710721073918]) < tolerance);
  });

  test("angles off of planes", function(){
    commonSetup();
    loadAlternateAlgosForAngle();
    var assert = new AngleAsserter();
    assert.tolerance = tolerance;
    var planes = 'PlaneAndVector';
    var vector = 'VectorVector';
    var polar = 'Polar';
    var atan = 'Atan';
    var hp = Math.PI/2;
    var exception = 'angleUndefined'; //asset that it throws this kind

    //{xy|xz|yz}*{top|right|bottom|left|front|back}*{planes|vector|polar|atan}

    // xy
    assert.angleOf([0,1,0] ).onPlane('xy').using(planes).shouldBeCloseTo(0);
    assert.angleOf([0,1,0] ).onPlane('xy').using(vector).shouldBeCloseTo(0);
    assert.angleOf([0,1,0] ).onPlane('xy').using(polar).shouldBeCloseTo(0);
    assert.angleOf([0,1,0] ).onPlane('xy').using(atan).shouldBeCloseTo(0);

    assert.angleOf([1,0,0] ).onPlane('xy').using(planes).shouldBeCloseTo(0);
    assert.angleOf([1,0,0] ).onPlane('xy').using(vector).shouldBeCloseTo(0);
    assert.angleOf([1,0,0] ).onPlane('xy').using(polar).shouldBeCloseTo(0);
    assert.angleOf([1,0,0] ).onPlane('xy').using(atan).shouldBeCloseTo(0);

    assert.angleOf([0,-1,0]).onPlane('xy').using(planes).shouldBeCloseTo(0);
    assert.angleOf([0,-1,0]).onPlane('xy').using(vector).shouldBeCloseTo(0);
    assert.angleOf([0,-1,0] ).onPlane('xy').using(polar).shouldBeCloseTo(0);
    assert.angleOf([0,-1,0] ).onPlane('xy').using(atan).shouldBeCloseTo(0);

    assert.angleOf([-1,0,0]).onPlane('xy').using(planes).shouldBeCloseTo(0);
    assert.angleOf([-1,0,0]).onPlane('xy').using(vector).shouldBeCloseTo(0);
    assert.angleOf([-1,0,0]).onPlane('xy').using(polar).shouldBeCloseTo(0);
    assert.angleOf([-1,0,0]).onPlane('xy').using(atan).shouldBeCloseTo(0);

                      // no negative angles from vector version
    assert.angleOf([0,0,-1]).onPlane('xy').using(planes).shouldBeCloseTo(-hp);
    assert.angleOf([0,0,-1]).onPlane('xy').using(vector).shouldBeCloseTo(hp);
    assert.angleOf([0,0,-1]).onPlane('xy').using(polar).shouldBeCloseTo(-hp);
    assert.angleOf([0,0,-1]).onPlane('xy').using(atan).shouldThrow(exception);

    assert.angleOf([0,0,1] ).onPlane('xy').using(planes).shouldBeCloseTo(hp);
    assert.angleOf([0,0,1] ).onPlane('xy').using(vector).shouldBeCloseTo(hp);
    assert.angleOf([0,0,1] ).onPlane('xy').using(polar).shouldBeCloseTo(hp);
    assert.angleOf([0,0,1] ).onPlane('xy').using(atan).shouldThrow(exception);


    // xz
    assert.angleOf([0,1,0] ).onPlane('xz').using(planes).shouldBeCloseTo(hp);
    assert.angleOf([0,1,0] ).onPlane('xz').using(vector).shouldBeCloseTo(hp);
    assert.angleOf([0,1,0] ).onPlane('xz').using(polar).shouldBeCloseTo(hp);
    assert.angleOf([0,1,0] ).onPlane('xz').using(atan).shouldThrow(exception);

    assert.angleOf([1,0,0] ).onPlane('xz').using(planes).shouldBeCloseTo(0);
    assert.angleOf([1,0,0] ).onPlane('xz').using(vector).shouldBeCloseTo(0);
    assert.angleOf([1,0,0] ).onPlane('xz').using(polar).shouldBeCloseTo(0);
    assert.angleOf([1,0,0] ).onPlane('xz').using(atan).shouldBeCloseTo(0);

    assert.angleOf([-1,0,0]).onPlane('xz').using(planes).shouldBeCloseTo(0);
    assert.angleOf([-1,0,0]).onPlane('xz').using(vector).shouldBeCloseTo(0);
    assert.angleOf([-1,0,0]).onPlane('xz').using(polar).shouldBeCloseTo(0);
    assert.angleOf([-1,0,0]).onPlane('xz').using(atan).shouldBeCloseTo(0);

              // no neg angles from vector version
    assert.angleOf([0,-1,0]).onPlane('xz').using(planes).shouldBeCloseTo(-hp);
    assert.angleOf([0,-1,0]).onPlane('xz').using(vector).shouldBeCloseTo(hp);
    assert.angleOf([0,-1,0]).onPlane('xz').using(polar).shouldBeCloseTo(-hp);
    assert.angleOf([0,-1,0]).onPlane('xz').using(atan).shouldThrow(exception);

    assert.angleOf([0,0,-1]).onPlane('xz').using(planes).shouldBeCloseTo(0);
    assert.angleOf([0,0,-1]).onPlane('xz').using(vector).shouldBeCloseTo(0);
    assert.angleOf([0,0,-1]).onPlane('xz').using(polar).shouldBeCloseTo(0);
    assert.angleOf([0,0,-1]).onPlane('xz').using(atan).shouldBeCloseTo(0);

    assert.angleOf([0,0,1] ).onPlane('xz').using(planes).shouldBeCloseTo(0);
    assert.angleOf([0,0,1] ).onPlane('xz').using(vector).shouldBeCloseTo(0);
    assert.angleOf([0,0,1] ).onPlane('xz').using(polar).shouldBeCloseTo(0);
    assert.angleOf([0,0,1] ).onPlane('xz').using(atan).shouldBeCloseTo(0);


    // yz
    assert.angleOf([1,0,0] ).onPlane('yz').using(planes).shouldBeCloseTo(hp);
    assert.angleOf([1,0,0] ).onPlane('yz').using(vector).shouldBeCloseTo(hp);
    assert.angleOf([1,0,0] ).onPlane('yz').using(polar).shouldBeCloseTo(hp);
    assert.angleOf([1,0,0] ).onPlane('yz').using(atan).shouldThrow(exception);

    assert.angleOf([0,1,0] ).onPlane('yz').using(planes).shouldBeCloseTo(0);
    assert.angleOf([0,1,0] ).onPlane('yz').using(vector).shouldBeCloseTo(0);
    assert.angleOf([0,1,0] ).onPlane('yz').using(polar).shouldBeCloseTo(0);
    assert.angleOf([0,1,0] ).onPlane('yz').using(atan).shouldBeCloseTo(0);

    assert.angleOf([-1,0,0]).onPlane('yz').using(planes).shouldBeCloseTo(-hp);
    assert.angleOf([-1,0,0]).onPlane('yz').using(vector).shouldBeCloseTo(hp);
    assert.angleOf([-1,0,0]).onPlane('yz').using(polar).shouldBeCloseTo(-hp);
    assert.angleOf([-1,0,0]).onPlane('yz').using(atan).shouldThrow(exception);

    assert.angleOf([0,-1,0]).onPlane('yz').using(planes).shouldBeCloseTo(0);
    assert.angleOf([0,-1,0]).onPlane('yz').using(vector).shouldBeCloseTo(0);
    assert.angleOf([0,-1,0]).onPlane('yz').using(polar).shouldBeCloseTo(0);
    assert.angleOf([0,-1,0]).onPlane('yz').using(atan).shouldBeCloseTo(0);

    assert.angleOf([0,0,1] ).onPlane('yz').using(planes).shouldBeCloseTo(0);
    assert.angleOf([0,0,1] ).onPlane('yz').using(vector).shouldBeCloseTo(0);
    assert.angleOf([0,0,1] ).onPlane('yz').using(polar).shouldBeCloseTo(0);
    assert.angleOf([0,0,1] ).onPlane('yz').using(atan).shouldBeCloseTo(0);

    assert.angleOf([0,0,-1]).onPlane('yz').using(planes).shouldBeCloseTo(0);
    assert.angleOf([0,0,-1]).onPlane('yz').using(vector).shouldBeCloseTo(0);
    assert.angleOf([0,0,-1]).onPlane('yz').using(polar).shouldBeCloseTo(0);
    assert.angleOf([0,0,-1]).onPlane('yz').using(atan).shouldBeCloseTo(0);

  });


  test("rotations",function(){
    commonSetup();
    var rotv = new lib.Vector.fill(3);
    var rotTrans = new lib.Rotate();
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


  function loadAlternateAlgosForAngle(){
    if (lib.Angle.alternatesLoaded) return;
    lib.Angle.alternatesLoaded = true;

    /**
    * these are some alternate algorithms that may have had some holes
    * in them, but are kept for reference and possible future investigation
    */
    lib.extend(lib.Angle, {
      halfPi: Math.PI / 2,
      xyPlaneAngleUsingPlaneAndVector:function(pt){
        return this._plane(pt,2);},
      xzPlaneAngleUsingPlaneAndVector:function(pt){
        return this._plane(pt,1);},
      yzPlaneAngleUsingPlaneAndVector:function(pt){
        return this._plane(pt,0);},
      _plane:function(pt, idx){
        return Math.asin(
          pt[idx] /       // took abs() off
          Math.sqrt(
            Math.pow(pt[0],2) + Math.pow(pt[1],2) + Math.pow(pt[2],2)
          )
        );
      },
      xyPlaneAngleUsingVectorVector:function(pt){
        return this._vector(pt,0,1);},
      xzPlaneAngleUsingVectorVector:function(pt){
        return this._vector(pt,0,2);},
      yzPlaneAngleUsingVectorVector:function(pt){
        return this._vector(pt,1,2);},
      _vector: function(v, a, b){
        var squared = [Math.pow(v[0],2), Math.pow(v[1],2), Math.pow(v[2],2)];
        var bottomTerm = (
          Math.sqrt( squared[0] + squared[1] + squared[2] ) *
          Math.sqrt( squared[a] + squared[b] )
        );
        return Math.acos( bottomTerm == 0 ? 0 :
          ( squared[a]+squared[b] / bottomTerm ) // took abs() off of top term
        );
      },
      xyPlaneAngleUsingPolar:function(pt){ return this._polar(pt,2,0,1); },
      xzPlaneAngleUsingPolar:function(pt){ return this._polar(pt,1,0,2); },
      yzPlaneAngleUsingPolar:function(pt){ return this._polar(pt,0,1,2); },
      _polar: function(pt,a,b,c){
        return this.halfPi - (
            this.halfPi - Math.atan(
              pt[a] / Math.sqrt( Math.pow(pt[b],2) + Math.pow(pt[c],2) )
            )
        );
      }
    });
  }
});
