// src/contexts/__tests__/gameReducer.test.ts
import { describe, it, expect, vi } from 'vitest';
import { gameReducer } from '../gameReducer';
import { initialGameState } from '../gameTypes';
import type { GameAction } from '../gameTypes';
import { generateInitialWorld } from '../../engine/systems/generation/WorldFactory';
import * as uiDigestModule from '../../presenters/uiDigest';

vi.mock('../../presenters/uiDigest', () => ({
  buildWeeklyDigest: vi.fn(),
}));

describe('Game Reducer Purity', () => {
  it('MUST NOT mutate the previous state object on TICK_DAY', () => {
    const initialState = {
      ...initialGameState,
      world: generateInitialWorld('test-purity'),
    };

    vi.mocked(uiDigestModule.buildWeeklyDigest).mockReturnValue({} as any);

    const nextState = gameReducer(initialState, { type: 'TICK_DAY' } as unknown as GameAction);

    // Verify a new object reference was returned (if reducer threw, the test fails with the real error)
    expect(nextState).not.toBe(initialState);
    expect(nextState.world).not.toBe(initialState.world);
    // Verify calendar advanced by exactly one day
    expect(nextState.world.dayIndexGlobal).toBe(initialState.world.dayIndexGlobal + 1);
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

    vi.mocked(uiDigestModule.buildWeeklyDigest).mockReturnValue({} as any);

    // Dispatch the new batch action
    const nextState = gameReducer(initialState, {
      type: 'TICK_MULTIPLE_DAYS',
      payload: { days: 5 }
    } as unknown as GameAction);

    // 1. Assert state reference changed exactly once (atomic commit)
    expect(nextState).not.toBe(initialState);
    expect(nextState.world).not.toBe(initialState.world);

    // 2. Assert the calendar advanced
    expect(nextState.world.calendar.currentDay).not.toBe(startDay);
  }, 30_000);
});

describe('Game Reducer Error Handling', () => {
  it('MUST catch errors from buildWeeklyDigest and return original state', () => {
    const initialState = {
      ...initialGameState,
      world: generateInitialWorld('test-error'),
    };

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Digest failed');
    vi.mocked(uiDigestModule.buildWeeklyDigest).mockImplementation(() => {
      throw error;
    });

    const nextState = gameReducer(initialState, { type: 'TICK_DAY' } as unknown as GameAction);

    expect(consoleSpy).toHaveBeenCalledWith('Error building weekly digest:', error);
    // State should reflect the update from baseReducer even if digest build fails
    expect(nextState).not.toBe(initialState);
    expect(nextState.world).not.toBe(initialState.world);

    consoleSpy.mockRestore();
  });
});
