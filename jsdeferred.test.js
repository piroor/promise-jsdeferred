var DeferredLibrary = utils.import('./jsdeferred.js', {});

var ns = {};
ns.Deferred = DeferredLibrary.Deferred;
ns.Deferred.define(ns);

function calcAccuracy() {
  var d = new ns.Deferred();
  var r = [];
  var i = 30;
  var t = new Date().getTime();
  utils.setTimeout(function callback() {
    if (i-- > 0) {
      var n = new Date().getTime();
      r.push(n - t);
      t = n;
      utils.setTimeout(callback, 0);
    } else {
      d.call(r);
    }
  }, 0);
  return d;
}

var result = undefined;
var results = [];
var finished = { value: false };

function setUp() {
  result = undefined;
  results = [];
  finished = { value: false };
}

function tearDown() {
  result = undefined;
  results = undefined;
  finished = undefined;
}


testIsDeferredSuccess.parameters = {
  createdWithNew: new ns.Deferred(),
  createdWithoutNew: ns.Deferred()
};
function testIsDeferredSuccess(aActual) {
  assert.isTrue(ns.Deferred.isDeferred(aActual));
}

testIsDeferredFail.parameters = {
  'null':      null,
  'undefined': undefined,
  boolean:     true,
  string:      '',
  number:      0
};
function testIsDeferredFail(aActual) {
  assert.isFalse(ns.Deferred.isDeferred(aActual));
}

function testDefineAll() {
  var namespace = {};
  ns.Deferred.define(namespace);
  assert.isFunction(namespace.next);
  assert.isFunction(namespace.loop);
}

function testDefineOnlySpecified() {
  var namespace = {};
  ns.Deferred.define(namespace, ['next']);
  assert.isFunction(namespace.next);
  assert.isUndefined(namespace.loop);
}

function testNextCancel() {
  var called = false;
  var deferred = ns.next(function() {
    called = true;
  });
  deferred.cancel();
  yield 100;
  assert.isFalse(called);
}

// NOT IMPLEMENTED YET!!
testForceCallAfterCancel.priority = 'never';
function testForceCallAfterCancel() {
  var called = false;
  var deferred = ns.next(function() {
    called = true;
  });
  deferred.cancel();
  deferred.call();
  yield 100;
  assert.isFalse(called);
}

// NOT IMPLEMENTED YET!!
testOnError.priority = 'never';
function testOnError() {
  var deferred = ns.Deferred();
  ns.Deferred.onerror = function(aError) {
    result = aError;
  };
  deferred.fail('error');
  assert.equals('error', result);

  result = undefined;
  delete ns.Deferred.onerror;
  deferred.fail('error');
  assert.isUndefined(result);
}


function testProcessSequenceSimple() {
  ns.
  next(function() {
    results.push(1);
  }).
  next(function () {
    results.push(2);
    finished.value = true;
  });

  results.push(0);

  yield finished;
  assert.equal([0, 1, 2], results);
}

function testProcessSequenceComplex() {
  ns.
  next(function() {
    results.push(1);
    return ns.next(function() {
      results.push(2);
    });
  }).
  next(function() {
    results.push(3);
    finished.value = true;
  });

  results.push(0);

  yield finished;
  assert.equal([0, 1, 2, 3], results);
}

function testSuccessAndFailureCallbackChain() {
  ns.
  next(function() {
    throw 'Error';
  }).
  error(function(aError) {
    results.push(aError);
    return aError;
  }).
  next(function(aError) {
    throw 'Error2';
  }).
  next(function(aError) {
    results.push('never');
  }).
  error(function(aError) {
    results.push(aError);
    finished.value = true;
  });

  yield finished;
  assert.equal(['Error', 'Error2'], results);
}

function testWait() {
  var start;
  var delta0;
  var delta100;

  ns.
  next(function() {
    results.push('start');
  }).
  next(function() {
    results.push('wait');
    start = Date.now();
  }).
  wait(0).
  next(function(aResult) {
    delta0 = Date.now() - start;
    start = Date.now();
  }).
  wait(0.1).
  next(function(aResult) {
    delta100 = Date.now() - start;
    results.push('finish');
    finished.value = true;
  }).
  error(function(aError) {
    results.push(aError);
    finished.value = true;
  });

  yield finished;
  assert.equal(['start', 'wait', 'finish'], results);
  assert.compare(0, '<=', delta0);
  assert.compare(100, '>', delta0);
  assert.compare(50, '<', delta100);
  assert.compare(150, '>', delta100);
}

function testLoop() {
  ns.
  next(function() {
    results.push('start');
  }).
  loop(0, function() {
    results.push('loop0');
    return 'result0';
  }).
  next(function(aResult) {
    results.push(aResult);
  }).
  loop(1, function() {
    results.push('loop1');
    return 'result1';
  }).
  next(function(aResult) {
    results.push(aResult);
  }).
  loop(3, function() {
    results.push('loop3');
    return 'result3';
  }).
  next(function(aResult) {
    results.push(aResult);
  }).
  loop({ begin: 0, end: 0 }, function() {
    results.push('loop 0-0');
    return 'result 0-0';
  }).
  next(function(aResult) {
    results.push(aResult);
  }).
  loop({ end: 2, step: 1 }, function(aCount, aParams) {
    results.push('loop 0-2 ' + aCount + ', ' + aParams.last);
    return 'result 0-2';
  }).
  next(function(aResult) {
    results.push(aResult);
  }).
  loop({ end: 4, step: 2 }, function(aCount, aParams) {
    results.push('loop gapped ' + aCount + ', ' + aParams.last);
    return 'result gapped';
  }).
  next(function(aResult) {
    results.push(aResult);
  }).
  loop({ end: 5, step: 3 }, function(aCount, aParams) {
    results.push('loop gap-over ' + aCount + ', ' + aParams.last);
    return 'result gap-over';
  }).
  next(function(aResult) {
    results.push(aResult);
  }).
  loop({ end: 5, step: 6 }, function(aCount, aParams) {
    results.push('loop gap-over-once ' + aCount + ', ' + aParams.last);
    return 'result gap-over-once';
  }).
  next(function(aResult) {
    results.push(aResult);
  }).
  loop({ end: 6, step: 6 }, function(aCount, aParams) {
    results.push('loop gap-equal ' + aCount + ', ' + aParams.last);
    return 'result gap-equal';
  }).
  next(function(aResult) {
    results.push(aResult);
  }).
  loop({ begin: 1, end: 4, step: 2 }, function(aCount, aParams) {
    results.push('loop begin ' + aCount + ', ' + aParams.last);
    return 'result begin';
  }).
  next(function(aResult) {
    results.push(aResult);
    results.push('finish');
    finished.value = true;
  }).
  error(function(aError) {
    results.push(aError);
    finished.value = true;
  });

  yield finished;
  assert.equal([
    'start',
    null,
    'loop1',
    'result1',
    'loop3', 'loop3', 'loop3',
    'result3',
    'loop 0-0',
    'result 0-0',
    'loop 0-2 0, false', 'loop 0-2 1, false', 'loop 0-2 2, true',
    'result 0-2',
    'loop gapped 0, false', 'loop gapped 2, false', 'loop gapped 4, true',
    'result gapped',
    'loop gap-over 0, false', 'loop gap-over 3, true',
    'result gap-over',
    'loop gap-over-once 0, true',
    'result gap-over-once',
    'loop gap-equal 0, false', 'loop gap-equal 6, true',
    'result gap-equal',
    'loop begin 1, false', 'loop begin 3, true',
    'result begin',
    'finish'
  ], results);
}

function testRepeat() {
  ns.
  next(function() {
    results.push('start');
  }).
  repeat(0, function() {
    results.push('repeat 0');
    return 'result 0';
  }).
  next(function(aResult) {
    results.push(aResult);
  }).
  repeat(1, function(aCount) {
    results.push('repeat 1-' + aCount);
    return 'result 1';
  }).
  next(function(aResult) {
    results.push(aResult);
  }).
  repeat(3, function(aCount) {
    results.push('repeat 3-' + aCount);
    return 'result 3';
  }).
  next(function(aResult) {
    results.push(aResult);
    results.push('finish');
    finished.value = true;
  }).
  error(function(aError) {
    results.push(aError);
    finished.value = true;
  });

  yield finished;
  assert.equal([
    'start',
    null,
    'repeat 1-0',
    'result 1',
    'repeat 3-0', 'repeat 3-1', 'repeat 3-2',
    'result 3',
    'finish'
  ], results);
}

function testCall() {
  ns.
  next(function() {
    function pow(x, n) {
      function _pow(n, r) {
        if (n == 0) return r;
        return ns.call(_pow, n - 1, x * r);
      }
      return ns.call(_pow, n, 1);
    }
    var result = ns.call(pow, 2, 10);
    return result;
  }).
  next(function(aResult) {
    result = aResult;
    finished.value = true;
  }).
  error(function(aError) {
    result = aError;
    finished.value = true;
  });

  yield finished;
  assert.equal(1024, result);
}

function testCallNested() {
  ns.
  next(function() {
    return ns.call(function(...aArgs) {
      results.push(aArgs);
      return ns.call(function (...aArgs) {
        results.push(aArgs);
      }, 2, 3);
    }, 1);
  }).
  next(function() {
    finished.value = true;
  }).
  error(function(aError) {
    results.push(aError);
    finished.value = true;
  });

  yield finished;
  assert.equal([[1], [2, 3]], results);
}
