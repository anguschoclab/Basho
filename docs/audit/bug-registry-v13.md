# Bug Registry v13

Findings from the v13 workstream audit. Each bug carries severity + disposition. V13-B01/B02 were pre-seeded by the plan and verified against live code.

## Workstream results

| WS | Surface | Result |
|----|---------|--------|
| WS-A | Command surface: `COMMAND_HANDLERS` (engine.worker.ts:24) vs `sendCommand` call sites | ✅ Clean — all handlers composed from domain command modules; `commandSurfaceCoverage` meta gate enforces parity (green in baseline suite) |
| WS-B | `uiWorldRevision` bump coverage | ✅ Clean — every world-mutating bashoSlice case bumps `uiWorldRevision`; `useWorkerSync` propagates via `LOAD_WORLD` (bashoSlice.ts:23–168, gameReducer.ts:35) |
| WS-C | Determinism scan (`Math.random`/`Date.now` in engine) | ✅ Clean — comment hits only; `mathRandomScan` + `rngDeterminism` meta gates green |
| WS-D | Cast census | ✅ `as any`: 0 in production. `as unknown as`: 19 sites (v12: 14; +5 from post-v12 avatar/search commits — all data-boundary casts, acceptable). 3 removed by this cycle → 16 |
| WS-E | Orphan delta | ✅ 108 unreferenced exports — identical to v11/v12; no new orphans introduced by main |
| WS-F | `scripts/purity-lint.sh` | ✅ "No phase purity violations found" |
| WS-G | UI-honesty on touched components | ✅ a11y attributes mirror real visual state; `EmptyState` honest; "Title Streak" displays real field — **honest only after V13-B01 fix** (currently shows inflated counts) |
| WS-H | Perf classification | → V13-B02 |
| WS-I | Persistence surface | ✅ `consecutiveYusho` already on `Rikishi` (rikishi.ts:159), seeded in both factories; `RikishiCareerDTO.consecutiveYusho` added by #1125 is a presenter projection — no save-shape change. Zero-compat directive noted, none needed |
| WS-J | Doc drift | CLAUDE.md accurate post-v12 refresh; only "v12 consolidation" label → v13. Plan-stale paths (`src/test/megaplan/` etc.) confirmed absent |
| WS-K | e2e soak skip on PRs | ✅ Resolved — `e2e.yml:38` `if: schedule \|\| workflow_dispatch`, by design |
| WS-L | Meta-gate inventory | ✅ `noSubprocessInUnitTests`, `testTimingsBudget`, `factoryDiscipline`, `testTimeoutBudget`, `weakAssertionAudit` (meta/) + `functionLengthBudget` (audit/, ≤150 LOC ratchet) — all green at baseline |

## Bugs

### V13-B01 — `consecutiveYusho` never resets (severity: HIGH, data integrity)

**Evidence:** Incremented at `TournamentSimulator.ts:247` (persistBashoState winner block) — the only write site in `src/engine`. Zero reset sites. Consumed by `records.ts:184` (record book entries) and #1125's new "Title Streak" UI.

**Impact:** Every yusho a rikishi wins increments the streak; it never decrements on a non-winning basho. A rikishi with 5 career yusho spread across 10 years displays "consecutive: 5". Non-participants and kyujo rikishi also keep stale streaks.

**Fix spec (verified):** in `persistBashoState`, after the winner `+1` write, sweep `nextRikishiMap` (NOT `standings` — covers kyujo/non-participants too): for `id !== yushoWinnerId && r.consecutiveYusho` → set `{...r, consecutiveYusho: 0}`. Truthy guard keeps it O(affected).

**Test-first:** T1 `consecutiveYusho.test.ts` — RED confirmed (reset never happens).

**Disposition:** FIXED this cycle (Phase 4.3).

### V13-B02 — perf-gate red on all 15 PRs (severity: MEDIUM, CI signal integrity)

**Evidence:** `S3_year` p50 1339.1→~1902ms (+42%) on all PRs including doc-only #1127/#1133. Committed baseline is 2026-10-08, predating avatar commits. Local clean-main measurement: S3 p50=1464.3ms = **+9.3% vs baseline, under the 15% threshold**; p99 below baseline.

**Root cause:** stale committed baseline + CI runner drift — NOT an engine regression (a real +42% would reproduce locally). Circular-failure mechanism: `perf-gate.yml` re-seeds baseline on main only `if: success()` → stale baseline makes every run fail → baseline never refreshes.

**Disposition:** FIXED this cycle — baseline-update step changed to `if: always()` on main/develop so the baseline rolls forward each main push (re-seed stays CI's job on main; PRs keep the 15% gate vs a fresh baseline). No T5 needed (no code regression to pin).

### V13-B03 — `selectBloodlineRegistry` result unreferenced (severity: LOW, dead code note)

**Evidence:** #1134's .jules journal + inspection: zero consumers of `selectBloodlineRegistry` output (selector exists for a planned bloodline-traits UI surface).

**Disposition:** NOTED — not a bug; selector remains a valid projection for future UI. Orphan-audit counts it among the standing 108; no action.

## Non-findings checked and cleared

- #1123 vs #1128: byte-identical payloads (same blob hashes) — dedupe handled by landing once, not a bug.
- #1130 golden snapshot: PR-supplied `.snap` is untrusted per convention — regenerated locally (documented drift), not a bug.
- #1135's `RikishiProfileBody` 153-LOC over-budget: exists only on the PR branch's churn, not on main — excluded with the churn, not a bug on main.
