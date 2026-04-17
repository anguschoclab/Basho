/**
 * PressConference.tsx
 * ===================
 * Cinematic UI for interactive media sessions.
 * (Phase 4: Media, Narratives & Faction Power)
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Mic2, MessageSquare, Camera, FastForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";

interface InterviewChoice {
  id: string;
  text: string;
  impactPreview: string;
  impactType: "positive" | "negative" | "neutral" | "risky";
}

interface PressConferenceProps {
  rikishiName: string;
  rikishiImage?: string;
  question: string;
  choices: InterviewChoice[];
  onSelectChoice: (choiceId: string) => void;
  onClose: () => void;
}

export function PressConference({
  rikishiName,
  question,
  choices,
  onSelectChoice,
  onClose,
}: PressConferenceProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    setSelected(id);
    setTimeout(() => onSelectChoice(id), 600);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md p-6"
    >
      <div className="w-full max-w-4xl space-y-8">
        {/* Header: Stage & Branding */}
        <div className="flex items-center justify-between border-b pb-6 border-primary/20">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <Mic2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-display font-black tracking-tight uppercase leading-none">
                Press Conference
              </h2>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">
                Post-Basho Media Engagement • Tokyo, Japan
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="h-10 px-6 font-black uppercase tracking-widest bg-emerald-500/5 text-emerald-500 border-emerald-500/20"
          >
            Live Broadcast <Camera className="ml-2 h-3 w-3 animate-pulse" />
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left: Rikishi Focus */}
          <div className="lg:col-span-4 space-y-6">
            <div className="aspect-[3/4] rounded-2xl bg-muted border border-border overflow-hidden relative group shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">
                  Active Speaker
                </div>
                <h3 className="text-2xl font-display font-black tracking-tight uppercase">
                  {rikishiName}
                </h3>
              </div>
            </div>

            <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                <span>Public Impression</span>
                <span>64%</span>
              </div>
              <Progress value={64} className="h-1" />
            </div>
          </div>

          {/* Right: The Question & Interaction */}
          <div className="lg:col-span-8 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs">
                <MessageSquare className="h-4 w-4" /> Reporter Question:
              </div>
              <blockquote className="text-2xl font-medium italic text-foreground leading-relaxed pl-6 border-l-4 border-primary/40">
                "{question}"
              </blockquote>
            </div>

            <div className="grid gap-3">
              <AnimatePresence>
                {choices.map((choice, idx) => (
                  <motion.button
                    key={choice.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * idx }}
                    onClick={() => handleSelect(choice.id)}
                    disabled={selected !== null}
                    className={cn(
                      "w-full text-left p-6 rounded-2xl border-2 transition-all group relative overflow-hidden",
                      selected === choice.id
                        ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center justify-between relative z-10">
                      <div className="space-y-1">
                        <p className="font-bold text-lg leading-tight uppercase tracking-tight">
                          {choice.text}
                        </p>
                        <p
                          className={cn(
                            "text-[10px] font-black uppercase tracking-[1px] transition-opacity",
                            selected === choice.id
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-60"
                          )}
                        >
                          Expected Impact:{" "}
                          <span className={getImpactColor(choice.impactType)}>
                            {choice.impactPreview}
                          </span>
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Footer: Controls */}
        <div className="flex justify-end pt-8 border-t border-primary/20">
          <Button
            variant="ghost"
            className="font-black uppercase tracking-widest text-[10px]"
            onClick={onClose}
          >
            Refuse to Comment <FastForward className="ml-2 h-3 w-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function getImpactColor(type: string): string {
  switch (type) {
    case "positive":
      return "text-emerald-500";
    case "negative":
      return "text-red-500";
    case "risky":
      return "text-orange-500";
    default:
      return "text-muted-foreground";
  }
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
