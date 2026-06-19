---
name: verify-implementation
description: Rigorously verify that a claimed-complete change actually works — use whenever someone says a feature/plan/PR is "implemented", "done", "fixed", or "tests pass", or asks you to verify/confirm/QA a change. Green tests are NOT proof. This skill makes you trace the full vertical slice, run independent empirical checks, grep for determinism violations, run the FULL suite (not just targeted tests), bisect regressions to root cause, and re-confirm your own findings before reporting. Use it proactively before claiming any work complete in this repo.
---

# Verify Implementation (brutal honesty)

The job is to find out whether a change **actually does what it claims** — not whether it compiles, not whether the new tests are green, not whether the author says it's done. In this codebase, every one of those signals has been wrong while the feature was broken. Treat "implemented" as a hypothesis to disprove.

## Prime directive: green tests ≠ working feature

A passing suite tells you the code the author chose to test behaves the way the author chose to assert. It says nothing about whether the test is meaningful, whether the feature reaches the player, or whether something else regressed. Verify the **substance**, then trust the tests as a secondary signal.

## The failure classes to hunt

These are the real defects this repo has shipped behind green suites. Look for each one by name.

1. **Tautological tests.** A test that asserts properties of a static table (`ALL_OUT.modifier > STANDARD.modifier`) and never executes the behavior it claims to cover. It passes forever and proves nothing. **Counter:** find the test that supposedly covers the feature and ask "does this actually run the engine path and observe an outcome?" If not, write a real one (see "Independent empirical checks").

2. **Vertical-slice gaps — the feature exists at every layer except the one the user touches.** The engine function, the worker handler, and the types all exist — but no UI dispatches it, so the player can never trigger it. (Governance rulings and media events sat fully built-but-unreachable for months.) **Counter:** trace the slice end-to-end (below). A feature is not done until a real user action reaches the engine and a result reaches the screen.

3. **Determinism violations.** `Math.random()` or `Date.now()` anywhere in `src/engine`, or a player/tactic choice folded into an RNG seed string. These silently break replay and save/load — the engine's core guarantee — and the suite stays green. **Counter:** grep (below). Choices must modulate weights/probabilities *within* the existing seeded RNG sequence, never change the seed.

4. **Dual-command-path stranding.** This repo has two command paths: the legacy reducer slices (`src/contexts/*Slice.ts`) and the canonical Web Worker (`src/engine/worker/engine.worker.ts` `COMMAND_HANDLERS`, dispatched via `useGameStore(s => s.sendCommand)`). A handler that exists only in the legacy path, with no UI dispatch, is dead. **Counter:** confirm the live path is the worker; treat reducer-only engine mutations as suspect.

5. **Hidden regressions.** A change can pass its own targeted tests while breaking a long-horizon integration test (e.g. the 12-basho AutoSim yokozuna test). **Counter:** always run the FULL suite, never just the files the author touched.

6. **Your own false positives and plan errors.** Twice in this codebase the "bug" was a mistake in the verification itself: an empirical test that called `resolveBout` without passing the tactic the way the real caller does (so all variants ran as STANDARD), and a plan that ordered deletion of a "dead" phase that was actually a live 177-line recruitment system. **Counter:** before reporting a defect, re-confirm it the way production actually exercises the code, and check `git log --follow` / file history before ever calling something dead code.

## Verification procedure

Work top to bottom. Don't skip to "run the tests" — that's step 4 of 6.

### 1. See exactly what changed
```bash
git status --short
git log --oneline -10
git diff --stat HEAD~<n>      # n = commits since the work started
```
Read the diff, not just the summary. Note new files, deletions, and which layers were touched. A deletion you don't understand is a red flag — investigate before accepting it (`git log --follow -- <path>`; a file with a long history is not "new dead code").

### 2. Trace the vertical slice for each claimed feature
For a player-facing feature, confirm every hop exists and connects:
- **UI dispatch** — a component calls `sendCommand({ type: "X", ... })` (worker) or a `GameContext` method that the player can actually click. Grep the pages/components, including child components (page-level `onClick` count undercounts — controls live in children).
- **Command routing** — `X` is in `src/engine/worker/types.ts` and handled in `engine.worker.ts` `COMMAND_HANDLERS`.
- **Engine effect** — the handler calls a real engine fn that mutates via `ImpactBuilder` + `resolveImpacts`.
- **Result on screen** — the change surfaces (digest, event feed, widget, toast).

If any hop is missing, the feature is incomplete regardless of tests. Example greps:
```bash
grep -rln "ISSUE_RULING\|HANDLE_MEDIA_EVENT" src/pages src/components | grep -v test   # who dispatches it?
grep -n "<COMMAND>" src/engine/worker/engine.worker.ts                                  # is it handled?
```

### 3. Run independent empirical checks (don't trust the author's assertions)
If a feature claims to *change behavior* (win-rate, growth, risk, money), measure it yourself over a seeded sample rather than reading the table. Write a throwaway test in `src/tests/unit/...`, **call the function exactly how production calls it**, and observe the distribution. Example that caught a real bug class:
```ts
// Pass the tactic the way the real caller does — resolveBout overwrites bout.playerTactic
// from the 5th positional arg (boutResolver.ts), so ctx.playerTactic alone is ignored.
const { result } = resolveBout(ctx, east, west, basho, tactic);
```
Run many seeds, assert direction AND magnitude (e.g. ALL_OUT win% > STANDARD > DEFENSIVE_PULL, and the swing is bounded — not 0.99/0.03). Delete the throwaway test when done. If your check disagrees with the author's green test, suspect *your* harness first (step 6), then theirs.

### 4. Run the full suite, the build, and determinism greps
```bash
npx vitest run                                   # FULL suite, not just changed files (NOT `bun test -- --run`)
npx vite build                                   # production build compiles
npx tsc --build --force                          # type-check (root `tsc --noEmit` is a no-op here)
grep -rn "Math.random\|Date.now" src/engine     # must be empty in engine code
```
For any new seeded code, confirm no choice/tactic/decision value is concatenated into a seed string (grep the seed construction site).

### 5. If the full suite regressed, bisect to root cause — don't guess
A regression that reproduces on clean `HEAD` is real. Find the true cause by isolation, not inspection:
- Re-run the failing test alone 2-3× to rule out flakiness (watch for wildly varying runtime — a deterministic sim should take ~the same time each run).
- Revert the suspect files to the last-known-good commit (`git show <good>:<path> > <path>`), confirm the test passes, then restore changes one file/area at a time until it flips. The file that flips it is the cause.
- Beware shared mechanisms: a frequently-firing new code path can expose a latent flaw elsewhere (a new always-on `pendingCrisis` trigger exposed an `advanceOneDay` early-return that froze the whole sim). The trigger and the flaw are both worth naming.

### 6. Re-confirm before you report
Before writing a defect into the report, prove it the way production runs the code. Most embarrassing "bugs" are harness mistakes. If you changed files to isolate a cause, restore the working tree to the true committed state (`git checkout -- <paths>`) and re-confirm the finding on clean HEAD so your report describes reality, not your experiments.

## Reporting

Be brutally honest and specific. Structure:

- **Verdict line** — does it ship or not, in one sentence.
- **Status table** — per claim: ✅ verified working / ⚠️ partial / ❌ broken, each with evidence (a `file.ts:line`, a command + its output, or a measured number). No claim without evidence.
- **What's genuinely done** — credit real, end-to-end vertical slices. Don't sandbag working work.
- **What's still broken/hollow** — name the failure class, the exact location, and why it matters to the player.
- **Own your errors** — if a finding was a false positive or a prior plan/recommendation was wrong, say so plainly and correct the record. Credibility comes from retracting fast, not from never being wrong.
- **Recommended fixes** — concrete, prioritized by effort-to-impact.

Quote evidence verbatim (`expected 0.48 to be greater than 0.48`, `1291/1291 pass`, `grep ... → no output`). Vague praise and vague criticism are equally useless.

## This repo's quick reference
- Tests: `npx vitest run` (jsdom). Mock factory: `src/tests/unit/engine/utils.ts` (`mockRikishi`, `makeMockBasho`). Engine mock helpers also in `src/engine/__tests__/utils.ts`.
- Canonical command path: worker (`src/engine/worker/engine.worker.ts` + `types.ts`), dispatched via `useGameStore(s => s.sendCommand)`. Reducer slices are legacy/UI-state + the synchronous bout path.
- Mutations go through `ImpactBuilder` (`src/engine/core/ImpactBuilder.ts`) + `resolveImpacts`. RNG: `rngForWorld` / `rngFromSeed` / `RNGRegistry` (`src/engine/rng.ts`) — never `Math.random`.
- Autonomous runs (`runAutoSim`, `runHoliday`) set `world._autonomousSim`; behavior there can diverge from interactive play — verify both modes when a change touches the tick/decision loop.
- Known pre-existing failures may exist (see `.claude/CLAUDE.md`); distinguish those from regressions you introduced by comparing against the baseline commit, not against zero failures.
