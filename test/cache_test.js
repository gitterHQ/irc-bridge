'use strict';

var assert = require('assert');
var Promise = require('bluebird');
var Cache = require('../lib/cache');



describe('Cache', function() {

  describe('static map', function() {
    var cache;
    var backingStore;
    beforeEach(function() {
      backingStore = {
        foo: 'bar',
        ping: 'pong'
      };
      var staticMapCacheDelegate = {
        get: function(key, fetchFn) {
          return Promise.resolve(backingStore[key]);
        }
      };

      cache = new Cache(staticMapCacheDelegate);
    });

    it('should retrieve value from `.get`', function() {
      var retrieveValuePromise = cache.get('foo', function() { });

      return retrieveValuePromise
        .then(function(val) {
          assert.equal(val, 'bar');
        });
    });
  });

  describe('local map', function() {
    var cache;
    var backingStore;
    beforeEach(function() {
      backingStore = {};
      var localMapCacheDelegate = {
        get: function(key, fetchFn) {
          return Promise.resolve(backingStore[key] || fetchFn().then(function(newVal) {
            backingStore[key] = newVal;
            return newVal;
          }));
        }
      };

      cache = new Cache(localMapCacheDelegate);
    });

    it('should fill in cache from fetchFn when empty', function() {
      var expectedValue = 'bar';
      var retrieveValuePromise = cache.get('foo', function() {
        return Promise.resolve(expectedValue);
      });

      assert.deepEqual(backingStore, { });
      return retrieveValuePromise
        .then(function(val) {
          assert.equal(val, expectedValue);
          assert.deepEqual(backingStore, { foo: 'bar' });
        });
    });

    it('should retrieve same value from cache', function() {
      var expectedValue = 'bar';
      var retrieveValuePromise = cache.get('foo', function() {
        return Promise.resolve(expectedValue);
      });

      return retrieveValuePromise
        .then(function(val) {
          assert.equal(val, expectedValue);
          assert.deepEqual(backingStore, { foo: 'bar' });
        })
        .then(function() {
          return cache.get('foo', function() {
            return Promise.resolve('oops');
          });
        })
        .then(function(val) {
          assert.equal(val, expectedValue);
          assert.deepEqual(backingStore, { foo: 'bar' });
        });
    });
  });
});
