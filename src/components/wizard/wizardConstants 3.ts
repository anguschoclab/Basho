/**
 * wizardConstants.ts
 *
 * Constants for new game wizard.
 */

import { Trophy, Star, DollarSign } from "lucide-react";

export const OYAKATA_BACKGROUNDS: Array<{
  id: string;
  label: string;
  labelJa: string;
  description: string;
  bonuses: { prestige: number; funds: number; scouting: number; training: number };
  icon: React.ElementType;
  color: string;
}> = [
  {
    id: "yokozuna",
    label: "Former Yokozuna",
    labelJa: "横綱出身",
    description:
      "Maximum prestige and institutional respect. Your reputation precedes you, making recruitment of elite talent easier, though expectations are sky-high.",
    bonuses: { prestige: 2, funds: 5_000_000, scouting: 70, training: 80 },
    icon: Trophy,
    color: "amber",
  },
  {
    id: "ozeki",
    label: "Former Ozeki",
    labelJa: "大関出身",
    description:
      "Highly respected with a strong network of supporters (koenkai). A balanced start with decent financial backing and solid training roots.",
    bonuses: { prestige: 1, funds: 15_000_000, scouting: 60, training: 70 },
    icon: Star,
    color: "blue",
  },
  {
    id: "maegashira",
    label: "Former Maegashira",
    labelJa: "幕内出身",
    description:
      "A seasoned journeyman with a massive business network. While you lack top-tier prestige, your deep pockets allow for rapid facility expansion.",
    bonuses: { prestige: 0, funds: 30_000_000, scouting: 50, training: 50 },
    icon: DollarSign,
    color: "emerald",
  },
];

export const ICHIMON_FACTIONS: Array<{
  id: string;
  name: string;
  ja: string;
  description: string;
}> = [
  {
    id: "dewanoumi",
    name: "Dewanoumi",
    ja: "出羽海",
    description: "The largest and most traditional faction with deep political roots.",
  },
  {
    id: "nishonoseki",
    name: "Nishonoseki",
    ja: "二所ノ関",
    description: "A powerful, modern faction known for wealth and influence.",
  },
  {
    id: "takasago",
    name: "Takasago",
    ja: "高砂",
    description: "Fierce independence and a storied history of elite champions.",
  },
  {
    id: "tokitsukaze",
    name: "Tokitsukaze",
    ja: "時津風",
    description: "A balanced bloc focused on fundamental training excellence.",
  },
  {
    id: "isegahama",
    name: "Isegahama",
    ja: "伊勢ヶ濱",
    description: "Currently dominant in the Makuuchi division with top-tier talent.",
  },
];
