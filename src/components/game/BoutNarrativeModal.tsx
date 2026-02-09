// src/components/game/BoutNarrativeModal.tsx

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

import { BoutReplayViewer } from "./BoutReplayViewer";
import { BoutResultDisplay } from "./BoutResultDisplay";
import { BoutLog } from "./BoutLog";
import type { Rikishi, BoutResult, BashoName } from "@/engine/types";
import { generateNarrative } from "@/engine/narrative";

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
  
  // We generate the detailed text narrative if the user wants to read it
  const narrative = generateNarrative(east, west, result, bashoName, day);
  
  // Auto-play state for the replay viewer
  const [replayKey, setReplayKey] = useState(0);

  const restartReplay = () => setReplayKey(k => k + 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[95vh] p-0 gap-0 overflow-hidden bg-card">
        
        {/* HEADER: The Match Replay (Theatrical Layer) */}
        <div className="bg-muted/30 border-b p-4 pb-6">
           <BoutReplayViewer 
              key={replayKey} // Force reset on replay
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
            
            {/* 1. The Result Card (Uses the atomic component) */}
            <BoutResultDisplay 
               result={result} 
               eastRikishi={east} 
               westRikishi={west} 
               className="border shadow-none bg-secondary/10"
            />

            <Separator />

            {/* 2. Detailed Breakdown Tabs */}
            <Tabs defaultValue="narrative" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="narrative">Narrative</TabsTrigger>
                <TabsTrigger value="log">Technical Log</TabsTrigger>
              </TabsList>
              
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
