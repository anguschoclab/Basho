/**
 * bout/narrative/resolution.ts — extracted beats from generateBoutNarrative.
 * Code moved verbatim; dependencies arrive via the shared PbpPipeline.
 */
import type { PbpPipeline } from "@/engine/bout/narrative/pipeline";
import type { PbpTag } from "@/engine/bout/narrative/pbpTypes";
import { BardEngine } from "@/engine/bard/BardEngine";
import { getKimarite } from "@/engine/bout/kimarite/kimariteRegistry";
import { rngFromSeed } from "@/engine/core/rng";

function beatFinishTechnique(p: PbpPipeline): void {
  const { east, push, result, seed, west } = p;
  if (result.isDraw && result.drawType) {
    const finishRng = rngFromSeed(seed, "pbp", "finish");
    const drawPath = `combat.phases.finish.draw.${result.drawType}`;
    const res = BardEngine.resolve(
      finishRng,
      BardEngine.has(drawPath) ? drawPath : "combat.phases.finish.draw.hikiwake",
      {
        EAST: east.shikona,
        WEST: west.shikona,
        east: east.shikona,
        west: west.shikona,
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }
    );
    push(res.text, "finish", ["draw"]);
    return;
  }
  // 8. Finishing technique
  if (result.kimarite) {
    const finishRng = rngFromSeed(seed, "pbp", "finish");
    // With a foul review the finish line describes the APPARENT finish — the
    // gunbai call the crowd saw (suspect over victim). The mono-ii arc in
    // post-bout owns the foul reveal; announcing it here would spoil the arc.
    const review = result.foulReview;
    const apparentWinnerId = review
      ? review.suspectRikishiId
      : result.winner === "east"
        ? east.id
        : west.id;
    const apparentLoserId = review
      ? review.victimRikishiId
      : result.winner === "east"
        ? west.id
        : east.id;
    const apparentKimariteSlug = review?.apparentKimarite ?? result.kimarite;
    const winnerName = apparentWinnerId === east.id ? east.shikona : west.shikona;
    const loserName = apparentLoserId === east.id ? east.shikona : west.shikona;
    const techPath = `combat.kimarite.${apparentKimariteSlug}`;
    const path = BardEngine.has(techPath) ? techPath : "combat.phases.finish";
    const res = BardEngine.resolve(finishRng, path, {
      winner: winnerName,
      loser: loserName,
      kimarite: getKimarite(apparentKimariteSlug)?.name ?? apparentKimariteSlug,
      east: east.shikona,
      west: west.shikona,
      winnerId: apparentWinnerId,
      loserId: apparentLoserId,
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
  if (p.result.isDraw) return;
  beatSpecialAwards(p);
  beatCeremony(p);
  beatClosingLine(p);
}
