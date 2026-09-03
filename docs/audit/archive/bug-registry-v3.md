# Bug Registry v3

**Date:** 2026-08-25  
**Review:** Exhaustive Repository Consolidation v3

---

## Bugs Found and Fixed

### V3-001: Duplicate `awardLog` in ImpactBuilder generic constraint

| Field | Value |
|-------|-------|
| **File** | `src/engine/core/ImpactBuilder.ts:370,374` |
| **Severity** | Low |
| **Root cause** | Copy-paste error — `"awardLog"` listed twice in `appendToWorldArray` generic `K extends` union |
| **Symptom** | TypeScript silently ignores duplicate union members; no runtime impact but masks intent |
| **Fix** | Removed duplicate line 374 |
| **Test** | 28 ImpactResolver tests pass (`src/tests/unit/engine/core/ImpactResolver.test.ts`) |
| **Test-first** | Existing tests validate `appendToWorldArray` behavior; no new test needed for duplicate removal |
| **Found during** | Phase 1A engine deep read |

### V3-002: `WorldState` value import in SimulationRunner

| Field | Value |
|-------|-------|
| **File** | `src/engine/core/SimulationRunner.ts:6` |
| **Severity** | Low |
| **Root cause** | `import { WorldState }` used instead of `import type { WorldState }` — WorldState is only used as a type annotation, not a runtime value |
| **Symptom** | Unnecessary runtime import of a type-only construct; minor bundle size impact |
| **Fix** | Changed to `import type { WorldState }` |
| **Test** | Type-check passes with 0 errors |
| **Test-first** | Type-check itself is the verification; no behavioral test needed |
| **Found during** | Phase 1A engine deep read |

### V3-003: `EngineEvent` value import in EventDetailDialog

| Field | Value |
|-------|-------|
| **File** | `src/components/EventDetailDialog.tsx:13` |
| **Severity** | Low |
| **Root cause** | `import { EngineEvent }` used instead of `import type { EngineEvent }` — EngineEvent is only used as a type annotation in props |
| **Symptom** | Unnecessary runtime import; violates import boundary conventions |
| **Fix** | Changed to `import type { EngineEvent }` |
| **Test** | Type-check passes with 0 errors |
| **Test-first** | Type-check verifies the change; no behavioral test needed |
| **Found during** | Phase 4C specific bug hunting (noted in plan line 310) |

---

## Architectural Issues Noted (Not Fixed)

### V3-A01: `logEngineEvent` side effect in `resolveImpacts`

| Field | Value |
|-------|-------|
| **File** | `src/engine/core/ImpactResolver.ts:397-410` |
| **Severity** | Medium |
| **Description** | `resolveImpacts` calls `logEngineEvent` as a side effect, violating the pure function contract documented in `applyImpact` (line 166: "Pure: no side effects") |
| **Root cause** | Intentional design trade-off — events are logged atomically with state changes to ensure event ordering matches state mutation order |
| **Recommendation** | Consider extracting event logging to a separate post-resolution step. The coordinator (SimulationRunner) could collect events from impacts and log them after `resolveImpacts` returns. |
| **Risk if fixed** | Event ordering could change if logging is deferred; requires careful migration |
| **Status** | APPROVED WITH NOTES — intentional trade-off, documented in code comment |

### V3-A02: EntityService hardcoded Map/POJO allowlist fragility

| Field | Value |
|-------|-------|
| **File** | `src/engine/core/EntityService.ts:88-97` |
| **Severity** | Medium |
| **Description** | `ensureNestedState` uses a hardcoded array of field names to determine if a root should be initialized as `Map` or POJO. If a new Map field is added to `WorldState` but not the allowlist, it will be silently initialized as POJO, causing runtime `.set()`/`.get()` errors. |
| **Root cause** | TypeScript types are erased at runtime; no metadata available to determine Map vs POJO automatically |
| **Recommendation** | Consider: (1) A WorldState schema/metadata file that maps field names to container types, (2) A type-level test that verifies all `Map<string, ...>` fields in WorldState are in the allowlist, or (3) Always initialize as Map and provide a POJO fallback path |
| **Current mitigation** | Scout branch added `historicalRikishi` to the allowlist (merged in this consolidation) |
| **Status** | APPROVED WITH NOTES — fragile but functional; recommend adding a compile-time test guard |

### V3-A03: `as unknown` / `as never` casts in engine core

| Field | Value |
|-------|-------|
| **Files** | `ImpactResolver.ts` (8 `as never`), `ImpactBuilder.ts` (2 `as unknown`), `BardEngine.ts` (2), `LegacyService.ts` (2), `MigrationService.ts` (1), `opfsArchive.ts` (1) |
| **Severity** | Low |
| **Description** | Type-unsafe casts concentrated in generic/builder code, particularly in `applyArrayAppends` where union types make it difficult to avoid `as never[]` for spread operations |
| **Root cause** | TypeScript union type limitations when dealing with generic array append operations |
| **Recommendation** | Consider refactoring `arrayAppends` to use a discriminated union with a type-safe dispatch function per field, eliminating the need for `as never` |
| **Status** | APPROVED WITH NOTES — architectural debt, not a bug; would require significant refactoring |

---

## V2 Bug Registry — Status Re-Verification

All bugs from `docs/audit/bug-registry-v2.md` were verified as still fixed. No regressions detected during this consolidation.

---

## Determinism Audit Results

| Check | Result | Notes |
|-------|--------|-------|
| `Math.random()` in engine | CLEAN | Only in comments, not in code |
| `Date.now()` in engine | CLEAN | No results |
| `new Date()` in engine | 4 matches, ALL SAFE | `calendar.ts` (deterministic date math), `MigrationService.ts` (save metadata), `Logger.ts` (log timestamps), `formatters.ts` (ISO parsing) |
| `setInterval`/`setTimeout` in engine | CLEAN | No results — no intervals/timeouts in engine code |
| `addEventListener` in UI | 5 matches, ALL CLEAN | All have proper cleanup via `removeEventListener` in effect return |

---

*End of Bug Registry v3*
