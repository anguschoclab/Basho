/**
 * W H — sibling pairing is a hard matchmaking reject (JSA rule: brothers
 * never meet on the dohyo, like same-heya). The check must hold in
 * scorePairing and survive every fallback path (allowRepeatOverride).
 */
import { describe, it, expect } from "vitest";
import { scorePairing } from "@/engine/matchmaking/MatchmakingPhases";
import { MockFactory } from "@tests/helpers/utils/MockFactory";

function fixture(aOverrides = {}, bOverrides = {}) {
  const a = MockFactory.createRikishi("r-a", { heyaId: "heya-1", ...aOverrides });
  const b = MockFactory.createRikishi("r-b", { heyaId: "heya-2", ...bOverrides });
  const basho = MockFactory.createBasho({ id: "basho-1", day: 3 });
  return { a, b, basho };
}

describe("sibling matchmaking reject", () => {
  it("rejects when a lists b as sibling", () => {
    const { a, b, basho } = fixture({ siblingIds: ["r-b"] });
    expect(scorePairing({ basho, a, b })).toBeNull();
  });

  it("rejects when b lists a as sibling", () => {
    const { a, b, basho } = fixture({}, { siblingIds: ["r-a"] });
    expect(scorePairing({ basho, a, b })).toBeNull();
  });

  it("still rejects under allowRepeatOverride fallback", () => {
    const { a, b, basho } = fixture({ siblingIds: ["r-b"] });
    expect(scorePairing({ basho, a, b, allowRepeatOverride: true })).toBeNull();
  });

  it("still rejects when repeat-opponent rules are disabled", () => {
    const { a, b, basho } = fixture({ siblingIds: ["r-b"] });
    expect(
      scorePairing({ basho, a, b, rules: { avoidRepeatOpponents: false } })
    ).toBeNull();
  });

  it("allows non-sibling pairings", () => {
    const { a, b, basho } = fixture();
    expect(scorePairing({ basho, a, b })).not.toBeNull();
  });
});
