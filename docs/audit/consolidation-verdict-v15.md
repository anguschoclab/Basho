# Consolidation Verdict — v15 (Mega-Review & Branch Consolidation)

**Date:** 2026-11-01 · **Base:** `7dafc74c` → consolidated `main` · **Scope:** 1,087 src files / ~160K LOC indexed; full reads on the determinism-critical spine (core, tick, bout, npc, worker, persistence, calendar, state slices) + all 18 remote branches + 16 open PRs + their comments and CI logs.

Baseline dump: `docs/audit/pre-consolidation-baseline-v15.txt`. Registry: `docs/audit/bug-registry-v15.md`. Working notes: `docs/audit/_v15-review-notes.md`.

> **STALENESS NOTICE:** grep/regex findings in this document (determinism scans, cast census, orphan counts) are point-in-time measurements at the cited commits. Re-run the commands before citing them later.

---

## 1. Baseline → final numbers

| Gate | Baseline (7dafc74c) | Final (post-consolidation) |
|------|--------------------|---------------------------|
| `bun run type-check` | PASS, 0 errors | PASS, 0 errors |
| `bun run build` | PASS (7.2s) | PASS |
| `bun run test` (fast) | 1003 files / 9,293 pass / 1 skip | see §7 |
| `bun run lint:strict` | 0 errors, 37 warnings (react-refresh in routes.tsx, pre-existing) | unchanged 37 |
| Determinism grep (`Math.random\|Date.now` in `src/engine`) | clean (2 wall-clock save-metadata sites: Logger.ts:51, MigrationService.ts:55) | clean |
| `as any` / `as unknown` | 0 / 15 | 0 / 15 |
| Orphan audit | 234 baseline (226 exports + 8 unticked) | 250 → reconciled to 247 (2 dead exports removed) |

## 2. Per-PR verdicts — approve/disprove with evidence

| PR | Title | Verdict | Evidence |
|----|-------|---------|----------|
| #1156 | Polish: Stable not found | **APPROVED — CHERRY-PICKED** (`8665cec`) | Dead-code claim verified: `StablePage.tsx:50` `!heya` guard returned before the EmptyState branch. New render test authored red-first, green post-merge. `repairInfrastructure` (added on main after branch's merge-base) preserved — verified at lines 31,80. |
| #1157 | Bard: milestone narratives | **APPROVED — CHERRY-PICKED** (`6e95455a`) | Tokens `%MILESTONE%`/`%SHIKONA%`/`%EAST%`/`%WEST%` supplied via BardEngine context fill (`BardEngine.ts:220-245`); `templateTokenIntegrity` gate green. |
| #1170 | Scout: arrayAppends guard test | **APPROVED — CHERRY-PICKED** (`34285481`) — risk framing **DISPROVED** | `arrayAppends` was a real missing field in `isStateImpact` (`StateImpact.ts:311`). BUT the claimed "dropped impacts" risk is disproved: `isStateImpact` has zero production callers — pipeline detects impacts via `"metadata" in result` (`pipelineRunner.ts:133`). Merged as guard-completeness fix; test authored red-first. |
| #1169 | Bolt: Set allocation | **APPROVED — CHERRY-PICKED** (`a420161b`) | `[...ids].some()` → `for…of` at `planOutcomes.ts:225` — semantics identical; `kadoban_survival` coverage added test-first. |
| #1158 | Bolt: rival heya lookup | **APPROVED — CHERRY-PICKED** (`2a07ef80`) | Equivalence proven: `.sort((a,b)=>b.heat-a.heat)` is stable → first-max wins ties; loop uses strict `>` → also first-max. Schedule snapshot characterization pinned. |
| #1154 | Bolt: NPC dedup loop | **APPROVED — CHERRY-PICKED** (`3d67ca30`) | Seen-set loop ≡ `[...new Set()]` (first-occurrence, insertion order) at `phase01_week_npc_ai.ts:283,355`. Dedup characterization test authored first. Bonus fix: hoisted inline `import()` types. leagueIntel + timings hunks dropped (superseded/artifacts). |
| #1155 | Scribe: scheduleHelpers docs | **APPROVED — CHERRY-PICKED docs + HARDENED** (`875c8cfc`) | Doc claims verified vs `scheduleHelpers.ts:99-110` — except `day<1` was unenforced for upper divisions; added `day < 1 → false` guard + test (red-first). leagueIntel + timings hunks dropped. |
| #1153 | Scout: faction-pressure ID | **DISPROVED — CLOSED, nothing landed** | Fix identical to #1154's `===` variant and inferior to main's existing `startsWith` (landed via `61929cf4`). Commits a 24K-line `test-timings-fast.xml` artifact. Its CI failure was a stale `test-timings.json` baseline vs `tokenLeakHeuristic.test.ts` (meta-gate), not a real test failure. |
| #1160–#1168 | 10× Dependabot | **APPROVED — CONSOLIDATED** (`c2df5189`) | electron 45.1.0, electron-store 12.0.0 (Electron ≥35 satisfied), electron-vite 6.0.0, lucide-react 1.64.0, router 1.170.46, three 0.186.1, eslint-parser 8.72.1, vite 8.3.5, vitest 5.0.5. `bun install` + type-check + build green. (types/node #1161 merged separately by maintainer.) |

## 3. Architecture verdicts

| Claim / area | Verdict | Evidence |
|---|---|---|
| Determinism: no `Math.random`/`Date.now` in engine | **APPROVED** | grep clean; `new Date` only in deterministic calendar math + Logger/Migration save-metadata (non-sim). |
| uiWorldRevision sync | **APPROVED** | All slice world-writes bump (`bashoSlice.ts:36-169`); `UPDATE_WORLD` correctly skips (worker→UI echo protection). |
| Persistence round-trip | **APPROVED** | `saveLoadIntegrity` 13/13 green; 84-field WorldState coverage incl. NON_PERSISTED exclusions. |
| `needsScheduleForDay` contract | **APPROVED post-fix** | Now enforces full [1,15] domain (day<1 added). |
| Impact pipeline detection | **DEBT (new finding)** | `pipelineRunner.ts:133` detects impacts via `"metadata" in result` — a hand-built metadata-less impact would be treated as WorldState and clobber it. Latent: `ImpactBuilder` always sets metadata. |
| Orphan baseline health | **APPROVED after reconciliation** | 16 new candidates since v14: koenkaiDemands + staffPosts ARE wired (LoopDecisionEngine.ts:22, phase05_monthly_boundary.ts:30) — aux exports classified intentional; `ensureStaffPosts`/`postVacant` were truly dead → REMOVED. |
| overrideConsumer day-1 test | **DISPROVED (vacuous)** | Generated schedules never pair requester vs rival → "no req-riv pairing" passes trivially; repair path unexercised. Recorded as DEBT. |

## 4. Bugs fixed this pass

| # | Fix | Commit |
|---|-----|--------|
| B01 | `ensureStaffPosts`/`postVacant` dead + buggy exports removed (ensure built an unattached object) | `c017ede8` |
| B02 | Orphan classification reconciled: 20 new entries classified, 6 stale keys pruned, baseline regenerated | `c017ede8` |
| B03 | `needsScheduleForDay` day<1 enforcement gap | `875c8cfc` |
| B04 | Vacuous overrideConsumer test → real characterization snapshot added | `f8bd083e` |

## 5. Deferred findings (DEBT, prioritized)

1. `pipelineRunner` impact detection via `"metadata" in result` — harden to field-based check or enforce metadata contract.
2. overrideConsumer test gap: no composition currently exercises the actual repair-swap path; needs a world where Swiss pairing produces a req-rival pairing (Swiss orders by rank, not rivalry).
3. `RecruitingTabSections.tsx:378-379` `as unknown as UIRikishi` (carried from v14).
4. 144/460 engine files lack header docs; ~240 remaining orphans (archive-policy retained).
5. Logger.ts:51 `new Date()` + MigrationService.ts:55 — wall-clock in save metadata only; document as boundary exception.
6. `applyImpacts`/`applyImpactToGameState` (gameHelpers.ts:88,94) — zero production callers (orphan candidates).
7. CLAUDE.md drift — test counts stale again.

## 6. Branch disposition

| Branch | Disposition |
|--------|-------------|
| polish/stable-not-found | #1156 cherry-picked — deleted |
| bard-milestone-flavor-* | #1157 cherry-picked — deleted |
| scout-test-arrayappends-* | #1170 cherry-picked — deleted |
| bolt-fix-set-allocation-* | #1169 cherry-picked — deleted |
| bolt-optimize-rival-heya-lookup-* | #1158 cherry-picked — deleted |
| bolt-optimize-npc-deduplication-* | #1154 cherry-picked — deleted |
| scribe-document-schedule-helpers-* | #1155 doc hunks cherry-picked — deleted |
| scout/fix-faction-pressure-id-* | #1153 disproved/closed — deleted |
| 10× dependabot/bun/* | consolidated in `c2df5189` — deleted |
| stash@{0} (audit/v10 WIP) | preserved as commit `76ec059` on `audit/v10-stash-recovery`; largely superseded (pre-tests-restructure, old bout-narrative split, lint-failing scripts); dropped from stash list |

## 7. Final state

- `bun run test` (fast) — all green post-consolidation (see §1).
- `.jules/` journals and `test-timings-fast.xml` artifacts never landed (gitignored/dropped per merge).
- `bun run test:timings` baseline regenerated.
- slow/perf/e2e gates: deferred to next CI cycle — declared deviation (context-bounded session); fast suite + type-check + build + lint green locally.

## 8. Ordering deviation (declared)

Executed review → test-authoring → merges → fixes per the test-first mandate. `test:slow`/`test:perf`/`test:e2e` deferred post-push (CI covers them); all other gates green.
