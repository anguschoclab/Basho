import { performance } from "perf_hooks";

// Mock Rikishi type
type RikishiMock = { rank: string };

function createMockData(size: number): RikishiMock[] {
  const ranks = ["yokozuna", "ozeki", "sekiwake", "komusubi", "maegashira", "juryo", "makushita", "sandanme", "jonidan", "jonokuchi"];
  const data: RikishiMock[] = [];
  for (let i = 0; i < size; i++) {
    // Make roughly 1/10th of them yokozuna
    data.push({ rank: ranks[i % ranks.length] });
  }
  return data;
}

const dataSize = 100_000;
const iterations = 1000;
const allRikishi = createMockData(dataSize);

console.log(`Benchmarking with array size: ${dataSize}, iterations: ${iterations}`);

// 1. Original: filter().length
let start = performance.now();
for (let i = 0; i < iterations; i++) {
  const count = allRikishi.filter((r) => r.rank === "yokozuna").length;
}
let end = performance.now();
const filterLengthTime = end - start;
console.log(`filter().length: ${filterLengthTime.toFixed(2)}ms`);

// 2. Reduce: reduce()
start = performance.now();
for (let i = 0; i < iterations; i++) {
  const count = allRikishi.reduce((acc, r) => (r.rank === "yokozuna" ? acc + 1 : acc), 0);
}
end = performance.now();
const reduceTime = end - start;
console.log(`reduce(): ${reduceTime.toFixed(2)}ms`);

// 3. For loop: for...of
start = performance.now();
for (let i = 0; i < iterations; i++) {
  let count = 0;
  for (const r of allRikishi) {
    if (r.rank === "yokozuna") count++;
  }
}
end = performance.now();
const forLoopTime = end - start;
console.log(`for...of loop: ${forLoopTime.toFixed(2)}ms`);

// 4. Standard for loop
start = performance.now();
for (let i = 0; i < iterations; i++) {
  let count = 0;
  for (let j = 0; j < allRikishi.length; j++) {
    if (allRikishi[j].rank === "yokozuna") count++;
  }
}
end = performance.now();
const standardForTime = end - start;
console.log(`standard for loop: ${standardForTime.toFixed(2)}ms`);
