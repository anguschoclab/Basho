import { describe, it, expect } from "vitest";
import {
  determinePostRetirementPath,
  getRetirementNarrative,
  type PostRetirementPath,
} from "@/engine/lifecycle/PostRetirementPath";
import { mockRikishi } from "../utils";
import type { SeededRNG } from "@/engine/rng";

function mockRng(seed: string): SeededRNG {
  let state = 0;
  for (const c of seed) state = (state * 31 + c.charCodeAt(0)) & 0x7fffffff;
  return {
    seed,
    next: () => {
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      return state / 0x7fffffff;
    },
    gaussian: (m: number, s: number) => m + s * (Math.random() * 2 - 1),
    int: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,
    range: (min: number, max: number) => Math.random() * (max - min) + min,
    pick: <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)],
    shuffle: <T>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5),
    fork: (label: string) => mockRng(`${seed}:${label}`),
  } as any;
}

describe("Post-Retirement Path System (B8)", () => {
  it("determinePostRetirementPath returns oyakata for high-achievement sekitori", () => {
    const r = mockRikishi("ret-1", {
      division: "makuuchi",
      rank: "yokozuna",
      careerRecord: { wins: 600, losses: 200, yusho: 8 },
      isRetired: false,
    } as any);
    const rng = mockRng("test-retire-1");

    const path = determinePostRetirementPath(r, rng);
    expect(path).toBe("oyakata");
  });

  it("determinePostRetirementPath returns oyakata for ozeki with yusho", () => {
    const r = mockRikishi("ret-2", {
      division: "makuuchi",
      rank: "ozeki",
      careerRecord: { wins: 400, losses: 150, yusho: 3 },
      isRetired: false,
    } as any);
    const rng = mockRng("test-retire-2");

    const path = determinePostRetirementPath(r, rng);
    expect(path).toBe("oyakata");
  });

  it("determinePostRetirementPath returns media_pundit for charismatic non-champions", () => {
    const r = mockRikishi("ret-3", {
      division: "makuuchi",
      rank: "maegashira-1",
      careerRecord: { wins: 300, losses: 200, yusho: 0 },
      isRetired: false,
    } as any);
    const rng = mockRng("test-retire-pundit");

    // Run multiple times since there's RNG involved
    const paths = new Set<PostRetirementPath>();
    for (let i = 0; i < 50; i++) {
      paths.add(determinePostRetirementPath(r, mockRng(`test-retire-pundit-${i}`)));
    }
    expect(paths.has("media_pundit")).toBe(true);
  });

  it("determinePostRetirementPath returns sumo_school_coach for lower division rikishi", () => {
    const r = mockRikishi("ret-4", {
      division: "makushita",
      rank: "makushita-10",
      careerRecord: { wins: 100, losses: 80, yusho: 0 },
      isRetired: false,
    } as any);

    const paths = new Set<PostRetirementPath>();
    for (let i = 0; i < 50; i++) {
      paths.add(determinePostRetirementPath(r, mockRng(`test-retire-coach-${i}`)));
    }
    expect(paths.has("sumo_school_coach")).toBe(true);
  });

  it("determinePostRetirementPath can return leave_sumo_world for short careers", () => {
    const r = mockRikishi("ret-5", {
      division: "sandanme",
      rank: "sandanme-50",
      careerRecord: { wins: 20, losses: 30, yusho: 0 },
      isRetired: false,
    } as any);

    const paths = new Set<PostRetirementPath>();
    for (let i = 0; i < 100; i++) {
      paths.add(determinePostRetirementPath(r, mockRng(`test-retire-leave-${i}`)));
    }
    expect(paths.has("leave_sumo_world")).toBe(true);
  });

  it("getRetirementNarrative returns a non-empty string for each path", () => {
    const r = mockRikishi("ret-6", {
      shikona: "TestRikishi",
      careerRecord: { wins: 100, losses: 50, yusho: 1 },
    } as any);

    const paths: PostRetirementPath[] = [
      "oyakata",
      "media_pundit",
      "sumo_school_coach",
      "leave_sumo_world",
    ];
    for (const path of paths) {
      const narrative = getRetirementNarrative(r, path);
      expect(narrative).toBeTruthy();
      expect(narrative.length).toBeGreaterThan(10);
    }
  });

  it("getRetirementNarrative includes shikona in the text", () => {
    const r = mockRikishi("ret-7", {
      shikona: "TestRikishi",
      careerRecord: { wins: 100, losses: 50, yusho: 1 },
    } as any);

    const narrative = getRetirementNarrative(r, "oyakata");
    expect(narrative).toContain("TestRikishi");
  });

  it("getRetirementNarrative includes favorite highlight when available", () => {
    const r = mockRikishi("ret-8", {
      shikona: "TestRikishi",
      careerRecord: { wins: 100, losses: 50, yusho: 1 },
      careerHighlights: [
        { type: "yusho", basho: "2025-haru", description: "Tournament championship" },
      ],
    } as any);

    const narrative = getRetirementNarrative(r, "oyakata");
    expect(narrative).toContain("Tournament championship");
  });
});
