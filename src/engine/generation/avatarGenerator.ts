/**
 * Avatar Generator (v2)
 *
 * `generateAvatarIdentity` — permanent seeded features stored on the entity.
 * `deriveAvatarStage` — transient appearance derived from live entity state.
 * `resolveAvatar` — {identity, stage} for presenters/components.
 *
 * Identity is seeded ONLY by the entity's stable id (for recruits this is
 * `personId`, which carries over to the rikishi record) so faces survive
 * promotion, retirement, and oyakata conversion.
 */

import { SeededRNG } from "@/engine/core/rng";
import {
  AVATAR_VERSION,
  type AvatarIdentity,
  type AvatarRole,
  type AvatarStage,
  type AvatarStageInput,
  type AvatarGenerationParams,
  type AvatarRenderData,
  type AvatarAttire,
  type AvatarExpression,
  type Hairstyle,
  NATIONALITY_SKIN_TONES,
  HAIR_COLORS,
} from "@/engine/types/avatar";
import type { Rikishi } from "@/engine/types/rikishi";
import type { Oyakata } from "@/engine/types/oyakata";
import type { Staff } from "@/engine/types/staff";
import type { Gyoji, Shimpan } from "@/engine/types/gyoji";
import type { AcademyStaff, YouthProspect } from "@/engine/types/academy";
import type { TalentCandidate } from "@/engine/types/talent";
import type { RetiredRikishiSummary } from "@/engine/types/history";
import { isSekitoriDivision } from "@/constants/engine/rankDisplay";

// ---------------------------------------------------------------------------
// Identity generation
// ---------------------------------------------------------------------------

type Weighted<T> = readonly (readonly [T, number])[];
function wpick<T>(rng: SeededRNG, entries: Weighted<T>): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = rng.next() * total;
  for (const [v, w] of entries) {
    roll -= w;
    if (roll < 0) return v;
  }
  return entries[entries.length - 1][0];
}

/** Mild cosmetic biases per nationality — probabilities, never guarantees. */
const NATIONALITY_BIAS: Record<
  string,
  {
    heads?: AvatarIdentity["headShape"][];
    eyes?: AvatarIdentity["eyes"][];
    browThickness?: 1 | 2 | 3;
    facialHairBoost?: number;
  }
> = {
  mongolia: { heads: ["round", "full"], eyes: ["narrow", "upturned", "narrow"] },
  georgia: {
    heads: ["square", "broad"],
    eyes: ["deepset"],
    browThickness: 3,
    facialHairBoost: 0.25,
  },
  russia: { heads: ["square", "long"], eyes: ["deepset"], browThickness: 3, facialHairBoost: 0.2 },
  bulgaria: { heads: ["square"], eyes: ["deepset"], browThickness: 3, facialHairBoost: 0.15 },
  estonia: { heads: ["long"], eyes: ["narrow"] },
  brazil: { heads: ["broad", "round"], eyes: ["wide"] },
  hawaii: { heads: ["broad", "full"], eyes: ["wide"] },
  usa: { heads: ["broad", "square"], eyes: ["wide"] },
  kazakhstan: { heads: ["round"], eyes: ["narrow"] },
};

const CAN_GROW_FACIAL_HAIR: Record<AvatarRole, number> = {
  rikishi: 0,
  prospect: 0,
  gyoji: 0.2,
  shimpan: 0.3,
  staff: 0.3,
  oyakata: 0.35,
};

export function generateAvatarIdentity(params: AvatarGenerationParams): AvatarIdentity {
  const { seed, role } = params;
  const rng = new SeededRNG(`avatar-id::${seed}`);
  const natKey = (params.nationality || "japan").toLowerCase();
  const bias = NATIONALITY_BIAS[natKey] ?? {};

  const tone = NATIONALITY_SKIN_TONES[natKey] ?? NATIONALITY_SKIN_TONES.japan;
  const skinTone = rng.pick([tone.range[0], tone.base, tone.range[1]]);

  const headShape = bias.heads?.length
    ? wpick(rng, [
        ...(["full", "round", "oval", "square", "broad", "long"] as const).map(
          (h) => [h, 1] as const
        ),
        ...bias.heads.map((h) => [h, 2.5] as const),
      ])
    : rng.pick<AvatarIdentity["headShape"]>(["full", "round", "oval", "square", "broad", "long"]);

  const eyes: AvatarIdentity["eyes"] = bias.eyes?.length
    ? wpick(rng, [
        ...(["standard", "narrow", "wide", "deepset", "upturned"] as const).map(
          (e) => [e, 1] as const
        ),
        ...bias.eyes.map((e) => [e, 2.5] as const),
      ])
    : rng.pick(["standard", "narrow", "wide", "deepset", "upturned"]);

  const facialHairChance = (CAN_GROW_FACIAL_HAIR[role] ?? 0) + (bias.facialHairBoost ?? 0);
  const facialHair: AvatarIdentity["facialHair"] =
    rng.next() < facialHairChance ? rng.pick(["mustache", "goatee", "full"]) : "none";

  // Cauliflower ears: career-grappler badge — only wrestlers & ex-wrestlers.
  const ears: AvatarIdentity["ears"] =
    (role === "rikishi" || role === "oyakata") && rng.next() < 0.15
      ? "cauliflower"
      : rng.pick(["small", "medium", "large"]);

  const mark: AvatarIdentity["mark"] =
    rng.next() < 0.14 ? rng.pick(["scar", "mole", "freckles", "acne"]) : "none";

  const hairColor =
    natKey === "japan" || natKey === "mongolia"
      ? HAIR_COLORS.black
      : rng.next() < 0.15
        ? HAIR_COLORS.brown
        : HAIR_COLORS.black;

  return {
    version: AVATAR_VERSION,
    seed,
    role,
    headShape,
    eyes,
    brows: rng.pick(["straight", "furrowed", "arched", "sparse"]),
    browThickness: bias.browThickness ?? (rng.int(1, 3) as 1 | 2 | 3),
    nose: rng.pick(["small", "medium", "broad", "flat", "hooked"]),
    mouth: rng.pick(["neutral", "smile", "frown", "pursed", "open", "flat"]),
    ears,
    skinTone,
    hairColor,
    mark,
    facialHair,
  };
}

// ---------------------------------------------------------------------------
// Stage derivation (transient — never stored)
// ---------------------------------------------------------------------------

type AgeStage = AvatarStage["ageStage"];
function ageStageOf(age: number): AgeStage {
  if (age < 20) return "teen";
  if (age < 25) return "young";
  if (age < 35) return "prime";
  if (age < 45) return "veteran";
  return "elder";
}

/** Deterministic 0/1 pick from a seed string for cosmetic coin flips. */
function seedBit(seed: string, salt: string): number {
  let h = 0;
  const s = seed + salt;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) & 1;
}

/** Deterministic int in [min, max] from a seed string — cosmetic weight backfill. */
function seedInt(seed: string, salt: string, min: number, max: number): number {
  let h = 0;
  const s = seed + salt;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return min + (Math.abs(h) % (max - min + 1));
}

function hairstyleFor(input: AvatarStageInput, identity: AvatarIdentity | undefined): Hairstyle {
  const ageStage = ageStageOf(input.age ?? 30);
  const elderCut: Hairstyle =
    identity && seedBit(identity.seed, "eldercut") === 0 ? "bald" : "receding";

  switch (input.role) {
    case "rikishi":
      if (input.isRetired)
        return ageStage === "elder" || ageStage === "veteran" ? elderCut : "short";
      if (input.rank === "yokozuna") return "oichomage";
      if (input.division && isSekitoriDivision(input.division)) return "oichomage";
      if (input.division === "jonokuchi") return "shaved";
      return "chonmage";
    case "prospect":
      return "short";
    case "oyakata":
      return ageStage === "elder" ? elderCut : "short";
    case "gyoji":
      return "short"; // eboshi cap rendered as attire accessory
    case "shimpan":
    case "staff":
      return ageStage === "elder" ? elderCut : "short";
    default:
      return "short";
  }
}

const STAFF_ATTIRE: Record<string, AvatarAttire> = {
  oyakata: "kimono",
  assistant_oyakata: "kimono",
  technique_coach: "tracksuit",
  conditioning_coach: "tracksuit",
  head_coach: "tracksuit",
  technique: "tracksuit",
  conditioning: "tracksuit",
  medical_staff: "coat",
  nutritionist: "apron",
  nutrition: "apron",
  scout: "shirt",
  administrator: "suit",
};

const GYOJI_ATTIRE: Record<string, AvatarAttire> = {
  tate: "gyoji_tate",
  "fuku-tate": "gyoji_tate",
  sanyaku: "gyoji_sanyaku",
  makuuchi: "gyoji_standard",
  juryo: "gyoji_standard",
  makushita: "gyoji_standard",
};

function attireFor(input: AvatarStageInput, identity: AvatarIdentity | undefined): AvatarAttire {
  switch (input.role) {
    case "rikishi":
      return input.isRetired ? "suit" : "bare";
    case "prospect":
      return "bare";
    case "oyakata":
      return identity && seedBit(identity.seed, "suit") === 0 ? "suit" : "kimono";
    case "staff":
      return STAFF_ATTIRE[input.staffRole ?? ""] ?? "polo";
    case "gyoji":
      return GYOJI_ATTIRE[input.gyojiRank ?? ""] ?? "gyoji_standard";
    case "shimpan":
      return "shimpan";
    default:
      return "suit";
  }
}

function expressionFor(input: AvatarStageInput): AvatarExpression {
  if (input.expression) return input.expression;
  if (input.injured) return "worried";
  if ((input.aggression ?? 0) >= 70) return "intense";
  if ((input.momentum ?? 0) >= 65) return "confident";
  return "neutral";
}

/**
 * Neutral portrait age per role — used when only an identity is available
 * (e.g. SumoAvatar's config-only path), so a bare render doesn't turn every
 * elder into a smooth-faced 30-year-old.
 */
const DEFAULT_AGE_BY_ROLE: Record<AvatarRole, number> = {
  rikishi: 25,
  prospect: 17,
  oyakata: 60,
  gyoji: 50,
  shimpan: 60,
  staff: 45,
};

export function deriveAvatarStage(input: AvatarStageInput, identity?: AvatarIdentity): AvatarStage {
  const role = input.role ?? identity?.role ?? "staff";
  const age = input.age ?? DEFAULT_AGE_BY_ROLE[role];
  const ageStage = ageStageOf(age);
  const resolved = { ...input, role, age };

  const wrinkleTier: AvatarStage["wrinkleTier"] = age < 30 ? 0 : age < 40 ? 1 : age < 50 ? 2 : 3;
  const graying: AvatarStage["graying"] = age < 35 ? 0 : age < 50 ? 1 : 2;

  // Sumo-scale girth bands; elders keep their build when the record carried
  // a weight over (conversion/archive), other non-wrestlers stay lean.
  const w = input.weight ?? 0;
  const carriesBulk =
    role === "rikishi" || role === "prospect" || (role === "oyakata" && input.weight != null);
  const fullness: AvatarStage["fullness"] = carriesBulk ? (w >= 165 ? 2 : w >= 125 ? 1 : 0) : 0;

  return {
    role,
    ageStage,
    graying,
    wrinkleTier,
    hairstyle: hairstyleFor(resolved, identity),
    fullness,
    glasses: input.glasses ?? false,
    bandage: input.injured ?? false,
    attire: attireFor(resolved, identity),
    tsuna: input.rank === "yokozuna" && !input.isRetired,
    expression: expressionFor(resolved),
    attireOverride: input.attireOverride,
    backdropTone: input.backdropTone,
  };
}

// ---------------------------------------------------------------------------
// Resolver + per-entity stage-input helpers
// ---------------------------------------------------------------------------

// @keep-export ResolveAvatarArgs — live via same-file/dispatch call or public API contract
export interface ResolveAvatarArgs extends AvatarStageInput {
  id: string;
  nationality?: string;
  stored?: AvatarIdentity | undefined;
  /**
   * Extra seeds that legitimately belong to this entity — e.g. an oyakata
   * converted from a rikishi keeps `seed = formerRikishiId`.
   */
  seedAliases?: string[];
}

/** Build the render pair: stored identity if present/valid, else derive by id. */
export function resolveAvatar(args: ResolveAvatarArgs): AvatarRenderData {
  const { id, nationality, stored, seedAliases, ...stageInput } = args;
  const validSeeds = seedAliases?.length ? [id, ...seedAliases] : [id];
  const identity =
    stored && stored.version === AVATAR_VERSION && validSeeds.includes(stored.seed)
      ? stored
      : generateAvatarIdentity({
          seed: id,
          nationality: nationality ?? "Japan",
          role: stageInput.role ?? "rikishi",
        });
  const role = stageInput.role ?? identity.role;
  return { identity, stage: deriveAvatarStage({ ...stageInput, role }, identity) };
}

// ---------------------------------------------------------------------------
// Load-time backfill
// ---------------------------------------------------------------------------

type HeyaLike = {
  youthAcademy?: {
    prospects?: YouthProspect[];
    staff?: AcademyStaff[];
  };
};

/** Minimal shape an entity needs to receive a generated identity. */
type AvatarBearer = {
  id: string;
  avatarConfig?: AvatarIdentity;
  nationality?: string;
  weight?: number;
};

function valuesOf<T>(c: Map<string, T> | Record<string, T> | undefined): T[] {
  if (!c) return [];
  return c instanceof Map ? Array.from(c.values()) : Object.values(c);
}

function isV2Identity(c: AvatarIdentity | undefined): c is AvatarIdentity {
  return c != null && c.version === AVATAR_VERSION;
}

/**
 * Region→nationality heuristic for records that carry a region but no
 * nationality field (academy prospects). International ORIGINS entries are
 * country names; every other region is a Japanese prefecture or institution.
 */
const FOREIGN_REGION_NAMES = new Set(["mongolia", "georgia", "egypt", "brazil", "usa"]);

function nationalityFromRegion(region: string | undefined): string {
  if (region && FOREIGN_REGION_NAMES.has(region.toLowerCase())) return region;
  return "Japan";
}

/**
 * Assign deterministic v2 AvatarIdentity to every person entity missing one
 * (or carrying a stale version). Seeds are bound to each entity's unique
 * stable id — oyakata prefer `formerRikishiId` so converted elders keep the
 * wrestler's face. Called at world creation and inside `deserializeWorld`.
 */
export function ensureAvatarIdentities(world: {
  rikishi?: Map<string, AvatarBearer> | Record<string, AvatarBearer>;
  historicalRikishi?: Map<string, AvatarBearer> | Record<string, AvatarBearer>;
  oyakata?: Map<string, Oyakata> | Record<string, Oyakata>;
  staff?: Map<string, Staff> | Record<string, Staff>;
  gyojiPool?: Gyoji[];
  shimpanPool?: Shimpan[];
  talentPool?: { candidates?: Record<string, TalentCandidate> };
  candidatePool?: { candidates?: Record<string, TalentCandidate> };
  heyas?: Map<string, HeyaLike> | Record<string, HeyaLike>;
}): void {
  const rikishiVals = valuesOf(world.rikishi);
  const histVals = valuesOf(world.historicalRikishi);
  for (const r of [...rikishiVals, ...histVals]) {
    if (!isV2Identity(r.avatarConfig)) {
      r.avatarConfig = generateAvatarIdentity({
        seed: r.id,
        nationality: r.nationality ?? "Japan",
        role: "rikishi",
      });
    }
  }

  const rikishiById = new Map(rikishiVals.map((r) => [r.id, r]));
  const histById = new Map(histVals.map((r) => [r.id, r]));
  for (const o of valuesOf(world.oyakata)) {
    const former = o.formerRikishiId
      ? (rikishiById.get(o.formerRikishiId) ?? histById.get(o.formerRikishiId))
      : undefined;
    if (!isV2Identity(o.avatarConfig)) {
      // Nationality backfill: the former wrestler's birth nationality drives
      // cosmetic features only — JSA citizenship for toshiyori is mandatory.
      o.avatarConfig = generateAvatarIdentity({
        seed: o.formerRikishiId ?? o.id,
        nationality: former?.nationality ?? "Japan",
        role: "oyakata",
      });
    }
    // Cosmetic weight backfill: the former wrestler's real build when his
    // record is still around, else a plausible seeded elder weight (110-175kg).
    if (o.weight == null) {
      o.weight = former?.weight ?? seedInt(o.formerRikishiId ?? o.id, "elder-weight", 110, 175);
    }
  }

  for (const s of valuesOf(world.staff)) {
    if (!isV2Identity(s.avatarConfig)) {
      s.avatarConfig = generateAvatarIdentity({
        seed: s.id,
        nationality: "Japan",
        role: "staff",
      });
    }
  }

  for (const g of world.gyojiPool ?? []) {
    if (!isV2Identity(g.avatarConfig)) {
      g.avatarConfig = generateAvatarIdentity({
        seed: g.id,
        nationality: "Japan",
        role: "gyoji",
      });
    }
  }

  for (const s of world.shimpanPool ?? []) {
    if (!isV2Identity(s.avatarConfig)) {
      s.avatarConfig = generateAvatarIdentity({
        seed: s.id,
        nationality: "Japan",
        role: "shimpan",
      });
    }
  }

  for (const pool of [world.talentPool, world.candidatePool]) {
    for (const c of Object.values(pool?.candidates ?? {})) {
      if (!isV2Identity(c.avatarConfig)) {
        c.avatarConfig = generateAvatarIdentity({
          seed: c.personId,
          nationality: c.nationality ?? "Japan",
          role: "prospect",
        });
      }
    }
  }

  for (const h of valuesOf(world.heyas)) {
    const academy = h.youthAcademy;
    if (!academy) continue;
    for (const p of academy.prospects ?? []) {
      if (!isV2Identity(p.avatarConfig)) {
        p.avatarConfig = generateAvatarIdentity({
          seed: p.id,
          nationality: nationalityFromRegion(p.region),
          role: "prospect",
        });
      }
    }
    for (const s of academy.staff ?? []) {
      if (!isV2Identity(s.avatarConfig)) {
        s.avatarConfig = generateAvatarIdentity({
          seed: s.id,
          nationality: "Japan",
          role: "staff",
        });
      }
    }
  }
}

export function rikishiStageInput(r: Rikishi, currentYear: number): AvatarStageInput {
  return {
    role: "rikishi",
    age: r.age ?? currentYear - r.birthYear,
    division: r.division,
    rank: r.rank,
    weight: r.weight,
    injured: r.injured || r.isKyujo,
    glasses: r.quirks?.glasses != null,
    aggression: r.stats?.aggression,
    momentum: r.momentum,
    isRetired: r.isRetired,
  };
}

export function oyakataStageInput(o: Oyakata): AvatarStageInput {
  return { role: "oyakata", age: o.age, weight: o.weight };
}

/** Compact summaries keep `birthYear`/`weight`; age advances with the world clock. */
export function retiredSummaryStageInput(
  s: Pick<RetiredRikishiSummary, "birthYear" | "weight">,
  currentYear: number
): AvatarStageInput {
  return {
    role: "rikishi",
    age: currentYear - s.birthYear,
    isRetired: true,
    weight: s.weight,
  };
}

export function staffStageInput(s: Staff): AvatarStageInput {
  return { role: "staff", age: s.age, staffRole: s.role };
}

export function academyStaffStageInput(s: AcademyStaff): AvatarStageInput {
  return { role: "staff", age: s.age ?? 40, staffRole: s.role };
}

export function gyojiStageInput(g: Gyoji): AvatarStageInput {
  return { role: "gyoji", age: g.age ?? 35 + g.yearsActive, gyojiRank: g.rank };
}

export function shimpanStageInput(s: Shimpan): AvatarStageInput {
  return { role: "shimpan", age: s.age ?? 40 + s.yearsActive };
}

export function prospectStageInput(p: { age?: number; weight?: number }): AvatarStageInput {
  return { role: "prospect", age: p.age ?? 17, weight: p.weight };
}

export function candidateStageInput(c: TalentCandidate, currentYear: number): AvatarStageInput {
  return {
    role: "prospect",
    age: currentYear - c.birthYear,
    weight: c.weightPotentialKg,
  };
}
