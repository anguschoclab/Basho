# Bug Registry v4

**Date:** 2026-09-03
**Consolidation:** v4 (supersedes v3)

## Bugs Found and Fixed

### V4-B01: mathRandomScan test false positive on comment-only lines
- **File:** `src/tests/unit/audit/mathRandomScan.test.ts:34`
- **Severity:** Low (test bug, not engine bug)
- **Root Cause:** The test's comment-stripping regex `/\/\/.*$/` failed to properly strip `calendar.ts:5` (`// - NO Math.random(): flavor selection is seeded/deterministic`), causing a false positive that flagged a comment-only line as a Math.random violation.
- **Fix:** Added a guard to skip comment-only lines before the regex check, matching the approach used in `scripts/engine-reviewer.ts:51`:
  ```ts
  if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
  ```
- **Test-First:** The test IS the fix — the modified test now passes.
- **Verification:** `npx vitest run src/tests/unit/audit/mathRandomScan.test.ts` → 1/1 PASS

### V4-B02: orphan-audit import path resolution fails on Windows
- **File:** `scripts/audit-orphans.ts:365`
- **Severity:** Medium (causes 2 test failures on Windows)
- **Root Cause:** `resolveImportPath` used `fromFile.substring(0, fromFile.lastIndexOf("/"))` to extract the directory. On Windows, paths use `\` (backslash), so `lastIndexOf("/")` returns -1, making `dir` empty. This caused namespace import resolution to fail, making the audit incorrectly flag services imported via `import * as` as unticked.
- **Fix:** Replaced with `path.dirname(fromFile)` (cross-platform):
  ```ts
  const dir = dirname(fromFile);
  ```
- **Test-First:** Existing orphan-audit tests verify the fix.
- **Verification:** `npx vitest run src/tests/unit/audit/orphan-audit.test.ts` → 11/11 PASS (was 9/11 before fix)

### V4-B03: MigrationService mutable state leak (events)
- **File:** `src/engine/persistence/MigrationService.ts:96`
- **Severity:** Low (migrateSave deep-copies before running steps, so public API is safe)
- **Root Cause:** `world.events = { version: "1.0.0", log: [], dedupe: {} }` directly mutated the world reference. The engine-reviewer flags this pattern statically.
- **Fix:** Build new world object immutably:
  ```ts
  world = { ...world, events: { version: "1.0.0", log: [], dedupe: {} } };
  next.world = world as unknown as typeof next.world;
  ```
- **Test-First:** Immutability test added to MigrationService.test.ts before fix. Test passes both before and after (migrateSave deep-copies).
- **Verification:** `npx vitest run src/tests/unit/engine/persistence/MigrationService.test.ts` → 16/16 PASS

### V4-B04: MigrationService mutable state leak (sponsorPool)
- **File:** `src/engine/persistence/MigrationService.ts:132`
- **Severity:** Low (same as V4-B03)
- **Root Cause:** `world.sponsorPool = { sponsors: {}, koenkais: {} }` directly mutated the world reference.
- **Fix:** Build new world object immutably:
  ```ts
  world = { ...world, sponsorPool: { sponsors: {}, koenkais: {} } };
  next.world = world as unknown as typeof next.world;
  ```
- **Test-First:** Immutability test added to MigrationService.test.ts before fix.
- **Verification:** Same as V4-B03.

### V4-B05: CandidatePoolService @world-builder annotation placement
- **File:** `src/engine/systems/generation/CandidatePoolService.ts:36`
- **Severity:** Low (engine-reviewer false positive)
- **Root Cause:** `@world-builder` annotation was on line 37 (inside the object literal), not line 36 (the assignment line). The engine-reviewer checks `rawLine.includes("@world-builder")` on the same line as the mutation.
- **Fix:** Moved annotation to the assignment line:
  ```ts
  world.candidatePool = { // @world-builder
  ```
- **Test-First:** Existing 14 CandidatePoolService tests verify no behavior change.
- **Verification:** `npx vitest run src/tests/unit/engine/generation/CandidatePoolService.test.ts` → 14/14 PASS

### V4-B06: TalentPoolStateService @world-builder annotation placement
- **File:** `src/engine/systems/generation/TalentPoolStateService.ts:25`
- **Severity:** Low (same as V4-B05)
- **Root Cause:** `@world-builder` annotation was on line 26 (inside the object literal), not line 25 (the assignment line).
- **Fix:** Moved annotation to the assignment line:
  ```ts
  world.talentPool = { // @world-builder
  ```
- **Test-First:** Existing tests verify no behavior change.
- **Verification:** `npx vitest run src/tests/unit/engine/simulation/globalCupParity.test.ts` → 2/2 PASS

## Pre-Existing Issues (Already Fixed Before v4)

### localStorage jsdom test failures (~157 tests)
- **Fixed by:** Commit `eef684d5` (2026-09-01)
- **Fix:** Added `createInMemoryLocalStorage()` polyfill to `src/tests/setup/setup.ts`
- **v4 role:** Verified the fix works — all previously-failing tests now pass

### accessibilityAudit color-only indicators (1 test)
- **Fixed by:** Commits between v3 baseline and v4
- **Fix:** 3 color-only status indicators resolved
- **v4 role:** Verified — `npx vitest run src/tests/unit/audit/accessibilityAudit.test.ts` → 3/3 PASS

## v3 Bug Re-Verification

| v3 Bug ID | Description | v4 Status |
|-----------|-------------|-----------|
| V3-001 | Duplicate `awardLog` in ImpactBuilder | Still fixed |
| V3-002 | `WorldState` value import in SimulationRunner | Still fixed (`import type`) |
| V3-003 | `EngineEvent` value import in EventDetailDialog | Still fixed |
| V3-A01 | `logEngineEvent` side effect in `resolveImpacts` | Present — re-approved (observability, not mutation) |
| V3-A02 | EntityService Map/POJO allowlist | Present — Scribe #876 added comprehensive JSDoc warning |
| V3-A03 | `as unknown`/`as never` casts | 8 `as unknown` + 11 `as never` — Mason #911 removed 3 `as unknown` from LegacyService |
