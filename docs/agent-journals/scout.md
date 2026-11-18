# Scout Journal

## 2026-11-18 — New test files must land in test-timings.json

**Gap:** `tests/unit/meta/testTimingsBudget.test.ts` fails any fast-suite file not listed in `docs/audit/test-timings.json` ("no permanent-green escape") — a brand-new test file fails the gate even when it runs in 300ms.

**Learning:** The baseline is generated (`bun run test:timings -- fast` reruns the whole suite). When the full suite can't be run (e.g. sandboxed agent), insert the entry manually: `suites.fast.files` is sorted by `durationMs` **descending** — insert at the right position, bump `fileCount`/`testCount`/`totalDurationMs`, and run `prettier --write` (the committed JSON is prettier-formatted). Duration is the vitest per-file report from an isolated `bunx vitest run <file>`.

**Pattern:** For RNG-gated engine paths, don't loop seeds inside the test — probe `new SeededRNG(...)` draws offline (a scratch `bunx tsx` script), pick ONE seed per branch, and pin the exact draw sequence in a comment next to the seed constant. Deterministic forever, fast, and readable. `ImpactBuilder` outputs: adds land in `impact.collections.rikishiToAdd`, per-entity patches in `impact.entities.rikishiUpdates` (a `Map`) — assert on `builder.build()`, no `resolveImpacts` needed when only queued effects matter.
