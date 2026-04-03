import { describe, it, expect } from 'vitest';
import { EntityService } from '../EntityService';
import type { WorldState } from '../../types/world';

describe('EntityService', () => {
  describe('ensureState', () => {
    it('should create state if it does not exist', () => {
      const parent: any = {};
      const factory = () => ({ val: 1 });
      const result = EntityService.ensureState(parent, 'myState', factory);

      expect(result).toEqual({ val: 1 });
      expect(parent.myState).toEqual({ val: 1 });
    });

    it('should return existing state if it exists', () => {
      const parent: any = { myState: { val: 2 } };
      const factory = () => ({ val: 1 });
      const result = EntityService.ensureState(parent, 'myState', factory);

      expect(result).toEqual({ val: 2 });
      expect(parent.myState).toEqual({ val: 2 });
    });
  });

  describe('ensureNestedState', () => {
    it('should create root state and nested state if they do not exist', () => {
      const world = {} as WorldState;
      const factory = () => ({ val: 1 });
      const result = EntityService.ensureNestedState(world, 'trainingState', 'heya1', factory);

      expect(result).toEqual({ val: 1 });
      expect(world.trainingState).toBeDefined();
      expect(world.trainingState!['heya1']).toEqual({ val: 1 });
    });

    it('should create nested state if root state exists but nested does not', () => {
      const world = { trainingState: {} } as unknown as WorldState;
      const factory = () => ({ val: 1 });
      const result = EntityService.ensureNestedState(world, 'trainingState', 'heya1', factory);

      expect(result).toEqual({ val: 1 });
      expect((world as any).trainingState['heya1']).toEqual({ val: 1 });
    });

    it('should return existing nested state if it exists', () => {
      const world = { trainingState: { heya1: { val: 2 } } } as unknown as WorldState;
      const factory = () => ({ val: 1 });
      const result = EntityService.ensureNestedState(world, 'trainingState' as any, 'heya1', factory);

      expect(result).toEqual({ val: 2 });
      expect((world as any).trainingState['heya1']).toEqual({ val: 2 });
    });
  });
});
