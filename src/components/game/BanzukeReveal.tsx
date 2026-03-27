/**
 * BanzukeReveal.tsx
 * ==================
 * Dramatic reveal sequence for the new Banzuke.
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../../store/gameStore";
import { Badge } from "../ui/badge";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface RevealEntry {
  id: string;
  shikona: string;
  oldRank: string;
  newRank: string;
  change: "up" | "down" | "none";
}

export function BanzukeReveal({ onComplete }: { onComplete: () => void }) {
  const digest = useGameStore((state) => state.digest);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [entries, setEntries] = useState<RevealEntry[]>([]);

  useEffect(() => {
    // Mocking entries for demonstration based on digest/world hist
    // In real use, this would compare state.world with state.prevWorld
    const mockEntries: RevealEntry[] = [
      { id: "1", shikona: "Hakuho", oldRank: "Yokozuna", newRank: "Yokozuna", change: "none" },
      { id: "2", shikona: "Terunofuji", oldRank: "Ozeki", newRank: "Yokozuna", change: "up" },
      { id: "3", shikona: "Asanoyama", oldRank: "Ozeki", newRank: "Maegashira", change: "down" },
    ];
    setEntries(mockEntries);

    // Initial delay
    const timer = setTimeout(() => setCurrentIndex(0), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (currentIndex >= 0 && currentIndex < entries.length) {
      const timer = setTimeout(() => setCurrentIndex(prev => prev + 1), 800);
      return () => clearTimeout(timer);
    } else if (currentIndex >= entries.length && entries.length > 0) {
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
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
                entry.change === 'up' ? "bg-gold/10 border-gold/50" : 
                entry.change === 'down' ? "bg-destructive/10 border-destructive/50" : 
                "bg-white/5 border-white/10"
              }`}
            >
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground uppercase font-bold tabular-nums">Rank Change</span>
                <span className="text-xl font-bold font-display">{entry.shikona}</span>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex flex-col items-end">
                   <span className="text-[10px] uppercase opacity-50">From</span>
                   <span className="font-mono text-sm opacity-50 line-through">{entry.oldRank}</span>
                </div>
                
                <div className="flex items-center justify-center w-8 h-8">
                  {entry.change === 'up' && <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity }}><ArrowUp className="text-gold" /></motion.div>}
                  {entry.change === 'down' && <ArrowDown className="text-destructive" />}
                  {entry.change === 'none' && <Minus className="opacity-30" />}
                </div>

                <div className="flex flex-col items-start min-w-[100px]">
                   <span className="text-[10px] uppercase text-primary font-bold">To</span>
                   <span className={`text-xl font-black ${entry.change === 'up' ? "text-gold" : entry.change === 'down' ? "text-destructive" : ""}`}>
                     {entry.newRank}
                   </span>
                </div>
              </div>
              
              {entry.change === 'up' && idx === currentIndex && (
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
