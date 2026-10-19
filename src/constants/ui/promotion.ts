/**
 * Constants for PromotionPipelineWidget component.
 */

import { RANK_DISPLAY_REGISTRY } from "@/constants/engine/rankDisplay";

export const RANK_TIERS = [
  { key: "yokozuna", label: RANK_DISPLAY_REGISTRY.yokozuna.en, color: "hsl(var(--gold))" },
  { key: "ozeki", label: RANK_DISPLAY_REGISTRY.ozeki.en, color: "hsl(var(--primary))" },
  { key: "sekiwake", label: RANK_DISPLAY_REGISTRY.sekiwake.en, color: "hsl(var(--primary) / 0.8)" },
  { key: "komusubi", label: RANK_DISPLAY_REGISTRY.komusubi.en, color: "hsl(var(--primary) / 0.6)" },
  { key: "maegashira", label: RANK_DISPLAY_REGISTRY.maegashira.en, color: "hsl(var(--silver))" },
  { key: "juryo", label: RANK_DISPLAY_REGISTRY.juryo.en, color: "hsl(var(--muted-foreground))" },
  {
    key: "makushita",
    label: RANK_DISPLAY_REGISTRY.makushita.en,
    color: "hsl(var(--muted-foreground) / 0.7)",
  },
] as const;
