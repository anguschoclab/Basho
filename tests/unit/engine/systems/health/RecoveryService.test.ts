import { describe, it, expect } from "vitest";
import { tickRikishiRecovery } from "@/engine/health/RecoveryService";
import { mockRikishi } from "@tests/unit/engine/utils";

describe("RecoveryService", () => {
  describe("tickRikishiRecovery", () => {
    it("returns recovered=false and cleans up if rikishi is not injured", () => {
      const rikishi = mockRikishi("r1", { injured: false, injuryWeeksRemaining: 5 });
      const { recovered, rikishi: out } = tickRikishiRecovery(rikishi);

      expect(recovered).toBe(false);
      expect(out.injured).toBe(false);
      expect(out.injuryWeeksRemaining).toBe(0);
    });

    it("returns recovered=false and cleans up if injuryWeeksRemaining is 0", () => {
      const rikishi = mockRikishi("r1", { injured: true, injuryWeeksRemaining: 0 });
      const { recovered, rikishi: out } = tickRikishiRecovery(rikishi);

      expect(recovered).toBe(false);
      expect(out.injured).toBe(false);
      expect(out.injuryWeeksRemaining).toBe(0);
    });

    it("reduces injuryWeeksRemaining by 1 with default multiplier", () => {
      const rikishi = mockRikishi("r1", { injured: true, injuryWeeksRemaining: 3 });

      const { recovered, rikishi: out } = tickRikishiRecovery(rikishi);

      expect(recovered).toBe(false);
      expect(out.injured).toBe(true);
      expect(out.injuryWeeksRemaining).toBe(2);
    });

    it("reduces injuryWeeksRemaining by 2 with multiplier >= 1.2", () => {
      const rikishi = mockRikishi("r1", { injured: true, injuryWeeksRemaining: 3 });

      const { recovered, rikishi: out } = tickRikishiRecovery(rikishi, 1.2);

      expect(recovered).toBe(false);
      expect(out.injured).toBe(true);
      expect(out.injuryWeeksRemaining).toBe(1);
    });

    it("returns recovered=true and resets status when recovery completes", () => {
      const rikishi = mockRikishi("r1", { injured: true, injuryWeeksRemaining: 1 });
      // Add status object to test update
      rikishi.injuryStatus = { type: "inflammation", severity: "minor", weeksRemaining: 1 };

      const { recovered, rikishi: out } = tickRikishiRecovery(rikishi);

      expect(recovered).toBe(true);
      expect(out.injured).toBe(false);
      expect(out.injuryWeeksRemaining).toBe(0);
      expect(out.injuryStatus?.type).toBe("none");
      expect(out.injuryStatus?.severity).toBe("none");
      expect(out.injuryStatus?.weeksRemaining).toBe(0);
    });

    it("updates injuryStatus.weeksRemaining when not fully recovered", () => {
      const rikishi = mockRikishi("r1", { injured: true, injuryWeeksRemaining: 3 });
      rikishi.injuryStatus = { type: "inflammation", severity: "minor", weeksRemaining: 3 };

      const { recovered, rikishi: out } = tickRikishiRecovery(rikishi);

      expect(recovered).toBe(false);
      expect(out.injuryStatus?.weeksRemaining).toBe(2);
    });
  });
});
