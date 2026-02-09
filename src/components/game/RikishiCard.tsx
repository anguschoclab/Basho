// Rikishi card component - displays wrestler info with fog of war
// Per Scouting Doc: show qualitative descriptors, ranges, not numbers

import { cn } from "@/lib/utils";
import type { Rikishi, TacticalArchetype } from "@/engine/types";
import { Badge } from "@/components/ui/badge";
import { RikishiName } from "@/components/ClickableName";
import { Progress } from "@/components/ui/progress";
import { 
  RANK_NAMES, 
  ARCHETYPE_NAMES, 
  STYLE_NAMES,
  createScoutedView, 
  getScoutedAttributes,
  describeScoutingLevel,
  type ConfidenceLevel 
} from "@/engine/scouting";
import { Eye, EyeOff, HelpCircle, Search } from "lucide-react";

interface RikishiCardProps {
  rikishi: Rikishi;
  side?: "east" | "west";
  isWinner?: boolean;
  compact?: boolean;
  playerHeyaId?: string | null;
  className?: string;
}

export function RikishiCard({ 
  rikishi, 
  side, 
  isWinner,
  compact = false,
  playerHeyaId = null,
  className 
}: RikishiCardProps) {
  const isOwned = rikishi.heyaId === playerHeyaId;
  const rankInfo = RANK_NAMES[rikishi.rank] || { ja: rikishi.rank, en: rikishi.rank };
  const rankWithNumber = rikishi.rankNumber 
    ? `${rankInfo.ja} ${rikishi.rankNumber}` 
    : rankInfo.ja;
  const rankEnWithNumber = rikishi.rankNumber
    ? `${rankInfo.en} ${rikishi.rankNumber}`
    : rankInfo.en;

  // Get scouted view of attributes
  // Own wrestlers = 100% scouted, others = base observation level
  const scouted = createScoutedView(rikishi, playerHeyaId, isOwned ? 100 : 5);
  const attributes = getScoutedAttributes(scouted);
  const scoutingInfo = describeScoutingLevel(scouted.scoutingLevel);

  const archetypeInfo = ARCHETYPE_NAMES[rikishi.archetype] || { label: rikishi.archetype, labelJa: "", description: "" };
  const styleInfo = STYLE_NAMES[rikishi.style] || { label: rikishi.style, labelJa: "", description: "" };

  return (
    <div 
      className={cn(
        "paper p-4 transition-all duration-200",
        side === "east" && "side-east",
        side === "west" && "side-west",
        isWinner && "ring-2 ring-gold",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="font-display text-xl font-semibold text-foreground">
            <RikishiName id={rikishi.id} name={rikishi.shikona} />
          </h3>
          {!compact && rikishi.realName && (
            <p className="text-sm text-muted-foreground">{rikishi.realName}</p>
          )}
        </div>
        
        <div className="text-right">
          <Badge 
            variant="secondary"
            className={cn(
              "font-display text-xs",
              rikishi.rank === "yokozuna" && "rank-yokozuna text-foreground",
              rikishi.rank === "ozeki" && "rank-ozeki text-foreground",
              (rikishi.rank === "sekiwake" || rikishi.rank === "komusubi") && "rank-sekiwake text-foreground"
            )}
          >
            {rankWithNumber}
          </Badge>
          <div className="text-xs text-muted-foreground mt-0.5">{rankEnWithNumber}</div>
        </div>
      </div>

      {!compact && (
        <>
          {/* Physical stats - always public per doc */}
          <div className="flex gap-4 mb-3 text-sm text-muted-foreground">
            <span>{rikishi.height}cm</span>
            <span>{rikishi.weight}kg</span>
            <span>{rikishi.nationality}</span>
          </div>

          {/* Style & Archetype */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="outline" className="text-xs" title={styleInfo.description}>
              {styleInfo.labelJa} {styleInfo.label}
            </Badge>
            <Badge 
              variant="outline" 
              className="text-xs"
              title={archetypeInfo.description}
            >
              {archetypeInfo.label}
            </Badge>
            {rikishi.momentum !== 0 && (
              <Badge 
                variant={rikishi.momentum > 0 ? "default" : "destructive"}
                className="text-xs"
              >
                {rikishi.momentum > 0 ? "Rising" : "Struggling"}
              </Badge>
            )}
          </div>

          {/* Scouted attributes - narrative descriptors, not numbers per doc */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <AttributeDisplay label="Power" attr={attributes.power} />
            <AttributeDisplay label="Speed" attr={attributes.speed} />
            <AttributeDisplay label="Balance" attr={attributes.balance} />
            <AttributeDisplay label="Technique" attr={attributes.technique} />
            <AttributeDisplay label="Aggression" attr={attributes.aggression} />
            <AttributeDisplay label="Experience" attr={attributes.experience} />
          </div>

          {/* Scouting Level Indicator */}
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 mb-1.5">
              <Search className={`h-3.5 w-3.5 ${scoutingInfo.color}`} />
              <span className={`text-xs font-medium ${scoutingInfo.color}`}>
                {scoutingInfo.label}
              </span>
              {isOwned && (
                <Badge variant="secondary" className="text-xs ml-auto">Your Stable</Badge>
              )}
            </div>
            <Progress 
              value={scouted.scoutingLevel} 
              className="h-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {scoutingInfo.description}
            </p>
          </div>
        </>
      )}

      {compact && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{archetypeInfo.label}</span>
          <span>•</span>
          <span>{rikishi.weight}kg</span>
          {!isOwned && (
            <ScoutingBadge level={scouted.scoutingLevel} />
          )}
        </div>
      )}
    </div>
  );
}

// Compact scouting badge for list views
function ScoutingBadge({ level }: { level: number }) {
  const info = describeScoutingLevel(level);
  return (
    <span className={`flex items-center gap-1 ${info.color}`} title={info.description}>
      <Search className="h-3 w-3" />
      <span>{Math.round(level)}%</span>
    </span>
  );
}

function AttributeDisplay({ 
  label, 
  attr 
}: { 
  label: string; 
  attr: { value: string; confidence: ConfidenceLevel; narrative: string } 
}) {
  const isUnknown = attr.confidence === "unknown";
  const isUncertain = attr.confidence === "low" || attr.confidence === "medium";
  
  return (
    <div 
      className="flex items-center justify-between gap-2 p-1.5 rounded bg-secondary/30"
      title={attr.narrative}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className={cn(
        "font-medium",
        isUnknown && "text-muted-foreground/50 italic",
        isUncertain && "text-muted-foreground"
      )}>
        {isUnknown ? "?" : attr.value}
      </span>
    </div>
  );
}

function ConfidenceIndicator({ confidence }: { confidence: ConfidenceLevel }) {
  switch (confidence) {
    case "certain":
    case "high":
      return <Eye className="h-3 w-3 text-primary" />;
    case "medium":
      return <Eye className="h-3 w-3" />;
    case "low":
      return <EyeOff className="h-3 w-3 opacity-70" />;
    default:
      return <HelpCircle className="h-3 w-3 opacity-50" />;
  }
}
