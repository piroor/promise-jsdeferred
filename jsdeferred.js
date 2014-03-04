/**
 * @fileOverview Promise-JSDeferred
 * @author       piro.outsider.reflex@gmail.com
 * @version      0.1
 * @license
 * Copyright (c) 2014 YUKI "Piro" Hiroshi
 * JSDeferred Copyright (c) 2007 cho45 ( www.lowreal.net )
 *
 * This is a JSDeferred flavoured Promise.jsm, or a Promise.jsm based JSDeferred.
 * Repository: https://github.com/piroor/promise-jsdeferred
 * Original: https://github.com/cho45/jsdeferred
 *
 * License:: MIT
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

var EXPORTED_SYMBOLS = ['Deferred'];

Components.utils.import('resource://gre/modules/Promise.jsm');

if (!this.setTimeout) {
  setTimeout = function(aCallback, aInterval) {
    var timer = Components
                  .classes['@mozilla.org/timer;1']
                  .createInstance(Components.interfaces.nsITimer);
    timer.initWithCallback(aCallback, aInterval, timer.TYPE_ONE_SHOT);
    return timer;
  };

  clearTimeout = function(aTimer) {
    aTimer.cancel();
  };
}


function WrappedPromise(aPromise) {
  this._promise = aPromise;
}

WrappedPromise.prototype = {
  _CLASS_ID: 'c7fe5220-a393-11e3-a5e2-0800200c9a66',

  get promise() {
    return this;
  },

  then: function(...aArgs) {
    return Deferred(this._promise.then.apply(this._promise, aArgs));
  },

  // JSDeferred compatible APIs
  get canceller() {
    return this._canceller;
  },
  set canceller(aValue) {
    return this._canceller = aValue;
  },
  /* DUPLICATED */
  next: function(aSuccessCallback) {
    return this.then(aSuccessCallback);
  },
  /* /DUPLICATED */
  error: function(aErrorCallback) {
    var successCallback = function(aResult) {
      return aResult;
    };
    return this.then(successCallback, aErrorCallback);
  },
  cancel: function() {
    if (typeof this.canceller == 'function')
      this.canceller.apply(this);
  }
};


function WrappedDeferred(aDeferred) {
  this._deferred = aDeferred;
  this._promise = new WrappedPromise(aDeferred.promise);
}

WrappedDeferred.prototype = {
  _CLASS_ID: 'd4ca13e0-a393-11e3-a5e2-0800200c9a66',

  get promise() {
    return this._promise;
  },

  resolve: function(aResult) {
    return this._deferred.resolve.call(this._deferred, aResult);
  },
  reject: function(aReason) {
    return this._deferred.reject.call(this._deferred, aReason);
  },
  then: function(...aArgs) {
    return this._promise.then.apply(this._promise, aArgs);
  },

  // JSDeferred compatible APIs
  get canceller() {
    return this._promise.canceller;
  },
  set canceller(aValue) {
    return this._promise.canceller = aValue;
  },
  /* DUPLICATED */
  call: function(aResult) {
    return this.resolve(aResult);
  },
  fail: function(aError) {
    return this.reject(aError);
  },
  next: function(...aArgs) {
    return this._promise.next.apply(this._promise, aArgs);
  },
  /* /DUPLICATED */
  error: function(...aArgs) {
    return this._promise.error.apply(this._promise, aArgs);
  },
  cancel: function(...aArgs) {
    return this._promise.cancel.apply(this._promise, aArgs);
  }
};


function Deferred(aPromiseOrDeferred) {
  if (!aPromiseOrDeferred)
    return new WrappedDeferred(Promise.defer());
  if ('promise' in aPromiseOrDeferred)
    return new WrappedDeferred(aPromiseOrDeferred);
  return new WrappedPromise(aPromiseOrDeferred);
}

//JSDeferred compatible APIs

Deferred.isDeferred = function(aObject) {
  if (!aObject)
    return false;
  return (aObject._CLASS_ID == WrappedPromise.prototype._CLASS_ID) ||
         (aObject._CLASS_ID == WrappedDeferred.prototype._CLASS_ID);
};

/* DUPLICATED */ Deferred.next = /* /DUPLICATED */
Deferred.then = function(aCallback) {
  var deferred = Deferred(Promise.defer());
  var timer = setTimeout(function() {
    if (!aCallback)
      return deferred.resolve();
    try {
      var result = aCallback();
      deferred.resolve(result);
    } catch(error) {
      deferred.reject(error);
    }
  }, 0);
  deferred.canceller = function() {
    clearTimeout(timer);
  };
  return deferred.promise;
};

Deferred.call = function(aCallback, ...aArgs) {
  return Deferred.then(function() {
    return aCallback.apply(this, aArgs);
  });
};


/* DUPLICATED */ Deferred.parallel = /* /DUPLICATED */
Deferred.all = function(...aArgs) {
  if (aArgs.length > 1)
    return this.all(aArgs);

  var tasks = aArgs[0];
  if (!Array.isArray(tasks)) {
    var keys = Object.keys(tasks);
    var promises = keys.map(function(aKey) {
      return tasks[aKey];
    });
    return this.all(promises)
      .then(function(aResults) {
        var results = {};
        keys.forEach(function(aKey, aIndex) {
          results[aKey] = aResults[aIndex];
        });
        return results;
      });
  }

  tasks = tasks.map(function(aTask) {
    if (typeof aTask == 'function')
      return Deferred.then(aTask);
    else
      return aTask;
  });
  var deferred = Deferred(Promise.all(tasks));
  deferred.canceller = function() {
    tasks.forEach(function(aTask) {
      aTask.cancel();
    });
  };
  return deferred.promise;
};

Deferred.earlier = function(...aArgs) {
  if (aArgs.length > 1)
    return this.earlier(aArgs);

  var deferred = Deferred(Promise.defer());
  var run = function(aTask, aKey) {
    aTask
      .then(function(aResult) {
        results[aKey] = aResult;
        deferred.cancel();
        deferred.resolve(results);
      })
      .error(function(aError) {
        deferred.reject(aError);
      });
  };

  var tasks = aArgs[0];
  var results = {};
  if (Array.isArray(tasks)) {
    results = [];
    results.length = tasks.length;
    tasks.forEach(function(aTask, aIndex) {
      if (typeof aTask == 'function')
        tasks[aIndex] = aTask = Deferred.then(aTask);
      run(aTask, aIndex);
    });
    deferred.canceller = function() {
      tasks.forEach(function(aTask) {
        aTask.cancel();
      });
    };
  } else {
    Object.keys(tasks).forEach(function(aKey) {
      var task = tasks[aKey];
      if (typeof task == 'function')
        tasks[aKey] = task = Deferred.then(task);
      run(task, aKey);
    });
    deferred.canceller = function() {
      Object.keys(tasks).forEach(function(aKey) {
        var task = tasks[aKey];
        task.cancel();
      });
    };
  }

  if (tasks.length == 0)
    return Deferred.then();

  return deferred.promise;
};

Deferred.wait = function(aSeconds) {
  var start = Date.now();
  var deferred = Deferred(Promise.defer());
  var timer = setTimeout(function() {
    var delta = Date.now() - start;
    deferred.resolve(delta);
  }, aSeconds * 1000);
  deferred.canceller = function() {
    clearTimeout(timer);
  };
  return deferred.promise;
};

Deferred.chain = function(...aTasks) {
  var chain = Deferred.then();
  aTasks.forEach(function(aTask) {
    switch (typeof aTask) {
      case 'function':
        var name = null;
        try {
          name = String(aTask).match(/^\s*function\s*([^\s()]+)/)[1];
        } catch(error) {
        }
        if (name != 'error')
          chain = chain.then(aTask);
        else
          chain = chain.error(aTask);
        break;

      case 'object':
        chain = chain.then(function() {
          return Deferred.all(aTask);
        });
        break;

      default:
        throw new Error('unknown type in process chains');
    }
  });
  return chain;
};

Deferred.retry = function(aRetryCount, aDeferredFunction, aOptions) {
  aOptions = aOptions || {};
  var wait = aOptions.wait || 0;
  var deferred = Deferred(Promise.defer());
  var retry = function () {
    aDeferredFunction(aRetryCount)
      .then(function(aResult) {
        deferred.resolve(aResult);
      })
      .error(function(aError) {
        if (--aRetryCount <= 0) {
          deferred.reject(['retry failed', aError]);
        } else { 
          setTimeout(retry, wait * 1000);
        }
      });
  };
  setTimeout(retry, 0);
  return deferred.promise;
};

Deferred.loop = function(aLoopCount, aTask) {
  var params = {
    begin: aLoopCount.begin || 0,
    end:   (typeof aLoopCount.end == 'number') ? aLoopCount.end : aLoopCount - 1,
    step:  aLoopCount.step || 1,
    last:  false,
    prev:  null
  };
  var returnValue;
  var step = params.step;
  return Deferred.then(function() {
    function loopedTask(aCount) {
      if (aCount <= params.end) {
        if ((aCount + step) > params.end) {
          params.last = true;
          params.step = params.end - aCount + 1;
        }
        params.prev = returnValue;
        returnValue = aTask.call(this, aCount, params);
        if (Deferred.isDeferred(returnValue)) {
          return returnValue.then(function(aResult) {
            returnValue = aResult;
            return Deferred.call(loopedTask, aCount + step);
          });
        } else {
          return Deferred.call(loopedTask, aCount + step);
        }
      } else {
        return returnValue;
      }
    }
    if (params.begin <= params.end) {
      return Deferred.call(loopedTask, params.begin);
    } else {
      return null;
    }
  });
};

Deferred.repeat = function(aRepeatCount, aTask) {
  var count = 0;
  var result = null;
  return Deferred.then(function repeatedTask() {
    var start = Date.now();
    do {
      if (count >= aRepeatCount)
        return result;
      result = aTask(count++);
    }
    while (Date.now() - start < 20);
    return Deferred.call(repeatedTask);
  });
};

Deferred.connect = function(...aArgs) {
  var target, connectedFunction, params;
  if (typeof aArgs[1] == 'string') {
    target = aArgs[0];
    connectedFunction = target[aArgs[1]];
    options = aArgs[2] || {};
  } else {
    connectedFunction = aArgs[0];
    params = aArgs[1] || {};
    target = params.target;
  }

  var boundedArgs = params.args ? Array.prototype.slice.call(params.args, 0) : [];
  var successCallbackArgIndex = isFinite(params.ok) ? params.ok :
                                params.args ? params.args.length :
                                undefined;
  var failureCallbackArgIndex = params.ng;

  return function(...aArgs) {
    var args = boundedArgs.concat(aArgs);
    var deferred = Deferred(Promise.defer());

    if (successCallbackArgIndex === null ||
        successCallbackArgIndex === undefined ||
        !isFinite(params.ok))
      successCallbackArgIndex = args.length;
    args.splice(successCallbackArgIndex, 0, function(...aSuccessArgs) {
      deferred.resolve(aSuccessArgs);
    });

    if (failureCallbackArgIndex !== null &&
        failureCallbackArgIndex !== undefined) {
      args.splice(failureCallbackArgIndex, 0, function(...aFailureArgs) {
        deferred.reject(aFailureArgs);
      });
    }

    Deferred.then(function () {
      connectedFunction.apply(target, args);
    });
    return deferred.promise;
  };
};


Deferred.register = function(name, func) {
  WrappedPromise.prototype[name] =
    WrappedDeferred.prototype[name] = function(...aArgs) {
      return this.then(function() {
        return func.apply(this, aArgs);
      });
    };
};

Deferred.register('all',      Deferred.all);
/* DUPLICATED */
Deferred.register('parallel', Deferred.parallel);
/* /DUPLICATED */
Deferred.register('earlier',  Deferred.earlier);
Deferred.register('wait',     Deferred.wait);
Deferred.register('chain',    Deferred.chain);
Deferred.register('retry',    Deferred.retry);
Deferred.register('loop',     Deferred.loop);
Deferred.register('repeat',   Deferred.repeat);


Deferred.methods = [
  'call',
/* DUPLICATED */
  'next',
/* /DUPLICATED */
  'then',
/* DUPLICATED */
  'parallel',
/* /DUPLICATED */
  'all',
  'earlier',
  'wait',
  'chain',
  'retry',
  'loop',
  'repeat'
];

Deferred.define = function(aTarget, aMethods) {
  aMethods = aMethods || Deferred.methods;
  if (!aTarget)
    aTarget = (function getGlobal() { return this })();
  if (!aTarget)
    throw new Error('no target');

  aMethods.forEach(function(aMethod) {
    var func = Deferred[aMethod];
    if (func)
      aTarget[aMethod] = func.bind(Deferred);
  });
  return Deferred;
};

/*
  Not implemented yet:
   * postie
*/
