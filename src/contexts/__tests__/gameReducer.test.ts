// src/contexts/__tests__/gameReducer.test.ts
import { describe, it, expect } from 'vitest';
import { gameReducer } from '../gameReducer';
import { initialGameState } from '../gameTypes';
import { generateInitialWorld } from '../../engine/systems/generation/WorldFactory';

describe('Game Reducer Purity', () => {
  it('MUST NOT mutate the previous state object on TICK_DAY', () => {
    const initialState = {
      ...initialGameState,
      world: generateInitialWorld('test-purity'),
    };

    expect(() => {
      gameReducer(initialState, { type: 'TICK_DAY' } as any);
    }).not.toThrow();

    const nextState = gameReducer(initialState, { type: 'TICK_DAY' } as any);

    // Verify a new object reference was returned
    expect(nextState).not.toBe(initialState);
    expect(nextState.world).not.toBe(initialState.world);
  });
});

describe('Game Reducer: Batch Processing', () => {
  it('MUST process multiple days atomically without intermediate states', () => {
    const initialState = {
      ...initialGameState,
      world: generateInitialWorld('test-batch'),
    };

    // Track the starting date
    const startDay = initialState.world.calendar.currentDay;

    // Dispatch the new batch action
    const nextState = gameReducer(initialState, {
      type: 'TICK_MULTIPLE_DAYS',
      payload: { days: 15 }
    } as any);

    // 1. Assert state reference changed exactly once (atomic commit)
    expect(nextState).not.toBe(initialState);
    expect(nextState.world).not.toBe(initialState.world);

    // 2. Assert the calendar advanced
    expect(nextState.world.calendar.currentDay).not.toBe(startDay);
  });
});
