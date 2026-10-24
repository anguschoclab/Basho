# Consolidation Verdict — v13

**Cycle:** v13 · **Base:** main @ 624f0c3b → final @ 2fc34e2e · **Plan:** `~/.devin/plans/plan-313e87d710c2b906.md`
**Artifacts:** `pre-consolidation-baseline-v13.txt` · `v13-pr-inventory.json` · `bug-registry-v13.md` · `v13-red-phase.md` · this document

## Final gate evidence (post-integration main)

| Gate | Command | Result |
|---|---|---|
| Typecheck | `bun run type-check` | ✅ 0 errors |
| Lint strict | `bun run lint:strict` | ✅ 0 warnings |
| Vite build | `bun run build` | ✅ PASS |
| Electron build | `bunx electron-vite build` | ✅ PASS |
| Fast suite | `bun run test` | ✅ **966 files / 8,921 passed / 1 skipped / 0 failures** (20.89s) |
| Slow (targeted) | `vitest run --config vitest.slow.config.ts autoSimCoreLoop` | ✅ 8/8 in 6.1s — no stubbing needed |
| Perf suite | `bun run test:perf` | ✅ 5 files / 14 tests |
| Coverage | `bun run test:coverage` | ✅ **76.17 stmts / 64.61 branch / 68.34 func / 78.13 lines** ≥ floors 73/61/64/75 |
| Determinism | `determinism-double-run.ts` | ✅ basho (16,242,923 B) + year (80,148,128 B) both byte-identical |
| E2E smoke | `bun run test:e2e:smoke` | ✅ 3/3 (45.3s) |
| Meta gates | meta/ + audit/functionLengthBudget | ✅ 18/18 — no subprocess violations, no new over-budget symbols |

## Per-PR verdicts

| PR | Verdict | Evidence / disposition |
|----|---------|------------------------|
| #1121 Bolt loops | **APPROVED w/ correction — LANDED** | Rewritten as two `scanRecentEvents(log.slice(-20), {types, limit:1})` calls (V16); `⚡ Bolt:` branding stripped; `.jules` excluded. T2 characterization green before+after. Commit `c658c77e` |
| #1122 Palette ARIA | **APPROVED — LANDED** | 5 progressbar sites; aria-valuenow mirrors width expression each (V21). Commit `c311e482` |
| #1123 Mason heya-preview | **APPROVED — LANDED** | `unknown[]` widening removes 2 `as unknown as RikishiPreview[]` casts (V12). Commit `215345c0` |
| #1124 Bard sansho | **APPROVED — LANDED** | 15 new template lines; every token valid — `templateTokenIntegrity` 601/601 (V18). Commit `d1510851` |
| #1125 Curator Title Streak | **APPROVED — LANDED** | `consecutiveYusho` wired Rikishi→DTO→`buildStatEntries`, display-gated >1 (V22); honest post-V13-B01. Commit `c311e482` |
| #1126 Polish EmptyState | **APPROVED — LANDED** | `compact` prop exists; wrapper convention matches (V23). Commit `c311e482` |
| #1127 Scribe getHeyaRoster doc | **APPROVED — LANDED** | Doc accurate vs `EntityCollection.ts:60` + `includeRetired` path (V13). Commit `215345c0` |
| #1128 Mason heya-preview dupe | **SUPERSEDED — CLOSED** | Byte-identical payload to #1123 (identical blob hashes, V11); only `.jules` text differed. Nothing additional landed |
| #1129 Palette focus-visible | **APPROVED — LANDED** | Real interactive (DialogTrigger child); `outline-hidden` correct Tailwind v4 token (V24). Commit `c311e482` |
| #1130 Bard recruiting | **APPROVED payload-only — LANDED** | 3 titles + 5 `scouting_reports` landed; ~200 lines of prettier churn + PR-supplied golden excluded; snapshot regenerated locally — drift = seeded template selection (V19). Commit `d1510851` |
| #1131 Bolt loops | **APPROVED w/ correction — LANDED** | `tied`/`entrants+injured` loops land sans branding; semantics verified stable (V17). Commit `c658c77e` |
| #1132 Palette breadcrumbs | **APPROVED — LANDED** | Focus rings on ellipsis + links (V24). Commit `c311e482` |
| #1133 Scribe sequenceImpacts doc | **APPROVED w/ correction — LANDED** | "Absolute replacements if domains intersect" adopted; append-fields parenthetical **retained** — `mergeImpacts` does accumulate `arrayAppends` (V14). Commit `215345c0` |
| #1134 Mason bloodline selector | **APPROVED — LANDED** | `Object.values(registry.traits)` equivalent — key===traitId guaranteed (V15); T4 shape test green both sides. Commit `215345c0` |
| #1135 Scout runAutoSim | **APPROVED payload-only — LANDED** | 8-test describe relocated to `src/tests/slow/engine/simulation/autoSimCoreLoop.test.ts` — fixes both CI violations (`noSubprocessInUnitTests`, `functionLengthBudget`); ~75 churn files excluded (V20). Commit `48712381` |

## Bug dispositions

| Bug | Severity | Disposition |
|-----|----------|-------------|
| V13-B01 `consecutiveYusho` never resets | HIGH | **FIXED** — `persistBashoState` sweeps full `nextRikishiMap`, all non-winners → 0 (covers kyujo/non-sekitori). T1 RED→GREEN (`c658c77e`) |
| V13-B02 perf-gate red on all PRs | MEDIUM | **FIXED** — classified stale-baseline/env drift (local +9.3% vs CI's uniform +42% incl. doc-only PRs). `perf-gate.yml` baseline-update step now `always()` on main/develop with a file-exists guard → rolling baseline; PRs keep the 15% gate |
| V13-B03 `selectBloodlineRegistry` unconsumed | LOW | NOTED — standing dead-surface note, tracked among 108 orphans; no action |

## Excluded artifacts

- `.jules/*.md` journals on all PRs (`.gitignore:84` precedent — bots commit them anyway; stripped).
- Bot self-branding comments (`// ⚡ Bolt:`) — stripped on landing.
- #1128 entire payload (dup of #1123).
- #1130 prettier reformat churn + supplied `.snap` golden.
- #1135 ~75 files of rewrap churn across components/tests/perf — would have re-tripped `functionLengthBudget` (its `RikishiProfileBody` 153 LOC violation was the second CI failure).

## Test-first ledger

| Test | Status |
|------|--------|
| T1 consecutiveYusho contract | RED observed (2 failures: streaks 4→4, 5→5) → GREEN after fix |
| T2 deriveRecentAchievements characterization | GREEN before & after #1121 rewrite (10 pins) |
| T3 relocated runAutoSim | GREEN on arrival, 8/8, 6.1s wall |
| T4 selectBloodlineRegistry shape | GREEN both sides |
| T5 perf pin | n/a — no code regression (V13-B02 = gate repair) |
| T6 meta verification | GREEN post-relocation |

## Remote lifecycle

- `git push origin main` → remote `main` = `2fc34e2e` (verified via `gh api` before connectivity dropped).
- PR close + verdict-pointer comments: **#1122 confirmed closed.** The remaining 14 (#1121, #1123–#1135) and the 15 bot-branch deletions were **blocked by a local-network outage to GitHub** (api.github.com/github.com/codeload all time out at TLS/HTTP level while TCP 443/22 connect — general internet unaffected). The exact commands to finish the lifecycle are below; re-run once connectivity returns.
  ```bash
  for pr in 1121 1123 1124 1125 1126 1127 1128 1129 1130 1131 1132 1133 1134 1135; do
    gh pr comment $pr --body "Adjudicated in consolidation v13 — see docs/audit/consolidation-verdict-v13.md on main." && gh pr close $pr
  done
  git push origin --delete bard-recruiting-enrichment-1038114386566243049 bard-sansho-variety-13512128570325176178 bolt-optimize-narrative-event-scan-483572929435921084 bolt-single-pass-loops-9191217874434025863 curator-surface-title-streak-12406470757546144466 mason-bloodline-registry-type-8768170740440210195 mason-remove-dirty-casts-heyapreview-8402940354176023922 mason/tighten-heyapreview-stats-3130857035488264386 palette-add-aria-roles-to-progress-bars-10952993154771723012 palette/breadcrumbs-focus-visible-14012899311685939184 polish-empty-state-global-cup-dashboard-7418316092280754438 scout-test-runAutoSim-14129305039102389844 scribe-fix-sequence-impacts-doc-11543582086027584286 scribe/doc-getheyaroster-behavior-7112756200715976047 ux-recruit-specialist-focus-16450471578785458200
  git fetch --prune && gh pr list --state open && git ls-remote --heads origin
  ```

## V-ledger final dispositions

| # | Verdict | # | Verdict |
|---|---------|---|---------|
| V1 15 PRs ↔ 15 branches | APPROVED | V15 #1134 Object.values equiv | APPROVED |
| V2 substantive PR review | DISPROVED (boilerplate only) | V16 #1121 window semantics | APPROVED w/ correction (scanRecentEvents) |
| V3 `.jules` excluded | APPROVED | V17 #1131 loop semantics | APPROVED w/ correction (branding strip) |
| V4 test layout | APPROVED w/ stale-path correction | V18 #1124 tokens | APPROVED |
| V5 coverage floors 73/61/64/75 | APPROVED | V19 #1130 payload-only | APPROVED |
| V6 gate inventory + fnLenBudget | APPROVED | V20 #1135 unit-placement | DISPROVED → relocated to slow |
| V7 slow-suite import path | APPROVED | V21 #1122 ARIA | APPROVED |
| V8 scanRecentEvents canonical | APPROVED | V22 #1125 wiring | APPROVED |
| V9 baseline counts | PARTIALLY DISPROVED → measured 964/8,905 | V23 #1126 EmptyState | APPROVED |
| V10 low conflict risk | APPROVED | V24 #1129/#1132 a11y | APPROVED |
| V11 #1123≠#1128 | DISPROVED — byte-identical | V25→B01 streak reset | APPROVED → FIXED |
| V12 #1123 `unknown[]` fix | APPROVED | V26→B02 perf-gate | APPROVED → gate repair (not code) |
| V13 #1127 doc claim | APPROVED | V27 churn trips fnLenBudget | APPROVED (posture held: all landed fns ≤150) |
| V14 #1133 doc rewrite | APPROVED w/ correction | V28 meta-gate inventory | APPROVED |

## Deferred / out-of-scope items — all executed or explicitly disposed

- `test:e2e:soak` — deferred per standing convention (schedule/dispatch-gated by design, WS-K resolved).
- Full `bun run test:slow` suite — targeted run of the relocated file executed per plan (8/8); full slow suite remains nightly CI's job.
- Career-transformer test assertion for #1125 — skipped per plan rule (no transformer test file exists; typecheck is the gate).
- Optional a11y attribute assertions in existing component tests — evaluated per plan; no dedicated assertions added where component test files don't already assert DOM attrs (typecheck + existing a11y audit gates cover).
- CLAUDE.md refresh — executed (v13 status line, 966/8,921, perf-gate note); directory map already current.

## Pre-existing issues observed (not introduced, not in scope)

- React duplicate-key warning `faction-pressure` in golden-path e2e console output — pre-existing on main.
- BardEngine "token leakage" warnings on kimarite-percentage strings — pre-existing noise observed in smoke run.
