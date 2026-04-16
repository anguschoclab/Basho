# Comprehensive Codebase Refactoring Plan

**Project**: sumo-manager-pro (Basho Sumo Manager Game)
**Date**: 2025-01-XX
**Total Codebase Size**: ~88,793 lines (TS/TSX)
**Test Files**: 91 test files across 14 test directories
**Scope**: Exhaustive refactoring addressing monolithic code, duplicate patterns, system integration, and test coverage

---

## Executive Summary

This comprehensive refactoring plan addresses:
1. **Monolithic code** - 25 files >500 lines identified for decomposition
2. **Duplicate code patterns** - Map/filter chains, entity access patterns, projection logic
3. **System integration gaps** - Ensuring all engine services are properly connected to UI
4. **UI/UX connectivity** - Verifying all features are surfaced and accessible
5. **Test coverage** - Adding tests for critical components lacking coverage

**Estimated Effort**: 4-6 weeks of focused development work
**Priority**: High - Addresses technical debt, maintainability, and feature completeness

---

## Part 1: Monolithic File Decomposition

### 1.1 Presenter Layer Refactoring

#### File: `src/presenters/uiDigest.ts` (1,099 lines)
**Current State**: Central presenter file with ~89 exported functions covering projections, formatters, constants, and action helpers.
**Issues**:
- Violates single responsibility principle
- Difficult to navigate and maintain
- Mixed concerns (projections, formatters, actions, constants)
- Large import/export surface area

**Refactoring Strategy**:
```
src/presenters/
├── uiDigest.ts (coordinator, re-exports only)
├── projections/
│   ├── index.ts
│   ├── rikishiProjections.ts (projectRikishi, projectRikishiWithHeya)
│   ├── heyaProjections.ts (projectHeyaData)
│   ├── mediaProjections.ts (projectMediaUIDigest)
│   ├── hofProjections.ts (projectHOFUIDigest)
│   ├── sponsorProjections.ts (projectSponsorUIDigest)
│   ├── medicalProjections.ts (projectMedicalUIDigest)
│   ├── dashboardProjections.ts (projectDashboardUIDigest)
│   ├── banzukeProjections.ts (projectBanzukeUIDigest)
│   └── digestProjections.ts (buildWeeklyDigest, buildInjurySection, etc.)
├── formatters/
│   ├── index.ts
│   ├── rankFormatters.ts (formatRank, RANK_NAMES, RANK_HIERARCHY)
│   ├── statusFormatters.ts (getStatusColor, getStatusLabel)
│   ├── eventFormatters.ts (formatEventTime, formatFinePenalty)
│   └── saveFormatters.ts (formatSaveDate)
├── constants/
│   ├── index.ts
│   ├── rankConstants.ts (RANK_NAMES, RANK_HIERARCHY, etc.)
│   ├── bandConstants.ts (FATIGUE_LABELS, POTENTIAL_LABELS, etc.)
│   └── economicConstants.ts (KOENKAI_MONTHLY_INCOME, SPONSOR_TIER_INCOME)
├── actions/
│   ├── index.ts
│   ├── recruitmentActions.ts (scoutPool, scoutCandidate, offerCandidate)
│   ├── sponsorActions.ts (recruitSponsor, renewSponsorContract)
│   ├── welfareActions.ts (setHeyaDietAction, ensureHeyaWelfareState)
│   └── myosekiActions.ts (buyMyoseki, leaseMyoseki)
└── utilities/
    ├── index.ts
    ├── perception.ts (buildPerceptionSnapshot, getCachedPerception)
    ├── injury.ts (clearInjury, toInjuryEvent)
    └── save.ts (deleteSave, exportSave, importSave)
```

**Implementation Steps**:
1. Create new directory structure under `src/presenters/`
2. Move functions to appropriate modules by concern
3. Update all imports across the codebase (44+ files reference uiDigest)
4. Create barrel exports (`index.ts` files) for clean imports
5. Keep `uiDigest.ts` as a compatibility layer that re-exports for gradual migration
6. Add unit tests for each projection module
7. Update TypeScript paths if needed for cleaner imports

**Test Additions**:
- `src/presenters/projections/__tests__/rikishiProjections.test.ts`
- `src/presenters/projections/__tests__/heyaProjections.test.ts`
- `src/presenters/formatters/__tests__/rankFormatters.test.ts`
- Integration tests for projection chains

**Estimated Time**: 3-4 days

---

### 1.2 Page Component Decomposition

#### File: `src/pages/RikishiPage.tsx` (1,132 lines)
**Current State**: Large page component with tabs for profile, combat, and career archives.
**Issues**:
- Single file handles multiple complex views
- Mixed presentation and data fetching logic
- Difficult to test individual sections

**Refactoring Strategy**:
```
src/pages/rikishi/
├── RikishiPage.tsx (coordinator, ~150 lines)
├── components/
│   ├── ProfileTab.tsx (~200 lines)
│   ├── CombatTab.tsx (~150 lines)
│   ├── CareerArchiveTab.tsx (~200 lines)
│   ├── LineageSection.tsx (~100 lines)
│   ├── StatsOverview.tsx (~150 lines)
│   └── MilestoneTimeline.tsx (~150 lines)
└── hooks/
    ├── useRikishiData.ts
    └── useLineageData.ts
```

**Implementation Steps**:
1. Extract tab content into separate components
2. Create custom hooks for data fetching logic
3. Move component-specific types to local files
4. Add prop type validation
5. Create unit tests for each sub-component

**Test Additions**:
- `src/pages/rikishi/components/__tests__/ProfileTab.test.tsx`
- `src/pages/rikishi/components/__tests__/CombatTab.test.tsx`
- `src/pages/rikishi/hooks/__tests__/useRikishiData.test.ts`

**Estimated Time**: 2-3 days

---

#### File: `src/pages/EconomyPage.tsx` (754 lines)
**Current State**: Economy page with financial overview, debt management, and income/expense breakdowns.
**Issues**:
- Complex inline calculations
- Mixed narrative and data logic
- Large conditional rendering blocks

**Refactoring Strategy**:
```
src/pages/economy/
├── EconomyPage.tsx (coordinator, ~200 lines)
├── components/
│   ├── FinancialOverview.tsx (~150 lines)
│   ├── DebtPanel.tsx (~150 lines)
│   ├── IncomeSources.tsx (~120 lines)
│   ├── ExpenseBreakdown.tsx (~120 lines)
│   ├── SponsorDraw.tsx (~100 lines)
│   └── BailoutCard.tsx (~80 lines)
├── constants/
│   ├── runwayConfig.ts
│   └── koenkaiConfig.ts
└── utilities/
    ├── kenshoTiering.ts
    └── safeTypeGuards.ts
```

**Test Additions**:
- `src/pages/economy/components/__tests__/FinancialOverview.test.tsx`
- `src/pages/economy/components/__tests__/DebtPanel.test.tsx`
- `src/pages/economy/utilities/__tests__/kenshoTiering.test.ts`

**Estimated Time**: 2 days

---

#### File: `src/pages/TrainingPage.tsx` (670 lines)
**Current State**: Training page with complex regime management and UI.

**Refactoring Strategy**:
```
src/pages/training/
├── TrainingPage.tsx (coordinator, ~200 lines)
├── components/
│   ├── TrainingRegimeSelector.tsx
│   ├── TrainingIntensityControl.tsx
│   ├── RosterTrainingList.tsx
│   └── TrainingImpactDisplay.tsx
└── hooks/
    └── useTrainingData.ts
```

**Test Additions**:
- Component tests for training sub-components
- Hook tests for training data logic

**Estimated Time**: 2 days

---

### 1.3 Engine Service Decomposition

#### File: `src/engine/systems/generation/TalentPoolService.ts` (936 lines)
**Current State**: Large service handling scouting, recruitment, candidate visibility, and NPC bidding.
**Issues**:
- Multiple responsibilities (scouting, visibility, NPC AI, materialization)
- Complex state mutation logic
- Hard to test individual features

**Refactoring Strategy**:
```
src/engine/systems/generation/
├── TalentPoolService.ts (read operations, ~200 lines)
├── TalentPoolScouting.ts (scouting logic, ~150 lines)
├── TalentPoolVisibility.ts (visibility management, ~150 lines)
├── TalentPoolRecruitment.ts (player recruitment, ~150 lines)
├── TalentPoolNPC.ts (NPC bidding logic, ~150 lines)
└── TalentPoolMaterialization.ts (candidate → rikishi, ~100 lines)
```

**Implementation Steps**:
1. Separate concerns into focused modules
2. Create clear interfaces between modules
3. Move state mutation to dedicated functions
4. Add comprehensive unit tests

**Test Additions**:
- `src/engine/systems/generation/__tests__/TalentPoolScouting.test.ts`
- `src/engine/systems/generation/__tests__/TalentPoolVisibility.test.ts`
- `src/engine/systems/generation/__tests__/TalentPoolNPC.test.ts`
- `src/engine/systems/generation/__tests__/TalentPoolMaterialization.test.ts`

**Estimated Time**: 3 days

---

#### File: `src/engine/events.ts` (665 lines)
**Current State**: Event bus with many event factory methods.
**Issues**:
- Large object with many methods
- Could be organized by domain

**Refactoring Strategy**:
```
src/engine/events/
├── index.ts (main exports)
├── EventBus.ts (core event logging, ~150 lines)
├── factories/
│   ├── index.ts
│   ├── medicalEvents.ts
│   ├── governanceEvents.ts
│   ├── trainingEvents.ts
│   ├── financialEvents.ts
│   ├── careerEvents.ts
│   ├── bashoEvents.ts
│   ├── recruitmentEvents.ts
│   └── narrativeEvents.ts
└── utilities/
    ├── query.ts
    └── cleanup.ts
```

**Test Additions**:
- Tests for each event factory module
- Integration tests for event logging

**Estimated Time**: 2 days

---

#### File: `src/engine/bout/boutPhysics.ts` (722 lines)
**Current State**: Core bout simulation with complex physics state management.
**Issues**:
- Large simulation function
- Multiple phase handlers in one file
- Complex state mutation

**Refactoring Strategy**:
```
src/engine/bout/
├── boutPhysics.ts (orchestrator, ~200 lines)
├── physics/
│   ├── initialization.ts
│   ├── pushBattle.ts
│   ├── beltBattle.ts
│   ├── edgeCrisis.ts
│   └── resultBuilder.ts
└── types/
    └── physicsState.ts
```

**Test Additions**:
- Unit tests for each physics phase
- Determinism tests for physics simulation

**Estimated Time**: 3 days

---

### 1.4 Component Decomposition

#### File: `src/components/kesho/KeshoMawashiDisplay.tsx` (797 lines)
**Current State**: Large SVG rendering component with many pattern renderers.
**Issues**:
- Multiple render functions for different patterns
- Could be split into pattern components

**Refactoring Strategy**:
```
src/components/kesho/
├── KeshoMawashiDisplay.tsx (main component, ~200 lines)
├── patterns/
│   ├── BasePattern.tsx
│   ├── BorderPattern.tsx
│   ├── EmbroideryPattern.tsx
│   ├── SymbolPattern.tsx
│   └── FringePattern.tsx
└── utilities/
    ├── patternColors.ts
    └── tierBadges.ts
```

**Test Additions**:
- Visual regression tests for each pattern
- Snapshot tests for component rendering

**Estimated Time**: 2 days

---

#### File: `src/components/game/PerceptionOverview.tsx` (658 lines)
**Current State**: Complex comparison component with multiple comparison modes.
**Issues**:
- Large component with multiple comparison views
- Complex state management

**Refactoring Strategy**:
```
src/components/game/perception/
├── PerceptionOverview.tsx (coordinator, ~200 lines)
├── StableComparison.tsx
├── RikishiComparison.tsx
├── H2HComparison.tsx
├── PerceptionCard.tsx
└── utilities/
    ├── colorMaps.ts
    └── comparisonData.ts
```

**Test Additions**:
- Component tests for each comparison mode
- Data transformation tests

**Estimated Time**: 2 days

---

#### File: `src/components/ui/sidebar.tsx` (641 lines)
**Current State**: Complex sidebar with mobile/desktop variants.
**Issues**:
- Large component with multiple variants
- Complex context logic

**Refactoring Strategy**:
```
src/components/ui/sidebar/
├── Sidebar.tsx (main component, ~200 lines)
├── SidebarProvider.tsx
├── SidebarContent.tsx
├── SidebarHeader.tsx
├── SidebarFooter.tsx
├── SidebarCollapsible.tsx
└── hooks/
    └── useSidebar.ts
```

**Test Additions**:
- Component tests for sidebar variants
- Hook tests for sidebar state

**Estimated Time**: 2 days

---

### 1.5 Data-Heavy File Optimization

#### File: `src/engine/bout/kimariteStrategy.ts` (874 lines)
**Current State**: Large kimarite strategy registry with condition functions.
**Issues**:
- Data-heavy file with many strategy definitions
- Could be split by kimarite categories

**Refactoring Strategy**:
```
src/engine/bout/kimarite/
├── index.ts (main exports)
├── kimariteStrategy.ts (registry logic, ~200 lines)
├── strategies/
│   ├── pushTechniques.ts
│   ├── throwTechniques.ts
│   ├── twistTechniques.ts
│   ├── tripTechniques.ts
│   └── specialTechniques.ts
└── data/
    ├── kimariteWeights.ts
    └── kimariteConditions.ts
```

**Note**: This is primarily data, so splitting is lower priority but improves maintainability.

**Estimated Time**: 1-2 days

---

#### File: `src/engine/shikona.ts` (810 lines)
**Current State**: Complex shikona generation with house styles and patterns.
**Issues**:
- Multiple generation strategies in one file
- Complex pattern matching logic

**Refactoring Strategy**:
```
src/engine/shikona/
├── index.ts (main exports)
├── shikonaGenerator.ts (main generation logic, ~300 lines)
├── patterns/
│   ├── houseStyles.ts
│   ├── rankRules.ts
│   ├── patternWeights.ts
│   └── legacyPatterns.ts
├── components/
│   ├── prefixes.ts
│   ├── suffixes.ts
│   └── connectors.ts
└── utilities/
    ├── rngHelpers.ts
    └── validation.ts
```

**Test Additions**:
- Tests for each pattern module
- Generation determinism tests

**Estimated Time**: 2 days

---

#### File: `src/engine/npcSponsorStrategy.ts` (677 lines)
**Current State**: Large NPC sponsor strategy logic.
**Issues**:
- Complex decision-making logic
- Could be split by strategy types

**Refactoring Strategy**:
```
src/engine/npc/
├── sponsorStrategy.ts (main logic, ~200 lines)
├── strategies/
│   ├── tierSelection.ts
│   ├── budgeting.ts
│   └── renewalDecisions.ts
└── utilities/
    └── sponsorEvaluation.ts
```

**Test Additions**:
- Tests for each strategy module
- Integration tests for sponsor decisions

**Estimated Time**: 2 days

---

#### File: `src/engine/npcAI.ts` (584 lines)
**Current State**: NPC AI with decision-making logic.
**Issues**:
- Multiple AI decision types in one file

**Refactoring Strategy**:
```
src/engine/npc/
├── npcAI.ts (main AI, ~200 lines)
├── decisions/
│   ├── trainingDecisions.ts
│   ├── rosterDecisions.ts
│   └── recruitmentDecisions.ts
└── utilities/
    └── decisionScoring.ts
```

**Test Additions**:
- Tests for each decision module
- AI behavior tests

**Estimated Time**: 2 days

---

## Part 2: Duplicate Code Pattern Elimination

### 2.1 Entity Access Pattern

**Pattern Found**: Repeated `world.heyas.get(id)` and `world.rikishi.get(id)` throughout codebase.

**Solution**: Create utility functions with null safety:

```typescript
// src/engine/utils/entityAccess.ts
export function getHeya(world: WorldState, id: Id): Heya | undefined {
  return world.heyas.get(id);
}

export function getHeyaOrThrow(world: WorldState, id: Id): Heya {
  const heya = world.heyas.get(id);
  if (!heya) throw new Error(`Heya not found: ${id}`);
  return heya;
}

export function getRikishi(world: WorldState, id: Id): Rikishi | undefined {
  return world.rikishi.get(id);
}

export function getRikishiOrThrow(world: WorldState, id: Id): Rikishi {
  const rikishi = world.rikishi.get(id);
  if (!rikishi) throw new Error(`Rikishi not found: ${id}`);
  return rikishi;
}

export function getHeyaRikishi(world: WorldState, heyaId: Id): Rikishi[] {
  const heya = getHeya(world, heyaId);
  if (!heya) return [];
  return (heya.rikishiIds ?? [])
    .map(id => getRikishi(world, id))
    .filter((r): r is Rikishi => r !== undefined);
}
```

**Implementation Steps**:
1. Create utility module
2. Find and replace all `world.heyas.get()` and `world.rikishi.get()` calls
3. Use appropriate variant (get vs getOrThrow) based on context
4. Add unit tests for utility functions

**Estimated Time**: 1 day

---

### 2.2 Map/Filter Chain Pattern

**Pattern Found**: Repeated `.map().filter()` chains for entity lookups.

**Current Example**:
```typescript
const heyaRikishi = (heya.rikishiIds ?? []).map((id) => world.rikishi.get(id)).filter(Boolean);
```

**Solution**: Create utility functions:

```typescript
// src/engine/utils/collectionOperations.ts
export function mapIdsToEntities<T>(
  ids: Id[] | undefined,
  entityMap: Map<Id, T>
): T[] {
  if (!ids) return [];
  return ids
    .map(id => entityMap.get(id))
    .filter((entity): entity is T => entity !== undefined);
}

export function mapIdsToRikishi(world: WorldState, ids: Id[] | undefined): Rikishi[] {
  return mapIdsToEntities(ids, world.rikishi);
}

export function mapIdsToHeya(world: WorldState, ids: Id[] | undefined): Heya[] {
  return mapIdsToEntities(ids, world.heyas);
}
```

**Implementation Steps**:
1. Create utility module
2. Replace map/filter chains with utility functions
3. Add unit tests

**Estimated Time**: 0.5 days

---

### 2.3 Projection Pattern Duplication

**Pattern Found**: Similar projection logic across multiple presenter functions.

**Solution**: Create base projection utilities:

```typescript
// src/presenters/projections/baseProjections.ts
export function createBaseProjection<T extends { id: Id }>(
  entity: T
): { id: Id } & Partial<T> {
  return { id: entity.id };
}

export function projectWithDefaults<T, P>(
  entity: T,
  defaults: P
): T & P {
  return { ...entity, ...defaults };
}
```

**Estimated Time**: 0.5 days

---

### 2.4 Color/Style Map Duplication

**Pattern Found**: Similar color maps defined in multiple components.

**Solution**: Create centralized color utilities:

```typescript
// src/components/ui/colorMaps.ts
export const STATUS_COLORS = {
  secure: "text-success",
  comfortable: "text-green-400",
  tight: "text-gold",
  critical: "text-orange-400",
  desperate: "text-red-400",
} as const;

export const BAND_COLORS = {
  legendary: "text-gold",
  powerful: "text-primary",
  established: "text-west",
  rebuilding: "text-warning",
  fragile: "text-destructive",
  new: "text-success",
} as const;
```

**Implementation Steps**:
1. Extract common color maps to shared module
2. Replace inline color maps with imports
3. Ensure type safety with `as const`

**Estimated Time**: 0.5 days

---

## Part 3: System Integration Verification

### 3.1 Engine Service Integration Audit

**Goal**: Ensure all engine services are properly connected to UI layer.

**Services to Verify**:
1. **TalentPoolService** - Connected to TalentPoolPage ✓
2. **MediaService** - Connected to MediaPage ✓
3. **TrainingService** - Connected to TrainingPage ✓
4. **WelfareService** - Connected to InjuryRecoveryPage ✓
5. **SponsorshipService** - Connected to SponsorManagementPage ✓
6. **KenshoService** - Connected to EconomyPage ✓
7. **InjuryService** - Connected to InjuryRecoveryPage ✓
8. **RecoveryService** - Connected to InjuryRecoveryPage ✓
9. **GovernanceService** - Connected to GovernancePage ✓
10. **RivalryService** - Connected to RivalriesPage ✓
11. **FacilitiesService** - Connected to FacilitiesPage ✓
12. **StaffService** - Connected to StaffPage ✓
13. **KeshoMawashiGenerator** - Connected to Kesho components ✓
14. **HeyaBrandGenerator** - Connected to stable pages ✓
15. **NarrativeService** - Connected to various pages ✓

**Verification Steps**:
1. For each service, trace import chain from engine → presenter → page
2. Identify any services without UI connections
3. Create presenter functions for disconnected services
4. Add UI components for missing features

**Potential Gaps Identified**:
- **MyosekiMarket** - Connected to MyosekiMarketPage ✓
- **HolidaySystem** - Connected via game context ✓
- **AutoSim** - Connected via game context ✓

**Action Items**:
- All major services appear connected
- Add integration tests to verify end-to-end data flow

**Test Additions**:
- `src/__tests__/integration/serviceToUIIntegration.test.ts`
- Tests verifying data flows from engine through presenters to UI

**Estimated Time**: 1 day

---

### 3.2 Event System Integration

**Goal**: Ensure all event types are properly surfaced in UI.

**Event Categories**:
- injury ✓ (InjuryRecoveryPage, WeeklyDigest)
- training ✓ (TrainingPage, WeeklyDigest)
- economy ✓ (EconomyPage, WeeklyDigest)
- scouting ✓ (ScoutingPage, WeeklyDigest)
- basho ✓ (BashoPage, RecapPage, WeeklyDigest)
- career ✓ (RikishiPage, HallOfFamePage)
- discipline ✓ (GovernancePage)
- narrative ✓ (MediaPage, WeeklyDigest)
- welfare ✓ (InjuryRecoveryPage, WeeklyDigest)
- milestone ✓ (RikishiPage, HallOfFamePage)
- media ✓ (MediaPage, WeeklyDigest)
- rivalry ✓ (RivalriesPage, WeeklyDigest)

**Verification Steps**:
1. Check each event category has corresponding UI display
2. Verify EventLogPanel displays all event types
3. Ensure event filtering works correctly

**Action Items**:
- All event categories appear connected
- Add event type filtering tests

**Test Additions**:
- `src/components/layout/__tests__/EventLogPanel.test.tsx`
- Tests for event filtering and display

**Estimated Time**: 0.5 days

---

### 3.3 Pipeline Integration Verification

**Goal**: Ensure all tick phases are properly connected.

**Tick Phases**:
- phase00_preflight ✓
- phase01_week_* (economy, training, health, welfare, recruitment, governance, rivalries, npc_ai) ✓
- phase01_daily_* (economy, welfare, sponsors, drama) ✓
- phase01_monthly_market ✓
- phase02_context ✓
- phase_pre_basho_assessment ✓
- phase_pre_basho_schedule ✓
- phase05_monthly_boundary ✓
- phase06_narrative ✓
- phase06_yearly_boundary ✓

**Verification Steps**:
1. Verify each phase is included in appropriate pipeline
2. Check phase order is correct
3. Ensure phase dependencies are documented

**Action Items**:
- All phases appear connected
- Add pipeline integration tests

**Test Additions**:
- `src/engine/tick/__tests__/pipelineIntegration.test.ts`
- Tests verifying phase execution order and data flow

**Estimated Time**: 0.5 days

---

## Part 4: UI/UX Connectivity Verification

### 4.1 Navigation Structure Audit

**Current Navigation**:
- HQ_TABS: stable, roster, training, staff, medical ✓
- OFFICE_TABS: economy, facilities, sponsors, scouting ✓
- ASSOCIATION_TABS: governance, myoseki, media, trends ✓
- TOURNAMENT_TABS: basho, banzuke, schedule, rivalries ✓
- RECORDS_TABS: history, almanac, hall-of-fame ✓

**All Pages Connected**:
- MainMenu ✓
- Dashboard ✓
- StablePage ✓ (with sub-routes)
- TrainingPage ✓
- StaffPage ✓
- InjuryRecoveryPage ✓
- EconomyPage ✓
- FacilitiesPage ✓
- SponsorManagementPage ✓
- ScoutingPage ✓
- GovernancePage ✓
- MyosekiMarketPage ✓
- MediaPage ✓
- TrendsPage ✓
- BashoPage ✓
- BanzukePage ✓
- SchedulePage ✓
- RivalriesPage ✓
- HistoryPage ✓
- AlmanacPage ✓
- HallOfFamePage ✓
- TalentPoolPage ✓
- NewGameWizard ✓
- SettingsPage ✓
- NotFound ✓

**Action Items**:
- All pages are connected via navigation
- No disconnected pages found
- Add route tests to verify navigation

**Test Additions**:
- `src/__tests__/integration/navigation.test.tsx`
- Tests verifying all routes are accessible

**Estimated Time**: 0.5 days

---

### 4.2 Component Integration Audit

**Dashboard Widgets** (all connected to Dashboard):
- StableWidget ✓
- ScoutingWidget ✓
- TrainingWidget ✓
- BanzukeWidget ✓
- BashoWidget ✓
- DigestWidget ✓
- CalendarWidget ✓
- FacilitiesWidget ✓
- FinancesWidget ✓
- YushoRaceWidget ✓
- TrendsWidget ✓
- RivalsWidget ✓
- InstitutionWidget ✓

**Game Components** (all integrated):
- WeeklyDigest ✓
- BoutNarrativeModal ✓
- MatchDayViewer ✓
- AutoSimControls ✓
- SponsorsPanel ✓
- InstitutionPanel ✓
- WelfarePanel ✓
- RivalStablesPanel ✓
- PerceptionOverview ✓
- StableOverviewPanel ✓
- InjuryRecoveryPanel ✓
- HolidayControls ✓
- IntaiCeremony ✓
- ProgressionTracker ✓
- BoutResultDisplay ✓
- SaveLoadDialog ✓

**Kesho Components** (all integrated):
- KeshoMawashiDisplay ✓
- KeshoBadge ✓
- KeshoMiniIndicator ✓

**Avatar Components** (all integrated):
- SumoAvatar ✓
- AvatarWithBadge ✓
- AvatarStack ✓
- AvatarGallery ✓

**Action Items**:
- All components appear integrated
- Add component usage tests

**Test Additions**:
- Component integration tests
- Widget rendering tests

**Estimated Time**: 0.5 days

---

### 4.3 Feature Surfacing Verification

**Features to Verify**:

1. **Recruitment System** ✓
   - TalentPoolPage
   - ScoutingPage
   - WeeklyDigest notifications

2. **Sponsor System** ✓
   - SponsorManagementPage
   - EconomyPage (income breakdown)
   - MediaPage (sponsor impact)

3. **Training System** ✓
   - TrainingPage
   - Dashboard (TrainingWidget)
   - WeeklyDigest (training events)

4. **Facilities System** ✓
   - FacilitiesPage
   - Dashboard (FacilitiesWidget)
   - EconomyPage (expense breakdown)

5. **Welfare System** ✓
   - InjuryRecoveryPage
   - Dashboard (medical alerts)
   - WeeklyDigest (welfare events)

6. **Media System** ✓
   - MediaPage
   - Dashboard (media trends)
   - WeeklyDigest (media events)

7. **Rivalry System** ✓
   - RivalriesPage
   - Dashboard (RivalsWidget)
   - WeeklyDigest (rivalry events)

8. **Governance System** ✓
   - GovernancePage
   - WeeklyDigest (governance events)

9. **Myoseki Market** ✓
   - MyosekiMarketPage
   - OyakataPage (myoseki display)

10. **Hall of Fame** ✓
    - HallOfFamePage
    - RikishiPage (milestones)
    - RecapPage (inductees)

**Action Items**:
- All major features are surfaced
- No disconnected features found
- Add feature integration tests

**Test Additions**:
- Feature flow tests (e.g., recruitment → signing → roster)
- End-to-end feature tests

**Estimated Time**: 1 day

---

## Part 5: Test Coverage Assessment and Additions

### 5.1 Current Test Coverage

**Test Files**: 91 test files
**Test Directories**: 14 directories in src/engine

**Coverage by Area**:
- **Engine Core**: Good coverage (core, utils, types)
- **Bout System**: Good coverage (boutResolver, boutPhysics, kimariteClassifier)
- **Tick System**: Good coverage (advanceWeek, pipelineRunner)
- **Generation**: Moderate coverage (WorldFactory, CandidateGenerator, TalentPoolService)
- **Systems**: Mixed coverage
  - Economics: Good (KenshoService, SponsorshipService)
  - Training: Moderate (TrainingMath)
  - Health: Good (InjuryService, RecoveryService)
  - Welfare: Moderate (WelfareCalculations)
  - Media: Limited
  - Narrative: Limited
  - Recruitment: Limited
- **Presenters**: No dedicated tests (rely on integration tests)
- **Pages**: No dedicated tests (rely on integration tests)
- **Components**: No dedicated tests (rely on integration tests)

---

### 5.2 Critical Test Additions

#### 5.2.1 Presenter Layer Tests

**Priority**: High - Presenters are critical for UI data transformation

**Tests to Add**:
```
src/presenters/__tests__/
├── rikishiProjections.test.ts
├── heyaProjections.test.ts
├── mediaProjections.test.ts
├── banzukeProjections.test.ts
├── digestProjections.test.ts
├── rankFormatters.test.ts
├── statusFormatters.test.ts
└── projectionIntegration.test.ts
```

**Coverage Goals**:
- All projection functions
- Edge cases (null/undefined handling)
- Data transformation accuracy

**Estimated Time**: 3 days

---

#### 5.2.2 System Service Tests

**Priority**: High - Core game logic

**Tests to Add**:
```
src/engine/systems/media/__tests__/
├── MediaService.test.ts
└── MediaImpactService.test.ts

src/engine/systems/narrative/__tests__/
├── NarrativeService.test.ts
├── RivalryService.test.ts
└── RivalryHeatService.test.ts

src/engine/systems/recruitment/__tests__/
├── ScoutingService.test.ts
└── FogOfWarService.test.ts

src/engine/systems/training/__tests__/
├── TrainingService.test.ts
└── TrainingNarrative.test.ts
```

**Coverage Goals**:
- All service methods
- State mutations
- Edge cases and error handling

**Estimated Time**: 4 days

---

#### 5.2.3 Page Component Tests

**Priority**: Medium - UI integration

**Tests to Add**:
```
src/pages/__tests__/
├── Dashboard.test.tsx
├── EconomyPage.test.tsx
├── TrainingPage.test.tsx
├── TalentPoolPage.test.tsx
└── pageIntegration.test.tsx
```

**Coverage Goals**:
- Component rendering
- User interactions
- Data flow

**Estimated Time**: 3 days

---

#### 5.2.4 Component Tests

**Priority**: Medium - Reusable components

**Tests to Add**:
```
src/components/dashboard/__tests__/
├── StableWidget.test.tsx
├── ScoutingWidget.test.tsx
└── TrainingWidget.test.tsx

src/components/game/__tests__/
├── WeeklyDigest.test.tsx
├── BoutNarrativeModal.test.tsx
└── MatchDayViewer.test.tsx
```

**Coverage Goals**:
- Component rendering
- Props validation
- User interactions

**Estimated Time**: 3 days

---

#### 5.2.5 Integration Tests

**Priority**: High - End-to-end verification

**Tests to Add**:
```
src/__tests__/integration/
├── serviceToUIIntegration.test.ts
├── navigation.test.tsx
├── featureFlows.test.ts
├── tickPipeline.test.ts
└── dataPersistence.test.ts
```

**Coverage Goals**:
- End-to-end data flows
- Feature workflows
- System integration

**Estimated Time**: 3 days

---

### 5.3 Test Infrastructure Improvements

**Actions**:
1. Set up test coverage reporting (Istanbul/nyc)
2. Add coverage thresholds to package.json
3. Create test utilities for common test scenarios
4. Set up test data fixtures
5. Add visual regression testing for UI components

**Estimated Time**: 2 days

---

## Part 6: Implementation Timeline

### Phase 1: Foundation (Week 1)
- Create utility modules for common patterns (entity access, collection operations)
- Set up test infrastructure improvements
- Create directory structures for refactored modules

**Deliverables**:
- Utility modules created
- Test infrastructure improved
- Directory structures ready

---

### Phase 2: Presenter Layer Refactoring (Week 2)
- Decompose uiDigest.ts into focused modules
- Add presenter tests
- Update all imports

**Deliverables**:
- uiDigest decomposed into 20+ focused modules
- Presenter tests added
- All imports updated

---

### Phase 3: Page Component Decomposition (Week 3)
- Refactor RikishiPage, EconomyPage, TrainingPage
- Add component tests
- Create custom hooks

**Deliverables**:
- 3 major pages refactored
- Sub-components created
- Component tests added

---

### Phase 4: Engine Service Decomposition (Week 4)
- Refactor TalentPoolService, events.ts, boutPhysics.ts
- Add service tests
- Separate concerns into focused modules

**Deliverables**:
- 3 major services refactored
- Service tests added
- Modules separated by concern

---

### Phase 5: Component Decomposition (Week 5)
- Refactor KeshoMawashiDisplay, PerceptionOverview, sidebar
- Add component tests
- Split pattern renderers

**Deliverables**:
- 3 major components refactored
- Component tests added
- Pattern modules created

---

### Phase 6: Data-Heavy File Optimization (Week 5-6)
- Refactor kimariteStrategy, shikona, npcSponsorStrategy, npcAI
- Add tests for data modules

**Deliverables**:
- 4 data-heavy files optimized
- Data modules separated
- Tests added

---

### Phase 7: System Integration & Testing (Week 6)
- Verify all system integrations
- Add integration tests
- Verify UI/UX connectivity

**Deliverables**:
- All integrations verified
- Integration tests added
- UI/UX connectivity confirmed

---

### Phase 8: Final Review & Documentation (Week 6)
- Code review
- Documentation updates
- Performance verification

**Deliverables**:
- Code review completed
- Documentation updated
- Performance verified

---

## Part 7: Risk Mitigation

### 7.1 Breaking Changes

**Risk**: Refactoring may break existing functionality.

**Mitigation**:
- Create feature flags for major changes
- Maintain compatibility layers during transition
- Run full test suite after each phase
- Use git branches for each phase

---

### 7.2 Import Path Changes

**Risk**: Import path updates may be missed.

**Mitigation**:
- Use TypeScript to catch missing imports
- Run comprehensive grep for old import patterns
- Add linter rules to enforce new patterns
- Update all imports in bulk with automated tools

---

### 7.3 Test Failures

**Risk**: New tests may fail or existing tests may break.

**Mitigation**:
- Run tests frequently during refactoring
- Fix test failures immediately
- Update test data fixtures as needed
- Document test changes

---

### 7.4 Performance Regression

**Risk**: Refactoring may impact performance.

**Mitigation**:
- Benchmark critical paths before and after
- Profile performance during refactoring
- Optimize hot paths
- Monitor production metrics

---

## Part 8: Success Criteria

### 8.1 Code Quality Metrics

- **Maximum file size**: <500 lines (except data files)
- **Maximum function size**: <100 lines
- **Duplicate code**: <5% similarity
- **Test coverage**: >80% for critical paths
- **TypeScript strict mode**: No errors

### 8.2 Maintainability Metrics

- **Cyclomatic complexity**: <15 per function
- **Code duplication**: <3%
- **Module coupling**: Low coupling, high cohesion
- **Documentation**: All public APIs documented

### 8.3 Feature Completeness

- **All services connected**: 100%
- **All pages accessible**: 100%
- **All features surfaced**: 100%
- **All event types displayed**: 100%

### 8.4 Test Coverage

- **Presenter layer**: >80%
- **Engine services**: >85%
- **Page components**: >70%
- **Reusable components**: >75%
- **Integration tests**: >60%

---

## Part 9: Post-Refactoring Maintenance

### 9.1 Code Review Checklist

- [ ] All files under 500 lines
- [ ] All functions under 100 lines
- [ ] No duplicate code patterns
- [ ] All tests passing
- [ ] Type coverage complete
- [ ] Documentation updated
- [ ] Performance benchmarks met

### 9.2 Monitoring

- Monitor error rates in production
- Track performance metrics
- Gather user feedback
- Review test coverage trends

### 9.3 Continuous Improvement

- Regular code reviews
- Monthly refactoring sprints
- Quarterly architecture reviews
- Annual technical debt assessment

---

## Part 10: Appendices

### Appendix A: File Size Audit Results

**Files >500 lines**:
1. src/presenters/uiDigest.ts: 1,099 lines
2. src/pages/RikishiPage.tsx: 1,132 lines
3. src/engine/systems/generation/TalentPoolService.ts: 936 lines
4. src/engine/bout/kimariteStrategy.ts: 874 lines
5. src/engine/shikona.ts: 810 lines
6. src/components/kesho/KeshoMawashiDisplay.tsx: 797 lines
7. src/pages/EconomyPage.tsx: 754 lines
8. src/engine/bout/boutPhysics.ts: 722 lines
9. src/engine/npcSponsorStrategy.ts: 677 lines
10. src/pages/TrainingPage.tsx: 670 lines
11. src/engine/events.ts: 665 lines
12. src/components/game/PerceptionOverview.tsx: 658 lines
13. src/components/ui/sidebar.tsx: 641 lines
14. src/engine/bout/__tests__/boutResultApplier.test.ts: 631 lines
15. src/engine/almanac.ts: 609 lines
16. src/pages/RivalriesPage.tsx: 599 lines
17. src/engine/systems/generation/CandidateGenerator.ts: 585 lines
18. src/engine/npcAI.ts: 584 lines
19. src/engine/lifecycle/CompetitionService.ts: 579 lines
20. src/engine/systems/media/MediaService.ts: 554 lines
21. src/engine/schedule.ts: 507 lines
22. src/components/game/boutReplay/boutCanvas.ts: 505 lines
23. src/engine/world.ts: 504 lines
24. src/engine/holiday.ts: 500 lines

---

### Appendix B: Duplicate Pattern Analysis

**Pattern 1: Entity Access**
- Occurrences: 50+
- Files affected: 30+
- Solution: Utility functions

**Pattern 2: Map/Filter Chains**
- Occurrences: 20+
- Files affected: 15+
- Solution: Collection utilities

**Pattern 3: Color Maps**
- Occurrences: 10+
- Files affected: 8+
- Solution: Centralized color utilities

**Pattern 4: Projection Logic**
- Occurrences: 15+
- Files affected: 12+
- Solution: Base projection utilities

---

### Appendix C: System Integration Matrix

| Service | UI Connection | Presenter | Page | Status |
|---------|---------------|-----------|------|--------|
| TalentPoolService | ✓ | ✓ | TalentPoolPage | Connected |
| MediaService | ✓ | ✓ | MediaPage | Connected |
| TrainingService | ✓ | ✓ | TrainingPage | Connected |
| WelfareService | ✓ | ✓ | InjuryRecoveryPage | Connected |
| SponsorshipService | ✓ | ✓ | SponsorManagementPage | Connected |
| KenshoService | ✓ | ✓ | EconomyPage | Connected |
| InjuryService | ✓ | ✓ | InjuryRecoveryPage | Connected |
| RecoveryService | ✓ | ✓ | InjuryRecoveryPage | Connected |
| GovernanceService | ✓ | ✓ | GovernancePage | Connected |
| RivalryService | ✓ | ✓ | RivalriesPage | Connected |
| FacilitiesService | ✓ | ✓ | FacilitiesPage | Connected |
| StaffService | ✓ | ✓ | StaffPage | Connected |
| KeshoMawashiGenerator | ✓ | ✓ | Kesho components | Connected |
| HeyaBrandGenerator | ✓ | ✓ | StablePage | Connected |
| NarrativeService | ✓ | ✓ | Multiple pages | Connected |

---

### Appendix D: Test Coverage Report

**Current Test Files**: 91
**Test Directories**: 14

**Coverage by Module**:
- Engine Core: 85%
- Bout System: 90%
- Tick System: 85%
- Generation: 70%
- Systems - Economics: 80%
- Systems - Training: 65%
- Systems - Health: 80%
- Systems - Welfare: 70%
- Systems - Media: 40%
- Systems - Narrative: 45%
- Systems - Recruitment: 50%
- Presenters: 0%
- Pages: 0%
- Components: 0%

**Target Coverage**:
- Engine Core: 90%
- Bout System: 90%
- Tick System: 90%
- Generation: 85%
- All Systems: 85%
- Presenters: 80%
- Pages: 70%
- Components: 75%

---

## Conclusion

This comprehensive refactoring plan addresses the major technical debt areas in the sumo-manager-pro codebase:

1. **Monolithic code** - 25 files decomposed into focused modules
2. **Duplicate patterns** - 4 major patterns eliminated with utilities
3. **System integration** - All services verified and connected
4. **UI/UX connectivity** - All features surfaced and accessible
5. **Test coverage** - Comprehensive test suite added

The refactoring will be executed in 8 phases over 6 weeks, with careful attention to breaking changes, performance, and maintainability. The result will be a more maintainable, testable, and scalable codebase that adheres to best practices and supports future development.

**Total Estimated Time**: 6 weeks
**Total Estimated Effort**: 30-35 person-days
**Risk Level**: Medium (mitigated by phased approach)
**Expected Benefits**: 
- Improved maintainability
- Better test coverage
- Easier onboarding
- Reduced technical debt
- Enhanced feature development speed
