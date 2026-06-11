import { describe, it, expect } from "vitest";
import { buildFullSlotTemplate } from "../banzuke/banzukeTemplate";

describe("buildFullSlotTemplate", () => {
  it("builds a standard template", () => {
    const sanyaku = { yokozuna: 1, ozeki: 2, sekiwake: 2, komusubi: 2, maegashira: 0 };
    const counts = {
      makuuchi: 42,
      juryo: 28,
      makushita: 120,
      sandanme: 200,
      jonidan: 200,
      jonokuchi: 50,
    };

    const slots = buildFullSlotTemplate(sanyaku, counts);

    expect(slots.length).toBe(640);
    expect(slots[0]).toEqual({
      division: "makuuchi",
      position: { rank: "yokozuna", side: "east" },
    });
    expect(slots[1]).toEqual({ division: "makuuchi", position: { rank: "ozeki", side: "east" } });
    expect(slots[2]).toEqual({ division: "makuuchi", position: { rank: "ozeki", side: "west" } });

    const makuuchi = slots.filter((s) => s.division === "makuuchi");
    expect(makuuchi.length).toBe(42);

    const juryo = slots.filter((s) => s.division === "juryo");
    expect(juryo.length).toBe(28);
    expect(juryo[0]).toEqual({
      division: "juryo",
      position: { rank: "juryo", side: "east", rankNumber: 1 },
    });

    const jonokuchi = slots.filter((s) => s.division === "jonokuchi");
    expect(jonokuchi.length).toBe(50);
  });

  it("handles odd numbers correctly", () => {
    const sanyaku = { yokozuna: 0, ozeki: 1, sekiwake: 1, komusubi: 1, maegashira: 0 };
    const counts = { makuuchi: 6, juryo: 3, makushita: 0, sandanme: 0, jonidan: 0, jonokuchi: 0 };

    const slots = buildFullSlotTemplate(sanyaku, counts);
    expect(slots.length).toBe(9);

    const makuuchi = slots.filter((s) => s.division === "makuuchi");
    expect(makuuchi).toEqual([
      { division: "makuuchi", position: { rank: "ozeki", side: "east" } },
      { division: "makuuchi", position: { rank: "sekiwake", side: "east" } },
      { division: "makuuchi", position: { rank: "komusubi", side: "east" } },
      { division: "makuuchi", position: { rank: "maegashira", side: "east", rankNumber: 1 } },
      { division: "makuuchi", position: { rank: "maegashira", side: "west", rankNumber: 1 } },
      { division: "makuuchi", position: { rank: "maegashira", side: "east", rankNumber: 2 } },
    ]);

    const juryo = slots.filter((s) => s.division === "juryo");
    expect(juryo).toEqual([
      { division: "juryo", position: { rank: "juryo", side: "east", rankNumber: 1 } },
      { division: "juryo", position: { rank: "juryo", side: "west", rankNumber: 1 } },
      { division: "juryo", position: { rank: "juryo", side: "east", rankNumber: 2 } },
    ]);
  });
});
