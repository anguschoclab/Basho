/**
 * BanzukeReveal.tsx
 * ==================
 * Dramatic reveal sequence for the new Banzuke.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import type { BanzukeRevealEntry } from "@/presenters/projections/recapBanzukeRevealProjections";
import { RevealEntryCard } from "./BanzukeRevealSections";

type RevealEntry = BanzukeRevealEntry;

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
    const list = entriesProp ?? [];
    setEntries(list);

    if (list.length === 0) {
      // No real rank changes to reveal — complete rather than fabricate.
      const timer = setTimeout(onComplete, 500);
      return () => clearTimeout(timer);
    }

    // Initial delay
    const timer = setTimeout(() => setCurrentIndex(0), 1000);
    return () => clearTimeout(timer);
  }, [entriesProp, onComplete]);

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
            <RevealEntryCard key={entry.id} entry={entry} isCurrent={idx === currentIndex} />
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
