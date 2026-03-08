// src/components/game/BoutNarrativeModal.tsx

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { BoutReplayViewer } from "./BoutReplayViewer";
import { BoutResultDisplay } from "./BoutResultDisplay";
import { BoutLog } from "./BoutLog";
import type { Rikishi, BoutResult, BashoName } from "@/engine/types";
import { generateNarrative } from "@/engine/narrative";
import { buildPbpFromBoutResult, type PbpLine, type PbpContext } from "@/engine/pbp";

const PHASE_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  tachiai:  { label: "Tachiai",  color: "text-blue-400",    bg: "bg-blue-500/15 border-blue-500/30" },
  clinch:   { label: "Clinch",   color: "text-amber-400",   bg: "bg-amber-500/15 border-amber-500/30" },
  momentum: { label: "Struggle", color: "text-purple-400",  bg: "bg-purple-500/15 border-purple-500/30" },
  finish:   { label: "Finish",   color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30" },
};

const TAG_ICONS: Record<string, string> = {
  crowd_roar: "🔊",
  gasps: "😮",
  upset: "⚡",
  kinboshi: "🌟",
  kensho: "💰",
  yusho_race: "🏆",
  close_call: "😰",
  dominant: "💪",
};

interface BoutNarrativeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  east: Rikishi;
  west: Rikishi;
  result: BoutResult;
  bashoName: BashoName;
  day: number;
}

export function BoutNarrativeModal({
  open,
  onOpenChange,
  east,
  west,
  result,
  bashoName,
  day
}: BoutNarrativeModalProps) {
  
  // Generate narrative text
  const narrative = generateNarrative(east, west, result, bashoName, day);
  
  // Generate PBP commentary
  const pbpLines = useMemo<PbpLine[]>(() => {
    try {
      const ctx: PbpContext = {
        seed: `${bashoName}-${day}-${east.id}-${west.id}`,
        day,
        bashoName,
        east: {
          id: east.id,
          shikona: east.shikona,
          style: east.style,
          archetype: east.archetype,
          rankLabel: east.rank,
        },
        west: {
          id: west.id,
          shikona: west.shikona,
          style: west.style,
          archetype: west.archetype,
          rankLabel: west.rank,
        },
      };
      return buildPbpFromBoutResult(result, ctx);
    } catch {
      return [];
    }
  }, [east, west, result, bashoName, day]);
  
  // Auto-play state for the replay viewer
  const [replayKey, setReplayKey] = useState(0);
  const restartReplay = () => setReplayKey(k => k + 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[95vh] p-0 gap-0 overflow-hidden bg-card">
        
        {/* HEADER: The Match Replay (Theatrical Layer) */}
        <div className="bg-muted/30 border-b p-4 pb-6">
           <BoutReplayViewer 
              key={replayKey}
              result={result}
              eastRikishi={east}
              westRikishi={west}
              autoPlay={true}
              className="shadow-md mx-auto max-w-lg bg-background"
           />
           <div className="flex justify-center mt-2">
             <Button variant="ghost" size="sm" onClick={restartReplay} className="text-xs text-muted-foreground">
                Replay Animation
             </Button>
           </div>
        </div>

        {/* BODY: Stats & Story */}
        <ScrollArea className="h-full max-h-[400px]">
          <div className="p-6 space-y-6">
            
            {/* 1. The Result Card */}
            <BoutResultDisplay 
               result={result} 
               eastRikishi={east} 
               westRikishi={west} 
               className="border shadow-none bg-secondary/10"
            />

            <Separator />

            {/* 2. Detailed Breakdown Tabs */}
            <Tabs defaultValue="commentary" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="commentary">Commentary</TabsTrigger>
                <TabsTrigger value="narrative">Narrative</TabsTrigger>
                <TabsTrigger value="log">Technical Log</TabsTrigger>
              </TabsList>
              
              {/* PBP Commentary Tab (NEW — phase-by-phase) */}
              <TabsContent value="commentary" className="mt-4 space-y-3">
                {pbpLines.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No play-by-play data available for this bout.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {pbpLines.map((line, i) => {
                      const style = PHASE_STYLE[line.phase] ?? PHASE_STYLE.finish;
                      const tags = line.tags ?? [];
                      return (
                        <div
                          key={i}
                          className="flex items-start gap-2.5 animate-slide-up"
                          style={{ animationDelay: `${i * 80}ms` }}
                        >
                          <Badge
                            variant="outline"
                            className={`text-[10px] shrink-0 mt-0.5 ${style.bg} ${style.color} border`}
                          >
                            {style.label}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm leading-relaxed">{line.text}</p>
                            {tags.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {tags.map(tag => (
                                  <span key={tag} className="text-[10px] text-muted-foreground">
                                    {TAG_ICONS[tag] ?? ""} {tag.replace(/_/g, " ")}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Narrative Tab (Story Mode) */}
              <TabsContent value="narrative" className="mt-4 space-y-2">
                <div className="prose dark:prose-invert text-sm leading-relaxed text-muted-foreground">
                  {narrative.map((line, i) => (
                    <p key={i} className={i === narrative.length - 1 ? "font-medium text-foreground italic" : ""}>
                      {line}
                    </p>
                  ))}
                </div>
              </TabsContent>

              {/* Log Tab (Debug/Stats Mode) */}
              <TabsContent value="log" className="mt-4">
                 <BoutLog log={(result as any).log} className="border rounded-md p-4 bg-background" />
              </TabsContent>
            </Tabs>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
