/**
 * test-agents.ts
 * ============
 * Test script to invoke all 7 NPC agents with mock data
 * This demonstrates that the agents work and can be used
 */

import { spawnCrisisAgent } from "../src/engine/agents/CrisisAgent";
import { spawnFinanceAgent } from "../src/engine/agents/FinanceAgent";
import { spawnGovernanceAgent } from "../src/engine/agents/GovernanceAgent";
import { spawnMediaAgent } from "../src/engine/agents/MediaAgent";
import { spawnNarrativeAgent } from "../src/engine/agents/NarrativeAgent";
import { spawnRecruitmentAgent } from "../src/engine/agents/RecruitmentAgent";
import { spawnRivalryAgent } from "../src/engine/agents/RivalryAgent";
import { generateInitialWorld } from "../src/engine/systems/generation/WorldFactory";
import type { ActiveCrisis } from "../src/engine/types/crises";

console.log("=== Testing All 7 NPC Agents ===\n");

// Generate a mock world for context
const world = generateInitialWorld("test-agents-seed");
const heyaId = Array.from(world.heyas.keys())[0];
const heya = world.heyas.get(heyaId)!;
const oyakataId = heya.oyakataId!;
const oyakata = world.oyakata.get(oyakataId)!;

console.log(`Testing with heya: ${heya.name}, oyakata: ${oyakata.archetype}\n`);

// Test CrisisAgent
console.log("--- CrisisAgent ---");
const crisisCtx = {
  crisis: {
    id: "scandal_nightlife",
    title: "Nightlife Scandal",
    options: [
      { id: "suspend", label: "Suspend rikishi" },
      { id: "defend", label: "Defend rikishi" },
    ],
  } as ActiveCrisis,
  oyakata,
  heyaId,
  world,
  currentMood: "content",
};
const crisisResult = spawnCrisisAgent(crisisCtx);
console.log(`Selected: ${crisisResult.selectedChoiceId}`);
console.log(`Reasoning: ${crisisResult.reasoning.slice(0, 2).join(" | ")}`);
console.log(`Impact:`, crisisResult.expectedImpact);
console.log();

// Test FinanceAgent
console.log("--- FinanceAgent ---");
const financeCtx = {
  oyakata,
  world,
  runwayBand: "comfortable",
  funds: heya.funds || 10_000_000,
  monthlyBurn: 500_000,
};
const financeResult = spawnFinanceAgent(financeCtx);
console.log(`Risk Level: ${financeResult.riskLevel}`);
console.log(`Buy Myoseki: ${financeResult.shouldBuyMyoseki}`);
console.log(`Invest Facilities: ${financeResult.shouldInvestInFacilities}`);
console.log(`Build Reserves: ${financeResult.shouldBuildReserves}`);
console.log(`Reasoning: ${financeResult.reasoning.slice(0, 2).join(" | ")}`);
console.log();

// Test GovernanceAgent
console.log("--- GovernanceAgent ---");
const governanceCtx = {
  heya,
  oyakata,
  world,
  scandalScore: 25,
  politicalCapital: 50,
  governanceStatus: "good_standing",
};
const governanceResult = spawnGovernanceAgent(governanceCtx);
console.log(`Reduce Scandal: ${governanceResult.shouldReduceScandal}`);
console.log(`Use Political Favor: ${governanceResult.shouldUsePoliticalFavor}`);
console.log(`Sabotage Rival: ${governanceResult.shouldSabotageRival}`);
console.log(`Reasoning: ${governanceResult.reasoning.slice(0, 2).join(" | ")}`);
console.log();

// Test MediaAgent
console.log("--- MediaAgent ---");
const mediaCtx = {
  eventId: "media-001",
  eventType: "scandal",
  severity: "moderate" as const,
  oyakata,
  heyaId,
  world,
};
const mediaResult = spawnMediaAgent(mediaCtx);
console.log(`Response: ${mediaResult.response}`);
console.log(`Confidence: ${(mediaResult.confidence * 100).toFixed(0)}%`);
console.log(`Reasoning: ${mediaResult.reasoning.slice(0, 2).join(" | ")}`);
console.log();

// Test NarrativeAgent
console.log("--- NarrativeAgent ---");
const narrativeCtx = {
  oyakata,
  topRikishi: Array.from(world.rikishi.values()).slice(0, 5),
  recentAchievements: ["yusho"],
  currentBashoPhase: "post_basho",
};
const narrativeResult = spawnNarrativeAgent(narrativeCtx);
console.log(`Trigger Event: ${narrativeResult.shouldTriggerEvent}`);
console.log(`Event Type: ${narrativeResult.eventType}`);
console.log(`Narrative Tone: ${narrativeResult.narrativeTone}`);
console.log(`Reasoning: ${narrativeResult.reasoning.slice(0, 2).join(" | ")}`);
console.log();

// Test RecruitmentAgent
console.log("--- RecruitmentAgent ---");
const talentPool = world.talentPool?.candidates;
const candidateId = talentPool ? Object.keys(talentPool)[0] : "mock-candidate-001";
const recruitmentCtx = {
  oyakata,
  world,
  vacancyCount: 2,
  runwayBand: "comfortable",
  funds: heya.funds || 10_000_000,
  rosterSize: 15,
  candidateId,
};
const recruitmentResult = spawnRecruitmentAgent(recruitmentCtx);
console.log(`Should Bid: ${recruitmentResult.shouldBid}`);
console.log(`Max Bid: ¥${recruitmentResult.maxBid.toLocaleString()}`);
console.log(`Bid Strategy: ${recruitmentResult.bidStrategy}`);
console.log(`Confidence: ${recruitmentResult.confidence}%`);
console.log(`Reasoning: ${recruitmentResult.reasoning.slice(0, 2).join(" | ")}`);
console.log();

// Test RivalryAgent
console.log("--- RivalryAgent ---");
const rivalryCtx = {
  oyakata,
  activeRivalries: {} as Record<
    string,
    import("../src/engine/systems/narrative/RivalryConstants").RivalryPairState
  >,
  currentMood: "content",
};
const rivalryResult = spawnRivalryAgent(rivalryCtx);
console.log(`Escalate Rivalry: ${rivalryResult.escalateRivalry}`);
console.log(`De-escalate Rivalry: ${rivalryResult.deescalateRivalry}`);
console.log(`Target for Matchmaking: ${rivalryResult.targetRivalForMatchmaking.length} rivalries`);
console.log(`Reasoning: ${rivalryResult.reasoning.slice(0, 2).join(" | ")}`);
console.log();

console.log("=== All Agents Tested Successfully ===");
