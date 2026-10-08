/**
 * Phase 2b: Media surface regression tests.
 *
 * Proves that PostBashoPressService is invoked from CompetitionService
 * and that MediaPage uses projectMediaUIDigest to surface media state.
 */

import { describe, it, expect } from "vitest";
import { join } from "path";
import { readSrcFile } from "@/tests/helpers/fsScan";

const ROOT = join(__dirname, "../../../..");

describe("PostBashoPressService — call site wiring", () => {
  it("is imported by CompetitionService", () => {
    const svc = readSrcFile("engine/lifecycle/CompetitionService.ts");
    expect(svc).toContain("PostBashoPressService");
  });

  it("generatePressConference is called by CompetitionService", () => {
    const svc = readSrcFile("engine/lifecycle/CompetitionService.ts");
    expect(svc).toMatch(/PostBashoPressService\.generatePressConference/);
  });

  it("exports generatePressConference", () => {
    const svc = readSrcFile("engine/systems/narrative/PostBashoPressService.ts");
    expect(svc).toContain("generatePressConference");
  });
});

describe("MediaPage — UI surface", () => {
  it("uses projectMediaUIDigest for state projection", () => {
    const page = readSrcFile("pages/MediaPage.tsx");
    expect(page).toContain("projectMediaUIDigest");
  });

  it("renders media headlines and beats", () => {
    const page = readSrcFile("pages/MediaPage.tsx");
    expect(page).toContain("MediaHeadline");
    expect(page).toContain("MediaBeat");
  });

  it("renders media heat label and tone color from PerceptionPresenter", () => {
    const page = readSrcFile("pages/MediaPage.tsx");
    expect(page).toContain("getMediaHeatLabel");
    expect(page).toContain("getMediaToneColor");
  });

  it("renders EventFeed for event log continuity", () => {
    const page = readSrcFile("pages/MediaPage.tsx");
    expect(page).toContain("EventFeed");
  });
});

describe("MediaService — governance headline generation", () => {
  it("generateGovernanceHeadline is imported by phase01_week_governance", () => {
    const phase = readSrcFile("engine/tick/phases/phase01_week_governance.ts");
    expect(phase).toContain("generateGovernanceHeadline");
  });
});
