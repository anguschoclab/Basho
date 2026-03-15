import { performance } from "perf_hooks";

// Mock data
const ITERATIONS = 10000;
const MATCH_COUNT = 100;

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

// Mock helpers
function getH2HRecord(e: any, w: any) { return { wins: 0, losses: 0 }; }
function getRivalry(s: any, e: any, w: any) { return null; }
function getHeatBand(h: any) { return null; }
function generateH2HCommentary(e: any, w: any) { return ""; }
const playerRikishiIds = new Set(['e1', 'w2']);
const rivalriesState = {};

function runMapFilter() {
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    const resolvedMatches = matches.map((match) => {
      const east = world.rikishi.get(match.eastRikishiId);
      const west = world.rikishi.get(match.westRikishiId);
      if (!east || !west) return null;

      const h2h = getH2HRecord(east, west);
      const rivalry = getRivalry(rivalriesState, east.id, west.id);
      const heatBand = rivalry ? getHeatBand((rivalry as any).heat) : null;
      const isPlayerBout = playerRikishiIds.has(east.id) || playerRikishiIds.has(west.id);
      const h2hCommentary = generateH2HCommentary(east, west);

      return { ...match, east, west, h2h, rivalry, heatBand, isPlayerBout, h2hCommentary };
    }).filter(Boolean);
  }
  return performance.now() - start;
}

function runReduce() {
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    const resolvedMatches = matches.reduce<any[]>((acc, match) => {
      const east = world.rikishi.get(match.eastRikishiId);
      const west = world.rikishi.get(match.westRikishiId);
      if (!east || !west) return acc;

      const h2h = getH2HRecord(east, west);
      const rivalry = getRivalry(rivalriesState, east.id, west.id);
      const heatBand = rivalry ? getHeatBand((rivalry as any).heat) : null;
      const isPlayerBout = playerRikishiIds.has(east.id) || playerRikishiIds.has(west.id);
      const h2hCommentary = generateH2HCommentary(east, west);

      acc.push({ ...match, east, west, h2h, rivalry, heatBand, isPlayerBout, h2hCommentary });
      return acc;
    }, []);
  }
  return performance.now() - start;
}

// Warmup
runMapFilter();
runReduce();

const mapFilterTime = runMapFilter();
const reduceTime = runReduce();

console.log(`Map + Filter Time: ${mapFilterTime.toFixed(2)} ms`);
console.log(`Reduce Time:       ${reduceTime.toFixed(2)} ms`);
console.log(`Improvement:       ${(((mapFilterTime - reduceTime) / mapFilterTime) * 100).toFixed(2)}%`);
