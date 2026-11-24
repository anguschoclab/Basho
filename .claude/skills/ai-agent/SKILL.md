---
name: ai-agent
description: Run AI/agent system tests for rival heya intelligence, perception, strategic planning, agent workers, and player↔NPC parity.
disable-model-invocation: true
---

# ai-agent

Tests the NPC AI agent system including perception, strategic planning, agent workers, memory, the player-facing advisor, and the player↔NPC parity invariant.

## Usage

```
/ai-agent [filter]
```

## Test Groups

| Filter keyword | What it targets                                                        |
| -------------- | ---------------------------------------------------------------------- |
| (none)         | All AI agent tests (`tests/unit/engine/ai` + `tests/unit/engine/npc`)  |
| parity         | Player↔NPC shared-systems invariant (see AI-Parity below)              |
| advisor        | advisorService, player-advisor-integration                             |
| perception     | contextBuilder, leaguePerception, opponentModel                        |
| memory         | ai-memory-determinism                                                  |
| agents         | npc-ai-integration, npcAI_agentic, npcAIWorkers, npc-wiring, aiSurfacing.contract |
| strategy       | npcRetirementStrategy, npcSponsorStrategyHelpers, npcFinanceParity     |
| personas       | oyakataPersonalities, oyakataStylePreferences                          |
| weekly         | npcWeeklyDecisions, npc-ai-integration                                 |

## Commands

**Run all AI agent tests:**

```bash
bun run test -- tests/unit/engine/ai tests/unit/engine/npc
```

**Run with a filter (e.g. /ai-agent advisor):**

```bash
bun run test -- <path-or-substring>
```

**Run parity checks (player↔NPC shared systems):**

```bash
bun run test -- npcFinanceParity player-advisor-integration npc-legacy-path npc-wiring npcFog aiSurfacing
```

**Run agent wiring + integration tests:**

```bash
bun run test -- npc-ai-integration npcAI_agentic npcAIWorkers npc-wiring aiSurfacing
```

**Run advisor tests:**

```bash
bun run test -- advisorService player-advisor-integration
```

## AI-Parity

The player and NPC heyas must run through the same systems — NPCs are rivals operating under the same rules, not a separate cheat layer. This is enforced by dedicated tests:

- **Shared perception** — `AdvisorService` (`src/engine/npc/advisor/AdvisorService.ts`) builds player recommendations through the same `buildPerceptionSnapshot` / `buildLeaguePerception` / `buildMetaPerception` builders the NPC weekly loop uses. `player-advisor-integration.test.ts` proves recommendations derive from world state only.
- **Fog-of-war symmetry** — `tests/unit/audit/npcFog.audit.test.ts` statically audits `engine/npc`, `presenters`, and `components`: hidden talent truth (`talentSeed`, `potentialStats`, `potential.*`) may never reach an agent decision or a player surface. Both read through the identical `perceived*` channel.
- **Single canonical decision path** — `tests/unit/audit/npc-legacy-path.test.ts` bans the divergent `tickWeekNPC`; `phase01_week_npc_ai` is the only weekly NPC loop (perception → plan → agents → execution → memory).
- **Finance parity** — `tests/unit/engine/npc/npcFinanceParity.test.ts` proves `NPCFinanceCalculator` evaluates the same finance rules the player's `FinanceCalculator` reports.

**Contributor rule:** when adding a player-facing system, NPCs must be able to reach it through the weekly loop (an agent or worker in `src/engine/npc/`); when adding an NPC capability, verify the player surface reads equivalent data through the same perception/fog channel. Then run the parity group above.

## Notes

- Architecture: perception (`perception.ts`, `contextBuilder.ts`) → `StrategicPlanner` → agent workers (`agents/`: Finance, Governance, Recruitment, Rivalry, Narrative, Crisis, Media — spawned in `weekly/agents.ts`) → `execution.ts` → `MemoryStore`/`OpponentModel`.
- 5 oyakata archetypes (`personas/`): traditionalist, modernist, strategist, tyrant, diplomat.
- `aiSurfacing.contract.test.ts` requires every agent behavior to emit a canonical event that lands in the player-facing NPC feed — NPC activity must be visible, not silent.
- All AI rolls go through seeded RNG (`rngForWorld`/`RNGRegistry`) — never `Math.random()`; `ai-memory-determinism` guards replay safety.
- Use `bun run test` (vitest) — never `bun test` (Bun's native runner can't handle the jsdom setup).
- New tests must stay fast and respect the meta gates (`tests/unit/meta/`) — see the `write-engine-test` skill before adding any.
