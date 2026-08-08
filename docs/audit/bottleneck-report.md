# Bottleneck Confirmation Report (A3)

## H1: `clearQueryCaches()` daily is wasteful
**Status**: ✅ CONFIRMED — **FIXED (B1.2, Step 7)**
`phase00_preflight.ts` previously called `clearQueryCaches()` unconditionally every day. Caches (`rosterCache`, `styleBiasCache`) are used by weekly phases. Fixed: cache clearing now only fires on weekly gate entry.

## H2: `resolveImpacts` allocates new `Map` per entity-update field per impact
**Status**: ✅ CONFIRMED — **VALIDATED (B2.2, Step 11)**
`ImpactResolver.ts:79` creates `new Map()` per entity-update field. `pipelineRunner` resolves each phase immediately. `phase05_monthly_boundary` already uses `mergeImpacts` for sub-service impacts. The per-phase immediate resolution is required for sequential correctness. No further action needed.

## H3: `phase06_yearly_boundary` iterates `activeRikishiIds` twice
**Status**: ⚠️ PARTIALLY CONFIRMED — **FIXED (B2.1, Step 10)**
Records loop (small subset: `careerWins > 100 || yokozuna`) and avatar aging loop fused into single pass. Priority was LOW per validation.

## H4: `phase01_week_npc_ai` is the heaviest weekly phase
**Status**: ✅ CONFIRMED — **FIXED (B2.3, Step 12)**
298 lines, iterates all 43 NPC heyas. Fixed: deterministic rotation sampling selects ~2/3 of heyas per off-season week, with full sweep on `active_basho` and monthly boundaries.

## H5: Basho match re-filtering (O(days × matches))
**Status**: ✅ CONFIRMED — **FIXED (B1.4, Step 9)**
Three filter sites identified. Pre-indexed matches by day via `Map<day, Match[]>`.

## H6: `advanceDaysFast` calls `advanceOneDay` per day (no true batching)
**Status**: ✅ CONFIRMED — **FIXED (B1.1, Step 6)**
365 preflight calls for 365-day advance. Fixed: batched preflight advances calendar in single pass.

## H7: `pipelineRunner` error recovery restores reference, not deep copy
**Status**: ✅ CONFIRMED — **FIXED (B3.1-2, Step 15)**
Reference snapshot replaced with shallow clone of entity maps. Declared touches metadata allows selective snapshotting. Read-only phases skip snapshotting entirely.
