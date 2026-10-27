/**
 * SumoAvatar.tsx
 * Pixel-art avatar component (24×24) for rikishi, oyakata, staff, and officials.
 * Compose runs in ./pixelCompose.ts; sprites in ./pixelAtlas.ts.
 */

import { memo, useMemo } from "react";
import type {
  AvatarIdentity,
  AvatarStage,
  AvatarRenderData,
  AvatarExpression,
} from "@/engine/types/avatar";
import { deriveAvatarStage } from "@/presenters/avatarProjections";
import { composeAvatar } from "@/components/avatar/pixelCompose";
import { cn } from "@/lib/utils";

interface SumoAvatarProps {
  /** Resolved {identity, stage} pair from a presenter — preferred. */
  avatar?: AvatarRenderData;
  /** Stored identity; renders with `stage` prop or a default stage. */
  config?: AvatarIdentity;
  /** Optional stage to combine with `config`. */
  stage?: AvatarStage;
  /** Expression override applied on top of the resolved stage. */
  expression?: AvatarExpression;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  animate?: boolean;
  fallback?: string;
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

function AvatarFallback({
  pixelSize,
  className,
  fallback,
}: {
  pixelSize: number;
  className?: string;
  fallback?: string;
}) {
  return (
    <div
      data-avatar
      aria-hidden="true"
      className={cn(
        "rounded bg-muted flex items-center justify-center font-bold text-muted-foreground shrink-0",
        className
      )}
      style={{ width: pixelSize, height: pixelSize, fontSize: pixelSize * 0.4 }}
    >
      {fallback?.slice(0, 2) ?? "?"}
    </div>
  );
}

export const SumoAvatar = memo(function SumoAvatar({
  avatar,
  config,
  stage,
  expression,
  size = "md",
  className,
  animate,
  fallback,
  rankTier,
  showGlow,
}: SumoAvatarProps) {
  const pixelSize = SIZE_MAP[size];

  const identity = avatar?.identity ?? config;
  let resolvedStage =
    avatar?.stage ?? stage ?? (identity ? deriveAvatarStage({}, identity) : undefined);
  if (expression && resolvedStage && resolvedStage.expression !== expression) {
    resolvedStage = { ...resolvedStage, expression };
  }

  const paths = useMemo(
    () => (identity && resolvedStage ? composeAvatar(identity, resolvedStage) : null),
    [identity, resolvedStage]
  );

  if (!identity || !paths) {
    return <AvatarFallback pixelSize={pixelSize} className={className} fallback={fallback} />;
  }

  return (
    <svg
      data-avatar
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 24 24"
      shapeRendering="crispEdges"
      role="img"
      className={cn(
        "rounded overflow-hidden shrink-0",
        animate && "avatar-animate",
        rankTier && RANK_BORDER_COLORS[rankTier] && `border-2 ${RANK_BORDER_COLORS[rankTier]}`,
        showGlow && "avatar-glow",
        className
      )}
    >
      {[...paths.entries()].map(([hex, d]) => (
        <path key={hex} d={d} fill={hex} />
      ))}
    </svg>
  );
});
