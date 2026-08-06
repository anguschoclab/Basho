import { WorldState } from "./src/engine/types/world";
import { Rikishi } from "./src/engine/types/rikishi";
import { phase01_week_training } from "./src/engine/tick/phases/phase01_week_training";
import { resolveImpacts } from "./src/engine/core/ImpactResolver";

async function verifyTrainingDecay() {
  console.log("--- Verifying Training Decay ---");

  const mockRikishi: Rikishi = {
    id: "old-vet",
    name: "Old Veteran",
    shikona: "Veteran-maru",
    heyaId: "stable-1",
    birthYear: 1980, // Age ~46 in 2026
    power: 90,
    speed: 80,
    technique: 85,
    stamina: 70,
    adaptability: 50,
    experience: 95,
    talentSeed: 90,
    stats: {
      strength: 90,
      speed: 80,
      technique: 85,
      balance: 50,
      stamina: 70,
      adaptability: 50,
      mental: 95,
      weight: 150,
    },
    isRetired: false,
  } as unknown as Record<string, unknown>;

  let world: WorldState = {
    year: 2026,
    week: 1,
    rikishi: new Map([["old-vet", mockRikishi]]),
    heyas: new Map([
      [
        "stable-1",
        { id: "stable-1", name: "Test Stable", funds: 1000000, rikishiIds: ["old-vet"] } as unknown,
      ],
    ]),
    trainingState: new Map(),
    calendar: { year: 2026, month: 1, week: 1 },
    seed: "test-seed",
    transientContext: {
      boundaries: { monthBoundary: false, yearBoundary: false },
    },
    oyakata: new Map(),
  } as unknown as Record<string, unknown>;

  console.log(`Initial Power: ${mockRikishi.power}`);

  // Run 52 weeks (1 year) of training
  for (let i = 0; i < 52; i++) {
    const impact = phase01_week_training(world);
    world = resolveImpacts(world, [impact]);
    world.week++;
  }

  const finalRikishi = world.rikishi.get("old-vet");
  if (!finalRikishi) { console.error("Rikishi not found"); return; }
  console.log(`Final Power: ${finalRikishi.power}`);

  if (finalRikishi.power < 90) {
    console.log("SUCCESS: Stat decay detected for veteran.");
  } else {
    console.log(
      "FAILURE: No stat decay detected. Training logic might still be too generous or decay is missing."
    );
  }
}

verifyTrainingDecay().catch(console.error);
