/**
 * RetirementCeremony.tsx
 * =====================
 * A cinematic UI sequence for the the Danpatsu-shiki (Cutting the topknot) ceremony.
 * (Phase Q: Promotion Politics & Ceremony)
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scissors, History, ChevronRight, Share2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { UIRikishi } from "@/presenters/uiModels";

interface RetirementCeremonyProps {
  rikishi: UIRikishi;
  onFinish: () => void;
}

export function RetirementCeremony({ rikishi, onFinish }: RetirementCeremonyProps) {
  const [stage, setStage] = useState<"intro" | "cutting" | "legacy">("intro");

  const variants = {
    enter: { opacity: 0, scale: 0.95, y: 10 },
    center: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 1.05, y: -10 },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-xl p-6 overflow-hidden">
      {/* Background Ink Wash Aesthetic */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <svg viewBox="0 0 400 400" className="w-full h-full">
          <path
            d="M50,150 Q150,50 350,150 T350,350"
            fill="none"
            stroke="currentColor"
            strokeWidth="40"
          />
        </svg>
      </div>

      <div className="max-w-4xl w-full relative">
        <AnimatePresence mode="wait">
          {/* STAGE 1: INTRO (The Final Bow) */}
          {stage === "intro" && (
            <motion.div
              key="intro"
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.8 }}
              className="text-center space-y-12"
            >
              <div className="space-y-4">
                <h1 className="text-8xl font-display font-black tracking-tighter uppercase sumi-e-ink opacity-20 select-none">
                  DANPATSU
                </h1>
                <div className="relative -top-12">
                  <h2 className="text-6xl font-display font-black tracking-tighter uppercase text-primary">
                    {rikishi.shikona}
                  </h2>
                  <div className="text-sm font-black uppercase tracking-[0.5em] text-muted-foreground mt-2">
                    Retired • {rikishi.rank}
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-12">
                <div className="text-center">
                  <div className="text-3xl font-display font-black">{rikishi.careerWins}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-40">
                    Career Wins
                  </div>
                </div>
                <div className="h-12 w-px bg-border/40" />
                <div className="text-center">
                  <div className="text-3xl font-display font-black">{rikishi.careerLosses}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-40">
                    Career Losses
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setStage("cutting")}
                className="group h-12 px-12 rounded-full font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl shadow-primary/20"
              >
                Proceed to Ceremony{" "}
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </motion.div>
          )}

          {/* STAGE 2: CUTTING (Danpatsu-shiki) */}
          {stage === "cutting" && (
            <motion.div
              key="cutting"
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 1.2 }}
              className="space-y-12 text-center"
            >
              <div className="relative w-72 h-72 mx-auto">
                {/* Silhouette of Topknot */}
                <div className="absolute inset-0 bg-primary/5 rounded-full border-4 border-dashed border-primary/20 animate-spin-slow" />
                <div className="absolute inset-10 bg-background rounded-3xl border-2 border-primary/40 flex items-center justify-center shadow-2xl">
                  <Scissors className="h-32 w-32 text-primary/80 animate-pulse" />
                </div>
              </div>

              <div className="max-w-lg mx-auto space-y-4">
                <h3 className="text-2xl font-display font-black uppercase tracking-tight">
                  The Final Snip
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed italic">
                  Leading elders, stable masters, and esteemed supporters take turns with the golden
                  scissors. The **Chonmage** is severred—signifying the end of the warrior path and
                  the transition to a life beyond the ring.
                </p>
              </div>

              <div className="pt-8">
                <Button
                  onClick={() => setStage("legacy")}
                  className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-[0.2em] text-[10px] h-14 px-20 rounded-full shadow-2xl shadow-primary/40"
                >
                  Confirm Retirement
                </Button>
              </div>
            </motion.div>
          )}

          {/* STAGE 3: LEGACY (Hall of Fame) */}
          {stage === "legacy" && (
            <motion.div
              key="legacy"
              variants={variants}
              initial="enter"
              animate="center"
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <Card className=" paper border-2 border-gold/40 bg-gold/[0.03] overflow-hidden">
                <CardContent className="p-12 text-center space-y-8">
                  <div className="flex justify-center">
                    <div className="p-4 bg-gold rounded-full shadow-lg shadow-gold/20">
                      <History className="h-8 w-8 text-background" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-4xl font-display font-black tracking-tight text-gold uppercase">
                      Eternal Chronicle
                    </h2>
                    <p className="text-[10px] uppercase font-bold tracking-[0.5em] text-muted-foreground/60">
                      Inducted into the Stable Archives
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-background/50 rounded-2xl border border-gold/20">
                    <div className="space-y-1">
                      <div className="text-2xl font-display font-black">{rikishi.rank}</div>
                      <div className="text-[8px] uppercase font-black opacity-40">Peak Rank</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-2xl font-display font-black">
                        {rikishi.careerWins}-{rikishi.careerLosses}
                      </div>
                      <div className="text-[8px] uppercase font-black opacity-40">Final Record</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-2xl font-display font-black">
                        {rikishi.currentBashoWins >= 13 ? "Yūshō" : "Kanryō"}
                      </div>
                      <div className="text-[8px] uppercase font-black opacity-40">Career Peak</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-2xl font-display font-black">Elder</div>
                      <div className="text-[8px] uppercase font-black opacity-40">Next Chapter</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-center gap-4">
                    <Button
                      onClick={onFinish}
                      className="h-10 px-8 rounded-full font-black uppercase tracking-widest text-[9px] gap-2"
                    >
                      Close Ceremony
                    </Button>
                    <Button
                      variant="outline"
                      className="h-10 px-8 rounded-full font-black uppercase tracking-widest text-[9px] gap-2"
                    >
                      <Share2 className="h-3 w-3" /> Export Legend
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 120s linear infinite;
        }
        .sumi-e-ink {
          filter: contrast(1.2) brightness(0.9);
        }
      `,
        }}
      />
    </div>
  );
}
