# Magic Number Extraction Plan

## Summary
This document outlines the magic numbers identified across the codebase and a plan for extracting them into named constants.

## Magic Numbers Identified

### 1. KenshoService.ts (economics)
**File:** `/src/engine/systems/economics/KenshoService.ts`

| Line | Magic Number | Context | Proposed Constant | Target File |
|------|--------------|---------|-------------------|-------------|
| 211 | `5` | Ginboshi minimum banner count | `MIN_GINBOSHI_BANNER_COUNT` | `economyExtended.ts` |
| 211 | `3` | Ginboshi additional banner max | `ADDITIONAL_GINBOSHI_BANNER_MAX` | `economyExtended.ts` |
| 204 | `8` | Title stakes heya heat gain | `HEYA_HEAT_GAIN_TITLE_STAKES` | `rivalry.ts` |
| 204 | `3` | Normal heya heat gain | `HEYA_HEAT_GAIN_NORMAL` | `rivalry.ts` |

**Note:** Some constants already exist in `economyExtended.ts` (e.g., `MIN_KINBOSHI_BANNER_COUNT`, `ADDITIONAL_KINBOSHI_BANNER_MAX`), but the ginboshi equivalents are missing.

---

### 2. RivalryService.ts (narrative)
**File:** `/src/engine/systems/narrative/RivalryService.ts`

| Line | Magic Number | Context | Proposed Constant | Target File |
|------|--------------|---------|-------------------|-------------|
| 148 | `0.5` | Default closeness | `RIVALRY_CLOSENESS_DEFAULT` | `rivalry.ts` |
| 149 | `0.2` | Default domination | `RIVALRY_DOMINATION_DEFAULT` | `rivalry.ts` |
| 358 | `10` | Style clash bonus | `STYLE_CLASH_BONUS` | `rivalry.ts` |
| 365 | `5` | Same division bonus | `SAME_DIVISION_BONUS` | `rivalry.ts` |
| 372 | `10` | Age proximity base | `AGE_PROXIMITY_BONUS_BASE` | `rivalry.ts` |
| 372 | `3` | Age proximity multiplier | `AGE_PROXIMITY_MULTIPLIER` | `rivalry.ts` |
| 372 | `2` | Age proximity max diff | `AGE_PROXIMITY_MAX_DIFF` | `rivalry.ts` |
| 389 | `20` | Initial heat min | `RIVALRY_INITIAL_HEAT_MIN` | `rivalry.ts` |
| 389 | `45` | Initial heat max | `RIVALRY_INITIAL_HEAT_MAX` | `rivalry.ts` |
| 433 | `12` | Sparring weeks threshold | `SPARRING_RIVALRY_WEEKS_THRESHOLD` | `rivalry.ts` (already exists) |
| 442 | `0.4` | Rivalry RNG threshold | `RIVALRY_RNG_THRESHOLD` | `rivalry.ts` (already exists) |
| 450 | `40` | Sparring initial heat min | `SPARRING_INITIAL_HEAT_MIN` | `rivalry.ts` |
| 450 | `60` | Sparring initial heat max | `SPARRING_INITIAL_HEAT_MAX` | `rivalry.ts` |

**Note:** `SPARRING_RIVALRY_WEEKS_THRESHOLD` and `RIVALRY_RNG_THRESHOLD` already exist in `rivalry.ts`.

---

### 3. npcSponsorStrategy.ts (NPC strategy)
**File:** `/src/engine/npcSponsorStrategy.ts`

| Line | Magic Number | Context | Proposed Constant | Target File |
|------|--------------|---------|-------------------|-------------|
| 18 | `60` | Ambition threshold | `TRAIT_AMBITION_HIGH_THRESHOLD` | `npcStrategy.ts` |
| 50 | `60` | Risk threshold | `TRAIT_RISK_HIGH_THRESHOLD` | `npcStrategy.ts` (already exists) |
| 70 | `70` | Patience threshold | `TRAIT_PATIENCE_THRESHOLD` | `npcStrategy.ts` (already exists) |
| 46 | `6` | Default runway threshold | `RUNWAY_THRESHOLD_DEFAULT` | `economy.ts` |
| 48 | `3` | Default relationship strength | `RELATIONSHIP_STRENGTH_DEFAULT` | `npcStrategy.ts` |
| 70 | `9` | Publicity hawk runway | `RUNWAY_THRESHOLD_PUBLICITY_HAWK` | `economy.ts` |
| 72 | `4` | Publicity hawk relationship | `RELATIONSHIP_STRENGTH_PUBLICITY_HAWK` | `npcStrategy.ts` |
| 86 | `2` | Conservative recruitment | `RECRUITMENT_THRESHOLD_CONSERVATIVE` | `npcStrategy.ts` |
| 87 | `3` | Conservative relationship | `RELATIONSHIP_STRENGTH_CONSERVATIVE` | `npcStrategy.ts` |
| 100 | `60` | Risk taker threshold | `TRAIT_RISK_HIGH_THRESHOLD` | `npcStrategy.ts` (already exists) |
| 101 | `4` | Risk taker recruitment | `RECRUITMENT_THRESHOLD_RISK_TAKER` | `npcStrategy.ts` |
| 103 | `3` | Default runway | `RUNWAY_THRESHOLD_DEFAULT` | `economy.ts` |
| 105 | `2` | Gambler runway | `RUNWAY_THRESHOLD_GAMBLER` | `economy.ts` |
| 111 | `2` | Risk taker relationship | `RELATIONSHIP_STRENGTH_RISK_TAKER` | `npcStrategy.ts` |
| 125 | `8` | Traditionalist runway | `RUNWAY_THRESHOLD_TRADITIONALIST` | `economy.ts` |
| 127 | `1` | Traditionalist recruitment | `RECRUITMENT_THRESHOLD_TRADITIONALIST` | `npcStrategy.ts` |
| 127 | `5` | Traditionalist relationship | `RELATIONSHIP_STRENGTH_TRADITIONALIST` | `npcStrategy.ts` |
| 141 | `12` | Nepotist runway | `RUNWAY_THRESHOLD_NEPOSTIST` | `economy.ts` |
| 143 | `3` | Nepotist recruitment | `RECRUITMENT_THRESHOLD_NEPOSTIST` | `npcStrategy.ts` |
| 143 | `3` | Nepotist relationship | `RELATIONSHIP_STRENGTH_NEPOSTIST` | `npcStrategy.ts` |
| 157 | `6` | Nurturer runway | `RUNWAY_THRESHOLD_NURTURER` | `economy.ts` |
| 159 | `3` | Nurturer recruitment | `RECRUITMENT_THRESHOLD_NURTURER` | `npcStrategy.ts` |
| 159 | `3` | Nurturer relationship | `RELATIONSHIP_STRENGTH_NURTURER` | `npcStrategy.ts` |
| 173 | `8` | Tyrant runway | `RUNWAY_THRESHOLD_TYRANT` | `economy.ts` |
| 175 | `2` | Tyrant recruitment | `RECRUITMENT_THRESHOLD_TYRANT` | `npcStrategy.ts` |
| 175 | `4` | Tyrant relationship | `RELATIONSHIP_STRENGTH_TYRANT` | `npcStrategy.ts` |
| 189 | `5` | Scientist runway | `RUNWAY_THRESHOLD_SCIENTIST` | `economy.ts` |
| 191 | `2` | Scientist recruitment | `RECRUITMENT_THRESHOLD_SCIENTIST` | `npcStrategy.ts` |
| 191 | `4` | Scientist relationship | `RELATIONSHIP_STRENGTH_SCIENTIST` | `npcStrategy.ts` |

**Note:** Many trait thresholds already exist in `npcStrategy.ts`. The runway thresholds and relationship strengths are the main gaps.

---

### 4. CandidateGenerator.ts (generation)
**File:** `/src/engine/systems/generation/CandidateGenerator.ts`

| Line | Magic Number | Context | Proposed Constant | Target File |
|------|--------------|---------|-------------------|-------------|
| 97 | `0.015` | Emergent prodigy chance | `EMERGENT_PRODIGY_CHANCE` | `generation.ts` |
| 121 | `12` | Prodigy stat bonus | `PRODIGY_STAT_BONUS` | `generation.ts` |
| 121 | `40` | Stat clamp min | `STAT_MIN` | `generation.ts` (already exists) |
| 121 | `99` | Stat clamp max | `STAT_MAX` | `generation.ts` (already exists) |
| 123 | `1.0` | Prodigy ceiling fraction | `PRODIGY_PA_CEILING_FRACTION` | `generation.ts` (already exists) |
| 124 | `1.25` | Prodigy development speed | `PRODIGY_DEVELOPMENT_SPEED_MULTIPLIER` | `generation.ts` |
| 158 | `15` | Base birth year offset | `DEBUT_AGE_BASE` | `generation.ts` (already exists) |
| 158 | `7` | University birth year range | `UNIVERSITY_BIRTH_YEAR_RANGE` | `generation.ts` |
| 158 | `3` | Other birth year range | `OTHER_BIRTH_YEAR_RANGE` | `generation.ts` |
| 169 | `0` | Reputation seed min | `REPUTATION_SEED_MIN` | `generation.ts` |
| 169 | `100` | Reputation seed max | `REPUTATION_SEED_MAX` | `generation.ts` |
| 172 | `0` | Talent seed min | `TALENT_SEED_MIN` | `generation.ts` |
| 172 | `100` | Talent seed max | `TALENT_SEED_MAX` | `generation.ts` |
| 173 | `0` | Temperament min | `TEMPERAMENT_MIN` | `generation.ts` |
| 173 | `100` | Temperament max | `TEMPERAMENT_MAX` | `generation.ts` |
| 176 | `0.8` | Amateur star tag chance | `AMATEUR_STAR_TAG_CHANCE` | `generation.ts` |
| 143 | `20` | Japanese prefectures slice | `JAPANESE_PREFECTURES_COUNT` | `generation.ts` |

**Note:** Several constants already exist in `generation.ts`. The main gaps are prodigy-specific constants and birth year ranges.

---

### 5. FinanceCalculator.ts (economy)
**File:** `/src/engine/systems/economy/FinanceCalculator.ts`

| Line | Magic Number | Context | Proposed Constant | Target File |
|------|--------------|---------|-------------------|-------------|
| 99 | `500_000` | Maintenance subsidy | `MAINTENANCE_SUBSIDY_AMOUNT` | `economic.ts` |
| 127 | `-20_000_000` | Debt limit for recruitment pause | `DEBT_LIMIT` | `economic.ts` (already exists) |
| 143 | `-20_000_000` | Debt floor | `DEBT_LIMIT` | `economic.ts` (already exists) |
| 148 | `999` | Infinite runway sentinel | `RUNWAY_INFINITE_SENTINEL` | `economic.ts` |

**Note:** `DEBT_LIMIT` already exists. The maintenance subsidy and infinite runway sentinel are new.

---

### 6. NPCFinanceCalculator.ts (strategy)
**File:** `/src/engine/strategy/NPCFinanceCalculator.ts`

| Line | Magic Number | Context | Proposed Constant | Target File |
|------|--------------|---------|-------------------|-------------|
| 23 | `50` | Hoarder ambition threshold | `TRAIT_HOARDER_AMBITION_THRESHOLD` | `npcStrategy.ts` |
| 25 | `500_000_000` | Hoarder myoseki threshold | `MYOSEKI_THRESHOLD_HOARDER` | `economic.ts` |
| 25 | `300_000_000` | Default myoseki threshold | `MYOSEKI_THRESHOLD_DEFAULT` | `economic.ts` |
| 39 | `100_000_000` | Myoseki buffer | `MYOSEKI_BUFFER_AMOUNT` | `economic.ts` |
| 71 | `60` | Traditionalist threshold | `TRAIT_TRADITION_THRESHOLD` | `npcStrategy.ts` (already exists) |
| 74 | `600_000_000` | Traditionalist myoseki threshold | `MYOSEKI_THRESHOLD_TRADITIONALIST` | `economic.ts` |
| 76 | `70` | Patient threshold | `TRAIT_PATIENCE_THRESHOLD` | `npcStrategy.ts` (already exists) |
| 76 | `700_000_000` | Patient myoseki threshold | `MYOSEKI_THRESHOLD_PATIENT` | `economic.ts` |
| 100 | `200_000_000` | Traditionalist buffer | `MYOSEKI_BUFFER_TRADITIONALIST` | `economic.ts` |

**Note:** Several trait thresholds already exist. The myoseki thresholds and buffers are the main gaps.

---

### 7. TrainingService.ts (training)
**File:** `/src/engine/systems/training/TrainingService.ts`

| Line | Magic Number | Context | Proposed Constant | Target File |
|------|--------------|---------|-------------------|-------------|
| 123 | `0` | Fatigue min | `FATIGUE_MIN` | `condition.ts` |
| 123 | `100` | Fatigue max | `FATIGUE_MAX` | `condition.ts` |
| 155 | `12` | Burnout injury weeks | `BURNOUT_INJURY_WEEKS` | `training.ts` |
| 158 | `30` | Crash stat floor | `CRASH_STAT_FLOOR` | `training.ts` |
| 158 | `15` | Crash stat penalty | `CRASH_STAT_PENALTY` | `training.ts` |
| 174-179 | `1-6` | Default weekly plan days | `WEEKLY_PLAN_DAYS` | `training.ts` |
| 255 | `10` | Stat floor | `STAT_FLOOR` | `training.ts` |
| 294 | `45` | Makuuchi stat floor | `DIVISION_FLOOR_MAKUUCHI` | `training.ts` |
| 296 | `40` | Juryo stat floor | `DIVISION_FLOOR_JURYO` | `training.ts` |
| 306 | `10` | Milestone threshold | `TRAINING_MILESTONE_THRESHOLD` | `training.ts` |
| 358 | `0.15` | Burnout prob week 1 | `BURNOUT_PROB_WEEK_1` | `training.ts` |
| 359 | `0.35` | Burnout prob week 2 | `BURNOUT_PROB_WEEK_2` | `training.ts` |

**Note:** Some constants may already exist in `training.ts` or `condition.ts`. Need to verify.

---

### 8. WelfareCalculations.ts (welfare)
**File:** `/src/engine/systems/welfare/WelfareCalculations.ts`

| Line | Magic Number | Context | Proposed Constant | Target File |
|------|--------------|---------|-------------------|-------------|
| 24 | `8` | Serious injury pressure | `INJURY_PRESSURE_SERIOUS` | `welfare.ts` |
| 25 | `4` | Moderate injury pressure | `INJURY_PRESSURE_MODERATE` | `welfare.ts` |
| 26 | `2` | Minor injury pressure | `INJURY_PRESSURE_MINOR` | `welfare.ts` |
| 80 | `3` | Pressure divisor | `WELFARE_PRESSURE_DIVISOR` | `welfare.ts` |
| 80 | `12` | Max delta | `WELFARE_DELTA_MAX` | `welfare.ts` |
| 82 | `2` | Serious injury bonus | `WELFARE_SERIOUS_INJURY_BONUS` | `welfare.ts` |
| 88 | `2` | Austerity diet bonus | `WELFARE_AUSTERITY_DIET_BONUS` | `welfare.ts` |
| 91 | `1` | Premium diet reduction | `WELFARE_PREMIUM_DIET_REDUCTION` | `welfare.ts` |
| 96 | `3` | Negligence penalty multiplier | `WELFARE_NEGLIGENCE_PENALTY_MULTIPLIER` | `welfare.ts` |
| 109 | `3` | Punishing intensity bonus | `WELFARE_PUNISHING_INTENSITY_BONUS` | `welfare.ts` |
| 112 | `1` | Intensive intensity bonus | `WELFARE_INTENSIVE_INTENSITY_BONUS` | `welfare.ts` |
| 117 | `2` | Low recovery bonus | `WELFARE_LOW_RECOVERY_BONUS` | `welfare.ts` |
| 120 | `2` | High recovery reduction | `WELFARE_HIGH_RECOVERY_REDUCTION` | `welfare.ts` |
| 127 | `60` | Recovery quality base | `FACILITY_RECOVERY_QUALITY_BASE` | `welfare.ts` |
| 127 | `25` | Recovery divisor | `FACILITY_RECOVERY_DIVISOR` | `welfare.ts` |
| 127 | `55` | Nutrition quality base | `FACILITY_NUTRITION_QUALITY_BASE` | `welfare.ts` |
| 127 | `40` | Nutrition divisor | `FACILITY_NUTRITION_DIVISOR` | `welfare.ts` |
| 134 | `50` | Scandal threshold | `SCANDAL_WELFARE_THRESHOLD` | `welfare.ts` |
| 134 | `2` | Scandal synergy bonus | `WELFARE_SCANDAL_SYNERGY_BONUS` | `welfare.ts` |
| 143 | `2` | Healthy drift reduction | `WELFARE_HEALTHY_DRIFT_REDUCTION` | `welfare.ts` |

---

### 9. Media Services (media)
**Files:** `/src/engine/systems/media/MediaBoutService.ts`, `MediaPreBashoService.ts`, `HeadlineGenerator.ts`

| Line | Magic Number | Context | Proposed Constant | Target File |
|------|--------------|---------|-------------------|-------------|
| MediaBoutService.ts 282 | `35` | Streak impact base | `STREAK_IMPACT_BASE` | `media.ts` |
| MediaBoutService.ts 282 | `4` | Streak impact multiplier | `STREAK_IMPACT_MULTIPLIER` | `media.ts` |
| MediaBoutService.ts 275 | `10` | Main event streak threshold | `STREAK_MAIN_EVENT_THRESHOLD` | `media.ts` |
| HeadlineGenerator.ts 30 | `0.4` | Main event headline chance | `MAIN_EVENT_HEADLINE_CHANCE` | `media.ts` |
| HeadlineGenerator.ts 58 | `10` | Streak headline threshold | `STREAK_HEADLINE_THRESHOLD` | `media.ts` |
| HeadlineGenerator.ts 61 | `8` | Streak secondary threshold | `STREAK_SECONDARY_THRESHOLD` | `media.ts` |
| MediaPreBashoService.ts 32 | `30` | Hot pair heat threshold | `HOT_PAIR_HEAT_THRESHOLD` | `media.ts` |
| MediaPreBashoService.ts 59 | `1` | Consecutive strong ozeki | `CONSECUTIVE_STRONG_OZEKI_THRESHOLD` | `media.ts` |
| MediaPreBashoService.ts 89 | `50` | Headlines slice count | `HEADLINES_HISTORY_MAX` | `media.ts` |
| MediaPreBashoService.ts 127-152 | Various | Impact values | `MEDIA_IMPACT_*` | `media.ts` |
| MediaPreBashoService.ts 176-192 | `5` | Response slice count | `MEDIA_RESPONSE_SLICE_COUNT` | `media.ts` |

---

### 10. Health Services (health)
**Files:** `/src/engine/systems/health/RecoveryService.ts`, `InjuryService.ts`, `BodyDefinitions.ts`

| Line | Magic Number | Context | Proposed Constant | Target File |
|------|--------------|---------|-------------------|-------------|
| RecoveryService.ts 28 | `1.2` | Recovery multiplier threshold | `RECOVERY_MULTIPLIER_THRESHOLD` | `health.ts` |
| BodyDefinitions.ts 63-87 | Various | Body part ranges | `BODY_PART_*_RANGE` | `health.ts` |

---

## Extraction Priority

### High Priority (Affects core game mechanics)
1. **TrainingService.ts** - Burnout probabilities, stat floors, division floors
2. **WelfareCalculations.ts** - All welfare pressure calculations
3. **RivalryService.ts** - Rivalry seeding and heat calculations
4. **KenshoService.ts** - Kensho envelope calculations

### Medium Priority (Affects NPC behavior and economy)
5. **npcSponsorStrategy.ts** - Sponsor recruitment thresholds
6. **NPCFinanceCalculator.ts** - Myoseki purchase thresholds
7. **FinanceCalculator.ts** - Maintenance subsidy, runway calculations
8. **CandidateGenerator.ts** - Prodigy generation parameters

### Low Priority (Affects media and health)
9. **Media Services** - Headline generation, streak calculations
10. **Health Services** - Recovery multipliers, body part ranges

## Implementation Steps

### Phase 1: High Priority Constants
1. Add missing constants to `rivalry.ts`:
   - `RIVALRY_CLOSENESS_DEFAULT`, `RIVALRY_DOMINATION_DEFAULT`
   - `STYLE_CLASH_BONUS`, `SAME_DIVISION_BONUS`
   - `AGE_PROXIMITY_BONUS_BASE`, `AGE_PROXIMITY_MULTIPLIER`, `AGE_PROXIMITY_MAX_DIFF`
   - `RIVALRY_INITIAL_HEAT_MIN`, `RIVALRY_INITIAL_HEAT_MAX`
   - `SPARRING_INITIAL_HEAT_MIN`, `SPARRING_INITIAL_HEAT_MAX`
   - `HEYA_HEAT_GAIN_TITLE_STAKES`, `HEYA_HEAT_GAIN_NORMAL`

2. Add missing constants to `welfare.ts`:
   - All injury pressure constants
   - All welfare delta constants
   - All facility quality constants

3. Add missing constants to `training.ts`:
   - Burnout probability constants
   - Stat floor constants
   - Division floor constants

4. Add missing constants to `economyExtended.ts`:
   - `MIN_GINBOSHI_BANNER_COUNT`, `ADDITIONAL_GINBOSHI_BANNER_MAX`

### Phase 2: Medium Priority Constants
1. Add missing constants to `npcStrategy.ts`:
   - Runway thresholds for each archetype
   - Relationship strength constants
   - Recruitment threshold constants

2. Add missing constants to `economic.ts`:
   - Myoseki thresholds
   - Maintenance subsidy
   - Runway infinite sentinel

3. Add missing constants to `generation.ts`:
   - Prodigy constants
   - Birth year ranges
   - Tag chances

### Phase 3: Low Priority Constants
1. Add missing constants to `media.ts`:
   - Streak thresholds
   - Headline chances
   - Impact values

2. Add missing constants to `health.ts`:
   - Recovery multipliers
   - Body part ranges

### Phase 4: Replace Magic Numbers in Code
For each file identified:
1. Import the new constants
2. Replace inline magic numbers with constant references
3. Verify no behavioral changes via tests

## Notes
- Some constants already exist in the constants files (marked as "already exists" in tables)
- Focus on extracting constants that are used in multiple places or have semantic meaning
- Single-use numbers that are self-explanatory (e.g., array indices) may not need extraction
- Test coverage should be maintained throughout the refactoring process
