/**
 * foul-eyeball.ts
 * ===============
 * Finds a real confirmed foul through the production `resolveBout` path
 * and prints the complete result record + full PBP so the broadcast arc
 * can be read end-to-end (apparent finish → suspicion → panel → replay →
 * verdict → flip).
 *
 * Run: bun scripts/sim/foul-eyeball.ts
 */

import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import { resolveBout } from "@/engine/bout/boutResolver";
import type { BoutResult } from "@/engine/types/basho";
import { mockRikishi, makeMockBasho } from "@tests/unit/engine/utils";

const { BardEngine } = await import("@/engine/bard/BardEngine");
await BardEngine.loadDomains();
const world = generateInitialWorld("foul-eyeball");

// Transcript scenario: a brawler apparent winner whose foul the panel confirms.
const east = mockRikishi("r-east", {
  shikona: "Oshoma",
  rank: "maegashira",
  aggression: 90,
  technique: 35,
  division: "makuuchi",
});
const west = mockRikishi("r-west", {
  shikona: "Kotoshoho",
  rank: "maegashira",
  technique: 55,
  division: "makuuchi",
});
const basho = makeMockBasho({ day: 8 });

let found: BoutResult | undefined;
let reviews = 0;
for (let i = 0; i < 8000; i++) {
  const bout = {
    id: `eyeball-${i}`,
    day: 8,
    rikishiEastId: east.id,
    rikishiWestId: west.id,
  };
  const res = resolveBout(bout, east, west, basho as never, undefined, world).result;
  if (res.foulReview) {
    reviews++;
    if (res.foulReview.confirmed) {
      found = res;
      break;
    }
  }
}
if (!found) {
  console.log(`no confirmed foul found (${reviews} reviews scanned)`);
  process.exit(1);
}

console.log(`scanned: ${reviews} reviews before first confirmed (bout ${found.boutId})`);
console.log("\n=== RESULT ===");
console.log(
  `winner: ${found.winner} (${found.winnerRikishiId}) | kimarite: ${found.kimarite} | upset: ${found.upset}`
);
console.log(
  `monoii: ${found.monoii} | outcome: ${found.monoiiOutcome} | panel: ${found.shimpanPanelIds?.length}`
);
console.log(`foulReview: ${JSON.stringify(found.foulReview)}`);
console.log("\n=== NARRATIVE ===");
for (const l of found.pbpLines ?? []) {
  const tags = l.tags?.length ? ` [${l.tags.join(",")}]` : "";
  console.log(`[${l.phase}]${tags} ${l.text}`);
}
