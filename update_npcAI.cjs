const fs = require('fs');

let content = fs.readFileSync('src/engine/npcAI.ts', 'utf8');

// Add imports
const newImports = `import { enforceHardCapRosterOverflow, HARD_CAP_ROSTER_SIZE } from "./overflow";
import { buyMyoseki } from "./myosekiMarket";
import * as talentpool from "./talentpool";
import { checkRetirement } from "./lifecycle";
import { logEngineEvent, EventBus } from "./events";`;

content = content.replace(
  `import { enforceHardCapRosterOverflow } from "./overflow";
import { buyMyoseki } from "./myosekiMarket";
import * as talentpool from "./talentpool";
import {
  getCachedPerception,`,
  `import { enforceHardCapRosterOverflow, HARD_CAP_ROSTER_SIZE } from "./overflow";
import { buyMyoseki } from "./myosekiMarket";
import * as talentpool from "./talentpool";
import { checkRetirement } from "./lifecycle";
import {
  getCachedPerception,`
);

content = content.replace(
  `import { logEngineEvent } from "./events";`,
  `import { logEngineEvent, EventBus } from "./events";`
);

// Replace tickMonthly and tickYearly
const replacementLogic = `/**
 * tickMonthly(world)
 * NPC Manager AI monthly decision loop:
 * - Evaluate finances and bid on available Myoseki (Elder stock)
 * - Roster management: retire aging/injured rikishi, recruit to fill vacancies
 */
export function tickMonthly(world: WorldState): void {
  // 1. Myoseki Bidding
  if (world.myosekiMarket) {
    for (const heya of world.heyas.values()) {
      if (heya.id === world.playerHeyaId) continue;

      const oyakata = world.oyakata.get(heya.oyakataId);
      if (!oyakata) continue;

      if (heya.funds > 300_000_000 && oyakata.traits.ambition > 50) {
        const stocks = Object.values(world.myosekiMarket.stocks);
        for (const stock of stocks) {
          if (stock.status === "available" && stock.askingPrice && stock.askingPrice < (heya.funds - 100_000_000)) {
            buyMyoseki(world, oyakata.id, heya.id, stock.id);
            break; // Only buy one per month per heya
          }
        }
      }
    }
  }

  // 2. Roster Management (Retirement & Scouting)
  const vacanciesByHeyaId: Record<Id, number> = {};

  for (const heya of stableSort(Array.from(world.heyas.values()), x => (x as any).id || String(x))) {
    if (heya.id === world.playerHeyaId) continue;

    // Evaluate retirements
    const currentRikishiIds = [...(heya.rikishiIds || [])];
    for (const rId of currentRikishiIds) {
      const r = world.rikishi.get(rId);
      if (!r) continue;

      const retireReason = checkRetirement(r, world.year, world.seed);
      if (retireReason) {
        // Emit retirement event
        EventBus.retirement(world, r.id, heya.id, r.shikona || r.name || r.id, retireReason);

        // Remove from heya
        heya.rikishiIds = heya.rikishiIds.filter(id => id !== r.id);

        // Remove from global active map
        world.rikishi.delete(r.id);
      }
    }

    // Evaluate vacancies
    const freezeWeeks = heya.welfareState?.sanctions?.recruitmentFreezeWeeks ?? 0;
    if (freezeWeeks === 0) {
      const targetSize = 8;
      const currentSize = heya.rikishiIds.length;
      if (currentSize < targetSize) {
        vacanciesByHeyaId[heya.id] = targetSize - currentSize;
      }
    }
  }

  // Execute recruiting if under global capacity
  if (Object.keys(vacanciesByHeyaId).length > 0) {
    const globalCap = world.heyas.size * HARD_CAP_ROSTER_SIZE;
    if (world.rikishi.size < globalCap) {
      talentpool.fillVacanciesForNPC(world, vacanciesByHeyaId);
    }
  }
}

/**
 * tickYear(world)
 * NPC Manager AI yearly decision loop.
 */
export function tickYear(world: WorldState): void {
  // Yearly logic has been moved or is currently empty, reserving for future mechanics
}`;

content = content.replace(
  /\/\*\*\n \* tickMonthly\(world\)(.|\n)*?export function tickYear\(world: WorldState\): void \{\n(.*?|\n)*?\}/g,
  replacementLogic
);

fs.writeFileSync('src/engine/npcAI.ts', content, 'utf8');
