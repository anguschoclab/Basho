/**
 * BoutNarrativeModalSections.tsx
 *
 * Sections of BoutNarrativeModal — the VS header (east/west bar, gyoji badge,
 * shimpan panel, replay viewer) and the three body tabs (commentary,
 * narrative, technical log).
 */

import { useRef, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BoutReplayViewer } from "./BoutReplayViewer";
import type { BoutReplayViewerHandle } from "./BoutReplayViewer";
import { BoutLog } from "./BoutLog";
import type { UIRikishi } from "@/presenters/uiModels";
import type { BoutResult } from "@/engine/types/basho";
import type { PbpLine } from "@/presenters/engineAccess";
import { RotateCcw, MessageSquareText, BookOpen, Terminal } from "lucide-react";
import { PbpLineText } from "./PbpLineText";
import type { BoutReplayProgress } from "./boutReplay/useBoutReplay";
import { cn } from "@/lib/utils";
import { GlossaryTip } from "@/components/ui/GlossaryTip";
import { PHASE_STYLE, TAG_ICONS } from "./boutModalConstants";

/** VS header — east/west bar, names, gyoji/shimpan badges, replay viewer. */
export function BoutModalHeader({
  result,
  east,
  west,
  autoPlay,
  gyojiName,
  gyojiAccuracy,
  replayKey,
  onReplay,
  onProgressUpdate,
}: {
  result: BoutResult;
  east: UIRikishi;
  west: UIRikishi;
  autoPlay: boolean;
  gyojiName?: string;
  gyojiAccuracy?: number;
  replayKey: number;
  onReplay: () => void;
  onProgressUpdate: (progress: BoutReplayProgress | null) => void;
}) {
  const viewerRef = useRef<BoutReplayViewerHandle>(null);

  return (
    <>
      {/* ═══ East / West header bar ═══ */}
      <div className="flex h-1.5">
        <div className={`flex-1 ${result.winner === "east" ? "bg-east" : "bg-east/25"}`} />
        <div className={`flex-1 ${result.winner === "west" ? "bg-west" : "bg-west/25"}`} />
      </div>

      {/* ═══ VS Header ═══ */}
      <div className="bg-muted/20 border-b border-border/50 px-6 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="text-right flex-1 min-w-0">
            <p
              className={`font-display text-lg font-bold truncate ${result.winner === "east" ? "winner-glow text-success" : "text-foreground"}`}
            >
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
            <p
              className={`font-display text-lg font-bold truncate ${result.winner === "west" ? "winner-glow text-success" : "text-foreground"}`}
            >
              {west.shikona}
            </p>
            <p className="text-[10px] text-west uppercase tracking-widest">West</p>
          </div>
        </div>

        {/* Gyoji badge */}
        {gyojiName && (
          <div className="flex items-center justify-center gap-2 mb-2" data-testid="gyoji-badge">
            <Badge variant="outline" className="text-[10px]">
              Gyoji: {gyojiName}
            </Badge>
            {gyojiAccuracy !== undefined && (
              <Badge variant="secondary" className="text-[10px]">
                Accuracy {gyojiAccuracy}%
              </Badge>
            )}
          </div>
        )}

        {/* Shimpan panel on mono-ii */}
        {result.monoii && (
          <div
            className="flex items-center justify-center gap-2 mb-2 flex-wrap"
            data-testid="shimpan-panel"
          >
            <Badge variant="outline" className="text-[10px]">
              Mono-ii
            </Badge>
            {result.shimpanPanelIds && result.shimpanPanelIds.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                Shimpan: {result.shimpanPanelIds.length} judges
              </Badge>
            )}
            {result.monoiiOutcome && (
              <Badge
                variant={
                  result.monoiiOutcome === "reversed"
                    ? "destructive"
                    : result.monoiiOutcome === "rematch"
                      ? "default"
                      : "secondary"
                }
                className="text-[10px]"
              >
                {result.monoiiOutcome === "upheld"
                  ? "Decision upheld"
                  : result.monoiiOutcome === "reversed"
                    ? "Decision reversed"
                    : "Rematch ordered"}
              </Badge>
            )}
          </div>
        )}

        {/* Replay viewer */}
        <BoutReplayViewer
          key={replayKey}
          ref={viewerRef}
          result={result}
          eastRikishi={east}
          westRikishi={west}
          autoPlay={autoPlay}
          onProgressUpdate={onProgressUpdate}
          className="shadow-xs mx-auto max-w-lg bg-background rounded-md"
        />
        <div className="flex justify-center mt-1.5 mb-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onReplay}
            className="text-xs text-muted-foreground gap-1.5 h-7"
          >
            <RotateCcw className="h-3 w-3" /> Replay
          </Button>
        </div>
      </div>
    </>
  );
}

/** One commentary row — phase badge, pbp text, tag chips. */
function CommentaryLine({
  line,
  index,
  isActive,
  lineRef,
}: {
  line: PbpLine;
  index: number;
  isActive: boolean;
  lineRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const style = (line.phase && PHASE_STYLE[line.phase]) || PHASE_STYLE.finish;
  const tags = line.tags ?? [];
  const hasPhase = !!line.phase;
  return (
    <div
      ref={isActive ? lineRef : undefined}
      className={cn(
        "flex items-start gap-2 animate-slide-up",
        isActive && "bg-primary/10 border-l-2 border-primary rounded-r",
        !isActive && hasPhase && "opacity-60",
        !hasPhase && "opacity-60"
      )}
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
    >
      <Badge
        variant="outline"
        className={`text-[10px] shrink-0 mt-0.5 font-display ${style.bg} ${style.color} border`}
      >
        {line.phase === "tachiai" ? (
          <GlossaryTip termId="tachiai">{style.label}</GlossaryTip>
        ) : (
          style.label
        )}
      </Badge>
      <div className="flex-1 min-w-0">
        <PbpLineText text={line.text} className="text-sm leading-relaxed" />
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
}

/** Body tabs — commentary, narrative, technical log. */
export function BoutModalTabs({
  activeTab,
  onTabChange,
  pbpLines,
  narrativeLines,
  result,
  activeLineIndices,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
  pbpLines: PbpLine[];
  narrativeLines: PbpLine[];
  result: BoutResult;
  activeLineIndices: Set<number>;
}) {
  const activeLineRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeTab !== "commentary") return;
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeLineIndices, activeTab]);

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
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
            {pbpLines.map((line, i) => (
              <CommentaryLine
                key={line.id ?? i}
                line={line}
                index={i}
                isActive={activeLineIndices.has(i)}
                lineRef={activeLineRef}
              />
            ))}
          </div>
        )}
      </TabsContent>

      {/* ── Narrative ── */}
      <TabsContent value="narrative" className="mt-4">
        <div className="prose dark:prose-invert text-sm leading-relaxed text-muted-foreground space-y-2">
          {narrativeLines.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No narrative data available.
            </p>
          ) : (
            narrativeLines.map((line, i) => (
              <p
                key={i}
                className={`animate-fade-in ${i === narrativeLines.length - 1 ? "font-medium text-foreground italic" : ""}`}
                style={{ animationDelay: `${i * 120}ms`, animationFillMode: "both" }}
              >
                <PbpLineText text={line.text} />
              </p>
            ))
          )}
        </div>
      </TabsContent>

      {/* ── Technical log ── */}
      <TabsContent value="log" className="mt-4">
        <BoutLog log={result.log} className="border rounded-md p-4 bg-background" />
      </TabsContent>
    </Tabs>
  );
}
