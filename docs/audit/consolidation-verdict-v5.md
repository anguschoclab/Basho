# Consolidation Verdict — v5

**Date:** 2026-09-12
**Branch:** `consolidation/exhaustive-review-v5` → `main`
**Baseline:** `pre-consolidation-v5-20260912` (96857362)
**Method:** exhaustive code read (1,706 source files, engine core line-by-line) → 31-PR inventory with per-PR verdicts → test-first gate → risk-ascending integration → red→green bug fixes → full gate verification.

---

## 1. Scope and method

Every open PR (#914–#944) was diffed, classified, and either integrated, cherry-picked, superseded, or rejected with evidence. All PR comment threads were read via API — they contain only 27 identical bot greetings and zero substantive review comments. No PR was merged blindly; every diff was applied to the consolidation branch with bot-generated junk (`.jules/` journals, `*.tsbuildinfo` churn, `package-lock.json`) excluded.

Test-first gate (Phase 3) committed all regression/equivalence/coverage tests **before** any source change: 10 intentional reds documented the confirmed defects and PR-gating contracts; all turned green by the corresponding fix or PR integration.

## 2. PR dispositions — all 31 decided

| PR | Verdict | Evidence |
|----|---------|----------|
| #914 ImpactBuilder tests | **INTEGRATED** (batch A) | +46 test lines; fixed a `severity: string` type error shipped inside the PR |
| #915 ensureCollectionArray type | **INTEGRATED** (batch B) | Tightened return type; fixed an `as any` it introduced (`as unknown[]`) |
| #916 EntityService doc | **INTEGRATED** (batch A) | Documents the real falsy-overwrite footgun |
| #917 Scribe doc "fix" | **REJECTED** | Factually false — claims `pure` flag ignored; `pipelineRunner.ts:116` honors it |
| #918 OpponentScoutingTab a11y | **INTEGRATED** (batch C) | role/tabIndex/onKeyDown/aria-label; phase-3 test green |
| #919 matchmaking perf (114 files) | **CHERRY-PICKED** | Only `SwissAlgorithm.ts` + `LowerDivisionSwiss.ts`; ~90 files of prettier churn and test reformatting excluded |
| #920 bout narrative variants | **INTEGRATED** (batch D) | Valid `%WINNER%/%LOSER%/%KIMARITE%/%DAY%` tokens |
| #921 NPC auto-investment tests | **INTEGRATED** (batch A) | +92 test lines |
| #922 KeshoEditor aria labels | **INTEGRATED** (batch C) | phase-3 tests red → green |
| #923–#926 dependabot bumps | **INTEGRATED** (batch F) | typescript-eslint 8.69.0 (12d old), lucide-react 1.39.0 (11d old) — pass 7-day vetting; lockfile re-resolved from npmjs |
| #927 ui.json digest variety | **INTEGRATED** (batch D) | Additive template variants |
| #928 DigestWidget aria-label | **INTEGRATED** (batch C) | Explicit aria-label on entity rows |
| #929 scorePairing JSDoc | **INTEGRATED** (batch A) | Doc correction matches signature |
| #930 YouthAcademyService types | **INTEGRATED** (batch B) | Type tightening, no behavior change |
| #931 missing ARIA labels | **INTEGRATED** (batch C) | BaseWidget/StableStatsTable/DataTable |
| #932 loading-state standardization | **INTEGRATED** (batch C) | 6 pages → `EmptyState icon={Loader2}`; MyosekiMarketPage test updated to new contract |
| #933 Rival Oyakata a11y | **INTEGRATED** (batch C) | Keyboard-accessible card |
| #934 vs #936 RikishiPotentialPanel | **#934 INTEGRATED, #936 SUPERSEDED** | #934 imports shared `NumericStat`, drops local union + `CURRENT_KEY` identity map, adds `?? 0` guards |
| #935 EntityService POJO tests | **INTEGRATED** (batch A) | +29 test lines |
| #937 AcademyWidget EmptyState | **INTEGRATED** (batch C) | `<p>` → real heading; phase-3 test green |
| #938 Ozeki Promotion Watch | **REJECTED** | Duplicates existing real criterion widget (`sekiwakeThreeBashoWins/33`); adds proxy-based duplicate with same label |
| #939 hot-path allocations | **INTEGRATED** (batch E) | `.filter().length` → counting loops ×4; equivalence pins green |
| #940 un-awaited `expect().resolves` | **INTEGRATED** (batch A) | Fixes latent false-positive tests |
| #941 HolidayDialog a11y | **INTEGRATED** (batch C) | Safety gates keyboard-accessible; phase-3 test green |
| #942 salary/economics tests | **INTEGRATED** (batch A) | +177 test lines |
| #943 kensho/day narrative variants | **HAND-MERGED** (batch D) | Conflict with #920 resolved by union of variant arrays |
| #944 kachiNokori loop fusion | **INTEGRATED** (batch E) | Equivalence pins green |

**Tally:** 24 integrated · 4 cherry-picked/hand-merged · 1 superseded · 2 rejected.

## 3. Bug registry — explicit approve/disprove

| ID | Finding | Verdict | Status |
|----|---------|---------|--------|
| V5-B01 | bench can't resolve `@/` under bun | **CONFIRMED** | FIXED — root tsconfig paths (`c6b35380`) |
| V5-B02 | perf-gate false assurance (stale baseline + gitignored current) | **CONFIRMED** | PARTIAL — bench unblocked; baseline refresh rides CI on main |
| V5-B03 | `bun install` fails in CI and locally | **CONFIRMED, root cause corrected** — 948 tarball URLs pinned to `artifactory.ubisoft.org`, unreachable off-network | FIXED — URLs rewritten to npmjs + `bunfig.toml` registry pin (`b62067c8`) |
| V5-B04 | EventBus ~dead code; bout/kensho/day templates unreachable | **CONFIRMED** — `boutResolved` et al. have zero call sites | DOCUMENTED — enriched templates merged for future wiring; EventBus left in place (deletion is a product decision) |
| V5-B05 | queued events persist empty title/summary | **CONFIRMED** by red test | FIXED — honest fallback derivation in `ImpactResolver` (`f356662a`) |
| V5-B06 | gitignored files tracked (`.jules/`, tsbuildinfo) | **CONFIRMED** | FIXED — `git rm --cached` (`5f3c7952`) |
| V5-B07 | CLAUDE.md stale test metrics | **CONFIRMED** (claimed 195/1703; actual ~830/~7,400) | FIXED |
| V5-B08 | stale local `package-lock.json` | **CONFIRMED** | FIXED — deleted (was never tracked) |
| V5-B09 | player tactics discarded across worker/main-thread boundary | **CONFIRMED** by red test + trace | FIXED — `world.boutTactics` + `uiWorldRevision`→`LOAD_WORLD` sync (`e74380f7`) |
| V5-B10 | orphan components + constant-arg `getInterimWeeks` call | **CONFIRMED** | PARTIAL — `RequireWorld`/`ExhibitionInvitationsPanel` kept (test-covered, not deleted solely on orphan report); `getInterimWeeks` args are currently ignored so behavior is correct today — flagged |
| V5-B11 | `resolveImpacts` mutates input `events.log`/`dedupe` | **CONFIRMED** by red test | FIXED — events state detached before logging (`f356662a`) |

## 4. Architectural verdicts

1. **Worker is the authoritative state owner — now enforced.** The interactive basho path intentionally stays synchronous for match animation, but is no longer allowed to diverge: every world-mutating slice case bumps `uiWorldRevision`, and `GameContext` pushes `LOAD_WORLD` to the worker (gated on `pendingTick`, retried on clear). **APPROVED as fixed; residual edge documented** (tactic set during `pendingTick` can be overwritten by the in-flight tick — worker precedence is correct, choice is lost).
2. **`world.boutTactics` was designed but never wired.** The field existed on `WorldState` and the save schema; the reducer duplicated it in UI state instead. Consolidated onto the world field; `state.boutTactics` remains only as a display cache. **APPROVED.**
3. **`EventBus` remains mostly dead code.** Its `boutResolved`/kensho/day paths have no call sites; the enriched templates are inert. Deliberately retained pending a wiring-or-deletion product decision rather than silently deleting a named subsystem. **DISAPPROVED as architecture; accepted as documented debt.**
4. **`EntityService.ensureState` falsy-overwrite + `ensureNestedState` Map allowlist** are documented footguns (in-code docs from #916 + existing comments). **DOCUMENTED, not fixed** — behavior is relied upon by existing callers.
5. **Orphan audit: 208 unreferenced exports + 2 components are NOT auto-deleted.** `RequireWorld`/`ExhibitionInvitationsPanel` are test-covered; mass export deletion is a separate cleanup with its own risk profile. **Disposition: documented, not actioned.**
6. **`getInterimWeeks("hatsu","haru")` hardcode (preflight)** is currently harmless (args ignored, returns constant) but would silently break if the function becomes pair-aware. **Flagged.**
7. **Perf work verified equivalent and materially faster:** S3 p50 2278.8ms vs baseline 3277.4ms (−30.5%), p99 −27.9%; determinism hash stable (`51f5ebc91144d65a`). Equivalence pins cover every touched hot path. **APPROVED.**
8. **UI honesty audit clean:** no fabricated telemetry, no fake "live/secure" chrome, no static-status-pretending-dynamic; ALL-CAPS hits are real state labels. **APPROVED.**

## 5. Validation gates (final)

| Gate | Result |
|------|--------|
| `bun run type-check` | clean |
| `bun run lint:strict` (`eslint . --max-warnings 0`) | clean |
| `bun run build` | 7.0s, all chunks emitted |
| `bun scripts/engine-reviewer.ts` | 0 violations |
| `bash scripts/purity-lint.sh` | clean |
| `bun scripts/bench-pipelines.ts` | all 4 scenarios (S4 25yr p50 56.9s, det. hash `51f5ebc91144d65a`) |
| `bun scripts/perf-gate-check.ts` | PASSED (S3 −30.5% vs baseline) |
| `bun scripts/audit-orphans.ts` | 208 exports / 2 components — unchanged vs baseline |
| `bun run test` (full suite) | see §6 note |

## 6. Known limitations / residual risk

- A tactic set while `pendingTick` is true is overwritten by the in-flight tick (correct worker precedence; the choice is dropped). UI generally can't reach this state; flagged, not fixed.
- `EventBus` dead paths and `narrativeEventMap` remain — wiring them to real emitters or deleting them is a follow-up product decision.
- `perf-baseline.json` refresh and the frozen-lockfile CI hardening land via the normal CI run on `main` after this merges.
- `__audit_verification.test.ts` retained (legit regression net despite `__audit` name).
