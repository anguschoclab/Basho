/**
 * dramaGenerator.ts
 * ==================
 * Generates "Drama Events" (Scandals, Grudges, Crises) based on world state.
 * Triggered during the daily tick.
 */

import type { WorldState } from "../types/world";
import { EventBus } from "../events";
import { rngForWorld } from "../rng";
import { stableSort } from "../utils/sort";

export interface DramaEvent {
  id: string;
  type: "SCANDAL" | "GRUDGE_BATTLE" | "CRISIS";
  severity: "minor" | "major" | "critical";
  title: string;
  summary: string;
  rikishiId?: string;
  heyaId?: string;
}

/**
 * Main entry point for drama generation during a tick.
 *  * @param world - The World.
 */
export function processDramaTick(world: WorldState): void {
  const rng = rngForWorld(world, "narrative", "drama");

  // Daily chance for drama
  if (rng.next() > 0.95) {
    generateRandomDrama(world);
  }

  // Specific triggers (e.g., high debt, low compliance)
  checkTriggeredDrama(world);
}

function generateRandomDrama(world: WorldState): void {
  const rng = rngForWorld(world, "narrative", "drama_random");
  const eventType = rng.int(0, 2);

  if (eventType === 0) {
    // Scandal
    const rikishis = stableSort(world.rikishi.values(), x => x.id);
    const target = rikishis[rng.int(0, rikishis.length - 1)];
    if (target) {
        EventBus.governanceRuling(world, target.heyaId, { 
          rikishiId: target.id, 
          shikona: target.shikona, 
          incident: "curfew_violation" 
        }, "notable");
    }
  } else if (eventType === 1) {
    // Grudge formation
    const oyakatas = stableSort(world.oyakata.values(), x => x.id);
    if (oyakatas.length < 2) return;
    const a = oyakatas[rng.int(0, oyakatas.length - 1)];
    const b = oyakatas[rng.int(0, oyakatas.length - 1)];
    if (a.id !== b.id) {
        if (!a.grudges) a.grudges = [];
        if (!a.grudges.includes(b.heyaId)) {
            a.grudges.push(b.heyaId);
            EventBus.rivalryHeatSpike(world, { 
              winnerRikishiId: a.id, 
              loserRikishiId: b.id, 
              winner: a.name, 
              loser: b.name, 
              status: "formed",
              heat: 15
            });
        }
    }
  }
}

function checkTriggeredDrama(world: WorldState): void {
  // Check for financial crisis
  for (const heya of stableSort(world.heyas.values(), x => x.id)) {
    if (heya.funds < 0 && !heya.riskIndicators?.financial) {
        EventBus.financialAlert(world, heya.id, { 
          heyaname: heya.name, 
          incident: "insolvency",
          money: heya.funds
        });
        if (heya.isPlayerOwned) {
            // This would trigger a CrisisModal in the UI
            triggerCrisis(world, heya.id, "BANKRUPTCY_THREAT");
        }
    }
  }
}

function triggerCrisis(world: WorldState, heyaId: string, type: string): void {
    // In a worker-based engine, we emit a special event that the UI catches
    // or log a high-importance event.
    console.log(`[DramaGenerator] CRISIS TRIGGERED: ${type} for heya ${heyaId}`);
}
