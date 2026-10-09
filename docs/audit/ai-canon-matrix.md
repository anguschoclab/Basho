# AI Canon Compliance Matrix

Maps NPC Manager AI System v1.3 (Constitution SOURCE 02, §§1–20) to implementation. Status: **✓** implemented · **◐** partial · **✗** absent.

| Canon | Requirement | Implementation | Status |
|---|---|---|---|
| §2.1 | No cheating / information fairness | Banded `LeaguePerception`, `perceptionCache`, `perceivedTalentSeed` bids | ✓ |
| §2.2 | Determinism | Seeded `createNPCWeeklyRng`/`rngFromSeed` streams; determinism tests | ✓ |
| §2.3 | Same rules as player | NPCs use same services/`StateImpact`; rotation exempts nothing safety-critical | ✓ |
| §3.1 | Manager entity | `oyakata` map + archetype/traits/quirks/`managerFlags` | ✓ |
| §3.3 | Tenure record (start date, performance ledger) | `DynastyService` tracks succession events; no per-manager tenure record | ◐ |
| §3.4 | Perception snapshot (non-cheating interface) | `buildPerceptionSnapshot`, `buildLeaguePerception` | ✓ |
| §4 | Canonical archetype profiles | 8 archetypes on `Oyakata`; trait-derived `targetSize` in `evaluateVacancies`; canon numeric roster ranges unmapped; `RecruitmentController` uses flat `TARGET_ROSTER_SIZE` headroom | ◐ |
| §5 | Quirks | `quirks` + `managerFlags` via `ensurePersonaForOyakata` | ✓ |
| §6 | Meta drift world tracking | `EraDriftService` — yearly tone + per-kimarite drift from `globalKimariteStats`; consumed by bout physics | ✓ |
| §7 | Manager interpretation of meta (non-omniscient) | Nothing in npcAI/agents reads `world.meta` | ✗ |
| §8 | Reaction lag & confirmation gate | Absent | ✗ |
| §9 | Adaptation levers (non-training) | Levers exist (scouting priority, bid policies, recruitment strategy) but none meta-driven | ◐ |
| §10 | Adaptation tables (oshi/yotsu/injury meta) | Absent | ✗ |
| §11 | Counter-meta behavior | Absent | ✗ |
| §12.1 | Rivalry perception (no numbers) | `rivalriesState` + banded heat in perception | ✓ |
| §12.2 | Rivalry effects on decisions | Recruitment spite premium (`temperament`), bout tactics heat | ◐ |
| §12.3 | Rivalry × meta drift | Absent | ✗ |
| §13.1 | Foreign limit constraint | `FOREIGN_RIKISHI_LIMIT_PER_HEYA = 1` enforced in `TalentPoolOffers`; `isAtForeignLimit` aligned (WS0) | ✓ |
| §13.2 | Policy drivers (dual-citizen pref, facilities, runway) | Absent | ✗ |
| §13.3 | Sunk-cost bias | Absent | ✗ |
| §14 | Weekly decision loop | `phase01_week_npc_ai` — perception→plan→workers/agents→execution→memory | ✓ |
| §15 | Failure modes (overreaction, stagnation, overextension) | Partial via archetype behavior; no intentional meta-overreaction (needs §8) | ◐ |
| §16.1 | Succession triggers (underperformance, insolvency, scandal, governance) | `DynastyService`: age/designated heir only | ◐ |
| §16.2 | Candidate sources (internal, external, caretaker) | Designated successor path only | ◐ |
| §16.4 | Legacy modifiers (rigidity, loyalty, cultural momentum, decay) | Absent | ✗ |
| §17 | Governance/scandal/media pressure integration | Governance + crisis agents execute via `StateImpact` | ◐ |
| §18 | Player-facing readability (numbers hidden) | `NPCAgentFeed`, `AdvisorService` recommendations | ◐ |
| §19 | Logging & auditability | Structured events; deterministic replay tests | ✓ |
| §20 | Canon one-liners | N/A — behavioral outcomes | — |

## WS mapping

- **WS1** → §7, §8, §10, §11 (meta perception → lag → adaptation → counter-meta)
- **WS2** → §4, §9, §15 (archetype-driven lever activation, intentional failure modes)
- **WS3** → §14 basho-scoped daily decisions (kyujo, posture, nakabi)
- **WS4** → §3.1 rikishi-level extension (agency below oyakata)
- **WS5** → §3.3, §12.3, §16 (tenure record, full succession, faction coordination)
- **WS6** → §13.2–13.3 (foreign policy, sunk-cost, economic depth)
- **WS7** → §18 (player-facing surfacing)
- **WS8** → §19 + §2.2 (auditability, determinism gate)
