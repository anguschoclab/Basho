/**
 * AvatarStack Component
 * Displays overlapping avatars (like a card deck) for showing multiple rikishi compactly
 * Perfect for "Top 3" displays, "Multiple injuries", or "Group achievements"
 */

import React from "react";
import { SumoAvatar } from "./SumoAvatar";
import type { AvatarConfig } from "@/engine/types/avatar";
import { cn } from "@/lib/utils";

interface AvatarStackProps {
  configs: (AvatarConfig | undefined)[];
  size?: "xs" | "sm" | "md" | "lg";
  maxDisplay?: number;
  className?: string;
  showHairstyle?: boolean;
  overlap?: number;
}

export const AvatarStack: React.FC<AvatarStackProps> = ({
  configs,
  size = "sm",
  maxDisplay = 5,
  className,
  showHairstyle = true,
  overlap = 0.7, // 70% overlap (30% visible of each subsequent avatar)
}) => {
  const displayConfigs = configs.slice(0, maxDisplay);
  const remaining = configs.length - maxDisplay;

  // Calculate sizes based on avatar size
  const sizeMap = {
    xs: 24,
    sm: 32,
    md: 48,
    lg: 80,
  };
  const baseSize = sizeMap[size];
  const offset = baseSize * (1 - overlap);

  return (
    <div
      className={cn("flex items-center", className)}
      style={{
        // Total width = base size + (n-1) * offset
        width: baseSize + (displayConfigs.length - 1) * offset,
      }}
    >
      {displayConfigs.map((config, index) => (
        <div
          key={config?.seed || index}
          className="relative transition-transform hover:scale-110 hover:z-10"
          style={{
            marginLeft: index === 0 ? 0 : -baseSize * overlap,
            zIndex: displayConfigs.length - index,
          }}
        >
          <SumoAvatar
            config={config}
            size={size}
            showHairstyle={showHairstyle}
            className="border-2 border-background shadow-md"
          />
        </div>
      ))}
      {remaining > 0 && (
        <div
          className="relative flex items-center justify-center rounded-full bg-muted border-2 border-background shadow-md"
          style={{
            width: baseSize,
            height: baseSize,
            marginLeft: -baseSize * overlap,
            zIndex: 0,
          }}
        >
          <span className="text-xs font-bold text-muted-foreground">+{remaining}</span>
        </div>
      )}
    </div>
  );
};

export default AvatarStack;
