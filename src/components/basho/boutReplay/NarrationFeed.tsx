// NarrationFeed.tsx — scrolling broadcast feed for the bout replay.
// Renders the trailing window of structured PbpLines with voice styling,
// stakes badges, and plain-language explainers.

import type { PbpLine } from "@/presenters/engineAccess";
import { cn } from "@/lib/utils";
import {
  classifyLine,
  explainerFor,
  badgesForLine,
  feedWindow,
  type FeedLineClass,
} from "@/components/basho/boutReplay/feedModel";

const LINE_CLASS: Record<FeedLineClass, string> = {
  headline: "feed-line--headline text-on-scrim font-semibold",
  action: "feed-line--action text-on-scrim/85",
  gyoji: "feed-line--gyoji text-success font-semibold tracking-wide",
  setup: "feed-line--setup text-on-scrim/60",
};

interface NarrationFeedProps {
  lines: PbpLine[];
  /** Index of the currently-spoken line in `lines`. */
  activeIndex: number;
  /** Max rendered lines (default 3 — the broadcast triple). */
  windowSize?: number;
  className?: string;
}

export function NarrationFeed({
  lines,
  activeIndex,
  windowSize = 3,
  className,
}: NarrationFeedProps) {
  const visible = feedWindow(lines, activeIndex, windowSize);
  const activeId = lines[Math.min(activeIndex, lines.length - 1)]?.id;

  return (
    <div
      aria-live="polite"
      className={cn(
        "narration-feed flex flex-col gap-1.5 px-4 py-3 min-h-[4.5rem] justify-end",
        className
      )}
    >
      {visible.length === 0 && <p className="text-sm text-muted-foreground italic">…</p>}
      {visible.map((line) => {
        const isActive = line.id === activeId;
        const kind = classifyLine(line);
        const explainer = explainerFor(line);
        const badges = badgesForLine(line);
        return (
          <div
            key={line.id}
            className={cn(
              "feed-line transition-opacity duration-300",
              LINE_CLASS[kind],
              isActive ? "opacity-100" : "opacity-45"
            )}
          >
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className={cn("text-sm leading-snug", kind !== "gyoji" && "italic")}>
                {line.text}
              </p>
              {badges.length > 0 && (
                <span className="flex gap-1">
                  {badges.map((b) => (
                    <span
                      key={b.tag}
                      className="text-[10px] font-bold tracking-wider px-1.5 py-px rounded border border-gold/50 text-gold"
                    >
                      {b.label}
                    </span>
                  ))}
                </span>
              )}
            </div>
            {isActive && explainer && (
              <p className="text-xs text-on-scrim/50 leading-snug mt-0.5">{explainer}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
