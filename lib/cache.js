'use strict';

var Promise = require('bluebird');

function Cache(cacheDelegate) {
  this.cacheDelegate = cacheDelegate;
}

Cache.prototype.get = function(key, fetchFn) {
  return Promise.resolve(this.cacheDelegate.get(key, fetchFn));
};

module.exports = Cache;
