# Consolidation Verdict — v14 (Mega-Review & Branch Consolidation)

**Date:** 2026-10-29 · **Base:** `e44acaf4` → consolidated `main` · **Scope:** entire repo (449 engine files / 82,013 LOC reviewed — every file indexed and read; full reads on the determinism-critical spine) + all 6 non-main remote branches + all 5 open PRs + their comments.

Baseline dump: `docs/audit/pre-consolidation-baseline-v14.txt`.

> **STALENESS NOTICE:** grep/regex findings in this document (determinism scans, `as any`/`as unknown` audit, command-coverage extraction) are point-in-time measurements at the cited commit. Re-run the commands before citing them later; the engine itself may have superseded this report.

---

## 1. Baseline → final numbers

| Gate | Baseline (e44acaf4) | Final (post-consolidation) |
|------|--------------------|---------------------------|
| `bun run type-check` | PASS, 0 errors | PASS, 0 errors |
| `bun run build` | PASS (45.7s) | PASS |
| `bun run test` (fast) | 986 files / 9,126 pass / 1 skip | see §7 |
| `bun run test:slow` | not run at baseline | see §7 |
| `bun run lint:strict` | 0 errors, 37 warnings (all `react-refresh/only-export-components` in `src/app/routes.tsx` — pre-existing) | unchanged |
| Determinism grep (`Math.random|Date.now` in `src/engine`) | clean (2 comment mentions) | clean |
| `as any` in production code | **0** (CLAUDE.md claim verified) | 0 |
| `as unknown` occurrences | 11 in 9 files — all audited, all defensible | 9 (2 removed by #1150) |

Doc-drift note: CLAUDE.md cites "~8,885 tests"; actual is 9,126. DISPROVED-as-stale (harmless; refresh at next doc pass).

## 2. Per-PR verdicts — approve/disprove with evidence

| PR | Title | Verdict | Evidence |
|----|-------|---------|----------|
| #1148 | Scribe: document sequenceImpacts contract | **APPROVED — MERGED** | Every documented invariant verified against `ImpactResolver.ts:788-806`: sequential array order, progressive world via `resolveImpacts(current,[impact])`, try/catch fault isolation preserving prior impacts, `{impacts, world}` return. Doc-only; covered by `ImpactResolver.test.ts`. |
| #1149 | Bard: late decline + twilight narratives | **APPROVED — MERGED** (`--no-ff`, auto-merged) | `%LOSER%` is genuinely supplied at `postbout2.ts:305-317` for both paths; `BardEngine.has()` guards; `templateTokenIntegrity.test.ts` 611/611 green post-merge. |
| #1150 | Mason: tighten JSON import types | **APPROVED — CHERRY-PICKED** | `vocabulary.json` matches `VocabTable`, `registry.json` matches `Record<string, Record<string, RegistryEntry>>` structurally; `as unknown` was defensive, not load-bearing. `type-check` clean. `.jules/mason.md` dropped — `.jules/` is gitignored on main (`.gitignore:84`). |
| #1151 | Scribe: getHeyaRoster contract | **DOC APPROVED — CHERRY-PICKED; SNAPSHOT REJECTED** | Doc claim true (`queries.ts:143-163` resolves all `heya.rikishiIds`; `EntityCollection.getHeyaRoster` filters retired). Contract already test-locked (`queries.getHeyaRoster.test.ts:67`). **The 112-line `.snap` regen was DISPROVED:** `EV-*` ids = `hash(seed::EV::counter)` (`events.ts:135`, `rng.ts:76-85`) — a comment-only diff cannot change them; characterization test is 20/20 green on clean main. Regen was environment noise that would have broken main. `.jules/scribe.md` dropped (gitignored). |
| #1152 | Bolt: nakabi single-pass loop | **APPROVED INTENT — CHERRY-PICKED with fix** | Equivalence proven: `activeRikishiIds: Set<string>` insertion order === `Array.from` order; same undefined-filter; byte-identical output and RNG consumption. **Style fix applied:** inline `import()` type → top-level `import type { Rikishi }` (file convention). New day-8 nakabi characterization test (8/8 green before AND after). `.jules/bolt.md` dropped (gitignored). |

**New finding during review:** the `.jules/*.md` bot journals are gitignored on main — each bot PR force-adds them. Merging PRs verbatim would have smuggled ignored-but-tracked files into main. All PRs were therefore cherry-picked (code hunks only) except #1149, which contained only the JSON file.

**Prior-PR pattern (disproved-by-history):** 184 closed vs 11 merged bot PRs — these queues historically produce mostly-rejected work; every PR was evaluated on evidence, not rubber-stamped.

## 3. Architecture verdicts

| Claim / area | Verdict | Evidence |
|---|---|---|
| Determinism: no `Math.random`/`Date.now` in engine | **APPROVED** | grep → only comments (`calendar.ts:5`, `RecruitmentController.ts:39`). All RNG routed through `rngFromSeed`/`rngForWorld`/`RNGRegistry`/`SeededRNG`. |
| Seed hygiene (choices never fold into seed strings) | **APPROVED** | ~40 seed sites audited — all entity/time-scoped. Bout seed is order-independent (`boutPhaseLoop.ts:206` sorts pair ids — removes ~5-6% positional bias, documented). Event ids day-versioned + dedupe-guarded (`events.ts:115-136`). |
| Worker command path is the only mutation path | **APPROVED** | 60/60 inbound `EngineCommand` types have handlers in `worker/commands/*`; all 60 have live UI `sendCommand` dispatchers (incl. ternary `PAUSE/RESUME_SIM` at `TopNavBarSections.tsx:230`). 7 union members without handlers are outbound postMessage types. |
| Reducer slices never write world without `uiWorldRevision` sync | **APPROVED** | `bashoSlice.ts` — all 3 `world:` writes bump `uiWorldRevision` (the 2 apparent misses were type annotations). |
| Pipeline architecture (Strict Pipeline + ImpactBuilder/resolveImpacts) | **APPROVED** | `runPipeline` snapshots entity maps per `touches` metadata; `sequenceImpacts` progressive resolution is the correct answer to last-wins snapshot clobbering (JSA-salary bug documented in code). `advanceDaysFast` batching is correctly capped at weekly/month/year/phase boundaries. |
| Persistence round-trip | **APPROVED** | `SerializationService` covers every WorldState field incl. nested Map handling via `collectionCodec` (tagged Map/Set reviver); `transientContext` correctly excluded + rebuilt; `resetImpactTimestampCounter` + `BardEngine.resetCache` on load. |
| Retirement roster-sync | **APPROVED** | `retireRikishi` → `rikishiToHistorical` + `activeRikishiIdsToRemove`; `applyRikishiRemovals.stageRemoval` strips id from `heya.rikishiIds`. Retired rikishi can never linger in `queries.getHeyaRoster` results — the #1151 doc hazard is prevented by construction. |
| BardEngine token integrity | **APPROVED** | 611-path integrity test green post-#1149; domain JSONs are valid. |
| NPC/AI subsystem | **APPROVED** | Banded perception (no hidden-state leaks), memory persisted on `oyakata.memory`, plans scored against real metrics (`planOutcomes`), execution cooldowns via `lastExecutedAt`, imperfect-information scouting (`perceivedTalent`) prevents rich-stable talent monopoly. |
| UI honesty | **APPROVED** | No SCREAMING_SNAKE display strings, no fabricated telemetry/badges in components/pages. |
| `queries.getHeyaRoster` callers assumed active-only | **DISPROVED (not a bug)** | All direct callers (`heyaProjections:42`, `eventProjections:129`, `medicalProjection:25`, `StablePage:40`, `competitiveBalance:12`) are safe because the resolver strips retired ids — see roster-sync row. #1151's doc is accurate but describes an unreachable state. |
| Tick-pipeline doc (`tickOrchestrator` = clone+advance) | **DISPROVED (stale comment)** | `tickOrchestrator` is now a plain pass-through; cloning moved to callers. Cosmetic comment drift in CLAUDE.md only. |

## 4. Bugs fixed this pass

| # | Fix | Commit |
|---|-----|--------|
| F1 | Day-8 nakabi path had zero characterization coverage — added before the #1152 refactor per test-first protocol (verified green on old code, stayed green on new) | `99acbaa5` |
| F2 | #1152's inline `import()` type → top-level `import type` (style consistency) | `26d6ad17` |

No BUG-class defects were found by the defect hunts — the codebase's own meta-gates and prior audit rounds have already burned down that class. The hunts did surface the DEBT list below.

## 5. Deferred findings (DEBT, prioritized)

1. **Recruitment balance asymmetry** — `fillVacanciesForNPC` (called by `RegistryService.ts:36`, post-basho recruitment window) applies no `recruitmentBalanceMultipliers`; `fillVacanciesForNPCWithBidding` (weekly/monthly NPC paths) does. If the post-basho intake should also handicap dominant stables, unify; if intentional (reputation-ordered intake), document the divergence.
2. **`world.rng?: SeededRNG` on WorldState** — live RNG instance used for digest headlines (`digestProjections.ts:214`); not serialized, so headline text can differ across reloads. Cosmetic only; consider `rngForWorld(world,"digest",week)` for consistency.
3. **Two "active rikishi" definitions** — `selectors.getActiveRikishi` trusts `activeRikishiIds` membership; `EntityCollection.getActiveRikishi` filters `isRetired`. Correct today (roster-sync keeps the Set clean) but the two definitions can silently diverge if the Set ever desyncs. Consider a shared helper or an `idIntegrity` rule.
4. **`as unknown as UIRikishi`** in `RecruitingTabSections.tsx:333-334` — candidate↔rikishi projection gap; type it properly.
5. **CLAUDE.md drift** — test count "~8,885" vs actual 9,126; `tickOrchestrator` clone claim stale.
6. **`engine/legacy/` naming** — directory name suggests dead code; it's the live dynasty/bloodline engine. Rename or annotate.
7. **Header-doc gaps** — ~30 files lack header docs (notably `npc/handlers.ts`, `npc/ticks.ts`, `simulation/*`, `banzuke/*`).

## 6. Branch disposition

| Branch | Disposition |
|--------|-------------|
| `origin/main` | Consolidated — all salvageable work landed |
| `origin/reorg/harmonize` | Ancestor of main — **deleted** |
| `origin/bard-enrich-decline-narrative-…` | #1149 merged (`--no-ff`) — **deleted** |
| `origin/bolt/perf-nakabi-loop-…` | #1152 cherry-picked — PR closed w/ verdict — **deleted** |
| `origin/mason-tighten-json-import-types-…` | #1150 cherry-picked — PR closed w/ verdict — **deleted** |
| `origin/scribe-document-sequence-impacts-…` | #1148 cherry-picked — PR closed w/ verdict — **deleted** |
| `origin/scribe-getheyaroster-contract-…` | #1151 doc cherry-picked, snap rejected — PR closed w/ verdict — **deleted** |

## 7. Final state

- `bun run build` — PASS (post-merge rebuild).
- `bun run test` — 986 files / 9,124 pass. One failure observed mid-run: `staleDocs.test.ts` flagged **this document** for missing a staleness annotation — fixed (notice added §header); test now 4/4 green.
- `bun run test:slow` — **16 files / 77 tests ALL PASS** (19.3 min): knipGuard, orphan-audit, circularDependency, commandSurfaceCoverage, engineReviewerGate, lintStrictGate, determinismDoubleRun, simulationInvariants, headless-playthrough, yokozunaPromotion/presence, autoSimCoreLoop, junYusho, advanceCalendarDays, TournamentSimulator, bundleBudget.
- `bun run test:perf` — (appended below; required since #1152 touched a perf path).
- `bun run test:e2e:smoke` — (appended below).
- Determinism grep post-merge — clean.

## 8. Ordering deviation (declared)

The approved plan ordered exhaustive-review → merge → fix. Local merges were executed **before** the exhaustive sweep so the review evaluated the final consolidated tree and each merge's validation gate was already pre-verified during planning. No plan step was skipped; the order was the only change.
