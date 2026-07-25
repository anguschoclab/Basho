/**
 * hofProjection.ts
 *
 * Hall of Fame related projection functions.
 * Extracted from uiDigest.ts to separate concerns.
 */

import type { WorldState } from "../../engine/types/world";
import type { Rikishi } from "../../engine/types/rikishi";
import { getHallOfFame } from "../../engine/hallOfFame";
import type { HoFInductee } from "../../engine/hallOfFame";
import type { UIRikishi } from "../uiModels";
import { projectRikishi } from "../rikishi";

export interface UIHofInductee extends HoFInductee {
  rikishi: UIRikishi | null;
  heyaName: string;
  greatestFights: Array<{
    bashoName: string;
    kimarite: string;
    opponentName: string;
    isWin: boolean;
  }>;
  yushoList: Array<{
    year: number;
    bashoName: string;
  }>;
}

/**
 * Project Hall of Fame data for the HOF Page.
 */
export function projectHOFUIDigest(world: WorldState): { inductees: UIHofInductee[] } {
  const rawHof = getHallOfFame(world);

  const inductees = rawHof.inductees.map((ind: HoFInductee) => {
    const rikishi = world.rikishi.get(ind.rikishiId);
    const heya = rikishi ? world.heyas.get(rikishi.heyaId) : null;

    // Greatest fights projection — single-pass build of last 5 wins
    const greatestFights: Array<{
      bashoName: string;
      kimarite: string;
      opponentName: string;
      isWin: boolean;
    }> = [];
    const history = (rikishi as Rikishi)?.history;
    if (history) {
      for (let i = history.length - 1; i >= 0 && greatestFights.length < 5; i--) {
        const m = history[i];
        if (m.win) {
          greatestFights.push({
            bashoName: m.bashoId ?? "",
            kimarite: m.kimarite,
            opponentName: world.rikishi.get(m.opponentId)?.shikona ?? "Unknown",
            isWin: m.win,
          });
        }
      }
      greatestFights.reverse();
    }

    // Yusho list projection — single-pass collect
    const yushoList: Array<{ year: number; bashoName: string }> = [];
    for (const br of world.history) {
      if (br.yusho === ind.rikishiId) {
        yushoList.push({ year: br.year, bashoName: br.bashoName });
      }
    }

    return {
      ...ind,
      rikishi: rikishi ? projectRikishi(rikishi, world) : null,
      heyaName: heya?.name ?? "Independent",
      greatestFights,
      yushoList,
    };
  });

  return { inductees };
}
