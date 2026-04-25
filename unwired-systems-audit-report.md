# Unwired Systems & Orphaned Code Audit Report

**Date:** April 26, 2026  
**Scope:** Full codebase scan for unwired services, orphaned code, and unused exports

---

## Summary

| Category | Count | Status |
|----------|-------|--------|
| Completely Unwired Services | 9 | Not imported anywhere |
| Partially Wired Services | 2 | Some functions used, others orphaned |
| Exported But Not Used Functions | 15+ | Within wired files |
| Orphaned Components | 0 | All components are imported |
| Orphaned Context/Slices | 0 | All slices wired to gameReducer |

---

## 1. Completely Unwired Services (Not Imported Anywhere)

These services exist but have **zero imports** across the entire codebase:

### 1.1 `MochikyukinService.ts`
**Location:** `/src/engine/systems/economics/MochikyukinService.ts`
**Exports:**
- `accumulateMochikyukinPoints()` - Calculates points for kachi-koshi, yusho, kinboshi
- `payMochikyukinBonuses()` - Payout 6x/year at ¥4,000/point

**Impact:** The mochikyukin (cumulative bonus) system for sekitori is completely non-functional. This is a significant missing feature for career progression economics.

---

### 1.2 `RecoveryService.ts`
**Location:** `/src/engine/systems/health/RecoveryService.ts`
**Exports:**
- `tickRikishiRecovery()` - Reduces injuryWeeksRemaining, updates injuryStatus

**Impact:** Dedicated injury recovery logic exists but is unused. Recovery may be handled elsewhere or not at all.

---

### 1.3 `SponsorContractService.ts`
**Location:** `/src/engine/systems/economy/SponsorContractService.ts`
**Exports:**
- `renewSponsorContract()` - Renews sponsor relationships, extends endsAtTick

**Impact:** Sponsor renewal mechanics are unimplemented. Contracts may auto-expire without renewal option.

---

### 1.4 `LegacyService.ts`
**Location:** `/src/engine/systems/legacy/LegacyService.ts`
**Exports:**
- `LegacyService.registerLegacyTrait()` - Registers bloodline traits on retirement
- `LegacyService.applyBloodlineBonus()` - Applies trait bonuses to new recruits
- `LegacyService.findPeakStat()` - Identifies rikishi's strongest stat

**Impact:** The entire bloodline/ancestry system (Phase 5: Legacy Engine) is non-functional. Yokozuna/Ozeki retirements don't leave traits for descendants.

---

### 1.5 `TrainingPhilosophyService.ts`
**Location:** `/src/engine/systems/legacy/TrainingPhilosophyService.ts`
**Exports:**
- `getDefault()` - Returns default philosophy
- `evolveForSuccessor()` - Shifts philosophy when new oyakata takes over
- `tickPhilosophyDrift()` - Annual 25% drift toward target biases
- `getStyleDrift()` - Calculates power/technique/speed drift

**Impact:** Training philosophy inheritance and evolution mechanics are unused. Philosophy transitions on oyakata change don't occur.

---

### 1.6 `NPCPersonaService.ts`
**Location:** `/src/engine/systems/NPCPersonaService.ts`
**Exports:**
- `NPCPersonaService.generatePersona()` - Creates oyakata personality profile
- `NPCPersonaService.evolvePersona()` - Shifts persona based on events
- `NPCPersonaService.getDecisionBias()` - Provides decision weights

**Impact:** NPC personality system exists but is unintegrated. All NPCs may be using default decision logic.

---

### 1.7 `npcAIWorkers.ts`
**Location:** `/src/engine/npcAIWorkers.ts`
**Exports:**
- `runNpcTurn()` - Web worker entry point for NPC AI
- `processNPCDecisions()` - Batched NPC decision processing

**Impact:** Web worker infrastructure for NPC AI exists but isn't utilized. NPC decisions may run on main thread.

---

### 1.8 `TalentPoolNPCRecruitment.ts`
**Location:** `/src/engine/systems/generation/TalentPoolNPCRecruitment.ts`
**Exports:**
- `processNPCRecruitmentOffers()` - NPCs compete for candidates
- `resolveBiddingWar()` - Determines winner in contested recruitments

**Impact:** NPC recruitment competition is non-functional. NPC stables may not recruit from talent pool.

---

### 1.9 `KeshoMawashiFactory.ts` & `HeyaBrandGenerator.ts`
**Location:** `/src/engine/systems/keshoMawashi/`
**Exports:**
- `generateKeshoMawashi()` - Creates ceremonial apron designs
- `generateHeyaBrand()` - Creates stable branding
- `generateColorScheme()` - Generates color palettes

**Impact:** Kesho-mawashi (ceremonial apron) and heya branding systems exist but aren't wired to rikishi generation or heya creation.

---

## 2. Partially Wired Services (Mixed Usage)

### 2.1 `WorldCircuitService.ts`
**Location:** `/src/engine/systems/global/WorldCircuitService.ts`

**Wired Functions:**
- ✅ `generateYearlyInvitations()` - Called in `phase06_yearly_boundary.ts`

**Unwired Functions:**
- ❌ `processExhibitionResult()` - Never called
- ❌ `applyStyleDrift()` - Referenced in `phase01_week_world_circuit.ts` but that phase is not in any pipeline
- ❌ `hasForeignAcademy()` - Never called
- ❌ `getRegionVisibility()` - Never called

**Note:** The `phase01_week_world_circuit.ts` phase exists and exports a function that calls `applyStyleDrift()`, but this phase is **not included** in either `bashoPipeline` or `offSeasonPipeline`.

---

### 2.2 `InfrastructureService.ts`
**Location:** `/src/engine/systems/economy/InfrastructureService.ts`

**Wired Functions:**
- ✅ `processCompletionTick()` - Called in `phase06_yearly_boundary.ts`

**Unwired Functions:**
- ❌ `startConstruction()` - Never called (UI should call this when player builds facility)
- ❌ `getHeyaBonuses()` - Never called (should aggregate infrastructure bonuses)

**Impact:** Players cannot initiate construction projects. Infrastructure bonuses are not applied to heya stats.

---

## 3. Tick Phase Wiring Analysis

### 3.1 Exported but Unwired Phases
These phases are exported from `/src/engine/tick/phases/index.ts` but **not included in any pipeline**:

| Phase | Location | Status |
|-------|----------|--------|
| `phase01_week_world_circuit` | `phase01_week_world_circuit.ts` | ❌ Not in any pipeline |
| `phase01_week_training` | `phase01_week_training.ts` | ✅ In offSeasonPipeline |
| `phase_global_cup_advance` | `phase_global_cup.ts` | ✅ In offSeasonPipeline |

**Finding:** Only `phase01_week_world_circuit` is truly orphaned among the weekly phases.

---

### 3.2 Monthly/Weekly Sub-Modules
Files in `/src/engine/tick/phases/monthly/` and `/src/engine/tick/phases/npc_ai/` are **indirectly wired** via their parent phases. They are not orphaned.

---

## 4. Context/Slices Audit

**Result:** All slices are properly wired to `gameReducer.ts`:

1. ✅ `coreSlice` - World creation, tick actions
2. ✅ `timeSlice` - Basho timing, interim advancement
3. ✅ `heyaSlice` - Heya selection, player assignment
4. ✅ `rosterSlice` - Rikishi selection
5. ✅ `financeSlice` - Facility upgrades, staff hiring
6. ✅ `bashoSlice` - Tournament flow, bout simulation
7. ✅ `mediaSlice` - Media events, governance rulings

**No orphaned slices found.**

---

## 5. Components Audit

**Result:** All components in `/src/components/` are imported by at least one page:

- ✅ `components/game/*` - Used by RecapPage, BashoPage, StablePage, etc.
- ✅ `components/training/*` - Used by TrainingPage (6 matches)
- ✅ `components/scouting/*` - Used by ScoutingPage (3 matches)
- ✅ `components/economy/*` - Used by EconomyPage (8 matches)
- ✅ `components/rivalries/*` - Used by RivalriesPage (4 matches)
- ✅ `components/rikishi/*` - Used by RikishiPage (10 matches)
- ✅ `components/dashboard/*` - Used by Dashboard (5 matches)

**No orphaned components found.**

---

## 6. Recommendations by Priority

### 🔴 High Priority (Missing Core Features)

1. **MochikyukinService Integration**
   - Call `accumulateMochikyukinPoints()` at basho conclusion in `PrizeDistribution.ts` or `bashoSlice.ts`
   - Call `payMochikyukinBonuses()` in `phase05_monthly_boundary.ts` on even months

2. **InfrastructureService.startConstruction()**
   - Wire to FacilitiesPage when player initiates construction
   - Call `getHeyaBonuses()` when calculating heya training effects

3. **WorldCircuit Phase Activation**
   - Either add `phase01_week_world_circuit` to `offSeasonPipeline` or remove the file
   - The style drift mechanic is referenced but never executes

### 🟡 Medium Priority (Feature Gaps)

4. **LegacyService Integration**
   - Call `registerLegacyTrait()` on rikishi retirement in `lifecycle.ts`
   - Call `applyBloodlineBonus()` when generating new rikishi

5. **TrainingPhilosophyService Integration**
   - Call `evolveForSuccessor()` on oyakata succession in `DynastyService.ts`
   - Call `tickPhilosophyDrift()` in yearly boundary phase

6. **SponsorContractService Integration**
   - Add UI action for sponsor renewal that calls `renewSponsorContract()`
   - Or integrate into existing sponsor management flow

### 🟢 Low Priority (Nice-to-Have)

7. **NPCPersonaService Integration**
   - Generate personas for NPC oyakata on world creation
   - Use `getDecisionBias()` in `npcAI.ts` decision functions

8. **TalentPoolNPCRecruitment.ts**
   - Call `processNPCRecruitmentOffers()` during weekly recruitment phase
   - Enables competitive bidding for top candidates

9. **KeshoMawashiFactory Integration**
   - Generate kesho-mawashi on rikishi promotion to juryo/makuuchi
   - Display in rikishi profile and bout pre-match

10. **RecoveryService Evaluation**
    - Verify if injury recovery is handled elsewhere
    - If not, integrate `tickRikishiRecovery()` into weekly welfare phase

---

## Appendix: Complete File List of Unwired Services

```
/src/engine/systems/economics/MochikyukinService.ts
/src/engine/systems/economics/TravelAllowanceService.ts (functions exist but unused)
/src/engine/systems/economy/InfrastructureService.ts (partial - startConstruction unused)
/src/engine/systems/economy/SponsorContractService.ts
/src/engine/systems/health/RecoveryService.ts
/src/engine/systems/legacy/LegacyService.ts
/src/engine/systems/legacy/TrainingPhilosophyService.ts
/src/engine/systems/keshoMawashi/KeshoMawashiFactory.ts
/src/engine/systems/keshoMawashi/HeyaBrandGenerator.ts
/src/engine/systems/NPCPersonaService.ts
/src/engine/systems/generation/TalentPoolNPCRecruitment.ts
/src/engine/npcAIWorkers.ts
/src/engine/tick/phases/phase01_week_world_circuit.ts (orphaned phase)
```

---

## Methodology

1. **Service Scan:** Searched for all `export function` and `export const Service` in `/src/engine/systems/`
2. **Import Check:** Grepped for each service name across the entire `/src` directory
3. **Pipeline Check:** Compared exported phases in `tick/phases/index.ts` against `bashoPipeline` and `offSeasonPipeline`
4. **Slice Check:** Verified all context slices are included in `gameReducer.ts` combineReducers
5. **Component Check:** Verified all component directories have imports in pages

---

*Report generated by automated codebase audit*
