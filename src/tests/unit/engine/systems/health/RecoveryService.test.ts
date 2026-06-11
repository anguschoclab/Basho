import { describe, it, expect } from "vitest";
import { tickRikishiRecovery } from "@/engine/systems/health/RecoveryService";
import { mockRikishi } from "../../utils";

describe("RecoveryService", () => {
  describe("tickRikishiRecovery", () => {
    it("returns false and cleans up if rikishi is not injured", () => {
      const rikishi = mockRikishi("r1", { injured: false, injuryWeeksRemaining: 5 });
      const result = tickRikishiRecovery(rikishi);

      expect(result).toBe(false);
      expect(rikishi.injured).toBe(false);
      expect(rikishi.injuryWeeksRemaining).toBe(0);
    });

    it("returns false and cleans up if injuryWeeksRemaining is 0", () => {
      const rikishi = mockRikishi("r1", { injured: true, injuryWeeksRemaining: 0 });
      const result = tickRikishiRecovery(rikishi);

      expect(result).toBe(false);
      expect(rikishi.injured).toBe(false);
      expect(rikishi.injuryWeeksRemaining).toBe(0);
    });

    it("reduces injuryWeeksRemaining by 1 with default multiplier", () => {
      const rikishi = mockRikishi("r1", { injured: true, injuryWeeksRemaining: 3 });

      const result = tickRikishiRecovery(rikishi);

      expect(result).toBe(false);
      expect(rikishi.injured).toBe(true);
      expect(rikishi.injuryWeeksRemaining).toBe(2);
    });

    it("reduces injuryWeeksRemaining by 2 with multiplier >= 1.2", () => {
      const rikishi = mockRikishi("r1", { injured: true, injuryWeeksRemaining: 3 });

      const result = tickRikishiRecovery(rikishi, 1.2);

      expect(result).toBe(false);
      expect(rikishi.injured).toBe(true);
      expect(rikishi.injuryWeeksRemaining).toBe(1);
    });

    it("returns true and resets status when recovery completes", () => {
      const rikishi = mockRikishi("r1", { injured: true, injuryWeeksRemaining: 1 });
      // Add status object to test update
      rikishi.injuryStatus = { type: "inflammation", severity: "minor", weeksRemaining: 1 };

      const result = tickRikishiRecovery(rikishi);

      expect(result).toBe(true);
      expect(rikishi.injured).toBe(false);
      expect(rikishi.injuryWeeksRemaining).toBe(0);
      expect(rikishi.injuryStatus?.type).toBe("none");
      expect(rikishi.injuryStatus?.severity).toBe("none");
      expect(rikishi.injuryStatus?.weeksRemaining).toBe(0);
    });

    it("updates injuryStatus.weeksRemaining when not fully recovered", () => {
      const rikishi = mockRikishi("r1", { injured: true, injuryWeeksRemaining: 3 });
      rikishi.injuryStatus = { type: "inflammation", severity: "minor", weeksRemaining: 3 };

      const result = tickRikishiRecovery(rikishi);

      expect(result).toBe(false);
      expect(rikishi.injuryStatus.weeksRemaining).toBe(2);
    });
  });
});
