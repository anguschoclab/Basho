/**
 * In-process reproduction of the year-of-bashos E2E stall:
 * runs the same seed through the interactive-path engine calls
 * (advanceDaysFast → endBasho → publishBanzukeUpdate → resolveImpacts)
 * and reports where it throws.
 *
 * Run: bun scripts/repro-year.ts
 */
import { generateInitialWorld } from "../src/engine/systems/generation/WorldFactory";
import { advanceDaysFast } from "../src/engine/tick/tickDaily";
import { endBasho, publishBanzukeUpdate } from "../src/engine/world";
import { resolveImpacts } from "../src/engine/core/ImpactResolver";
import { BardEngine } from "../src/engine/bard/BardEngine";
import { SerializationService } from "../src/engine/persistence/SerializationService";

const SEED = "e2e-year-of-bashos-v1";

async function main() {
  await BardEngine.loadDomains();
  let world = generateInitialWorld(SEED);
  // emulate wizard: pick a player heya so endBasho paths see playerHeyaId
  const firstHeya = world.heyas.keys().next().value;
  world = { ...world, playerHeyaId: firstHeya };
  console.log(`gen: seed=${world.seed} day=${world.dayIndexGlobal} phase=${world.cyclePhase} player=${firstHeya}`);

  for (let b = 0; b < 8; b++) {
    // advance until the basho starts (bounded)
    let guard = 0;
    while (world.cyclePhase !== "active_basho" && guard++ < 60) {
      world = advanceDaysFast(world, 7, { autonomous: true });
    }
    if (world.cyclePhase !== "active_basho") {
      console.log(`basho ${b + 1}: never reached active_basho (phase=${world.cyclePhase} day=${world.dayIndexGlobal})`);
      break;
    }

    // run the basho to completion (day > 15 halts the fast path)
    guard = 0;
    while (world.cyclePhase === "active_basho" && (world.currentBasho?.day ?? 0) <= 15 && guard++ < 10) {
      world = advanceDaysFast(world, 7, { autonomous: true });
    }
    const bs = world.currentBasho;
    console.log(
      `basho ${b + 1}: ${bs?.bashoName} ${bs?.year} reached day=${bs?.day} ` +
        `standings=${bs?.standings ? bs.standings.size : "?"} matches=${bs?.matches?.length}`
    );

    // the exact interactive end-of-basho path used by bashoSlice
    try {
      let w = endBasho(world);
      const impact = publishBanzukeUpdate(w);
      w = resolveImpacts(w, [impact]);
      world = w;
      const last = world.history[world.history.length - 1];
      const y = last ? world.rikishi.get(last.yusho)?.shikona ?? last?.yusho : "?";
      const jsonMB = (JSON.stringify(SerializationService.serializeWorld(world)).length / 1048576).toFixed(1);
      console.log(
        `basho ${b + 1} ended: yusho=${y} phase=${world.cyclePhase} ` +
          `events=${world.events?.log?.length} json=${jsonMB}MB ` +
          `banzukeKeys=${Object.keys(world.historyIndex?.banzukeByBasho ?? {}).length}`
      );
    } catch (e) {
      console.log(`basho ${b + 1} THREW at endBasho/publish:`);
      console.log(e);
      break;
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
