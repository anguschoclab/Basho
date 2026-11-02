# Consolidation Verdict — v16

> **STALENESS NOTICE:** grep/regex findings, counts, and gate results in this document are point-in-time measurements at the cited commits. Re-run the commands before citing them later.

**Date:** 2026-11-02 · **Baseline:** `2bfc438f` · **Result HEAD:** see `git log`
**Scope:** exhaustive review of the repository — all read batches enumerated in `docs/audit/_v16-file-coverage.md`; full findings register in `docs/audit/_v16-review-notes.md`; disposition of every bug in `docs/audit/bug-registry-v16.md`.

## Baseline (measured at 2bfc438f)

| Gate | Baseline result |
|---|---|
| `type-check` | **RED** — `overrideConsumer.test.ts:175` `TS2339: Property 'reasons' does not exist on type 'MatchSchedule'` |
| `lint:strict` | 0 errors, 37 warnings (all `react-refresh/only-export-components` in `src/app/routes.tsx`) |
| `build` | GREEN (Vite warnings for >500KB chunks) |
| `bun run test` | 1005 files / 9302 pass / 1 skip |
| Orphan audit | 239 unreferenced exports + 9 unticked services |

## Branch & PR verdicts (all items)

| Item | Verdict | Evidence | Disposition |
|---|---|---|---|
| PR #1171 (Mason: remove dead `reasons` check) | **APPROVED — landed via union** | `m.reasons` cannot exist on `MatchSchedule` (projection strips it at `schedule.ts:151-157`); strict subset of #1173 | Closed unmerged; line removed in `10bd84b2`; branch deleted |
| PR #1172 (Bolt: optimize AI worker selection) | **APPROVED — landed via union** | `.map().filter().sort()[0]` ≡ single-pass strict-`>` first-max (stable-sort semantics proven); new characterization tests pin behavior | Closed unmerged; landed `10bd84b2`; branch deleted |
| PR #1173 (Scribe: MatchSchedule contract doc) | **APPROVED — landed via union** | Doc literally accurate (`MatchPairing.reasons` at `MatchmakingPhases.ts:56`, stripped by projection) | Closed unmerged; landed `10bd84b2`; branch deleted |
| PR #1153 (faction-pressure id) | **DISPROVED** | Redundant/inferior to existing `startsWith` behavior | Closed prior; branch `scout/fix-faction-pressure-id-*` deleted |
| PR #1154 (NPC dedup optimization) | **APPROVED — already on main** | Content landed in v15 squash era | Branch `bolt-optimize-npc-deduplication-*` deleted |
| PR #1155 (schedule helper docs) | **APPROVED — already on main** | Content landed in v15 | Branch `scribe-document-schedule-helpers-*` deleted |
| PR #1157 (bard milestone flavor) | **APPROVED — already on main** | Content landed in v15 | Branch `bard-milestone-flavor-*` deleted |
| PR #1158 (rival heya lookup) | **APPROVED — already on main** | Content landed in v15 | Branch `bolt-optimize-rival-heya-lookup-*` deleted |
| PR #1169 (Set allocation) | **APPROVED — already on main** | Content landed in v15 | Branch `bolt-fix-set-allocation-*` deleted |
| PR #1170 (`arrayAppends` guard) | **PARTIAL** | Guard-completeness fix valid; claimed production impact overstated (`isStateImpact` has zero prod callers — `pipelineRunner.ts` discriminates via `"metadata" in result`) | Guard pattern retained; production-impact claim disproven in notes |
| Dependabot #1160–#1168 | **APPROVED — already merged** | Squash `c2df5189` on main | n/a |
| Local `polish/stable-not-found` | **APPROVED — already on main** | `45e87aa4` content verified landed | Branch deleted |

## Findings dispositions

**50 verified BUGs** (V16-B01..B50) and ~30 DEBT/NOTE classes (V16-F/F-series) were confirmed by direct code reading (see `_v16-review-notes.md`).

**FIXED in this pass (commits `10bd84b2`, `061881a3`, follow-ups):**
- **B01** `phase01_basho_bouts` `PASSTHROUGH_FIELDS` dropped `governanceLog` + all heya/staff writes from bout resolution (scandal rulings silently lost) → added field + `reexportEntityDiffs` helper.
- **B02** `phase01_week_governance` election check compared constant 52 against monotonic `world.week` → fires once ever; now week-of-year.
- **B04** `phase06_yearly_boundary` `age = world.year - birthYear` used pre-increment year → 1-year-stale ages; now `+1`.
- **B05** `phase01_week_health` NPC injury recovery multiplied by player-derived `recoveryMultiplier` → now gated to `r.heyaId === world.playerHeyaId`.
- **B08** `hallOfFame` used `getRikishi` (active only) → `getRikishiAnywhere` + `"stats" in r` narrowing; `processIronMen` now iterates `historicalRikishi` too.
- **B09** `pre_bout.json` `%WEST_LOSSES%` in east-record templates → `%EAST_LOSSES%`.
- **B11** `maegashira` termJa `幕下` → `前頭`.
- **B12** `overflow.ts` stale-base `rikishiIds` (each release computed from original array → only last release applied) → `releasedIds` accumulate.
- **B13** `dohyoIri` seed lacked rikishi id → every yokozuna same style per world-seed; now `::${rikishi.id}`.
- **B16** `mergers` candidate/fallback excluded `world.playerHeyaId` → NPC can no longer merge into player stable.
- **B17** `GlobalCupService` `winnerId === playerHeyaId` (rikishiId vs heyaId) → resolved via `world.rikishi.get(winnerId)?.heyaId`.
- **B18** bailout UI gate `funds < 0` vs engine `LOAN_ISSUANCE_THRESHOLD (-¥5M)` → unified to constant.
- **B19** `EventLogSections` `.replace("text-","text-opacity-80 ")` produced invalid class → color applied directly.
- **B31** `YushoRaceWidget` `params:{id}` → `{rikishiId}` (route is `/rikishi/$rikishiId`).
- **B32** `RikishiGlobalCup` "Tournaments" stat duplicated championships → `GlobalCupHistoryEntry.participantIds` added (type + writer + readers).
- **B33** `DashboardColumns` literal-quote `"FATIGUE LEVELS"` → clean label.
- **B34** `ScheduleSections` `east?.name` (usually unset) → `shikona`.
- **F49** `schedule.test.ts` heya-block test inserted zero rikishi into world (vacuous) → fixtures wired.
- **Perf-gate GH006**: workflow pushed baseline to protected `main` → now pushes to dedicated unprotected `perf-baseline` branch; check step fetches it with repo-file fallback. Preserves the V13-B02 self-heal invariant.

**REGISTERED DEBT (not fixed this pass — severity-ranked in bug-registry-v16.md):** TalentPoolMaterialization + governanceReview stale-base funds (same accumulate-once class as B12), B03 unreachable `phase_pre_basho_assessment`, B06 bard-orchestrator schema, B07 electron packaging inconsistency, B14 myoseki seller credit, B15 academy abilityGain, B20-B24/B37-B43 UI items, B25-B36 lifecycle bugs (succession cascade, retirement RNG seed-scope, prize overwrite), B44-B50 bout/matchmaking items, serialization `boutMetrics` drop, ~42% worker-command coverage gap, tautological-test files list.

## Test-first compliance

Strict ordering held: `71e30b44` (tests only) landed before `10bd84b2` (implementation). New tests: `v16Regressions.test.ts` (B02/B04/B16/B17/B18 spec-pins), spawnGlobalWorker characterization (max-power, first-max tie, filtering), `MatchSchedule` runtime-shape contract, dohyoIri per-rikishi determinism. Tests pinning *buggy* behavior were rewritten (dohyoIri same-style, phase06 old-year age).

## Coverage honesty

- Read agents completed: engine spine/core/persistence (32), tick (55), bout+matchmaking+calendar+banzuke (82), narrative+bard+history+media+events (81), economy+governance+recruitment+generation (69), lifecycle+shikona+training+health+welfare (56), components A/B/C (374), all test-side batches (~680 files), scripts+workflows+configs (63), slow/perf/e2e (28). **≈1,440 files read end-to-end by agents + priority files by orchestrator.**
- Agent batches killed by model rate limits (per user instruction, not restarted): types/utils subset, npc subset, pages, app/lib/hooks/constants subset, parts of test subdirs. These were covered by targeted greps + prior-session reads; honestly recorded as **swept, not full-read**.
- Every finding above is evidenced by file:line in `_v16-review-notes.md` and was verified against the code before disapproval or landing.
