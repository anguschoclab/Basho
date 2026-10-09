/**
 * bout/narrative/resolution.ts — extracted beats from generateBoutNarrative.
 * Code moved verbatim; dependencies arrive via the shared PbpPipeline.
 */
import type { PbpPipeline } from "./pipeline";
import type { PbpTag } from "./pbpTypes";
import { BardEngine } from "../../bard/BardEngine";
import { rngFromSeed } from "../../rng";

function beatFinishTechnique(p: PbpPipeline): void {
  const { east, push, result, seed, west } = p;
  // 8. Finishing technique
  if (result.kimarite) {
    const finishRng = rngFromSeed(seed, "pbp", "finish");
    const winnerName = result.winner === "east" ? east.shikona : west.shikona;
    const loserName = result.winner === "east" ? west.shikona : east.shikona;
    const techPath = `combat.kimarite.${result.kimarite}`;
    const path = BardEngine.has(techPath) ? techPath : "combat.phases.finish";
    const res = BardEngine.resolve(finishRng, path, {
      winner: winnerName,
      loser: loserName,
      kimarite: result.kimariteName ?? result.kimarite,
      east: east.shikona,
      west: west.shikona,
      winnerId: result.winner === "east" ? east.id : west.id,
      loserId: result.winner === "east" ? west.id : east.id,
      eastRikishiId: east.id,
      westRikishiId: west.id,
    });
    push(res.text, "finish");
  }

}

function beatSpecialAwards(p: PbpPipeline): void {
  const { east, push, result, seed, west } = p;
  // 9. Special Awards
  if (result.awardFact === "kinboshi" || result.awardFact === "ginboshi") {
    const awardRng = rngFromSeed(seed, "pbp", "award");
    const winnerName = result.winner === "east" ? east.shikona : west.shikona;
    push(
      BardEngine.resolve(awardRng, `combat.phases.finish.${result.awardFact}`, {
        winner: winnerName,
        winnerId: result.winner === "east" ? east.id : west.id,
      }).text,
      "award",
      [result.awardFact as PbpTag]
    );
  }

}

function beatCeremony(p: PbpPipeline): void {
  const { ctx, east, push, result, seed, west } = p;
  // 10. Ceremony — post-bout ritual (all voices, dramatic gets special templates)
  if (result.kimarite && result.kimarite !== "fusensho") {
    const ceremonyRng = rngFromSeed(seed, "pbp", "ceremony");
    const winnerName = result.winner === "east" ? east.shikona : west.shikona;
    const ceremonyPath =
      ctx.voiceStyle === "dramatic"
        ? "combat.phases.ceremony.dramatic"
        : "combat.phases.ceremony.common";
    push(
      BardEngine.resolve(ceremonyRng, ceremonyPath, {
        winner: winnerName,
        winnerId: result.winner === "east" ? east.id : west.id,
        east: east.shikona,
        west: west.shikona,
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "ceremony"
    );
  }

}

function beatClosingLine(p: PbpPipeline): void {
  const { ctx, east, intensity, push, result, seed, west } = p;
  // 11. Closing line (dramatic voice only)
  if (ctx.voiceStyle === "dramatic") {
    const closingRng = rngFromSeed(seed, "pbp", "closing");
    const winnerName = result.winner === "east" ? east.shikona : west.shikona;
    const loserName = result.winner === "east" ? west.shikona : east.shikona;
    push(
      BardEngine.resolve(closingRng, "combat.phases.finish.dramatic", {
        winner: winnerName,
        loser: loserName,
        east: east.shikona,
        west: west.shikona,
        winnerId: result.winner === "east" ? east.id : west.id,
        loserId: result.winner === "east" ? west.id : east.id,
        eastRikishiId: east.id,
        westRikishiId: west.id,
        intensity,
      }).text,
      "closing"
    );
  }

}

export function narrateResolution(p: PbpPipeline): void {
  beatFinishTechnique(p);
  beatSpecialAwards(p);
  beatCeremony(p);
  beatClosingLine(p);
}
