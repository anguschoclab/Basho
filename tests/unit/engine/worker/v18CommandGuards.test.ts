/**
 * v18CommandGuards.test.ts
 * =========================
 * V18 failing-first regression pins: worker command handlers that mutate a
 * heya or rikishi must refuse commands targeting entities the player does not
 * own. Neighboring handlers already gate on
 * `cmd.heyaId !== rt.world.playerHeyaId` (buildInfrastructureCmd heya.ts:125,
 * repairInfrastructureCmd :134, addSparringPairCmd :160, removeSparringPairCmd
 * :169, setTrainingStateCmd :202, retireRikishiCmd :59-60, setHeyaDietCmd :98,
 * academy commands recruitment.ts:98-146).
 *
 * The handlers below have NO ownership gate, so every assertion that NPC-side
 * state stays unchanged currently FAILS (the mutation applies):
 *   heya.ts:        WITHDRAW_RIKISHI (:28), TREAT_INJURY (:48), BUY_PHYSIO (:89),
 *                   ASSIGN_MENTOR (:141), REMOVE_MENTOR (:150), SET_TSUKEBITO
 *                   (:176), REMOVE_TSUKEBITO (:189), SET_KESHO_CONFIG (:213 —
 *                   also a non-canonical `rt.world = {...}` spread bypassing
 *                   resolveImpacts)
 *   recruitment.ts: SEND_SCOUT (:152), OFFER_CONTRACT (:26), POACH_CANDIDATE (:78)
 *
 * Seam: the exported handler maps `heyaCommands(rt)` / `recruitmentCommands(rt)`
 * invoked against a minimal WorkerRuntime — the same dispatch table the
 * worker's onmessage switch drives (precedent: npcOwnershipGuard.test.ts).
 */
import { describe, it, expect, vi } from "vitest";
import { heyaCommands } from "@/engine/worker/commands/heya";
import { recruitmentCommands } from "@/engine/worker/commands/recruitment";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { WorkerRuntime } from "@/engine/worker/runtime";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";

const PLAYER = "h-player";
const NPC = "h-npc";
const HEYA_FUNDS = 5_000_000;

function makeRt(world: WorldState): WorkerRuntime {
  return {
    world,
    worldVersion: 0,
    digestRevision: 0,
    simPaused: false,
    post: vi.fn(),
    emitDigest: vi.fn(),
    syncWorld: vi.fn(),
    syncAndDigest: vi.fn(),
  };
}

function twoHeyaWorld(
  rikishi: Rikishi[] = [],
  overrides: Partial<WorldState> = {}
): WorldState {
  return MockFactory.createWorld({
    playerHeyaId: PLAYER,
    heyas: new Map([
      [PLAYER, MockFactory.createHeya(PLAYER, { funds: HEYA_FUNDS })],
      [NPC, MockFactory.createHeya(NPC, { funds: HEYA_FUNDS })],
    ]),
    rikishi: new Map(rikishi.map((r) => [r.id, r])),
    ...overrides,
  });
}

// ── heya.ts — rikishi health commands ───────────────────────────────────────

describe("V18 worker ownership guards — rikishi health commands", () => {
  it("WITHDRAW_RIKISHI on an NPC rikishi must not set kyujo", () => {
    const rt = makeRt(twoHeyaWorld([MockFactory.createRikishi("npc-r", { heyaId: NPC })]));
    heyaCommands(rt).WITHDRAW_RIKISHI!({ type: "WITHDRAW_RIKISHI", rikishiId: "npc-r" });
    expect(rt.world!.rikishi.get("npc-r")!.isKyujo).toBe(false);
  });

  it("WITHDRAW_RIKISHI on a player rikishi still applies (control)", () => {
    const rt = makeRt(twoHeyaWorld([MockFactory.createRikishi("p-r", { heyaId: PLAYER })]));
    heyaCommands(rt).WITHDRAW_RIKISHI!({ type: "WITHDRAW_RIKISHI", rikishiId: "p-r" });
    expect(rt.world!.rikishi.get("p-r")!.isKyujo).toBe(true);
  });

  it("TREAT_INJURY on an NPC rikishi must not debit the NPC heya or heal it", () => {
    const rt = makeRt(
      twoHeyaWorld([
        MockFactory.createRikishi("npc-r", {
          heyaId: NPC,
          injured: true,
          injuryWeeksRemaining: 4,
        }),
      ])
    );
    heyaCommands(rt).TREAT_INJURY!({ type: "TREAT_INJURY", rikishiId: "npc-r", weeks: 2 });
    expect(rt.world!.heyas.get(NPC)!.funds).toBe(HEYA_FUNDS);
    expect(rt.world!.rikishi.get("npc-r")!.injuryWeeksRemaining).toBe(4);
  });

  it("BUY_PHYSIO on an NPC rikishi must not debit the NPC heya or heal it", () => {
    const rt = makeRt(
      twoHeyaWorld([
        MockFactory.createRikishi("npc-r", {
          heyaId: NPC,
          injured: true,
          injuryWeeksRemaining: 4,
        }),
      ])
    );
    heyaCommands(rt).BUY_PHYSIO!({ type: "BUY_PHYSIO", rikishiId: "npc-r" });
    expect(rt.world!.heyas.get(NPC)!.funds).toBe(HEYA_FUNDS);
    expect(rt.world!.rikishi.get("npc-r")!.injuryWeeksRemaining).toBe(4);
  });
});

// ── heya.ts — mentorship / tsukebito commands ───────────────────────────────

describe("V18 worker ownership guards — mentorship commands", () => {
  it("ASSIGN_MENTOR across an NPC pair must not link mentor/mentee", () => {
    const rt = makeRt(
      twoHeyaWorld([
        MockFactory.createRikishi("npc-mentor", {
          heyaId: NPC,
          rank: "maegashira",
          rankNumber: 1,
        }),
        MockFactory.createRikishi("npc-apprentice", {
          heyaId: NPC,
          rank: "makushita",
          rankNumber: 12,
        }),
      ])
    );
    heyaCommands(rt).ASSIGN_MENTOR!({
      type: "ASSIGN_MENTOR",
      mentorId: "npc-mentor",
      apprenticeId: "npc-apprentice",
    });
    expect(rt.world!.rikishi.get("npc-apprentice")!.mentorId).toBeUndefined();
    expect(rt.world!.rikishi.get("npc-mentor")!.menteeIds ?? []).toHaveLength(0);
    expect(rt.world!.lineage ?? []).toHaveLength(0);
  });

  it("REMOVE_MENTOR on an NPC apprentice must keep the mentor link", () => {
    const rt = makeRt(
      twoHeyaWorld([
        MockFactory.createRikishi("npc-mentor", {
          heyaId: NPC,
          rank: "maegashira",
          rankNumber: 1,
          menteeIds: ["npc-apprentice"],
        }),
        MockFactory.createRikishi("npc-apprentice", {
          heyaId: NPC,
          rank: "makushita",
          rankNumber: 12,
          mentorId: "npc-mentor",
        }),
      ])
    );
    heyaCommands(rt).REMOVE_MENTOR!({
      type: "REMOVE_MENTOR",
      apprenticeId: "npc-apprentice",
    });
    expect(rt.world!.rikishi.get("npc-apprentice")!.mentorId).toBe("npc-mentor");
    expect(rt.world!.rikishi.get("npc-mentor")!.menteeIds).toContain("npc-apprentice");
  });
});

describe("V18 worker ownership guards — tsukebito commands", () => {
  it("SET_TSUKEBITO on an NPC senior must not assign the attendant", () => {
    const rt = makeRt(
      twoHeyaWorld([
        MockFactory.createRikishi("npc-senior", {
          heyaId: NPC,
          rank: "sekiwake",
          rankNumber: 1,
        }),
        MockFactory.createRikishi("npc-junior", {
          heyaId: NPC,
          rank: "jonokuchi",
          rankNumber: 15,
        }),
      ])
    );
    heyaCommands(rt).SET_TSUKEBITO!({
      type: "SET_TSUKEBITO",
      seniorId: "npc-senior",
      tsukebitoIds: ["npc-junior"],
    });
    expect(rt.world!.rikishi.get("npc-senior")!.tsukebitoIds ?? []).not.toContain(
      "npc-junior"
    );
  });

  it("REMOVE_TSUKEBITO on an NPC senior must keep the attendant", () => {
    const rt = makeRt(
      twoHeyaWorld([
        MockFactory.createRikishi("npc-senior", {
          heyaId: NPC,
          rank: "sekiwake",
          rankNumber: 1,
          tsukebitoIds: ["npc-junior"],
          tsukebitoPlayerSet: true,
        }),
        MockFactory.createRikishi("npc-junior", {
          heyaId: NPC,
          rank: "jonokuchi",
          rankNumber: 15,
        }),
      ])
    );
    heyaCommands(rt).REMOVE_TSUKEBITO!({
      type: "REMOVE_TSUKEBITO",
      seniorId: "npc-senior",
      juniorId: "npc-junior",
    });
    expect(rt.world!.rikishi.get("npc-senior")!.tsukebitoIds).toContain("npc-junior");
  });

  it("SET_TSUKEBITO on a player senior still applies (control)", () => {
    const rt = makeRt(
      twoHeyaWorld([
        MockFactory.createRikishi("p-senior", {
          heyaId: PLAYER,
          rank: "sekiwake",
          rankNumber: 1,
        }),
        MockFactory.createRikishi("p-junior", {
          heyaId: PLAYER,
          rank: "jonokuchi",
          rankNumber: 15,
        }),
      ])
    );
    heyaCommands(rt).SET_TSUKEBITO!({
      type: "SET_TSUKEBITO",
      seniorId: "p-senior",
      tsukebitoIds: ["p-junior"],
    });
    expect(rt.world!.rikishi.get("p-senior")!.tsukebitoIds).toContain("p-junior");
  });
});

// ── heya.ts — kesho config ──────────────────────────────────────────────────

describe("V18 worker ownership guards — kesho config", () => {
  it("SET_KESHO_CONFIG on an NPC rikishi must not write a config", () => {
    const rt = makeRt(twoHeyaWorld([MockFactory.createRikishi("npc-r", { heyaId: NPC })]));
    heyaCommands(rt).SET_KESHO_CONFIG!({
      type: "SET_KESHO_CONFIG",
      rikishiId: "npc-r",
      config: { primaryColor: "#123456" },
    });
    expect(rt.world!.customKeshoConfigs?.["npc-r"]).toBeUndefined();
  });
});

// ── recruitment.ts — scouting / signing commands ────────────────────────────

describe("V18 worker ownership guards — recruitment commands", () => {
  it("SEND_SCOUT for an NPC heya must not debit funds or start a mission", () => {
    const rt = makeRt(
      twoHeyaWorld([], {
        staff: new Map([
          [
            "npc-scout",
            MockFactory.createStaff("npc-scout", { heyaId: NPC, role: "scout" }),
          ],
        ]),
      })
    );
    recruitmentCommands(rt).SEND_SCOUT!({
      type: "SEND_SCOUT",
      heyaId: NPC,
      scoutStaffId: "npc-scout",
      tier: "local",
    });
    expect(rt.world!.heyas.get(NPC)!.funds).toBe(HEYA_FUNDS);
    expect(rt.world!.activeScoutMissions ?? []).toHaveLength(0);
  });

  it("OFFER_CONTRACT for an NPC heya must not register the suitor", () => {
    const rt = makeRt(
      twoHeyaWorld([], {
        talentPool: MockFactory.createTalentPool({
          candidates: { c1: MockFactory.createCandidate("c1") },
        }),
      })
    );
    recruitmentCommands(rt).OFFER_CONTRACT!({
      type: "OFFER_CONTRACT",
      candidateId: "c1",
      heyaId: NPC,
      offerType: "standard",
      interest: "high",
    });
    const candidate = rt.world!.talentPool!.candidates["c1"];
    expect(candidate.competingSuitors).toHaveLength(0);
    expect(candidate.availabilityState).toBe("available");
  });

  it("POACH_CANDIDATE for an NPC heya must not register the suitor", () => {
    const rt = makeRt(
      twoHeyaWorld([], {
        candidatePool: MockFactory.createTalentPool({
          candidates: { c1: MockFactory.createCandidate("c1") },
        }),
      })
    );
    recruitmentCommands(rt).POACH_CANDIDATE!({
      type: "POACH_CANDIDATE",
      candidateId: "c1",
      heyaId: NPC,
    });
    const candidate = rt.world!.candidatePool!.candidates["c1"];
    expect(candidate.competingSuitors).toHaveLength(0);
    expect(candidate.availabilityState).toBe("available");
  });

  it("OFFER_CONTRACT for the player heya still applies (control)", () => {
    const rt = makeRt(
      twoHeyaWorld([], {
        talentPool: MockFactory.createTalentPool({
          candidates: { c1: MockFactory.createCandidate("c1") },
        }),
      })
    );
    recruitmentCommands(rt).OFFER_CONTRACT!({
      type: "OFFER_CONTRACT",
      candidateId: "c1",
      heyaId: PLAYER,
      offerType: "standard",
      interest: "high",
    });
    expect(rt.world!.talentPool!.candidates["c1"].competingSuitors).toHaveLength(1);
  });
});
