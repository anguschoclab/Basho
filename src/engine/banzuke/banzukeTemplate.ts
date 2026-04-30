import type { Division, RankPosition } from "../types/banzuke";

/** Build the full slot template for all divisions. */
export function buildFullSlotTemplate(
  sanyaku: { yokozuna: number; ozeki: number; sekiwake: number; komusubi: number; maegashira: number },
  counts: { makuuchi: number; juryo: number; makushita: number; sandanme: number; jonidan: number; jonokuchi: number }
): Array<{ division: Division; position: RankPosition }> {
  const out: Array<{ division: Division; position: RankPosition }> = [];

  out.push(...buildMakuuchiTemplate(sanyaku, counts.makuuchi));
  out.push(...buildNumberedDivisionTemplate("juryo", "juryo", counts.juryo));
  out.push(...buildNumberedDivisionTemplate("makushita", "makushita", counts.makushita));
  out.push(...buildNumberedDivisionTemplate("sandanme", "sandanme", counts.sandanme));
  out.push(...buildNumberedDivisionTemplate("jonidan", "jonidan", counts.jonidan));
  out.push(...buildNumberedDivisionTemplate("jonokuchi", "jonokuchi", counts.jonokuchi));

  return out;
}

function buildMakuuchiTemplate(
  sanyaku: { yokozuna: number; ozeki: number; sekiwake: number; komusubi: number },
  totalSlots: number = 42
): Array<{ division: Division; position: RankPosition }> {
  const slots: Array<{ division: Division; position: RankPosition }> = [];

  const pushNamed = (rank: "yokozuna" | "ozeki" | "sekiwake" | "komusubi", count: number) => {
    let side: "east" | "west" = "east";
    for (let i = 0; i < count; i++) {
      slots.push({ division: "makuuchi", position: { rank, side } });
      side = side === "east" ? "west" : "east";
    }
  };

  pushNamed("yokozuna", sanyaku.yokozuna);
  pushNamed("ozeki", sanyaku.ozeki);
  pushNamed("sekiwake", sanyaku.sekiwake);
  pushNamed("komusubi", sanyaku.komusubi);

  // CRITICAL: Fill exactly up to totalSlots (Default 42) with Maegashira
  const remaining = Math.max(0, totalSlots - slots.length);
  for (let i = 0; i < remaining; i++) {
    const n = Math.floor(i / 2) + 1;
    const side = i % 2 === 0 ? "east" : "west";
    slots.push({ division: "makuuchi", position: { rank: "maegashira", side, rankNumber: n } });
  }

  return slots;
}

function buildNumberedDivisionTemplate(
  division: Division,
  rank: "juryo" | "makushita" | "sandanme" | "jonidan" | "jonokuchi",
  totalSlots: number
): Array<{ division: Division; position: RankPosition }> {
  const slots: Array<{ division: Division; position: RankPosition }> = [];
  const pairs = Math.floor(totalSlots / 2);

  for (let n = 1; n <= pairs; n++) {
    slots.push({ division, position: { rank, side: "east", rankNumber: n } });
    slots.push({ division, position: { rank, side: "west", rankNumber: n } });
  }

  if (totalSlots % 2 === 1) {
    slots.push({ division, position: { rank, side: "east", rankNumber: pairs + 1 } });
  }

  return slots;
}
