import { describe, it, expect, beforeAll } from "vitest";
import { BardEngine } from "@/engine/bard/BardEngine";
import { SeededRNG } from "@/engine/core/rng";

/**
 * Replay-highlight paths resolved by beatReplayHighlight (postbout2.ts).
 * Each path must expose enough distinct templates that the seeded pick
 * produces visibly different commentary — a path stuck at 1-2 variants
 * makes the replay beat repetitive.
 */
const REPLAY_PATHS = [
  "post_bout.replay.tachiai_decisive",
  "post_bout.replay.grip_battle",
  "post_bout.replay.edge_drama",
  "post_bout.replay.counter",
  "post_bout.replay.reversal",
  "post_bout.replay.stamina_issue",
  "post_bout.replay.generic",
] as const;

const CONTEXT = {
  WINNER: "YokozunaHero",
  LOSER: "Challenger",
  KIMARITE: "yorikiri",
  winnerId: "r-winner",
  loserId: "r-loser",
};

describe("post_bout replay template variety", () => {
  beforeAll(async () => {
    await BardEngine.loadDomains();
  });

  for (const path of REPLAY_PATHS) {
    it(`${path} resolves at least 4 distinct variants across seeds`, () => {
      const seen = new Set<string>();
      for (let i = 0; i < 40; i++) {
        const rng = new SeededRNG(`replay-variety-${path}-${i}`);
        const result = BardEngine.resolve(rng, path, CONTEXT);
        expect(result.text.length).toBeGreaterThan(0);
        seen.add(result.text);
      }
      expect(
        seen.size,
        `${path} produced only ${seen.size} distinct templates`
      ).toBeGreaterThanOrEqual(4);
    });
  }
});
