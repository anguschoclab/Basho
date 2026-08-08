# SharedArrayBuffer / Atomics Research Track (B4.2)

## Status: RESEARCH ONLY — No implementation recommended at this time

## 1. Feasibility Study

### Browser Support

- **SharedArrayBuffer** requires cross-origin isolation via COOP/COEP headers.
- **Electron** (the target platform) can set these via `webPreferences: { crossOriginIsolation: true }` in `BrowserWindow` config.
- **Safari** lacks support in some contexts; fallback to single-threaded path is required.
- **Node.js** (used for benchmarks/scripts) supports `SharedArrayBuffer` natively since v12.

### Embarrassingly Parallel Phases

| Phase | Parallelizable? | Reason |
| --- | --- | --- |
| `phase06_yearly_boundary` — avatar aging | Yes | Per-rikishi, no cross-dependencies within the loop |
| `phase05_monthly_boundary` — per-heya economics | Yes | Per-heya, independent financial calculations |
| `phase01_week_npc_ai` — per-NPC-heya decisions | Yes | Per-heya perception/planning, no cross-heya reads |
| `phase01_week_training` — weight journey | Yes | Per-rikishi, independent |

### Inherently Sequential Phases

| Phase | Reason |
| --- | --- |
| `phase02_context` → `phase01_week_training` | Training consumes `activeModifiers` from context |
| `phase01_week_economy` → `phase01_week_welfare` | Welfare checks depend on updated heya funds |
| `phase05_monthly_boundary` → `phase01_monthly_market` | Market state depends on monthly boundary output |
| `phase00_preflight` → all | Preflight sets boundaries/deltas consumed by all phases |

## 2. Prototype Design: Parallel Yearly Avatar Aging

### Approach

1. Split `activeRikishiIds` into N shards (N = number of pool workers, e.g., 4).
2. Post each shard to a pool worker with a deterministic seed: `seed = hash(world.seed, year, shardIndex)`.
3. Workers write results into a `SharedArrayBuffer`-backed structured table (fixed-width records: rikishiId, age, avatarConfig fields).
4. Main worker reads results and builds a single `StateImpact` via `ImpactBuilder.updateRikishi`.

### Determinism Guard

- Per-shard RNG seeded with `hash(world.seed, year, shardIndex)` — deterministic and independent of worker scheduling.
- Verification: 25-year sim output must be byte-identical to single-threaded baseline.
- If hash differs, fall back to single-threaded path and log a warning.

### Expected Performance

- Avatar aging loop: ~200-400 active rikishi, ~0.1ms per rikishi = 20-40ms total.
- With 4 workers: ~5-10ms (4× speedup minus serialization overhead).
- **Conclusion**: The absolute time savings (~15-30ms per year) is modest relative to the total yearly boundary cost (~50ms target). Not worth the complexity for this phase alone.

## 3. Atomics-Based Phase Gate

If multi-worker pipelines are adopted:

```ts
// Shared Int32Array for phase completion barrier
const phaseGate = new Int32Array(sharedBuffer);

// Workers signal completion:
Atomics.store(phaseGate, shardIndex, 1);
Atomics.notify(phaseGate, shardIndex);

// Main worker waits for all shards:
for (let i = 0; i < numShards; i++) {
  Atomics.wait(phaseGate, i, 0);
}
```

This ensures no subsequent phase starts until all parallel shards report done.

## 4. Fallback Strategy

- Gate behind `parallelBatch.enabled` config flag (default: `false`).
- Check `typeof SharedArrayBuffer !== "undefined"` at startup.
- If unavailable or flag disabled, use current single-threaded path.
- Log which path is active for debugging.

## 5. Go/No-Go Recommendation

### NO-GO for current iteration

**Rationale**:

1. **Modest gains**: The most expensive phase (`phase01_week_npc_ai`) has already been optimized via rotation sampling (B2.3), reducing per-week cost by ~33%. The remaining parallelizable phases (avatar aging, per-heya economics) have modest absolute costs.

2. **High complexity**: Multi-worker coordination adds significant complexity — shared memory management, Atomics-based barriers, serialization/deserialization of WorldState subsets, and determinism verification across worker scheduling.

3. **Electron-specific**: The app targets Electron, which supports `SharedArrayBuffer` but requires COOP/COEP headers. This limits the optimization to the Electron build only.

4. **Diminishing returns**: After B1-B4 optimizations, the pipeline targets are:
   - `tick_p50_ms` ≤ 2ms (achieved via batched preflight, fused micro-phases)
   - `advance_365_days_ms` ≤ 1500ms (achieved via fast-path batching)
   - `yearly_boundary_ms` ≤ 50ms (achieved via fused loops)

   Parallelism would improve `yearly_boundary_ms` from ~50ms to ~35ms — a 30% improvement on a non-critical-path phase.

5. **Risk**: Non-determinism from worker scheduling is a critical risk for the simulation's determinism guarantee. The per-shard seeded RNG mitigates this, but edge cases (e.g., floating-point ordering across shards) could introduce subtle divergence.

### Revisit Criteria

Revisit this research track if:
- `advance_365_days_ms` exceeds 2000ms after all B1-B4 optimizations.
- New embarrassingly parallel phases are added with heavy per-entity computation.
- The app moves to a pure browser target where Web Workers are already heavily used.
