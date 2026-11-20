/**
 * Constants for new game wizard.
 */

import { BACKSTORY_BONUS_CORE } from "@/constants/engine/backstories";
import type { IchimonName } from "@/engine/types/economy";

export interface OyakataBackstory {
  id: string;
  label: string;
  labelJa: string;
  flavor: string;
  difficulty: "Easy" | "Normal" | "Hard" | "Very Hard";
  highestRank: string;
  iconName: string; // Icon identifier for component to map to actual icon
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
    iconName: "Trophy",
    bonuses: { ...BACKSTORY_BONUS_CORE.yokozuna_champion },
  },
  {
    id: "ozeki_legend",
    label: "Tournament Legend",
    labelJa: "大関出身",
    flavor:
      "A champion-maker with a proven record. Your koenkai network opens doors, and your tactical mind gives you an edge in the training hall.",
    difficulty: "Normal",
    highestRank: "Ozeki",
    iconName: "Star",
    bonuses: { ...BACKSTORY_BONUS_CORE.ozeki_legend },
  },
  {
    id: "sanyaku_veteran",
    label: "Sanyaku Veteran",
    labelJa: "三役出身",
    flavor:
      "Years at the top tier sharpened both your technical knowledge and your reading of talent. A solid, balanced foundation.",
    difficulty: "Normal",
    highestRank: "Sekiwake",
    iconName: "Users",
    bonuses: { ...BACKSTORY_BONUS_CORE.sanyaku_veteran },
  },
  {
    id: "maegashira_lifer",
    label: "Long-Distance Runner",
    labelJa: "幕内出身",
    flavor:
      "135 tournaments, never a yusho — but your hands-on mastery of every technique is unmatched. Prestige must be earned the hard way.",
    difficulty: "Hard",
    highestRank: "Maegashira",
    iconName: "Heart",
    bonuses: { ...BACKSTORY_BONUS_CORE.maegashira_lifer },
  },
  {
    id: "injury_comeback",
    label: "Comeback King",
    labelJa: "復活出身",
    flavor:
      "Injury cut short a brilliant career. Unfinished business drives you — but the gambler in you never learned patience.",
    difficulty: "Normal",
    highestRank: "Ozeki",
    iconName: "Flame",
    bonuses: { ...BACKSTORY_BONUS_CORE.injury_comeback },
  },
  {
    id: "international_scout",
    label: "International Scout",
    labelJa: "国際派出身",
    flavor:
      "You built the first Mongolian pipeline. Your continental network is unrivalled — traditionalists distrust you, but results speak.",
    difficulty: "Hard",
    highestRank: "Maegashira",
    iconName: "Globe",
    bonuses: { ...BACKSTORY_BONUS_CORE.international_scout },
  },
  {
    id: "council_elder",
    label: "Council Elder",
    labelJa: "評議員出身",
    flavor:
      "Your power lies in the association, not the ring. Political capital is your currency — but the training hall is unfamiliar ground.",
    difficulty: "Very Hard",
    highestRank: "Sekiwake",
    iconName: "Landmark",
    bonuses: { ...BACKSTORY_BONUS_CORE.council_elder },
  },
];

export const ICHIMON_FACTIONS: Array<{
  // id IS the engine's IchimonName — heya.ichimon comparisons are
  // case-sensitive (TrainingMath, banzuke politics), so these must stay
  // capitalized exactly as in src/engine/types/economy.ts.
  id: IchimonName;
  name: string;
  ja: string;
  description: string;
}> = [
  {
    id: "Dewanoumi",
    name: "Dewanoumi",
    ja: "出羽海",
    description: "The largest and most traditional faction with deep political roots.",
  },
  {
    id: "Nishonoseki",
    name: "Nishonoseki",
    ja: "二所ノ関",
    description: "A powerful, modern faction known for wealth and influence.",
  },
  {
    id: "Takasago",
    name: "Takasago",
    ja: "高砂",
    description: "Fierce independence and a storied history of elite champions.",
  },
  {
    id: "Tokitsukaze",
    name: "Tokitsukaze",
    ja: "時津風",
    description: "A balanced bloc focused on fundamental training excellence.",
  },
  {
    id: "Isegahama",
    name: "Isegahama",
    ja: "伊勢ヶ濱",
    description: "Currently dominant in the Makuuchi division with top-tier talent.",
  },
];
