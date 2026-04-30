/**
 * HeroDossier.tsx
 * ===============
 * Prominent decision/narrative banner rendered when there is a pending
 * action or dramatic game event requiring player attention.
 * Omit from page when no dossier is active (return null).
 *
 * tone: "gold" (opportunity) | "vermillion" (threat/crisis) | "indigo" (neutral/info)
 */

import { cn } from "@/lib/utils";
import { KanjiTile } from "./KanjiTile";
import type { ReactNode } from "react";

interface HeroDossierProps {
  kanji: string;
  eyebrow: string;
  title: string;
  body: string;
  tone?: "gold" | "vermillion" | "indigo";
  cta?: ReactNode;
  className?: string;
}

const TONE_BG: Record<string, string> = {
  gold: "bg-gradient-to-r from-gold/10 to-gold/5 border-gold/30",
  vermillion: "bg-gradient-to-r from-east/10 to-east/5 border-east/30",
  indigo: "bg-gradient-to-r from-west/10 to-west/5 border-west/30",
};

const TONE_LABEL: Record<string, string> = {
  gold: "text-gold",
  vermillion: "text-east",
  indigo: "text-west",
};

export function HeroDossier({
  kanji,
  eyebrow,
  title,
  body,
  tone = "gold",
  cta,
  className,
}: HeroDossierProps) {
  return (
    <div
      className={cn(
        "dossier-paper relative overflow-hidden rounded border p-5 flex items-start gap-5",
        TONE_BG[tone],
        className
      )}
    >
      <div className="absolute -right-4 -top-4 opacity-10 pointer-events-none select-none">
        <KanjiTile char={kanji} tone={tone} size="lg" />
      </div>

      <div className="shrink-0 hidden sm:flex items-center justify-center w-14 h-14 rounded-lg border border-border/40 bg-card/50">
        <KanjiTile char={kanji} tone={tone} size="sm" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <p className={cn("stat-label tracking-[0.18em]", TONE_LABEL[tone])}>{eyebrow}</p>
        <h2 className="font-display font-bold text-base leading-tight">{title}</h2>
        <p className="text-sm text-muted-foreground leading-snug">{body}</p>
        {cta && <div className="pt-2">{cta}</div>}
      </div>
    </div>
  );
}
