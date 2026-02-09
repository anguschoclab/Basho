// Weekly Digest Component - Shows training progress, injuries, and financial summaries
// Per uiDigest.ts: Converts engine outputs into readable, grouped digest sections

import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { RikishiName, StableName } from "@/components/ClickableName";
import type { UIDigest, DigestSection, DigestItem } from "@/engine/uiDigest";
import { buildWeeklyDigest } from "@/engine/uiDigest";
import { useGame } from "@/contexts/GameContext";
import {
  Activity,
  AlertTriangle,
  Coins,
  TrendingUp,
  Users,
  Building2,
  FileText,
  Sparkles
} from "lucide-react";

interface WeeklyDigestProps {
  digest?: UIDigest | null;
  className?: string;
}

const KIND_ICONS: Record<string, React.ElementType> = {
  training: TrendingUp,
  injury: AlertTriangle,
  recovery: Activity,
  salary: Coins,
  koenkai: Users,
  expense: Building2,
  economy: Sparkles,
  scouting: FileText,
  generic: FileText,
};

const KIND_COLORS: Record<string, string> = {
  training: "text-primary",
  injury: "text-destructive",
  recovery: "text-success",
  salary: "text-warning",
  koenkai: "text-purple-400",
  expense: "text-orange-400",
  economy: "text-blue-400",
  scouting: "text-cyan-400",
  generic: "text-muted-foreground",
};

function DigestItemDisplay({ item }: { item: DigestItem }) {
  const Icon = KIND_ICONS[item.kind] || FileText;
  const colorClass = KIND_COLORS[item.kind] || "text-muted-foreground";

  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${colorClass}`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">
          {item.rikishiId ? (
            <RikishiName id={item.rikishiId} name={item.title.split(" ")[0]} />
          ) : item.heyaId ? (
            <StableName id={item.heyaId} name={item.title.split(":")[0]} />
          ) : null}
          {item.rikishiId || item.heyaId ? (
            <span className="text-muted-foreground">
              {item.title.includes(" ") ? item.title.substring(item.title.indexOf(" ")) : ""}
            </span>
          ) : (
            item.title
          )}
        </div>
        {item.detail && (
          <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
        )}
      </div>
    </div>
  );
}

function DigestSectionDisplay({ section }: { section: DigestSection }) {
  if (!section.items.length) return null;

  return (
    <div className="space-y-1">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {section.title}
      </h4>
      <div className="divide-y divide-border/50">
        {section.items.slice(0, 5).map((item) => (
          <DigestItemDisplay key={item.id} item={item} />
        ))}
        {section.items.length > 5 && (
          <div className="text-xs text-muted-foreground py-2">
            + {section.items.length - 5} more events
          </div>
        )}
      </div>
    </div>
  );
}

export function WeeklyDigest({ digest: digestProp, className }: WeeklyDigestProps) {
  const { state } = useGame();
  const digest = useMemo(() => digestProp ?? buildWeeklyDigest(state.world), [digestProp, state.world]);

  if (!digest) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Weekly Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No recent activity to report. Start your first basho to begin tracking events.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { counts, headline, sections, time } = digest;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Weekly Report
            </CardTitle>
            {time.label && (
              <CardDescription className="mt-1">{time.label}</CardDescription>
            )}
          </div>
          <div className="flex gap-2">
            {counts.trainingEvents > 0 && (
              <Badge variant="secondary">{counts.trainingEvents} training</Badge>
            )}
            {counts.injuries > 0 && (
              <Badge variant="destructive">{counts.injuries} injured</Badge>
            )}
            {counts.economy > 0 && (
              <Badge variant="outline">{counts.economy} economy</Badge>
            )}
            {counts.scouting > 0 && (
              <Badge variant="outline">{counts.scouting} scouting</Badge>
            )}
          </div>
        </div>
        {headline && (
          <p className="text-sm text-muted-foreground mt-2">{headline}</p>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <Separator className="mb-3" />
        <ScrollArea className="h-[280px] pr-3">
          <div className="space-y-6">
            {sections.length ? (
              sections.map((section) => (
                <DigestSectionDisplay key={section.id} section={section} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No categorized events yet.
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
