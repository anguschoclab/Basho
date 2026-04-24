import { generateInitialWorld } from "./src/engine/systems/generation/WorldFactory";
import { updateBanzuke } from "./src/engine/banzuke";
import { buildFullSlotTemplate } from "./src/engine/banzuke/banzukeTemplate";
import { RANK_HIERARCHY } from "./src/engine/banzuke";

function debugBanzukeSystem() {
  const world = generateInitialWorld("debug-seed");
  const initialRikishi = Array.from(world.rikishi.values());
  
  console.log(`Initial World Rikishi Count: ${initialRikishi.length}`);

  // Test Template Generation
  const sanyakuCounts = {
    yokozuna: 1,
    ozeki: 2,
    sekiwake: 2,
    komusubi: 2,
    maegashira: 35, // 42 - 7
  };
  const quotas = {
    makuuchi: 42,
    juryo: 28,
    makushita: 60,
    sandanme: 50,
    jonidan: 40,
    jonokuchi: 20,
  };
  
  const template = buildFullSlotTemplate(sanyakuCounts, quotas);
  console.log(`Template Slots Generated: ${template.length}`);
  const makuuchiSlots = template.filter(t => t.division === "makuuchi");
  console.log(`Makuuchi Slots in Template: ${makuuchiSlots.length}`);

  // Test Banzuke Update Logic
  const currentBanzuke = initialRikishi.map(r => ({
    rikishiId: r.id,
    division: r.division,
    position: { rank: r.rank, rankNumber: r.rankNumber, side: r.side }
  }));

  const perfById = new Map();
  // Give everyone a fake 8-7 record to trigger promotions
  initialRikishi.forEach(r => {
    perfById.set(r.id, { wins: 8, losses: 7, absences: 0 });
  });

  const result = updateBanzuke(currentBanzuke, perfById, world);
  
  console.log(`Banzuke Update Result Count: ${result.newBanzuke.length}`);
  const finalMakuuchi = result.newBanzuke.filter(e => e.division === "makuuchi");
  console.log(`Final Makuuchi Count: ${finalMakuuchi.length}`);
  
  if (finalMakuuchi.length < 42) {
    console.error("FAIL: Makuuchi is not full!");
  } else {
    console.log("SUCCESS: Makuuchi is full.");
  }
}

debugBanzukeSystem();
