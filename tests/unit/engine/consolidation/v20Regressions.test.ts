/**
 * v20 consolidation pins — every test encodes the CORRECT contract for a
 * bug-registry-v20 item and must fail (RED) against the pre-fix
 * implementation, then pass once the Phase E fix lands.
 *
 * Item ids reference docs/audit/bug-registry-v20.md.
 */
import { describe, it, expect } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { isYushoContention, isPlayoffScenario } from "@/engine/bout/boutContention";
import { applyNewRanks } from "@/engine/banzuke/publish/newRanks";
import { applyBoutResult } from "@/engine/bout/boutResultApplier";
import { onBashoEnded } from "@/engine/history/records";
import { planDivisionCallups } from "@/engine/calendar/schedule";
import { materializeCandidateToRikishiInternal } from "@/engine/generation/TalentPoolMaterialization";
import { fillVacanciesForNPCWithBidding } from "@/engine/generation/TalentPoolNPCRecruitment";
import { finalizeSignedCandidates } from "@/engine/generation/TalentPoolMaterialization";
import { createImpactBuilder, worldWithQueuedFields } from "@/engine/core/ImpactBuilder";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { EIGHTH_BOUT_DAY } from "@/constants/engine/matchmaking";
import type { WorldState } from "@/engine/types/world";

// ── V20-E1: leader-wins must scope to the bout's division ─────────────────
// The flat `basho.standings` map mixes every division, so a Juryo leader
// suppresses Makuuchi yusho-contention/playoff flags. The beatSiblingLead
// pattern (stakes.ts ~L358) already builds a per-division max — the
// contention helpers take `world` so they can map standings ids → division.
// The fix adds a `world` param so standings ids resolve to divisions. The
// pins encode that new signature; the cast keeps `bun run type-check` green
// against the pre-fix 3-arg declaration.
const contention = isYushoContention as unknown as (
  e: Parameters<typeof isYushoContention>[0],
  w: Parameters<typeof isYushoContention>[1],
  b: Parameters<typeof isYushoContention>[2],
  world: WorldState
) => boolean;
const playoff = isPlayoffScenario as unknown as typeof contention;

describe("V20-E1 — cross-division standings leak", () => {
  const mkWorld = () => {
    const world = MockFactory.createWorld();
    const jLeader = MockFactory.createRikishi("j-lead", { division: "juryo" });
    const mE = MockFactory.createRikishi("m-e1", { division: "makuuchi" });
    const mW = MockFactory.createRikishi("m-w1", { division: "makuuchi" });
    const mOther = MockFactory.createRikishi("m-o1", { division: "makuuchi" });
    for (const r of [jLeader, mE, mW, mOther]) world.rikishi.set(r.id, r);
    const standings = new Map<string, { wins: number; losses: number }>([
      ["j-lead", { wins: 14, losses: 0 }],
      ["m-e1", { wins: 11, losses: 3 }],
      ["m-w1", { wins: 11, losses: 3 }],
      ["m-o1", { wins: 9, losses: 5 }],
    ]);
    const basho = MockFactory.createBasho({ day: 15, standings });
    return { world, basho, mE, mW, jLeader };
  };

  it("isYushoContention measures the leader inside the bout's division", () => {
    const { world, basho, mE, mW } = mkWorld();
    // 12-win co-leaders facing off are in contention *within makuuchi* even
    // though a 14-win juryo rikishi sits in the same flat standings map.
    expect(contention(mE, mW, basho, world)).toBe(true);
  });

  it("isPlayoffScenario ignores a higher-scoring foreign division", () => {
    const { world, basho, mE, mW } = mkWorld();
    expect(playoff(mE, mW, basho, world)).toBe(true);
  });
});

// ── V20-E4: promotion shikona change must fire via applyNewRanks ───────────
// newRanks.ts calls checkShikonaChange with the PRE-update rikishi, whose
// rank still equals previousRank — the promotion predicates can never hold
// and the feature is dead in production. Drive the production path end to
// end; over enough seeds the probability roll must fire at least once.
describe("V20-E4 — applyNewRanks triggers promotion shikona changes", () => {
  const buildWorld = (seed: string) => {
    const world = MockFactory.createWorld({ seed });
    const heya = MockFactory.createHeya("heya_a");
    const oyakata = MockFactory.createOyakata(heya.oyakataId, {
      heyaId: heya.id,
      archetype: "traditionalist",
      formerShikona: "Takanohana",
    } as never);
    world.heyas.set(heya.id, heya);
    world.oyakata.set(oyakata.id, oyakata);
    const r = MockFactory.createRikishi("r-j2m", {
      heyaId: heya.id,
      division: "juryo",
      rank: "juryo",
      shikona: "Oldname",
    });
    world.rikishi.set(r.id, r);
    return world;
  };

  it("records a shikona_change milestone for at least one seed", () => {
    let fired = false;
    for (let i = 0; i < 300 && !fired; i++) {
      const world = buildWorld(`v20-e4-${i}`);
      const builder = createImpactBuilder("test");
      applyNewRanks(
        world,
        MockFactory.createBasho(),
        { newBanzuke: [
          { rikishiId: "r-j2m", division: "makuuchi",
            position: { rank: "maegashira", rankNumber: 10, side: "east" } },
        ] } as never,
        new Map(),
        builder
      );
      const upd = builder.build().entities?.rikishiUpdates?.get("r-j2m") as
        | { milestones?: { type: string }[]; shikona?: string }
        | undefined;
      if (upd?.milestones?.some((m) => m.type === "shikona_change")) fired = true;
    }
    expect(fired).toBe(true);
  });
});

// ── V20-E5: maezumo must not leak into standings / records ────────────────
// applyBoutResult increments career counters and writes standings for
// maezumo filler rikishi; onBashoEnded then boards them via
// activeRikishiIds with no isMaezumo guard.
describe("V20-E5 — maezumo exclusion", () => {
  it("maezumo bout results do not write standings or career counters", () => {
    const world = MockFactory.createWorld();
    const filler = MockFactory.createRikishi("mz-1", {
      division: "maezumo",
      isMaezumo: true,
      careerWins: 0,
    } as never);
    const opp = MockFactory.createRikishi("jk-1", { division: "jonokuchi", careerWins: 0 } as never);
    world.rikishi.set(filler.id, filler);
    world.rikishi.set(opp.id, opp);
    world.activeRikishiIds = new Set([filler.id, opp.id]);
    world.currentBasho = MockFactory.createBasho({ standings: new Map() });

    const impact = applyBoutResult(
      world,
      { boutId: "b1", day: 1, eastRikishiId: filler.id, westRikishiId: opp.id } as never,
      { winner: "east", winnerRikishiId: filler.id, kimarite: "yorikiri",
        log: [], pbp: [], narrative: [] } as never
    );

    const standings = (impact.metadata as Record<string, unknown> | undefined)?.[
      "updatedStandings"
    ] as Map<string, { wins: number; losses: number }> | undefined;
    expect(standings?.has(filler.id)).toBe(false);
    expect(standings?.get(opp.id)?.wins ?? 0).toBe(0);

    const resolved = resolveImpacts(world, [impact]);
    expect(resolved.rikishi.get(filler.id)?.careerWins ?? 0).toBe(0);
  });

  it("maezumo rikishi do not land on record boards", () => {
    const world = MockFactory.createWorld();
    const filler = MockFactory.createRikishi("mz-1", {
      isMaezumo: true,
      careerWins: 40,
      careerLosses: 5,
    } as never);
    world.rikishi.set(filler.id, filler);
    world.activeRikishiIds = new Set([filler.id]);

    const impact = onBashoEnded(world);
    const resolved = resolveImpacts(world, [impact]);
    const boards = JSON.stringify(resolved.records ?? {});
    expect(boards).not.toContain("mz-1");
  });
});

// ── V20-E7: eighthBoutForRikishiId only on the actual eighth-bout day ──────
// schedule.ts flags ANY non-maezumo callup with ≥1 completed bout as an
// eighth bout, so a day-3 fill is narrated as having seven bouts complete.
describe("V20-E7 — eighth-bout flag is day-gated", () => {
  it("does not set eighthBoutForRikishiId for a mid-basho callup", () => {
    const world = MockFactory.createWorld();
    const ids: string[] = [];
    // Odd makushita roster → bottom man needs a fixed callup bout; the donor
    // comes from a lower division in cascade order.
    for (const [id, division] of [
      ["mk-1", "makushita"], ["mk-2", "makushita"], ["mk-3", "makushita"],
      ["sd-donor", "sandanme"],
    ] as const) {
      const r = MockFactory.createRikishi(id, { division });
      world.rikishi.set(id, r);
      ids.push(id);
    }
    // Only these four rikishi exist — sd-donor is the sole possible callup.
    world.rikishi = new Map([...world.rikishi].filter(([id]) => ids.includes(id)));
    world.activeRikishiIds = new Set(ids);
    const basho = MockFactory.createBasho({
      day: 3,
      standings: new Map(ids.map((id) => [id, { wins: 0, losses: 0 }])),
      matches: [
        { boutId: "m1", day: 1, eastRikishiId: "sd-donor", westRikishiId: "x",
          result: { winner: "east", winnerRikishiId: "sd-donor", kimarite: "yorikiri" } },
      ] as never,
    });

    const plan = planDivisionCallups({ world, basho, day: 3, divisions: ["makushita"] });
    const fixed = [...(plan.fixedBouts.get("makushita") ?? [])];
    // Non-vacuous: the fixture must actually produce a callup fixed bout.
    expect(fixed.length).toBeGreaterThan(0);
    for (const m of fixed) {
      expect(m.eighthBoutForRikishiId).toBeUndefined();
    }
  });
});

// ── V20-E13: sibling mint must not orphan the sibling's roster slot ───────
// mintSibling writes heya.rikishiIds from the pre-impact snapshot, then the
// main recruit's own roster append (built on the same stale snapshot) writes
// the same field — but ImpactResolver's rikishiToAdd sync unions every added
// rikishi into its heya's roster, so the contract holds anyway. This pin
// GUARDS that resolver invariant in the worst case (sibling forced into the
// same heya — a 2-heya world).
describe("V20-E13 — roster sync keeps added rikishi (regression guard)", () => {
  it("sibling id survives the main recruit's roster append", () => {
    // 0.04 mint chance → brute-force world seeds until a sibling appears.
    let verified = false;
    for (let i = 0; i < 300 && !verified; i++) {
      const world = MockFactory.createWorld({ seed: `v20-e13-${i}` });
      const playerHeya = MockFactory.createHeya("heya_p");
      const npcHeya = MockFactory.createHeya("heya_n");
      // Replace the roster wholesale: with only player+NPC heyas the sibling
      // fallback (`?? heyaId`) is forced into the main recruit's own stable —
      // the only configuration where the stale-base clobber manifests.
      world.heyas = new Map([
        [playerHeya.id, playerHeya],
        [npcHeya.id, npcHeya],
      ]);
      world.playerHeyaId = playerHeya.id;

      const cand = MockFactory.createCandidate("c1", { availabilityState: "signed" } as never);
      const candidates = { c1: cand };
      const pools = MockFactory.createTalentPool().pools;

      const beforeIds = new Set(world.rikishi.keys());
      const { impact } = materializeCandidateToRikishiInternal(
        world,
        "c1",
        npcHeya.id,
        candidates,
        pools
      );
      const resolved = resolveImpacts(world, [impact]);
      const added = resolved.rikishi.size - beforeIds.size;
      if (added < 2) continue; // no sibling minted under this seed

      for (const [id, r] of resolved.rikishi) {
        if (beforeIds.has(id)) continue;
        const roster =
          resolved.heyas.get((r as { heyaId?: string }).heyaId ?? "")?.rikishiIds ?? [];
        expect(roster).toContain(id);
      }
      verified = true;
    }
    expect(verified).toBe(true);
  });
});

// ── V20-E14: finalize must not revert the NPC fill's talentPool write ─────
// phase01_week_recruitment merges fillVacanciesForNPCWithBidding then
// finalizeSignedCandidates; both write the whole `talentPool` worldField and
// the merge is last-wins, so finalize's base-derived snapshot resurrects
// candidates the NPC path already consumed — pool zombies.
describe("V20-E14 — NPC-consumed candidates stay consumed", () => {
  it("candidate minted by the NPC fill is absent after finalize merges", () => {
    const world = MockFactory.createWorld();
    const npcHeya = MockFactory.createHeya("heya_n");
    world.heyas.set(npcHeya.id, npcHeya);
    // Bidding requires the heya's oyakata to exist in world.oyakata.
    world.oyakata.set(
      npcHeya.oyakataId,
      MockFactory.createOyakata(npcHeya.oyakataId, { heyaId: npcHeya.id })
    );

    const pool = MockFactory.createTalentPool();
    const signed = MockFactory.createCandidate("c-signed", {
      availabilityState: "signed",
      personId: "p-signed",
      competingSuitors: [
        { heyaId: npcHeya.id, offerType: "standard", interestBand: "high", deadlineWeek: 1 },
      ],
    } as never);
    const open = MockFactory.createCandidate("c-open", {
      availabilityState: "available",
      personId: "p-open",
    } as never);
    const candidates = { "c-signed": signed, "c-open": open };
    // fillVacancies only scans the high_school/university/foreign pools.
    const pools = {
      ...pool.pools,
      high_school: {
        ...pool.pools.high_school,
        candidatesVisible: ["c-open"],
      },
    };
    world.talentPool = { ...pool, candidates, pools } as WorldState["talentPool"];

    // Non-vacuous: the NPC fill on its own must consume c-open (the bid
    // pipeline removes won candidates from the `candidates` record).
    const fillOnly = resolveImpacts(world, [
      fillVacanciesForNPCWithBidding(world, { [npcHeya.id]: 1 }, { systemBackfill: true }),
    ]);
    const afterFill = fillOnly.talentPool?.candidates as Record<
      string,
      { availabilityState?: string }
    >;
    expect(afterFill["c-open"]).toBeUndefined();

    // Mirror the phase's production composition: finalize runs against the
    // world with everything queued so far, so its whole-field talentPool
    // write cannot revert the fill's consumed candidates.
    const builder = createImpactBuilder("phase01_week_recruitment-repro");
    builder.merge(fillVacanciesForNPCWithBidding(world, { [npcHeya.id]: 1 }, { systemBackfill: true }));
    builder.merge(finalizeSignedCandidates(worldWithQueuedFields(world, builder)));
    const resolved = resolveImpacts(world, [builder.build()]);

    const post = resolved.talentPool?.candidates as Record<
      string,
      { availabilityState?: string }
    >;
    // The NPC fill's sign must survive finalize's whole-field write —
    // c-open must not come back as a signable `available` candidate.
    expect(post?.["c-open"]?.availabilityState ?? "removed").not.toBe("available");
  });
});

// ── #1202 payload pin: getHeyaRoster contract (characterization) ───────────
// The PR swaps manual activeRikishiIds scans for EntityCollection.getHeyaRoster
// in chainService + crisisRegistry. Pin the helper's contract: every non-
// retired member of the heya, nothing else — incl. empty and all-retired edges.
describe("PR#1202 — getHeyaRoster contract", () => {
  it("returns all and only non-retired heya members", async () => {
    const { EntityCollection } = await import("@/engine/core/EntityCollection");
    const world = MockFactory.createWorld();
    const heya = MockFactory.createHeya("h1", { rikishiIds: ["a1", "a2", "r1"] } as never);
    world.heyas.set(heya.id, heya);
    const active1 = MockFactory.createRikishi("a1", { heyaId: heya.id });
    const active2 = MockFactory.createRikishi("a2", { heyaId: heya.id });
    const retired = MockFactory.createRikishi("r1", { heyaId: heya.id, isRetired: true } as never);
    const other = MockFactory.createRikishi("o1", { heyaId: heya.id }); // heyaId match but NOT in roster ids
    for (const r of [active1, active2, retired, other]) world.rikishi.set(r.id, r);
    world.activeRikishiIds = new Set([active1.id, active2.id, other.id]);

    const ids = EntityCollection.getHeyaRoster(world, heya.id).map((r) => r.id).sort();
    expect(ids).toEqual(["a1", "a2"]);

    // Edges: unknown heya → empty; all-retired heya → empty.
    expect(EntityCollection.getHeyaRoster(world, "nope")).toEqual([]);
    const world2 = MockFactory.createWorld();
    const h2 = MockFactory.createHeya("h2");
    world2.heyas.set(h2.id, h2);
    const onlyRetired = MockFactory.createRikishi("rr", { heyaId: h2.id, isRetired: true } as never);
    world2.rikishi.set(onlyRetired.id, onlyRetired);
    expect(EntityCollection.getHeyaRoster(world2, h2.id)).toEqual([]);
  });
});

// ── #1203 payload pin: incident dedup is same-tick only (characterization) ─
// The PR collapses filter().map() into a single pass over same-tick
// observations. Pin the semantic it must preserve: a same-tick duplicate
// summary is skipped; an identical summary from an older tick does NOT
// suppress a new incident.
describe("PR#1203 — oyakata incident dedup semantics", () => {
  it("dedupes within the same tick only", async () => {
    const { consolidateOyakataMemoryPure } = await import(
      "@/engine/tick/phases/npc_ai/memory"
    );
    const world = MockFactory.createWorld({ week: 10 });
    const oyakata = MockFactory.createOyakata("oy1", { heyaId: "h1" });
    const mkEvent = (summary: string) => ({
      heyaId: "h1",
      week: 10,
      year: world.year,
      category: "discipline",
      summary,
      importance: "minor",
    });
    world.events = {
      log: [mkEvent("dup"), mkEvent("dup"), mkEvent("uniq")],
    } as never;
    const perception = { moraleBand: "content", runwayBand: "comfortable" } as never;

    const memory = consolidateOyakataMemoryPure(world, oyakata, perception);
    const incidents = memory.observations.filter(
      (o: { type: string; tick: number }) => o.type === "incident" && o.tick === 10
    );
    const summaries = incidents.map((o: { summary: string }) => o.summary).sort();
    expect(summaries).toEqual(["dup", "uniq"]);

    // An older-tick observation with the same summary must not suppress.
    const oyakata2 = MockFactory.createOyakata("oy2", { heyaId: "h1" });
    (oyakata2 as { memory?: { observations: unknown[] } }).memory = {
      observations: [{ type: "incident", summary: "dup", importance: 6, tick: 3 }],
    };
    const memory2 = consolidateOyakataMemoryPure(world, oyakata2, perception);
    const tick10 = memory2.observations.filter(
      (o: { type: string; tick: number }) => o.type === "incident" && o.tick === 10
    );
    expect(tick10.map((o: { summary: string }) => o.summary).sort()).toEqual([
      "dup",
      "uniq",
    ]);
  });
});

// ── #1205 payload pin: oversleeping variants + render integrity (RED) ──────
// The PR enriches events.oversleeping_incident_* and kyujo.oversleeping.
// Pin variant counts (titles ≥5, summaries ≥6, kyujo ≥7) and render integrity:
// every template resolves with the event context and emits no [MISSING:].
describe("PR#1205 — oversleeping narrative enrichment", () => {
  it("variant counts meet the enrichment targets", async () => {
    const events = (await import("@/engine/bard/domains/events.json")).default as Record<
      string,
      Record<string, string[]>
    >;
    const kyujo = (await import("@/engine/bard/domains/kyujo.json")).default as Record<
      string,
      string[]
    >;
    expect(events["narrative"]["oversleeping_incident_title"].length).toBeGreaterThanOrEqual(5);
    expect(events["narrative"]["oversleeping_incident_summary"].length).toBeGreaterThanOrEqual(6);
    expect(kyujo["oversleeping"].length).toBeGreaterThanOrEqual(7);
  });

  it("all oversleeping variants render without [MISSING:] tokens", async () => {
    const { BardEngine } = await import("@/engine/bard/BardEngine");
    const { SeededRNG } = await import("@/engine/core/rng");
    const ctx = { shikona: "Testoyama", day: 5 };
    for (const [path, n] of [
      ["events.oversleeping_incident_title", 5],
      ["events.oversleeping_incident_summary", 6],
      ["kyujo.oversleeping", 7],
    ] as const) {
      for (let i = 0; i < n * 3; i++) {
        const out = BardEngine.resolve(new SeededRNG(`v20-1205-${i}`), path, ctx);
        expect(out.text).not.toContain("[MISSING:");
        expect(out.text).not.toContain("%SHIKONA%");
        expect(out.text).not.toContain("%DAY%");
      }
    }
  });
});
