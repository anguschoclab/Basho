/**
 * AvatarParts.tsx
 *
 * Sub-renderers of SumoAvatar — initials fallback, SVG defs (face gradient +
 * shadow filter), hairstyle group, and the facial-geometry path helpers.
 */

import type { AvatarConfig } from "@/engine/types/avatar";
import { cn } from "@/lib/utils";
import {
  type AvatarExpression,
  getBrowPath,
  getMouthPath,
  getHairColor,
  lightenColor,
} from "./avatarGeometry";
import { AVATAR_COLORS } from "@/constants/ui/drawingPalette";

/** Initials fallback when no config is supplied. */
export function AvatarFallback({
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

/** SVG defs — face gradient for 3D effect and drop-shadow filter. */
export function AvatarDefs({ config }: { config: AvatarConfig }) {
  return (
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
  );
}

/** Hairstyle group — shaved-side base plus per-style topknot. */
export function AvatarHairstyle({ config }: { config: AvatarConfig }) {
  return (
    <g>
      {/* Hair base - shaved sides */}
      <path
        d="M15,45 Q15,15 50,12 Q85,15 85,45"
        fill={getHairColor(config)}
        stroke={AVATAR_COLORS.ink}
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
            fill={getHairColor(config)}
            stroke={AVATAR_COLORS.ink}
            strokeWidth="1"
          />
          {/* The distinctive ginkgo split */}
          <path
            d="M42,12 Q35,5 40,2 M58,12 Q65,5 60,2"
            stroke={getHairColor(config)}
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          {/* Red cord (tasuki) */}
          <rect x="46" y="22" width="8" height="4" fill={AVATAR_COLORS.mouthAccent} rx="1" />
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
            fill={getHairColor(config)}
            stroke={AVATAR_COLORS.ink}
            strokeWidth="1"
          />
          {/* Black cord */}
          <rect x="47" y="20" width="6" height="3" fill={AVATAR_COLORS.ink} rx="1" />
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
            fill={getHairColor(config)}
            stroke={AVATAR_COLORS.ink}
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
            fill={getHairColor(config)}
            stroke={AVATAR_COLORS.ink}
            strokeWidth="1"
          />
          {/* Red cord for formal */}
          <circle cx="50" cy="24" r="3" fill={AVATAR_COLORS.mouthAccent} />
        </g>
      )}
    </g>
  );
}

/** Face detail group — ears, eyes, brows, nose, mouth, wrinkles, face shape. */
export function AvatarFaceDetails({
  config,
  finalExpression,
}: {
  config: AvatarConfig;
  finalExpression: AvatarExpression | undefined;
}) {
  // Calculate eye positions based on eye type
  const eyeRadius = config.eyeType === "wide" ? 5 : config.eyeType === "narrow" ? 3 : 4;
  const eyeY = 42;
  const leftEyeX = 35;
  const rightEyeX = 65;

  return (
    <>
      {/* Ears */}
      <ellipse
        cx="12"
        cy="55"
        rx="6"
        ry="10"
        fill={config.skinTone}
        stroke={AVATAR_COLORS.ink}
        strokeWidth="1.5"
      />
      <ellipse
        cx="88"
        cy="55"
        rx="6"
        ry="10"
        fill={config.skinTone}
        stroke={AVATAR_COLORS.ink}
        strokeWidth="1.5"
      />

      {/* Eyes with highlights */}
      <g fill={AVATAR_COLORS.ink}>
        <circle cx={leftEyeX} cy={eyeY} r={eyeRadius} />
        <circle cx={rightEyeX} cy={eyeY} r={eyeRadius} />
      </g>
      {/* Eye highlights for life-like appearance */}
      <g fill={AVATAR_COLORS.paper} opacity="0.6">
        <circle cx={leftEyeX - 1} cy={eyeY - 1} r={eyeRadius * 0.3} />
        <circle cx={rightEyeX - 1} cy={eyeY - 1} r={eyeRadius * 0.3} />
      </g>

      {/* Eyebrows */}
      <g stroke={AVATAR_COLORS.ink} strokeWidth="3" fill="none" strokeLinecap="round">
        <path d={getBrowPath(true, config, finalExpression)} />
        <path d={getBrowPath(false, config, finalExpression)} />
      </g>

      {/* Nose */}
      <ellipse
        cx="50"
        cy="52"
        rx={config.noseType === "broad" ? 8 : config.noseType === "small" ? 4 : 6}
        ry={config.noseType === "small" ? 3 : 5}
        fill={config.skinTone}
        stroke={AVATAR_COLORS.skinShadow}
        strokeWidth="1"
      />

      {/* Mouth */}
      <path
        d={getMouthPath(config, finalExpression)}
        stroke={AVATAR_COLORS.ink}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />

      {/* Wrinkles (if veteran/elder) */}
      {config.wrinkles > 20 && (
        <g stroke={AVATAR_COLORS.skinShadow} strokeWidth="1" opacity={config.wrinkles / 150}>
          {/* Forehead lines */}
          <path d="M30,28 Q50,32 70,28" fill="none" />
          {config.wrinkles > 40 && <path d="M32,22 Q50,26 68,22" fill="none" />}
          {/* Eye crow's feet */}
          <path d="M22,42 L18,40 M22,45 L18,47" strokeLinecap="round" />
          <path d="M78,42 L82,40 M78,45 L82,47" strokeLinecap="round" />
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
          stroke={AVATAR_COLORS.skinShadow}
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
          stroke={AVATAR_COLORS.skinShadow}
          strokeWidth="0.5"
          opacity="0.3"
        />
      )}
    </>
  );
}
