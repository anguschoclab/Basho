# Consolidation Verdict v11

**Date:** 2026-10-14
**Branch:** `consolidation/v11`
**Baseline:** `cd8388b1` (origin/main at Phase 0)
**Final HEAD:** pending merge (see §8)
**Companion docs:** `pre-consolidation-baseline-v11.txt`, `v11-pr-inventory.json`,
`bug-registry-v11.md`, `v11-red-phase.md`, `test-timings.json`

---

## 1. Scope & Method

Per the approved megaplan (`~/.devin/plans/plan-9030f4b0f78d04b8.md`), cycle v11
operated under zero backwards-compatibility constraints with a strict
test-first mandate: the plan was itself validated against the codebase before
execution (every draft finding approved/disproved inline in the plan), new
contract tests were written and observed failing **before** any implementation
landed, and the slow suite was deferred to ad-hoc runs per instruction.

| Stage                | Evidence |
| -------------------- | -------- |
| Phase 0 baseline     | `docs/audit/pre-consolidation-baseline-v11.txt` — typecheck clean, build green, lint strict clean, 932 files / 8,671 tests / 0 failures (46s), perf 11/11, basho+year determinism byte-identical, e2e smoke 3/3 |
| Phase 1 PR inventory | `docs/audit/v11-pr-inventory.json` — 34 PRs (23 bot feature/test/doc + 10 dependabot + consolidation), every comment thread boilerplate bot greeting, zero substantive human review |
| Phase 2 code review  | `docs/audit/bug-registry-v11.md` — 10 workstream greps (WS-A..WS-J): command-surface census, `uiWorldRevision` audit, determinism/purity scans, `as any`/`as unknown as` census, orphan audit, v9/v10 persistence checks |
| Phase 3 verdicts     | §3 below — every PR explicitly approved/disproved; Bolt cluster resolved by composing a canonical extractor rather than picking one branch |
| Phase 3.5 RED        | `docs/audit/v11-red-phase.md` — 11 contract tests + perf pin failing on missing `scanRecentEvents` before implementation |
| Phase 4 integration  | Payload-level cherry-picks as fresh commits; whole-branch imports refused (`.jules` journals excluded) |
| Phase 5 verification | §6 below — full gates minus slow suite |
| Phase 6/7            | Remote lifecycle + this document |

## 2. Test-First Evidence

RED-phase run (`bun run test` on the two new files): **11 tests failed** on the
missing `scanRecentEvents` export — each mapped to a specified contract
(newest-first ordering, `filterTypes`/`excludeHeyaIds`/`excludeTypes`,
min-count under-fill semantics, `stableTieBreak` parity with `queryEvents`,
membership parity on fully-distinct timestamps). Logged in
`docs/audit/v11-red-phase.md`; GREEN evidence appended after implementation.
No implementation preceded its failing test.

## 3. Per-PR Verdicts

### Bot feature/test/doc PRs (24)

| PR    | Title                                    | Verdict                              | Disposition |
| ----- | ---------------------------------------- | ------------------------------------ | ----------- |
| #1059 | Bard: pre-bout commentary enrichment     | **APPROVED — payload only**          | additive `prebout.json` variants, tokens verified against `templateTokenIntegrity`; `f7f172df` |
| #1060 | Scout: H2H record/report tests           | **APPROVED (verified green on main)** | pure coverage; `da3d0301` |
| #1061 | Curator: H2H streak badge                | **APPROVED — corrected**             | weak `(rec as {streak})` cast dropped — `streak` is a declared `H2HRecord` field; raw palette classes replaced with `text-success`/`text-destructive` after gate failure; `d128ab09` + `74c0174e` |
| #1062 | Scout: dedupe roll-off tests             | **APPROVED (verified green on main)** | pure coverage; `da3d0301` |
| #1063 | Bolt: single-pass backward EventFeed     | **SUPERSEDED**                       | folded into canonical `scanRecentEvents` (`f8d2851d`) |
| #1064 | Scribe: advance-day cap doc              | **APPROVED**                         | doc claim verified accurate; `d00bd36f` |
| #1065 | Polish: BoutLog EmptyState               | **APPROVED — payload only**          | correct `EmptyState` API usage; `d128ab09` |
| #1066 | Bard: H2H commentary enrichment          | **APPROVED — payload only**          | `f7f172df` |
| #1067 | Polish: save-slot empty state            | **APPROVED — payload only**          | `d128ab09` |
| #1068 | Bard: dohyo-iri enrichment               | **APPROVED — payload only**          | `f7f172df` |
| #1069 | Bolt: backward event-log extraction      | **SUPERSEDED**                       | folded into canonical `scanRecentEvents` |
| #1070 | Bolt: event-log UI retrieval             | **SUPERSEDED**                       | its backward-scan + defensive re-sort pattern informed the canonical helper |
| #1071 | Scout: exhibition basho RNG tests        | **APPROVED (verified green on main)** | pure coverage; `da3d0301` |
| #1072 | Scribe: training phase doc               | **APPROVED**                         | claim verified vs `phase01_week_training.ts:33-38`; `d00bd36f` |
| #1083 | Bard: Yokozuna bid press commentary      | **APPROVED — payload only**          | `f7f172df` |
| #1084 | Polish: GlobalCupWidget inactive state   | **APPROVED — payload only**          | `d128ab09` |
| #1085 | Bolt: O(1) event rendering               | **SUPERSEDED**                       | filter-then-fill semantics pinned in canonical helper contract tests |
| #1086 | Scribe: `updateH2H` mutation warning     | **APPROVED**                         | stale WARNING verified — function already returns `StateImpact` with spread copies (`h2h.ts:62,74,86-98`); `d00bd36f` |
| #1087 | Bolt: EventFeed processing               | **SUPERSEDED**                       | folded into canonical `scanRecentEvents` |
| #1088 | Bard: injury warning enrichment          | **APPROVED — payload only**          | `f7f172df` |
| #1089 | Mason: `as unknown as RankPosition`      | **APPROVED — corrected**             | `?? 1` (fabricates M1) replaced by canonical `toRankPosition` which throws on missing `rankNumber`; sort switched to `rankScore` convention; `ddc8683b` |
| #1090 | Scribe: `logEngineEvent` eviction return | **APPROVED**                         | doc claim verified (`events.ts:117-124`); `d00bd36f` |
| #1091 | Palette: notable-bouts keyboard expand   | **APPROVED**                         | real nested-button a11y violation fixed; `d128ab09` |
| #1092 | Bolt: `projectNPCAgentActivity` perf     | **APPROVED — adjusted**              | backward scan now skips player-heya events during collection (fixes under-filled feeds); regression test added; `⚡ Bolt:` branding comment dropped; `ddc8683b` |

### Dependabot (10)

| PR    | Bump                                   | Verdict      | Disposition |
| ----- | -------------------------------------- | ------------ | ----------- |
| #1073 | postcss 8.5.29                         | **APPROVED** | `be13da59`  |
| #1074 | vitest 5.0.3                           | **APPROVED** | `be13da59`; `@vitest/coverage-v8` pinned to 5.0.3 alongside to kill the mixed-version warning (`74c0174e`) |
| #1075 | @typescript-eslint/eslint-plugin 8.71.1 | **APPROVED** | `be13da59`  |
| #1076 | @radix-ui/react-separator 1.1.16       | **APPROVED** | `be13da59`  |
| #1077 | terser 5.51.2                          | **APPROVED** | `be13da59`  |
| #1078 | typescript 7.0.2                       | **REJECTED at gate** | TS7 removes the JS compiler API (`ts.isCallExpression`, `createSourceFile`, visitors) — 6 consumers break (`templateTokenIntegrity`, `deep-nesting`, 4 scripts); 480+ typecheck errors reproduced. `typescript` stays `^6.0.3` (API consumers only; typecheck runs on `@typescript/native`) |
| #1079 | @radix-ui/react-tooltip 1.3.0          | **APPROVED** | `be13da59`  |
| #1080 | @types/node 26.6.4                     | **APPROVED** | `be13da59`  |
| #1081 | @radix-ui/react-switch 1.3.8           | **APPROVED** | `be13da59`  |
| #1082 | framer-motion 14.0.0                   | **APPROVED (gated)** | accepted after `vite build` + `electron-vite build` + animated-component test sweep all passed on the major |

## 4. Bug Verdicts (bug-registry-v11.md)

### Confirmed & Fixed

| ID      | Finding | Verdict | Resolution |
| ------- | ------- | ------- | ---------- |
| V11-B01 | Residual `as unknown as` casts in MatchDayViewer beyond #1089's scope | **CONFIRMED — LOW** | `ViewerMatch` type declared; both casts dropped; `onBoutClick` resolves canonical `BoutMatchUI` via `boutId` lookup; sort via `toRankPosition`. `ddc8683b` |
| V11-B02 | Weak `(rec as {wins})` casts in `rivals.ts` | **CONFIRMED — LOW** | `rec` is already `H2HRecord` — all inline casts dropped to direct field access. `0178f1e7` |
| V11-B03 | CLAUDE.md status line stale ("860 files / 8,330 tests", v8-era) | **CONFIRMED — DOC** | Updated to 943 files / 8,759 tests in verdict commit |
| V11-B04 | `bug-registry-v10.md` header "(ongoing)" | **CONFIRMED — DOC** | Verified zero OPEN/DEFERRED entries (30 FIXED); marked CONVERGED. `0178f1e7` |
| V11-B05 | Untracked ` 2.*` duplicate files (`types 2.ts`, `rivals 2.ts`, `RikishiCombatTab 2.tsx`) rotting under tsconfig's `src/**` include | **CONFIRMED — HYGIENE** | Deleted; unimported macOS Finder-copy artifacts. `ddc8683b` |
| V11-B06 | typescript 7.0.2 (gate, not a repo bug) | **CONFIRMED — REJECTED** | See §3; pin retained |
| V11-B07 | Intermediate `entries[]` allocations in `new Map(list.map(...))` idiom | **CONFIRMED — LOW** | `toIdMap`/`toKeyedMap` in `src/engine/utils/collections.ts`; engine-wide conversion + UI hot paths + test fixtures; `banzukeSnapshot` `Object.fromEntries` → direct loop; drama-label passes → single-pass loops preserving skip-guard/clone-on-change. `d918d59f` |

### Assessed — Not Bugs

| ID  | Finding | Verdict |
| --- | ------- | ------- |
| A01 | `Math.random` grep hits | **DISPROVED** — cosmetic-only (kesho visual effects) or comments; no sim violation |
| A02 | `new Date` hits in `getSecondSunday` | **DISPROVED** — deterministic calendar math, no wall-clock |
| A03 | BardEngine missing-token warnings in tests | **DISPROVED** — test-fixture artifact (mock world lacks the heya); `enrichEventContext` resolves names from real entities |
| A04 | Worker `COMMAND_HANDLERS` coverage | **DISPROVED** — already gated by `commandSurfaceCoverage.test.ts` (green at baseline) |
| A05 | `uiWorldRevision` coverage on world writes | **DISPROVED** — every world-mutating slice case bumps it (bashoSlice :35–:122, `simulateSingleBout` :168, `LOAD_WORLD` :35) |
| A06 | 108 unreferenced exports | **DEBT** — matches baseline, gated by `unreferenced-exports.test.ts`; `KACHI_NOKIRI_THRESHOLD` noted for future sweep |
| A07 | `MigrationService` back-compat shims | **ASSESSED — keep** — zero-compat mandate permits removal but doesn't require it; retained as forward-version scaffolding |

## 5. Commits on `consolidation/v11`

| Commit     | Content |
| ---------- | ------- |
| `f8d2851d` | Canonical `scanRecentEvents` — consolidates 5 competing Bolt event-log extractions; `queryEvents` delegates; 3 components rewired; extraction perf pin (266×/124× faster) |
| `97713560` | Audit artifacts: baseline, PR inventory, bug registry, RED log |
| `d00bd36f` | Scribe doc payloads (#1064, #1072, #1086, #1090) |
| `da3d0301` | Scout test payloads (#1060, #1062, #1071) |
| `f7f172df` | Bard payloads (#1059, #1066, #1068, #1083, #1088) + golden snapshot regen |
| `d128ab09` | Polish/Palette/Curator UI payloads (#1065, #1067, #1084, #1091, #1061) |
| `ddc8683b` | Corrected Mason fix (#1089) + Bolt NPC projection (#1092) + cast hygiene (B01) + ` 2.*` excision (B05) |
| `be13da59` | Dependabot: 9 of 10 bumps accepted; typescript rejected at the gate (B06) |
| `0178f1e7` | Registry hygiene: close B01/B02, add B05/B06, mark v10 converged (B04) |
| `d918d59f` | B07 `toIdMap`/`toKeyedMap` allocation sweep (54 files) |
| `74c0174e` | Coverage cluster: +64-statement ratchet gap closed via targeted tests; Curator badge tokens; coverage plugin pin |

## 6. Final Gate Results

| Gate                     | Result |
| ------------------------ | ------ |
| `bun run type-check`     | PASS — clean |
| `bun run test` (full)    | PASS — 936→943 files / **8,758 tests / 0 failures / 1 skipped** |
| `bun run build`          | PASS — web + electron-vite renderer both green (framer-motion 14) |
| `bun run lint:strict`    | PASS — 0 warnings (eslint hooks also run per commit) |
| `bun run test:perf`      | PASS — 14/14 |
| Determinism basho + year | PASS — byte-identical post-integration on both horizons |
| Coverage (v8)            | PASS — **75.24 / 63.56 / 67.36 / 77.22** vs floors 75/61/64/73 — ratchet held, gap closed by tests not floor edits |
| `bun run test:e2e:smoke` | PASS — 3/3 (~23s) |
| `bun run test:slow`      | ⏭️ DEFERRED per instruction — runs ad hoc later |

### Gate-caught regressions fixed during verification

1. **Coverage ratchet** — first full coverage run measured 74.8% statements
   (64 short). Floor is marked "never lower", so the gap was closed by adding
   targeted tests for the paths this cycle touched (GlobalCupWidget, BoutLog,
   perceptionComponents, SaveSlotManagerSections, RikishiCombatTab +
   MatchDayViewer/EventFeed/EventLogPanel/NewsWidget/npcAgentProjections
   extensions). Final: 75.24%.
2. **Curator badge gates** — raw `text-green-500`/`text-red-500` palette
   classes + arbitrary `text-[9px]` size failed three design gates; replaced
   with `text-success`/`text-destructive` + `text-[10px]`.
3. **factoryDiscipline gate** — new UI test stubs named `makeWorld`/`makeRikishi`
   tripped the local-factory regex; renamed to `buildWorldStub`/`buildUiRikishi`
   (they are minimal prop stubs, not entity factories).
4. **vitest/coverage version skew** — `@vitest/coverage-v8` 5.0.1 vs vitest
   5.0.3 warning; plugin pinned to 5.0.3.
5. **` 2.*` duplicates** — macOS Finder-copy artifacts (`types 2.ts`,
   `rivals 2.ts`, `RikishiCombatTab 2.tsx`) were being typechecked and had
   rotted against v11 type changes; deleted (B05).

## 7. Known Caveats

- **Slow suite deferred** — `src/tests/slow/**` (subprocess audits, long sims,
  build-dependent gates) intentionally not run this cycle per instruction; runs
  ad hoc later.
- **Same-`(year,week)` tie order** in `scanRecentEvents` differs from legacy
  slice order by design (newest-push-first, canonical comparator) — asserted in
  contract tests; membership parity verified on fully-distinct timestamps.
- **typescript 7 deferred** — B06 documents the rejection; revisit when API
  consumers migrate to a TS7-compatible AST surface (tsgo API or alternative).

## 8. Verdict

**All approved payloads integrated; all confirmed bugs fixed; every finding
explicitly approved or disproved above; all gates green.** Test-first ordering
demonstrated with an observed red→green transition on the canonical extractor;
determinism byte-identical on both horizons post-integration; coverage ratchet
held at 75% and met by adding tests rather than lowering the floor.

**Remote lifecycle (verified via `gh`, 2026-10-14):** consolidation PR
[#1093](https://github.com/anguschoclab/Basho/pull/1093) merged as
`d6c48789` (merge commit, repo convention). All required branch-protection
checks passed (lint, build, typecheck); unit-tests, smoke, and CodeQL also
green. The advisory `perf-gate` check failed with S3_year p50 +49% — a
**CI-runner artifact, not a regression**: every recent perf-gate run fails
identically, including docs-only (Scribe, +128.7%) and a11y (Palette,
+132.6%) PRs; the committed baseline (1339.1ms) was seeded on a faster
machine. Local `bench-pipelines` on the merged HEAD measures S3 p50
1486.2ms (+11% vs baseline, under the 15% threshold). All 34 superseded
PRs closed with a pointer to this verdict; all 24 remote bot branches
deleted (10 Dependabot branches auto-deleted on PR close);
`git ls-remote --heads` confirms only `main` remains;
`gh pr list --state open` returns zero. Local `consolidation/v11` and
stale `scout-test-h2h-*` branch deleted. Repository consolidation is
complete.
