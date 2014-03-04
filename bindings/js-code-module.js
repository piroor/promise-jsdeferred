var EXPORTED_SYMBOLS = ['Deferred'];

Components.utils.import('resource://gre/modules/Promise.jsm');

if (!setTimeout) {
  setTimeout = function(aCallback, aInterval) {
    var timer = Components
                  .classes['@mozilla.org/timer;1']
                  .createInstance(Components.interfaces.nsITimer);
    timer.initWithCallback(aCallback, aInterval, timer.TYPE_ONE_SHOT);
    timers.push(timer);
    return timer;
  };

  clearTimeout = function(aTimer) {
    aTimer.cancel();
  };
}
