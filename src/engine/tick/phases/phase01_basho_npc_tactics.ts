/**
 * phase01_basho_npc_tactics.ts
 * ============================
 * Pipeline Phase (Daily during active_basho) — NPC mid-basho tactics.
 *
 * Runs BEFORE phase01_basho_bouts inside the `active_basho` block of
 * tickDaily, so it executes under both advanceOneDay and advanceDaysFast
 * (the daily-micro gate does not cover it).
 *
 * Responsibilities:
 *   1. Day-of kyujo calls — an injured NPC rikishi scheduled to fight today
 *      may be withdrawn by the oyakata. Player rikishi are never touched.
 *   2. Basho posture — a banded per-heya stance (conservative/standard/
 *      aggressive) written to world.bashoNpcPosture and consumed by
 *      chooseNpcSideTactic during bout resolution.
 *
 * Determinism: all randomized edges use seeded RNG streams keyed by
 * bashoId + day + rikishiId.
 */

import type { WorldState } from "../../types/world";
import type { StateImpact } from "../../core/StateImpact";
import type { Id } from "../../types/common";
import type { Oyakata } from "../../types/oyakata";
import type { Rikishi } from "../../types/rikishi";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { getRikishi } from "../../queries";
import { rngFromSeed } from "../../rng";

type BashoPosture = "conservative" | "standard" | "aggressive";

const NPC_KYUJO_LABEL = "npc_basho_kyujo";

/** Win total that secures kachi-koshi; losses >= this is make-koshi. */
const KACHI_KOSHI_WINS = 8;
const MAKE_KOSHI_LOSSES = 8;

function oyakataFor(world: WorldState, heyaId: Id): Oyakata | undefined {
  const heya = world.heyas.get(heyaId);
  return heya?.oyakataId ? world.oyakata.get(heya.oyakataId) : undefined;
}

/** Compute a banded basho posture for one NPC stable. */
export function computeBashoPosture(
  world: WorldState,
  heyaId: Id,
  entrantIds: Id[]
): BashoPosture {
  const oyakata = oyakataFor(world, heyaId);
  const archetype = oyakata?.archetype ?? "strategist";
  const traits = oyakata?.traits;
  const basho = world.currentBasho;

  const entrants = entrantIds
    .map((id) => getRikishi(world, id))
    .filter((r): r is Rikishi => !!r);
  const injured = entrants.filter((r) => r.injured || r.isKyujo).length;
  const injuryRatio = entrants.length ? injured / entrants.length : 0;

  // Conservative: welfare-first archetypes or a battered roster.
  if (
    archetype === "nurturer" ||
    archetype === "strict" ||
    (traits?.compassion ?? 50) >= 70 ||
    injuryRatio >= 0.4
  ) {
    return "conservative";
  }

  // Aggressive: hard-driving archetypes, or late-basho contenders.
  if (archetype === "tyrant" || archetype === "gambler" || (traits?.risk ?? 50) >= 75) {
    return "aggressive";
  }
  if (basho && basho.day >= 13) {
    let maxWins = 0;
    for (const rec of basho.standings.values()) maxWins = Math.max(maxWins, rec.wins);
    const contender = entrants.some((r) => {
      const rec = basho.standings.get(r.id);
      return rec && maxWins > 0 && rec.wins >= maxWins - 1;
    });
    if (contender) return "aggressive";
  }

  return "standard";
}

/**
 * Day-of kyujo evaluation for one injured rikishi. Returns true when the
 * oyakata withdraws them before today's bout.
 */
export function shouldWithdrawInjuredToday(
  world: WorldState,
  rikishi: Rikishi,
  oyakata: Oyakata | undefined,
  posture: BashoPosture
): boolean {
  const basho = world.currentBasho;
  if (!basho) return false;

  const severity = rikishi.injuryStatus?.severity ?? (rikishi.injured ? "moderate" : "none");
  if (severity === "none") return false;

  const record = basho.standings.get(rikishi.id) ?? { wins: 0, losses: 0 };
  const recordDecided =
    record.wins >= KACHI_KOSHI_WINS || record.losses >= MAKE_KOSHI_LOSSES;
  const compassion = oyakata?.traits?.compassion ?? 50;
  const archetype = oyakata?.archetype ?? "strategist";

  // Serious injuries always withdraw — real stables don't risk them.
  if (severity === "serious") return true;

  if (severity === "moderate") {
    if (compassion >= 60 || archetype === "nurturer") return true;
    // Conservative stables rest moderates — but hard drivers (tyrant/gambler)
    // fight through while the record is still live.
    const hardDriver = archetype === "tyrant" || archetype === "gambler";
    if (posture === "conservative" && !hardDriver) return true;
    if (archetype === "strict") return true;
    // Already make-koshi or safely kk: nothing to gain, rest them.
    if (recordDecided) return true;
    // Senshuraku rest: final days with nothing decided by welfare-minded stables.
    if (basho.day >= 14 && archetype !== "tyrant" && compassion >= 50) return true;
    return false;
  }

  // Minor injuries: only withdrawn when the record is already lost and the
  // stable is protecting rather than chasing.
  if (basho.day >= 13 && record.losses >= MAKE_KOSHI_LOSSES) return true;
  if (posture === "conservative" && recordDecided) return true;

  return false;
}

export function phase01_basho_npc_tactics(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase01_basho_npc_tactics");
  if (world.cyclePhase !== "active_basho") return builder.build();
  const basho = world.currentBasho;
  if (!basho) return builder.build();

  // Heyas with entrants fighting today.
  const todays = (basho.matches ?? []).filter((m) => m.day === basho.day && !m.result);
  const entrantsByHeya = new Map<Id, Id[]>();
  for (const m of todays) {
    for (const rid of [m.eastRikishiId, m.westRikishiId]) {
      const r = getRikishi(world, rid);
      if (!r?.heyaId) continue;
      const list = entrantsByHeya.get(r.heyaId) ?? [];
      list.push(rid);
      entrantsByHeya.set(r.heyaId, list);
    }
  }

  const postures: Record<Id, BashoPosture> = { ...(world.bashoNpcPosture ?? {}) };
  const playerHeyaId = world.playerHeyaId;

  for (const [heyaId, entrants] of entrantsByHeya) {
    if (heyaId === playerHeyaId) continue;

    const oyakata = oyakataFor(world, heyaId);
    const posture = computeBashoPosture(world, heyaId, entrants);
    postures[heyaId] = posture;

    // Day-of kyujo calls for entrants hurt before their bout.
    for (const rid of entrants) {
      const r = getRikishi(world, rid);
      if (!r || r.isKyujo || r.isRetired) continue;
      if (!r.injured && !r.injuryStatus?.isInjured) continue;

      if (!shouldWithdrawInjuredToday(world, r, oyakata, posture)) continue;

      // Deterministic confirmation gate for borderline moderate cases — the
      // stream is keyed per rikishi+day so rerunning the day can't flip it.
      const severity = r.injuryStatus?.severity ?? "moderate";
      const certSeverity = severity === "none" ? "moderate" : severity;
      if (severity === "moderate") {
        const rng = rngFromSeed(
          `${world.seed}:${basho.id ?? "basho"}:d${basho.day}:${rid}`,
          "ai",
          NPC_KYUJO_LABEL
        );
        const record = basho.standings.get(rid) ?? { wins: 0, losses: 0 };
        const decided = record.wins >= KACHI_KOSHI_WINS || record.losses >= MAKE_KOSHI_LOSSES;
        if (!decided && posture !== "conservative" && rng.next() < 0.15) continue;
      }

      builder.updateRikishi(rid, {
        isKyujo: true,
        kyujoReason: "injury",
        medicalCertificate: {
          injury: r.injuryStatus?.type ?? "unknown",
          severity: certSeverity,
          treatmentWeeks: r.injuryWeeksRemaining,
          submittedDate: world.calendar?.currentWeek ?? world.week,
        },
      });
      builder.logEvent(
        "MEDICAL_REPORT",
        "injury",
        {
          rikishiId: rid,
          heyaId,
          bashoDay: basho.day,
          severity: certSeverity,
          posture,
        },
        { heyaId, rikishiId: rid, importance: "minor" }
      );
    }
  }

  builder.updateWorldField("bashoNpcPosture", postures);
  return builder.build();
}
