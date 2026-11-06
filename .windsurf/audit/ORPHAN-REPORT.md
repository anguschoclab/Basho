# Orphan Tracker — Plain-Talk Guide

**What this is.** A static-analysis sweep (`scripts/audit/audit-orphans.ts`) that lists every
export, service, route, component, and world-state field the wiring scan can't prove is used.
"Orphan" doesn't mean broken — it means *the scan found no live caller*. Each entry gets a
human verdict so the list stays honest instead of silently growing.

**Three files:**
- `baseline-orphans.json` — machine-readable; the unit-test gate reads this.
- `orphan-tracker.csv` — human-reviewable; one row per suspect.
- **`ORPHAN-CATALOG.md`** — the full per-entry catalog: every orphan with its docstring
  and keep/kill verdict, grouped by domain. Start here for implement-vs-delete decisions.

**The verdicts (Status column):**
- **`intentional` (176)** — reviewed and kept on purpose. Each has a written reason in
  `tests/unit/audit/unreferenced-exports.test.ts` (`INTENTIONAL_EXPORTS`).
- **`genuine` (0)** — the burn-down is complete: superseded duplicates were deleted,
  genuinely-unique capabilities were wired into live paths (see below).
- **`candidate`** — unclassified. The gate test fails if any exist; currently **zero**.

## What the numbers mean

| Detection kind | Count | Plain meaning |
|---|---|---|
| `unreferenced-export` | 168 | An `export` nothing outside its file (provably) imports |
| `unticked-service` | 8 | A service/module no tick phase or known consumer invokes |
| orphan routes / unused components / write-only state | 0 | Clean |

| Priority | Count | Plain meaning |
|---|---|---|
| P0 | 43 | Worth a look — large/live-adjacent surfaces |
| P1 | 23 | Moderate |
| P3 | 111 | Low — mostly internal helpers and constants |

## Why 176 "dead-looking" exports are intentional

Four recurring patterns account for nearly all of them:

1. **Exported for unit testing.** Internal helpers (`computePopulationTarget`, the
   `resolve*Band` resolvers, `TrainingMath` internals…) that are called *inside* their own
   file by a live function, and exported only so tests can pin them. Deleting the `export`
   keyword wouldn't reduce the count — the detector flags symbol names — so they're
   documented instead.
2. **Live via presenters/components.** The scan's wiring BFS covers engine→state→pages, not
   every consumer kind. `awards`, `ReplayMetadata`, `promotionBands`, `narrativeDescriptions`,
   `signatureKimarite` are all consumed through `src/presenters/` or components.
3. **Public API contracts.** Type exports (`KadobanStatus`, `ScoutTierDef`, idIntegrity types)
   that exist so other code can type-check against them, plus audit APIs the consistency
   tests pin (`isAtForeignLimit`, `validateWorldIdIntegrity`).
4. **Config tables/constants.** Genuinely-read data (`KOENKAI_DEMANDS`, `STAFF_POST_SLOTS`,
   `VENUE_PROFILES`, `RANK_RULES`) flagged because the read happens through a variable the
   scanner can't trace.

## The genuine-orphan burn-down — resolved, zero remaining

The 80-entry genuine backlog was triaged one-by-one and is now **empty**. Each entry was
either wired into a live path, deleted as a superseded duplicate, or reclassified
`intentional` after verification:

**Wired into live paths** (unique capability, previously unreachable):
- `applyGlasses` / `hasPoorEyesight` — the write path for the `quirks.glasses` flag the
  avatar generator already reads; now called from `assignQuirk`.
- `getRikishiHistory` — wired into `promotionProjections` (replaces manual index reads).
- `isInducted` / `getInducteesByCategory` — wired into `RetiredRikishiProfile` (HoF badge)
  and the almanac HoF surfaces.
- `adjustBrandForOyakata` — wired into `DynastyService.triggerSuccession` so a new
  oyakata shifts the stable's brand tradition.
- `getNPCHeyas` — wired into `phase01_week_npc_ai` (replaces a duplicated inline filter).

**Deleted as superseded duplicates** (canonical path confirmed before removal):
- `rookieFactory._generateRookie` — superseded by the candidate→materialize pipeline.
- `executeMyosekiLease` — superseded by canonical `leaseMyoseki` (fee calc + event log +
  tx record); its test was migrated.
- `buildAllPerceptionSnapshots` — duplicated the weekly phase's inline loop.
- `tickMonthlyFacilities`, `tickStaffYear`, private `applyMonthlyDecayOrMaintenance` /
  `npcFacilityInvestment` — superseded by `phase05/06` monthly-boundary logic.
- `descriptorBands` `to*` wrappers — pure delegation, zero callers; the live
  `toRikishiDescriptor` path is unchanged.
- `getRandomOrigin` — duplicate of `CandidateGenerator`'s deterministic origin pick.

**Reclassified `intentional` after verification:**
- NPC sponsor-strategy personas (`GamblerSponsorStrategy` et al.) — live via
  `ticks.ts → getSponsorStrategy(archetype)` dispatch; the scanner couldn't trace the
  archetype-keyed lookup.
- Loan helpers `determineLoanTerms`/`createLoanObject` — same-file-called by
  `issueBailoutLoanIfNeeded`.
- `historyIndex` query API (`getBashoSummary`, `listBashoSummaries`) — the index's public
  read surface; `indexBashoResult` writer is live.
- Worker-digest section builders — all called inside `buildWeeklyDigest` (same-file).
- `CareerService`, `KeshoMawashiGenerator` — deliberate compatibility facades pinned by
  dedicated tests.

53 verified-intentional exports now carry `// @keep-export <symbol>` markers in source so
the scan excludes them up front instead of re-flagging them every run.

## How to act on an entry

- **Keep it** → it should be `intentional` with a real verdict (no boilerplate — the gate
  rejects "retained for future wiring"-style reasons).
- **Delete it** → remove the symbol, then run `bun scripts/audit/audit-orphans.ts` to
  regenerate the baseline + CSV (the row drops out), then remove its map entry.
- **Wire it** → give it a real caller, regenerate, remove its map entry.

**Regenerate after any change:** `bun scripts/audit/audit-orphans.ts` — ORPH ids and statuses
persist across runs (matched on `file|symbol`); new detections arrive as `candidate` and fail
the gate until classified.

**The gate:** `tests/unit/audit/unreferenced-exports.test.ts` — enforces every row is
classified, every `genuine` cites its ORPH id, reasons aren't boilerplate, and no stale keys.

*Last regenerated: baseline 176 entries — burn-down complete, 0 genuine remaining.*
