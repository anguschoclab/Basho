## 2024-05-18 - Tighten RikishiStats access in LegacyService
**Finding:** `LegacyService.ts` was bypassing TypeScript's strict interface checking by double-casting `boosted` when iterating over keys in `trait.statFloorBonus`.
**Learning:** You can't just iterate `Object.entries` of a `Partial<T>` and assume the key is statically known as a specific property name if `T` mixes number, string, and complex object fields.
**Constraint:** When tightening dynamic property assignments on interfaces with mixed types like `RikishiStats`, extract a union type of the target keys (`NumericStat`) and pair it with a custom type guard (`isNumericStat`). This natively satisfies the compiler without relying on unsafe `as unknown as Record<string, unknown>` casts.
