import { describe, it } from "vitest";
import { simulateBout } from "@/engine/bout/boutResolver";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { Rikishi } from "@/engine/types/rikishi";

const mkStats = (over: Record<string, number>) =>
  ({
    power: 50, speed: 50, technique: 50, weight: 150, stamina: 50,
    mental: 50, adaptability: 50, balance: 50, aggression: 50, experience: 50,
    ...over,
  }) as Rikishi["stats"];

describe("probe5", () => {
  it("inBoutInjury — balanced power, zero escape stats on defender", () => {
    let injury = 0;
    let edge = 0;
    let forced = 0;
    const seeds: string[] = [];
    for (let i = 0; i < 4000; i++) {
      // Vary which side is weak so edge crises hit both directions.
      const weakE = MockFactory.createRikishi("e", {
        division: "makuuchi",
        stats: mkStats({ power: 80, speed: 80, mental: 0, balance: 0, aggression: 60 }),
      });
      const weakW = MockFactory.createRikishi("w", {
        division: "makuuchi",
        side: "west",
        stats: mkStats({ power: 80, speed: 80, mental: 0, balance: 0, aggression: 60 }),
      });
      const { result } = simulateBout(weakE, weakW, `bal-${i}`);
      if (result.inBoutInjury) {
        injury++;
        seeds.push(`bal-${i}`);
      }
      const crisisLogs = result.log.filter((l) => l.phase === "edge_crisis");
      if (crisisLogs.length > 0) {
        edge++;
        if (crisisLogs.some((l) => l.data?.forced === true)) forced++;
      }
    }
    console.log(`[probe5] injury=${injury} edge=${edge} forced=${forced}/4000`);
    console.log(`[probe5] seeds=${seeds.slice(0, 30).join(",")}`);
  });
});
