import { performance } from "perf_hooks";

// It turns out flatMap might be faster or reduce is faster
const ITERATIONS = 100000;
const MATCH_COUNT = 15; // Typical match day length for a single rank in Sumo

const matches = Array.from({ length: MATCH_COUNT }, (_, i) => ({
  eastRikishiId: `e${i}`,
  westRikishiId: `w${i}`,
}));

const world = {
  rikishi: new Map(
    Array.from({ length: MATCH_COUNT * 2 }, (_, i) => {
      if (i < MATCH_COUNT) {
        return [`e${i}`, { id: `e${i}`, shikona: `East ${i}` }];
      } else {
        return [`w${i - MATCH_COUNT}`, { id: `w${i - MATCH_COUNT}`, shikona: `West ${i - MATCH_COUNT}` }];
      }
    })
  )
};

// Simulate missing rikishi
world.rikishi.delete('e5');
world.rikishi.delete('w10');

const playerRikishiIds = new Set(['e1', 'w2']);

function runMapFilter() {
  let sink = 0;
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    const resolvedMatches = matches.map((match) => {
      const east = world.rikishi.get(match.eastRikishiId);
      const west = world.rikishi.get(match.westRikishiId);
      if (!east || !west) return null;
      return { ...match, east, west };
    }).filter(Boolean);
    sink += resolvedMatches.length;
  }
  return { time: performance.now() - start, sink };
}

function runReduce() {
  let sink = 0;
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    const resolvedMatches = matches.reduce<any[]>((acc, match) => {
      const east = world.rikishi.get(match.eastRikishiId);
      const west = world.rikishi.get(match.westRikishiId);
      if (!east || !west) return acc;
      acc.push({ ...match, east, west });
      return acc;
    }, []);
    sink += resolvedMatches.length;
  }
  return { time: performance.now() - start, sink };
}

function runFlatMap() {
  let sink = 0;
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    const resolvedMatches = matches.flatMap((match) => {
      const east = world.rikishi.get(match.eastRikishiId);
      const west = world.rikishi.get(match.westRikishiId);
      if (!east || !west) return [];
      return [{ ...match, east, west }];
    });
    sink += resolvedMatches.length;
  }
  return { time: performance.now() - start, sink };
}


// Warmup
runMapFilter();
runReduce();
runFlatMap();

let mapFilterTotal = 0;
let reduceTotal = 0;
let flatMapTotal = 0;

for (let j=0; j<5; j++) {
  const mf = runMapFilter();
  const rd = runReduce();
  const fm = runFlatMap();
  mapFilterTotal += mf.time;
  reduceTotal += rd.time;
  flatMapTotal += fm.time;
  if (mf.sink !== rd.sink || rd.sink !== fm.sink) throw new Error("Sink mismatch");
}

console.log(`Map + Filter Avg Time: ${(mapFilterTotal / 5).toFixed(2)} ms`);
console.log(`Reduce Avg Time:       ${(reduceTotal / 5).toFixed(2)} ms`);
console.log(`FlatMap Avg Time:      ${(flatMapTotal / 5).toFixed(2)} ms`);
console.log(`Improvement Map->Reduce: ${(((mapFilterTotal - reduceTotal) / mapFilterTotal) * 100).toFixed(2)}%`);
