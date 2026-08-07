/**
 * InboxNewsTicker.tsx
 * ===================
 * A persistent, unobtrusive ticker for minor drama and engine updates.
 */

import { useGame } from "../../contexts/useGame";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";

export function InboxNewsTicker() {
  const { digest } = useGame();
  if (!digest || !digest.sections) return null;

  // Flatten all items from all sections for the ticker
  const allItems = digest.sections.flatMap((s) =>
    s.items.map((i) => ({ ...i, sectionTitle: s.title }))
  );

  if (allItems.length === 0) return null;

  return (
    <div className="w-full bg-background/80 border-b h-10 flex items-center overflow-hidden px-4">
      <div className="flex-shrink-0 mr-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">
        Latest News
      </div>
      <div className="flex gap-8 animate-marquee whitespace-nowrap">
        {allItems.map((item, idx) => (
          <div key={`${item.id}-${idx}`} className="flex items-center gap-2 text-sm">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] h-4",
                item.kind === "injury"
                  ? "border-destructive text-destructive"
                  : item.kind === "economy"
                    ? "border-gold text-gold"
                    : "border-muted-foreground"
              )}
            >
              {item.sectionTitle}
            </Badge>
            <span className="font-semibold">{item.title}</span>
            <span className="text-muted-foreground">— {item.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
