// Benchmark script comparing filter().length vs reduce()

const { performance } = require('perf_hooks');
const v8 = require('v8');

function formatMemoryUsage(data) {
    return `${Math.round(data / 1024 / 1024 * 100) / 100} MB`;
}

// Generate realistic data
const numMatches = 10000;
const matches = [];

for (let i = 0; i < numMatches; i++) {
    matches.push({
        id: i,
        result: Math.random() > 0.5 ? { winnerId: 1, loserId: 2 } : null
    });
}

function gc() {
    if (global.gc) {
        global.gc();
    }
}

console.log(`Running benchmark with ${numMatches} matches over 10000 iterations...\n`);

const iterations = 10000;

// Test 1: filter().length
gc();
const startMemFilter = process.memoryUsage().heapUsed;
const startFilter = performance.now();
let filterResult = 0;

for (let i = 0; i < iterations; i++) {
    filterResult = matches.filter((m) => !!m.result).length;
}

const endFilter = performance.now();
const endMemFilter = process.memoryUsage().heapUsed;

const filterTime = endFilter - startFilter;
const filterMem = endMemFilter - startMemFilter;

console.log(`1. filter().length:`);
console.log(`   Time: ${filterTime.toFixed(2)} ms`);
console.log(`   Result: ${filterResult}`);
// console.log(`   Memory Delta: ${formatMemoryUsage(filterMem)}`);


// Test 2: reduce()
gc();
const startMemReduce = process.memoryUsage().heapUsed;
const startReduce = performance.now();
let reduceResult = 0;

for (let i = 0; i < iterations; i++) {
    reduceResult = matches.reduce((count, m) => count + (m.result ? 1 : 0), 0);
}

const endReduce = performance.now();
const endMemReduce = process.memoryUsage().heapUsed;

const reduceTime = endReduce - startReduce;
const reduceMem = endMemReduce - startMemReduce;

console.log(`\n2. reduce():`);
console.log(`   Time: ${reduceTime.toFixed(2)} ms`);
console.log(`   Result: ${reduceResult}`);
// console.log(`   Memory Delta: ${formatMemoryUsage(reduceMem)}`);

console.log(`\n--- Summary ---`);
console.log(`Time improvement: ${((filterTime - reduceTime) / filterTime * 100).toFixed(2)}% faster`);
console.log(`The real improvement is in avoiding the allocation of ${iterations} intermediate arrays.`);
