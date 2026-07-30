/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from "vitest";
import { toCareerDataDTO } from "@/presenters/rikishi/transformers/lineage";
import { mockRikishi, makeMockWorld } from "../utils";

describe("Rikishi DTO Projection — weightJourney and oversleptBasho", () => {
  const world = makeMockWorld();

  it("projects weightJourney when present on rikishi", () => {
    const r = mockRikishi("r-wj", {
      weightJourney: {
        targetKg: 130,
        progressKg: 45,
        stalled: false,
        phases: ["bulking"],
      },
    } as any);

    const dto = toCareerDataDTO(r, world);
    expect(dto.weightJourney).toBeDefined();
    expect(dto.weightJourney!.targetKg).toBe(130);
    expect(dto.weightJourney!.progressKg).toBe(45);
    expect(dto.weightJourney!.stalled).toBe(false);
    expect(dto.weightJourney!.phases).toContain("bulking");
  });

  it("projects oversleptBasho when present on rikishi", () => {
    const r = mockRikishi("r-os", {
      oversleptBasho: {
        bashoName: "hatsu",
        day: 5,
        year: 2025,
      },
    } as any);

    const dto = toCareerDataDTO(r, world);
    expect(dto.oversleptBasho).toBeDefined();
    expect(dto.oversleptBasho!.bashoName).toBe("hatsu");
    expect(dto.oversleptBasho!.day).toBe(5);
    expect(dto.oversleptBasho!.year).toBe(2025);
  });

  it("returns undefined for weightJourney and null for oversleptBasho when absent", () => {
    const r = mockRikishi("r-empty");

    const dto = toCareerDataDTO(r, world);
    expect(dto.weightJourney).toBeUndefined();
    expect(dto.oversleptBasho).toBeNull();
  });

  it("projects stalled weight journey correctly", () => {
    const r = mockRikishi("r-stalled", {
      weightJourney: {
        targetKg: 130,
        progressKg: 10,
        stalled: true,
        phases: ["bulking"],
      },
    } as any);

    const dto = toCareerDataDTO(r, world);
    expect(dto.weightJourney).toBeDefined();
    expect(dto.weightJourney!.stalled).toBe(true);
  });
});
