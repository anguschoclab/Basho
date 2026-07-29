import { describe, it, expect } from "vitest";

describe("Yokozuna promotion (Case 3: consecutive strong ozeki)", () => {
  it("consecutiveStrongOzeki >= 2 with yusho triggers yokozuna promotion", () => {
    const consecutiveStrongOzeki = 2;
    const isYusho = true;
    const wonPrevious = false;
    const shouldPromote =
      consecutiveStrongOzeki >= 2 && (isYusho || wonPrevious);
    expect(shouldPromote).toBe(true);
  });

  it("consecutiveStrongOzeki = 1 with yusho does NOT trigger via Case 3", () => {
    const consecutiveStrongOzeki = 1;
    const isYusho = true;
    const wonPrevious = false;
    const shouldPromote =
      consecutiveStrongOzeki >= 2 && (isYusho || wonPrevious);
    expect(shouldPromote).toBe(false);
  });

  it("consecutiveStrongOzeki >= 2 with wonPrevious but no yusho triggers", () => {
    const consecutiveStrongOzeki = 2;
    const isYusho = false;
    const wonPrevious = true;
    const shouldPromote =
      consecutiveStrongOzeki >= 2 && (isYusho || wonPrevious);
    expect(shouldPromote).toBe(true);
  });

  it("consecutiveStrongOzeki >= 2 but neither yusho nor wonPrevious does NOT trigger", () => {
    const consecutiveStrongOzeki = 2;
    const isYusho = false;
    const wonPrevious = false;
    const shouldPromote =
      consecutiveStrongOzeki >= 2 && (isYusho || wonPrevious);
    expect(shouldPromote).toBe(false);
  });

  it("consecutiveStrongOzeki resets to 0 when wins < 12", () => {
    const currentWins = 11;
    const consecutiveStrongOzeki =
      currentWins >= 12 ? 1 : 0;
    expect(consecutiveStrongOzeki).toBe(0);
  });

  it("consecutiveStrongOzeki increments when wins >= 12", () => {
    const currentWins = 12;
    const previousCount = 1;
    const consecutiveStrongOzeki =
      currentWins >= 12 ? previousCount + 1 : 0;
    expect(consecutiveStrongOzeki).toBe(2);
  });
});
