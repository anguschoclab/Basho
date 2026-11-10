# Consolidation Verdict — v19

**Date:** 2026-11-10
**Branch:** `main` (direct-to-main per directive; no consolidation branch)
**Scope:** Delta review over v18's ~1,129-file baseline — open PRs, stale
branches, ~25 registered DEBT items, second-pass over the 82 files v18 touched,
plus full gate-matrix verification. Zero backwards-compatibility constraints.

**Commits landed (this pass):**

| Commit | Payload |
|--------|---------|
| `5cc09492` | Phase-B test-first: 21 failing-first regression pins (`v19Regressions`), all verified RED for the intended reason |
| `e16cf493` | DEBT burn-down — seeds, ceilings, canonical fields, version gate (+ #1201 payload) |
| `d552a0ae` | (owner) swept working tree: S10 dead-code + UI honesty + gate fixes + indexed-structure perf + Jules migration |
| (tail) | Phase-D gate repairs: stop-condition fix, self-contained knip/circular/bundle gates, orphan-tracker registration, artifacts |

## PR verdict

| PR | Verdict | Disposition |
|----|---------|-------------|
| #1201 `allocateVacancies` optimization | **APPROVED** | Semantics-preserving rewrite verified by 14/14 parity pin + independent bench (~30%); payload applied to `main`; PR closed with comment |

All 11 stale origin branches verified to carry **zero unintegrated payload**
(the only non-junk hunks — a "Pro Debut" header — already exist on `main` in a
superior third form). Branch cleanup executed at closeout.

## Gate matrix

| Gate | Result |
|------|--------|
| `bun run type-check` | ✅ clean |
| `bun run lint:commit` | ✅ 0 errors (2 warnings fixed via `cause` attachment) |
| `bun run build` | ✅ ~18s |
| `bun run test` (fast) | ✅ 1055 files / 9,712 tests / 1 skip |
| `bun run test:perf` | ✅ 5 files / 14 tests — 56s (yokozunaPromotion 344s timeout → ~50s after V19-B1 fix) |
| `bun run test:slow` | ✅ 18 files / 64 tests — incl. determinismDoubleRun basho+year |
| `bun run test:e2e:smoke` | ✅ 4/4 (1.3m) |

## Findings approved / disproved (delta + DEBT)

The full per-item table lives in `_v19-review-notes.md` and
`bug-registry-v19.md`. Headline:

- **Every registered DEBT item dispositioned**: 20 FIXED (pinned), 2
  DEBT-RENEWED (S6-5b unreachable-via-pipeline, S7-49 structural tuning),
  remainder NON-ISSUE (test-only coverage pins) or already-landed v18 work
  re-verified correct.
- **S10 dead-code pass executed** against the corrected list: 15 removals
  (dead fns, fields, reducer action, whole files) + paired test/manifest
  updates; 9 claimed-dead items DISPROVED and kept (`validatePath`,
  `rpPerception`, `shouldHireStaff`, `isAtForeignLimit`, almanac test-only
  exports, `favorTarget`, `ensureCandidatePoolState`, `capitalize`).
- **Migration service**: chained migrations replaced by a version gate —
  current save version accepted, all others rejected (zero back-compat scope).
- **Phase-D discoveries** (new bugs found during verification): V19-B1
  unreachable autosim promotion stop-conditions, V19-B2 knip gate that could
  never run, V19-B3 madge stderr marker, V19-B4 rolldown bundle-manifest
  drift, V19-B5 orphan-tracker missing entry. All fixed.

## Architectural verdicts

- **Worker-command path: VINDICATED again** — no new reducer-slice engine
  writes; the dead `SIM_FULL_BASHO` reducer path removed (live UI already
  routed via `TICK_MULTIPLE_DAYS`).
- **Deterministic seeded RNG: HOLDS** — `Math.random(` has zero call sites in
  `src/engine`; S5-4/S5-5 closed the last seed-collision/leak paths.
- **Effective-ceiling semantics: CORRECTED** — `getEffectiveCeiling`
  (talent/PA/maturity) replaces the flat `MAX_STAT_CEILING` in mentorship +
  sparring; above-ceiling stats are preserved, never silently reduced.
- **Ratchet policy: UPHELD** — `promoteIntake` was split (`buildPromotedRikishi`)
  rather than added to `KNOWN_OVERBUDGET`.
- **Audit-gate honesty: HARDENED** — every subprocess gate is now fail-closed
  AND actually runnable in-repo (knipGuard no longer depends on an absent tool).

Determinism check: `Math.random(` — zero call sites in `src/engine` ✅

## Remaining debt

- S6-5b loan-id seq jump (latent, unreachable via resolved pipeline)
- S7-49 structural tuning question
- V17-D01/D02 carried items (duplicate MH-* ids, myoseki dangle) — not
  reproduced in this run's simInvariants
