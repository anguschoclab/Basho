/**
 * KanjiTile.tsx
 * =============
 * Large decorative kanji character for HeroDossier accent.
 * tone: "gold" | "vermillion" | "indigo"
 */

import { cn } from "@/lib/utils";

interface KanjiTileProps {
  char: string;
  tone?: "gold" | "vermillion" | "indigo";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const TONE_CLASSES: Record<string, string> = {
  gold: "text-gold rank-shimmer",
  vermillion: "text-east",
  indigo: "text-west",
};

const SIZE_CLASSES: Record<string, string> = {
  sm: "text-5xl",
  md: "text-7xl",
  lg: "text-9xl",
};

export function KanjiTile({ char, tone = "gold", size = "md", className }: KanjiTileProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "font-display font-bold leading-none select-none pointer-events-none",
        TONE_CLASSES[tone],
        SIZE_CLASSES[size],
        className
      )}
    >
      {char}
    </span>
  );
}
