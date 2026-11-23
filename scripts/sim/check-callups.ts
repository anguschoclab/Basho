import { scheduleAllDivisionsDay } from "@/engine/calendar/schedule";
import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import { initializeBasho } from "@/engine/generation/WorldFactory";

const world = generateInitialWorld("sim-25yr-diagnostic-v1");
const basho = initializeBasho(world, "hatsu");
for (const day of [2, 4]) {
  const { scheduled } = scheduleAllDivisionsDay({ world, basho, day, seed: "s" });
  const lower = scheduled.filter((m) => {
    const a = world.rikishi.get(m.eastRikishiId);
    const b = world.rikishi.get(m.westRikishiId);
    const L = new Set(["makushita", "sandanme", "jonidan", "jonokuchi"]);
    return L.has(a?.division ?? "") || L.has(b?.division ?? "");
  });
  console.log(`day ${day}: ${scheduled.length} total, ${lower.length} involving lower-div`);
  for (const m of lower.slice(0, 10)) {
    const a = world.rikishi.get(m.eastRikishiId);
    const b = world.rikishi.get(m.westRikishiId);
    console.log(`  ${a?.division}/${a?.shikona} vs ${b?.division}/${b?.shikona} callup=${m.crossDivisionCallupId ?? "-"}`);
  }
}
