/**
 * Gyoji Service — manages gyoji assignment, career tracking, and shimpan panels.
 */

import type { Gyoji, Shimpan, ShimpanPanel } from "@/engine/types/gyoji";
import type { Id } from "@/engine/types/common";
import { SeededRNG } from "@/engine/core/rng";
import { generateAvatarIdentity } from "@/engine/generation/avatarGenerator";

/** Generate a gyoji with deterministic stats from a seed. */
export function generateGyoji(seed: string, rank: Gyoji["rank"], index: number): Gyoji {
  const rng = new SeededRNG(`${seed}-gyoji-${index}`);
  const accuracyBase =
    rank === "tate" ? 75 : rank === "fuku-tate" ? 70 : rank === "sanyaku" ? 65 : 55;
  const accuracy = Math.max(30, Math.min(95, accuracyBase + Math.floor(rng.next() * 20 - 10)));
  const surnames = ["Kimura", "Shikimori", "Inosuke", "Hideki", "Toshio", "Masaru"];
  const givenName = rank === "tate" ? "Shonosuke" : "Kazuki";
  const surname = surnames[Math.floor(rng.next() * surnames.length)];
  const id = rng.uuid("GY") as Id;
  const yearsActive = Math.floor(rng.next() * 15) + 1;

  return {
    id,
    name: `${surname} ${givenName}`,
    rank,
    accuracy,
    yearsActive,
    age: 28 + yearsActive + Math.floor(rng.next() * 5),
    avatarConfig: generateAvatarIdentity({ seed: id, nationality: "Japan", role: "gyoji" }),
    boutsOfficiated: 0,
    callsReversed: 0,
    // WS-9 — hereditary tate titles: the two top seats alternate between
    // the Kimura Shōnosuke and Shikimori Inosuke lineages.
    ...(rank === "tate"
      ? { hereditaryTitle: index % 2 === 0 ? "Kimura Shōnosuke" : "Shikimori Inosuke" }
      : {}),
  };
}

/** Generate a shimpan (judge) with deterministic stats from a seed. */
export function generateShimpan(seed: string, index: number): Shimpan {
  const rng = new SeededRNG(`${seed}-shimpan-${index}`);
  const accuracy = Math.max(40, Math.min(90, 60 + Math.floor(rng.next() * 30 - 15)));
  const surnames = ["Iwai", "Nakamura", "Tanaka", "Sato", "Suzuki"];
  const name = surnames[Math.floor(rng.next() * surnames.length)];
  const id = rng.uuid("SH") as Id;
  const yearsActive = Math.floor(rng.next() * 20) + 1;

  // WS-8 — Shinpan-bu personnel: regulars are drawn from sitting oyakata
  // under fixed ichimon quotas; index 0 = head, 1–2 = deputies, rest
  // members on one-year terms.
  const ICHIMON_ROTATION = [
    "Dewanoumi",
    "Nishonoseki",
    "Isegahama",
    "Tokitsukaze",
    "Takasago",
  ] as const;
  const role = index === 0 ? "head" : index <= 2 ? "deputy" : "member";

  return {
    id,
    name,
    accuracy,
    yearsActive,
    age: 40 + yearsActive + Math.floor(rng.next() * 5),
    avatarConfig: generateAvatarIdentity({ seed: id, nationality: "Japan", role: "shimpan" }),
    consultations: 0,
    oyakataId: `OY-${id}` as Id,
    ichimon: ICHIMON_ROTATION[index % ICHIMON_ROTATION.length],
    role,
    appointedYear: undefined,
  };
}

/**
 * Assign a gyoji to a bout deterministically based on bout seed.
 * Higher-rank gyoji are assigned to higher-profile bouts.
 */
export function assignGyojiToBout(
  gyojiPool: Gyoji[],
  boutSeed: string,
  boutImportance: number
): Gyoji | null {
  if (gyojiPool.length === 0) return null;
  const rng = new SeededRNG(`${boutSeed}-gyoji-assign`);

  // WS-9 — strict division gating: top-level bouts (importance ≥ 70, the
  // makuuchi/sanyaku band from boutImportanceForBout) may only be called
  // by makuuchi-tier gyōji. If no eligible official exists the bout has
  // no gyōji (null) rather than misassigning a lower-tier official.
  const TOP_TIER_RANKS = new Set<Gyoji["rank"]>(["tate", "fuku-tate", "sanyaku", "makuuchi"]);
  const eligible =
    boutImportance >= 70 ? gyojiPool.filter((g) => TOP_TIER_RANKS.has(g.rank)) : gyojiPool;
  if (eligible.length === 0) return null;

  // Sort by rank (tate first) and accuracy
  const sorted = [...eligible].sort((a, b) => {
    const rankOrder: Record<string, number> = {
      tate: 0,
      "fuku-tate": 1,
      sanyaku: 2,
      makuuchi: 3,
      juryo: 4,
      makushita: 5,
    };
    const rankDiff = rankOrder[a.rank] - rankOrder[b.rank];
    if (rankDiff !== 0) return rankDiff;
    return b.accuracy - a.accuracy;
  });

  // High-importance bouts get top gyoji; lower bouts get random selection
  if (boutImportance >= 80) {
    return sorted[0];
  }

  // Weighted random selection favoring higher-ranked gyoji
  const idx = Math.floor(rng.next() * Math.min(sorted.length, 4));
  return sorted[idx];
}

/**
 * Assemble a shimpan panel for a bout's mono-ii.
 * 1 chief + 4 panelists = 5 judges total.
 */
export function assembleShimpanPanel(
  shimpanPool: Shimpan[],
  boutSeed: string
): ShimpanPanel | null {
  if (shimpanPool.length < 5) return null;
  const rng = new SeededRNG(`${boutSeed}-shimpan-panel`);
  const indices = [...Array(shimpanPool.length).keys()];
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  // WS-8 — makuuchi panels are clan-diverse: at most 2 panelists per
  // ichimon (the real Shinpan-bu rotates clan representation). Greedy
  // selection over the shuffled pool; if the clan constraint can't fill
  // all five seats the remaining slots fall back to pool order.
  const clanCount = new Map<string, number>();
  const selected: Shimpan[] = [];
  for (const i of indices) {
    if (selected.length >= 5) break;
    const s = shimpanPool[i];
    const clan = s.ichimon?.toLowerCase() ?? "?";
    if ((clanCount.get(clan) ?? 0) >= 2) continue;
    clanCount.set(clan, (clanCount.get(clan) ?? 0) + 1);
    selected.push(s);
  }
  if (selected.length < 5) {
    for (const i of indices) {
      if (selected.length >= 5) break;
      const s = shimpanPool[i];
      if (!selected.includes(s)) selected.push(s);
    }
  }
  return {
    chief: selected[0],
    panelists: selected.slice(1, 5),
  };
}

/**
 * Record a bout officiation in the gyoji's career history.
 */
export function recordGyojiBout(
  gyoji: Gyoji,
  bashoName: string,
  year: number,
  reversed: boolean
): Gyoji {
  // Per-basho aggregation: fold same-basho bouts into the existing entry
  // instead of appending one row per bout (S7-27 — unbounded growth).
  const history = [...(gyoji.careerHistory ?? [])];
  const last = history[history.length - 1];
  if (last && last.bashoName === bashoName && last.year === year) {
    history[history.length - 1] = {
      ...last,
      boutsOfficiated: last.boutsOfficiated + 1,
      reversals: last.reversals + (reversed ? 1 : 0),
    };
  } else {
    history.push({
      bashoName,
      year,
      boutsOfficiated: 1,
      reversals: reversed ? 1 : 0,
    });
  }

  const callsReversed = gyoji.callsReversed + (reversed ? 1 : 0);

  // WS-9 — error accountability: >9 reversals disciplines the official.
  // Makuuchi-tier gyōji take a salary cut; lower tiers get a promotion
  // freeze. (Tate errors trigger a separate resignation-ritual path.)
  const isTopTier = ["tate", "fuku-tate", "sanyaku", "makuuchi"].includes(gyoji.rank);
  const discipline =
    callsReversed > 9
      ? isTopTier
        ? { salaryCutPending: true }
        : { frozenUntilYear: year + 1 }
      : {};

  return {
    ...gyoji,
    boutsOfficiated: gyoji.boutsOfficiated + 1,
    callsReversed,
    careerHistory: history,
    ...discipline,
  };
}
