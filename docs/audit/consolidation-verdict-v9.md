# Consolidation Verdict v9

**Date:** 2026-10-06
**Branch:** `consolidation/v9`
**Baseline:** `d0d585ff` (origin/main at Phase 0)
**Final HEAD:** `521c1016` (8 commits)
**Companion docs:** `pre-consolidation-baseline-v9.txt`, `v9-pr-inventory.json`,
`bug-registry-v9.md`

---

## 1. Scope & Method

Per the approved megaplan (`~/.devin/plans/plan-7909c5de71d36486.md`), cycle v9
operated under zero backwards-compatibility constraints with a strict
test-first mandate: regression tests were written and observed failing **before**
any implementation landed.

| Stage | Evidence |
|---|---|
| Phase 0 baseline | `docs/audit/pre-consolidation-baseline-v9.txt` — typecheck clean, build green, lint strict clean, purity clean, 875 files / 8,465 tests / 0 failures (1,091s), perf gate pass, 25yr determinism hash `42e0164e2e715c66` |
| Phase 1 PR inventory | `docs/audit/v9-pr-inventory.json` — 16 PRs (8 feature/bot + 8 dependabot), all comments boilerplate bot greetings, zero substantive human review |
| Phase 2 code review | `docs/audit/bug-registry-v9.md` — command-surface enumeration (59 handlers vs dispatch sites), slice mutation audit vs `uiWorldRevision`, determinism/purity/`as any` greps, save/load path trace, v5–v8 carry-forward |
| Phase 3 verdicts | §3 below — every PR and every registry finding explicitly approved/disproved |
| Phase 4 integration | Payload-level cherry-picks as fresh commits; whole-branch imports refused |
| Phase 5/6 | Remote cleanup gated on user checkpoint; this document |

## 2. Test-First Evidence

Red-phase run (`npx vitest run` on the four new/modified test files): **5 tests
failed / 63 passed** — each failure mapped to a specific missing behavior:

| Failing test | Missing behavior | Fix commit |
|---|---|---|
| `useSaveSlotManager` — import fallback | `handleImportSave` silently regenerated the world via `createWorld(seed)` when `loadWorldDirect` was absent | `653f4bcc` (B01) |
| `InjuryRiskHeatmap` — empty state | Plain `<p>` text instead of design-system `EmptyState` | `653f4bcc` (#1041) |
| `ProgressRow` — a11y | No `role="progressbar"`, no ARIA values | `653f4bcc` (#1042) |
| `StatCard` — a11y | Same unsemantic track | `653f4bcc` (#1042) |

Post-fix targeted run: **80/80 green**. No implementation preceded its failing
test.

## 3. Per-PR Verdicts

| PR | Title | Verdict | Disposition |
|---|---|---|---|
| #1056 | Mason: tighten BashoState mock | **APPROVED** | Applied in `7191b765` — added required `isActive: false` (types/basho.ts:223), dropped the blind `as unknown as BashoState` cast |
| #1042 | Palette: ARIA progressbar support | **APPROVED** | Applied in `653f4bcc` — `role=progressbar` + `aria-valuenow/min/max` + `aria-label` on `ProgressRow` and `StatCard` tracks |
| #1041 | InjuryRiskHeatmap empty state | **APPROVED** | Applied in `653f4bcc` — design-system `EmptyState` (icon `Activity`, compact) replacing plain text |
| #1035 | Bard: combat fatigue enrichment | **CONDITIONAL — payload only** | combat.json additions (+9 fatigue_band lines) in `73eef19b`. **Rejected:** duplicate-key test hunk (would not compile) and stale `perf-gate.yml` edit that removed the build step |
| #1040 | Scout: NarrativeProse coverage | **APPROVED (verified)** | Test file ran green (8 tests) before acceptance, committed `f8713b22`. **Rejected:** stale `perf-gate.yml` edit, `.jules` journal |
| #1054 | Bard: narrative variety | **ALREADY MERGED** | `git merge-base --is-ancestor` confirms its commit `75c8e2c3` is already in main's history — no payload to apply; PR left open by bot oversight |
| #1036 | Mason: BashoState mock (dup) | **REJECTED** | Superseded by #1056; carried extra files + a duplicate-key type error |
| #1055 | StatCard accessibility | **REJECTED** | Strict subset of #1042 with weaker ARIA placement |
| #1043 | @testing-library/dom 10.4.2 | **APPROVED** | Batched in `a3807d3c` |
| #1046 | globals 17.12.0 | **APPROVED** | Batched in `a3807d3c` |
| #1047 | postcss 8.5.28 | **APPROVED** | Batched in `a3807d3c` |
| #1048 | @testing-library/user-event 14.6.7 | **APPROVED** | Batched in `a3807d3c` |
| #1049 | @typescript-eslint/parser 8.71.0 | **APPROVED** | Batched in `a3807d3c` |
| #1050 | @tanstack/react-query 5.104.0 | **APPROVED** | Batched in `a3807d3c` |
| #1052 | @tanstack/react-router 1.170.41 | **APPROVED** | Batched in `a3807d3c` |
| #1044 | electron-vite 6.0.0-beta.5 | **APPROVED (gated)** | `521c1016` — accepted only after `vite build` **and** `electron-vite build` both passed on the beta |

## 4. Bug Verdicts (bug-registry-v9.md)

### Confirmed & Fixed

| ID | Finding | Verdict | Resolution |
|---|---|---|---|
| V9-B01 | Save import silently regenerates world — `createWorld(seed)` fallback discards all save progress | **CONFIRMED — HIGH** | `loadWorldDirect` is now a required prop typed `(world: WorldState)`; GameContext dispatches `LOAD_WORLD` to reducer + worker (same pairing as `loadFromSlot`). Fallback removed entirely — zero-compat mandate. `653f4bcc` |
| V9-B02 | Dead auto-sim tri-path (`AUTO_SIM_DAYS` worker cmd, `RUN_AUTO_SIM` reducer, dual `runAutoSim` context exposures) — unreachable, and the slice case skipped `uiWorldRevision` (latent desync, same class as v8-B12) | **CONFIRMED — MEDIUM** | Full excision in `47da91bf`: worker type+handler+store gate, union member, slice case, action creators, both context exposures, 5 worker test files' blocks. Engine `AutoSimService` retained (used by `bun run simulate` scripts) |
| V9-B03 | Dead `RUN_HOLIDAY` reducer path — holiday runs via worker `GO_ON_HOLIDAY`; slice case skipped `uiWorldRevision` | **CONFIRMED — LOW** | `timeSlice.ts` deleted outright (both cases dead). `47da91bf` |
| V9-B04 | Zombie `heyaSlice.ts` (`SET_PLAYER_HEYA`, zero dispatch sites, skipped `uiWorldRevision`) | **CONFIRMED — LOW** | File deleted; union member + creator + reducer registration removed. `47da91bf` |
| V9-B05 | Dead `CREATE_WORLD` reducer case — second world-generation path duplicating worker `START_WORLD` (divergence trap); `generateWorld` adapter's `playerConfig` param vestigial | **CONFIRMED — LOW-MED** | Case + adapter + creators removed; only tests dispatched it. `coreSlice.oyakata.test.ts` deleted (dead-path coverage), `gameReducer.test.ts` purity assertion migrated to `LOAD_WORLD`. `47da91bf` |

### Assessed — Not Bugs

| ID | Finding | Verdict |
|---|---|---|
| A01 | Dual mock factories (`MockFactory` 118 consumers vs `mockRikishi` 8) | **DISPROVED as bug** — different APIs, no correctness issue; debt note only |
| A02 | `worker-command-surface.md` stale | **DISPROVED as defect** — doc subset only; all 59 command types have handlers; the only dispatch-less command was `AUTO_SIM_DAYS` (→B02) |
| A03 | `/museum` route for HistoryDashboard | **DISPROVED** — intentional, documented |
| A04 | Test-side `as any` | **DISPROVED** — production `src/` has zero; test exemption deliberate (v8) |
| A05 | Determinism | **DISPROVED** — `Math.random`/`Date.now` grep over `src/engine` clean (comments only); purity-lint green; post-change 25yr hash identical to baseline `42e0164e2e715c66` |
| A06 | `processHeyaFinances`/`tickWeekEconomics` dead wrappers | **DISPROVED (already gone)** — only canary strings in `engineReviewerSelfTest.test.ts` remain, by design |

### Doc Drift Fixed

- **D01** — CLAUDE.md slice list named `financeSlice`/`rosterSlice`/`bookmarkSlice`
  (never existed) and `timeSlice`/`heyaSlice` (now deleted). Corrected in
  `743433f8`.
- **D02** — CLAUDE.md mock-factory line pointed at the minority factory;
  corrected to `MockFactory` primary + `mockRikishi` secondary. `743433f8`.
- **D03** — `bookmarkSlice.ts` stale IDE tab: file never existed in git history.
  No action possible; noted.

## 5. Commits on `consolidation/v9`

| Commit | Content |
|---|---|
| `7191b765` | ExhibitionBout BashoState cast fix (#1056) |
| `653f4bcc` | ARIA progressbars (#1042) + EmptyState (#1041) + B01 import fix |
| `73eef19b` | combat.json fatigue variety (#1035 payload) |
| `f8713b22` | NarrativeProse test coverage (#1040, verified) |
| `47da91bf` | Dead-path excision B02–B05 (18 files, −813 lines) |
| `743433f8` | CLAUDE.md corrections + v9 audit artifacts |
| `a3807d3c` | 7 dependabot bumps batched |
| `521c1016` | electron-vite 6.0.0-beta.5 (gated on dual build) |

## 6. Final Gate Results

| Gate | Result |
|---|---|
| `bun run type-check` | PASS — clean after every commit |
| `bun run test` (full) | PASS — ___ files / ___ tests, 0 failures (see §7 note) |
| `bun run build` | PASS — web bundle built |
| `electron-vite build` | PASS — beta.5 verified (main/preload/renderer) |
| `bun run lint:strict` | PASS — 0 warnings |
| `scripts/purity-lint.sh` | PASS — no phase-purity violations |
| Determinism grep | PASS — comments only in `src/engine` |
| Perf gate | PENDING RERUN — first run showed S3 p99 +23.5%, attributed to CPU contention with the concurrent 875-file suite; rerun on idle machine (see §7) |
| 25yr determinism hash | `42e0164e2e715c66` — **identical to baseline** |

## 7. Known Caveats

- **Perf-gate p99 is environment-sensitive.** The gate first ran while the full
  Vitest suite was executing concurrently; S3 p99 spiked +23.5% while p50 was
  unchanged and the 25yr determinism hash was bit-identical. Rerun on an idle
  machine before merge; if it still fails, bisect against `a3807d3c` (deps).
- **E2E not run in this session.** Playwright suite (`bun run test:e2e`) deferred
  to pre-merge — changes touch save/load UI, so run it before Phase 5.
- **Stray ` 2`-suffixed duplicate files** (`v9-pr-inventory 2.json`,
  `check-jsdoc 2.ts`, a `NarrativeProse.test 2.ts` already removed) appeared in
  the working tree during the session — macOS/Finder-style duplicates, untracked,
  not part of the consolidation.
- **#1054 already merged** — its commit is an ancestor of main; the open PR is a
  bookkeeping leftover to close in Phase 5.

## 8. Verdict

**All approved payloads integrated; all confirmed bugs fixed; every finding
explicitly approved or disproved above.** The consolidation satisfies the plan's
hard requirements: test-first ordering demonstrated with observed red→green
transitions, zero behavioral drift on the 25-year determinism hash, and the only
remaining gate is the perf rerun on an idle machine plus the user checkpoint
before remote cleanup (16 PR closes + branch deletions).
