type TalentPoolType = "high_school" | "university" | "foreign";
type Prospect = { pool: TalentPoolType };

// Generate mock data
const prospects: Prospect[] = [];
for (let i = 0; i < 10000; i++) {
  const r = Math.random();
  if (r < 0.33) prospects.push({ pool: "high_school" });
  else if (r < 0.66) prospects.push({ pool: "university" });
  else prospects.push({ pool: "foreign" });
}

// Baseline
function baseline(prospects: Prospect[]) {
  return {
    high_school: prospects.filter(p => p.pool === "high_school").length,
    university: prospects.filter(p => p.pool === "university").length,
    foreign: prospects.filter(p => p.pool === "foreign").length,
  };
}

// Reduce
function usingReduce(prospects: Prospect[]) {
  return prospects.reduce(
    (acc, p) => {
      acc[p.pool]++;
      return acc;
    },
    { high_school: 0, university: 0, foreign: 0 }
  );
}

// For Loop
function usingForLoop(prospects: Prospect[]) {
  const counts = { high_school: 0, university: 0, foreign: 0 };
  for (let i = 0; i < prospects.length; i++) {
    counts[prospects[i].pool]++;
  }
  return counts;
}

// For Of
function usingForOf(prospects: Prospect[]) {
  const counts = { high_school: 0, university: 0, foreign: 0 };
  for (const p of prospects) {
    counts[p.pool]++;
  }
  return counts;
}

const ITERATIONS = 10000;

let start = performance.now();
for (let i = 0; i < ITERATIONS; i++) baseline(prospects);
const baselineTime = performance.now() - start;

start = performance.now();
for (let i = 0; i < ITERATIONS; i++) usingReduce(prospects);
const reduceTime = performance.now() - start;

start = performance.now();
for (let i = 0; i < ITERATIONS; i++) usingForLoop(prospects);
const forLoopTime = performance.now() - start;

start = performance.now();
for (let i = 0; i < ITERATIONS; i++) usingForOf(prospects);
const forOfTime = performance.now() - start;

console.log(`Baseline (filter.length): ${baselineTime.toFixed(2)}ms`);
console.log(`Reduce: ${reduceTime.toFixed(2)}ms (${((baselineTime - reduceTime) / baselineTime * 100).toFixed(2)}% improvement)`);
console.log(`For Loop: ${forLoopTime.toFixed(2)}ms (${((baselineTime - forLoopTime) / baselineTime * 100).toFixed(2)}% improvement)`);
console.log(`For Of: ${forOfTime.toFixed(2)}ms (${((baselineTime - forOfTime) / baselineTime * 100).toFixed(2)}% improvement)`);
