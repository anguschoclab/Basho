/**
 * avatarGeometry.ts
 *
 * Facial-geometry helpers for SumoAvatar — brow/mouth SVG paths, hair color
 * with graying, and hex lightening.
 */

import type { AvatarConfig } from "@/engine/types/avatar";
import { AVATAR_COLORS } from "@/constants/ui/drawingPalette";

export type AvatarExpression = "neutral" | "determined" | "confident" | "intense";

/** Helper to lighten a hex color */
export const lightenColor = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
};

/** Calculate brow positions based on brow type and expression */
export const getBrowPath = (
  isLeft: boolean,
  config: AvatarConfig,
  finalExpression: AvatarExpression | undefined
) => {
  const baseX = isLeft ? 35 : 65;
  const direction = isLeft ? -1 : 1;

  if (config.browType === "furrowed" || finalExpression === "intense") {
    // Furrowed brows - angry/determined
    return `M${baseX - 10 * direction},35 Q${baseX},40 ${baseX + 10 * direction},38`;
  } else if (config.browType === "arched" || finalExpression === "confident") {
    // Arched brows - confident
    return `M${baseX - 10 * direction},38 Q${baseX},32 ${baseX + 10 * direction},38`;
  }
  // Straight brows - neutral
  return `M${baseX - 10 * direction},35 Q${baseX},35 ${baseX + 10 * direction},35`;
};

/** Calculate mouth based on mouth type and expression */
export const getMouthPath = (
  config: AvatarConfig,
  finalExpression: AvatarExpression | undefined
) => {
  if (finalExpression === "confident" || config.mouthType === "smile") {
    return "M35,68 Q50,75 65,68"; // Smile
  } else if (finalExpression === "intense" || config.mouthType === "determined") {
    return "M35,70 L65,70"; // Determined line
  }
  return "M40,70 Q50,72 60,70"; // Neutral slight curve
};

/** Hair color with graying effect */
export const getHairColor = (config: AvatarConfig) => {
  if (config.hairGraying > 70) return AVATAR_COLORS.hairWhite; // White
  if (config.hairGraying > 40) return AVATAR_COLORS.hairGray; // Gray
  return config.hairColor;
};
