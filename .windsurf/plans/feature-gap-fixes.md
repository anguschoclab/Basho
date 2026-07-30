# Feature Gap Fixes Plan

## Gaps to Fix

### Gap 1: NPC AI sparring pair assignment (high)
- Add `applySparringAssignment` function to `src/engine/npcAI/weekly.ts`
- Import `assignSparringPair` and `SparringService` from `SparringService.ts`
- For each NPC heya, pair eligible rikishi by complementary archetypes (friction chemistry preferred)
- Merge sparring assignment impacts into the weekly decision's builder
- Call after `applyPromotionAwareness` and `applyInjuryRiskReduction`

### Gap 2: Weight Journey UI (high)
- Add `weightJourney` and `oversleptBasho` fields to `RikishiCareerDataDTO` in `src/presenters/rikishi/types.ts`
- Project these fields in `toCareerDataDTO` in `src/presenters/rikishi/transformers/lineage.ts`
- Create `WeightJourneyCard.tsx` component showing progress bar, target weight, stall status
- Add `WeightJourneyCard` to `TrainingPage.tsx` for player's heya rikishi with active journeys
- Add overslept basho badge to `RikishiProfileHeader.tsx`

### Gap 3: NPC weight journey funding awareness (medium)
- Add `applyWeightJourneyAwareness` function to `src/engine/npcAI/weekly.ts`
- Check if any rikishi in heya has active weight journey with `stalled: true` due to low funds
- If so, bias finance agent toward building reserves (raise priority in reasoning)

### Gap 4: NPC yokozuna council warning protection (high)
- Extend `applyPromotionAwareness` in `src/engine/npcAI/weekly.ts` to handle yokozuna rank
- When yokozuna has `councilWarnings > 0`, add to protect list, remove from push list
- Reduce training intensity if yokozuna is struggling (councilWarnings >= 2)

### Gap 5: Overslept basho badge on rikishi profile (low)
- Add `oversleptBasho` to `RikishiCareerDataDTO` and project it
- Add badge in `RikishiProfileHeader.tsx` showing oversleep incident

## Implementation Order
1. Add DTO fields + projection (types.ts, lineage.ts) — supports gaps 2 and 5
2. NPC AI changes in weekly.ts (gaps 1, 3, 4)
3. UI components (gap 2: WeightJourneyCard, gap 5: overslept badge)
4. Wire up in TrainingPage.tsx and RikishiProfileHeader.tsx
