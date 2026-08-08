/**
 * Constants for PromotionPipelineWidget component.
 */

import { RANK_DISPLAY_REGISTRY } from "@/constants/engine/rankDisplay";

export const RANK_TIERS = [
  { key: "yokozuna", label: RANK_DISPLAY_REGISTRY.yokozuna.en, color: "hsl(var(--gold))" },
  { key: "ozeki", label: RANK_DISPLAY_REGISTRY.ozeki.en, color: "hsl(var(--primary))" },
  { key: "sekiwake", label: RANK_DISPLAY_REGISTRY.sekiwake.en, color: "hsl(var(--primary) / 0.8)" },
  { key: "komusubi", label: RANK_DISPLAY_REGISTRY.komusubi.en, color: "hsl(var(--primary) / 0.6)" },
  { key: "maegashira", label: RANK_DISPLAY_REGISTRY.maegashira.en, color: "hsl(60 4% 60%)" },
  { key: "juryo", label: RANK_DISPLAY_REGISTRY.juryo.en, color: "hsl(60 4% 50%)" },
  { key: "makushita", label: RANK_DISPLAY_REGISTRY.makushita.en, color: "hsl(60 4% 40%)" },
] as const;
