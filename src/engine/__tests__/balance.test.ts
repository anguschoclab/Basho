import { describe, it, expect } from 'vitest';

const ARCHETYPES = [
  "oshi_specialist",
  "yotsu_specialist", 
  "speedster",
  "trickster",
  "all_rounder",
  "hybrid_oshi_yotsu",
  "counter_specialist"
] as const;

type Arch = typeof ARCHETYPES[number];

const STYLES: Record<Arch, string> = { 
  oshi_specialist: "oshi",
  yotsu_specialist: "yotsu",
  speedster: "hybrid",
  trickster: "hybrid",
  all_rounder: "hybrid",
  hybrid_oshi_yotsu: "hybrid",
  counter_specialist: "yotsu"
};

const STAT_PROFILES: Record<Arch, any> = {
  oshi_specialist:    { power: 68, speed: 55, balance: 42, technique: 40, aggression: 65, mental: 45, weight: 145, experience: 50 },
  yotsu_specialist:   { power: 55, speed: 38, balance: 62, technique: 65, aggression: 45, mental: 55, weight: 155, experience: 55 },
  speedster:          { power: 40, speed: 72, balance: 50, technique: 52, aggression: 55, mental: 48, weight: 115, experience: 45 },
  trickster:          { power: 38, speed: 60, balance: 48, technique: 58, aggression: 50, mental: 60, weight: 120, experience: 50 },
  all_rounder:        { power: 52, speed: 52, balance: 55, technique: 55, aggression: 50, mental: 55, weight: 140, experience: 55 },
  hybrid_oshi_yotsu:  { power: 58, speed: 48, balance: 55, technique: 55, aggression: 52, mental: 50, weight: 145, experience: 50 },
  counter_specialist: { power: 45, speed: 50, balance: 60, technique: 62, aggression: 40, mental: 65, weight: 135, experience: 55 },
};

function mulberry32(a: number) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

function simulateFight(archA: Arch, archB: Arch, seed: string): "east" | "west" {
  const rng = mulberry32(hashStr(seed));
  const a = { ...STAT_PROFILES[archA], archetype: archA, style: STYLES[archA] };
  const b = { ...STAT_PROFILES[archB], archetype: archB, style: STYLES[archB] };

  const collisionForce = (r: any) => r.power * 0.7 + Math.max(0, (r.weight - 100) * 0.5) * 0.3;
  let eastScore = a.speed * 0.35 + a.aggression * 0.25 + collisionForce(a) * 0.30 + a.balance * 0.10 + (rng() - 0.5) * 6;
  let westScore = b.speed * 0.35 + b.aggression * 0.25 + collisionForce(b) * 0.30 + b.balance * 0.10 + (rng() - 0.5) * 6;
  if (a.archetype === "oshi_specialist") eastScore += 10;
  if (b.archetype === "oshi_specialist") westScore += 10;
  let advantage: "east" | "west" = eastScore >= westScore ? "east" : "west";

  let stance = "no-grip";
  if (a.style === "yotsu" || b.style === "yotsu") stance = "belt-dominant";
  if (a.style === "oshi" && b.style === "oshi") stance = "push-dominant";

  const clinchA = (stance === "belt-dominant" ? a.technique * 0.4 + a.balance * 0.3 : a.power * 0.4 + a.speed * 0.3) + a.mental * 0.1 + (rng() - 0.5) * 8;
  const clinchB = (stance === "belt-dominant" ? b.technique * 0.4 + b.balance * 0.3 : b.power * 0.4 + b.speed * 0.3) + b.mental * 0.1 + (rng() - 0.5) * 8;
  let clinchBonusA = 0, clinchBonusB = 0;
  if (stance === "belt-dominant") {
    if (a.archetype === "yotsu_specialist") clinchBonusA += 12;
    if (b.archetype === "yotsu_specialist") clinchBonusB += 12;
    if (a.archetype === "counter_specialist") clinchBonusA += 6;
    if (b.archetype === "counter_specialist") clinchBonusB += 6;
  } else {
    if (a.archetype === "oshi_specialist") clinchBonusA += 8;
    if (b.archetype === "oshi_specialist") clinchBonusB += 8;
    if (a.archetype === "speedster") clinchBonusA += 5;
    if (b.archetype === "speedster") clinchBonusB += 5;
  }
  if (clinchA + clinchBonusA > clinchB + clinchBonusB) advantage = "east";
  else if (clinchB + clinchBonusB > clinchA + clinchBonusA) advantage = "west";

  let fatigueA = 0, fatigueB = 0;
  const ticks = 1 + Math.floor(rng() * 4);
  for (let i = 0; i < ticks; i++) {
    const momA = a.speed * 0.25 + a.power * 0.2 + a.technique * 0.2 + a.mental * 0.15 + (rng() - 0.5) * 10 - fatigueA * 0.3;
    const momB = b.speed * 0.25 + b.power * 0.2 + b.technique * 0.2 + b.mental * 0.15 + (rng() - 0.5) * 10 - fatigueB * 0.3;
    if (a.archetype === "trickster") fatigueB += 2;
    if (b.archetype === "trickster") fatigueA += 2;
    if (a.archetype === "counter_specialist" && advantage === "west" && rng() < 0.25) advantage = "east";
    if (b.archetype === "counter_specialist" && advantage === "east" && rng() < 0.25) advantage = "west";
    if (momA > momB + 3) advantage = "east";
    else if (momB > momA + 3) advantage = "west";
    fatigueA += a.weight * 0.008 + (a.style === "oshi" ? 1.5 : 0.8);
    fatigueB += b.weight * 0.008 + (b.style === "oshi" ? 1.5 : 0.8);
  }

  let winP = 0.5;
  winP += (advantage === "east" ? 0.18 : -0.18);
  winP += (a.balance - b.balance) / 400;
  winP += (a.technique - b.technique) / 450;
  winP += (fatigueB - fatigueA) / 120;
  winP += (rng() - 0.5) * 0.06;
  if (stance === "push-dominant") {
    const massDiff = (a.weight - b.weight) / 300;
    winP += (advantage === "east" ? massDiff : -massDiff);
  }
  const defMental = (advantage === "east" ? b.mental : a.mental) / 1000;
  winP += (advantage === "east" ? -defMental : defMental);
  winP = Math.max(0, Math.min(1, winP));
  return rng() < winP ? "east" : "west";
}

const FIGHTS = 1000;

describe("Bout Balance — 1000 fights per matchup", () => {
  const fieldWins: Record<string, number> = {};
  const fieldTotal: Record<string, number> = {};
  const matchupResults: { a: string; b: string; winsA: number; pctA: number }[] = [];

  for (const arch of ARCHETYPES) { fieldWins[arch] = 0; fieldTotal[arch] = 0; }

  for (let i = 0; i < ARCHETYPES.length; i++) {
    for (let j = i + 1; j < ARCHETYPES.length; j++) {
      const archA = ARCHETYPES[i];
      const archB = ARCHETYPES[j];
      let winsA = 0;
      for (let k = 0; k < FIGHTS; k++) {
        if (simulateFight(archA, archB, `bal-${archA}-${archB}-${k}`) === "east") winsA++;
      }
      fieldWins[archA] += winsA;
      fieldWins[archB] += FIGHTS - winsA;
      fieldTotal[archA] += FIGHTS;
      fieldTotal[archB] += FIGHTS;
      matchupResults.push({ a: archA, b: archB, winsA, pctA: winsA / FIGHTS * 100 });
    }
  }

  it("no matchup should have >60% win rate (hard outlier)", () => {
    for (const m of matchupResults) {
      const pctA = m.winsA / FIGHTS * 100;
      const pctB = 100 - pctA;
      expect(pctA, `${m.a} vs ${m.b}: ${pctA.toFixed(1)}%`).toBeLessThanOrEqual(60);
      expect(pctB, `${m.b} vs ${m.a}: ${pctB.toFixed(1)}%`).toBeLessThanOrEqual(60);
    }
  });

  it("no archetype should have >56% overall field win rate", () => {
    for (const arch of ARCHETYPES) {
      const pct = fieldWins[arch] / fieldTotal[arch] * 100;
      expect(pct, `${arch} field win rate: ${pct.toFixed(1)}%`).toBeLessThanOrEqual(56);
    }
  });

  it("no archetype should have <44% overall field win rate", () => {
    for (const arch of ARCHETYPES) {
      const pct = fieldWins[arch] / fieldTotal[arch] * 100;
      expect(pct, `${arch} field win rate: ${pct.toFixed(1)}%`).toBeGreaterThanOrEqual(44);
    }
  });

  it("prints full balance report", () => {
    console.log("\n📊 MATCHUP RESULTS:");
    console.log("-".repeat(70));
    for (const m of matchupResults) {
      const pctA = m.pctA.toFixed(1);
      const pctB = (100 - m.pctA).toFixed(1);
      const flag = m.pctA > 58 || m.pctA < 42 ? " ⚠️" : " ✅";
      console.log(`  ${m.a.padEnd(22)} ${pctA}% vs ${m.b.padEnd(22)} ${pctB}%${flag}`);
    }
    console.log("\n📊 FIELD WIN RATES:");
    console.log("-".repeat(50));
    for (const arch of ARCHETYPES) {
      const pct = (fieldWins[arch] / fieldTotal[arch] * 100).toFixed(1);
      const flag = fieldWins[arch] / fieldTotal[arch] > 0.56 || fieldWins[arch] / fieldTotal[arch] < 0.44 ? " ⚠️" : " ✅";
      console.log(`  ${arch.padEnd(22)} ${pct}%${flag}`);
    }
    expect(true).toBe(true);
  });
});
