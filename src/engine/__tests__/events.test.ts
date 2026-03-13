import { describe, it, expect } from 'vitest';
import { ensureEventsState } from '../events';
import type { WorldState } from '../types';

describe('events.ts - ensureEventsState', () => {
  it('initializes events when world.events is undefined', () => {
    const world = {} as WorldState;
    const result = ensureEventsState(world);

    expect(result).toEqual({ version: '1.0.0', log: [], dedupe: {} });
    expect(world.events).toBe(result);
  });

  it('re-initializes events when version is missing', () => {
    const world = { events: { log: [], dedupe: {} } } as unknown as WorldState;
    const result = ensureEventsState(world);

    expect(result).toEqual({ version: '1.0.0', log: [], dedupe: {} });
    expect(world.events).toBe(result);
  });

  it('re-initializes events when log is not an array', () => {
    const world = { events: { version: '1.0.0', log: null, dedupe: {} } } as unknown as WorldState;
    const result = ensureEventsState(world);

    expect(result).toEqual({ version: '1.0.0', log: [], dedupe: {} });
    expect(world.events).toBe(result);
  });

  it('returns existing events object without modifying it if valid', () => {
    const existingEvents = {
      version: '1.0.0' as const,
      log: [{ id: '1', type: 'TEST', category: 'misc' as const, importance: 'minor' as const, scope: 'world' as const, truthLevel: 'public' as const, year: 2024, week: 1, phase: 'weekly' as const, title: 'T', summary: 'S', data: {} }],
      dedupe: { 'key': true }
    };
    const world = { events: existingEvents } as unknown as WorldState;

    const result = ensureEventsState(world);

    expect(result).toBe(existingEvents);
    expect(world.events).toBe(existingEvents);
    expect(result.log.length).toBe(1);
    expect(result.dedupe).toHaveProperty('key');
  });
});
