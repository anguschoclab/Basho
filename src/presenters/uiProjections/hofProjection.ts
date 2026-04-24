/**
 * hofProjection.ts
 *
 * Hall of Fame related projection functions.
 * Extracted from uiDigest.ts to separate concerns.
 */

import type { WorldState } from "../../engine/types/world";
import { getHallOfFame } from "../../engine/hallOfFame";
import type { HoFInductee } from "../../engine/hallOfFame";
import type { UIRikishi } from "../uiModels";
import { projectRikishi } from "../rikishiUI";

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

    // Greatest fights projection
    const greatestFights =
      (rikishi as Rikishi)?.history
        ?.filter((m) => m.win)
        .slice(-10)
        .map((m) => ({
          bashoName: m.bashoId ?? "",
          kimarite: m.kimarite,
          opponentName: world.rikishi.get(m.opponentId)?.shikona ?? "Unknown",
          isWin: m.win,
        }))
        .reverse()
        .slice(0, 5) ?? [];

    // Yusho list projection
    const yushoList = world.history
      .filter((br) => br.yusho === ind.rikishiId)
      .map((br) => ({ year: br.year, bashoName: br.bashoName }));

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
