# Consolidation Verdict — v12

**Date:** 2026-10-20
**Branch:** `main` (direct, per user instruction — no consolidation branch)
**Scope:** 27 open PRs (#1094–#1120: 17 bot + 10 dependabot), full-repo workstream
audit WS-A–WS-L, strict test-first ordering (RED phase documented in
`v12-red-phase.md`).

## Gate evidence

| Gate | Result |
| --- | --- |
| `bun run type-check` | clean |
| `bun run lint:strict` | clean (0 warnings) |
| `bun run build` (vite) | pass |
| `bunx electron-vite build` | pass |
| `bun run test` (fast) | **964 files / 8,905 tests / 0 failures** (1 skipped) |
| `bun run test:e2e:smoke` | **3/3 specs green** (23.7s) |
| `determinism-double-run.ts basho` | PASS — byte-identical (16,242,923 B) |
| `determinism-double-run.ts year` | PASS — byte-identical (80,148,128 B) |
| Meta gates | factoryDiscipline, testTimingsBudget, all green; `test-timings.json` re-baselined |

Baseline before work: 963 files / 8,888 tests (`pre-consolidation-baseline-v12.txt`).
Net change: +1 test file, +17 tests.

## Bugs fixed

- **V12-B01 (FIXED):** `actionQueue.ts` emitted a permanent "Promotion
  deliberation available" item — `PROMOTION_DELIBERATION` is a durable event,
  so the full-log `.some()` never went false. Replaced with
  `scanRecentEvents(log.slice(-20), { types: ["PROMOTION_DELIBERATION"], limit: 1 })`,
  matching the engine's own recency convention (`phase06_narrative.ts`).
- **V12-B02 (FIXED):** unnecessary `as unknown as` cast on the OPFS
  `FileSystemDirectoryHandle` iterator removed — `dir.values()` typechecks
  directly on the shipped DOM lib.
- **V12-B07 (FIXED):** CLAUDE.md status line and directory map refreshed.
- **V12-B08 (FIXED):** `resolveBanzukeTie` doc/comment normalized to the real
  5-level sequence (was 4 listed + a "Level 3.5").

New engine surface: `scanRecentEvents` gained a `predicate` option —
per-element filter applied before `limit` counts, composing with the
structured filters (types/category/heyaId/rikishiId/minImportance). Contract
tests pin ordering, limits, and composition (`events.scanRecentEvents.test.ts`).

## Per-PR verdicts

| PR | Verdict | Notes |
| --- | --- | --- |
| #1094 Bard career bout milestone | **APPROVED — merged** | `career_bout_milestone` variants merged into `post_bout.json` |
| #1095 Polish rivals empty state | **APPROVED — merged** | `EmptyState` added for zero-rivals; `!world → null` retained (world prop needed for avatar resolution — PR's base had drifted) |
| #1096 Bolt event-log scans | **APPROVED — canonical compose** | actionQueue + governanceProjections migrated to `scanRecentEvents`; delivered with the `predicate` option it needed |
| #1097 Bolt action-queue perf | **SUPERSEDED** | subsumed by the canonical compose; the landed fix also corrects the stale-forever semantic the PR preserved |
| #1098 Scribe `logEngineEvent` doc | **APPROVED — merged** | `@contract` JSDoc verified against dedupe/eviction implementation |
| #1099 Palette backstory a11y | **APPROVED — merged** | `BackstoryCard` now `role="button"`/`tabIndex`/aria/`activationKeyHandler`, matching the `StableCard` convention |
| #1100 Bolt promotion lookup | **SUPERSEDED** | same cluster as #1097 |
| #1101 Bard upset elite variety | **APPROVED — merged** | `upset_elite` variants merged |
| #1102 Bolt event-log optimization | **SUPERSEDED** | same cluster as #1097 |
| #1103 Scribe `ensureEventsState` doc | **APPROVED — merged** | softened-but-accurate doc; verified the function does benign init, not event appending |
| #1104–#1113 dependabot ×10 | **APPROVED — landed** | all 10 applied via `bun update`: `@types/node` 26.6.5, radix select 2.4.1 / slider 1.6.1 / toast 1.3.1, `@playwright/test` 1.64.1 (+ browser reinstall, smoke re-verified), `typescript-eslint` 8.71.2, eslint 10.13.0 (in-range, >PR target), electron 44.9.0 (in-range, >PR target), vite 8.3.4, `@testing-library/user-event` 14.6.8 — all gates green |
| #1114 Bolt recruitment pass | **APPROVED w/ correction — merged** | single-pass max loops in `weekly/agents.ts`; strict `>` preserves stable-sort first-of-ties; "Bolt:" self-branding comments stripped |
| #1115 Scribe README fix | **APPROVED — merged** | `bunx` → `bun x` verified accurate |
| #1116 Bard post-bout enrichment | **APPROVED — payload only** | `post_bout.json` extracted; contamination excluded: scratch `update_json*.py`, 23 prettier-churn test edits, snapshot churn — golden snapshots regenerated locally instead |
| #1117 Bolt AI updates | **APPROVED w/ correction — merged** | single-pass hottest-rivalry loop in `execution.ts`; branding stripped; tie semantics preserved |
| #1118 Scribe banzuke tiebreak doc | **APPROVED w/ correction — merged** | doc accurate; code comment renumbered to match (Level 3.5 → 4, fallback → 5) |
| #1119 Mason OPFS iterator | **SUPERSEDED** | better fix landed — the cast is unnecessary, not just loosely shaped (B02) |
| #1120 Scout `advanceInterim` tests | **APPROVED — merged** | 10 tests adopted verbatim; factory discipline + timings baseline satisfied |

**Totals:** 17 APPROVED (13 merged as-is/payload, 4 merged with correction),
6 SUPERSEDED (3× Bolt action-queue near-duplicates → one canonical compose,
#1119 → better fix, #1116 partial via payload extraction), 10 dependabot landed.
No PR rejected for incorrectness; every claim was verified against production
paths before classification.

## Excluded (deliberately not landed)

- `.jules/*.md` bot journals — gitignored scratch artifacts.
- `update_json{,2,3}.py` scratch scripts from #1116.
- #1116's 23 test-file edits — prettier rewrap churn, zero semantic change.
- `NotableBouts.tsx` formatting churn from #1116.

## Deferred

- `bun run test:slow` (subprocess audits, long sims) — per instruction, runs ad hoc.
- `bun run test:e2e:soak` — deferred.
- V12-B06 unreferenced-exports debt — pre-existing, gated, unchanged.
