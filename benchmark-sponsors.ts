import { performance } from "perf_hooks";

// Mock types
type SponsorTier = "T0" | "T1" | "T2" | "T3" | "T4" | "T5";

interface SponsorRelationship {
  id: string;
  targetId: string;
  targetType: string;
  endsAtTick?: number;
  strength: number;
  role: string;
}

interface Sponsor {
  sponsorId: string;
  tier: SponsorTier;
  relationships: SponsorRelationship[];
  displayName: string;
  category: string;
}

// Generate test data
const NUM_SPONSORS = 5000;
const RELS_PER_SPONSOR = 50;
const PLAYER_HEYA_ID = "player_heya_1";

const pool = {
  sponsors: new Map<string, Sponsor>(),
};

for (let i = 0; i < NUM_SPONSORS; i++) {
  const relationships: SponsorRelationship[] = [];
  for (let j = 0; j < RELS_PER_SPONSOR; j++) {
    // 10% chance to be for player heya
    const isPlayer = Math.random() < 0.1;
    relationships.push({
      id: `rel_${i}_${j}`,
      targetId: isPlayer ? PLAYER_HEYA_ID : `other_heya_${j}`,
      targetType: "beya",
      endsAtTick: Math.random() < 0.5 ? 100 : undefined,
      strength: Math.floor(Math.random() * 100),
      role: "koenkai_member",
    });
  }
  pool.sponsors.set(`sponsor_${i}`, {
    sponsorId: `sponsor_${i}`,
    tier: "T3",
    relationships,
    displayName: `Sponsor ${i}`,
    category: "construction",
  });
}

const playerHeyaId = PLAYER_HEYA_ID;

function originalImplementation() {
  const active: any[] = [];
  const lost: any[] = [];
  const tiers: Record<SponsorTier, number> = { T0: 0, T1: 0, T2: 0, T3: 0, T4: 0, T5: 0 };

  for (const sponsor of pool.sponsors.values()) {
    const heyaRels = sponsor.relationships.filter(
      (r: SponsorRelationship) => r.targetId === playerHeyaId && r.targetType === "beya"
    );

    if (heyaRels.length === 0) continue;

    const activeRels = heyaRels.filter((r: SponsorRelationship) => !r.endsAtTick);
    const endedRels = heyaRels.filter((r: SponsorRelationship) => !!r.endsAtTick);

    if (activeRels.length > 0) {
      const best = activeRels.sort((a, b) => b.strength - a.strength)[0];
      active.push({ sponsor, role: best.role, strength: best.strength });
      tiers[sponsor.tier] = (tiers[sponsor.tier] || 0) + 1;
    }

    if (endedRels.length > 0 && activeRels.length === 0) {
      lost.push(sponsor);
    }
  }

  return { active: active.length, lost: lost.length };
}

function optimizedImplementation() {
  const active: any[] = [];
  const lost: any[] = [];
  const tiers: Record<SponsorTier, number> = { T0: 0, T1: 0, T2: 0, T3: 0, T4: 0, T5: 0 };

  for (const sponsor of pool.sponsors.values()) {
    let activeBest: SponsorRelationship | null = null;
    let hasEnded = false;

    for (const r of sponsor.relationships) {
      if (r.targetId === playerHeyaId && r.targetType === "beya") {
        if (!r.endsAtTick) {
          if (!activeBest || r.strength > activeBest.strength) {
            activeBest = r;
          }
        } else {
          hasEnded = true;
        }
      }
    }

    if (activeBest) {
      active.push({ sponsor, role: activeBest.role, strength: activeBest.strength });
      tiers[sponsor.tier] = (tiers[sponsor.tier] || 0) + 1;
    } else if (hasEnded) {
      lost.push(sponsor);
    }
  }
  return { active: active.length, lost: lost.length };
}

function runBenchmark() {
  const WARMUP = 10;
  const ITERATIONS = 100;

  // Warmup
  for (let i = 0; i < WARMUP; i++) {
    originalImplementation();
    optimizedImplementation();
  }

  // Verify correctness
  const res1 = originalImplementation();
  const res2 = optimizedImplementation();
  if (res1.active !== res2.active || res1.lost !== res2.lost) {
    console.error("Results don't match!", res1, res2);
    process.exit(1);
  }

  const origTimes: number[] = [];
  const optTimes: number[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const start1 = performance.now();
    originalImplementation();
    origTimes.push(performance.now() - start1);
  }

  for (let i = 0; i < ITERATIONS; i++) {
    const start2 = performance.now();
    optimizedImplementation();
    optTimes.push(performance.now() - start2);
  }

  const origAvg = origTimes.reduce((a, b) => a + b, 0) / ITERATIONS;
  const optAvg = optTimes.reduce((a, b) => a + b, 0) / ITERATIONS;

  console.log(`Original: ${origAvg.toFixed(4)} ms/run`);
  console.log(`Optimized: ${optAvg.toFixed(4)} ms/run`);
  console.log(`Improvement: ${((origAvg - optAvg) / origAvg * 100).toFixed(2)}%`);
}

runBenchmark();
