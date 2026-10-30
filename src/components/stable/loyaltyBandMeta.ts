/**
 * loyaltyBandMeta.ts
 *
 * Display metadata for the weekly agency disposition band written to
 * rikishi.agency.loyaltyBand by phase01_week_rikishi_agency (WS4).
 * Bands are the engine's own player-safe labels — we surface them verbatim.
 */

import type { Rikishi } from "@/engine/types/rikishi";
import type { BadgeVariantProps } from "@/components/ui/badge-variants";

type LoyaltyBand = NonNullable<Rikishi["agency"]>["loyaltyBand"];

interface LoyaltyBandMeta {
  label: string;
  /** Text color for inline/table rendering. */
  className: string;
  /** Badge variant used when the band is flagged on roster cards. */
  badgeVariant: NonNullable<BadgeVariantProps["variant"]>;
}

export const LOYALTY_BAND_META: Record<LoyaltyBand, LoyaltyBandMeta> = {
  loyal: { label: "Loyal", className: "text-success", badgeVariant: "secondary" },
  wavering: { label: "Wavering", className: "text-muted-foreground", badgeVariant: "outline" },
  restless: { label: "Restless", className: "text-gold", badgeVariant: "gold" },
  discontent: { label: "Discontent", className: "text-destructive", badgeVariant: "destructive" },
};
