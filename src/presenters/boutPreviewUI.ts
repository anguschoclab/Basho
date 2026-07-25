/**
 * src/presenters/boutPreviewUI.ts
 * ================================
 * BoutPreviewUI — NHK broadcast-style pre-bout overlay data model.
 *
 * Packages two UIRikishi projections alongside a structured H2H report
 * and rivalry heat value, ready for the BoutPreMatchOverlay component.
 */

import type { UIRikishi } from "./rikishi";
import type { H2HReport } from "../engine/types/records";

export interface BoutPreviewUI {
  boutId: string;
  day: number;
  eastRikishi: UIRikishi;
  westRikishi: UIRikishi;
  h2hReport: H2HReport;
  /** Raw rivalry heat 0–100 from RivalriesState. */
  rivalryHeat: number;
}
