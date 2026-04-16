/**
 * Avatar Types
 * Procedural avatar configuration for rikishi, oyakata, and staff.
 */

export interface AvatarConfig {
  seed: string;
  faceShape: "round" | "oval" | "square" | "broad";
  eyeType: "standard" | "narrow" | "wide";
  browType: "straight" | "furrowed" | "arched";
  noseType: "small" | "medium" | "broad";
  mouthType: "neutral" | "smile" | "determined";
  skinTone: string; // hex color
  skinToneKey:
    | "japan"
    | "mongolia"
    | "georgia"
    | "russia"
    | "bulgaria"
    | "estonia"
    | "brazil"
    | "hawaii"
    | "usa";
  hairColor: string; // hex color
  hairGraying: number; // 0-100, percentage gray
  hairstyle: "chonmage" | "oichomage" | "retired" | "oyakata";
  expression: "neutral" | "determined" | "confident" | "intense";
  ageStage: "teen" | "young" | "prime" | "veteran" | "elder";
  wrinkles: number; // 0-100
}

export interface AvatarGenerationParams {
  seed: string;
  nationality: string;
  age: number;
  isSekitori: boolean;
  isRetired?: boolean;
  isOyakata?: boolean;
}

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
};

export const HAIR_COLORS = {
  black: "#1a1a1a",
  darkBrown: "#2d2416",
  gray: "#6b6b6b",
  white: "#e0e0e0",
};
