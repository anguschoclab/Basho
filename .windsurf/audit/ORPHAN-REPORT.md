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
- **`intentional` (175)** — reviewed and kept on purpose. Each has a written reason in
  `tests/unit/audit/unreferenced-exports.test.ts` (`INTENTIONAL_EXPORTS`).
- **`genuine` (80)** — confirmed dead code. Zero live callers. Kept deliberately under the
  repo's dead-code policy ("archive candidate, not deleted") so deletion stays a tracked,
  one-at-a-time decision — each has an `ORPH-####` ticket id.
- **`candidate`** — unclassified. The gate test fails if any exist; currently **zero**.

## What the numbers mean

| Detection kind | Count | Plain meaning |
|---|---|---|
| `unreferenced-export` | 245 | An `export` nothing outside its file (provably) imports |
| `unticked-service` | 10 | A service/module no tick phase or known consumer invokes |
| orphan routes / unused components / write-only state | 0 | Clean |

| Priority | Count | Plain meaning |
|---|---|---|
| P0 | 50 | Worth a look — large/live-adjacent surfaces |
| P1 | 36 | Moderate |
| P2 | 2 | Minor |
| P3 | 167 | Low — mostly internal helpers and constants |

## Why 175 "dead-looking" exports are intentional

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

## The 80 genuine orphans — where the dead code lives

Zero live callers, grouped by domain:

- **`npc/` (26)** — the biggest cluster. Mostly the unused NPC *sponsor-strategy personas*
  (`GamblerSponsorStrategy`, `ScientistSponsorStrategy`, `TyrantSponsorStrategy`…) — a
  designed-but-never-wired personality system — plus unused perception-band types and
  strategy-framework helpers.
- **`narrative/` (12)** — the `descriptorBands` family (`toAgeBand`, `toHeightBand`,
  `toMoraleDescriptor`…) — a label-formatting layer nothing renders through.
- **`history/` (8)** — the `historyIndex` query API (`buildHistoryIndex`, `getBashoSummary`,
  `getRikishiHistory`) and HoF query helpers — a read API superseded by the presenters.
- **`worker/` (7)** — `digestProjections` section builders superseded by the live digest path.
- **`economy/` (7)** — loan-lifecycle helpers (`LoanTerms`, `determineLoanTerms`,
  `createLoanObject`), `runSponsorChurn`, `tickMonthlyFacilities`, `tickStaffYear`.
- **`persistence/` (5)** — save-codec utilities (`saveReplacer`, `saveReviver`,
  `hasStorageProvider`, migration types).
- **`lifecycle/` (4)** — `CareerService`, `rookieFactory` barrels, cold-storage archiver.
- **`generation/` (4)** — the glasses quirk (`applyGlasses`/`hasPoorEyesight` — write-only
  quirk with no avatar or mechanic consumer), `getRandomOrigin`, `ResolveAvatarArgs`.
- **`core/` (2)**, **`keshoMawashi/` (2)**, **`legacy/` (2)** — query helpers, brand
  adjusters, lineage types.
- **`governance/` (1)** — `executeMyosekiLease` (peer-lease path nobody initiates).

**None of these run today.** Deleting them is safe-by-construction but deliberately gated —
each removal = delete the symbol + drop its tracker row + drop its `GENUINE_ORPHANS` entry.

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

*Last regenerated: baseline 255 entries (Nov 2026 re-run, commit `f77407a5`).*
