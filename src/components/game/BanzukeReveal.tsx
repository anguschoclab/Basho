/**
 * BanzukeReveal.tsx
 * ==================
 * Dramatic reveal sequence for the new Banzuke.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "../ui/badge";
import { ArrowUp, ArrowDown, Minus, Star, ArrowRight } from "lucide-react";
import { RikishiName } from "@/components/ClickableName";

interface RevealEntry {
  id: string;
  shikona: string;
  oldRank: string;
  newRank: string;
  change: "up" | "down" | "none" | "new" | "division_change";
}

export function BanzukeReveal({
  onComplete,
  entries: entriesProp,
}: {
  onComplete: () => void;
  entries?: RevealEntry[];
}) {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [entries, setEntries] = useState<RevealEntry[]>([]);

  useEffect(() => {
    // Use provided entries or fall back to mock data
    if (entriesProp && entriesProp.length > 0) {
      setEntries(entriesProp);
    } else {
      // Mocking entries for demonstration based on digest/world hist
      // In real use, this would compare state.world with state.prevWorld
      const mockEntries: RevealEntry[] = [
        { id: "1", shikona: "Hakuho", oldRank: "Yokozuna", newRank: "Yokozuna", change: "none" },
        { id: "2", shikona: "Terunofuji", oldRank: "Ozeki", newRank: "Yokozuna", change: "up" },
        { id: "3", shikona: "Asanoyama", oldRank: "Ozeki", newRank: "Maegashira", change: "down" },
      ];
      setEntries(mockEntries);
    }

    // Initial delay
    const timer = setTimeout(() => setCurrentIndex(0), 1000);
    return () => clearTimeout(timer);
  }, [entriesProp]);

  useEffect(() => {
    if (currentIndex >= 0 && currentIndex < entries.length) {
      const timer = setTimeout(() => setCurrentIndex((prev) => prev + 1), 800);
      return () => clearTimeout(timer);
    } else if (currentIndex >= entries.length && entries.length > 0) {
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [currentIndex, entries.length, onComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-6 text-white overflow-hidden">
      <motion.h1
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-4xl font-black mb-12 tracking-tighter uppercase text-gold"
      >
        New Banzuke Announcement
      </motion.h1>

      <div className="w-full max-w-2xl space-y-4">
        <AnimatePresence>
          {entries.slice(0, currentIndex + 1).map((entry, idx) => (
            <motion.div
              key={entry.id}
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: "spring", damping: 15 }}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                entry.change === "up"
                  ? "bg-gold/10 border-gold/50"
                  : entry.change === "down"
                    ? "bg-destructive/10 border-destructive/50"
                    : entry.change === "new"
                      ? "bg-primary/10 border-primary/50"
                      : entry.change === "division_change"
                        ? "bg-purple-500/10 border-purple-500/50"
                        : "bg-white/5 border-white/10"
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
                    <Badge className="text-[9px] font-bold uppercase tracking-widest px-2 h-5 bg-primary/80 text-white">
                      NEW
                    </Badge>
                  )}
                  {entry.change === "division_change" && (
                    <Badge className="text-[9px] font-bold uppercase tracking-widest px-2 h-5 bg-purple-500/80 text-white">
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
                  {entry.change === "up" && (
                    <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity }}>
                      <ArrowUp className="text-gold" />
                    </motion.div>
                  )}
                  {entry.change === "down" && <ArrowDown className="text-destructive" />}
                  {entry.change === "new" && (
                    <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity }}>
                      <Star className="text-primary" />
                    </motion.div>
                  )}
                  {entry.change === "division_change" && <ArrowRight className="text-primary" />}
                  {entry.change === "none" && <Minus className="opacity-30" />}
                </div>

                <div className="flex flex-col items-start min-w-[100px]">
                  <span className="text-[10px] uppercase text-primary font-bold">To</span>
                  <span
                    className={`text-xl font-black ${
                      entry.change === "up"
                        ? "text-gold"
                        : entry.change === "down"
                          ? "text-destructive"
                          : entry.change === "new"
                            ? "text-primary"
                            : entry.change === "division_change"
                              ? "text-primary"
                              : ""
                    }`}
                  >
                    {entry.newRank}
                  </span>
                </div>
              </div>

              {entry.change === "up" && idx === currentIndex && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  className="absolute inset-0 bg-gold/20 rounded-lg pointer-events-none"
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-12 text-xs text-muted-foreground animate-pulse"
      >
        Waiting for Council of Elders to finalize...
      </motion.div>
    </div>
  );
}
