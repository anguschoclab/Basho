/**
 * Avatar Types (v2 — pixel-art)
 *
 * Two-part model:
 *  - `AvatarIdentity` — permanent, seeded features stored on the entity
 *    (`avatarConfig`). Never mutated after creation; survives role changes
 *    (retiree → oyakata keeps their face).
 *  - `AvatarStage` — derived at render/presenter time from live entity state
 *    (age, rank, weight, injury, quirks). Never stored: promotions, aging,
 *    and weight gain flow through automatically.
 */

import type { Division, Rank } from "./banzuke";
import type { StaffRole } from "./staff";
import type { GyojiRank } from "./gyoji";

export const AVATAR_VERSION = 2;

export type AvatarRole = "rikishi" | "oyakata" | "staff" | "gyoji" | "shimpan" | "prospect";

export type HeadShape = "full" | "round" | "oval" | "square" | "broad" | "long";
export type EyeStyle = "standard" | "narrow" | "wide" | "deepset" | "upturned";
export type BrowStyle = "straight" | "furrowed" | "arched" | "sparse";
export type NoseStyle = "small" | "medium" | "broad" | "flat" | "hooked";
export type MouthStyle = "neutral" | "smile" | "frown" | "pursed" | "open" | "flat";
export type EarStyle = "small" | "medium" | "large" | "cauliflower";
export type FacialMark = "none" | "scar" | "mole" | "freckles" | "acne";
export type FacialHair = "none" | "mustache" | "goatee" | "full";
export type Hairstyle = "shaved" | "chonmage" | "oichomage" | "short" | "receding" | "bald";
export type AvatarExpression = "neutral" | "determined" | "confident" | "intense" | "worried";
export type AvatarAttire =
  | "bare"
  | "kimono"
  | "suit"
  | "tracksuit"
  | "coat"
  | "polo"
  | "shirt"
  | "apron"
  | "gyoji_tate"
  | "gyoji_sanyaku"
  | "gyoji_standard"
  | "shimpan";

/** Permanent seeded features. Stored on entities as `avatarConfig`. */
export interface AvatarIdentity {
  version: 2;
  seed: string;
  role: AvatarRole;
  headShape: HeadShape;
  eyes: EyeStyle;
  brows: BrowStyle;
  browThickness: 1 | 2 | 3;
  nose: NoseStyle;
  mouth: MouthStyle;
  ears: EarStyle;
  skinTone: string;
  hairColor: string;
  mark: FacialMark;
  facialHair: FacialHair;
}

/** Back-compat alias — `avatarConfig` fields hold an AvatarIdentity. */
export type AvatarConfig = AvatarIdentity;

export interface AvatarGenerationParams {
  seed: string;
  nationality: string;
  role: AvatarRole;
}

/** Everything a presenter/component knows about the entity right now. */
export interface AvatarStageInput {
  role?: AvatarRole;
  age?: number;
  division?: Division;
  rank?: Rank;
  weight?: number;
  injured?: boolean;
  glasses?: boolean;
  aggression?: number;
  momentum?: number;
  staffRole?: StaffRole | string;
  gyojiRank?: GyojiRank;
  isRetired?: boolean;
  expression?: AvatarExpression;
  /** Hex color override for attire accents (e.g. kesho-mawashi preview). */
  attireOverride?: string;
  /** Hex color for the portrait backdrop. */
  backdropTone?: string;
}

/** Derived-at-render appearance. Never persisted. */
export interface AvatarStage {
  role: AvatarRole;
  ageStage: "teen" | "young" | "prime" | "veteran" | "elder";
  graying: 0 | 1 | 2;
  wrinkleTier: 0 | 1 | 2 | 3;
  hairstyle: Hairstyle;
  /** Face/neck/shoulder girth derived from body weight. */
  fullness: 0 | 1 | 2;
  glasses: boolean;
  bandage: boolean;
  attire: AvatarAttire;
  /** Yokozuna ceremonial rope accent. */
  tsuna: boolean;
  expression: AvatarExpression;
  attireOverride?: string;
  backdropTone?: string;
}

export interface AvatarRenderData {
  identity: AvatarIdentity;
  stage: AvatarStage;
}

/** Nationality → skin tone ranges (3-stop gradient per origin region). */
export const NATIONALITY_SKIN_TONES: Record<string, { base: string; range: [string, string] }> = {
  japan: { base: "#F5D0A9", range: ["#F5D0A9", "#E8B89D"] },
  mongolia: { base: "#D4A574", range: ["#D4A574", "#C68E5F"] },
  georgia: { base: "#E5C298", range: ["#E5C298", "#D4A574"] },
  russia: { base: "#F5D0A9", range: ["#F5D0A9", "#E8B89D"] },
  bulgaria: { base: "#E5C298", range: ["#E5C298", "#D4A574"] },
  estonia: { base: "#F5D0A9", range: ["#F5D0A9", "#E8B89D"] },
  brazil: { base: "#D4A574", range: ["#E8B89D", "#A67B5B"] },
  hawaii: { base: "#D4A574", range: ["#E8B89D", "#A67B5B"] },
  usa: { base: "#E5C298", range: ["#F5D0A9", "#A67B5B"] },
  kazakhstan: { base: "#D4A574", range: ["#D4A574", "#C68E5F"] },
  egypt: { base: "#C68E5F", range: ["#D4A574", "#A67B5B"] },
};

export const HAIR_COLORS = {
  black: "#1a1a1a",
  darkBrown: "#2d2416",
  brown: "#4a3520",
  gray: "#6b6b6b",
  white: "#e0e0e0",
};
