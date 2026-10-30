// ReplayChrome.tsx — shared bout-replay chrome for the 2D and 3D viewers.
// Fighters header + the canvas overlays (phase badge, kensho, crowd text).

import { cn } from "@/lib/utils";
import type { BoutResult } from "@/engine/types/basho";
import type { UIRikishi } from "@/presenters/uiModels";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import { REPLAY_PHASE_LABELS, CROWD_TEXT } from "@/components/basho/boutReplay/boutCanvas";
import type { ReplayPhase } from "@/components/basho/boutReplay/boutCanvas";
import { GlossaryTip } from "@/components/ui/GlossaryTip";
import type { ReactNode } from "react";

/** Header row: east/west shikona + rank labels + avatars. */
export function ReplayHeader({
  eastRikishi,
  westRikishi,
}: {
  eastRikishi: UIRikishi;
  westRikishi: UIRikishi;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border text-sm">
      <div className="flex items-center gap-2">
        <SumoAvatar avatar={eastRikishi.avatar} size="xs" fallback={eastRikishi.shikona} />
        <span className="font-semibold">{eastRikishi.shikona}</span>
        <span className="text-muted-foreground text-xs">{eastRikishi.rankLabel}</span>
      </div>
      <span className="text-muted-foreground font-medium tracking-widest text-xs">VS</span>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs">{westRikishi.rankLabel}</span>
        <span className="font-semibold">{westRikishi.shikona}</span>
        <SumoAvatar avatar={westRikishi.avatar} size="xs" fallback={westRikishi.shikona} />
        <span aria-hidden="true" className="inline-block w-2.5 h-2.5 rounded-full bg-destructive" />
      </div>
    </div>
  );
}

/** Phase badge + kensho count + crowd-text overlays for the canvas area. */
export function ReplayOverlays({
  uiPhase,
  result,
  extra,
}: {
  uiPhase: ReplayPhase;
  result: BoutResult;
  /** Extra overlay content (e.g. the 2D/3D view toggle). */
  extra?: ReactNode;
}) {
  const label = REPLAY_PHASE_LABELS[uiPhase];
  return (
    <>
      {/* Phase badge overlay */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="flex items-center gap-1.5 bg-scrim/60 rounded-full px-3 py-1 border border-on-scrim/10">
          <span className="text-on-scrim/50 text-xs font-medium">{label.ja}</span>
          <span className="text-on-scrim/20 text-xs">·</span>
          {uiPhase === "tachiai" ? (
            <GlossaryTip termId="tachiai">
              <span className="text-on-scrim text-xs font-semibold tracking-wider uppercase">
                {label.en}
              </span>
            </GlossaryTip>
          ) : (
            <span className="text-on-scrim text-xs font-semibold tracking-wider uppercase">
              {label.en}
            </span>
          )}
        </div>
      </div>

      {/* Kensho envelopes */}
      {result.kenshoEnvelopes > 0 && (uiPhase === "finish" || uiPhase === "ceremony") && (
        <div className="absolute top-3 right-3 pointer-events-none">
          <div className="flex items-center gap-1 bg-gold/20 rounded px-2 py-1 border border-gold/40">
            <span className="text-gold text-xs">¥</span>
            <span className="text-gold text-xs font-semibold">
              {result.kenshoEnvelopes} kensho
            </span>
          </div>
        </div>
      )}

      {extra}

      {/* Crowd text */}
      {uiPhase !== "complete" && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
          <span
            className={cn(
              "text-xs font-medium transition-opacity duration-500 px-2 py-0.5 rounded-full",
              uiPhase === "tachiai" || uiPhase === "finish" || uiPhase === "ceremony"
                ? "text-gold bg-scrim/50"
                : "text-on-scrim/50"
            )}
          >
            {CROWD_TEXT[uiPhase]}
          </span>
        </div>
      )}
    </>
  );
}
