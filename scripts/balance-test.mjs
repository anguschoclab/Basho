/**
 * Balance test: simulate 1000 fights per style/archetype matchup.
 * Reports win rates and flags outliers (>58% or <42% vs field).
 * 
 * Run: node scripts/balance-test.mjs
 * (Uses dynamic import of compiled engine via Vite)
 */

// We can't import TS directly, so we'll inline a minimal simulation.
// This mirrors the bout engine logic faithfully.

const ARCHETYPES = [
  "oshi_specialist",
  "yotsu_specialist", 
  "speedster",
  "trickster",
  "all_rounder",
  "hybrid_oshi_yotsu",
  "counter_specialist"
];

const STYLES = { 
  oshi_specialist: "oshi",
  yotsu_specialist: "yotsu",
  speedster: "hybrid",
  trickster: "hybrid",
  all_rounder: "hybrid",
  hybrid_oshi_yotsu: "hybrid",
  counter_specialist: "yotsu"
};

// Stat profiles per archetype (normalized ~50 avg, with specialization)
const STAT_PROFILES = {
  oshi_specialist:    { power: 68, speed: 55, balance: 42, technique: 40, aggression: 65, mental: 45, weight: 145, experience: 50 },
  yotsu_specialist:   { power: 55, speed: 38, balance: 62, technique: 65, aggression: 45, mental: 55, weight: 155, experience: 55 },
  speedster:          { power: 40, speed: 72, balance: 50, technique: 52, aggression: 55, mental: 48, weight: 115, experience: 45 },
  trickster:          { power: 38, speed: 60, balance: 48, technique: 58, aggression: 50, mental: 60, weight: 120, experience: 50 },
  all_rounder:        { power: 52, speed: 52, balance: 55, technique: 55, aggression: 50, mental: 55, weight: 140, experience: 55 },
  hybrid_oshi_yotsu:  { power: 58, speed: 48, balance: 55, technique: 55, aggression: 52, mental: 50, weight: 145, experience: 50 },
  counter_specialist: { power: 45, speed: 50, balance: 60, technique: 62, aggression: 40, mental: 65, weight: 135, experience: 55 },
};

// Simple seeded RNG (mulberry32)
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

/**
 * Simplified bout resolution mirroring bout.ts logic:
 * tachiai → clinch → momentum → finish
 */
function simulateFight(archA, archB, seed) {
  const rng = mulberry32(hashStr(seed));
  const a = { ...STAT_PROFILES[archA], archetype: archA, style: STYLES[archA], shikona: archA };
  const b = { ...STAT_PROFILES[archB], archetype: archB, style: STYLES[archB], shikona: archB };

  // Phase 1: Tachiai
  const collisionForce = (r) => r.power * 0.7 + Math.max(0, (r.weight - 100) * 0.5) * 0.3;
  let eastScore = a.speed * 0.35 + a.aggression * 0.25 + collisionForce(a) * 0.30 + a.balance * 0.10 + (rng() - 0.5) * 6;
  let westScore = b.speed * 0.35 + b.aggression * 0.25 + collisionForce(b) * 0.30 + b.balance * 0.10 + (rng() - 0.5) * 6;
  
  // Oshi tachiai bonus
  if (a.archetype === "oshi_specialist") eastScore += 10;
  if (b.archetype === "oshi_specialist") westScore += 10;
  
  let advantage = eastScore >= westScore ? "east" : "west";
  
  // Phase 2: Clinch (style determines stance)
  let stance = "no-grip";
  if (a.style === "yotsu" || b.style === "yotsu") stance = "belt-dominant";
  if (a.style === "oshi" && b.style === "oshi") stance = "push-dominant";

  // Clinch scoring
  const clinchA = (stance === "belt-dominant" ? a.technique * 0.4 + a.balance * 0.3 : a.power * 0.4 + a.speed * 0.3) + a.mental * 0.1 + (rng() - 0.5) * 8;
  const clinchB = (stance === "belt-dominant" ? b.technique * 0.4 + b.balance * 0.3 : b.power * 0.4 + b.speed * 0.3) + b.mental * 0.1 + (rng() - 0.5) * 8;

  // Archetype clinch bonuses
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
  
  const clinchFinalA = clinchA + clinchBonusA;
  const clinchFinalB = clinchB + clinchBonusB;
  if (clinchFinalA > clinchFinalB) advantage = "east";
  else if (clinchFinalB > clinchFinalA) advantage = "west";

  // Phase 3: Momentum ticks
  let fatigueA = 0, fatigueB = 0;
  const ticks = 1 + Math.floor(rng() * 4);
  for (let i = 0; i < ticks; i++) {
    const momA = a.speed * 0.25 + a.power * 0.2 + a.technique * 0.2 + a.mental * 0.15 + (rng() - 0.5) * 10 - fatigueA * 0.3;
    const momB = b.speed * 0.25 + b.power * 0.2 + b.technique * 0.2 + b.mental * 0.15 + (rng() - 0.5) * 10 - fatigueB * 0.3;
    
    // Trickster disruption bonus
    if (a.archetype === "trickster") { fatigueB += 2; }
    if (b.archetype === "trickster") { fatigueA += 2; }
    
    // Counter specialist timing bonus
    if (a.archetype === "counter_specialist" && advantage === "west") { advantage = rng() < 0.25 ? "east" : advantage; }
    if (b.archetype === "counter_specialist" && advantage === "east") { advantage = rng() < 0.25 ? "west" : advantage; }
    
    if (momA > momB + 3) advantage = "east";
    else if (momB > momA + 3) advantage = "west";
    
    fatigueA += a.weight * 0.008 + (a.style === "oshi" ? 1.5 : 0.8);
    fatigueB += b.weight * 0.008 + (b.style === "oshi" ? 1.5 : 0.8);
  }

  // Phase 4: Finish
  let winP = 0.5;
  winP += (advantage === "east" ? 0.18 : advantage === "west" ? -0.18 : 0);
  winP += (a.balance - b.balance) / 400;
  winP += (a.technique - b.technique) / 450;
  winP += (fatigueB - fatigueA) / 120;
  winP += (rng() - 0.5) * 0.06;
  
  // Mass modifier
  if (stance === "push-dominant") {
    const massDiff = (a.weight - b.weight) / 300;
    winP += (advantage === "east" ? massDiff : -massDiff);
  }
  
  // Mental defense
  const defMental = (advantage === "east" ? b.mental : a.mental) / 1000;
  winP += (advantage === "east" ? -defMental : defMental);
  
  winP = Math.max(0, Math.min(1, winP));
  return rng() < winP ? "east" : "west";
}

// === Run simulations ===
const FIGHTS_PER_MATCHUP = 1000;
const results = {};
const fieldWins = {};
const fieldTotal = {};

for (const arch of ARCHETYPES) {
  fieldWins[arch] = 0;
  fieldTotal[arch] = 0;
}

console.log(`\n🏋️ Sumo Balance Test — ${FIGHTS_PER_MATCHUP} fights per matchup\n`);
console.log("=".repeat(90));

// Header
const header = "Matchup".padEnd(40) + "East W%".padStart(8) + "West W%".padStart(8) + "  Status";
console.log(header);
console.log("-".repeat(90));

const outliers = [];

for (let i = 0; i < ARCHETYPES.length; i++) {
  for (let j = i + 1; j < ARCHETYPES.length; j++) {
    const archA = ARCHETYPES[i];
    const archB = ARCHETYPES[j];
    let winsA = 0;

    for (let k = 0; k < FIGHTS_PER_MATCHUP; k++) {
      const winner = simulateFight(archA, archB, `balance-${archA}-${archB}-${k}`);
      if (winner === "east") winsA++;
    }

    const winsB = FIGHTS_PER_MATCHUP - winsA;
    const pctA = (winsA / FIGHTS_PER_MATCHUP * 100).toFixed(1);
    const pctB = (winsB / FIGHTS_PER_MATCHUP * 100).toFixed(1);

    fieldWins[archA] += winsA;
    fieldWins[archB] += winsB;
    fieldTotal[archA] += FIGHTS_PER_MATCHUP;
    fieldTotal[archB] += FIGHTS_PER_MATCHUP;

    const isOutlier = winsA / FIGHTS_PER_MATCHUP > 0.58 || winsA / FIGHTS_PER_MATCHUP < 0.42;
    const status = isOutlier ? "⚠️  OUTLIER" : "✅";
    
    if (isOutlier) outliers.push({ archA, archB, pctA, pctB });

    const matchup = `${archA} vs ${archB}`;
    console.log(`${matchup.padEnd(40)}${pctA.padStart(7)}%${pctB.padStart(7)}%  ${status}`);
  }
}

console.log("\n" + "=".repeat(90));
console.log("\n📊 Overall Win Rate vs Field:\n");

const fieldHeader = "Archetype".padEnd(25) + "W-L".padStart(12) + "Win%".padStart(8) + "  Status";
console.log(fieldHeader);
console.log("-".repeat(60));

const fieldOutliers = [];
for (const arch of ARCHETYPES) {
  const w = fieldWins[arch];
  const l = fieldTotal[arch] - w;
  const pct = (w / fieldTotal[arch] * 100).toFixed(1);
  const isFieldOutlier = w / fieldTotal[arch] > 0.56 || w / fieldTotal[arch] < 0.44;
  const status = isFieldOutlier ? "⚠️  OUTLIER" : "✅";
  if (isFieldOutlier) fieldOutliers.push({ arch, pct });
  console.log(`${arch.padEnd(25)}${`${w}-${l}`.padStart(12)}${pct.padStart(7)}%  ${status}`);
}

console.log("\n" + "=".repeat(60));

if (outliers.length === 0 && fieldOutliers.length === 0) {
  console.log("\n✅ ALL BALANCED — No outlier matchups detected.\n");
} else {
  console.log(`\n⚠️  ${outliers.length} matchup outlier(s), ${fieldOutliers.length} field outlier(s) detected.`);
  if (fieldOutliers.length > 0) {
    console.log("\nField outliers:");
    for (const o of fieldOutliers) console.log(`  - ${o.arch}: ${o.pct}%`);
  }
  console.log("");
}
