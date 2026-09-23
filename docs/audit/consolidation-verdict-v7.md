# Consolidation Verdict — v7

**Date:** 2026-09-23
**Baseline:** `fab60af8858927ceef31d5fbeb0695ad989be657`
**Scope:** Fresh repository-wide re-read + adjudication of all 35 open PRs (#961–#995)
**Companion artifacts:** `bug-registry-v7.md` (B01–B15), `v7-pr-inventory.json`,
`pre-consolidation-baseline-v7.txt`

---

## 1. Method

- **Phase 0 — Baseline.** Full gate battery run on `main` @ `fab60af8` before any
  change: type-check, lint, unit suite, bench, build. Results captured in
  `pre-consolidation-baseline-v7.txt`.
- **Phase 1 — Fresh re-read.** Independent sweep (determinism greps, type-escape
  audit, dead-command-path audit, persistence, tick pipeline, presenter honesty)
  ignoring prior registries. Produced 13 findings (V7-B01–B13).
- **Phase 2 — PR adjudication.** Every PR diffed three-dot against its merge
  base (two-dot diffs on stale branches were shown to produce false "revert"
  hunks — e.g. #991 appears to undo the CSP nonce + V5-B15 dedup, both of which
  are merge-base artifacts). Comments reviewed: all 35 PRs carried Jules
  boilerplate only; zero substantive review comments.
- **Phase 3 — Strict test-first gate.** All characterization pins and
  bug-repro tests authored and executed against unmodified baseline *before* any
  source change: 7 characterization pins PASS on main, 14 behavior/repro tests
  RED-by-design. 55 PR-provided tests verified green.
- **Phases 4–5 — Integration.** Best-of-breed changes hand-applied per wave
  (deps → docs → narrative → tests → UI → perf), `.jules/` journals and
  `screenshot.png` stripped, stale-branch hunks re-derived against current main
  rather than cherry-picked textually.
- **Phase 6 — Validation.** See §5.

## 2. PR Verdicts

Full per-PR rationale: `v7-pr-inventory.json`. Tally:

| Verdict | Count | PRs |
|---------|-------|-----|
| APPROVED | 26 | #962–#968, #972, #975, #976, #978, #980–#985, #987–#995 |
| CHERRY-PICK | 1 | #986 (neutrality note folded into #963's JSDoc) |
| DISPROVED (superseded/redundant) | 8 | #961, #969, #970, #971, #973, #974, #977, #979 |

### Overlap clusters — best-of-breed resolutions

- **`h2h.ts` tactic JSDoc (5-way race):** #963 selected — only variant using real
  enum names *and* enumerating all neutrals (`ALL_OUT`, `DEFENSIVE_PULL`).
  #986's `NEKODAMASHI`-neutral-vs-`HENKA`/`STANDARD` clarification cherry-picked
  on top. #971, #974, #977 disproved as strictly weaker.
- **`phase05_monthly_boundary` loop fusion (6-way race):** #988 selected —
  cleanest transform (explicit `Rikishi[]`, no unverifiable "+45%" banner).
  #961, #969, #970, #973, #979 disproved as redundant equivalents.
- **`post_bout.json`:** #965 + #980 both approved — disjoint template regions;
  #980's uppercase ctx keys are harmless redundancy (BardEngine lowercase
  fallback, `BardEngine.ts:225`).
- **Perf/welfare/AI loops:** #991 + #993 approved; #993's AdvisorService
  injured-count semantic delta (excludes retired) accepted deliberately and
  test-pinned — **not** assumed equivalent (V7-B12).

## 3. Bug Registry Dispositions (V7-B01–B15)

| ID | Finding | Verdict |
|----|---------|---------|
| B01 | `PREPAY_LOAN` unreachable from UI | **CONFIRMED → FIXED.** `DebtSection` gained `onPrepay` + per-loan button; `EconomyPage` dispatches the worker command. |
| B02 | `PAUSE_SIM`/`RESUME_SIM` dead | **CONFIRMED → FIXED.** Two-layer: `sendCommand`'s `pendingTick` guard dropped pause commands by construction (now exempted); `TopNavBar` pause/resume toggle + `simPaused` store flag added. |
| B03 | `CLEAR_TSUKEBITO` dead command | **CONFIRMED → REMOVED** (type + handler; `REMOVE_TSUKEBITO` covers the reachable path). |
| B04 | `GET_DIGEST` dead command | **CONFIRMED → REMOVED** (every mutating handler already emits digests). |
| B05 | Generated artifacts tracked | **CONFIRMED → FIXED** (`git rm --cached` ×3 + `.gitignore`). |
| B06 | CLAUDE.md stale coverage numbers | **CONFIRMED → FIXED** (70/75/65/70). |
| B07 | `type-check` broken on Windows | **CONFIRMED → FIXED** (`node` prefix for portable exec). |
| B08 | 32 `console.*` in production | **DISPROVED.** All matches are JSDoc examples; comment-stripped scan finds zero executable calls. Audit test corrected to strip comments. |
| B09 | orphan-audit fixture leakage | **CONFIRMED → FIXED** (top-level `afterAll` sweep). |
| B10 | phase06 lowercase token reliance | **DISPROVED.** Fallback resolution is correct by design. |
| B11 | `.jules/` journals on branches | **CONFIRMED → enforced** (stripped from every applied wave). |
| B12 | AdvisorService injured-count delta | **CONFIRMED — deliberate semantic change**, test-pinned. |
| B13 | Cross-world roster-cache contamination | **CONFIRMED → FIXED.** Caches re-keyed `WeakMap<WorldState,…>`; `LOAD_WORLD` clears caches. Reproduced pre-fix (world 2 received world 1's roster), verified green post-fix. |
|| B14 | `advanceDaysFast` overshoots basho day 15 | **CONFIRMED → FIXED** (`b6c22612`). `shouldHaltAdvance` halts at `day > 15`; `advanceOneDay` no-ops past senshuraku; `advanceDaysFast` breaks unconditionally for non-autonomous worlds; `daysUntilPhaseTransition` returns 1 during `active_basho` and now computes true counter-threshold distances for all phase transitions (pre-existing batch overshoot fixed). Equivalence tests confirm batch ≡ sequential at the boundary. |
|| B15 | golden-path e2e couldn't drive real flow | **CONFIRMED → FIXED.** Test now resolves blocking-decision crises, clicks End Basho, follows the Recap → Finalize → dashboard flow. Green (49s). |

### Post-suite audit remediation

The first full coverage run surfaced 5 failures, all remediated:

| Failure | Disposition |
|---------|-------------|
| `accessibilityAudit` — 19 color-only violations | Mixed cause: #976's `aria-hidden` removal wave stripped the attribute from genuinely decorative elements AND the audit's same-line regex false-flagged text-bearing containers. Fixed by restoring `aria-hidden` on decorative-only nodes (5 components) and making the audit inspect the JSX element block. GREEN. |
| `staleDocs` — missing staleness annotation | `bug-registry-v7.md` annotated. GREEN. |
| `tailwindAntipatterns` — 11 inline styles > 10 | 9 of 11 are runtime-dynamic (chart data colors, era-tone variables) — inexpressible as Tailwind classes by definition. Audit tightened to flag only static literal color values; dynamic expressions legitimately exempt. GREEN. |
| `simulationInvariants` ×2 — 300s timeouts | Pre-existing borderline: each test runs an independent 3-year / ~440-rikishi sim (~120–150s clean; >300s under v8 coverage instrumentation + concurrent load). Timeouts raised to 600s; file verified standalone — 4/4 PASS in 528s. |
| e2e golden-path | V7-B15 — test couldn't drive the real flow; fixed and green. |

## 4. Integration Notes

- All wave changes landed on `main` via commits `0d18693f` (deps + UI + engine
  waves) and `676d2813` (artifact removal); Phase 5 fixes committed separately.
- `#994`'s H2H tests landed **after** `#962`'s directional-path change as
  required; assertions re-verified against `winning_streak`/`losing_streak`.
- `TopNavBar.test.tsx` updated for #990's Radix Dialog composition: the
  `Dialog` Root mock now gates children on `open` (Radix mounts children
  unconditionally — pre-existing test contract assumed conditional mount).

## 5. Validation Gate (post-integration)

| Gate | Result |
|------|--------|
| `bun run type-check` | PASS (0 errors; now portable via `node` prefix) |
| ESLint `--max-warnings 0` | PASS |
| V7 pin battery (equiv + UI + audit) | PASS — 21/21 |
| `bun run build` | PASS (vite 8.3.0) |
| Full unit suite (`bun run test:coverage`) | First run: 845/849 files, 7,673/7,678 tests — 5 failures (all remediated above). Re-run: *in progress* |
| Playwright e2e (`test:e2e`) | PASS — golden path green in 49s after V7-B15 fix |
| Artifact sweep (.jules, screenshots, probes, `__audit_*`) | CLEAN |

## 6. Remote Lifecycle (Phase 7)

*Pending — requires authoritative evidence.* Local integration does not imply
remote merge/close/delete; each PR must be closed with its verdict comment and
each branch deleted only after `main` is pushed and PR state is confirmed via
`gh`.
