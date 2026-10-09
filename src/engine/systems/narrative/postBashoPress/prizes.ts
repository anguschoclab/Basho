import type { Rikishi } from "../../../types/rikishi";
import type { PbpLine } from "../../../bout/boutNarrative";
import { BardEngine } from "../../../bard/BardEngine";
import type { rngFromSeed } from "../../../rng";
import { emitLine } from "./emit";

/**
 * Special prize winner lines: veteran emotional, fought-the-match,
 * rival frustration, fighting-name vindication, cohort pride.
 */
export function generatePrizeWinnerLines(
  winner: Rikishi,
  rng: ReturnType<typeof rngFromSeed>,
  bashoName: string,
  year: number
): PbpLine[] {
  const lines: PbpLine[] = [];
  const baseId = `press-prize-${winner.id}-${bashoName}-${year}`;
  const tokens = { SHIKONA: winner.shikona, rikishiId: winner.id };

  // Veteran emotional — for older rikishi (30+ years old)
  const age = (winner.birthYear ?? 1995) <= year - 30;
  if (age) {
    emitLine(
      lines,
      BardEngine.resolve(rng, "post_basho_press.prize_winner.veteran_emotional", tokens),
      baseId,
      "veteran"
    );
  }

  // Fought match not situation — always generate
  emitLine(
    lines,
    BardEngine.resolve(rng, "post_basho_press.prize_winner.fought_match_not_situation", tokens),
    baseId,
    "fought"
  );

  // Rival frustration — 25% chance
  if (rng.next() < 0.25) {
    emitLine(
      lines,
      BardEngine.resolve(rng, "post_basho_press.prize_winner.rival_frustration", tokens),
      baseId,
      "rival"
    );
  }

  // Fighting name vindication — if shikona was conferred early (before sekitori)
  if (winner.shikonaConferredEarly) {
    emitLine(
      lines,
      BardEngine.resolve(rng, "post_basho_press.prize_winner.fighting_name_vindication", tokens),
      baseId,
      "fighting-name"
    );
  }

  // Cohort pride — if recruitmentCohortId is set
  if (winner.recruitmentCohortId) {
    emitLine(
      lines,
      BardEngine.resolve(rng, "post_basho_press.prize_winner.cohort_pride", tokens),
      baseId,
      "cohort"
    );
  }

  return lines;
}

/**
 * Yokozuna bid commentary for a strong Ozeki: continuation statement and
 * (at 13+ wins) score-threshold rhetoric.
 */
export function generateYokozunaBidLines(
  rikishi: Rikishi,
  rng: ReturnType<typeof rngFromSeed>,
  bashoName: string,
  year: number,
  wins: number
): PbpLine[] {
  const lines: PbpLine[] = [];
  const baseId = `press-ydc-bid-${rikishi.id}-${bashoName}-${year}`;
  const tokens = { SHIKONA: rikishi.shikona, rikishiId: rikishi.id };

  // Continuation statement
  emitLine(
    lines,
    BardEngine.resolve(rng, "post_basho_press.ydc_bid.continuation", tokens),
    baseId,
    "continuation"
  );

  // Score threshold — if 13+ wins
  if (wins >= 13) {
    emitLine(
      lines,
      BardEngine.resolve(rng, "post_basho_press.ydc_bid.score_threshold", tokens),
      baseId,
      "score"
    );
  }

  return lines;
}

/**
 * Ozeki stake claim for a strong sekiwake/komusubi.
 */
export function generateOzekiStakeLines(
  rikishi: Rikishi,
  rng: ReturnType<typeof rngFromSeed>,
  bashoName: string,
  year: number
): PbpLine[] {
  const lines: PbpLine[] = [];
  const baseId = `press-ozeki-stake-${rikishi.id}-${bashoName}-${year}`;

  emitLine(
    lines,
    BardEngine.resolve(rng, "post_basho_press.ozeki_stake", {
      SHIKONA: rikishi.shikona,
      rikishiId: rikishi.id,
    }),
    baseId,
    "stake"
  );

  return lines;
}
