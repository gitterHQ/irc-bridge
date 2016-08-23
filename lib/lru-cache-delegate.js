'use strict';

var Promise = require('bluebird');
var LRU = require('lru-cache');

function LruCacheDelegate(options) {
  this.backingCache = LRU(options);
}

LruCacheDelegate.prototype.get = Promise.method(function(key, fetchFn) {
  var val = this.backingCache.get(key);

  if(!val) {
    return fetchFn()
    .then(function(newVal) {
      this.backingCache.set(key, newVal);
    }.bind(this));
  }
});

module.exports = LruCacheDelegate;
