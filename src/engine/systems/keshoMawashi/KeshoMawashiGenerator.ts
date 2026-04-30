/**
 * Kesho-Mawashi Generator — thin re-export barrel
 *
 * All logic has been split into focused modules:
 *   - KeshoMawashiFactory.ts  — generation & upgrade of KeshoMawashi / YokozunaTsuna
 *   - KeshoMawashiPipeline.ts — event-driven orchestration for banzuke promotions
 *
 * This file exists solely to preserve backward-compatible import paths.
 */

export {
  generateKeshoMawashi,
  upgradeKeshoMawashi,
  generateYokozunaTsuna,
  buildDesignPalette,
} from "./KeshoMawashiFactory";

export { generateKeshoForPromotions } from "./KeshoMawashiPipeline";
