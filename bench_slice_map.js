const Benchmark = require('benchmark');

const suite = new Benchmark.Suite;

const arr = Array.from({ length: 100 }, (_, i) => i);
const limit = 4;
const fn = x => x * 2;

suite.add('slice.map', function() {
  const result = arr.slice(0, limit).map(fn);
})
.add('for loop', function() {
  const limit = Math.min(arr.length, 4);
  const result = [];
  for (let i = 0; i < limit; i++) {
    result.push(fn(arr[i]));
  }
})
.add('for loop pre-allocated', function() {
  const limit = Math.min(arr.length, 4);
  const result = new Array(limit);
  for (let i = 0; i < limit; i++) {
    result[i] = fn(arr[i]);
  }
})
.on('cycle', function(event) {
  console.log(String(event.target));
})
.on('complete', function() {
  console.log('Fastest is ' + this.filter('fastest').map('name'));
})
.run({ 'async': false });
