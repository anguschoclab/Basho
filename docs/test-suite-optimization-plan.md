# Test Suite Audit, Optimization & Reorganization — Implementation Plan

Status: implemented 2026-10-08 · Results: `docs/audit/test-optimization-verdict.md` · Baseline: `docs/audit/test-timings.json`

## Current state (measured, not estimated)

| Suite      | Location                 | Files   | Tests  | Duration                     | Trigger                            |
| ---------- | ------------------------ | ------- | ------ | ---------------------------- | ---------------------------------- |
| Fast unit  | `src/tests/unit/**`      | 866     | ~8,394 | ~25s (vmThreads + parallel)  | every change / PR CI               |
| Slow gates | `src/tests/slow/**`      | 11      | ~55    | ~174s                        | adhoc / nightly (`slow-tests.yml`) |
| Perf       | `src/tests/perf/**`      | 4       | —      | ~130s                        | adhoc / nightly                    |
| E2E smoke  | `e2e/` `--project=smoke` | 2 specs | 3      | ~2–4 min                     | adhoc                              |
| E2E soak   | `e2e/` `--project=soak`  | 2 specs | 2      | ~8–10 min                    | adhoc                              |

Already landed (do not redo): `src/tests/slow/` split, `vitest.slow.config.ts`, `pool: "vmThreads"` on all vitest configs, Playwright smoke/soak projects, nightly `slow-tests.yml`, `noSubprocessInUnitTests` guardrail.

## Known problem inventory (evidence gathered 2026-10-08)

1. **Duplicate local factories**: ~162 test files define their own `makeRikishi`/`mockRikishi`/`makeWorld`/`createWorld` despite canonical `MockFactory` (`src/tests/helpers/utils/MockFactory.ts`, ~118 consumers) and `src/tests/unit/engine/utils.ts` (`mockRikishi`, ~8 consumers).
2. **Duplicate fs-walk helpers**: 15 files each define `walk`/`collectFiles`/`findTsFiles`/`findMdFiles`/`listFiles`; 22 define a `readFile(join(SRC,...))` helper.
3. **Duplicate assertions**: the "WorldState fields must be read by UI" scan exists twice — `ci-gates.test.ts` (UI_READ_FIELDS/INTERNAL_ONLY_FIELDS) and `headless-playthrough.test.ts` (gameplayFields walk). Orphan-baseline JSON structure is asserted in both `orphan-audit.test.ts` (slow) and `ci-gates.test.ts` (fast).
4. **Redundant expensive work inside files**: `headless-playthrough.test.ts` runs the same 364-day `advanceDaysFast` **7 times** (once per `it`) on identical worlds — a shared `beforeAll` result would be ~6× cheaper. `lintStrictGate.test.ts` shells `bunx eslint .` twice; one `--format json` run answers both assertions. `orphan-audit.test.ts` runs `npx tsx scripts/audit-orphans.ts` ~4×; one run could feed all consistency checks.
5. **Misplaced files at `unit/` root**: `react-compiler-gate.test.tsx`, `bootstrap.test.ts`, `toolchain-version.test.ts`, `react-version.test.ts`, `ui-ref-forwarding.test.tsx`, `useref-types.test.tsx`, `vite-config.test.ts`, `ErrorBoundary.test.tsx` — no subdirectory; several belong under `build/` or `components/`.
6. **Fragile registry gates**: `ci-gates.test.ts` hardcodes expected audit filenames — every move/rename requires editing the gate (we already had to patch it once for the slow split).
7. **`fileParallelism: false`** remains the global ceiling — retained today only because `orphan-audit` (now in slow) writes fixtures into `src/` while knip/madge scan it. The *fast* suite may have no remaining writer tests, making parallelism a possible free win — needs verification, not assumption.

## Guiding principles

- **One command, one promise**: `bun run test` must stay under ~2 min; anything slower goes to `slow/` or `perf/`.
- **Canonical over local**: shared factories and fs helpers win over per-file definitions; local helpers only for custom signatures (already stated in `src/tests/helpers/README.md` — the plan makes it enforced).
- **Gates, not snapshots**: audit tests should assert invariants that fail when *new* violations appear — not hardcode file lists that rot.
- **Delete, don't embalm**: a test whose subject was removed is deleted outright; git history preserves it.

---

## Phase 0 — Instrumentation & baseline (do first)

Goal: replace anecdote with a durable timing artifact.

1. Add `scripts/report-test-timings.ts`: runs `vitest run --reporter=json --outputFile=<tmp>` for a suite, parses per-file/per-test durations, writes `docs/audit/test-timings.json` (file, durationMs, testCount, timestamp) and prints a top-50 table.
2. Run it for `test` (fast) and `test:slow`; commit `docs/audit/test-timings.json` as the baseline. This is what "before" means for every later optimization claim.
3. Enable vitest's `slowTestThreshold` (e.g. 2000ms) in `vitest.config.ts` so slow tests are flagged inline in every run.
4. Record secondary metrics: file count, test count, worker spawn count, `% environment` share (was 75% pre-vmThreads; ~6% now — guard against regression).

**Exit criteria**: a committed timings JSON + a reproducible command to regenerate it.

## Phase 1 — Dead & obsolete test audit

Goal: delete tests covering functionality that no longer exists, and tests that can never fail.

Method:

1. **Cross-reference subjects**: for each test file, extract the production symbols/paths it exercises (imports, string literals like file paths, script names). Flag tests whose subject file no longer exists — automate via a script (`scripts/find-dead-test-subjects.ts`) that greps imports and `join(SRC,...)`/`readFile` path literals and checks `existsSync`.
2. **Check the bug-registry ghosts**: many files are named after fixed bugs (`junYushoIdBug.test.ts`, `v7-ui-pins.test.tsx`, `boutResult.snapshot`, `engineReviewerSelfTest`). Each gets a verdict: still a live regression guard (keep), tautology that always passes (rewrite or delete), or pinned to removed behavior (delete).
3. **Tautology scan**: extend `weakAssertionAudit` (or a new audit) to flag tests whose assertions only exercise constants/mocks (`toBe(true)`, `toBeDefined()` on locally constructed literals, asserting properties of a static table without calling the code path). The `verify-implementation` skill documents this failure class — codify it.
4. **Registry-gate decoupling**: change `ci-gates`' "audit completeness" checks from `toContain("<exact filename>")` to directory-level invariants (min file count, each slow/audit file matched by `*.test.ts` glob in at least one suite config) so future moves don't require gate edits.
5. Produce `docs/audit/test-audit-findings.md`: table of every flagged file with verdict + evidence. Human review before any deletion — the exhaustive-review convention in this repo requires per-item CONFIRMED verdicts.

**Exit criteria**: findings doc reviewed; deletions applied via `git rm`; suite green; timings JSON regenerated showing delta.

## Phase 2 — Consolidate duplicate logic

1. **Shared fs helpers**: create `src/tests/helpers/fsScan.ts` exporting `findFiles(dir, exts)`, `readSrcFile(rel)`, `collectSrcFiles(root)` — migrate the 15 `walk` definitions and 22 `readFile` wrappers onto it. Delete the local copies.
2. **Factory convergence**: pick ONE canonical rikishi/world factory path (MockFactory — most consumers, richest API). Migrate `mockRikishi`/`makeMockWorld`/`makeMockHeya` callers in `engine/utils.ts` onto MockFactory or re-export it from there for backward compat. Then mechanically replace local `makeRikishi` factories in the ~162 files — use the `safe-codemod` skill: build the keep-set (local factories with genuinely custom signatures stay), codemod the rest, typecheck after.
3. **Dedupe the UI-read-fields gate**: `headless-playthrough` (slow) and `ci-gates` (fast) both walk presenters/pages/components asserting field names. Keep ONE — the fast version in `ci-gates` (it has the richer INTERNAL_ONLY_FIELDS classification); delete the fs-scan test from `headless-playthrough` (it's a sim file, not an audit file).
4. **Dedupe orphan-baseline assertions**: `orphan-audit` (slow) verifies the baseline structure end-to-end by running the script; `ci-gates` (fast) asserts file existence + JSON shape + summary/entry count agreement. Keep ci-gates' cheap shape checks; delete its existence+count assertions that orphan-audit covers live — or vice versa if the JSON-only check is judged sufficient alone. Decide once; document the decision.
5. **Collapse redundant sim invocations inside files**:
   - `headless-playthrough`: hoist `advanceDaysFast(world, 364, {autonomous:true})` into `beforeAll`, share `result` across the 7 `it`s → ~85% faster for the file.
   - `lintStrictGate`: run `bunx eslint . --format json` once; assert exit-0 equivalent (no `severity: 2` messages) AND zero suppressedMessages from the same output → halves the dominant slow-suite cost.
   - `orphan-audit`: run `audit-orphans.ts --json` once in `beforeAll`, reuse the JSON for the consistency/injection assertions.

**Exit criteria**: no two test files define the same traversal/read helper; single canonical factory set; timing delta recorded per change.

## Phase 3 — Structural reorganization

Target layout (extends today's convention rather than replacing it):

```text
src/tests/
├── setup/            global setup + env mocks (unchanged)
├── helpers/          factories, fsScan, boutTestHelpers, electronMocks
├── unit/             fast suite only
│   ├── engine/       mirrors src/engine subtree (already does)
│   ├── components/   mirrors src/components
│   ├── presenters/   mirrors src/presenters
│   ├── pages/        mirrors src/pages
│   ├── contexts/ hooks/ store/ lib/ utils/ electron/ constants/ routes/ build/ scripts/
│   ├── audit/        fast structural gates (pure fs/AST reads, no subprocess)
│   └── meta/         tests-about-tests: noSubprocessInUnitTests, testTimeoutBudget,
│                     audit completeness — anything validating the suite itself
├── slow/
│   ├── audit/        subprocess gates (eslint/knip/madge/tsx), bundleBudget
│   └── engine/       long-horizon sims (simulationInvariants, advanceCalendarDays,
│                     yokozuna*, headless-playthrough)
└── perf/             unchanged
e2e/                  unchanged (smoke/soak projects in playwright.config.ts)
```

Moves:

1. `unit/` root orphans → proper homes: `ErrorBoundary.test.tsx`, `ui-ref-forwarding.test.tsx` → `components/`; `react-compiler-gate.test.tsx`, `react-version.test.ts`, `toolchain-version.test.ts`, `vite-config.test.ts`, `bootstrap.test.ts` → `build/` (toolchain/build-constraint assertions); `useref-types.test.tsx` → `types/` or `build/`.
2. Create `unit/meta/`; move `testTimeoutBudget`, `noSubprocessInUnitTests`, `weakAssertionAudit`, the "audit completeness" describe (split into its own file if it drags ci-gates down — no, ci-gates is fast, keep whole file in audit/), `staleDocs`, `noObsoleteSnapshots`. Audit stays for production-code gates; meta is for suite-self gates.
3. Rename consistently: `*.test.ts` for all unit/slow; `*.perf.test.ts` enforced inside `perf/` (there's one `simulationDeterminism.test.ts` lacking the suffix — align it or document why the dir-glob makes the suffix decorative).
4. Update `src/tests/helpers/README.md` with the layout + naming rules; update `ci-gates` completeness check to the glob-based version from Phase 1.4 so moves don't churn it.

**Exit criteria**: zero files at `unit/` root except deliberate index-level tests; every dir has an obvious mapping to `src/` structure or suite role; `bun run test`, `test:slow`, `type-check` all green.

## Phase 4 — Performance optimization

Done already: `vmThreads` (75% env overhead → ~1–6%), slow split (simulationInvariants alone was 77% of the suite), nightly CI job.

Remaining, in order of expected value:

1. **Fast suite parallelism probe** — with the fixture-writing tests now in `slow/`, try `fileParallelism: true` on `vitest.config.ts` behind a branch/flag. Verify with 3 consecutive clean runs (order/timing flake check). If green: potentially 66s → ~15–25s on multi-core. If flaky: revert; document which files blocked it.
2. **Slow suite internal parallelism** — currently serial (required: orphan-audit writes into `src/` while knip/madge scan it). Options: (a) refactor orphan-audit's injection test to write temp fixtures under `node_modules/.cache/` or `tmp/` and point audit-orphans at it via an arg/env — removes the race, unlocks parallelism; (b) split slow into `slow/audit-io` (serial) vs `slow/*` (parallel). ~7min → ~3–4min.
3. **`--no-cache` audit** — `bun run test` forces `--no-cache`; measure whether removing it speeds repeated local runs materially; keep if it prevents stale-transform bugs seen historically (check git blame for why it was added).
4. **Coverage cost** — `test:coverage` (v8 instrumentation) historically inflates sim tests 2–4×; keep coverage runs pointed at the fast suite only (already true via config include/exclude — verify slow/perf are excluded from coverage include list).
5. **E2E**: not in scope for unit timing, but document in the plan that `test:e2e:soak` is the known-long pole (~10min) and stays adhoc by design.
6. Re-baseline: regenerate `test-timings.json` after each phase; final report in `docs/audit/test-optimization-verdict.md` with before/after table.

## Phase 5 — Guardrails so it doesn't regress

1. Extend `noSubprocessInUnitTests` → also fail if a `unit/` test calls `generateInitialWorld`/`runAutoSim`/`advanceDaysFast(>365)`/`simulateEntireBasho` with large params (static scan for the call patterns, not execution).
2. New `meta/` gate: **file-duration budget** — reads `test-timings.json` (committed, refreshed by the timings script) and fails if any `unit/` file exceeds e.g. 5s. Prevents slow-file creep automatically.
3. New `meta/` gate: **factory discipline** — fail if a test file defines a local `make*Rikishi*`/`mockRikishi`/`makeMockWorld` that duplicates a canonical signature (grep-level check, allow-listed exceptions documented inline).
4. CI: `slow-tests.yml` already runs nightly — after Phase 4.2, add a `concurrency` group to cancel superseded runs.

## Work order

1. Phase 0 instrumentation → baseline committed
2. Phase 2.3 + 2.5 quick wins (inside-file dedup — isolated diffs, immediate timing proof)
3. Phase 1 dead-test audit → findings doc → reviewed deletions
4. Phase 2.1/2.2 helpers + factories (biggest diff; safe-codemod)
5. Phase 3 reorg (directory moves, gate update, docs)
6. Phase 4 perf probes (parallelism, cache, orphan-audit isolation refactor)
7. Phase 5 guardrails + final verdict doc

## Risks & non-goals

- **False "dead" verdicts**: the repo's own history (v8/v9 audits) shows tests flagged dead that were live — every Phase 1 deletion requires the findings doc + human review, never bulk removal.
- **Shared-state flakes under parallelism**: `fileParallelism: true` is a probe, not a commitment; revert path is a one-line config change.
- **Factory codemod**: mechanical replacement can corrupt tests relying on subtle local defaults (e.g. a local `makeRikishi` defaulting `division: "juryo"`). safe-codemod keep-set + per-file review of defaults prevents this.
- **Not in scope**: rewriting e2e helpers, changing coverage thresholds, adding new test infrastructure (e.g. `@vitest/webdriver`), migrating off vitest.
