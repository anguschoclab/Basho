import { describe, it, expect } from "vitest";
import { simulateBout } from "../bout";
import type { Rikishi } from "../types/rikishi";
import type { TacticalArchetype, Style } from "../types/combat";
import type { Division, Rank, Side } from "../types/banzuke";

// ─── Helpers ───

const ARCHETYPES: TacticalArchetype[] = [
  "oshi_specialist", "yotsu_specialist", "speedster",
  "trickster", "all_rounder", "hybrid_oshi_yotsu", "counter_specialist",
];

const STYLE_FOR: Record<TacticalArchetype, Style> = {
  oshi_specialist: "oshi",
  yotsu_specialist: "yotsu",
  speedster: "hybrid",
  trickster: "hybrid",
  all_rounder: "hybrid",
  hybrid_oshi_yotsu: "hybrid",
  counter_specialist: "yotsu",
};

const STAT_PROFILES: Record<TacticalArchetype, Pick<Rikishi, "power"|"speed"|"balance"|"technique"|"aggression"|"experience"|"weight">> = {
  oshi_specialist:    { power: 70, speed: 55, balance: 44, technique: 40, aggression: 65, experience: 50, weight: 148 },
  yotsu_specialist:   { power: 55, speed: 38, balance: 62, technique: 65, aggression: 45, experience: 55, weight: 155 },
  speedster:          { power: 40, speed: 72, balance: 50, technique: 52, aggression: 55, experience: 45, weight: 115 },
  trickster:          { power: 38, speed: 60, balance: 48, technique: 58, aggression: 50, experience: 50, weight: 120 },
  all_rounder:        { power: 52, speed: 52, balance: 55, technique: 55, aggression: 50, experience: 55, weight: 140 },
  hybrid_oshi_yotsu:  { power: 58, speed: 48, balance: 55, technique: 55, aggression: 52, experience: 50, weight: 145 },
  counter_specialist: { power: 45, speed: 50, balance: 58, technique: 60, aggression: 40, experience: 55, weight: 135 },
};

/** Build 3 rikishi per archetype = 21 total "field" */
function buildField(): Rikishi[] {
  const field: Rikishi[] = [];
  let idx = 0;
  for (const arch of ARCHETYPES) {
    for (let copy = 0; copy < 3; copy++) {
      const stats = STAT_PROFILES[arch];
      // Add slight variance per copy so they're not clones
      const variance = (copy - 1) * 3;
      field.push({
        id: `${arch}-${copy}`,
        shikona: `${arch.replace(/_/g, " ")} #${copy + 1}`,
        heyaId: `heya-${idx}`,
        nationality: "JP",
        birthYear: 1998,
        height: 180,
        weight: stats.weight + variance * 2,
        power: stats.power + variance,
        speed: stats.speed + variance,
        balance: stats.balance + variance,
        technique: stats.technique + variance,
        aggression: stats.aggression + variance,
        experience: stats.experience + variance,
        adaptability: 50,
        momentum: 50,
        stamina: 70,
        fatigue: 0,
        injured: false,
        injuryWeeksRemaining: 0,
        style: STYLE_FOR[arch],
        archetype: arch,
        division: "makuuchi" as Division,
        rank: "maegashira" as Rank,
        rankNumber: idx + 1,
        side: "east" as Side,
        isRetired: false,
        mental: 50,
      } as unknown as any);
      idx++;
    }
  }
  return field;
}

/** Round-robin 15-day basho: each rikishi fights 15 random opponents */
function simulateBasho(field: Rikishi[], bashoIdx: number): Map<string, { wins: number; losses: number }> {
  const standings = new Map<string, { wins: number; losses: number }>();
  for (const r of field) standings.set(r.id, { wins: 0, losses: 0 });

  // Each rikishi fights 15 bouts against random-ish opponents
  for (let day = 1; day <= 15; day++) {
    const shuffled = [...field].sort((a, b) => {
      // deterministic shuffle using basho + day
      const ha = hashCode(`${a.id}-${bashoIdx}-${day}`);
      const hb = hashCode(`${b.id}-${bashoIdx}-${day}`);
      return ha - hb;
    });
    const paired = new Set<string>();
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      const east = shuffled[i];
      const west = shuffled[i + 1];
      if (paired.has(east.id) || paired.has(west.id)) continue;
      paired.add(east.id);
      paired.add(west.id);

      const seed = `meta-b${bashoIdx}-d${day}-${east.id}-${west.id}`;
      const result = simulateBout(east, west, seed);
      const winnerId = result.winner === "east" ? east.id : west.id;
      const loserId = result.winner === "east" ? west.id : east.id;
      standings.get(winnerId)!.wins++;
      standings.get(loserId)!.losses++;
    }
  }
  return standings;
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

// ─── Test ───

describe("10-Basho Meta Shift Simulation", () => {
  const NUM_BASHOS = 10;
  const field = buildField();
  const yushoLog: { basho: number; winnerId: string; archetype: TacticalArchetype; wins: number }[] = [];
  const archetypeYushos: Record<string, number> = {};

  for (const arch of ARCHETYPES) archetypeYushos[arch] = 0;

  const fieldMap = new Map();
  for (const r of field) fieldMap.set(r.id, r);

  for (let b = 0; b < NUM_BASHOS; b++) {
    const standings = simulateBasho(field, b);
    // Find yusho winner
    let bestId = "";
    let bestWins = -1;
    for (const [id, rec] of standings) {
      if (rec.wins > bestWins) { bestWins = rec.wins; bestId = id; }
    }
    const winner = fieldMap.get(bestId)!;
    yushoLog.push({ basho: b + 1, winnerId: bestId, archetype: winner.archetype as TacticalArchetype, wins: bestWins });
    archetypeYushos[winner.archetype]++;
  }

  it("should produce 10 yusho results", () => {
    expect(yushoLog).toHaveLength(NUM_BASHOS);
  });

  it("meta should shift — no single archetype wins more than 5 of 10 bashos", () => {
    for (const arch of ARCHETYPES) {
      expect(archetypeYushos[arch], `${arch} won ${archetypeYushos[arch]}/10 yushos`).toBeLessThanOrEqual(5);
    }
  });

  it("at least 2 different archetypes should win a yusho", () => {
    const winners = new Set(yushoLog.map(y => y.archetype));
    expect(winners.size, `Only ${winners.size} archetype(s) won`).toBeGreaterThanOrEqual(2);
  });

  it("prints meta evolution report", () => {
    console.log("\n🏆 10-BASHO META EVOLUTION REPORT");
    console.log("=".repeat(60));
    for (const entry of yushoLog) {
      console.log(`  Basho ${String(entry.basho).padStart(2)}: ${entry.archetype.padEnd(22)} (${entry.wins}W) — ${entry.winnerId}`);
    }
    console.log("\n📊 YUSHO COUNT BY ARCHETYPE:");
    console.log("-".repeat(40));
    for (const arch of ARCHETYPES) {
      const count = archetypeYushos[arch];
      const bar = "█".repeat(count) + "░".repeat(10 - count);
      console.log(`  ${arch.padEnd(22)} ${bar} ${count}/10`);
    }
    const uniqueWinners = new Set(yushoLog.map(y => y.archetype)).size;
    console.log(`\n  Unique archetype winners: ${uniqueWinners}/7`);
    console.log("=".repeat(60));
    expect(true).toBe(true);
  });
});
