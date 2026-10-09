/**
 * bout/narrative/ceremony.ts — extracted beats from generateBoutNarrative.
 * Code moved verbatim; dependencies arrive via the shared PbpPipeline.
 */
import type { PbpPipeline } from "./pipeline";
import { RITUAL_SALT_CHANCE_UNDERSTATED } from "../../../constants/engine/generation";
import { BardEngine } from "../../bard/BardEngine";
import { rngFromSeed } from "../../rng";

export function beatRingEntrances(p: PbpPipeline): void {
  const { ctx, east, intensity, push, result, rng, seed, west } = p;
  // 4. Ring entrances (east + west, two separate lines for entity linking)
  if (result.log.length > 0) {
    const entranceRng = rngFromSeed(seed, "pbp", "entrance");
    push(
      BardEngine.resolve(entranceRng, "combat.phases.ritual.entrance", {
        east: east.shikona,
        west: west.shikona,
        eastRikishiId: east.id,
        westRikishiId: west.id,
        intensity,
      }).text,
      "entrance"
    );

    // 5. Ritual salt (skipped for understated voice unless RNG passes)
    if (ctx.voiceStyle !== "understated" || rng.next() < RITUAL_SALT_CHANCE_UNDERSTATED) {
      const saltRng = rngFromSeed(seed, "pbp", "salt");
      push(
        BardEngine.resolve(saltRng, "combat.phases.ritual.salt", {
          east: east.shikona,
          west: west.shikona,
          eastRikishiId: east.id,
          westRikishiId: west.id,
          intensity,
        }).text,
        "ritual"
      );
    }

    // 6. Shikiri
    const shikiriRng = rngFromSeed(seed, "pbp", "shikiri");
    push(BardEngine.resolve(shikiriRng, "combat.phases.ritual.shikiri", {}).text, "ritual");
  }

}

export function narrateCeremony(p: PbpPipeline): void {
  beatRingEntrances(p);
}
