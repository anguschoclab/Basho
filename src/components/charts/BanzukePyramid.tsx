/**
 * BanzukePyramid.tsx
 * ==================
 * Visual pyramid showing rank distribution in banzuke.
 */

import { cn } from "@/lib/utils";

interface RankCount {
  rank: string;
  count: number;
}

interface BanzukePyramidProps {
  data: RankCount[];
  className?: string;
}

const rankColors: Record<string, string> = {
  Yokozuna: "bg-[hsl(var(--gold))]",
  Ozeki: "bg-[hsl(var(--gold))]/80",
  Sekiwake: "bg-[hsl(var(--gold))]/60",
  Komusubi: "bg-[hsl(var(--east))]",
  "Maegashira 1-8": "bg-[hsl(var(--east))]/60",
  "Maegashira 9-15": "bg-[hsl(var(--muted))]",
  Juryo: "bg-[hsl(var(--west))]/60",
  Makushita: "bg-muted",
};

export function BanzukePyramid({ data, className }: BanzukePyramidProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className={cn("space-y-2", className)}>
      {data.map((item) => (
        <div key={item.rank} className="flex items-center gap-3">
          <div className="w-28 text-[10px] font-mono font-bold uppercase text-muted-foreground">
            {item.rank}
          </div>
          <div className="flex-1 flex items-center">
            <div
              className={cn(
                "h-6 rounded-xs flex items-center justify-end px-2",
                rankColors[item.rank] || "bg-muted"
              )}
              style={{ width: `${(item.count / maxCount) * 100}%` }}
            >
              <span className="text-[10px] font-mono font-bold text-primary-foreground">
                {item.count}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
