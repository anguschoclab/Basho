/**
 * backstories.ts
 * ==============
 * Canonical oyakata backstory bonus tables shared by the engine-side
 * `PLAYER_BACKSTORIES` (applyOyakataConfig) and the wizard-side
 * `OYAKATA_BACKSTORIES` (constants/ui/wizard) — the seven-entry bonus core
 * was duplicated verbatim with only `politicalCapital` differing.
 */

import { BACKSTORY_STARTING_FUNDS } from "@/constants/engine/economic";

export interface BackstoryBonusCore {
  funds: number;
  prestige: number;
  scouting: number;
  training: number;
  politics: number;
}

/**
 * Shared bonus core per backstory id — both tables derive from this so the
 * balance numbers live in exactly one place.
 */
export const BACKSTORY_BONUS_CORE: Record<string, BackstoryBonusCore> = {
  yokozuna_champion: {
    funds: BACKSTORY_STARTING_FUNDS.yokozuna_champion,
    prestige: 4,
    scouting: 1,
    training: 1,
    politics: 3,
  },
  ozeki_legend: {
    funds: BACKSTORY_STARTING_FUNDS.ozeki_legend,
    prestige: 3,
    scouting: 0,
    training: 2,
    politics: 1,
  },
  sanyaku_veteran: {
    funds: BACKSTORY_STARTING_FUNDS.sanyaku_veteran,
    prestige: 1,
    scouting: 1,
    training: 2,
    politics: 0,
  },
  maegashira_lifer: {
    funds: BACKSTORY_STARTING_FUNDS.maegashira_lifer,
    prestige: -1,
    scouting: 0,
    training: 4,
    politics: -1,
  },
  injury_comeback: {
    funds: BACKSTORY_STARTING_FUNDS.injury_comeback,
    prestige: 2,
    scouting: 1,
    training: 1,
    politics: 1,
  },
  international_scout: {
    funds: BACKSTORY_STARTING_FUNDS.international_scout,
    prestige: 0,
    scouting: 5,
    training: 1,
    politics: -1,
  },
  council_elder: {
    funds: BACKSTORY_STARTING_FUNDS.council_elder,
    prestige: -1,
    scouting: 0,
    training: -1,
    politics: 5,
  },
};

/**
 * Engine-only bonus — starting political capital per backstory. The wizard
 * table intentionally omits this (UI displays only the core five).
 */
export const BACKSTORY_POLITICAL_CAPITAL: Record<string, number> = {
  yokozuna_champion: 60,
  ozeki_legend: 30,
  sanyaku_veteran: 10,
  maegashira_lifer: 0,
  injury_comeback: 20,
  international_scout: 0,
  council_elder: 100,
};
