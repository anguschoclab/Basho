// BoutNarrativeModal.tsx — Polished bout detail modal with dramatic header,
// animated phase commentary, and immersive result display

import { useState, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
import { RotateCcw, MessageSquareText, BookOpen, Terminal } from "lucide-react";

const PHASE_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  tactical: { label: "策略", color: "text-primary",        bg: "bg-primary/10 border-primary/20" },
  tachiai:  { label: "立合", color: "text-east",           bg: "bg-east/10 border-east/20" },
  clinch:   { label: "組合", color: "text-warning",        bg: "bg-warning/10 border-warning/20" },
  momentum: { label: "攻防", color: "text-accent",         bg: "bg-accent/10 border-accent/20" },
  finish:   { label: "決着", color: "text-success",        bg: "bg-success/10 border-success/20" },
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

/** Defines the structure for bout narrative modal props. */
interface BoutNarrativeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  east: Rikishi;
  west: Rikishi;
  result: BoutResult;
  bashoName: BashoName;
  day: number;
}

/**
 * bout narrative modal.
 *  * @param {
 *   open,
 *   onOpenChange,
 *   east,
 *   west,
 *   result,
 *   bashoName,
 *   day,
 * } - The {
 *   open,
 *   on open change,
 *   east,
 *   west,
 *   result,
 *   basho name,
 *   day,
 * }.
 */
export function BoutNarrativeModal({
  open,
  onOpenChange,
  east,
  west,
  result,
  bashoName,
  day,
}: BoutNarrativeModalProps) {
  const narrative = generateNarrative(east, west, result, bashoName, day);

  const pbpLines = useMemo<PbpLine[]>(() => {
    try {
      const ctx: PbpContext = {
        seed: `${bashoName}-${day}-${east.id}-${west.id}`,
        day,
        bashoName,
        east: { id: east.id, shikona: east.shikona, style: east.style, archetype: east.archetype, rankLabel: east.rank },
        west: { id: west.id, shikona: west.shikona, style: west.style, archetype: west.archetype, rankLabel: west.rank },
      };
      return buildPbpFromBoutResult(result, ctx);
    } catch {
      return [];
    }
  }, [east, west, result, bashoName, day]);

  const [replayKey, setReplayKey] = useState(0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[95vh] p-0 gap-0 overflow-hidden bg-card border-border/50">
        {/* ═══ East / West header bar ═══ */}
        <div className="flex h-1.5">
          <div className={`flex-1 ${result.winner === "east" ? "bg-east" : "bg-east/25"}`} />
          <div className={`flex-1 ${result.winner === "west" ? "bg-west" : "bg-west/25"}`} />
        </div>

        {/* ═══ VS Header ═══ */}
        <div className="bg-muted/20 border-b border-border/50 px-6 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <div className="text-right flex-1 min-w-0">
              <p className={`font-display text-lg font-bold truncate ${result.winner === "east" ? "winner-glow text-success" : "text-foreground"}`}>
                {east.shikona}
              </p>
              <p className="text-[10px] text-east uppercase tracking-widest">East</p>
            </div>
            <div className="shrink-0 mx-4">
              <div className="h-10 w-10 rounded-full bg-muted border border-border flex items-center justify-center">
                <span className="font-display text-xs font-bold text-muted-foreground">VS</span>
              </div>
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className={`font-display text-lg font-bold truncate ${result.winner === "west" ? "winner-glow text-success" : "text-foreground"}`}>
                {west.shikona}
              </p>
              <p className="text-[10px] text-west uppercase tracking-widest">West</p>
            </div>
          </div>

          {/* Replay viewer */}
          <BoutReplayViewer
            key={replayKey}
            result={result}
            eastRikishi={east}
            westRikishi={west}
            autoPlay
            className="shadow-sm mx-auto max-w-lg bg-background rounded-md"
          />
          <div className="flex justify-center mt-1.5 mb-1">
            <Button variant="ghost" size="sm" onClick={() => setReplayKey((k) => k + 1)} className="text-xs text-muted-foreground gap-1.5 h-7">
              <RotateCcw className="h-3 w-3" /> Replay
            </Button>
          </div>
        </div>

        {/* ═══ Body ═══ */}
        <ScrollArea className="h-full max-h-[400px]">
          <div className="p-6 space-y-5">
            {/* Result card */}
            <BoutResultDisplay
              result={result}
              eastRikishi={east}
              westRikishi={west}
              className="border shadow-none"
            />

            <Separator />

            {/* Tabs */}
            <Tabs defaultValue="commentary" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-9">
                <TabsTrigger value="commentary" className="text-xs gap-1.5">
                  <MessageSquareText className="h-3.5 w-3.5" /> Commentary
                </TabsTrigger>
                <TabsTrigger value="narrative" className="text-xs gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" /> Narrative
                </TabsTrigger>
                <TabsTrigger value="log" className="text-xs gap-1.5">
                  <Terminal className="h-3.5 w-3.5" /> Log
                </TabsTrigger>
              </TabsList>

              {/* ── Commentary ── */}
              <TabsContent value="commentary" className="mt-4 space-y-2">
                {pbpLines.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No play-by-play data available.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {pbpLines.map((line, i) => {
                      const style = PHASE_STYLE[line.phase] ?? PHASE_STYLE.finish;
                      const tags = line.tags ?? [];
                      return (
                        <div
                          key={i}
                          className="flex items-start gap-2 animate-slide-up"
                          style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
                        >
                          <Badge
                            variant="outline"
                            className={`text-[9px] shrink-0 mt-0.5 font-display ${style.bg} ${style.color} border`}
                          >
                            {style.label}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm leading-relaxed">{line.text}</p>
                            {tags.length > 0 && (
                              <div className="flex gap-1.5 mt-0.5 flex-wrap">
                                {tags.map((tag) => (
                                  <span key={tag} className="text-[10px] text-muted-foreground/70">
                                    {TAG_ICONS[tag] ?? "·"} {tag.replace(/_/g, " ")}
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

              {/* ── Narrative ── */}
              <TabsContent value="narrative" className="mt-4">
                <div className="prose dark:prose-invert text-sm leading-relaxed text-muted-foreground space-y-2">
                  {narrative.map((line, i) => (
                    <p
                      key={i}
                      className={`animate-fade-in ${i === narrative.length - 1 ? "font-medium text-foreground italic" : ""}`}
                      style={{ animationDelay: `${i * 120}ms`, animationFillMode: "both" }}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </TabsContent>

              {/* ── Technical log ── */}
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
