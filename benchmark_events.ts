import { queryEvents, ensureEventsState } from './src/engine/events.ts';
import type { WorldState, EngineEvent } from './src/engine/types.ts';

function createMockWorld(eventCount: number): WorldState {
  const world = {
    seed: 'test-seed',
    calendar: {
      year: 2024,
      month: 1,
      currentWeek: 1,
      currentDay: 1,
    },
    events: { version: '1.0.0', log: [], dedupe: {} },
  } as unknown as WorldState;

  const eventTypes = ['TRAINING', 'INJURY', 'ECONOMY', 'BASHO', 'RIVALRY', 'WELFARE', 'GOVERNANCE', 'CAREER'];
  for (let i = 0; i < eventCount; i++) {
    world.events.log.push({
      id: `evt-${i}`,
      type: eventTypes[i % eventTypes.length],
      year: 2024,
      week: 1,
      day: 1,
      phase: 'weekly',
      category: 'misc',
      importance: 'minor',
      scope: 'world',
      title: `Event ${i}`,
      summary: `Summary ${i}`,
      data: {},
      truthLevel: 'public',
    } as EngineEvent);
  }
  return world;
}

const world = createMockWorld(100_000); // Create a world with 100k events
const filters = { types: ['INJURY', 'ECONOMY', 'RIVALRY', 'GOVERNANCE'] }; // 4 types to filter

// Warm up
for (let i = 0; i < 5; i++) {
  queryEvents(world, filters);
}

const iterations = 50;
const start = performance.now();

for (let i = 0; i < iterations; i++) {
  queryEvents(world, filters);
}

const end = performance.now();
const averageTime = (end - start) / iterations;

console.log(`Average time over ${iterations} iterations: ${averageTime.toFixed(2)} ms`);
