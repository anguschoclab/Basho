/**
 * src/engine/core/idIntegrity.ts
 * =================================
 * World ID-integrity system.
 *
 * Three layers:
 *  1. Write-path helpers — `dedupeIdList` (same-reference fast path) and
 *     `pushUniqueId` keep ID-list fields unique at the point of mutation.
 *  2. `validateWorldIdIntegrity(world)` — a pure, declarative audit of every
 *     entity map, ID-list field, cross-collection membership, record-keyed
 *     map, and pooled `.id` array in WorldState. Returns violations; never
 *     mutates, never throws.
 *  3. `assertWorldIdIntegrity(world)` — throwing variant for tests, and
 *     `reportWorldIdIntegrity(world, context)` — warn-per-violation for
 *     generation/load boundaries.
 *
 * Resolution semantics: a reference "dangles" only when it resolves to
 * NOTHING. Historical counterparts count as resolvable — `historicalRikishi`
 * for rikishi refs, `closedHeyas` for heya refs — because retired/closed
 * entities legitimately remain reference targets. Structural problems that
 * are not dangling (retired rikishi on an active roster, an ID in two
 * collections) are reported as `cross_collection` instead.
 */
import type { WorldState } from "@/engine/types/world";
import { warn } from "@/engine/utils/Logger";

export type ViolationKind = "duplicate_id" | "dangling_ref" | "key_mismatch" | "cross_collection";

export interface IdIntegrityViolation {
  kind: ViolationKind;
  /** Where the violation lives, e.g. "heya.rikishiIds" or "events.log". */
  collection: string;
  /** The offending ID (or record key). */
  id: string;
  /** Human-readable explanation. */
  detail: string;
}

// ── Write-path helpers ──────────────────────────────────────────────────────

/**
 * Return `ids` with duplicates removed, preserving first-occurrence order.
 * Returns the SAME array reference when no duplicates exist — safe to call
 * unconditionally in hot paths without allocation churn.
 */
export function dedupeIdList(ids?: string[]): string[] | undefined {
  if (!ids) return ids;
  const seen = new Set<string>();
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (!seen.has(id)) {
      seen.add(id);
      continue;
    }
    const out = ids.slice(0, i);
    for (let j = i + 1; j < ids.length; j++) {
      const next = ids[j];
      if (seen.has(next)) continue;
      seen.add(next);
      out.push(next);
    }
    return out;
  }
  return ids;
}

/**
 * Return `list` with `id` appended, or the same reference when present.
 */
export function pushUniqueId(list: string[], id: string): string[] {
  return list.includes(id) ? list : [...list, id];
}

/**
 * All IDs that appear more than once in `ids` (each reported once).
 */
export function findDuplicateIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) dups.add(id);
    else seen.add(id);
  }
  return [...dups];
}

// ── Audit internals ─────────────────────────────────────────────────────────

/** Resolvable-ID sets shared by every audit section. */
interface IdSets {
  rikishiIds: Set<string>;
  heyaIds: Set<string>;
  oyakataIds: Set<string>;
  staffIds: Set<string>;
  brandIds: Set<string>;
  koenkaiIds: Set<string>;
  myosekiIds: Set<string>;
  personIds: Set<string>;
  cupIds: Set<string>;
}

interface AuditCtx {
  world: WorldState;
  sets: IdSets;
  add: (kind: ViolationKind, collection: string, id: string, detail: string) => void;
  checkRef: (
    collection: string,
    id: string | undefined | null,
    into: ReadonlySet<string>,
    detail: string
  ) => void;
  checkIdList: (
    collection: string,
    ids: readonly string[] | undefined,
    into: ReadonlySet<string>,
    detail: string
  ) => void;
  checkMapKeys: (collection: string, map: Map<string, unknown> | undefined, keyField?: string) => void;
  checkRecordKeys: (
    collection: string,
    record: Record<string, unknown> | undefined,
    into: ReadonlySet<string>
  ) => void;
  checkRecordKeyField: (
    collection: string,
    record: Record<string, unknown> | undefined,
    keyField: string
  ) => void;
  checkIdFieldInArray: (collection: string, items: readonly unknown[] | undefined) => void;
}

function makeAuditCtx(world: WorldState, violations: IdIntegrityViolation[]): AuditCtx {
  const add: AuditCtx["add"] = (kind, collection, id, detail) => {
    violations.push({ kind, collection, id, detail });
  };
  const rikishiIds = new Set<string>([...world.rikishi.keys(), ...world.historicalRikishi.keys()]);
  const heyaIds = new Set<string>([...world.heyas.keys(), ...(world.closedHeyas?.keys() ?? [])]);
  const sets: IdSets = {
    rikishiIds,
    heyaIds,
    oyakataIds: new Set<string>(world.oyakata.keys()),
    staffIds: new Set<string>((world.staff ?? new Map()).keys()),
    brandIds: new Set<string>((world.heyaBrandIdentities ?? new Map()).keys()),
    koenkaiIds: new Set<string>((world.sponsorPool?.koenkais ?? new Map()).keys()),
    myosekiIds: new Set<string>(Object.keys(world.myosekiMarket?.stocks ?? {})),
    // Myoseki owners/holders may be oyakata, (possibly retired) rikishi,
    // heyas (stable-held elder stock), or "JSA".
    personIds: new Set<string>([...rikishiIds, ...world.oyakata.keys(), ...heyaIds, "JSA"]),
    // Global Cup "boss" challengers live as talent-pool candidates
    // (injectRikishiAsCandidate) rather than world.rikishi entries.
    cupIds: new Set<string>([
      ...rikishiIds,
      ...Object.keys(world.talentPool?.candidates ?? {}),
      ...Object.keys(world.candidatePool?.candidates ?? {}),
    ]),
  };

  const checkRef: AuditCtx["checkRef"] = (collection, id, into, detail) => {
    if (id === undefined || id === null) return;
    if (!into.has(id)) add("dangling_ref", collection, id, detail);
  };
  const checkIdList: AuditCtx["checkIdList"] = (collection, ids, into, detail) => {
    if (!ids) return;
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) add("duplicate_id", collection, id, detail);
      seen.add(id);
      checkRef(collection, id, into, detail);
    }
  };
  const checkMapKeys: AuditCtx["checkMapKeys"] = (collection, map, keyField = "id") => {
    if (!map) return;
    for (const [key, entry] of map) {
      const v = (entry as Record<string, unknown> | undefined)?.[keyField];
      if (typeof v === "string" && v !== key) {
        add("key_mismatch", collection, key, `entry ${keyField}='${v}' does not match map key`);
      }
    }
  };
  const checkRecordKeys: AuditCtx["checkRecordKeys"] = (collection, record, into) => {
    if (!record) return;
    for (const key of Object.keys(record)) {
      if (!into.has(key)) add("dangling_ref", collection, key, "record key resolves to nothing");
    }
  };
  const checkRecordKeyField: AuditCtx["checkRecordKeyField"] = (collection, record, keyField) => {
    if (!record) return;
    for (const [key, entry] of Object.entries(record)) {
      const v = (entry as Record<string, unknown> | undefined)?.[keyField];
      if (typeof v === "string" && v !== key) {
        add("key_mismatch", collection, key, `entry ${keyField}='${v}' does not match record key`);
      }
    }
  };
  const checkIdFieldInArray: AuditCtx["checkIdFieldInArray"] = (collection, items) => {
    if (!items) return;
    const seen = new Set<string>();
    for (const item of items) {
      const id = (item as Record<string, unknown> | undefined)?.id;
      if (typeof id !== "string") continue;
      if (seen.has(id)) add("duplicate_id", collection, id, "duplicate id in array");
      seen.add(id);
    }
  };

  return {
    world,
    sets,
    add,
    checkRef,
    checkIdList,
    checkMapKeys,
    checkRecordKeys,
    checkRecordKeyField,
    checkIdFieldInArray,
  };
}

// ── Audit sections ──────────────────────────────────────────────────────────

/** Entity maps: entry.id (or keyField) must equal its key. */
function auditEntityMaps(ctx: AuditCtx): void {
  const { world, checkMapKeys } = ctx;
  checkMapKeys("rikishi", world.rikishi);
  checkMapKeys("historicalRikishi", world.historicalRikishi);
  checkMapKeys("heyas", world.heyas);
  checkMapKeys("closedHeyas", world.closedHeyas);
  checkMapKeys("oyakata", world.oyakata);
  checkMapKeys("staff", world.staff);
  checkMapKeys("trainingState", world.trainingState, "heyaId");
  checkMapKeys("sparringPairs", world.sparringPairs, "heyaId");
  checkMapKeys("heyaBrandIdentities", world.heyaBrandIdentities);
}

/** Ghost entries in world.rikishi + active/historical exclusivity + index consistency. */
function auditRikishiCollections(ctx: AuditCtx): void {
  const { world, add } = ctx;
  for (const [id, r] of world.rikishi) {
    if (r.isRetired) add("cross_collection", "rikishi", id, "retired rikishi still in active map");
    if (world.historicalRikishi.has(id)) {
      add("cross_collection", "rikishi_vs_historical", id, "present in both rikishi and historicalRikishi");
    }
  }
  const activeIds = world.activeRikishiIds ?? new Set<string>();
  for (const id of activeIds) {
    const r = world.rikishi.get(id);
    if (!r) add("dangling_ref", "activeRikishiIds", id, "index entry resolves to nothing");
    else if (r.isRetired) add("cross_collection", "activeRikishiIds", id, "retired rikishi still in active index");
    if (world.historicalRikishi.has(id)) {
      add("cross_collection", "activeRikishiIds", id, "active index references a historical entry");
    }
  }
  for (const [id, r] of world.rikishi) {
    if (!r.isRetired && !activeIds.has(id)) {
      add("cross_collection", "activeRikishiIds", id, "active rikishi missing from index");
    }
  }
}

/** Active heya rosters/staff/refs + closed-heya mergedInto. */
function auditHeyaCollections(ctx: AuditCtx): void {
  const { world, sets, add, checkRef, checkIdList } = ctx;
  // Closed heyas are deliberately excluded from roster checks — a closed
  // record's rikishiIds are the historical transfer list, and members
  // legitimately appear on their new stable's roster.
  const rosterOwner = new Map<string, string>();
  for (const heya of world.heyas.values()) {
    checkIdList("heya.staffIds", heya.staffIds, sets.staffIds, `staffIds of heya '${heya.id}'`);
    const ids = heya.rikishiIds;
    if (ids) {
      const seen = new Set<string>();
      for (const id of ids) {
        if (seen.has(id)) {
          add("duplicate_id", "heya.rikishiIds", id, `duplicated on roster of heya '${heya.id}'`);
        }
        seen.add(id);
        const prev = rosterOwner.get(id);
        if (prev !== undefined && prev !== heya.id) {
          add("duplicate_id", "heya.rikishiIds", id, `on rosters of both '${prev}' and '${heya.id}'`);
        } else {
          rosterOwner.set(id, heya.id);
        }
        const active = world.rikishi.get(id);
        const historical = world.historicalRikishi.get(id);
        if (!active && !historical) {
          add("dangling_ref", "heya.rikishiIds", id, `unresolvable on roster of heya '${heya.id}'`);
        } else if (!active) {
          add("cross_collection", "heya.rikishiIds", id, `retired rikishi still on roster of heya '${heya.id}'`);
        } else if (active.heyaId !== heya.id) {
          add(
            "cross_collection",
            "heya.rikishiIds",
            id,
            `rikishi.heyaId='${active.heyaId}' does not match roster owner '${heya.id}'`
          );
        }
      }
    }
    checkRef("heya.oyakataId", heya.oyakataId, sets.oyakataIds, `oyakataId of heya '${heya.id}'`);
    // A set ref pointing at an absent collection is itself a dangling ref —
    // koenkaiIds/brandIds are already empty when the maps don't exist.
    checkRef("heya.koenkaiId", heya.koenkaiId, sets.koenkaiIds, `koenkaiId of heya '${heya.id}'`);
    checkRef("heya.brandIdentityId", heya.brandIdentityId, sets.brandIds, `brandIdentityId of heya '${heya.id}'`);
  }
  for (const [key, rec] of world.closedHeyas ?? new Map()) {
    checkRef("closedHeyas", rec.mergedInto, sets.heyaIds, `mergedInto of closed heya '${key}'`);
  }
}

/** Rikishi-carried ID lists and single-ref fields. */
function auditRikishiRefs(ctx: AuditCtx): void {
  const { world, sets, checkRef, checkIdList } = ctx;
  for (const r of world.rikishi.values()) {
    checkIdList("rikishi.tsukebitoIds", r.tsukebitoIds, sets.rikishiIds, `tsukebitoIds of rikishi '${r.id}'`);
    checkIdList("rikishi.menteeIds", r.menteeIds, sets.rikishiIds, `menteeIds of rikishi '${r.id}'`);
    checkRef("rikishi.heyaId", r.heyaId, sets.heyaIds, `heyaId of rikishi '${r.id}'`);
    checkRef("rikishi.mentorId", r.mentorId, sets.rikishiIds, `mentorId of rikishi '${r.id}'`);
    checkRef("rikishi.tachimochiId", r.tachimochiId, sets.rikishiIds, `tachimochiId of rikishi '${r.id}'`);
    checkRef("rikishi.tsuyuharaiId", r.tsuyuharaiId, sets.rikishiIds, `tsuyuharaiId of rikishi '${r.id}'`);
  }
  checkRef("world.playerHeyaId", world.playerHeyaId, sets.heyaIds, "playerHeyaId");
  checkRef("world.selectedRikishiId", world.selectedRikishiId, sets.rikishiIds, "selectedRikishiId");
}

/** Pooled .id arrays: no duplicates. */
function auditPooledArrayIds(ctx: AuditCtx): void {
  const { world, checkIdFieldInArray } = ctx;
  checkIdFieldInArray("history", world.history);
  checkIdFieldInArray("events.log", world.events?.log);
  checkIdFieldInArray("pendingDecisions", world.pendingDecisions);
  checkIdFieldInArray("pendingRikishiRequests", world.pendingRikishiRequests);
  checkIdFieldInArray("gyojiPool", world.gyojiPool);
  checkIdFieldInArray("shimpanPool", world.shimpanPool);
  checkIdFieldInArray("pendingExhibitions", world.pendingExhibitions);
  checkIdFieldInArray("governanceLog", world.governanceLog);
  checkIdFieldInArray("myosekiMarket.history", world.myosekiMarket?.history);
  checkIdFieldInArray("globalCup.bracket", world.globalCup?.bracket);
}

/** Dangling refs inside pooled arrays and history/snapshot structures. */
function auditPooledArrayRefs(ctx: AuditCtx): void {
  const { world, sets, add, checkRef } = ctx;
  for (const a of world.awardLog ?? []) {
    checkRef("awardLog", a.winnerId, sets.rikishiIds, "awardLog winnerId");
    checkRef("awardLog", a.opponentId, sets.rikishiIds, "awardLog opponentId");
  }
  for (const e of world.encouragementLog ?? []) {
    checkRef("encouragementLog", e.from, sets.rikishiIds, "encouragementLog from");
    checkRef("encouragementLog", e.to, sets.rikishiIds, "encouragementLog to");
  }
  for (const e of world.lineage ?? []) {
    checkRef("lineage", e.mentorId, sets.rikishiIds, "lineage mentorId");
    checkRef("lineage", e.menteeId, sets.rikishiIds, "lineage menteeId");
  }
  for (const q of world.pendingRikishiRequests ?? []) {
    checkRef("pendingRikishiRequests", q.rikishiId, sets.rikishiIds, `request '${q.id}' rikishiId`);
    checkRef("pendingRikishiRequests", q.heyaId, sets.heyaIds, `request '${q.id}' heyaId`);
  }
  for (const e of world.pendingExhibitions ?? []) {
    checkRef("pendingExhibitions", e.heyaId, sets.heyaIds, `exhibition '${e.id}' heyaId`);
  }
  // Event causalEventId is deliberately unchecked — events are pruned while
  // causal refs to them may legitimately remain.
  for (const e of world.events?.log ?? []) {
    checkRef("events.log", e.rikishiId, sets.rikishiIds, `event '${e.id}' rikishiId`);
    checkRef("events.log", e.heyaId, sets.heyaIds, `event '${e.id}' heyaId`);
  }
  for (const b of world.history ?? []) {
    checkRef("history", b.yusho, sets.rikishiIds, `basho '${b.id}' yusho`);
    checkRef("history", b.ginoSho, sets.rikishiIds, `basho '${b.id}' ginoSho`);
    checkRef("history", b.shukunsho, sets.rikishiIds, `basho '${b.id}' shukunsho`);
    checkRef("history", b.kantosho, sets.rikishiIds, `basho '${b.id}' kantosho`);
    for (const id of b.junYusho ?? []) checkRef("history", id, sets.rikishiIds, `basho '${b.id}' junYusho`);
  }
  for (const snapshot of world.almanacSnapshots ?? []) {
    checkRef(
      "almanacSnapshots",
      snapshot.yushoWinner?.rikishiId,
      sets.rikishiIds,
      `snapshot ${snapshot.year}-${snapshot.bashoNumber} yushoWinner`
    );
    for (const section of [snapshot.promotions, snapshot.demotions, snapshot.retirements]) {
      for (const entry of section ?? []) {
        checkRef("almanacSnapshots", entry.rikishiId, sets.rikishiIds, `snapshot ${snapshot.year}-${snapshot.bashoNumber}`);
      }
    }
  }
  {
    const seen = new Set<string>();
    for (const snapshot of world.almanacSnapshots ?? []) {
      const key = `${snapshot.year}-${snapshot.bashoNumber}`;
      if (seen.has(key)) add("duplicate_id", "almanacSnapshots", key, "duplicate snapshot for basho");
      seen.add(key);
    }
  }
  if (world.chronicle) {
    for (const c of world.chronicle.topChampions ?? []) {
      checkRef("chronicle", c.rikishiId, sets.rikishiIds, "chronicle topChampions");
    }
    for (const g of world.chronicle.greatestRivalries ?? []) {
      checkRef("chronicle", g.rikishiAId, sets.rikishiIds, "chronicle greatestRivalries");
      checkRef("chronicle", g.rikishiBId, sets.rikishiIds, "chronicle greatestRivalries");
    }
    for (const rec of world.chronicle.recordsBroken ?? []) {
      checkRef("chronicle", rec.rikishiId, sets.rikishiIds, "chronicle recordsBroken");
    }
  }
  for (const board of [world.records?.allTime, world.records?.active]) {
    if (!board) continue;
    for (const leaderboard of Object.values(board)) {
      for (const entry of (leaderboard as Array<{ rikishiId?: string }> | undefined) ?? []) {
        checkRef("records", entry.rikishiId, sets.rikishiIds, "record leaderboard entry");
      }
    }
  }
}

/** currentBasho + globalCup structures. */
function auditTournaments(ctx: AuditCtx): void {
  const { world, sets, add, checkRef, checkIdFieldInArray } = ctx;
  if (world.currentBasho) {
    const basho = world.currentBasho;
    checkIdFieldInArray("currentBasho.matches", basho.matches);
    const seenBoutIds = new Set<string>();
    for (const m of basho.matches ?? []) {
      if (typeof m.boutId === "string") {
        if (seenBoutIds.has(m.boutId)) add("duplicate_id", "currentBasho.matches", m.boutId, "duplicate boutId");
        seenBoutIds.add(m.boutId);
      }
      checkRef("currentBasho.matches", m.eastRikishiId, sets.rikishiIds, `bout '${m.boutId}' east`);
      checkRef("currentBasho.matches", m.westRikishiId, sets.rikishiIds, `bout '${m.boutId}' west`);
      checkRef("currentBasho.matches", m.result?.winnerRikishiId, sets.rikishiIds, `bout '${m.boutId}' winner`);
      checkRef("currentBasho.matches", m.result?.loserRikishiId, sets.rikishiIds, `bout '${m.boutId}' loser`);
    }
    for (const key of basho.standings?.keys() ?? []) {
      checkRef("currentBasho.standings", key, sets.rikishiIds, "standings key");
    }
  }
  if (world.globalCup) {
    const seen = new Set<string>();
    for (const p of world.globalCup.participants ?? []) {
      if (seen.has(p.rikishiId)) add("duplicate_id", "globalCup.participants", p.rikishiId, "duplicate participant");
      seen.add(p.rikishiId);
      checkRef("globalCup.participants", p.rikishiId, sets.cupIds, "participant rikishiId");
      checkRef("globalCup.participants", p.heyaId, sets.heyaIds, "participant heyaId");
    }
    for (const m of world.globalCup.bracket ?? []) {
      checkRef("globalCup.bracket", m.eastRikishiId, sets.cupIds, `match '${m.id}' east`);
      checkRef("globalCup.bracket", m.westRikishiId, sets.cupIds, `match '${m.id}' west`);
      checkRef("globalCup.bracket", m.winnerRikishiId, sets.cupIds, `match '${m.id}' winner`);
    }
    checkRef("globalCup", world.globalCup.championId, sets.cupIds, "championId");
  }
}

/** Record-keyed maps + key↔field consistency (factions, myoseki, scouting). */
function auditRecordKeyed(ctx: AuditCtx): void {
  const { world, sets, checkRef, checkRecordKeys, checkRecordKeyField } = ctx;
  checkRecordKeys("boutTactics", world.boutTactics, sets.rikishiIds);
  checkRecordKeys("ozekiKadoban", world.ozekiKadoban, sets.rikishiIds);
  checkRecordKeys("perceptionCache", world.perceptionCache, sets.heyaIds);
  checkRecordKeys("npcScoutingPriorities", world.npcScoutingPriorities, sets.heyaIds);
  checkRecordKeys("npcBidPolicies", world.npcBidPolicies, sets.heyaIds);
  checkRecordKeys("bashoNpcPosture", world.bashoNpcPosture, sets.heyaIds);
  checkRecordKeys("customKeshoConfigs", world.customKeshoConfigs, sets.rikishiIds);

  checkRecordKeyField("factions", world.factions, "id");
  checkRecordKeyField("myosekiMarket.stocks", world.myosekiMarket?.stocks, "id");
  checkRecordKeyField("playerKnowledge.scouting", world.playerKnowledge?.scouting, "rikishiId");
  for (const entry of Object.values(world.playerKnowledge?.scouting ?? {})) {
    checkRef("playerKnowledge.scouting", entry.rikishiId, sets.rikishiIds, "scouted rikishiId");
  }
  for (const b of world.playerKnowledge?.bookmarks ?? []) {
    const into =
      b.entityType === "rikishi" ? sets.rikishiIds : b.entityType === "heya" ? sets.heyaIds : undefined;
    if (into) checkRef("playerKnowledge.bookmarks", b.entityId, into, `bookmark '${b.entityType}'`);
  }
}

/** Talent pools (talentPool + candidatePool share shape). */
function auditTalentPools(ctx: AuditCtx): void {
  const { world, sets, add, checkRef, checkRecordKeyField } = ctx;
  for (const [poolName, tp] of [
    ["talentPool", world.talentPool],
    ["candidatePool", world.candidatePool],
  ] as const) {
    if (!tp) continue;
    const candidates = tp.candidates ?? {};
    const candidateIds = new Set(Object.keys(candidates));
    const personIds = new Set<string>();
    checkRecordKeyField(`${poolName}.candidates`, candidates, "candidateId");
    for (const [key, c] of Object.entries(candidates)) {
      if (typeof c.personId === "string") {
        if (personIds.has(c.personId)) {
          add("duplicate_id", `${poolName}.candidates`, c.personId, `personId shared by candidates ('${key}')`);
        }
        personIds.add(c.personId);
      }
      for (const s of c.competingSuitors ?? []) {
        checkRef(`${poolName}.candidates`, s.heyaId, sets.heyaIds, `suitor of candidate '${key}'`);
      }
    }
    const poolListings = new Map<string, string>();
    for (const [poolType, pool] of Object.entries(tp.pools ?? {})) {
      for (const listName of ["candidatesVisible", "candidatesHidden"] as const) {
        const list = pool[listName] ?? [];
        const coll = `${poolName}.pools.${listName}`;
        const seen = new Set<string>();
        for (const cid of list) {
          if (seen.has(cid)) add("duplicate_id", coll, cid, `duplicated in ${poolType} pool`);
          seen.add(cid);
          checkRef(coll, cid, candidateIds, `in ${poolType} pool`);
          const other = listName === "candidatesVisible" ? "candidatesHidden" : "candidatesVisible";
          if ((pool[other] ?? []).includes(cid)) {
            add("cross_collection", `${poolName}.pools`, cid, `candidate in both visible and hidden of ${poolType} pool`);
          }
          const prevPool = poolListings.get(cid);
          if (prevPool !== undefined && prevPool !== poolType) {
            add("cross_collection", `${poolName}.pools`, cid, `listed in both '${prevPool}' and '${poolType}' pools`);
          } else {
            poolListings.set(cid, poolType);
          }
        }
      }
    }
  }
}

/** sponsorPool maps + relationship ids/refs. */
function auditSponsorPool(ctx: AuditCtx): void {
  const { world, sets, add, checkRef } = ctx;
  if (!world.sponsorPool) return;
  const checkRel = (
    rel: { relId?: string; targetType?: string; targetId?: string },
    seen: Set<string>,
    collection: string
  ): void => {
    if (typeof rel.relId === "string") {
      if (seen.has(rel.relId)) add("duplicate_id", collection, rel.relId, "duplicate relationship id");
      seen.add(rel.relId);
    }
    if (rel.targetType === "heya") checkRef(collection, rel.targetId, sets.heyaIds, "relationship target");
    else if (rel.targetType === "rikishi") checkRef(collection, rel.targetId, sets.rikishiIds, "relationship target");
    // "league" / "basho" targets have no entity map to resolve against.
  };
  // relationships and koenkai.members are distinct namespaces: heya-targeted
  // relationships are deliberately mirrored into koenkai.members, so the same
  // relId appearing once in each is the intended shape, not a duplicate.
  const relIds = new Set<string>();
  for (const [key, sp] of world.sponsorPool.sponsors ?? new Map()) {
    if (typeof sp.sponsorId === "string" && sp.sponsorId !== key) {
      add("key_mismatch", "sponsorPool.sponsors", key, `sponsorId='${sp.sponsorId}' does not match map key`);
    }
    for (const rel of sp.relationships ?? []) checkRel(rel, relIds, "sponsorPool.relationships");
  }
  const memberIds = new Set<string>();
  for (const [key, k] of world.sponsorPool.koenkais ?? new Map()) {
    if (typeof k.koenkaiId === "string" && k.koenkaiId !== key) {
      add("key_mismatch", "sponsorPool.koenkais", key, `koenkaiId='${k.koenkaiId}' does not match map key`);
    }
    checkRef("sponsorPool.koenkais", k.heyaId, sets.heyaIds, `koenkai '${key}' heyaId`);
    for (const rel of k.members ?? []) checkRel(rel, memberIds, "sponsorPool.koenkaiMembers");
  }
}

/** myosekiMarket stocks + transaction refs. */
function auditMyosekiMarket(ctx: AuditCtx): void {
  const { world, sets, checkRef } = ctx;
  if (!world.myosekiMarket) return;
  for (const [key, stock] of Object.entries(world.myosekiMarket.stocks ?? {})) {
    checkRef("myosekiMarket.stocks", stock.ownerId, sets.personIds, `stock '${key}' ownerId`);
    checkRef("myosekiMarket.stocks", stock.holderId, sets.personIds, `stock '${key}' holderId`);
  }
  for (const t of world.myosekiMarket.history ?? []) {
    checkRef("myosekiMarket.history", t.myosekiId, sets.myosekiIds, `transaction '${t.id}' myosekiId`);
    checkRef("myosekiMarket.history", t.fromId, sets.personIds, `transaction '${t.id}' fromId`);
    checkRef("myosekiMarket.history", t.toId, sets.personIds, `transaction '${t.id}' toId`);
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Audit the world for ID-integrity violations. Pure — never mutates.
 * Coverage is sectioned in audit* helpers above; extend by adding a section.
 */
export function validateWorldIdIntegrity(world: WorldState): IdIntegrityViolation[] {
  const violations: IdIntegrityViolation[] = [];
  const ctx = makeAuditCtx(world, violations);
  auditEntityMaps(ctx);
  auditRikishiCollections(ctx);
  auditHeyaCollections(ctx);
  auditRikishiRefs(ctx);
  auditPooledArrayIds(ctx);
  auditPooledArrayRefs(ctx);
  auditTournaments(ctx);
  auditRecordKeyed(ctx);
  auditTalentPools(ctx);
  auditSponsorPool(ctx);
  auditMyosekiMarket(ctx);
  return violations;
}

/**
 * Throw if `world` has any ID-integrity violations. For tests and
 * generation/load boundaries — do not call in hot loops.
 */
export function assertWorldIdIntegrity(world: WorldState): void {
  const violations = validateWorldIdIntegrity(world);
  if (violations.length === 0) return;
  const listed = violations
    .slice(0, 20)
    .map((v) => `[${v.kind}] ${v.collection} '${v.id}' — ${v.detail}`)
    .join("\n");
  const suffix = violations.length > 20 ? `\n… and ${violations.length - 20} more` : "";
  throw new Error(`World ID integrity violated (${violations.length} issue(s)):\n${listed}${suffix}`);
}

/**
 * Report every violation via warn(). For generation/load boundaries where a
 * dirty world should be surfaced, not crashed.
 */
export function reportWorldIdIntegrity(world: WorldState, context: string): void {
  for (const v of validateWorldIdIntegrity(world)) {
    warn(`ID integrity violation [${v.kind}] ${v.collection} '${v.id}': ${v.detail}`, context);
  }
}
