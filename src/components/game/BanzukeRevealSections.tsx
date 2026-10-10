/**
 * BanzukeRevealSections.tsx
 *
 * Banzuke reveal — per-entry card with rank-change coloring, direction
 * icon, and the promotion flash overlay.
 */

import { motion } from "framer-motion";
import { Badge } from "../ui/badge";
import { ArrowUp, ArrowDown, Minus, Star, ArrowRight } from "lucide-react";
import { RikishiName } from "@/components/ClickableName";

import type { BanzukeRevealEntry } from "@/presenters/projections/recapBanzukeRevealProjections";

export type RevealEntry = BanzukeRevealEntry;

const CHANGE_CARD_CLASS: Record<string, string> = {
  up: "bg-gold/10 border-gold/50",
  down: "bg-destructive/10 border-destructive/50",
  new: "bg-primary/10 border-primary/50",
  division_change: "bg-accent/10 border-accent/50",
};

const CHANGE_TEXT_CLASS: Record<string, string> = {
  up: "text-gold",
  down: "text-destructive",
  new: "text-primary",
  division_change: "text-primary",
};

function ChangeIcon({ change }: { change: string }) {
  switch (change) {
    case "up":
      return (
        <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity }}>
          <ArrowUp className="text-gold" />
        </motion.div>
      );
    case "down":
      return <ArrowDown className="text-destructive" />;
    case "new":
      return (
        <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity }}>
          <Star className="text-primary" />
        </motion.div>
      );
    case "division_change":
      return <ArrowRight className="text-primary" />;
    default:
      return <Minus className="opacity-30" />;
  }
}

/** A single revealed rank-change row. */
export function RevealEntryCard({ entry, isCurrent }: { entry: RevealEntry; isCurrent: boolean }) {
  return (
    <motion.div
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", damping: 15 }}
      className={`flex items-center justify-between p-4 rounded-lg border ${
        CHANGE_CARD_CLASS[entry.change] ?? "bg-card/60 border-border"
      }`}
    >
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground uppercase font-bold tabular-nums">
          Rank Change
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold font-display">
            <RikishiName id={entry.id} name={entry.shikona} />
          </span>
          {entry.change === "new" && (
            <Badge className="text-[10px] font-bold uppercase tracking-widest px-2 h-5 bg-primary/80 text-white">
              NEW
            </Badge>
          )}
          {entry.change === "division_change" && (
            <Badge className="text-[10px] font-bold uppercase tracking-widest px-2 h-5 bg-accent/80 text-white">
              DIV
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase opacity-50">From</span>
          <span className="font-mono text-sm opacity-50 line-through">{entry.oldRank}</span>
        </div>

        <div className="flex items-center justify-center w-8 h-8">
          <ChangeIcon change={entry.change} />
        </div>

        <div className="flex flex-col items-start min-w-[100px]">
          <span className="text-[10px] uppercase text-primary font-bold">To</span>
          <span className={`text-xl font-black ${CHANGE_TEXT_CLASS[entry.change] ?? ""}`}>
            {entry.newRank}
          </span>
        </div>
      </div>

      {entry.change === "up" && isCurrent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          className="absolute inset-0 bg-gold/20 rounded-lg pointer-events-none"
        />
      )}
    </motion.div>
  );
}
