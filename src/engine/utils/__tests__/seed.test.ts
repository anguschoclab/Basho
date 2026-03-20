
import { describe, it, expect, vi } from "vitest";
import { makeDeterministicSeed } from "../seed";

describe("makeDeterministicSeed", () => {
  it("generates a 6-character hex-like hash in base 36", () => {
    const mockValues = new Uint32Array([123456789]);
    const spy = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((arr) => {
        (arr as Uint32Array)[0] = mockValues[0];
        return arr;
    });

    const seed = makeDeterministicSeed("test");
    expect(seed).toBe("test-21i3v9");
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });

  it("pads short values with leading zeros", () => {
    const mockValues = new Uint32Array([1]);
    const spy = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((arr) => {
        (arr as Uint32Array)[0] = mockValues[0];
        return arr;
    });

    const seed = makeDeterministicSeed("test");
    expect(seed).toBe("test-000001");
    spy.mockRestore();
  });

  it("handles large values by taking the last 6 characters", () => {
    // 0xFFFFFFFF is 4294967295, which is '1z141z3' in base 36.
    // .slice(-6) should give 'z141z3'
    const mockValues = new Uint32Array([0xFFFFFFFF]);
    const spy = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((arr) => {
        (arr as Uint32Array)[0] = mockValues[0];
        return arr;
    });

    const seed = makeDeterministicSeed("test");
    expect(seed).toBe("test-z141z3");
    spy.mockRestore();
  });
});
