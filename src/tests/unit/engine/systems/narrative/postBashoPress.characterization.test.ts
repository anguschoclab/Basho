/**
 * Golden-master characterization for PostBashoPressService — a 529-LOC
 * const-object targeted by Phase-2 per-method extraction (~5 prior tests).
 * Pins the full PbpLine[] output of every public generator plus the
 * orchestrating generatePressConference across fixture matrices.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  PostBashoPressService,
  type PressConferenceContext,
} from "@/engine/systems/narrative/PostBashoPressService";
import { BardEngine } from "@/engine/bard/BardEngine";
import { rngFromSeed } from "@/engine/rng";
import { makeMockWorld, mockRikishi } from "../../utils";
import type { WorldState } from "@/engine/types/world";

const RNG = () => rngFromSeed("press-char-seed", "narrative", "post_basho_press");

function worldWith(...rs: Array<ReturnType<typeof mockRikishi>>): WorldState {
  return makeMockWorld({
    rikishi: new Map(rs.map((r) => [r.id, r])),
    activeRikishiIds: new Set(rs.map((r) => r.id)),
  });
}

const CHAMPION = () =>
  mockRikishi("r-champ", {
    shikona: "Championmaru",
    rank: "ozeki",
    division: "makuuchi",
    currentBashoWins: 14,
    birthYear: 2000,
  });

describe("PostBashoPressService — golden master", () => {
  beforeEach(() => BardEngine.resetCache());

  it("generateChampionLines", () => {
    expect(
      PostBashoPressService.generateChampionLines(CHAMPION(), RNG(), "hatsu", 2026)
    ).toMatchSnapshot();
  });

  it("generatePrizeWinnerLines (young + veteran age branches)", () => {
    const young = mockRikishi("r-prize-y", { shikona: "Youngmaru", birthYear: 2002 });
    const veteran = mockRikishi("r-prize-v", { shikona: "Olderman", birthYear: 1985 });
    expect({
      young: PostBashoPressService.generatePrizeWinnerLines(young, RNG(), "hatsu", 2026),
      veteran: PostBashoPressService.generatePrizeWinnerLines(veteran, RNG(), "hatsu", 2026),
    }).toMatchSnapshot();
  });

  it("generateYokozunaBidLines across win counts", () => {
    const ozeki = mockRikishi("r-ozeki", { shikona: "Ozesho", rank: "ozeki" });
    expect({
      w12: PostBashoPressService.generateYokozunaBidLines(ozeki, RNG(), "hatsu", 2026, 12),
      w13: PostBashoPressService.generateYokozunaBidLines(ozeki, RNG(), "hatsu", 2026, 13),
      w14: PostBashoPressService.generateYokozunaBidLines(ozeki, RNG(), "hatsu", 2026, 14),
    }).toMatchSnapshot();
  });

  it("generateOzekiStakeLines", () => {
    const r = mockRikishi("r-stake", { shikona: "Stakegawa", rank: "sekiwake" });
    expect(
      PostBashoPressService.generateOzekiStakeLines(r, RNG(), "hatsu", 2026)
    ).toMatchSnapshot();
  });

  it("generateLowerDivisionChampionLines across divisions", () => {
    const champ = mockRikishi("r-ld", { shikona: "Lowermaru", division: "juryo" });
    expect({
      juryo: PostBashoPressService.generateLowerDivisionChampionLines(champ, RNG(), "hatsu", 2026),
      makushita: PostBashoPressService.generateLowerDivisionChampionLines(
        champ,
        RNG(),
        "hatsu",
        2026,
        "makushita"
      ),
    }).toMatchSnapshot();
  });

  it("generatePressConference — full assembly over a fixture world", () => {
    const champ = CHAMPION();
    const junYusho = mockRikishi("r-jun", { shikona: "Runnerup", rank: "sekiwake" });
    const prize = mockRikishi("r-prize", { shikona: "Prizeman", birthYear: 1988 });
    const ozekiBid = mockRikishi("r-bid", {
      shikona: "Biddyama",
      rank: "ozeki",
      currentBashoWins: 13,
    });
    const world = worldWith(champ, junYusho, prize, ozekiBid);
    const ctx: PressConferenceContext = {
      yushoId: champ.id,
      junYushoIds: [junYusho.id],
      ginoSho: prize.id,
      bashoName: "hatsu",
      year: 2026,
    };
    expect(PostBashoPressService.generatePressConference(world, ctx)).toMatchSnapshot();
  });

  it("generatePressConference — empty/absent ids produce empty output", () => {
    const world = worldWith();
    const ctx: PressConferenceContext = {
      yushoId: "missing",
      junYushoIds: [],
      bashoName: "nagoya",
      year: 2027,
    };
    expect(PostBashoPressService.generatePressConference(world, ctx)).toMatchSnapshot();
  });
});
