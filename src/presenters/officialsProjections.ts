/**
 * officialsProjections.ts — projects gyoji and shimpan pool data for UI.
 */
import type { WorldState } from "../engine/types/world";
import type { Gyoji } from "../engine/types/gyoji";

export interface GyojiDTO {
  id: string;
  name: string;
  rank: Gyoji["rank"];
  rankLabel: string;
  accuracy: number;
  boutsOfficiated: number;
  callsReversed: number;
  reversalRate: number;
}

export interface ShimpanDTO {
  id: string;
  name: string;
  accuracy: number;
  consultations: number;
}

export interface OfficialsProjection {
  gyoji: GyojiDTO[];
  shimpan: ShimpanDTO[];
  topGyoji: GyojiDTO | null;
  totalBoutsOfficiated: number;
  totalReversals: number;
}

const RANK_LABELS: Record<Gyoji["rank"], string> = {
  tate: "Tate-gyoji",
  "fuku-tate": "Fuku-tate-gyoji",
  sanyaku: "Sanyaku-gyoji",
  makuuchi: "Makuuchi-gyoji",
  juryo: "Juryo-gyoji",
  makushita: "Makushita-gyoji",
};

export function projectOfficials(world: WorldState): OfficialsProjection {
  const gyojiPool = world.gyojiPool ?? [];
  const shimpanPool = world.shimpanPool ?? [];

  const gyoji: GyojiDTO[] = gyojiPool.map((g) => ({
    id: g.id,
    name: g.name,
    rank: g.rank,
    rankLabel: RANK_LABELS[g.rank] ?? g.rank,
    accuracy: g.accuracy,
    boutsOfficiated: g.boutsOfficiated,
    callsReversed: g.callsReversed,
    reversalRate: g.boutsOfficiated > 0 ? g.callsReversed / g.boutsOfficiated : 0,
  }));

  const shimpan: ShimpanDTO[] = shimpanPool.map((s) => ({
    id: s.id,
    name: s.name,
    accuracy: s.accuracy,
    consultations: s.consultations,
  }));

  const sorted = [...gyoji].sort((a, b) => b.accuracy - a.accuracy);
  const totalBoutsOfficiated = gyoji.reduce((s, g) => s + g.boutsOfficiated, 0);
  const totalReversals = gyoji.reduce((s, g) => s + g.callsReversed, 0);

  return {
    gyoji: sorted,
    shimpan,
    topGyoji: sorted[0] ?? null,
    totalBoutsOfficiated,
    totalReversals,
  };
}
