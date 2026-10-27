# Dead-Code Audit — Reorg Phase 0 (2026-10-27)

> **STALENESS NOTICE:** This audit's grep/regex findings are a point-in-time
> snapshot superseded by the reorg's own move history; the file is retained
> for historical/audit context.

Audit methodology per the reorg plan's safety protocols: every candidate was
checked for (a) zero production importers (all specifier depths, incl. `../../`
deep relatives), (b) `git log --follow` history, (c) unique logic not found
elsewhere. Sources: `npx knip --no-gitignore`, `.windsurf/audit/baseline-orphans.json`,
symbol-level grep across `src/`, `scripts/`, `e2e/`.

## Findings

### No dead modules at file level

- **knip `src/` unused-files output:** only 5 entries, all benign:
  `src/components/game/boutReplay/boutCanvas/index.ts`,
  `src/components/ui/sidebar/index.ts`, `src/engine/almanac/index.ts`,
  `src/engine/bout/kimarite/index.ts` (index.ts barrels — knipGuard-exempt),
  `src/tests/unit/utils/testFixtures.ts` + `src/components/ui/Sparkline.tsx`
  (already in knipGuard `knownBarrelReExports`).
- **`.windsurf/audit/baseline-orphans.json`:** 107 entries, ALL `unreferenced-export`
  type across 61 files — every file is imported; the orphaned symbols are
  intentional public-API/utility exports already classified in
  `tests/unit/audit/unreferenced-exports.test.ts`. Zero dead files.
- **All 54 loose `src/engine/` root files are live** — importer counts confirmed
  with multi-depth specifier matching (see `reorg-move-map.md`). Both initially
  suspected files verified live: `overflow.ts` (`phase01_week_npc_ai.ts:27` +
  `tests/unit/engine/overflow.test.ts`), `npcAI.ts` barrel (`phase01_week_npc_ai.ts:26`,
  `phase05_monthly_boundary.ts:29`, ~6 test files).

### `_archive/` disposition

`src/engine/_archive/` is created **on demand only** — the audit yields no
modules to archive at Phase 0. The contract test
(`tests/unit/meta/repoStructure.test.ts`) asserts the manifest gate
*conditionally*: if `_archive/` exists, `README.md` must document every
archived file and no live file may import it. Any dead module discovered
mid-implementation gets: `git mv` → `_archive/<domain>/` → import rewrite
(stays compiling) → manifest row here AND in `_archive/README.md`.

### Deleted-not-archived (pure barrels, no unique logic)

| File | Disposition |
|---|---|
| `src/engine/lifecycle.ts` | DELETE — pure re-export barrel of `lifecycle/*` |
| `src/engine/shikona.ts` | DELETE — pure re-export barrel of `shikona/*` |
| `src/engine/almanac.ts` | DELETE — pure re-export barrel of `almanac/*` |
| `src/engine/kimarite.ts` | DELETE — pure re-export barrel of `kimarite{Registry,Strategies}` |
| `src/engine/npcAI.ts` | DELETE — 7-line barrel of `npcAI/*` (live but non-unique) |
| `src/engine/rivalries.ts` | DELETE — delegation barrel; 2 live helpers folded to `narrative/rivalry/state.ts` |
| `src/engine/banzuke.ts` | DISSOLVE — real fns (`compareBanzuke`, `updateBanzuke`, `computeVariableSanyakuCounts`) → `banzuke/`; re-exports dropped |
| `src/engine/EventBus.ts` | RELOCATE — composed facade → `events/EventBus.ts` |

## Pre-existing gate defect (documented, out of scope)

`slow/audit/circularDependency.test.ts` filters madge output for `→`/`Circular`
but madge prints `>`/`circular` — the gate passes vacuously while **122 real
circular dependencies exist at baseline** (mostly through loose root files
`world.ts`/`almanac.ts`/`banzuke.ts`/`queries.ts`/`selectors.ts`). The reorg
must not increase this count. Phase 6 may harden the gate to a `≤122` ratchet;
making it assert zero is out of scope (would require breaking real cycles).

## Audit-trap note

`systems/legacy/` (Bloodline/Dynasty/Legacy/TrainingPhilosophy/tenure) is LIVE
despite the name — imported by `loans.ts`, `mergers.ts`, `lifecycle/*`,
`tick/phases/*`, `worker/commands/meta.ts`, `presenters/engineAccess.ts` and
~12 tests. It moves to `engine/legacy/` intact. Do not delete-by-name.
