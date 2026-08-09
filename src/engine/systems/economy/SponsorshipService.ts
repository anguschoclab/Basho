/**
 * SponsorshipService.ts — Thin re-export barrel
 *
 * The sponsorship system has been decomposed into:
 * - sponsorshipQueries.ts: Pure read functions (prestige, band mapping, koenkai income,
 *   benefactor selection, star power computation)
 * - sponsorshipMutations.ts: State mutation functions (recruitSponsor,
 *   applyAchievementImpact, processSponsorChurn, adjustKoenkaiBandToPrestige)
 *
 * This barrel preserves backward compatibility for all existing import sites.
 */

export {
  KOENKAI_MONTHLY_INCOME,
  SPONSOR_TIER_INCOME,
  computeHeyaPrestigeScore,
  targetKoenkaiBandFromPrestige,
  recalculateKoenkaiBand,
  createKoenkai,
  calculateKoenkaiIncome,
  selectBenefactor,
  computeStarPower,
} from "./sponsorshipQueries";

export {
  recruitSponsor,
  applyAchievementImpact,
  processSponsorChurn,
  adjustKoenkaiBandToPrestige,
} from "./sponsorshipMutations";
