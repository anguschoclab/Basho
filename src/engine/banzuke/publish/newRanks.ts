import type { WorldState } from "../../types/world";
import type { BashoState } from "../../types/basho";
import type { MovementEvent } from "../../types/banzuke";
import { updateBanzuke } from "../../banzuke";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { checkShikonaChange, recordShikonaChange } from "../../history";
import { getRikishi, getHeya } from "../../queries";
import { generateKyujoNarrative } from "../../bout/boutNarrative";
import { recordSekitoriPromotion } from "../../systems/legacy/tenure";
import { isSekitoriDivision } from "../../../constants/engine/rankDisplay";

type Builder = ReturnType<typeof createImpactBuilder>;
type BanzukeResult = ReturnType<typeof updateBanzuke>;

/**
 * Applies the new banzuke ranks to each rikishi: division/rank/side updates,
 * record resets, shikona-change handling, injury-return flags, and the
 * ozeki demotion / reclaim headline events plus kyujo-return narratives.
 */
export function applyNewRanks(
  world: WorldState,
  lastBasho: BashoState,
  result: BanzukeResult,
  eventsByRikishiId: Map<string, MovementEvent>,
  builder: Builder
): void {
  for (const newEntry of result.newBanzuke) {
    const rikishi = getRikishi(world, newEntry.rikishiId);
    if (rikishi) {
      const oldRank = rikishi.rank;
      const oldShikona = rikishi.shikona;
      const wasSekitori = isSekitoriDivision(rikishi.division);

      // WS5 — a cross into juryo/makuuchi counts toward the oyakata's
      // sekitoriProduced tenure record.
      {
        const heya = getHeya(world, rikishi.heyaId);
        if (heya) recordSekitoriPromotion(world, builder, heya, wasSekitori, newEntry.division);
      }

      // Check if shikona should change due to promotion
      const newShikona = checkShikonaChange(world, rikishi, oldRank);

      // Track if rikishi was kyujo due to injury — set return flag for narrative triggers
      const wasKyujoFromInjury = rikishi.isKyujo && rikishi.kyujoReason === "injury";

      // Check if this rikishi had a sanyaku promotion this basho (Gap 5)
      const movementEvent = eventsByRikishiId.get(newEntry.rikishiId);
      const isSanyakuPromotion = movementEvent?.isSanyakuPromotion ?? false;

      if (newShikona) {
        recordShikonaChange(world, rikishi.id, oldShikona, newShikona);
        builder.updateRikishi(newEntry.rikishiId, {
          division: newEntry.division,
          rank: newEntry.position.rank,
          rankNumber: newEntry.position.rankNumber,
          side: newEntry.position.side,
          currentBashoWins: 0,
          currentBashoLosses: 0,
          currentWinStreak: 0,
          currentLossStreak: 0,
          isKyujo: false,
          kyujoReason: undefined,
          recentlyReturnedFromInjury: wasKyujoFromInjury || undefined,
          sanyakuPromotionThisBasho: isSanyakuPromotion || undefined,
          shikona: newShikona,
          economics: {
            ...(rikishi.economics ?? {
              cash: 0,
              retirementFund: 0,
              careerKenshoWon: 0,
              kinboshiCount: 0,
              totalEarnings: 0,
              currentBashoEarnings: 0,
              popularity: 50,
            }),
            currentBashoEarnings: 0,
          },
        });
      } else {
        builder.updateRikishi(newEntry.rikishiId, {
          division: newEntry.division,
          rank: newEntry.position.rank,
          rankNumber: newEntry.position.rankNumber,
          side: newEntry.position.side,
          currentBashoWins: 0,
          currentBashoLosses: 0,
          currentWinStreak: 0,
          currentLossStreak: 0,
          isKyujo: false,
          kyujoReason: undefined,
          recentlyReturnedFromInjury: wasKyujoFromInjury || undefined,
          sanyakuPromotionThisBasho: isSanyakuPromotion || undefined,
          economics: {
            ...(rikishi.economics ?? {
              cash: 0,
              retirementFund: 0,
              careerKenshoWon: 0,
              kinboshiCount: 0,
              totalEarnings: 0,
              currentBashoEarnings: 0,
              popularity: 50,
            }),
            currentBashoEarnings: 0,
          },
        });
      }

      checkOzekiRankTransitions(builder, rikishi, newEntry);

      // Gap 4/9: Generate return_from_kyujo narrative for returning rikishi
      if (rikishi.isKyujo) {
        const bashosMissed = (rikishi as { consecutiveKyujo?: number }).consecutiveKyujo ?? 1;
        const returnNarrative = generateKyujoNarrative(
          rikishi,
          "return_from_kyujo",
          { bashosMissed },
          `return-kyujo-${newEntry.rikishiId}-${world.seed}-${lastBasho.bashoName}`
        );
        builder.logEvent(
          "BASHO_STATUS",
          "basho",
          {
            rikishiId: newEntry.rikishiId,
            heyaId: rikishi.heyaId,
            shikona: rikishi.shikona,
            status: "kyujo_return",
            bashosMissed,
            narrative: returnNarrative,
          },
          { rikishiId: newEntry.rikishiId, heyaId: rikishi.heyaId }
        );
      }
    }
  }
}

/**
 * Ozeki rank-transition events: demotion sets wasDemotedFromOzeki and emits
 * the headline; reclaim (demoted ozeki restored via 10+ win) clears it.
 */
function checkOzekiRankTransitions(
  builder: Builder,
  rikishi: NonNullable<ReturnType<typeof getRikishi>>,
  newEntry: BanzukeResult["newBanzuke"][number]
): void {
  const oldRank = rikishi.rank;

  // Ozeki demotion detection: set wasDemotedFromOzeki flag
  if (oldRank === "ozeki" && newEntry.position.rank !== "ozeki") {
    builder.updateRikishi(newEntry.rikishiId, {
      wasDemotedFromOzeki: true,
    });
    builder.logEvent(
      "BASHO_STATUS",
      "promotion",
      {
        status: "ozeki_demotion",
        description: `${rikishi.shikona} has been demoted from Ozeki.`,
        rikishiId: newEntry.rikishiId,
        from: oldRank,
        to: newEntry.position.rank,
      },
      { rikishiId: newEntry.rikishiId, heyaId: rikishi.heyaId, importance: "headline" }
    );
  }

  // Ozeki reclaim detection: demoted ozeki restored to ozeki rank (10+ win reclaim)
  if (
    oldRank !== "ozeki" &&
    newEntry.position.rank === "ozeki" &&
    rikishi.wasDemotedFromOzeki
  ) {
    builder.updateRikishi(newEntry.rikishiId, {
      wasDemotedFromOzeki: false,
    });
    builder.logEvent(
      "BASHO_STATUS",
      "promotion",
      {
        status: "ozeki_reclaim",
        description: `${rikishi.shikona} has reclaimed Ozeki rank after a strong performance at Sekiwake.`,
        rikishiId: newEntry.rikishiId,
        from: oldRank,
        to: "ozeki",
      },
      { rikishiId: newEntry.rikishiId, heyaId: rikishi.heyaId, importance: "headline" }
    );
  }
}
