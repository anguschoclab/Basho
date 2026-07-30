/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from "vitest";
import {
  assignRecruitmentCohort,
  getCohortMembers,
  getCohortSummary,
} from "@/engine/systems/generation/CohortTracking";
import { mockRikishi } from "../utils";

describe("Cohort Tracking System (B10)", () => {
  it("assignRecruitmentCohort sets recruitmentCohortId on rikishi", () => {
    const r = mockRikishi("coh-1", {} as any);
    const result = assignRecruitmentCohort(r, "2025-hatsu");
    expect(result.recruitmentCohortId).toBe("2025-hatsu");
  });

  it("assignRecruitmentCohort does not override existing cohort", () => {
    const r = mockRikishi("coh-2", {
      recruitmentCohortId: "2024-haru",
    } as any);
    const result = assignRecruitmentCohort(r, "2025-hatsu");
    expect(result.recruitmentCohortId).toBe("2024-haru");
  });

  it("getCohortMembers returns all rikishi with same cohort id", () => {
    const r1 = mockRikishi("coh-3", { recruitmentCohortId: "2025-hatsu" } as any);
    const r2 = mockRikishi("coh-4", { recruitmentCohortId: "2025-hatsu" } as any);
    const r3 = mockRikishi("coh-5", { recruitmentCohortId: "2024-haru" } as any);

    const members = getCohortMembers([r1, r2, r3], "2025-hatsu");
    expect(members).toHaveLength(2);
    expect(members.map((m) => m.id)).toContain("coh-3");
    expect(members.map((m) => m.id)).toContain("coh-4");
  });

  it("getCohortMembers returns empty array when no matches", () => {
    const r1 = mockRikishi("coh-6", { recruitmentCohortId: "2024-haru" } as any);
    const members = getCohortMembers([r1], "2025-hatsu");
    expect(members).toHaveLength(0);
  });

  it("getCohortSummary returns correct summary for a cohort", () => {
    const r1 = mockRikishi("coh-7", {
      recruitmentCohortId: "2025-hatsu",
      division: "makushita",
      isRetired: false,
      careerRecord: { wins: 10, losses: 5, yusho: 0 },
    } as any);
    const r2 = mockRikishi("coh-8", {
      recruitmentCohortId: "2025-hatsu",
      division: "juryo",
      isRetired: false,
      careerRecord: { wins: 8, losses: 7, yusho: 1 },
    } as any);
    const r3 = mockRikishi("coh-9", {
      recruitmentCohortId: "2025-hatsu",
      division: "makuuchi",
      isRetired: true,
      careerRecord: { wins: 30, losses: 20, yusho: 2 },
    } as any);

    const summary = getCohortSummary([r1, r2, r3], "2025-hatsu");
    expect(summary).toBeDefined();
    expect(summary!.cohortId).toBe("2025-hatsu");
    expect(summary!.totalMembers).toBe(3);
    expect(summary!.activeMembers).toBe(2);
    expect(summary!.retiredMembers).toBe(1);
    expect(summary!.sekitoriCount).toBe(2); // juryo + makuuchi
    expect(summary!.totalYusho).toBe(3);
  });

  it("getCohortSummary returns undefined when cohort not found", () => {
    const r1 = mockRikishi("coh-10", { recruitmentCohortId: "2024-haru" } as any);
    const summary = getCohortSummary([r1], "2025-hatsu");
    expect(summary).toBeUndefined();
  });

  it("getCohortSummary counts sekitori correctly", () => {
    const r1 = mockRikishi("coh-11", {
      recruitmentCohortId: "2025-hatsu",
      division: "makushita",
      isRetired: false,
    } as any);
    const r2 = mockRikishi("coh-12", {
      recruitmentCohortId: "2025-hatsu",
      division: "sandanme",
      isRetired: false,
    } as any);

    const summary = getCohortSummary([r1, r2], "2025-hatsu");
    expect(summary!.sekitoriCount).toBe(0);
  });
});
