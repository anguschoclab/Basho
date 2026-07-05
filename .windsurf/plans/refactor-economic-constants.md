# Refactor Economic Constants

## Summary
Clean up `src/constants/engine/economic.ts` by removing the deprecated `MAINTENANCE_SUBSIDY_AMOUNT` constant. The `KENSHO_RIKISHI_SHARE_RATIO` and `KENSHO_RETIREMENT_DIVERSION_RATIO` constants have already been removed, and `onBoutResolvedEconomics` in `economics.ts` already uses `KENSHO_SPLIT` for kensho payout calculations.

## Verification (already complete)
- `KENSHO_RIKISHI_SHARE_RATIO` and `KENSHO_RETIREMENT_DIVERSION_RATIO` are not present in any source files under `src/` — only in coverage HTML and plan docs.
- `KENSHO_SPLIT` already has the correct values: `{ cash: 30_000, retirement: 30_000, jsaFee: 10_000 }`.
- `onBoutResolvedEconomics` in `src/engine/economics.ts:139-140` already uses `KENSHO_SPLIT.cash` and `KENSHO_SPLIT.retirement`.
- `MAINTENANCE_SUBSIDY_AMOUNT` is defined at `src/constants/engine/economic.ts:225` (set to 0, marked deprecated) and has zero references elsewhere in `src/`.

## Steps

### Step 1 — Remove `MAINTENANCE_SUBSIDY_AMOUNT`
**File: `src/constants/engine/economic.ts`**

Remove lines 224–225:
```typescript
// Maintenance subsidy (yen) — deprecated, set to 0 to remove safety net
export const MAINTENANCE_SUBSIDY_AMOUNT = 0;
```

### Step 2 — Verify
- Run `npx tsc --noEmit` to confirm no broken references.
- Run `npx vitest run src/tests/unit/engine/systems/economics/kenshoSplit.test.ts` to confirm kensho tests still pass.
