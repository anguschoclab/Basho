import { useMemo } from "react";
import { useGame } from "@/contexts/useGame";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Bookmark, BookmarkX, ChevronDown, ChevronRight } from "lucide-react";
import { RikishiCard } from "@/components/game/RikishiCard";
import { projectRikishi } from "@/presenters/rikishi";
import { getRikishi, getHeya } from "@/presenters/worldAccess";

interface BookmarkEntry {
  entityType: string;
  entityId: string;
  note?: string;
}

function BookmarkItem({
  bookmark,
  onRemove,
  onUpdateNote,
}: {
  bookmark: BookmarkEntry;
  onRemove: () => void;
  onUpdateNote: (note: string) => void;
}) {
  const { state } = useGame();
  const world = state.world;

  const entityPreview = useMemo(() => {
    if (!world) return null;
    switch (bookmark.entityType) {
      case "rikishi": {
        const r = getRikishi(world, bookmark.entityId);
        if (!r) return <p className="text-sm text-muted-foreground">Rikishi not found</p>;
        const uiRikishi = projectRikishi(r, world);
        return <RikishiCard rikishi={uiRikishi} />;
      }
      case "heya": {
        const h = getHeya(world, bookmark.entityId);
        if (!h) return <p className="text-sm text-muted-foreground">Heya not found</p>;
        return (
          <div className="p-3 rounded-lg border border-primary/10 bg-card/50">
            <p className="font-display text-primary">{h.name}</p>
            <p className="text-xs text-muted-foreground">{h.rikishiIds?.length ?? 0} rikishi</p>
          </div>
        );
      }
      default:
        return (
          <div className="p-3 rounded-lg border border-primary/10 bg-card/50">
            <p className="font-mono text-sm text-primary">{bookmark.entityType}</p>
            <p className="text-xs text-muted-foreground font-mono">{bookmark.entityId}</p>
          </div>
        );
    }
  }, [world, bookmark]);

  return (
    <div className="space-y-2">
      {entityPreview}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Add a note..."
          value={bookmark.note ?? ""}
          onChange={(e) => onUpdateNote(e.target.value)}
          className="h-7 text-xs"
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0"
          onClick={onRemove}
          aria-label="Remove bookmark"
          tooltip="Remove bookmark"
        >
          <BookmarkX className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}

export default function BookmarksPage() {
  const { state, unbookmarkEntity, updateBookmarkNote } = useGame();
  const world = state.world;

  const bookmarks = useMemo(() => world?.playerKnowledge?.bookmarks ?? [], [world]);

  const grouped = useMemo(() => {
    const map = new Map<string, BookmarkEntry[]>();
    for (const b of bookmarks) {
      const list = map.get(b.entityType) ?? [];
      list.push(b);
      map.set(b.entityType, list);
    }
    return map;
  }, [bookmarks]);

  const entityTypeLabel = (type: string) => {
    switch (type) {
      case "rikishi":
        return "Rikishi";
      case "heya":
        return "Stables";
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  return (
    <AppLayout pageTitle="Bookmarks">

        <title>Bookmarks | Basho Manager</title>


      <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-700">
        {bookmarks.length === 0 ? (
          <Card className="border-primary/10 bg-card/50">
            <EmptyState
              icon={Bookmark}
              title="No bookmarks yet"
              description="Tag rikishi, stables, or bouts to track them here."
            />
          </Card>
        ) : (
          Array.from(grouped.entries()).map(([entityType, items]) => (
            <Collapsible key={entityType} defaultOpen>
              <Card className="border-primary/10 bg-card/50">
                <CardHeader className="pb-2">
                  <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform data-[state=closed]:hidden" />
                    <ChevronRight className="h-4 w-4 shrink-0 transition-transform data-[state=open]:hidden" />
                    <CardTitle className="text-sm font-display">
                      {entityTypeLabel(entityType)}{" "}
                      <span className="text-muted-foreground font-mono text-xs">
                        ({items.length})
                      </span>
                    </CardTitle>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    {items.map((bookmark) => (
                      <BookmarkItem
                        key={`${bookmark.entityType}-${bookmark.entityId}`}
                        bookmark={bookmark}
                        onRemove={() => unbookmarkEntity(bookmark.entityType, bookmark.entityId)}
                        onUpdateNote={(note) =>
                          updateBookmarkNote(bookmark.entityType, bookmark.entityId, note)
                        }
                      />
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))
        )}
      </div>
    </AppLayout>
  );
}
