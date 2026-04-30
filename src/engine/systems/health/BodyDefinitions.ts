/**
 * BodyDefinitions.ts — Reference tables for body parts, injury types, and recovery.
 */

export type InjurySeverity = "minor" | "moderate" | "serious" | "none";

export type InjuryBodyArea =
  | "shoulder"
  | "elbow"
  | "wrist"
  | "back"
  | "hip"
  | "knee"
  | "ankle"
  | "neck"
  | "rib"
  | "other";

export type InjuryType =
  | "sprain"
  | "strain"
  | "contusion"
  | "inflammation"
  | "tear"
  | "fracture"
  | "nerve"
  | "unknown"
  | "none";

export const BODY_AREA_LABELS: Record<InjuryBodyArea, string> = {
  shoulder: "Shoulder",
  elbow: "Elbow",
  wrist: "Wrist",
  back: "Back",
  hip: "Hip",
  knee: "Knee",
  ankle: "Ankle",
  neck: "Neck",
  rib: "Ribs",
  other: "Body",
};

export const INJURY_TYPE_LABELS: Record<InjuryType, string> = {
  sprain: "Sprain",
  strain: "Strain",
  contusion: "Contusion",
  inflammation: "Inflammation",
  tear: "Tear",
  fracture: "Fracture",
  nerve: "Nerve Issue",
  unknown: "Injury",
  none: "None",
};

/**
 * Baseline recovery weeks by severity and area.
 */
export function getBaseWeeksOut(
  severity: InjurySeverity,
  area: InjuryBodyArea,
  type: InjuryType
): { min: number; max: number } {
  let min = 1,
    max = 2;
  if (severity === "moderate") {
    min = 2;
    max = 5;
  }
  if (severity === "serious") {
    min = 6;
    max = 13;
  }

  // Area adjustments
  if (area === "knee" || area === "back") {
    min += 1;
    max += 2;
  }

  // Type adjustments
  if (type === "fracture") {
    min += 3;
    max += 5;
  }
  if (type === "tear" || type === "nerve") {
    min += 2;
    max += 4;
  }

  return { min, max };
}
