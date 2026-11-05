# Subsystem Service Map (C2)

> **Status:** Point-in-time map from the C2 audit. Caller-phase names verified against `src/engine/tick/phases/`; spot-check individual rows before relying on them — services have been added/moved since (e.g. NPC code consolidated under `src/engine/npc/`).

| Service                   | Called From                                         | Inputs                  | Outputs                        | Determinism            | Reads world.rng |
| ------------------------- | --------------------------------------------------- | ----------------------- | ------------------------------ | ---------------------- | --------------- |
| TravelAllowanceService    | phase05_monthly_boundary                            | heya, rikishiIds        | StateImpact (heyas funds)      | Pure                   | No              |
| MochikyukinService        | phase05_monthly_boundary                            | heya, rikishiIds        | StateImpact (heyas funds)      | Pure                   | No              |
| SponsorContractService    | phase05_monthly_boundary                            | sponsor, relationship   | StateImpact (sponsorPool)      | Pure                   | No              |
| InfrastructureService     | phase06_yearly_boundary, phase05_monthly_boundary   | heya, facilities        | StateImpact (heyas)            | Pure                   | No              |
| GlobalCupService          | phase06_yearly_boundary                             | world                   | StateImpact (globalCup)        | Pure                   | No              |
| HistoryService            | phase06_yearly_boundary                             | world, rikishi          | StateImpact (hallOfFame)       | Pure                   | No              |
| DynastyService            | phase06_yearly_boundary                             | world                   | StateImpact (oyakata, heyas)   | Pure                   | No              |
| TrainingPhilosophyService | phase06_yearly_boundary                             | heya.trainingPhilosophy | StateImpact (heyas)            | Pure                   | No              |
| EraDriftService           | phase06_yearly_boundary                             | world                   | StateImpact (eraState)         | Pure                   | No              |
| WorldCircuitService       | phase06_yearly_boundary, phase01_week_world_circuit | world, heyaId           | StateImpact (heyas)            | Pure                   | No              |
| TalentPoolService         | phase06_yearly_boundary                             | world                   | StateImpact (talentPool)       | Pure                   | Yes (seeded)    |
| CandidatePoolService      | phase01_monthly_market                              | world                   | StateImpact (candidatePool)    | Pure                   | Yes (seeded)    |
| GovernanceService         | phase01_week_governance                             | world                   | StateImpact (governance)       | Pure                   | No              |
| ScandalService            | phase01_week_governance                             | world                   | StateImpact (events)           | Pure                   | Yes (seeded)    |
| PoliticalFavorsService    | phase01_week_governance                             | world                   | StateImpact (governance)       | Pure                   | No              |
| HealthActions             | phase01_week_health                                 | rikishi, heya           | StateImpact (rikishi)          | Pure                   | No              |
| MediaEventService         | phase01_week_governance                             | world                   | StateImpact (events)           | Pure                   | No              |
| LoopDecisionEngine        | phase06_narrative                                   | world                   | StateImpact (transientContext) | Pure                   | No              |
| WelfareService            | phase01_daily_welfare                               | heya, rikishi           | StateImpact (rikishi)          | Pure                   | No              |
| SparringService           | phase01_week_npc_ai, phase01_week_training          | rikishi pairs           | StateImpact (sparringPairs)    | Pure                   | No              |
| RivalryService            | phase01_week_rivalries                              | world                   | StateImpact (rivalries)        | Pure                   | Yes (seeded)    |
| RNGRegistry               | All phases using rng                                | world, namespace, key   | RNG instance                   | Deterministic (seeded) | N/A             |
