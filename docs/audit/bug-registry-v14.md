# Bug Registry v14

Findings from the v14 systematic engine audit (megaplan `plan-28481e3472c1453a`). `run_subagent` was unavailable in the executing environment, so the planned fan-out ran as sequential in-parent sweeps over the same thematic/domain checklists — coverage preserved, parallelism lost.

## Baseline (Phase 0, HEAD `29604757`)

| Gate | Result |
|------|--------|
| `bun run type-check` | ✅ clean |
| `bun run test` (unit, incl. meta/audit gates) | ❌→✅ 20 stale EV-* snapshots (see V14-B05), regenerated → 8974 pass / 1 skip |
| `tests/slow/audit/` (8 meta-gates) | ✅ 46/46 |
| `simulationInvariants` (3-yr ID integrity) | ❌ 3 violations → ✅ 0 after fixes below |
| `engine-reviewer.ts` | ✅ no violations |
| `audit-orphans.ts` | 226 unreferenced exports (v13: 108), 8 "unticked services" — see notes |
| `duplicateExports` / `designScan` / `check-jsdoc` | ✅ clean |

## Workstream results (thematic sweeps)

| WS | Surface | Result |
|----|---------|--------|
| T1 determinism/RNG labels | every `rngFromSeed`/`rngForWorld`/`getSystemRNG`/`new SeededRNG` in src/engine | → V14-B04; rest clean (no `Math.random`/`Date.now`) |
| T2 write-path invariants | multi-writer `worldFields` fields (`talentPool`, `candidatePool`, `sponsorPool`, `myosekiMarket`, `history`, `events`) | ✅ all same-field writers compose sequentially or fuse (e.g. `tickWeekTalentPool` extracts-then-rewrites); no unfused siblings found |
| T3 allocation hot paths | `structuredClone`, find-in-loop, `Array.from().filter` chains | ✅ 1 `structuredClone(world)` = dead export `cloneWorldForTick` (V14-N01); no quadratic id loops |
| T4 dead code/orphans | 226 unreferenced exports + 8 unticked services | → notes V14-N01/N02 |
| T5 silent failure | `catch {}`, `?? fallback` masking | ✅ zero empty catches in engine |
| T6 type-safety | `as unknown as` / `as any` census | ✅ 8 + 3 sites, all data-boundary casts (v13 ~16–19 → now 8) |
| D-cluster spot reads | materialization, banzuke snapshot, history ids | → V14-B02, V14-N03, V14-N04 |

## Bugs

### V14-B01 — `applyArrayAppends` admits duplicate `.id` appends (severity: HIGH, invariant violation)

**Evidence:** `simulationInvariants` 3-yr run flagged `duplicate_id governanceLog GR-6B04D9AE`. `reportScandal` labels `ruling_${day}_${heyaId}_${reason}_${governanceLog.length}` — but `governanceLog.length` is stale inside a queued batch, so two rulings for the same heya/day/reason mint identical ids when merged into one impact (four callers can collide: `economics.ts` "Severe Insolvency", `yaocho.ts`, `officiating.ts`, agency escalation).

**Fix (verified):** resolver-level `appendDeduped` in `ImpactResolver.applyArrayAppends` — seeds a seen-set from the target array, remints colliding `.id` appends as `${id}-d${n}`. Deterministic (append order only), preserves both rulings, covers every append field (history, governanceLog, awardLog, events-adjacent arrays, etc.).

**Test-first:** `ImpactResolver.arrayAppends.test.ts` — RED confirmed (both ids collided), GREEN after fix.

**Disposition:** FIXED.

### V14-B02 — `publishBanzukeForSim` history-inject id is not unique-period-scoped (severity: HIGH, invariant violation)

**Evidence:** probe over a 10-basho autosim showed `history` = `…, kyushu-2026, hatsu-2026, haru-2027, …` — a **second** `hatsu-2026` record at index 6 with a different yusho. Root cause is *not* a stale year: this calendar rolls `world.year` at the January boundary (~dayIndex 374) which lands **mid-hatsu** (hatsu begins ~dayIndex 294), so two hatsu basho legitimately run inside `world.year` 2026. The `${bashoName}-${year}` id format cannot distinguish them.

**Fix (verified):** exported pure `nextBashoRecordId(history, bashoName, year)` — canonical id when free, deterministic `-r${n}` suffix on collision; used at the inject site (`AutoSimService.ts:247`).

**Test-first:** `autoSim.yearBoundary.test.ts` — 3 cases, RED confirmed (helper absent), GREEN after implementation.

**Disposition:** FIXED.

### V14-B03 — `mediaState.headlines` absent from ID-integrity audit (severity: MEDIUM, coverage gap)

**Evidence:** `world.mediaState.headlines` is an id-bearing array (`MH-*` uuids minted in `MediaBoutService`/`MediaEventService`/`MediaPreBashoService`, capped at 250 via `.slice`) but was not in `checkIdFieldInArray`'s list — the same dup-risk class as `events.log` without the guard.

**Fix:** added `checkIdFieldInArray("mediaState.headlines", world.mediaState?.headlines)` to `auditPooledArrayIds`.

**Disposition:** FIXED.

### V14-B04 — `MediaEventService` governance-headline label can remint identical `MH-*` ids (severity: MEDIUM, determinism)

**Evidence:** label `gov::${heyaId}::${templatePath}::${week}` — two same-template headlines for one heya in one week (e.g. two scandals — proven possible by the GR-label fixes in `29604757`) rebuild the same `SeededRNG` → identical `MH-*` id → duplicate in `mediaState.headlines`.

**Fix:** label extended with `dayIndexGlobal` + optional caller `salt`; `ScandalService` passes `salt: reason`.

**Disposition:** FIXED.

### V14-B05 — 20 stale `EV-*` golden snapshots in `eventBus.characterization.test.ts` (severity: LOW, test hygiene)

**Evidence:** unit suite baseline red — `idRngLabel` change in `29604757` remints event ids; snapshots baked the old ids.

**Disposition:** FIXED — snapshots regenerated (`vitest -u`), documented per the label-changes-shift-ids convention.

## Non-findings checked and cleared

- **`tickWeekTalentPool` composition:** extracts `refreshImpact.worldFields.talentPool` and layers discovery/emergency reveals into a single write — `refreshAllPools` emits no events, nothing dropped. Correct fusion.
- **`myosekiMarket` multi-writers:** each transaction writes `myosekiMarket` in its own independent impact — no same-batch collision possible.
- **`cloneWorldForTick`** (tickOrchestrator.ts:15): zero callers — retained for mutable-engine callers that no longer exist (`bashoSlice` comment confirms immutable). **NOTED** — dead export, retained pending orphan-cleanup policy.
- **`materializeCandidateToRikishiInternal`:** no `personId` already-materialized guard — defense-in-depth gap; the actual double-materialization path (refresh-collision re-sign) was fixed in `29604757`. **PROPOSED** — add `world.rikishi.has(personId)` early-return.
- **`persistBanzukeSnapshot` `history[last]` patch:** holds today — `recordBashoHistory` (via `concludeBasho`) is the sole `history` appender and lands last; AutoSim inject is last in its path. Fragile if a new history writer ever lands between conclude and publish. **PROPOSED** — patch by basho key rather than position.
- **Orphan audit delta (226 vs 108):** includes the new `idIntegrity` API surface and projection exports; 8 "unticked services" (`kimarite`, `awards`, `CareerService`, `rookieFactory`, `ReplayMetadata`, `KeshoMawashiGenerator`, `narrativeDescriptions`, `almanac/index`) are on-demand modules — heuristic false-positives, not unwired services. **NOTED.**
- **`NPCStrategyService` `"npc_strategy"` constant-seed fallback:** no `.uuid()` calls — worst case is statistically-uniform NPC decisions when callers omit `providedRng`; `npcAIWorkers.ts` passes rng. **NOTED.**
- **AutoSim kyushu-tail overshoot:** `advanceWithGates` can step into the next basho's `active_basho` days (pipeline bout phases) before `simulateEntireBasho` re-initializes the basho — pre-existing design quirk predating the year-gate change; partial-day effects are overwritten by `initializeBasho`. **PROPOSED** — confirm no residual stat bleed or bound the tail to `cyclePhase !== "active_basho"`.
