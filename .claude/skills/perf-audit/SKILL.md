---
name: perf-audit
description: Find and fix performance problems — suboptimal data structures, O(N*M) loops (includes() inside filter/find), repeated allocation/sort/clone in iterations, unmemoized selectors and derived render lists. Use whenever hunting speedups, auditing hot paths, investigating tick/sim slowness or UI render cost, reviewing code for perf regressions, or before/after landing a perf fix. Wraps the repo's perf-hotspots static scanner, bench-pipelines + perf-gate measurement, and tests/perf suite into a scan → triage → measure → fix → verify workflow. Carries the cardinality rubric (what's a real hotspot vs a false positive) and the determinism cautions (never change Map iteration order or seeded-RNG call order).
---

# Performance Audit (`src/engine/**` + `src/{presenters,components,pages,state}/**`)

Find → triage → measure → fix → verify. Perf work without measurement is guessing; findings without triage are noise.

## Phase 1 — Scan

**Static finder (run first):**

```bash
bunx tsx scripts/audit/perf-hotspots.ts                        # full src/ scan
bunx tsx scripts/audit/perf-hotspots.ts --include src/engine   # scope to a subtree (repeatable)
bunx tsx scripts/audit/perf-hotspots.ts --json out.json        # machine-readable report
bunx tsx scripts/audit/perf-hotspots.ts --gate                 # exit 1 on any high finding
```

| Severity | Kind | Pattern |
|----------|------|---------|
| high | membership | `.includes(` / `.indexOf(` inside an iteration — array used as a set |
| medium | scan | `.find/.findIndex/.some/.filter/.map` nested in another iteration |
| medium | alloc | `new Set(` / `new Map(` / `.concat(` inside an iteration |
| medium | sort | `.sort(` inside an iteration |
| medium | clone | `structuredClone(` / `JSON.parse(JSON.stringify(` inside an iteration |

Suppress a verified-intentional hit with a trailing `// perf-hotspots: ignore`.

**Manual grep — patterns the script misses** (multi-line callbacks, non-loop hot spots, React):

```bash
# array-as-set lookups the brace-tracker can't see across lines
grep -rn "\.includes(" src/engine --include="*.ts" | grep -v "\.test\."

# repeated Map materialization — each call re-walks ~860 entries
grep -rn "Array\.from(world\.\|\.values())\|\.\.\.world\.\|\.\.\.[a-z]*\.values()" src

# array-find-by-id inside loops → should be world.rikishi.get(id) or a prebuilt Map
grep -rn "\.find([^=]*=> *[a-z]*\.id *===\|\.find((\w\+) *=> *\w*\.id *===" src

# spread-in-accumulator → O(N²) copies
grep -rn "reduce(\|\.\.\.acc\|\.\.\.\w*, *{" src/engine

# chained array passes that could be one loop
grep -rn "\.filter([^)]*)\.map(\|\.map([^)]*)\.filter(" src

# UI: derived lists recomputed every render
grep -rn "sort(\|filter(\|reduce(" src/components src/pages --include="*.tsx" | grep -v "useMemo\|createSelector\|useCallback"
```

Also grep the file you're editing for `includes`/`find` usage against `world.rikishi`, `world.events`, `currentBasho.matches`, `world.history*` — the big collections.

## Phase 2 — Triage (a finder, not a verdict)

Cardinality decides. **Ignore:** enum-size arrays (`BoutTactic` ×7, divisions ×6, gates/options ×<10), string `.includes("SUBSTR")` substring checks (not membership), intentionally-nested pairing algorithms (round-robin matchmaking, H2H matrices), capped collections. **Real:** anything iterating `world.rikishi` (~860), `activeRikishiIds`, `world.events`, `currentBasho.matches` (~hundreds/basho), heya rosters, or history/records logs — especially per outer element.

**Hot-path tiers** (fix top-down):
1. `src/engine/tick/**` phases — run every sim day; weekly pipelines run every 7
2. `src/engine/bout/**` — runs per bout, ~hundreds per basho day
3. `src/presenters/**` + `engine/core/selectors.ts` — run per UI render/digest build
4. `src/components/**`, `src/pages/**` — render-path derivations
5. Modals, one-shot dialogs — last priority

## Phase 3 — Measure

```bash
bun scripts/measure/bench-pipelines.ts     # S1 single-day / S2 weekly / S3 year / S4 25yr → docs/audit/perf-current.json
bun scripts/audit/perf-gate-check.ts       # compares S3_year vs perf-baseline.json; fails >15%
bun run test:perf                          # tests/perf/** benchmarks
```

Baseline is machine-local: `perf-gate-check` passes (skips) when platform/arch differ — don't compare numbers across machines. Record before/after p50 for the scenario covering your path (S1/S2 for tick work, S3/S4 for boundary/yearly code). For UI cost use React DevTools Profiler or a render counter, not wall-clock guesses. See `sim-diagnostics` for the full measurement-script catalog; `analyze-bundle` for bundle-size cost.

## Phase 4 — Fix recipes

| Smell | Fix |
|-------|-----|
| `arr.includes(x)` in a loop | `const set = new Set(arr)` hoisted above the loop; `set.has(x)` |
| `arr.find(r => r.id === id)` in a loop | `world.rikishi.get(id)` / `world.heyas.get(id)` — the Maps already exist — or build `new Map(arr.map(x => [x.id, x]))` once |
| manual `Array.from(world.rikishi.values()).filter().sort()` | `EntityCollection.getRikishi(world, opts)` / `getHeyaRoster` — canonical pre-filtered/sorted access (`src/engine/core/EntityCollection.ts`) |
| same world-scan in multiple selectors/phases | `createSelector` (`engine/core/selectors.ts`) or `getActiveRikishi` — WeakMap per-tick memoization already exists, reuse it |
| `[...acc, x]` / `{...acc, k}` in reduce/loop | `acc.push(x)` / `acc[k] = v` on a mutable local, or `new Set`/`new Map` accumulation |
| `.filter().map()` chains | single `for`/`reduce` pass |
| `.sort()` per iteration/render | hoist; sort once into a cached structure; `stableSort` (`engine/utils/sort.ts`) keeps determinism |
| derived list in render | `useMemo` on the component, or move the derivation into a `createSelector`-wrapped presenter selector |

## Phase 5 — Verify

1. `bunx tsx scripts/audit/perf-hotspots.ts --include <path>` — finding cleared or suppressed with a reason
2. `bun run type-check` and `bun run test` — green
3. `bun scripts/measure/bench-pipelines.ts` — record the delta; check `perf-gate-check` passes
4. Determinism: `bun scripts/sim/determinism-double-run.ts basho` (or `year`) for engine-side changes — serialized world must stay byte-identical

**Determinism cautions — non-negotiable:** the engine is byte-tested for determinism. Do not reorder `Map`/Set insertion or iteration (serialized output and RNG draw order follow it), do not consume `rng` in a different order or count, do not switch a `stableSort` for a plain `.sort()` on a key that ties. Bout code: see `bout-combat` skill first — keep resolution order-independent. Adding a `tests/perf/` benchmark for the fix: see `write-engine-test` (tier placement, meta gates). Before reporting done: `verify-implementation`.

## Report format

```
finding: <file:line> [<kind>/<severity>]
  hot path: <tier> | cardinality: ~<N> × ~<M>
  fix: <recipe> | expected: O(N*M) → O(N+M)
  status: fixed | suppressed | dismissed (<reason>)
```
