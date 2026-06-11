import { determineSpecialPrizes } from "../banzuke";
import type { SpecialPrizesResult } from "../banzuke/specialPrizes";
import type { WorldState } from "../types/world";
import type { BashoState } from "../types/basho";
import { createImpactBuilder } from "../core/ImpactBuilder";
import type { StateImpact } from "../core/StateImpact";
import { applyAchievementImpact } from "../systems/economy/SponsorshipService";
import { SIMULATION_CONFIG } from "../core/SimulationConfig";
import type { Id } from "../types/common";
import { getRikishi } from "../queries";

/**
 * Distributes special prizes (Sansho) and tournament bonuses at the end of a basho.
 * Updates rikishi achievements and economic state, and logs financial events.
 *
 * @param {WorldState} world - The current world state.
 * @param {BashoState} basho - The state of the completed basho.
 * @param {Id} yusho - The ID of the rikishi who won the tournament championship.
 * @returns {Object} An object containing the prize results and the calculated state impact.
 */
export function distributePrizes(
  world: WorldState,
  basho: BashoState,
  yusho: Id
): { prizes: SpecialPrizesResult; impact: StateImpact } {
  const builder = createImpactBuilder("distributePrizes");
  const prizes = determineSpecialPrizes(basho.matches, world.rikishi, yusho);

  const SANSHO_PRIZE_AMOUNT = 2000000;
  const awardTypes = {
    shukunsho: "Shukun",
    kantosho: "Kanto",
    ginoSho: "Gino",
  } as const;

  for (const [key, type] of Object.entries(awardTypes)) {
    const rikishiId = (prizes as Record<string, string | undefined>)[key];
    if (rikishiId) {
      const r = getRikishi(world, rikishiId);
      if (r) {
        const currentAchievements = r.stats?.achievements || {
          kinboshiEarned: 0,
          ginboshiEarned: 0,
          kinboshiConceded: 0,
          ginboshiConceded: 0,
          mochikyukinPoints: 0,
          specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
        };
        const currentSp = currentAchievements.specialPrizes || {
          shukunSho: 0,
          kantoSho: 0,
          ginoSho: 0,
        };
        const updatedSp = { ...currentSp };
        if (type === "Shukun") updatedSp.shukunSho++;
        else if (type === "Kanto") updatedSp.kantoSho++;
        else if (type === "Gino") updatedSp.ginoSho++;

        // Apply sansho popularity boost via applyAchievementImpact
        const tempR = { ...r, economics: r.economics ? { ...r.economics } : undefined };
        if (tempR.economics) {
          applyAchievementImpact(world, tempR, "sansho");
        }

        builder.updateRikishi(rikishiId, {
          stats: {
            ...r.stats,
            achievements: {
              ...currentAchievements,
              specialPrizes: updatedSp,
            },
          },
          ...(tempR.economics && { economics: tempR.economics }),
        });

        builder.logEvent(
          "AWARD_CONFERRED",
          "economy",
          {
            money: SANSHO_PRIZE_AMOUNT,
            status: "special_prize",
            regimen: type as string,
          },
          { rikishiId: r.id, heyaId: r.heyaId }
        );

        // Credit sansho prize to rikishi economics (not heya funds under JSA model)
        const economics = r.economics || {
          cash: 0,
          retirementFund: 0,
          careerKenshoWon: 0,
          kinboshiCount: 0,
          totalEarnings: 0,
          currentBashoEarnings: 0,
          popularity: 50,
        };
        // Split sansho: 50% cash, 50% retirement fund
        const sanshoCash = SANSHO_PRIZE_AMOUNT * 0.5;
        const sanshoRetirement = SANSHO_PRIZE_AMOUNT * 0.5;

        builder.updateRikishi(r.id, {
          economics: {
            ...economics,
            cash: economics.cash + sanshoCash,
            retirementFund: economics.retirementFund + sanshoRetirement,
            totalEarnings: economics.totalEarnings + SANSHO_PRIZE_AMOUNT,
          },
        });
      }
    }
  }

  return { prizes, impact: builder.build() };
}

/**
 * Pay basho teate (tournament allowance) to non-sekitori rikishi.
 * Paid by JSA directly to rikishi economics.
 *
 * @param {WorldState} world - The current world state.
 * @returns {StateImpact} The state impact containing the allowance payments.
 */
export function payBashoTeate(world: WorldState): StateImpact {
  const builder = createImpactBuilder("payBashoTeate");

  for (const id of world.activeRikishiIds) {
    const r = getRikishi(world, id);
    if (!r) continue;

    // Only non-sekitori receive basho teate
    if (r.division === "makuuchi" || r.division === "juryo") continue;

    const TEATE_AMOUNTS: Partial<Record<string, number>> = {
      makushita: 175_000,
      sandanme: 85_000,
      jonidan: 75_000,
      jonokuchi: 70_000,
    };
    const teateAmount = TEATE_AMOUNTS[r.division] || 0;

    if (teateAmount > 0) {
      const economics = r.economics || {
        cash: 0,
        retirementFund: 0,
        careerKenshoWon: 0,
        kinboshiCount: 0,
        totalEarnings: 0,
        currentBashoEarnings: 0,
        popularity: 50,
      };
      builder.updateRikishi(id, {
        economics: {
          ...economics,
          cash: economics.cash + teateAmount,
          totalEarnings: economics.totalEarnings + teateAmount,
        },
      });
    }
  }

  return builder.build();
}

/**
 * Pay kinboshi stipends to rikishi who earned kinboshi this basho.
 * Uses per-basho kinboshi count tracked in basho.kinboshiThisBasho.
 *
 * @param {WorldState} world - The current world state.
 * @returns {StateImpact} The state impact containing the stipend payments.
 */
export function payKinboshiStipends(world: WorldState): StateImpact {
  const builder = createImpactBuilder("payKinboshiStipends");
  const basho = world.currentBasho;
  if (!basho) return builder.build();

  const kinboshiMap = basho.kinboshiThisBasho ?? {};

  for (const [rikishiId, count] of Object.entries(kinboshiMap)) {
    if (count <= 0) continue;
    const r = getRikishi(world, rikishiId);
    if (!r || r.isRetired) continue;

    const stipend = count * SIMULATION_CONFIG.prizes.kinboshiStipend;
    const economics = r.economics || {
      cash: 0,
      retirementFund: 0,
      careerKenshoWon: 0,
      kinboshiCount: 0,
      totalEarnings: 0,
      currentBashoEarnings: 0,
      popularity: 50,
    };
    builder.updateRikishi(rikishiId, {
      economics: {
        ...economics,
        cash: economics.cash + stipend,
        totalEarnings: economics.totalEarnings + stipend,
      },
    });
  }

  return builder.build();
}
