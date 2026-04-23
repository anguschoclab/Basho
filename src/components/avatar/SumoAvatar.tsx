/**
 * SumoAvatar.tsx
 * Procedural SVG avatar component for sumo wrestlers, oyakata, and staff.
 */

import React from "react";
import type { AvatarConfig } from "@/engine/types/avatar";
import { cn } from "@/lib/utils";

interface SumoAvatarProps {
  config?: AvatarConfig;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  animate?: boolean;
  showHairstyle?: boolean;
  expression?: "neutral" | "determined" | "confident" | "intense";
  fallback?: string; // Initials fallback
  rankTier?: string;
  showGlow?: boolean;
}

const SIZE_MAP: Record<string, number> = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 80,
  xl: 120,
};

const RANK_BORDER_COLORS: Record<string, string> = {
  yokozuna: "border-gold",
  ozeki: "border-muted-foreground",
  sekiwake: "border-gold",
  komusubi: "border-gold",
  maegashira: "border-west",
  juryo: "border-west",
  makushita: "border-success",
  sandanme: "border-warning",
  jonidan: "border-primary",
  jonokuchi: "border-muted-foreground",
};

// Helper to lighten a hex color
const lightenColor = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
};

export const SumoAvatar: React.FC<SumoAvatarProps> = ({
  config,
  size = "md",
  className,
  animate,
  showHairstyle = true,
  expression,
  fallback,
  rankTier,
  showGlow,
}) => {
  const pixelSize = SIZE_MAP[size];

  // Fallback to initials if no config
  if (!config) {
    return (
      <div
        className={cn(
          "rounded bg-muted flex items-center justify-center font-bold text-muted-foreground shrink-0",
          className
        )}
        style={{
          width: pixelSize,
          height: pixelSize,
          fontSize: pixelSize * 0.4,
        }}
      >
        {fallback?.slice(0, 2) ?? "?"}
      </div>
    );
  }

  // Determine expression override or from config
  const finalExpression = expression ?? config.expression;

  // Calculate stroke width based on size
  const strokeWidth = size === "xs" ? 1.5 : size === "sm" ? 2 : 2.5;

  // Calculate eye positions based on eye type
  const eyeRadius = config.eyeType === "wide" ? 5 : config.eyeType === "narrow" ? 3 : 4;
  const eyeY = 42;
  const leftEyeX = 35;
  const rightEyeX = 65;

  // Calculate brow positions based on brow type and expression
  const getBrowPath = (isLeft: boolean) => {
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

  // Calculate mouth based on mouth type and expression
  const getMouthPath = () => {
    if (finalExpression === "confident" || config.mouthType === "smile") {
      return "M35,68 Q50,75 65,68"; // Smile
    } else if (finalExpression === "intense" || config.mouthType === "determined") {
      return "M35,70 L65,70"; // Determined line
    }
    return "M40,70 Q50,72 60,70"; // Neutral slight curve
  };

  // Hair color with graying effect
  const getHairColor = () => {
    if (config.hairGraying > 70) return "#e0e0e0"; // White
    if (config.hairGraying > 40) return "#6b6b6b"; // Gray
    return config.hairColor;
  };

  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 100 100"
      className={cn(
        "rounded overflow-hidden shrink-0",
        animate && "avatar-animate",
        rankTier && RANK_BORDER_COLORS[rankTier] && `border-2 ${RANK_BORDER_COLORS[rankTier]}`,
        showGlow && "avatar-glow",
        className
      )}
    >
      <defs>
        {/* Face gradient for 3D effect */}
        <radialGradient id={`faceGradient-${config.seed}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={lightenColor(config.skinTone, 15)} />
          <stop offset="70%" stopColor={config.skinTone} />
          <stop offset="100%" stopColor={lightenColor(config.skinTone, -10)} />
        </radialGradient>
        {/* Shadow filter */}
        <filter id={`shadow-${config.seed}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Face base with gradient */}
      <circle
        cx="50"
        cy="55"
        r="40"
        fill={`url(#faceGradient-${config.seed})`}
        stroke="#1a1a1a"
        strokeWidth={strokeWidth}
        filter={`url(#shadow-${config.seed})`}
      />

      {/* Ears */}
      <ellipse
        cx="12"
        cy="55"
        rx="6"
        ry="10"
        fill={config.skinTone}
        stroke="#1a1a1a"
        strokeWidth="1.5"
      />
      <ellipse
        cx="88"
        cy="55"
        rx="6"
        ry="10"
        fill={config.skinTone}
        stroke="#1a1a1a"
        strokeWidth="1.5"
      />

      {/* Eyes with highlights */}
      <g fill="#1a1a1a">
        <circle cx={leftEyeX} cy={eyeY} r={eyeRadius} />
        <circle cx={rightEyeX} cy={eyeY} r={eyeRadius} />
      </g>
      {/* Eye highlights for life-like appearance */}
      <g fill="#ffffff" opacity="0.6">
        <circle cx={leftEyeX - 1} cy={eyeY - 1} r={eyeRadius * 0.3} />
        <circle cx={rightEyeX - 1} cy={eyeY - 1} r={eyeRadius * 0.3} />
      </g>

      {/* Eyebrows */}
      <g stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round">
        <path d={getBrowPath(true)} />
        <path d={getBrowPath(false)} />
      </g>

      {/* Nose */}
      <ellipse
        cx="50"
        cy="52"
        rx={config.noseType === "broad" ? 8 : config.noseType === "small" ? 4 : 6}
        ry={config.noseType === "small" ? 3 : 5}
        fill={config.skinTone}
        stroke="#c4987a"
        strokeWidth="1"
      />

      {/* Mouth */}
      <path d={getMouthPath()} stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Wrinkles (if veteran/elder) */}
      {config.wrinkles > 20 && (
        <g stroke="#c4987a" strokeWidth="1" opacity={config.wrinkles / 150}>
          {/* Forehead lines */}
          <path d="M30,28 Q50,32 70,28" fill="none" />
          {config.wrinkles > 40 && <path d="M32,22 Q50,26 68,22" fill="none" />}
          {/* Eye crow's feet */}
          <path d="M22,42 L18,40 M22,45 L18,47" strokeLinecap="round" />
          <path d="M78,42 L82,40 M78,45 L82,47" strokeLinecap="round" />
        </g>
      )}

      {/* Hairstyle */}
      {showHairstyle && (
        <g>
          {/* Hair base - shaved sides */}
          <path
            d="M15,45 Q15,15 50,12 Q85,15 85,45"
            fill={getHairColor()}
            stroke="#1a1a1a"
            strokeWidth="1"
          />

          {/* Topknot styles */}
          {config.hairstyle === "oichomage" && (
            <g>
              {/* Oichomage - ginkgo leaf style with split */}
              <ellipse
                cx="50"
                cy="18"
                rx="14"
                ry="10"
                fill={getHairColor()}
                stroke="#1a1a1a"
                strokeWidth="1"
              />
              {/* The distinctive ginkgo split */}
              <path
                d="M42,12 Q35,5 40,2 M58,12 Q65,5 60,2"
                stroke={getHairColor()}
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
              {/* Red cord (tasuki) */}
              <rect x="46" y="22" width="8" height="4" fill="#8b0000" rx="1" />
            </g>
          )}

          {config.hairstyle === "chonmage" && (
            <g>
              {/* Standard chonmage - simple topknot */}
              <ellipse
                cx="50"
                cy="16"
                rx="10"
                ry="8"
                fill={getHairColor()}
                stroke="#1a1a1a"
                strokeWidth="1"
              />
              {/* Black cord */}
              <rect x="47" y="20" width="6" height="3" fill="#1a1a1a" rx="1" />
            </g>
          )}

          {config.hairstyle === "retired" && (
            <g>
              {/* Retired - short hair, no topknot */}
              <ellipse
                cx="50"
                cy="25"
                rx="20"
                ry="12"
                fill={getHairColor()}
                stroke="#1a1a1a"
                strokeWidth="1"
              />
            </g>
          )}

          {config.hairstyle === "oyakata" && (
            <g>
              {/* Oyakata - simplified chonmage, often grayer */}
              <ellipse
                cx="50"
                cy="18"
                rx="9"
                ry="7"
                fill={getHairColor()}
                stroke="#1a1a1a"
                strokeWidth="1"
              />
              {/* Red cord for formal */}
              <circle cx="50" cy="24" r="3" fill="#8b0000" />
            </g>
          )}
        </g>
      )}

      {/* Face shape variations */}
      {config.faceShape === "round" && (
        <ellipse
          cx="50"
          cy="62"
          rx="25"
          ry="20"
          fill="none"
          stroke="#c4987a"
          strokeWidth="0.5"
          opacity="0.3"
        />
      )}
      {config.faceShape === "broad" && (
        <ellipse
          cx="50"
          cy="60"
          rx="30"
          ry="22"
          fill="none"
          stroke="#c4987a"
          strokeWidth="0.5"
          opacity="0.3"
        />
      )}
    </svg>
  );
};

export default SumoAvatar;
