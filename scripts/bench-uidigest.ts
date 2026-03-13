import { buildWeeklyDigest } from "../src/engine/uiDigest";

const mockWorld = {
  rikishi: new Map(),
  heyas: new Map(),
  events: { log: [] },
  year: 2024,
  week: 1,
  cyclePhase: "interim",
};

// Generate a large number of events
for (let i = 0; i < 10000; i++) {
  mockWorld.events.log.push({
    id: `event-${i}`,
    category: i % 2 === 0 ? "training" : "generic",
    type: "TEST",
    title: "Test Event",
    summary: "A test event",
    week: 1,
  });
}

// Warmup
for (let i = 0; i < 100; i++) {
  buildWeeklyDigest(mockWorld as any);
}

const start = performance.now();
for (let i = 0; i < 10000; i++) {
  buildWeeklyDigest(mockWorld as any);
}
const end = performance.now();

console.log(`Baseline performance: ${(end - start).toFixed(2)}ms for 10000 iterations`);
