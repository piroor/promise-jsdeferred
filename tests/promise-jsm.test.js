var DeferredLibrary = utils.import('../jsdeferred.promise-jsm.js', {});

var ns = {};
ns.Deferred = DeferredLibrary.Deferred;
ns.Deferred.define(ns);

utils.include('./test.inc.js');
