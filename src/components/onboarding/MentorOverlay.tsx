/**
 * MentorOverlay.tsx — Contextual tutorial tooltip overlay.
 * Displays 4-step walkthrough of key bout mechanics during the exhibition bout.
 */


import { Button } from "@/components/ui/button";
import { X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type MentorStep =
  | "stamina"
  | "grip"
  | "momentum"
  | "basho_record"
  | null;

const MENTOR_CONTENT: Record<NonNullable<MentorStep>, { title: string; titleJa: string; body: string }> = {
  stamina: {
    title: "Stamina",
    titleJa: "体力",
    body: "Every rikishi has a stamina pool. Long bouts drain it fast — a tired wrestler loses power and balance. Watch how prolonged clinches wear both men down.",
  },
  grip: {
    title: "Grip Control",
    titleJa: "回し",
    body: "Securing the mawashi is the foundation of yotsu-zumo. A favored grip amplifies strength; a denied grip forces improvisation. The tachi-ai sets the tone.",
  },
  momentum: {
    title: "Momentum Swings",
    titleJa: "勢い",
    body: "Every action shifts momentum. Explosive pushes, successful throws, and ring-edge reversals each carry weight. The momentum bar shows who has the upper hand right now.",
  },
  basho_record: {
    title: "Basho Record",
    titleJa: "成績",
    body: "8 wins (kachi-koshi) secures rank; 7 losses (make-koshi) means demotion. Your daily matchmaking shapes the road to the yusho.",
  },
};

interface MentorOverlayProps {
  step: MentorStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onDismiss: () => void;
  className?: string;
}

export function MentorOverlay({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onDismiss,
  className,
}: MentorOverlayProps) {
  if (!step) return null;
  const content = MENTOR_CONTENT[step];

  return (
    <div
      className={cn(
        "absolute bottom-6 left-1/2 -translate-x-1/2 w-[min(90vw,420px)] z-50",
        "bg-card border-2 border-primary/20 rounded-lg shadow-2xl p-5",
        "animate-in slide-in-from-bottom-4 fade-in duration-500",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-0.5">
            Coach — Step {stepIndex + 1}/{totalSteps}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="font-display font-black text-lg uppercase tracking-tight">{content.title}</h3>
            <span className="text-xs text-muted-foreground opacity-60">{content.titleJa}</span>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors mt-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background rounded-sm"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1 mb-3">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 rounded-full transition-all duration-300",
              i === stepIndex ? "w-6 bg-primary" : i < stepIndex ? "w-3 bg-primary/40" : "w-3 bg-muted"
            )}
          />
        ))}
      </div>

      {/* Body */}
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{content.body}</p>

      {/* Action */}
      <div className="flex justify-end">
        {stepIndex < totalSteps - 1 ? (
          <Button size="sm" onClick={onNext} className="gap-2 font-display font-black uppercase tracking-wide text-xs">
            Next <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="sm" onClick={onDismiss} className="gap-2 font-display font-black uppercase tracking-wide text-xs bg-primary">
            Got it!
          </Button>
        )}
      </div>
    </div>
  );
}
