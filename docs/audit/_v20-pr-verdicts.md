# V20 PR Verdict Matrix (12 open PRs)

All evidence from direct diff/trace inspection on `main @ b62cc407`. Dispositions:
MERGE-PAYLOAD (apply payload manually, close PR), PARTIAL-MERGE (port unique sites only),
FOLD-INTO-BUMP (dependabot consolidation), REJECT, RETAIN.

| PR                 | Branch                     | Verdict            | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Action                                                                           |
| ------------------ | -------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| #1202              | bolt-roster-query-opt      | **PARTIAL-MERGE**  | Payload = 2 sites only, verified by full diff: `chainService.ts` applyEffects `rosterFatigue` block (~L282) and `crisisRegistry.ts` `applyRosterFatigue` (~L72) — both still loop `world.activeRikishiIds` on main. Semantic equivalence confirmed: `EntityCollection.getHeyaRoster` (`EntityCollection.ts:63`) filters retired per docstring; update order inert (Map writes). **Stray files**: root `test_plan.md` (scratch — strip), edits to `_v19-file-coverage.md` + `bug-registry-v19.md` (historical docs are verbatim — strip), `.jules/bolt.md` (wrong location — see journal note) | Port 2 hunks only; strip strays; fold journal into `docs/agent-journals/bolt.md` |
| #1203              | bolt-optimize-memory-loop  | **MERGE-PAYLOAD**  | `consolidateOyakataMemoryPure` `seenSummaries` build: `.filter().map()` → single-pass loop — identical predicate (`o.tick === tick`), identical Set semantics. Existing characterization coverage: `memory.test.ts:85-105` (unique-summary dedupe). Coverage gap: same-tick _existing-observation_ dedupe not pinned — Phase D adds one. `.jules/bolt.md` stray → journal fold                                                                                                                                                                                                                | Apply `memory.ts` hunk + journal fold                                            |
| #1204              | mason/remove-h2h-type-cast | **MERGE-PAYLOAD**  | Casts verified live on main (`boutCardTypes.tsx:79`, `boutCardComponents.tsx:91`). `UIRikishiDTO extends RikishiH2HDTO` (`presenters/rikishi/types.ts:273`); `h2h?: Record<string,{wins,losses,streak}>` (`:240`) covers both sites incl. `.streak`. Pure cast removal — zero runtime change; type-check is the test                                                                                                                                                                                                                                                                          | Apply as-is                                                                      |
| #1205              | bard-enrich-oversleeping   | **MERGE-PAYLOAD**  | Caller `checkBashoDayDrama` (`dramaGenerator.ts:156-199`) logs `GOVERNANCE_RULING` with `data.shikona` + `data.day` — `%SHIKONA%`/`%DAY%` populated; `%DAY%` already used by existing `oversleeping_incident_summary` entries. kyujo.json additions use `%SHIKONA%` only. `.jules/bard.md` stray → journal fold                                                                                                                                                                                                                                                                               | Apply JSON payload; gate `templateTokenIntegrity` + render pin                   |
| #1206–#1213, #1215 | dependabot ×8              | **FOLD-INTO-BUMP** | Freshness table below. All PR branches force-rebased overnight (Nov-19 fetch)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | One consolidated bump + single `bun.lock` regen; jsdom isolated commit           |
| —                  | perf-baseline              | **RETAIN**         | CI artifact branch; `perf-gate.yml` fetches baseline from it (main is protected — baseline can't live there)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Never delete                                                                     |

## Journal-location finding (F-jrn) — resolved

`docs/agent-journals/README.md` states `.jules/` "was gitignored local memory" — superseded by
committed `docs/agent-journals/` (11 files, has README + format spec: Data/Learning/Pattern).
`.Jules/` (capital-J, 5 files) is a tracked duplicate that escaped the lowercase ignore.
Disposition: PR journal content folds into `docs/agent-journals/{bolt,bard}.md` reformatted to
spec; `.Jules/` duplication registered as a finding for Phase C (delete-vs-keep decision there —
`.Jules` files were committed in the delta so they may carry unique entries).

## Dependabot freshness table (audit date Nov 19)

| Package                          | Current | PR-proposed | Registry latest  | Latest ≥7d? | Bump target                                          |
| -------------------------------- | ------- | ----------- | ---------------- | ----------- | ---------------------------------------------------- |
| react                            | 19.3.0  | 19.3.1      | 19.3.1 (Oct 14)  | YES (36d)   | **19.3.1**                                           |
| react-dom                        | 19.3.0  | 19.3.1      | 19.3.1 (Oct 14)  | YES         | **19.3.1**                                           |
| tailwindcss                      | 4.3.4   | 4.3.5       | 4.3.5 (Nov 6)    | YES (13d)   | **4.3.5**                                            |
| @tailwindcss/vite                | 4.3.4   | 4.3.5       | 4.3.5 (Nov 6)    | YES         | **4.3.5**                                            |
| typescript-eslint                | 8.72.1  | 8.72.2      | 8.73.0 (Nov 16)  | NO (3d)     | **8.72.2** (Nov 9 — eligible)                        |
| @typescript-eslint/eslint-plugin | 8.72.1  | 8.72.2      | 8.73.0 (Nov 16)  | NO (3d)     | **8.72.2**                                           |
| jsdom                            | 30.1.3  | 31.0.1      | 31.0.1 (Nov 13)  | NO (6d)     | **31.0.0** (Nov 5, 14d) or re-probe ≥Nov 20 → 31.0.1 |
| three                            | 0.186.1 | 0.187.0     | 0.187.0 (Oct 30) | YES (20d)   | **0.187.0**                                          |
| @types/three                     | 0.178.1 | 0.187.0     | 0.187.0 (Oct 30) | YES         | **0.187.0**                                          |

Risk flags: **jsdom 30→31 is a major bump** — isolated commit + full suite re-run (vmThreads/jsdom
env compat). `three` 0.186→0.187 minor — check breaking changes vs usage sites (avatar/dohyo viz).
`typescript-eslint@8.73.0` deliberately skipped (under-age) — documented, not forced.

## Comments audit

All 12 PRs carry a single `google-labs-jules` boilerplate comment ("Jules, reporting for
duty!"); zero human review comments, zero code-review threads. No actionable comment content.

## Branch dispositions (post-merge)

- `perf-baseline` — RETAIN (CI artifact).
- 4 Jules payload branches — DELETE after payloads land (applied as new commits, not merges).
- 8 dependabot branches — DELETE after fold-in (payloads consolidated into one bump commit).
- `consolidation/v20` — DELETE after `--no-ff` merge to main + push.
