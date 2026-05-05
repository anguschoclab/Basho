/**
 * wizardConstants.ts
 *
 * Constants for new game wizard.
 */

import { Trophy, Star, Users, Heart, Flame, Globe, Landmark } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface OyakataBackstory {
  id: string;
  label: string;
  labelJa: string;
  flavor: string;
  difficulty: "Easy" | "Normal" | "Hard" | "Very Hard";
  highestRank: string;
  icon: LucideIcon;
  bonuses: {
    funds: number;
    prestige: number;
    scouting: number;
    training: number;
    politics: number;
  };
}

export const OYAKATA_BACKSTORIES: OyakataBackstory[] = [
  {
    id: "yokozuna_champion",
    label: "Champion Inheritor",
    labelJa: "横綱出身",
    flavor:
      "You reached sumo's pinnacle. Now you guide the next generation — but expectations are sky-high and rivals watch your every move.",
    difficulty: "Easy",
    highestRank: "Yokozuna",
    icon: Trophy,
    bonuses: { funds: 3_000_000, prestige: 4, scouting: 1, training: 1, politics: 3 },
  },
  {
    id: "ozeki_legend",
    label: "Tournament Legend",
    labelJa: "大関出身",
    flavor:
      "A champion-maker with a proven record. Your koenkai network opens doors, and your tactical mind gives you an edge in the training hall.",
    difficulty: "Normal",
    highestRank: "Ozeki",
    icon: Star,
    bonuses: { funds: 5_000_000, prestige: 3, scouting: 0, training: 2, politics: 1 },
  },
  {
    id: "sanyaku_veteran",
    label: "Sanyaku Veteran",
    labelJa: "三役出身",
    flavor:
      "Years at the top tier sharpened both your technical knowledge and your reading of talent. A solid, balanced foundation.",
    difficulty: "Normal",
    highestRank: "Sekiwake",
    icon: Users,
    bonuses: { funds: 10_000_000, prestige: 1, scouting: 1, training: 2, politics: 0 },
  },
  {
    id: "maegashira_lifer",
    label: "Long-Distance Runner",
    labelJa: "幕内出身",
    flavor:
      "135 tournaments, never a yusho — but your hands-on mastery of every technique is unmatched. Prestige must be earned the hard way.",
    difficulty: "Hard",
    highestRank: "Maegashira",
    icon: Heart,
    bonuses: { funds: 15_000_000, prestige: -1, scouting: 0, training: 4, politics: -1 },
  },
  {
    id: "injury_comeback",
    label: "Comeback King",
    labelJa: "復活出身",
    flavor:
      "Injury cut short a brilliant career. Unfinished business drives you — but the gambler in you never learned patience.",
    difficulty: "Normal",
    highestRank: "Ozeki",
    icon: Flame,
    bonuses: { funds: 8_000_000, prestige: 2, scouting: 1, training: 1, politics: 1 },
  },
  {
    id: "international_scout",
    label: "International Scout",
    labelJa: "国際派出身",
    flavor:
      "You built the first Mongolian pipeline. Your continental network is unrivalled — traditionalists distrust you, but results speak.",
    difficulty: "Hard",
    highestRank: "Maegashira",
    icon: Globe,
    bonuses: { funds: 12_000_000, prestige: 0, scouting: 5, training: 1, politics: -1 },
  },
  {
    id: "council_elder",
    label: "Council Elder",
    labelJa: "評議員出身",
    flavor:
      "Your power lies in the association, not the ring. Political capital is your currency — but the training hall is unfamiliar ground.",
    difficulty: "Very Hard",
    highestRank: "Sekiwake",
    icon: Landmark,
    bonuses: { funds: 20_000_000, prestige: -1, scouting: 0, training: -1, politics: 5 },
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
