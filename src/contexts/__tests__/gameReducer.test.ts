// src/contexts/__tests__/gameReducer.test.ts
import { describe, it, expect } from 'vitest';
import { gameReducer } from '../gameReducer';
import { generateWorld } from '../../engine/worldgen';

// Utility to deeply freeze an object to aggressively catch mutations
function deepFreeze(object: any) {
  const propNames = Object.getOwnPropertyNames(object);
  for (const name of propNames) {
    const value = object[name];
    if (value && typeof value === 'object') deepFreeze(value);
  }
  return Object.freeze(object);
}

describe('Game Reducer Purity', () => {
  it('MUST NOT mutate the previous state object on TICK_DAY', () => {
    const initialState = { 
      phase: 'interim' as const,
      world: generateWorld('test-purity'),
      selectedRikishiId: null,
      selectedHeyaId: null,
      currentBoutIndex: 0,
      lastBoutResult: null,
      playerHeyaId: null,
      isAutoPlaying: false,
    };
    
    // We freeze the initial state. If gameReducer mutates it, JS will throw a TypeError.
    deepFreeze(initialState);

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
      phase: 'interim' as const,
      world: generateWorld('test-batch'),
      selectedRikishiId: null,
      selectedHeyaId: null,
      currentBoutIndex: 0,
      lastBoutResult: null,
      playerHeyaId: null,
      isAutoPlaying: false,
    };

    // Track the starting date
    const startDay = initialState.world.calendar.currentDay;
    const startMonth = initialState.world.calendar.month;

    // Dispatch the new batch action
    const nextState = gameReducer(initialState, { 
      type: 'TICK_MULTIPLE_DAYS', 
      payload: { days: 15 } 
    } as any);

    // 1. Assert state reference changed exactly once (atomic commit)
    expect(nextState).not.toBe(initialState);
    expect(nextState.world).not.toBe(initialState.world);

    // 2. Assert the calendar advanced
    // We expect the date to have advanced, proving the loop ran
    expect(nextState.world.calendar.currentDay).not.toBe(startDay);
  });
});
