import { describe, it, expect } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import {
  tallyKimariteWins,
  deriveSignatureKimarite,
} from "@/engine/rikishi/signatureKimarite";

const hist = (k: string, win = true) => ({
  opponentId: "x",
  win,
  kimarite: k,
  bashoId: "b",
  day: 1,
  year: 1,
});

describe("signature kimarite (P6)", () => {
  it("tallies only wins", () => {
    const r = MockFactory.createRikishi("r1");
    r.history = [hist("yorikiri"), hist("yorikiri"), hist("oshidashi"), hist("hatakikomi", false)];
    expect(tallyKimariteWins(r)).toEqual({ yorikiri: 2, oshidashi: 1 });
  });

  it("derives the most frequent winner; empty history → null", () => {
    const r = MockFactory.createRikishi("r1");
    r.history = [hist("yorikiri"), hist("oshidashi"), hist("oshidashi"), hist("oshidashi")];
    const sig = deriveSignatureKimarite(r);
    expect(sig.kimariteId).toBe("oshidashi");
    expect(sig.wins).toBe(3);
    const empty = MockFactory.createRikishi("r2");
    empty.history = [];
    expect(deriveSignatureKimarite(empty).kimariteId).toBeNull();
  });

  it("ties break deterministically by id", () => {
    const r = MockFactory.createRikishi("r1");
    r.history = [hist("yorikiri"), hist("oshidashi")];
    expect(deriveSignatureKimarite(r).kimariteId).toBe("oshidashi");
  });
});
