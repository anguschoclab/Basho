/**
 * Kesho-Mawashi Pipeline
 *
 * Event-driven orchestration: responds to banzuke promotion events and
 * triggers generation/upgrade of KeshoMawashi and YokozunaTsuna via the
 * factory functions.
 */

import type { WorldState } from "../../types/world";
import type { MovementEvent } from "../../types/banzuke";
import type { KeshoTier } from "../../types/keshoMawashi";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import {
import { getRikishi } from "../../queries";
  generateKeshoMawashi,
  upgradeKeshoMawashi,
  generateYokozunaTsuna,
} from "./KeshoMawashiFactory";

/** Generate kesho-mawashi for all promotions detected in banzuke update */
export function generateKeshoForPromotions(
  world: WorldState,
  events: MovementEvent[]
): StateImpact {
  const builder = createImpactBuilder("keshoGeneration");

  for (const event of events) {
    if (event.kind !== "promotion") continue;

    const rikishi = getRikishi(world, event.rikishiId);
    if (!rikishi) continue;

    // Check if this is a makushita -> juryo promotion (first sekitori rank)
    const isJuryoPromotion = event.from.includes("makushita") && event.to.includes("juryo");

    // Check if this is a juryo -> makuuchi promotion (tier upgrade)
    // Makuuchi division ranks: maegashira, sekiwake, komusubi, ozeki, yokozuna
    const isMakuuchiPromotion =
      event.from.includes("juryo") &&
      (event.to.includes("maegashira") ||
        event.to.includes("sekiwake") ||
        event.to.includes("komusubi") ||
        event.to.includes("ozeki") ||
        event.to.includes("yokozuna"));

    // Check if this is a sanyaku promotion (ranks: sekiwake, komusubi, ozeki, yokozuna)
    const isSanyakuPromotion =
      (event.from.includes("maegashira") || event.from.includes("juryo")) &&
      (event.to.includes("sekiwake") ||
        event.to.includes("komusubi") ||
        event.to.includes("ozeki") ||
        event.to.includes("yokozuna"));

    if (isJuryoPromotion && !rikishi.keshoMawashi) {
      // Generate new kesho-mawashi for first-time sekitori
      const kesho = generateKeshoMawashi(world, rikishi, "juryo");
      builder.updateRikishi(rikishi.id, { keshoMawashi: kesho });

      builder.logEvent(
        "KESHO_CREATED",
        "narrative",
        {
          rikishiId: rikishi.id,
          heyaId: rikishi.heyaId,
          tier: "juryo",
          description: `${rikishi.shikona} receives their first kesho-mawashi upon juryo promotion.`,
        },
        { rikishiId: rikishi.id, heyaId: rikishi.heyaId }
      );
    } else if ((isMakuuchiPromotion || isSanyakuPromotion) && rikishi.keshoMawashi) {
      // Upgrade existing kesho-mawashi
      const newTier: KeshoTier = isSanyakuPromotion
        ? event.to.includes("yokozuna")
          ? "yokozuna"
          : "sanyaku"
        : "makuuchi";

      const upgraded = upgradeKeshoMawashi(rikishi.keshoMawashi, newTier, world);
      builder.updateRikishi(rikishi.id, { keshoMawashi: upgraded });

      builder.logEvent(
        "KESHO_UPGRADED",
        "narrative",
        {
          rikishiId: rikishi.id,
          heyaId: rikishi.heyaId,
          oldTier: rikishi.keshoMawashi?.tier,
          newTier,
          description: `${rikishi.shikona}'s kesho-mawashi is upgraded to ${newTier} tier.`,
        },
        { rikishiId: rikishi.id, heyaId: rikishi.heyaId }
      );
    }

    // Generate yokozuna tsuna for yokozuna promotion
    if (event.to.includes("yokozuna") && !rikishi.yokozunaTsuna) {
      const tsuna = generateYokozunaTsuna(world, rikishi);
      builder.updateRikishi(rikishi.id, { yokozunaTsuna: tsuna });

      builder.logEvent(
        "YOKOZUNA_TSUNA_CREATED",
        "narrative",
        {
          rikishiId: rikishi.id,
          style: tsuna.style,
          description: `${rikishi.shikona} receives the yokozuna tsuna.`,
        },
        { rikishiId: rikishi.id }
      );
    }

    // Generate yokozuna-tier kesho for direct yokozuna promotions (if no kesho exists)
    if (event.to.includes("yokozuna") && !rikishi.keshoMawashi) {
      const kesho = generateKeshoMawashi(world, rikishi, "yokozuna");
      builder.updateRikishi(rikishi.id, { keshoMawashi: kesho });

      builder.logEvent(
        "KESHO_MAWASHI_CREATED",
        "narrative",
        {
          rikishiId: rikishi.id,
          tier: "yokozuna",
          description: `${rikishi.shikona} receives a magnificent yokozuna-tier kesho-mawashi.`,
        },
        { rikishiId: rikishi.id, heyaId: rikishi.heyaId }
      );
    }
  }

  return builder.build();
}
