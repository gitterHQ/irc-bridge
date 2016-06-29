var assert = require('assert');
var chunkString = require('../lib/chunk-string');

describe('chunk-string', function() {
  it('should not mangle anything below the threshold size', function() {
    assert.deepEqual(chunkString('foo', 4), ['foo']);
  });
  it('should split at spaces', function() {
    assert.deepEqual(chunkString('foo bar', 4), ['foo', 'bar']);
  });
  it('should split at spaces with different size pieces', function() {
    assert.deepEqual(chunkString('foo a bar', 4), ['foo', 'a', 'bar']);
  });
  it('should harshly split items that have no spaces', function() {
    assert.deepEqual(chunkString('foobarbaz', 4), ['foob', 'arba', 'z']);
  });
  it('should maintain words under threshold and still split up another piece', function() {
    assert.deepEqual(chunkString('foo barbazqux', 4), ['foo ', 'barb', 'azqu', 'x']);
  });
  it('should split up piece first and maintain words in another piece under threshold', function() {
    assert.deepEqual(chunkString('barbazqux foo', 4), ['barb', 'azqu', 'x', 'foo']);
  });
  it('should merge some space pieces together that fit', function() {
    assert.deepEqual(chunkString('do foo and bar', 8), ['do foo', 'and bar']);
  });
});
