import { isMakeKoshi } from "./banzukeHelpers";

/** Defines the structure for ozeki kadoban state. */
export interface OzekiKadobanState {
  isKadoban: boolean;
  consecutiveMakeKoshi: number;
}

/** Type representing ozeki kadoban map. */
export type OzekiKadobanMap = Record<string, OzekiKadobanState>;

/** Determine Ozeki status for next basho based on performance. */
export function getOzekiStatus(
  lastBashoWins: number,
  lastBashoLosses: number,
  absences: number,
  previous: OzekiKadobanState | undefined
): OzekiKadobanState {
  const prev = previous ?? { isKadoban: false, consecutiveMakeKoshi: 0 };
  const hadMakeKoshi = isMakeKoshi(lastBashoWins, lastBashoLosses, "ozeki", absences);

  if (!hadMakeKoshi) {
    return { isKadoban: false, consecutiveMakeKoshi: 0 };
  }

  return {
    isKadoban: !prev.isKadoban,
    consecutiveMakeKoshi: prev.isKadoban ? 2 : 1,
  };
}
