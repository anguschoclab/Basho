import { describe, it, expect, vi } from "vitest";
import { getOzekiStatus, type OzekiKadobanState } from "../banzuke/ozekiLogic";
import * as banzukeHelpers from "../banzuke/banzukeHelpers";

vi.mock("../banzuke/banzukeHelpers", () => ({
  isMakeKoshi: vi.fn(),
}));

describe("getOzekiStatus", () => {
  it("returns non-kadoban state if not make-koshi", () => {
    vi.mocked(banzukeHelpers.isMakeKoshi).mockReturnValue(false);
    const result = getOzekiStatus(10, 5, 0, undefined);
    expect(result).toEqual({ isKadoban: false, consecutiveMakeKoshi: 0 });
  });

  it("becomes kadoban on first make-koshi", () => {
    vi.mocked(banzukeHelpers.isMakeKoshi).mockReturnValue(true);
    const result = getOzekiStatus(7, 8, 0, undefined);
    expect(result).toEqual({ isKadoban: true, consecutiveMakeKoshi: 1 });
  });

  it("demoted from ozeki on second consecutive make-koshi (kadoban state loses kadoban status for next basho rank demotion handling)", () => {
    vi.mocked(banzukeHelpers.isMakeKoshi).mockReturnValue(true);
    const result = getOzekiStatus(6, 9, 0, { isKadoban: true, consecutiveMakeKoshi: 1 });
    expect(result).toEqual({ isKadoban: false, consecutiveMakeKoshi: 2 });
  });

  it("resets kadoban state if kachi-koshi", () => {
    vi.mocked(banzukeHelpers.isMakeKoshi).mockReturnValue(false);
    const result = getOzekiStatus(8, 7, 0, { isKadoban: true, consecutiveMakeKoshi: 1 });
    expect(result).toEqual({ isKadoban: false, consecutiveMakeKoshi: 0 });
  });
});
