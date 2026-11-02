# v12 RED Phase Log

**Date:** 2026-10-20
**Command:** `bun x vitest run src/tests/unit/engine/events.scanRecentEvents.test.ts src/tests/unit/presenters/actionQueue.test.ts src/tests/unit/presenters/governanceProjections.test.ts`
**Result:** 4 failed / 24 passed — failures map exactly to specified contracts. No implementation preceded its failing test.

## Observed failures (expected RED)

1. `scanRecentEvents > predicate filters before the limit counts — no under-fill`
   — `predicate` option does not exist yet; ignored at runtime → non-predicate
   `incident: "other"` events included in the 10 results.
2. `scanRecentEvents > predicate composes with types and category filters`
   — same missing option; unfiltered ids returned.
3. `scanRecentEvents > predicate-only scan returns newest-first matches`
   — same missing option.
4. `buildActionQueue > does not emit deliberation item for a stale event buried
   past the recency window` — **bug V12-B01 reproduced on production path**:
   `.some()` over all history emits the item for a PROMOTION_DELIBERATION event
   21 entries deep (durable → never evicted → sticky forever).

## Green-by-design (parity pins — pass before AND after migration)

- `governanceProjections.test.ts` (6 tests): pins current `.filter().sort().slice()`
  semantics for `completedMergerEvents` and `projectGomenfuda` so the
  `scanRecentEvents` migration must produce identical results.
- Pre-existing `scanRecentEvents` + `actionQueue` tests remain green.

## GREEN evidence (appended after implementation)

**Date:** 2026-10-20 (post-merge re-verification on `main` @ `4ed537ae`)
**Command:** same as above (3 contract test files)
**Result:** 3 files passed / **51 tests passed** / 0 failed (864ms)

- `events.scanRecentEvents.test.ts` — 11 tests green: the 3 previously-failing
  `predicate` contract tests now pass (option implemented in `events.ts`),
  plus 8 pre-existing scan tests unchanged.
- `actionQueue.test.ts` — 11 tests green: the stale-PROMOTION_DELIBERATION
  regression test now passes (`scanRecentEvents` over `log.slice(-20)` at
  `actionQueue.ts:86`); all prior queue tests unchanged.
- `governanceProjections.test.ts` — 29 tests green: the 6 parity pins held
  through the `scanRecentEvents` + `predicate` migration at
  `governanceProjections.ts:127` and `:227`.

RED → GREEN ordering preserved: every implementation landed only after its
failing contract test was observed on baseline.
