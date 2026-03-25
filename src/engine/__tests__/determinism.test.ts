// src/engine/__tests__/determinism.test.ts
import { describe, it, expect } from 'vitest';
import { generateWorld } from '../worldgen';
import { tickOrchestrator } from '../tick/tickOrchestrator';
import { setSeed } from '../rng';

describe('Engine Determinism', () => {
  it('MUST produce identical game states given the same seed after 30 days of simulation', () => {
    const TEST_SEED = 'basho-test-seed-v1';

    // Run A
    setSeed(TEST_SEED);
    let worldA = generateWorld(TEST_SEED);
    for (let i = 0; i < 30; i++) {
      worldA = tickOrchestrator(worldA); // Simulates 1 day
    }

    // Run B (Total reset, exact same parameters)
    setSeed(TEST_SEED);
    let worldB = generateWorld(TEST_SEED);
    for (let i = 0; i < 30; i++) {
      worldB = tickOrchestrator(worldB);
    }

    // If this fails, someone used Math.random() or mutated an object outside the engine loop.
    expect(worldA).toEqual(worldB);
  });
});
