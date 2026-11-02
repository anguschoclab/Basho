# Consolidation Verdict — v13.1 (second pass)

**Cycle:** v13.1 · **Base:** main @ `7604c634` (post-v13) · **Plan:** `~/.devin/plans/plan-bffd4f75e88d2ec0.md`
**Artifacts:** `bug-registry-v13.md` §D (this cycle's findings appended) · this document

## Provenance

A parallel local session (this plan) executed Phases 0–5 of an earlier v13 draft
independently of the v13 that shipped (`plan-313e87d710c2b906`, landed through
`0a0fe091`). On sync, remote `main` already contained the full v13: 15 PRs
adjudicated, verdict published, remote lifecycle recorded — plus post-v13 work
(bout-physics correctness, retirement unification, ui-honesty, test re-tiering,
dependency updates).

Local state at discovery: 10 parallel commits duplicating the remote clusters
(kept under `backup/v13-local-wip`) + an uncommitted 90-file fix-set from a
**deeper module-by-module Phase-2 read** — findings the first-pass audit never
sought (§D of `bug-registry-v13.md`). The reconciliation: reset local to
`origin/main`, re-applied the unique fix-set onto post-v13 code, adjudicated the
4 PRs that had opened since (#1136, #1138, #1142, #1147), and landed everything
as the v13.1 commit.

## Gate evidence (post-integration, this cycle)

| Gate | Result |
|---|---|
| `bun run type-check` | ✅ 0 errors (fixed `physicsFixes.test.ts` union narrowing — **red on `7604c634`**) |
| `bun run lint:strict` | ✅ 0 warnings |
| `bun run test` | ✅ **964 files / 8,885 passed / 1 skipped / 0 failures** |
| Meta/audit gates | ✅ phasePurity, functionLengthBudget, testTimingsBudget, commandSurfaceCoverage all green |

## Per-finding verdicts (§D registry)

| Cluster | Verdict |
|---|---|
| D-A kōenkai map-key (5 sites) | **CONFIRMED → FIXED** — `koenkais` keyed by `koenkaiId`, not heyaId; recruitSponsor charged-then-lost funds, benefactor bailout dead, sponsor dedup dead |
| D-B ImpactBuilder.merge snapshot clobber (5 sites) | **CONFIRMED → FIXED** — overlay + `mergeAbsorb`; funds-destruction path in myoseki market purchase closed |
| D-C basho-phase drops | **CONFIRMED → FIXED** — oyakata updates + awardLog appends restored; `interventionUsedThisBasho` per-basho reset wired at banzuke publish |
| D-D in-place mutations / halted-tick starvation | **CONFIRMED → FIXED** — RecordEntry aliasing, allTime pre-impact writes, unbounded log growth, weekly-counter starvation |
| D-E data/display defects | **CONFIRMED → FIXED** — 0-100 vs [0,1] band domain, non-union injury labels, "Unknown" nakabi leader, media-event global sweeps, sponsor dual representation |
| D-F presenter honesty | **CONFIRMED → FIXED** — kōenkai income ~43% overstatement, fabricated momentum/bands, wrong-domain facility labels, 150%-beside-90% bar, enum-in-copy, dead projections deleted |
| D-G keyboard a11y | **CONFIRMED → FIXED** — 6 onClick sites gained activation handlers |
| D-H §C notes | **CONFIRMED → FIXED** — AdvisorService full-log scan, kesho Math.random flicker, headline cap, constant misnomer, season mislabel, bloodline token order, academy budget/category, infra "TBD", bout-headline categories, exhibition flavor misdescription, treatInjury stale fields |
| D-I reconciliation discoveries | **CONFIRMED → FIXED** — remote red `type-check` (physicsFixes CombatPhase union), timings-report Windows separators, runPhaseLoop 151-LOC breach, O(n²) command-surface scan |

## Second-wave PR verdicts

| PR | Verdict | Evidence |
|----|---------|----------|
| #1147 Bolt execution-loops | **APPROVED — payload landed** | Single-pass equivalence verified (min-level facility; prioritized-or-cheapest myoseki). Branding/`.jules` stripped |
| #1136 Scribe JSDoc | **APPROVED — payload landed** | Misplaced `generateCandidate` doc block + stale duplicate on `resolveAndApplyBout` — both defects live on main |
| #1138 postcss bump | **MERGED** | Required checks green; perf-gate red = V13-B02 documented baseline drift |
| #1142 eslint-parser bump | **MERGED** | Same disposition |

## Branch cleanup

| Branch | Disposition |
|---|---|
| `bard-sansho-variety-*` | DELETED — #1124 landed in v13 |
| `ux-recruit-specialist-focus-*` | DELETED — #1129 landed in v13 |
| `scout-test-runAutoSim-*` | DELETED — #1135 landed in v13 |
| `bolt-optimize-execution-loops-*` | DELETED — payload landed this cycle |
| `scribe-fix-jsdocs-*` | DELETED — payload landed this cycle |
| `dependabot/bun/postcss-*` | DELETED — merged this cycle |
| `dependabot/bun/typescript-eslint-parser-*` | DELETED — merged this cycle |

Final remote state: `main` only; `gh pr list --state open` empty.

## Divergence note for future sessions

This cycle demonstrates the risk of parallel consolidation runs: two sessions
executed overlapping v13 plans on divergent bases. The reconciliation kept the
remote's shipped result canonical and re-based the local-only findings. The
`backup/v13-local-wip` ref preserves the superseded local commits; nothing in it
is unique — every landed item re-landed under the v13.1 changeset or was
already covered by remote v13.
