'use strict';

var Promise = require('bluebird');
var LRU = require('lru-cache');

function LruCacheDelegate(options) {
  this.backingCache = LRU(options);
}

LruCacheDelegate.prototype.get = Promise.method(function(key, fetchFn) {
  var val = this.backingCache.get(key);

  if(!val) {
    return Promise.resolve(fetchFn())
    .bind(this)
    .then(function(newVal) {
      this.backingCache.set(key, newVal);
      return newVal;
    });
  }

  return Promise.resolve(val);
});

module.exports = LruCacheDelegate;
