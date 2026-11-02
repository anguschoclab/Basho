# v16 Consolidation — Review Working Notes

Base HEAD: `2bfc438f`. Convention: each finding gets severity · `file:line` · evidence. Findings are only recorded after personal re-confirmation of agent flags.

## Phase 0 baseline (measured 2026-11-02)

| Gate | Result |
|------|--------|
| `bun run type-check` | ❌ RED — 1 error: `overrideConsumer.test.ts(175,39) TS2339 reasons` |
| `bun run lint:strict` | 0 errors / 37 warnings (all react-refresh in `src/app/routes.tsx`, pre-existing) |
| `bun run build` | ✅ ~29s |
| `bun run test` (fast) | ✅ 1005 files / 9,302 pass / 1 skip |
| Orphan audit | 239 unreferenced exports + 9 unticked services (~+1 vs v15's 247) |
| Determinism greps | ✅ clean — `Math.random`/`Date.now` comment-only; `new Date` only in deterministic calendar math (`calendar.ts:250`), ISO parse (`formatters.ts:25`), save-metadata (`utils/Logger.ts:51`, `MigrationService.ts:55`) |
| `as any` / `as unknown` | 0 / ~15 (unchanged from v15; the two `as any` grep hits are comments) |

## Phase 1 — exhaustive read log

Batches tracked in `_v16-file-coverage.md`. Findings below.

### Findings

(pending — appended per batch)

### Batch ledger

(pending — agent id → file range → files read → findings refs)

## Direct-read findings (priority interleave — files changed since v15)

- **N1 (DEBT)** `src/engine/calendar/schedule.ts:230` — `scheduleJuryoWithCrossover` derives `day` from `basho.day ?? 1`, ignoring the caller's explicit `day` param (boutId stamp, needsScheduleForDay, seed all keyed to basho.day). Consistent during normal play (basho.day tracks the current day) but silently wrong if scheduling a future/catch-up day. Verify callers; unify on explicit param.
- **N2 (DEBT)** `package.json` — `three@0.186.1` vs `@types/three@0.178.1` version skew from the dependabot consolidation.
- **N3 (NOTE)** `bun run test` reports vitest v5.0.3 while package.json declares 5.0.5 — node_modules drift; `bun install` before final gates.
- **N4 (NOTE)** Dual week counters: `world.week` mirrors `world.calendar.currentWeek` (written via `phase00_preflight.ts:50` worldField). Consistent by construction; ~153 `world.week` vs ~30 `calendar.currentWeek` readers. Not a bug; consolidation candidate.
- **N5 (NOTE)** `schedule.ts:100` — `activeDivisionRoster` computed before the `needsScheduleForDay` early-return; wasted work on non-scheduling days only (cosmetic).
- **planOutcomes.ts `.pairs` read CONFIRMED CORRECT** — `RivalriesState` has both `pairs` (rikishi-level, required, aId/bId) and `heyaRivalryPairs?` (heya-level, heyaAId/heyaBId). Not the removed flat field.

## Phase 2 — per-item verdicts

| Item | Verdict | Evidence |
|------|---------|----------|
| PR #1171 mason | **DISPROVED-as-redundant** — correct fix, strict subset of #1173 | Deletes the same `reasons` line at overrideConsumer.test.ts:175 as #1173, without the contract doc |
| PR #1172 bolt | **APPROVED — land npcAIWorkers.ts hunk only** | Equivalence: `Array.sort` stable → desc `[0]` = first-max on ties; strict `>` loop = first-max. Its test-file hunk is the union-removed line → drop |
| PR #1173 scribe | **APPROVED — land doc + line removal** | `MatchPairing.reasons` at `MatchmakingPhases.ts:56`; stripped by projection at `schedule.ts:151-157`,`:272`. Doc wording literally true |
| bard-milestone-flavor-* | **DISPOSED — content on main, delete** | New narrative lines present in post_bout.json (2 hits)/pre_bout.json (4 hits) via `6e95455a` (#1157); tip = bookkeeping commit |
| bolt-fix-set-allocation-* | **DISPOSED — content on main, delete** | Manual `ozekiLeft` loop present at `planOutcomes.ts:225-232` via `a420161b` (#1169) |
| bolt-optimize-npc-deduplication-* | **DISPOSED — content on main, delete** | seenIds dedup loops present at `phase01_week_npc_ai.ts:284-291`,`359-366` via `3d67ca30` (#1154) |
| bolt-optimize-rival-heya-lookup-* | **DISPOSED — content on main, delete** | Single-pass max-heat loop present at `schedule.ts:340-351` via `2a07ef80` (#1158) |
| scout/fix-faction-pressure-id-* | **DISPOSED — obsolete, delete** | Tip commit `6bd74dfb` is empty ("Close PR as obsolete"); v15 disproved the fix — `startsWith` on main is superior |
| scribe-document-schedule-helpers-* | **DISPOSED — content on main, delete** | Contract docs + `day<1` guard present at `scheduleHelpers.ts:96-121` via `875c8cfc` (#1155) |
| polish/stable-not-found (local) | **DISPOSED — landed as `8665cec2`, delete** | EmptyState + 'Stable not found' at `StablePage.tsx:52-69`; `repairInfrastructure` preserved at :31,:80 |
| Comments review | **COMPLETE — all boilerplate** | 0 review comments / 0 non-empty reviews on #1171-#1173 and closed PRs #1153-#1158/#1169-#1170; only google-labs-jules auto-comments |

## Agent batch: tests/slow + perf + e2e (28/28 files) — verified findings

- **V16-F01 (BUG)** `tests/slow/audit/circularDependency.test.ts:18-27` — swallowed `execAsync` failure: if `npx madge` crashes/is unreachable, `stdout=""` → `circles=[]` → PASSES. Tool-failure-vacuous. VERIFIED by reading lines 10-30.
- **V16-F02 (BUG)** `tests/slow/audit/knipGuard.test.ts:13-37` — same class: knip non-zero exit on crash produces no `src/`-prefixed lines → PASSES silently. VERIFIED.
- **V16-F03 (BUG)** `tests/slow/audit/orphan-audit.test.ts` — never diffs a fresh audit against `.windsurf/audit/baseline-orphans.json`; drift gate only validates the committed baseline. New orphans pass everything until manual regen. VERIFIED (agent read whole file; baseline comparison absent).
- **V16-F04 (BUG)** `tests/slow/engine/banzuke/yokozunaPresence.test.ts:88-101` — 12-basho sim computes `bashoWithoutAnyYokozuna`/`bashoWithoutHealthyYokozuna`, console.logs a report, asserts only `totalCountByBasho.length === 12`. Zero yokozuna for 2 years passes. VERIFIED.
- **V16-F05 (BUG, latent Windows)** `tests/slow/audit/commandSurfaceCoverage.test.ts:42-48` — `findFiles` returns `join()`ed paths → backslashes on Windows → `rel.startsWith("engine/worker/")` + `rel === "engine/worker/types.ts"` never match; worker exclusion silently inert on Windows. Dormant today (unquoted handler keys). VERIFIED — we run ON Windows.
- **V16-F06 (BUG)** `tests/slow/audit/bundleBudget.test.ts:44-48` — missing chunk → early `return` → PASSES. Renamed/removed chunks never fail. VERIFIED.
- **V16-F07 (DEBT)** `tests/slow/engine/archival/simulationInvariants.test.ts:123-132` — "full records are archived" asserts only `expect(finalWorld).toBeDefined()`; docstring honestly admits thin scope + delegates to unit tests — title still oversells. Downgraded from BUG.
- **V16-F08 (DEBT)** `tests/slow/engine/banzuke/yokozunaPromotionAutoSim.test.ts:27-35` — title promises per-sekitori careerHistory each basho; asserts `historyLen >= 1` w/ fallback.
- **V16-F09 (DEBT)** `tests/perf/` — `tournamentSimulatorPerf` has zero timing; `yokozunaPromotionAutoSim.perf` title says 12 basho, config uses 18; `simulationDeterminism.perf` checksum covers ~6 scalars only.
- **V16-F10 (DEBT)** `tests/e2e/` — pervasive `waitForTimeout` fixed sleeps (helpers.ts ~15 sites), CSS-coupled selectors `.space-y-6 .grid .cursor-pointer`, headline assertions inside `if (onRecap)` conditionals (full-basho-lifecycle:196-218, year-of-bashos:405), autosave race wait (reload-restore:20), dead helper `waitForAutosaveWorld`, `readAutosaveWorld` reads wrong store (localStorage vs IDB).
- **V16-F11 (DEBT)** `tests/slow/audit/lintStrictGate.test.ts:49-59` — stale `eslint-disable` comments that suppress nothing pass undetected (`reportUnusedDisableDirectives` absent from eslint config).
- **V16-F12 (NOTE)** `tests/slow/audit/orphan-audit.test.ts` — injects `__audit_*` fixture dirs into real `src/engine/utils/`; a mid-suite crash leaves them in the source tree.
- **V16-F13 (NOTE)** `tests/slow/engine/simulation/autoSimCoreLoop.test.ts` — 600-basho cap is likely the suite's dominant cost; `daysSimulated === 64` magic constant.
- **V16-F14 (NOTE)** CLAUDE.md doc drift: says "16 slow" files; 17 exist (determinismDoubleRun/missionDeterminism newer). More drift expected in test counts (986/9,127 vs actual 1005/9,302).
- Good gates confirmed: determinismDoubleRun + engineReviewerGate propagate exit codes; year-of-bashos genuinely thorough.
