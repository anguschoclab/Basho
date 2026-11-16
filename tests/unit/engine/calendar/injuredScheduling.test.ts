import { describe, it, expect } from "vitest";
import { activeDivisionRoster } from "@/engine/calendar/scheduleHelpers";
import { MockFactory } from "@tests/helpers/utils/MockFactory";

/**
 * Playing hurt (W A): an injured rikishi who has NOT withdrawn is still
 * schedulable — only kyujo and retirement remove a rikishi from the card.
 * The withdraw-or-compete decision happens at the morning evaluation,
 * not silently at scheduling time.
 */
describe("activeDivisionRoster — injured rikishi remain schedulable", () => {
  it("includes injured-but-entered rikishi", () => {
    const healthy = MockFactory.createRikishi("r-ok", { division: "makuuchi" });
    const hurt = MockFactory.createRikishi("r-hurt", {
      division: "makuuchi",
      injured: true,
      injuryStatus: {
        type: "sprain",
        isInjured: true,
        severity: "moderate",
        location: "ankle",
        weeksRemaining: 2,
      },
    });
    const kyujo = MockFactory.createRikishi("r-kyujo", {
      division: "makuuchi",
      injured: true,
      isKyujo: true,
      kyujoReason: "injury",
    });
    const retired = MockFactory.createRikishi("r-ret", {
      division: "makuuchi",
      isRetired: true,
    });
    const world = MockFactory.createWorld({
      rikishi: new Map([
        [healthy.id, healthy],
        [hurt.id, hurt],
        [kyujo.id, kyujo],
        [retired.id, retired],
      ]),
    });

    const roster = activeDivisionRoster(world, "makuuchi");
    const ids = roster.map((r) => r.id);

    expect(ids).toContain("r-ok");
    expect(ids).toContain("r-hurt");
    expect(ids).not.toContain("r-kyujo");
    expect(ids).not.toContain("r-ret");
  });
});
