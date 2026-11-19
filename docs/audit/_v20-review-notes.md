# v20 Consolidation — Working Notes

> Live working notes for the in-flight v20 consolidation — will be superseded by
> `docs/audit/consolidation-verdict-v20.md` at closeout.

## Phase A.1 Baseline log (clean main @ b62cc407 — "Bun updates")

| Gate | Result |
|------|--------|
| `bun run type-check` | ✅ PASS — 0 errors |
| `bun run lint:commit` | ✅ PASS — 0 errors/warnings output |
| `bun run build` | ✅ PASS — ~60s (rolldown; chunk-size warnings only, incl. BashoPage 1.09MB / engine.worker 887KB) |
| `bun run test` (fast) | ✅ 10,221 passed / 7 skipped — 1 induced failure (`staleDocs` flagged THIS FILE for missing staleness annotation — fixed) + 1 contention flake |
| `bun run test:slow` | pending (needs build — done) |
| `bun run test:perf` | pending |
| `bun run test:e2e:smoke` | pending |
| `determinism basho` + `year` | pending (slow suite covers `determinismDoubleRun`) |
| `Math.random`/`Date.now` grep `src/engine` | ✅ ZERO call sites (3 comment-only mentions: FamilyBondService.ts:11, calendar.ts:5, RecruitmentController.ts:58) |

### Baseline findings
- **CLAUDE.md "2 pre-existing DynastyService snapshot failures" — DISPROVED for current main.** Zero DynastyService failures in the run; note is stale (fixed since or flake).
- **Contention flake**: `tests/unit/pages/Dashboard.succession.test.tsx` `beforeAll` dynamic import timed out (10s) while `bun run build` ran concurrently; passes isolated 6/6 in 4.8s. Flake-risk file under load.
- **staleDocs meta-gate**: any `docs/audit/*.md` mentioning regex/grep needs a staleness/superseded annotation — header added above.
- **Fetch delta**: all 8 dependabot branches force-rebased overnight — PR heads changed SHA (verdicts unaffected — payload analysis used post-rebase refs).

### Fetch delta at session start
All 8 dependabot branches force-updated overnight (rebased onto main).

## Phase A.4 — Delta deep-dive (220 src files changed 32bf8e74..main; 441 total)

Delta domain histogram (src only): engine/bout 28 · constants/engine 18 · engine/types 13 ·
presenters/projections 12 · engine/tick 10 · engine/generation 10 · engine/lifecycle 9 ·
engine/bard 8 · engine/banzuke 7 · engine/history 6 · presenters/rikishi 5 · engine/worker 5 ·
engine/core 5 · components/recap 5 · components/layout 5 · engine/economy 4 · engine/basho 4 ·
components/rikishi 4 · components/basho 4 · engine/persistence 3 · engine/npc 3 · engine/media 3 ·
engine/matchmaking 3 · components/scouting 3 · state/game 2 · engine/simulation 2 · engine/legacy 2 ·
engine/health 2 · engine/calendar 2 · components/stable 2 · components/history 2 ·
components/avatar 2 · + 1-each: state/stores, presenters/worldAccess, engine/utils, engine/training,
engine/recruitment, engine/narrative, engine/governance, engine/committee, app/routes,
hooks/{useOyakataSelection,useCrisisDetection}, ~14 pages, ~11 components/* singles.

Non-src delta: tests/unit 166 · docs/agent-journals 11 · docs/plans 8 · tests/e2e 6 ·
tests/slow 4 · scripts/sim 4 · docs/audit 4 · .windsurf/audit 2 · .claude/skills 2 ·
tests/perf 1 · tests/helpers 1 · scripts/narrative 1 · playwright.config.ts · package.json ·
bun.lock · docs/user-manual.md · docs/Basho_Constitution · .claude/CLAUDE.md · .Jules ×5.

## Wave verdicts

(filled during Phase C)

## Phase D — Test-first manifest states

(filled during Phase D — RED/GREEN state per pin recorded before any implementation)

## Phase D — RED/GREEN matrix (tests/unit/engine/consolidation/v20Regressions.test.ts)

| Test | Registry | Pre-fix status |
|------|----------|----------------|
| isYushoContention division-scoped | E1 | RED ✓ |
| isPlayoffScenario division-scoped | E1 | RED ✓ |
| applyNewRanks shikona milestone | E4 | RED ✓ (never fires pre-fix) |
| maezumo standings/career exclusion | E5 | RED ✓ |
| maezumo records-board exclusion | E5 | RED ✓ |
| eighthBout day-gate | E7 | RED ✓ (`sd-donor` flagged) |
| NPC-fill pool zombie | E14 | RED ✓ |
| roster sync keeps added rikishi | E13 | GREEN (guard — E13 DISPROVED: resolver unions rikishiToAdd) |
| getHeyaRoster contract | #1202 char. | GREEN (characterization) |
| incident dedup same-tick-only | #1203 char. | GREEN (characterization) |
| oversleeping render integrity | #1205 | GREEN (pins token contract) |
| oversleeping variant counts | #1205 | RED ✓ (3/3/3 → 5/6/7) |

8 intended RED + 4 intended GREEN confirmed 2026-11 pre-Phase-E.
