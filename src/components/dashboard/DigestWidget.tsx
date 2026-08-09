import React, { useMemo, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/useGame";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BaseWidget } from "./BaseWidget";
import { EmptyState } from "@/components/ui/EmptyState";
import { MentionText } from "@/components/MentionText";
import {
  buildWeeklyDigest,
  type DigestItem,
  type UIDigest,
} from "@/presenters/projections/digestProjections";
import { DIGEST_WIDGET_MAX_ITEMS, DIGEST_SECTIONS_MAX_ITEMS } from "../../constants/ui/display";
import {
  AlertTriangle,
  TrendingUp,
  Activity,
  Coins,
  FileText,
  Sparkles,
  Users,
  Building2,
  Newspaper,
} from "lucide-react";

const KIND_ICON: Record<string, React.ElementType> = {
  training: TrendingUp,
  injury: AlertTriangle,
  recovery: Activity,
  salary: Coins,
  koenkai: Users,
  expense: Building2,
  economy: Sparkles,
  scouting: FileText,
  generic: Newspaper,
};

const KIND_COLOR: Record<string, string> = {
  training: "text-primary",
  injury: "text-destructive",
  recovery: "text-success",
  economy: "text-primary/70",
  scouting: "text-primary/60",
  generic: "text-muted-foreground",
};

const DigestItemRow = React.memo(
  ({
    kind,
    title,
    detail,
    rikishiId,
    heyaId,
    onNavigate,
  }: {
    kind: string;
    title: string;
    detail?: string;
    rikishiId?: string;
    heyaId?: string;
    onNavigate: (path: string) => void;
  }) => {
    const Icon = KIND_ICON[kind] ?? Newspaper;
    const color = KIND_COLOR[kind] ?? "text-muted-foreground";
    const hasEntity = !!(rikishiId || heyaId);
    const entityPath = rikishiId ? `/rikishi/${rikishiId}` : heyaId ? `/stable/${heyaId}` : null;
    return (
      <div
        className={`flex items-start gap-2 text-xs py-0.5 ${hasEntity ? "cursor-pointer hover:bg-muted/30 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1" : ""}`}
        role={hasEntity ? "button" : undefined}
        tabIndex={hasEntity ? 0 : undefined}
        onClick={entityPath ? () => onNavigate(entityPath) : undefined}
        onKeyDown={
          entityPath
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onNavigate(entityPath);
                }
              }
            : undefined
        }
      >
        <Icon className={`h-3 w-3 mt-0.5 shrink-0 ${color}`} />
        <div className="min-w-0">
          <MentionText text={title} className="font-medium" />
          {detail && (
            <>
              <span className="text-muted-foreground ml-1">— </span>
              <MentionText text={detail} className="text-muted-foreground" />
            </>
          )}
        </div>
      </div>
    );
  }
);

const DigestSectionView = React.memo(
  ({
    title,
    items,
    onNavigate,
  }: {
    title: string;
    items: DigestItem[];
    onNavigate: (path: string) => void;
  }) => {
    return (
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          {title}
        </div>
        <div className="space-y-1">
          {(() => {
            const limit = Math.min(DIGEST_WIDGET_MAX_ITEMS, items.length);
            const nodes = new Array(limit);
            for (let i = 0; i < limit; i++) {
              const item = items[i];
              nodes[i] = (
                <DigestItemRow
                  key={item.id}
                  kind={item.kind}
                  title={item.title}
                  detail={item.detail}
                  rikishiId={item.rikishiId}
                  heyaId={item.heyaId}
                  onNavigate={onNavigate}
                />
              );
            }
            return nodes;
          })()}
          {items.length > DIGEST_WIDGET_MAX_ITEMS && (
            <p className="text-[10px] text-muted-foreground pl-5">
              +{items.length - DIGEST_WIDGET_MAX_ITEMS} more
            </p>
          )}
        </div>
      </div>
    );
  }
);

/** digest widget props. */
interface DigestWidgetProps {
  digest?: UIDigest | null;
  fullPage?: boolean;
}

/** digest widget. */
export function DigestWidget({ digest: digestProp, fullPage = false }: DigestWidgetProps = {}) {
  const { state } = useGame();
  const navigate = useNavigate();
  const handleNavigate = useCallback((path: string) => navigate({ to: path }), [navigate]);
  const memoizedDigest = useMemo(() => buildWeeklyDigest(state.world), [state.world]);
  const digest = digestProp !== undefined ? digestProp : memoizedDigest;

  // Compute total items before early return
  const totalItems = useMemo(() => {
    if (!digest) return 0;
    let total = 0;
    for (const sec of digest.sections) total += sec.items.length;
    return total;
  }, [digest]);

  if (!digest) return null;

  const maxSections = fullPage ? digest.sections.length : DIGEST_SECTIONS_MAX_ITEMS;
  const scrollHeight = fullPage ? "max-h-[calc(100vh-200px)]" : "max-h-[260px]";

  return (
    <BaseWidget
      title="Weekly Digest"
      icon={Newspaper}
      headerContent={
        totalItems > 0 && (
          <Badge variant="secondary" className="text-[10px]">
            {totalItems} events
          </Badge>
        )
      }
    >
      <p className="text-xs text-muted-foreground italic">{digest.headline}</p>

      {digest.sections.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="A quiet week."
          description="No notable events."
          compact
        />
      ) : (
        <ScrollArea className={scrollHeight}>
          <div className="space-y-3">
            {(() => {
              const limit = Math.min(maxSections, digest.sections.length);
              const nodes = new Array(limit);
              for (let i = 0; i < limit; i++) {
                const section = digest.sections[i];
                nodes[i] = (
                  <DigestSectionView
                    key={section.id}
                    title={section.title}
                    items={section.items}
                    onNavigate={handleNavigate}
                  />
                );
              }
              return nodes;
            })()}
          </div>
        </ScrollArea>
      )}
    </BaseWidget>
  );
}
