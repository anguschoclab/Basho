# Agent Architecture Plan for Sumo Manager Pro

## Executive Summary

This document outlines a comprehensive agent architecture for the Sumo Manager Pro codebase. Based on exhaustive codebase analysis, I've identified key decision points where specialized agents can enhance NPC AI behavior, simulation realism, and system maintainability.

## Current Architecture Analysis

### Existing Agent Infrastructure

**Location:** `src/engine/npcAIWorkers.ts`

**Current Workers:**

1. **Training Worker** - Decides training intensity, focus, and recovery
2. **Scouting Worker** - Determines scouting priority
3. **Personnel Worker** - Identifies rikishi to protect, develop, push, or withdraw
4. **Global Worker** - Evaluates exhibition invitations

**Orchestrator:** `src/engine/npcAI.ts` - `makeNPCWeeklyDecision()` coordinates all workers

**Strategy Service:** `src/engine/strategy/NPCStrategyService.ts` - Contains decision functions called by workers

### Strategy Files (Not Yet Agentified)

- `npcFinanceStrategy.ts` - Financial decisions (myoseki buying)
- `npcGovernanceStrategy.ts` - Governance/political decisions
- `npcMediaStrategy.ts` - Media event responses
- `npcRecruitmentStrategy.ts` - Recruitment decisions
- `npcRetirementStrategy.ts` - Retirement decisions
- `npcSponsorStrategy.ts` - Sponsor recruitment

### Key Decision Points in Tick Pipeline

**Weekly Phases:**

- `phase01_week_npc_ai.ts` - Main NPC AI decision loop
- `phase01_week_recruitment.ts` - NPC recruitment with bidding
- `phase01_week_governance.ts` - Governance status transitions
- `phase01_week_rivalries.ts` - Rivalry decay
- `phase01_week_welfare.ts` - Welfare compliance
- `phase01_week_health.ts` - Injury/recovery
- `phase01_week_world_circuit.ts` - Style drift

## Proposed Agent Architecture

### Pattern Definition

All agents follow this pattern:

```typescript
export interface [AgentName]Context {
  // Input context
}

export interface [AgentName]Result {
  // Output decision with reasoning
}

export function spawn[AgentName]Agent(ctx: [AgentName]Context): [AgentName]Result {
  // Decision logic with reasoning
}
```

### Approved Agents (High Priority)

#### 1. Crisis Agent

**Purpose:** Handle NPC responses to narrative crises
**Context:** Crisis event details, oyakata personality, current state
**Decision:** Choose crisis response option
**Impact:** Narrative outcomes, reputation changes, mood shifts
**Justification:** CrisisService has registry of crises with choices - NPCs need to make these decisions autonomously

#### 2. Finance Agent

**Purpose:** Financial investment decisions
**Context:** Heya finances, runway, oyakata risk appetite
**Decision:** Buy myoseki stocks, invest in facilities, build reserves
**Impact:** Financial state, political capital
**Justification:** npcFinanceStrategy exists but not agentified - would benefit from worker pattern

#### 3. Governance Agent

**Purpose:** Political maneuvering and scandal management
**Context:** Political capital, scandal score, oyakata personality
**Decision:** Reduce scandals, sabotage rivals, use political favors
**Impact:** Governance status, political capital, media pressure
**Justification:** npcGovernanceStrategy exists - agentification would integrate with weekly decision loop

#### 4. Recruitment Agent

**Purpose:** Recruitment strategy and bidding
**Context:** Vacancies, talent pool, oyakata philosophy
**Decision:** Max bid calculations, target candidate selection
**Impact:** Roster composition, financial state
**Justification:** TalentPoolNPCRecruitment has bidding logic - agent would centralize strategy

#### 5. Rivalry Agent

**Purpose:** Rivalry management and response
**Context:** Active rivalries, oyakata personality, stable reputation
**Decision:** Escalate or de-escalate rivalries, strategic targeting
**Impact:** Rivalry heat, media narrative, bout outcomes
**Justification:** RivalryService manages state but NPC strategic decisions are missing

#### 6. Narrative Agent

**Purpose:** Story generation and event orchestration
**Context:** World state, rikishi achievements, historical context
**Decision:** Trigger narrative events, generate storylines
**Impact:** Narrative richness, player engagement
**Justification:** CrisisService generates events but lacks NPC narrative agency

### Disapproved/Lower Priority Agents

#### Matchmaking Agent - DISAPPROVED

**Reason:** SwissAlgorithm.ts is a deterministic algorithm for the JSA (player-facing system). NPCs should not influence matchmaking as it would break competitive integrity.

#### Injury Agent - DISAPPROVED

**Reason:** InjuryService is a simulation system based on fatigue and durability. NPC decisions should not directly cause injuries - that's simulation, not strategy.

#### Welfare Agent - DISAPPROVED

**Reason:** WelfareService is a compliance system with state machine transitions. NPC behavior influences welfare (via training decisions) but shouldn't directly control compliance status.

#### Bout Agent - DISAPPROVED

**Reason:** boutResolver runs physics simulation. NPC tactic overrides already exist (decideBoutTacticOverride) - no need for full agent.

#### Retirement Agent - DISAPPROVED

**Reason:** Retirement is a lifecycle decision based on age, injury, and performance. It's not a strategic choice NPCs make weekly.

#### Sponsor Agent - DISAPPROVED

**Reason:** Sponsor recruitment is handled in npcSponsorStrategy. The existing strategy pattern is sufficient - no need for separate agent.

## Implementation Strategy

### Phase 1: Core Agents (Immediate)

1. **Crisis Agent** - Highest impact, clear decision points
2. **Finance Agent** - Direct integration with existing strategy
3. **Governance Agent** - Political depth

### Phase 2: Strategic Agents (Secondary)

4. **Recruitment Agent** - Centralize bidding logic
5. **Rivalry Agent** - Add strategic layer to rivalry system
6. **Narrative Agent** - Enhance story generation

### Integration Points

Agents will be integrated into:

1. **Crisis Agent** - `phase01_week_npc_ai.ts` or `CrisisService.ts` when crisis is triggered
2. **Finance Agent** - `npcFinanceStrategy.ts` or weekly financial phase
3. **Governance Agent** - `npcGovernanceStrategy.ts` or `phase01_week_governance.ts`
4. **Recruitment Agent** - `TalentPoolNPCRecruitment.ts` (replace bidding logic)
5. **Rivalry Agent** - `phase01_week_rivalries.ts` or `RivalryService.ts`
6. **Narrative Agent** - `CrisisService.ts` or narrative phase

**Note:** Agents follow the same worker pattern as existing TrainingWorker, ScoutingWorker, etc. They can be called in isolation with specific contexts.

## Benefits

1. **Consistency** - All decision-making follows same pattern
2. **Testability** - Agents can be unit tested in isolation
3. **Explainability** - Reasoning strings provide audit trail
4. **Extensibility** - New agents follow established pattern
5. **Maintainability** - Clear separation of concerns

## Risks

1. **Over-engineering** - Some systems work fine without agents
2. **Performance** - Too many agents could slow weekly tick
3. **Complexity** - More agents = more configuration
4. **Integration** - Need careful refactoring of existing code

## Implementation Status

### Completed

1. **Crisis Agent** - `src/engine/agents/CrisisAgent.ts` - Handles crisis responses based on personality traits
2. **Finance Agent** - `src/engine/agents/FinanceAgent.ts` - Financial investment decisions
3. **Governance Agent** - `src/engine/agents/GovernanceAgent.ts` - Political maneuvering and scandal management
4. **Recruitment Agent** - `src/engine/agents/RecruitmentAgent.ts` - Recruitment strategy and bidding
5. **Rivalry Agent** - `src/engine/agents/RivalryAgent.ts` - Rivalry escalation/de-escalation decisions
6. **Narrative Agent** - `src/engine/agents/NarrativeAgent.ts` - Story generation and event orchestration
7. **Agent Index** - `src/engine/agents/index.ts` - Barrel export for all agents

### Integration (Next Steps)

The agents are implemented and ready for integration into their respective systems. Each agent follows the established worker pattern with:

- Context interface defining inputs
- Result interface defining outputs with reasoning
- spawn[AgentName]Agent function implementing decision logic

Integration should be done surgically at the appropriate phase where each agent's decisions are needed, rather than adding all to the weekly decision loop.

## Recommendation

**APPROVED:** All 6 agents (Crisis, Finance, Governance, Recruitment, Rivalry, Narrative) have been implemented following the established worker pattern. They are ready for surgical integration into their respective systems.

**DISAPPROVED:** Matchmaking, Injury, Welfare, Bout, Retirement, and Sponsor agents - these are either simulation systems, compliance systems, or already adequately handled by existing patterns.
