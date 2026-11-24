---
name: scout-recruit
description: Work on scouting, recruitment, and the talent pipeline — fog of war, CA/PA (current/potential ability), scout missions, candidate pool, foreign-rikishi limits, NPC bidding, youth academies, intake. Use whenever touching ScoutingService/FogOfWarService, perceived* fields vs hidden talentSeed/potentialStats, TalentPool*/CandidatePool services, SCOUT_*/OFFER_CONTRACT/POACH_CANDIDATE commands, academy commands, or PROMOTE_INTAKE — carries the fog-symmetry invariant enforced by the npcFog audit.
---

# Scouting & Recruitment Domain

## Fog of war — the invariant that gates everything

Candidates carry hidden truth (`talentSeed`, `potentialStats`, `potential.*` — the PA block) and a **perceived channel** (`perceivedTalentSeed`, `perceivedCA`, `perceivedPA`) keyed to the observing heya. Agent decisions AND player UI must read only the perceived channel — `tests/unit/audit/npcFog.audit.test.ts` statically audits `engine/npc`, `presenters`, `components` for `.talentSeed`/`potential` access. Allowed exceptions: current `stats.*` (observable reality) and world-physics internals (training ceilings, weight targets) outside the audited dirs. See the `ai-agent` skill's parity section.

CA/PA is an FM-style 0–200 layer: `src/engine/recruitment/perceivedAbility.ts` (CA/PA perception math) + `perceivedTalent.ts`; value-level helpers live alongside. Fog-symmetric scouting projections feed the UI (progression chart, potential panel, retired verdict surfaces).

## Services

- `src/engine/recruitment/` — `ScoutingService` (reveal info), `FogOfWarService` (what's hidden vs visible), `scoutMissions.ts`, `scoutingStore.ts`, `YouthAcademyService.ts`.
- `src/engine/generation/` — `CandidateGenerator`/`CandidateBuilder`/`CandidateStats` (create recruits), `CandidatePoolService` (pool state), `TalentPoolService`/`TalentPoolMaintenance`/`TalentPoolMaterialization` (pool lifecycle), `TalentPoolScouting`/`talentPoolScoutingOps`, `TalentPoolOffers`, `TalentPoolNPCRecruitment` (`fillVacanciesForNPCWithBidding` — NPC heya bidding), `talentPoolReads` (`candidateConsumesForeignSlot`, `getForeignCountInHeya`), `MaezumoService`, `PreSumoBackground`, `FamilyBondService`, `RosterFactory`.

## Worker commands (`commands/recruitment.ts`, academy in `commands/governance.ts`)

`SCOUT_POOL`, `SCOUT_CANDIDATE`, `SEND_SCOUT`, `SET_SCOUTING_INVESTMENT`, `OFFER_CONTRACT`, `POACH_CANDIDATE`, `PROMOTE_INTAKE`; academies: `BUILD_YOUTH_ACADEMY`, `BUILD_FOREIGN_ACADEMY`, `INVEST_ACADEMY`, `UPGRADE_YOUTH_ACADEMY`, `HIRE_ACADEMY_STAFF`, `MANAGE_ACADEMY`.

## Hard rules & tuning

- `FOREIGN_RIKISHI_LIMIT_PER_HEYA = 1` (`src/constants/engine/recruitment.ts`) — enforced at offer time AND by NPC `ForeignSlotPolicy`; foreign recruits have a raised PA floor (makuuchi-prospect calibre); merger absorption stamps `grandfatheredForeignCount`.
- Constants: `recruitment.ts`, `recruitmentBalance.ts`, `recruitmentExtended.ts`, `scoutingPerception.ts`.
- Tests: `bun run test -- tests/unit/engine/recruitment tests/unit/engine/generation` — foreign pipeline, scouting calibration, recruitment bid isolation; the 25-yr diagnostic tracks the NPC intake funnel (visibility, gates, bid class, wins) — see `sim-diagnostics`.
