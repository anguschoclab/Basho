/**
 * AvatarWithBadge Component
 * Avatar with overlaid status/achievement badges
 * Perfect for showing rikishi status at a glance
 */

import React from "react";
import { SumoAvatar } from "./SumoAvatar";
import type { AvatarConfig } from "@/engine/types/avatar";
import { cn } from "@/lib/utils";
import { Crown, Trophy, Star, AlertCircle, Dumbbell, Heart, Medal } from "lucide-react";

type BadgeType =
  | "yokozuna"
  | "champion"
  | "kinboshi"
  | "injured"
  | "training"
  | "resting"
  | "fan-favorite"
  | "rising-star";

interface AvatarWithBadgeProps {
  config?: AvatarConfig;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  badge?: BadgeType;
  showHairstyle?: boolean;
  expression?: "neutral" | "determined" | "confident" | "intense";
  fallback?: string;
  className?: string;
  rankTier?: string;
}

const BADGE_CONFIG: Record<BadgeType, { icon: React.ElementType; color: string; bg: string }> = {
  yokozuna: { icon: Crown, color: "text-gold", bg: "bg-gold/20" },
  champion: { icon: Trophy, color: "text-gold", bg: "bg-gold/20" },
  kinboshi: { icon: Star, color: "text-west", bg: "bg-west/20" },
  injured: { icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/20" },
  training: { icon: Dumbbell, color: "text-success", bg: "bg-success/20" },
  resting: { icon: Heart, color: "text-primary", bg: "bg-primary/20" },
  "fan-favorite": { icon: Heart, color: "text-primary", bg: "bg-primary/20" },
  "rising-star": { icon: Medal, color: "text-primary", bg: "bg-primary/20" },
};

export const AvatarWithBadge: React.FC<AvatarWithBadgeProps> = ({
  config,
  size = "md",
  badge,
  showHairstyle = true,
  expression,
  fallback,
  className,
  rankTier,
}) => {
  const sizeMap = {
    xs: 24,
    sm: 32,
    md: 48,
    lg: 80,
    xl: 120,
  };
  const baseSize = sizeMap[size];

  // Badge size is 1/3 of avatar size
  const badgeSize = Math.max(12, Math.floor(baseSize / 3));

  const badgeConfig = badge ? BADGE_CONFIG[badge] : null;
  const BadgeIcon = badgeConfig?.icon;

  return (
    <div className={cn("relative inline-block", className)}>
      <SumoAvatar
        config={config}
        size={size}
        showHairstyle={showHairstyle}
        expression={expression}
        fallback={fallback}
        rankTier={rankTier}
      />
      {badgeConfig && BadgeIcon && (
        <div
          className={cn(
            "absolute -bottom-1 -right-1 rounded-full flex items-center justify-center border-2 border-background shadow-sm",
            badgeConfig.bg,
            badgeConfig.color
          )}
          style={{
            width: badgeSize,
            height: badgeSize,
          }}
          title={badge?.replace("-", " ")}
        >
          <BadgeIcon className="w-2/3 h-2/3" />
        </div>
      )}
    </div>
  );
};

export default AvatarWithBadge;
