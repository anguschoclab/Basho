---
name: train-rikishi
description: Work on rikishi training, stats, and development systems — training profiles, weekly drills, mentors, sparring, tsukebito, injury/recovery, condition/fatigue. Use whenever touching stat growth, TrainingProfile/HeyaTrainingState, the SET_TRAINING_STATE command, phase01_week_training/phase03_progression, or injury mechanics — maps services, types, commands, and the Map-shape + decay gotchas.
---

# Rikishi Training & Development Domain

## Stats — the 10 trainables

`NumericStat` (`src/engine/types/rikishi.ts`): `power, technique, speed, weight, stamina, mental, adaptability, balance, aggression, experience`. Guard: `isNumericStat(key)`. `specialPrizes`/`achievements` on `RikishiStats` are career records, **not** trainable. `Rikishi` also carries `momentum`, `fatigue`, `injured`, `combatProfile` (see `bout-combat` skill).

## State shape

`world.trainingState: Map<heyaId, HeyaTrainingState>` — a **Map**, never a plain object (mocks must use `new Map([[heyaId, {...}]])`). `HeyaTrainingState` (`src/engine/types/training.ts`):

- `activeProfile: TrainingProfile` — `{ intensity: conservative|balanced|intensive|punishing, focus: power|speed|technique|balance|neutral, styleBias: oshi|yotsu|neutral, recovery: low|normal|high }`
- `focusSlots: IndividualFocus[]` — per-rikishi `FocusMode: develop|push|protect|rebuild`
- Weekly drill plans — `DaySchedule` maps days 1–6 (Mon–Sat) to `DrillType: asageiko|butsukari|teppo|moushi-ai|shindo|shiko|none`. A drill plan overrides/augments passive `activeProfile` growth.

## Services (`src/engine/systems/training/`)

`TrainingService` (`applyWeeklyTraining(world)` → StateImpact, `ensureHeyaTrainingState`, `createDefaultTrainingState`) · `weeklyTraining.processRikishiWeekly` · `MentorshipService` (`applyMentorshipBonuses`, `checkMentorMenteeBout`) · `SparringService` · `TsukebitoService` (junior attendant duty) · `TrainingMath` (gain formulas) · `TrainingNarrative` · `src/engine/training/WeightJourney.ts` (weight drift).

Health side (`src/engine/systems/health/`): `InjuryService`, `RecoveryService`, `HealthActions`, `BodyDefinitions`.

## Tick order

`phase01_week_training` + `phase01_week_health` run every 7 days → `phase02_context` computes `ActiveModifiers` (facility/oyakata multipliers on gains) → `phase03_progression` applies stat gains + injury/recovery. Higher intensity = more growth *and* more injury risk; `recovery` emphasis and the `recovery`/`nutrition` facility axes push back.

## Worker commands (`commands/heya.ts`)

`SET_TRAINING_STATE` (replaces the whole `HeyaTrainingState` for a heya — UI sends the full object), `ASSIGN_MENTOR`, `REMOVE_MENTOR`, `ADD_SPARRING_PAIR`, `REMOVE_SPARRING_PAIR`, `SET_TSUKEBITO`, `REMOVE_TSUKEBITO`, `TREAT_INJURY { rikishiId, weeks }`, `WITHDRAW_RIKISHI`, `SET_HEYA_DIET`. Note `SET_TRAINING_STATE` calls `rt.syncWorld()` not `syncAndDigest()`.

## Tuning knobs & verification

Constants: `src/constants/engine/development.ts`, `condition.ts`, `health.ts`, `healthAssessment.ts`. Diagnostics: `bun scripts/verify-training-decay.ts` (decay check), `bun scripts/measure-growth.ts` (stat progression over 6 bashos). UI surface: `InjuryRiskHeatmap` (condition/fatigue/risk grid).
