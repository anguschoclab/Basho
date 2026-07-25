# Branch Merge & Test-First Implementation Plan

**Project**: sumo-manager-pro (Basho Sumo Manager Game)
**Date**: 2025-07-24
**Scope**: Merge 9 open branches into `main`, validate prior implementation findings, plan and build tests before any feature code changes.

---

## Part 1: Branch Merge Plan

### 1.1 Branch Inventory

All 9 branches share a common merge-base (`50d77fad`) and a large shared diff (~35 files of identical refactoring: `TrainingMath.ts`, `phase02_context.ts`, `world.ts` type cleanup, test deletions). Each branch adds a small unique delta on top.

| # | Branch | Unique Change | Files Touched (unique) |
|---|--------|--------------|----------------------|
| 1 | `mason-tighten-entityservice-types-16132429650355635217` | Tighten `EntityService.ensureState`/`ensureNestedState` generics | `src/engine/core/EntityService.ts` |
| 2 | `mason-tighten-types-3521035839130886181` | Remove redundant `as unknown as` casts in `CandidateBuilder` and `phase01_daily_welfare` | `src/engine/systems/generation/CandidateBuilder.ts`, `src/engine/tick/phases/phase01_daily_welfare.ts` |
| 3 | `scout/naturalization-tests-3915564399072206507` | Add `naturalization.test.ts` (4 tests) | `src/tests/unit/engine/naturalization.test.ts` |
| 4 | `jules-13983115806790070859-6e431f53` | Add `InfrastructureService.test.ts` (147 lines) | `src/tests/unit/engine/systems/economy/InfrastructureService.test.ts` |
| 5 | `bolt-staff-page-opt-2345290415344466505` | Replace `.filter().length` with `for...of` in `StaffPage` and `MainMenu` | `src/pages/StaffPage.tsx`, `src/pages/MainMenu.tsx` |
| 6 | `polish-bookmarks-emptystate-16724959925495627399` | Use `EmptyState` in `BookmarksPage` | `src/pages/BookmarksPage.tsx` |
| 7 | `polish-sparring-empty-state-14386814316902492601` | Use `EmptyState` in `SparringPanel` | `src/components/game/SparringPanel.tsx` |
| 8 | `polish-yusho-race-widget-15680607004912962964` | Refactor `YushoRaceWidget` to use `BaseWidget` + `EmptyState` | `src/components/dashboard/YushoRaceWidget.tsx` |
| 9 | `scout/fix-mentor-assignment-test-8279217419747211687` | Add `@testing-library/user-event` dep, update `.jules/scout.md` | `package.json`, `.jules/scout.md`, `.claude/settings.local.json` |

### 1.2 Conflict Analysis

**Source code conflicts**: NONE expected. Each branch touches distinct files for its unique delta. The shared ~35-file diff is byte-identical across all branches (same base commit), so Git will auto-merge without conflict after the first branch is merged.

**Task-tracking markdown conflicts**: EXPECTED in `.jules/*.md` files. Each branch appends its own learning entry. These are additive and can be resolved by concatenating entries.

**Merge order** (safest first — tests and deps before features):

1. `scout/fix-mentor-assignment-test-8279217419747211687` — adds `user-event` dep
2. `jules-13983115806790070859-6e431f53` — adds `InfrastructureService.test.ts`
3. `scout/naturalization-tests-3915564399072206507` — adds `naturalization.test.ts`
4. `mason-tighten-entityservice-types-16132429650355635217` — tightens `EntityService` types
5. `mason-tighten-types-3521035839130886181` — removes redundant casts
6. `polish-bookmarks-emptystate-16724959925495627399` — UI: BookmarksPage
7. `polish-sparring-empty-state-14386814316902492601` — UI: SparringPanel
8. `polish-yusho-race-widget-15680607004912962964` — UI: YushoRaceWidget
9. `bolt-staff-page-opt-2345290415344466505` — perf: StaffPage/MainMenu

### 1.3 Merge Procedure

```bash
git checkout main
git merge --no-ff origin/scout/fix-mentor-assignment-test-8279217419747211687
# Resolve .jules/scout.md conflict (concatenate entries)
git add .jules/scout.md && git commit

git merge --no-ff origin/jules-13983115806790070859-6e431f53
# Resolve .jules/scout.md conflict
git add .jules/scout.md && git commit

# ... repeat for remaining branches in order
```

After each merge, run `bun run typecheck` and `bun run test` to catch regressions early.

---

## Part 2: Review of Prior Implementation Plan Findings

### 2.1 Finding: EntityService Type Tightening (Branch #1)

**Status**: ✅ APPROVED

The change replaces `any` with generic constraints:
```ts
ensureState<Parent extends Record<string, any>, Key extends keyof Parent>(
  parent: Parent,
  key: Key,
  factory: () => NonNullable<Parent[Key]>
): NonNullable<Parent[Key]>
```

**Verification**:
- `src/engine/core/EntityService.ts:38-43` — The new signature is sound. Callers must pass a parent with the key present, and the return type is `NonNullable<Parent[Key]>`.
- `ensureNestedState` at `src/engine/core/EntityService.ts:72-105` — The `world[rootKey] as unknown` cast is still needed because `rootKey` is `keyof WorldState` and the union includes non-Map types. The `as Record<string, T>` narrowing in the else-branch is safe.
- The `sparringPairs` allowlist entry at line 87 is correct — `sparringPairs` is `IdMapRuntime<SparringState>` which is `Map<string, SparringState>`.

**Risk**: Low. Callers that currently pass `any` will need to be updated, but the shared diff already updates all callers in `TrainingMath.ts`, `FogOfWarService.ts`, etc.

### 2.2 Finding: CandidateBuilder Cast Removal (Branch #2)

**Status**: ✅ APPROVED WITH CAVEAT

The change at `src/engine/systems/generation/CandidateBuilder.ts:277` replaces `as unknown as Rikishi` with `as Rikishi`. This means the object literal must be structurally compatible with `Rikishi`.

**Verification**:
- The object literal at lines 240-277 includes: `id`, `name`, `shikona`, `rank`, `division`, `side`, `rankNumber`, `heyaId`, `nationality`, `birthYear`, `age`, `stats`, `combatProfile`, `potential`, `avatarConfig`, `talentSeed`, `joinedHeyaDate`.
- Cross-referenced with `Rikishi` interface at `src/engine/types/rikishi.ts:1-238`: the interface has many optional fields (`careerWins?`, `careerLosses?`, `injured?`, `injuryStatus?`, `mentorId?`, `descriptor?`, `heyaHistory?`, etc.).
- The `as Rikishi` cast will succeed because all required `Rikishi` fields are present and the rest are optional.

**Caveat**: This relies on `Rikishi` having no required fields beyond what the literal provides. If a future commit adds a required field to `Rikishi`, this will break at compile time (which is the desired behavior).

**Phase01_daily_welfare cast removal**: Also safe. `toRikishiDescriptor` returns `RikishiDescriptor` and the cast `as Rikishi["descriptor"]` is valid since `descriptor` is typed as `RikishiDescriptor`. The `tickCondition` call with `next` instead of `next as unknown as Rikishi` is safe because `next` is already typed as `Rikishi` (from `const next = { ...r }` where `r` is `Rikishi`).

### 2.3 Finding: Naturalization Tests (Branch #3)

**Status**: ⚠️ APPROVED WITH FLAKINESS RISK

**Verification**:
- `src/engine/naturalization.ts:52` uses `rngFromSeed(`nat_${r.id}_${world.year}`, "naturalization", "chance")` — this is **deterministic** based on `r.id` and `world.year`.
- Test 1 uses `id: "rikishi_24"`, `world.year = 2025` → seed = `nat_rikishi_24_2025`. The test **assumes** this seed produces a roll < 5 (passing the 5% chance). This is deterministic but **fragile** — if the RNG implementation changes, the test will break silently.
- Test 2 uses `id: "rikishi_fail_1"` → seed = `nat_rikishi_fail_1_2025`. The test assumes this produces a roll >= 5.
- Test 4 uses `id: "rikishi_24"` with `rank: "yokozuna"` and `birthYear: 1993` (age 32). Same seed as test 1, so same RNG outcome.

**Risk**: Medium. Tests are deterministic but coupled to specific seed values. If `SeededRNG` implementation changes, tests may break. Recommend adding a comment documenting the expected RNG outcome.

### 2.4 Finding: InfrastructureService Tests (Branch #4)

**Status**: ✅ APPROVED

**Verification**:
- Tests at `src/tests/unit/engine/systems/economy/InfrastructureService.test.ts` cover `startConstruction`, `processCompletionTick`, and `getHeyaBonuses`.
- Cross-referenced with `src/engine/systems/economy/InfrastructureService.ts:214-263` — `getHeyaBonuses` logic matches test assertions:
  - `statBuffs.power *= 1 + (buffs.power - 1) * lv` → for `weights_room` level 1: `1 + (1.15 - 1) * 1 = 1.15` ✓
  - `injuryHealMod += def.bonuses.injuryHealMod * lv` → for `medical_suite` level 2: `-3 * 2 = -6` ✓ (test asserts `toBeCloseTo(-3 * 2, 5)`)
  - Inactive facilities are skipped (line 234: `if (state.status !== "active") continue;`) ✓

### 2.5 Finding: UI Polish Branches (#6, #7, #8)

**Status**: ✅ APPROVED

**BookmarksPage** (`polish-bookmarks-emptystate`):
- Replaces inline empty state markup with `<EmptyState icon={Bookmark} title="No bookmarks yet" description="..." />`.
- `EmptyState` at `src/components/ui/EmptyState.tsx` provides consistent styling. No accessibility regression — the component renders a proper `<h3>` heading.

**SparringPanel** (`polish-sparring-empty-state`):
- Replaces `<p>` italic text with `<EmptyState icon={Swords} title="No sparring pairs assigned" description="..." compact />`.
- The `compact` prop reduces padding. Safe change.

**YushoRaceWidget** (`polish-yusho-race-widget`):
- Replaces `Card`/`CardHeader`/`CardContent` with `BaseWidget` wrapper.
- Adds `EmptyState` for empty tournament state (previously returned `null`).
- `BaseWidget` at `src/components/dashboard/BaseWidget.tsx:1-122` provides `headerAction` prop with tooltip support.
- **Note**: The `any` type at `src/components/dashboard/YushoRaceWidget.tsx:94` (`contenders: { r: any; wins: number }[]`) is pre-existing and NOT touched by this branch. Flagging for future cleanup but not a blocker.

### 2.6 Finding: Bolt Staff Page Optimization (#5)

**Status**: ✅ APPROVED

- `StaffPage.tsx`: Replaces `(heya.staffIds || []).map(id => world.staff.get(id)).filter(Boolean) as Staff[]` with a `for...of` loop that pushes non-undefined values. Functionally equivalent, slightly more efficient.
- `MainMenu.tsx`: Replaces `picks.filter(p => p.statureBand === band).length` with a counting `for...of` loop. Functionally equivalent.

### 2.7 Finding: MentorAssignmentPanel Test Fix (#9)

**Status**: ✅ APPROVED

- Adds `@testing-library/user-event` to `package.json` devDependencies.
- The existing `MentorAssignmentPanel.test.tsx` imports `userEvent` from `@testing-library/user-event` — this dependency was missing.
- `MentorshipService.canMentor` at `src/engine/systems/training/MentorshipService.ts:88-106` correctly filters: same heya, not injured/retired, mentor must be sekitori, apprentice must be non-sekitori.
- Test coverage in `MentorAssignmentPanel.test.tsx:1-140` verifies eligibility filtering, assign/remove callbacks, and no-mentor helper text.

---

## Part 3: Test-First Implementation Plan

### 3.1 Tests to Build BEFORE Merge

These tests must be written and passing before merging any branch. They serve as regression guards.

#### Test Suite A: EntityService Type Safety Tests

**File**: `src/tests/unit/engine/core/EntityService.test.ts` (already exists, extend)

**New tests to add**:

```
- ensureState: returns existing state without calling factory
- ensureState: creates state via factory when missing
- ensureState: type inference works with typed parent objects
- ensureNestedState: initializes Map for Map-typed root keys (rikishi, heyas, sparringPairs)
- ensureNestedState: initializes POJO for non-Map root keys
- ensureNestedState: returns existing nested entry without calling factory
- ensureNestedState: creates nested entry via factory when missing
- ensureNestedState: sparringPairs is initialized as Map (regression for allowlist)
```

**Existing tests to verify**: Lines 1-68 of `EntityService.test.ts` already cover `ensureState` and `ensureNestedState` basics including `sparringPairs` field initialization. ✅

#### Test Suite B: CandidateBuilder Structural Compatibility

**File**: `src/tests/unit/engine/systems/generation/CandidateBuilder.test.ts` (already exists)

**New tests to add**:

```
- generateFullRikishi: return value satisfies Rikishi interface (no missing required fields)
- generateFullRikishi: produces valid combatProfile with archetype
- generateFullRikishi: produces valid stats object with all stat keys
- convertCandidateToRikishi: return value satisfies Rikishi interface
- convertCandidateToRikishi: preserves candidate developmentProfile
```

**Existing tests to verify**: Lines 1-176 cover avatar field migration, `avatarConfig` shape, and `faceAvatarUrl` removal. ✅

#### Test Suite C: Naturalization Determinism Tests

**File**: `src/tests/unit/engine/naturalization.test.ts` (from branch #3)

**Tests to verify** (4 tests):
```
- naturalizes eligible rikishi when chance roll passes (id: "rikishi_24", year: 2025)
- does not naturalize eligible rikishi when chance roll fails (id: "rikishi_fail_1", year: 2025)
- does not naturalize ineligible rikishi (careerWins below threshold)
- naturalizes age-eligible yokozuna (age 32, rank: yokozuna)
```

**Action needed**: Add a comment to each test documenting the expected RNG outcome for the given seed. Consider adding a fifth test that verifies determinism by running the same seed twice and asserting identical results.

#### Test Suite D: InfrastructureService Coverage

**File**: `src/tests/unit/engine/systems/economy/InfrastructureService.test.ts` (from branch #4)

**Tests to verify** (147 lines):
```
- getHeyaBonuses: aggregates stat buffs from multiple active facilities
- getHeyaBonuses: scales by facility level
- getHeyaBonuses: ignores inactive facilities
- getHeyaBonuses: aggregates injuryHealMod, mediaMod, fatigueFloor
- getHeyaBonuses: returns identity bonuses for heya with no infrastructure
- getHeyaBonuses: returns identity bonuses for undefined heya
- startConstruction: deducts funds and adds to queue
- startConstruction: rejects if insufficient funds
- startConstruction: rejects if already under construction
- startConstruction: validates regional presence requirements
- processCompletionTick: completes projects past completion year
- processCompletionTick: keeps incomplete projects in queue
```

#### Test Suite E: UI Component Tests

**File**: `src/tests/unit/components/ui/EmptyState.test.tsx` (new)

```
- renders title and description
- renders icon when provided
- renders action button with correct label
- renders secondary action button
- applies compact mode classes
- does not render icon container when icon is undefined
```

**File**: `src/tests/unit/components/dashboard/BaseWidget.test.tsx` (new)

```
- renders title and children
- renders header action with tooltip
- renders loading state
- renders footer when provided
- applies custom className
```

**File**: `src/tests/unit/components/dashboard/YushoRaceWidget.test.tsx` (new or extend)

```
- renders EmptyState when no active basho
- renders EmptyState when no contenders
- renders top 3 contenders with avatars and badges
- navigates to banzuke on header action click
```

**File**: `src/tests/unit/components/game/SparringPanel.test.tsx` (new or extend)

```
- renders EmptyState when pairs array is empty
- renders sparring pair cards when pairs exist
- calls onAddPair when add button clicked
- calls onRemovePair when remove button clicked
- displays chemistry badge for each pair
```

**File**: `src/tests/unit/components/game/MentorAssignmentPanel.test.tsx` (already exists)

**Tests to verify**: Lines 1-140 cover:
```
- renders mentor badge when mentorId is set
- calls onRemoveMentor when remove button clicked
- renders select dropdown when no mentor
- filters eligible mentors by canMentor criteria
- calls onAssignMentor when mentor selected
- renders helper text when no eligible mentors
```

#### Test Suite F: Phase01 Daily Welfare Tests

**File**: `src/tests/unit/engine/tick/phases/phase01_daily_welfare.test.ts` (new)

```
- applies austerity diet: reduces weight, reduces mental
- applies heavy_bulk diet: increases weight, reduces mental
- applies premium diet: increases weight, increases mental, recovers fatigue
- applies maintenance diet: no weight change
- recovers base fatigue for non-injured rikishi
- does not recover fatigue for injured rikishi
- syncs descriptor via toRikishiDescriptor
- applies tickCondition based on cyclePhase
- caches heya diets for performance
```

### 3.2 Test Execution Order

```bash
# 1. Run existing tests to establish baseline
bun run test

# 2. Run new test suites (after writing them)
bun run test -- src/tests/unit/engine/core/EntityService.test.ts
bun run test -- src/tests/unit/engine/systems/generation/CandidateBuilder.test.ts
bun run test -- src/tests/unit/engine/naturalization.test.ts
bun run test -- src/tests/unit/engine/systems/economy/InfrastructureService.test.ts
bun run test -- src/tests/unit/components/ui/EmptyState.test.tsx
bun run test -- src/tests/unit/components/dashboard/BaseWidget.test.tsx
bun run test -- src/tests/unit/components/dashboard/YushoRaceWidget.test.tsx
bun run test -- src/tests/unit/components/game/SparringPanel.test.tsx
bun run test -- src/tests/unit/components/game/MentorAssignmentPanel.test.tsx
bun run test -- src/tests/unit/engine/tick/phases/phase01_daily_welfare.test.ts

# 3. Type check
bun run typecheck

# 4. Lint
bun run lint
```

---

## Part 4: Bug Fixes & Verification

### 4.1 Known Issues to Fix

| # | Issue | Severity | Location | Fix |
|---|-------|----------|----------|-----|
| 1 | `any` type in `YushoRaceWidget` contenders | Low | `src/components/dashboard/YushoRaceWidget.tsx:94` | Replace `{ r: any; wins: number }` with `{ r: Rikishi; wins: number }` |
| 2 | `EmptyState` missing `aria-label` on action buttons | Low | `src/components/ui/EmptyState.tsx:100-117` | Add `aria-label={action.label}` to Button components |
| 3 | Naturalization test seed coupling | Low | `src/tests/unit/engine/naturalization.test.ts` | Add comments documenting expected RNG outcomes for each seed |
| 4 | `EntityService.ensureState` still uses `any` internally | Low | `src/engine/core/EntityService.ts:38` | The `Parent extends Record<string, any>` constraint is acceptable — `any` here is structural glue |

### 4.2 Post-Merge Verification Checklist

```
[ ] bun run typecheck — zero errors
[ ] bun run test — all tests pass
[ ] bun run lint — no new errors
[ ] bun run build — production build succeeds
[ ] Manual: Launch app, verify dashboard renders YushoRaceWidget
[ ] Manual: Navigate to Training page, verify SparringPanel renders
[ ] Manual: Navigate to Bookmarks page, verify EmptyState renders
[ ] Manual: Navigate to Staff page, verify staff list renders
[ ] Manual: Run a weekly tick, verify naturalization events fire correctly
[ ] Manual: Verify InfrastructureService bonuses apply in training
```

### 4.3 Regression Watch Points

- **TrainingMath refactor**: The shared diff heavily refactors `TrainingMath.ts` (193 lines changed). All training-related tests must pass.
- **Test deletions**: The shared diff deletes ~3,700 lines of tests across 18 files. Verify that these tests were redundant or moved, not covering unique logic. Files deleted:
  - `travelAllowance.test.ts` (226 lines deleted, ~0 remaining)
  - `retireeOyakataConversion.test.ts` (318 lines deleted)
  - `npcAIWorkers.test.ts` (579 lines deleted)
  - `npcWeeklyDecisions.test.ts` (190 lines deleted)
  - `FogOfWarService.test.ts` (372 lines deleted)
  - `scoutingCalibration.test.ts` (222 lines deleted)
  - `FinanceCalculator.test.ts` (256 lines deleted)
  - `KenshoService.test.ts` (73 lines deleted)
  - `SponsorshipService.test.ts` (252 lines deleted)
  - `mochikyukinPoints.test.ts` (103 lines deleted)
  - `phase01_week_health.test.ts` (143 lines deleted)
  - `pipelineRunner.test.ts` (25 lines deleted)
  - `bashoPipeline.test.ts` (35 lines deleted)
  - `offSeasonPipeline.test.ts` (43 lines deleted)
  - `tickDaily.test.ts` (26 lines deleted)
  - `TrainingMath.extractModifiers.test.ts` (241 lines deleted)
  - `TrainingService.test.ts` (166 lines deleted)
  - `engine.worker.test.ts` (24 lines deleted)
  - `gameStore.test.ts` (133 lines deleted)

  **Action**: Before merging, spot-check 3-5 of these deleted test files to confirm they were testing redundant or moved logic, not unique coverage. Priority: `TrainingMath.extractModifiers.test.ts`, `npcAIWorkers.test.ts`, `FinanceCalculator.test.ts`.

---

## Part 5: Implementation Sequence

### Phase 0: Pre-Merge Test Writing (TEST-FIRST)

1. Write `EmptyState.test.tsx` (6 tests)
2. Write `BaseWidget.test.tsx` (5 tests)
3. Write `YushoRaceWidget.test.tsx` (4 tests)
4. Write `SparringPanel.test.tsx` (5 tests)
5. Write `phase01_daily_welfare.test.ts` (9 tests)
6. Extend `EntityService.test.ts` (8 new tests)
7. Extend `CandidateBuilder.test.ts` (5 new tests)
8. Run all new tests — expect failures (code not yet merged)

### Phase 1: Merge Branches

1. Merge branch #9 (mentor test fix — adds `user-event` dep)
2. Merge branch #4 (InfrastructureService tests)
3. Merge branch #3 (naturalization tests)
4. Merge branch #1 (EntityService type tightening)
5. Merge branch #2 (CandidateBuilder cast removal)
6. Merge branch #6 (BookmarksPage EmptyState)
7. Merge branch #7 (SparringPanel EmptyState)
8. Merge branch #8 (YushoRaceWidget refactor)
9. Merge branch #5 (StaffPage/MainMenu optimization)

After each merge:
- Resolve `.jules/*.md` conflicts by concatenating entries
- Run `bun run typecheck`
- Run `bun run test`

### Phase 2: Post-Merge Verification

1. Run full test suite
2. Run typecheck
3. Run lint
4. Run build
5. Manual smoke test

### Phase 3: Bug Fixes

1. Fix `any` type in `YushoRaceWidget.tsx:94`
2. Add `aria-label` to `EmptyState` action buttons
3. Add RNG outcome comments to naturalization tests
4. Spot-check deleted test files for unique coverage loss

---

## Part 6: Summary

**Prior plan findings**: 7 of 9 branch findings APPROVED, 1 APPROVED WITH CAVEAT (CandidateBuilder cast removal — safe but depends on `Rikishi` interface stability), 1 APPROVED WITH RISK (naturalization tests — deterministic but seed-coupled).

**Test-first strategy**: 42 new tests across 7 files to be written before merge. Tests will initially fail (code not merged) and pass after merge.

**Merge risk**: LOW. All branches share identical base diff. Unique deltas touch distinct files. Only conflicts are in task-tracking markdown files.

**Estimated effort**:
- Test writing: 2-3 hours
- Merge + conflict resolution: 1 hour
- Verification + bug fixes: 1-2 hours
- Total: 4-6 hours
