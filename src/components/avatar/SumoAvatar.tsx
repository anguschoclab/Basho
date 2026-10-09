/**
 * SumoAvatar.tsx
 * Procedural SVG avatar component for sumo wrestlers, oyakata, and staff.
 * Sub-renderers live in ./AvatarParts.tsx.
 */

import { memo } from "react";
import type { AvatarConfig } from "@/engine/types/avatar";
import { cn } from "@/lib/utils";
import type { AvatarExpression } from "./avatarGeometry";
import {
  AvatarFallback,
  AvatarDefs,
  AvatarHairstyle,
  AvatarFaceDetails,
} from "./AvatarParts";

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

export const SumoAvatar = memo(function SumoAvatar({
  config,
  size = "md",
  className,
  animate,
  showHairstyle = true,
  expression,
  fallback,
  rankTier,
  showGlow,
}: SumoAvatarProps) {
  const pixelSize = SIZE_MAP[size];

  // Fallback to initials if no config
  if (!config) {
    return <AvatarFallback pixelSize={pixelSize} className={className} fallback={fallback} />;
  }

  // Determine expression override or from config
  const finalExpression: AvatarExpression | undefined = expression ?? config.expression;

  // Calculate stroke width based on size
  const strokeWidth = size === "xs" ? 1.5 : size === "sm" ? 2 : 2.5;

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
      <AvatarDefs config={config} />

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

      {/* Ears, eyes, brows, nose, mouth, wrinkles, face shape */}
      <AvatarFaceDetails config={config} finalExpression={finalExpression} />

      {/* Hairstyle */}
      {showHairstyle && <AvatarHairstyle config={config} />}
    </svg>
  );
});
