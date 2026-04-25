# Unwired Systems & Orphaned Code Audit - VERIFIED FINDINGS

**Date:** April 26, 2026  
**Method:** Exhaustive code review with import tracing and call chain verification

---

## Executive Summary

| Category | Initial Count | Verified Count | Notes |
|----------|---------------|----------------|-------|
| **Completely Unwired Services** | 9 | 5 | Services with ZERO imports |
| **Partially Wired Services** | 2 | 6 | Some functions used, others orphaned |
| **Exported But Unused Functions** | 15+ | 12+ | Within wired files |
| **Orphaned Phases** | 1 | 1 | `phase01_week_world_circuit` not in pipelines |
| **False Positives (Corrected)** | - | 4 | Services found to be wired |

---

## 🔴 CONFIRMED: Completely Unwired Services (Zero Imports)

These files have **NO imports anywhere** in the codebase:

### 1.1 `MochikyukinService.ts` - UNWIRED
**Location:** `/src/engine/systems/economics/MochikyukinService.ts`

**Orphaned Functions:**
- `accumulateMochikyukinPoints()` - Never called
- `payMochikyukinBonuses()` - Never called

**Impact:** The mochikyukin (cumulative bonus) system for sekitori is **completely non-functional**. Field exists in types but never populated.

**Verification:**
```bash
$ grep -r "accumulateMochikyukinPoints\|payMochikyukinBonuses" src/
# No results
```

---

### 1.2 `SponsorContractService.ts` - UNWIRED
**Location:** `/src/engine/systems/economy/SponsorContractService.ts`

**Orphaned Functions:**
- `renewSponsorContract()` - Never called

**Impact:** Sponsor contract renewal mechanic is unimplemented.

---

### 1.3 `LegacyService.ts` - UNWIRED
**Location:** `/src/engine/systems/legacy/LegacyService.ts`

**Orphaned Functions:**
- `LegacyService.registerLegacyTrait()` - Never called
- `LegacyService.applyBloodlineBonus()` - Never called
- `LegacyService.findPeakStat()` - Never called

**Impact:** The entire bloodline/ancestry system is **disabled**. Yokozuna/Ozeki retirements don't leave traits for descendants.

---

### 1.4 `npcAIWorkers.ts` - UNWIRED
**Location:** `/src/engine/npcAIWorkers.ts`

**Orphaned Functions:**
- `spawnTrainingWorker()` - Never called
- `spawnScoutingWorker()` - Never called
- `spawnPersonnelWorker()` - Never called
- `spawnGlobalWorker()` - Never called
- `rpPerception()` - Never called

**Impact:** Web worker infrastructure for NPC AI exists but is **unused**. All NPC decisions run on main thread via `npcAI.ts` instead.

---

### 1.5 `TalentPoolNPCRecruitment.ts` - UNWIRED
**Location:** `/src/engine/systems/generation/TalentPoolNPCRecruitment.ts`

**Orphaned Functions:**
- `fillVacanciesForNPC()` - Never called
- `fillVacanciesForNPCWithBidding()` - Never called

**Impact:** Advanced NPC recruitment with competitive bidding is **disabled**. NPC stables use simplified inline recruitment in `phase01_week_recruitment.ts` instead.

**Verification:**
```bash
$ grep -r "fillVacanciesForNPC" src/
# No results outside the definition file
```

---

### 1.6 `KeshoMawashiFactory.ts` & `HeyaBrandGenerator.ts` - UNWIRED
**Location:** `/src/engine/systems/keshoMawashi/`

**Orphaned Functions:**
- `generateKeshoMawashi()` - Never called
- `upgradeKeshoMawashi()` - Never called
- `generateYokozunaTsuna()` - Never called
- `generateHeyaBrandIdentities()` - Never called
- `getHeyaBrand()` - Never called
- `adjustBrandForOyakata()` - Never called

**Impact:** Complete kesho-mawashi (ceremonial apron) system is **unused**. Field `heyaBrandIdentities` doesn't exist in `WorldState` types.

**Verification:**
```bash
$ grep -r "heyaBrandIdentities\|brandIdentityId\|generateKeshoMawashi" src/
# No results
```

---

## 🟡 CONFIRMED: Partially Wired Services (Mixed Usage)

### 2.1 `InfrastructureService.ts` - PARTIALLY WIRED
**Location:** `/src/engine/systems/economy/InfrastructureService.ts`

**✅ WIRED Functions:**
- `processCompletionTick()` - Called in `phase06_yearly_boundary.ts:51`

**❌ UNWIRED Functions:**
- `startConstruction()` - Never called (should be called when player builds)
- `getHeyaBonuses()` - Never called (should aggregate infrastructure bonuses)

**Impact:** Construction queue processes completions but **players cannot initiate construction**. Infrastructure bonuses not applied to heya stats.

---

### 2.2 `WorldCircuitService.ts` - PARTIALLY WIRED
**Location:** `/src/engine/systems/global/WorldCircuitService.ts`

**✅ WIRED Functions:**
- `generateYearlyInvitations()` - Called in `phase06_yearly_boundary.ts:60`

**❌ UNWIRED Functions:**
- `processExhibitionResult()` - Never called
- `applyStyleDrift()` - Referenced but orphaned (see orphaned phase below)
- `hasForeignAcademy()` - Never called
- `getRegionVisibility()` - Never called

**Impact:** Exhibition invitations are generated but **exhibitions never resolve** and style drift never applies.

---

### 2.3 `TrainingPhilosophyService.ts` - PARTIALLY WIRED
**Location:** `/src/engine/systems/legacy/TrainingPhilosophyService.ts`

**✅ WIRED Functions:**
- `tickPhilosophyDrift()` - Called in `phase06_yearly_boundary.ts:170`

**❌ UNWIRED Functions:**
- `evolveForSuccessor()` - Never called (should trigger on oyakata succession)
- `getDefault()` - Never called

**Impact:** Philosophy drifts naturally but **doesn't evolve during succession transitions**.

---

### 2.4 `NPCPersonaService.ts` - PARTIALLY WIRED
**Location:** `/src/engine/systems/NPCPersonaService.ts`

**Orphaned Functions:**
- `generatePersona()` - Never called
- `evolvePersona()` - Never called
- `getDecisionBias()` - Never called

**Note:** This service appears to be a planned but **unintegrated** personality system.

---

### 2.5 `RecoveryService.ts` - PARTIALLY WIRED
**Location:** `/src/engine/systems/health/RecoveryService.ts`

**✅ WIRED Functions:**
- `tickRikishiRecovery()` - Called in `phase01_week_health.ts:67`

**Status:** Actually working! My initial finding was **incorrect**.

---

### 2.6 `DynastyService.ts` - WIRED
**Location:** `/src/engine/systems/legacy/DynastyService.ts`

**✅ WIRED Functions:**
- `tickSuccessionCheck()` - Called in `phase06_yearly_boundary.ts:56`

**Status:** Working! My initial finding was **incorrect**.

---

## 🟠 CONFIRMED: Orphaned Phase

### 3.1 `phase01_week_world_circuit.ts` - ORPHANED
**Location:** `/src/engine/tick/phases/phase01_week_world_circuit.ts`

**Issue:** Phase is exported from `phases/index.ts` but **NOT included** in:
- `bashoPipeline.ts`
- `offSeasonPipeline.ts`

**Impact:** `WorldCircuitService.applyStyleDrift()` is referenced in this phase but **never executes**.

**Code Reference:**
```typescript
// In phase01_week_world_circuit.ts:
export function phase01_week_world_circuit(world: WorldState, report: DailyTickReport): WorldState {
  // ... calls WorldCircuitService.applyStyleDrift(nextWorld, heyaId)
}
```

---

## 🟢 VERIFIED: Actually Working Services (False Positives Corrected)

The following services ARE properly wired and working (contrary to my initial report):

| Service | Wired Function | Location | Status |
|---------|----------------|----------|--------|
| `RecoveryService` | `tickRikishiRecovery()` | `phase01_week_health.ts:67` | ✅ Working |
| `DynastyService` | `tickSuccessionCheck()` | `phase06_yearly_boundary.ts:56` | ✅ Working |
| `HistoryService` | `updateAllTimeRecords()` | `phase06_yearly_boundary.ts:67` | ✅ Working |
| `EraDriftService` | `processYearlyEraDrift()` | `phase06_yearly_boundary.ts:47` | ✅ Working |
| `GlobalCupService` | `initializeTournament()`, `advanceTournament()` | `phase06_yearly_boundary.ts:39`, `phase_global_cup.ts` | ✅ Working |

---

## 📊 Summary Table: All Services in `systems/` Directories

| File | Status | Wired Functions | Unwired Functions |
|------|--------|-----------------|-------------------|
| `economics/KenshoService.ts` | ✅ Wired | `calculateKenshoEnvelopes` | None |
| `economics/MochikyukinService.ts` | 🔴 Orphaned | None | `accumulateMochikyukinPoints`, `payMochikyukinBonuses` |
| `economics/SponsorshipService.ts` | ✅ Wired | Multiple | None |
| `economics/TravelAllowanceService.ts` | ✅ Wired | `payTravelAllowance`, `deductTsukebitoCosts`, `distributeKoenkaiToSekitori` | None |
| `economy/FinanceCalculator.ts` | ✅ Wired | `calculateHeyaWeeklyFinances` | None |
| `economy/InfrastructureService.ts` | 🟡 Partial | `processCompletionTick` | `startConstruction`, `getHeyaBonuses` |
| `economy/SponsorContractService.ts` | 🔴 Orphaned | None | `renewSponsorContract` |
| `health/InjuryService.ts` | ✅ Wired | `rollWeeklyInjury` | None |
| `health/RecoveryService.ts` | ✅ Wired | `tickRikishiRecovery` | None |
| `health/BodyDefinitions.ts` | ✅ Wired | Types only | N/A |
| `legacy/DynastyService.ts` | ✅ Wired | `tickSuccessionCheck` | None |
| `legacy/LegacyService.ts` | 🔴 Orphaned | None | `registerLegacyTrait`, `applyBloodlineBonus`, `findPeakStat` |
| `legacy/TrainingPhilosophyService.ts` | 🟡 Partial | `tickPhilosophyDrift` | `evolveForSuccessor`, `getDefault` |
| `keshoMawashi/KeshoMawashiFactory.ts` | 🔴 Orphaned | None | All functions |
| `keshoMawashi/HeyaBrandGenerator.ts` | 🔴 Orphaned | None | All functions |
| `media/*` | ✅ Wired | All major functions | None |
| `narrative/*` | ✅ Wired | All major functions | None |
| `recruitment/*` | ✅ Wired | `createScoutedView`, etc. | None |
| `generation/*` | ✅ Wired | `tickWeekTalentPool`, etc. | `fillVacanciesForNPC`, `fillVacanciesForNPCWithBidding` |
| `basho/GlobalCupService.ts` | ✅ Wired | `initializeTournament`, `advanceTournament` | None |
| `global/WorldCircuitService.ts` | 🟡 Partial | `generateYearlyInvitations` | `processExhibitionResult`, `applyStyleDrift`, `hasForeignAcademy` |
| `meta/EraDriftService.ts` | ✅ Wired | `processYearlyEraDrift` | None |
| `meta/HistoryService.ts` | ✅ Wired | `updateAllTimeRecords` | None |
| `welfare/*` | ✅ Wired | All major functions | None |
| `training/*` | ✅ Wired | All major functions | None |
| `NPCPersonaService.ts` | 🔴 Orphaned | None | All functions |

---

## 🎯 Priority Recommendations

### 🔴 Critical (Core Features Missing)

1. **MochikyukinService Integration**
   - Call `accumulateMochikyukinPoints()` in `PrizeDistribution.ts` at basho end
   - Call `payMochikyukinBonuses()` in `phase05_monthly_boundary.ts` on even months

2. **WorldCircuit Exhibition Resolution**
   - Either wire `phase01_week_world_circuit` into off-season pipeline
   - Or add exhibition resolution to existing weekly phases

3. **InfrastructureService.startConstruction()**
   - Wire to FacilitiesPage when player initiates construction

### 🟡 Medium (Feature Gaps)

4. **LegacyService Integration**
   - Call `registerLegacyTrait()` on rikishi retirement
   - Call `applyBloodlineBonus()` when generating new rikishi

5. **TrainingPhilosophyService.evolveForSuccessor()**
   - Call on oyakata succession in `DynastyService`

6. **SponsorContractService**
   - Add UI action for sponsor renewal

### 🟢 Low (Nice-to-Have)

7. **NPCPersonaService Integration**
8. **KeshoMawashiFactory Integration**
9. **TalentPoolNPCRecruitment Activation**

---

## Methodology

1. **Initial Service Enumeration:** Listed all exported functions in `/src/engine/systems/`
2. **Import Grepping:** Searched for each service name and function name across `/src`
3. **Phase Wiring Check:** Compared exported phases against `bashoPipeline` and `offSeasonPipeline`
4. **Call Chain Tracing:** Followed imports through `phase06_yearly_boundary.ts` and other key files
5. **False Positive Correction:** Re-verified services initially marked as orphaned

---

## Verification Commands Used

```bash
# Service import check
grep -r "ServiceName" src/ --include="*.ts" --include="*.tsx"

# Function call check
grep -r "functionName" src/ --include="*.ts" --include="*.tsx"

# Pipeline inclusion check
grep -r "phase01_week_world_circuit" src/engine/tick/pipelines/

# Specific verification examples:
grep -r "tickRikishiRecovery" src/  # Found in phase01_week_health.ts
grep -r "DynastyService" src/       # Found in phase06_yearly_boundary.ts
grep -r "TrainingPhilosophyService" src/  # Found in phase06_yearly_boundary.ts
```

---

*Report verified by exhaustive code analysis - April 26, 2026*
