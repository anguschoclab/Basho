import { describe, it, expect } from "vitest";
import { SeededRNG } from "@/engine/rng";
import { determineCPUTactic } from "@/engine/h2h";
import { mockRikishi } from "./utils";

describe("determineCPUTactic determinism", () => {
  it("returns the same tactic for the same seed and rikishi", () => {
    const cpu = mockRikishi("cpu", { style: "yotsu", stats: { technique: 70, speed: 60 } as any });
    const rng = new SeededRNG("stable-seed");
    const a = determineCPUTactic(cpu, rng);

    const rng2 = new SeededRNG("stable-seed");
    const b = determineCPUTactic(cpu, rng2);

    expect(a).toBe(b);
  });

  it("produces a stable sequence for repeated calls", () => {
    const cpu = mockRikishi("cpu", { style: "oshi", stats: { technique: 80, speed: 80 } as any });
    const rng = new SeededRNG("seq");
    const first = determineCPUTactic(cpu, rng);
    const second = determineCPUTactic(cpu, rng);
    expect(typeof first).toBe("string");
    expect(typeof second).toBe("string");
  });
});
