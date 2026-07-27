import { BardEngine } from "../bard/BardEngine";
import { rngFromSeed } from "../rng";
import type { MovementEvent } from "../types/banzuke";
import type { WorldState } from "../types/world";

export interface BanzukeMovementNarrativeLine {
  text: string;
  rikishiId: string;
  movementKind: string;
}

export function generateBanzukeMovementNarrative(
  movements: MovementEvent[],
  world: WorldState,
  seed: string
): BanzukeMovementNarrativeLine[] {
  const lines: BanzukeMovementNarrativeLine[] = [];

  for (const evt of movements) {
    if (evt.kind !== "promotion" && evt.kind !== "demotion") continue;

    const rikishi = world.rikishi.get(evt.rikishiId);
    if (!rikishi) continue;

    let templatePath: string;
    if (evt.kind === "demotion") {
      templatePath = "events.narrative.banzuke_movement_demotion";
    } else if (evt.isJumpPromotion) {
      templatePath = "events.narrative.banzuke_movement_jump_promotion";
    } else if (evt.isSekitoriPromotion) {
      templatePath = "events.narrative.banzuke_movement_sekitori_promotion";
    } else if (evt.isSanyakuPromotion) {
      templatePath = "events.narrative.banzuke_movement_sanyaku_promotion";
    } else {
      templatePath = "events.narrative.banzuke_movement_standard_promotion";
    }

    if (!BardEngine.has(templatePath)) continue;

    const rng = rngFromSeed(seed, "banzuke-movement", evt.rikishiId);
    const res = BardEngine.resolve(rng, templatePath, {
      SHIKONA: rikishi.shikona,
      FROM: evt.from,
      TO: evt.to,
      rikishiId: evt.rikishiId,
    });

    if (res.text && !res.text.includes("[MISSING:")) {
      lines.push({
        text: res.text,
        rikishiId: evt.rikishiId,
        movementKind: evt.kind,
      });
    }
  }

  return lines;
}
