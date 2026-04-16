/**
 * RikishiLineage.tsx
 *
 * Lineage and mentorship section for rikishi profile.
 */

import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { RikishiName } from "@/components/ClickableName";
import type { Rikishi } from "@/engine/types";

interface LineageNode {
  id: string;
  shikona: string;
  rank: string;
  depth: number;
}

interface RikishiLineageProps {
  mentor: Rikishi | null;
  mentees: (Rikishi | null)[];
  lineageTree: LineageNode[];
}

export function RikishiLineage({ mentor, mentees, lineageTree }: RikishiLineageProps) {
  if (!mentor && mentees.length === 0 && lineageTree.length === 0) {
    return null;
  }

  return (
    <div className="mb-10 p-6 bg-primary/5 border-2 border-primary/10 rounded-lg">
      <h3 className="text-lg font-display font-black flex items-center gap-2 uppercase tracking-tight mb-4">
        <Users className="h-5 w-5 text-primary" /> Lineage & Mentorship
      </h3>
      <div className="space-y-4">
        {mentor && (
          <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground w-20">
              Mentor
            </div>
            <RikishiName id={mentor.id} name={mentor.shikona} className="font-bold" />
            <Badge variant="outline" className="text-xs">
              {mentor.rank}
            </Badge>
          </div>
        )}
        {mentees.length > 0 && (
          <div className="flex items-start gap-4 p-3 bg-muted/30 rounded-lg">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground w-20 shrink-0">
              Mentees
            </div>
            <div className="flex flex-wrap gap-2">
              {mentees.map((m) =>
                m ? (
                  <div key={m.id} className="flex items-center gap-2">
                    <RikishiName id={m.id} name={m.shikona} className="text-sm" />
                    <Badge variant="outline" className="text-[10px]">
                      {m.rank}
                    </Badge>
                  </div>
                ) : null
              )}
            </div>
          </div>
        )}
        {lineageTree.length > 0 && (
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Lineage Tree
            </div>
            <div className="space-y-1">
              {lineageTree.map((node) => (
                <div
                  key={node.id}
                  className="flex items-center gap-2 text-sm pl-2"
                  style={{ paddingLeft: `${node.depth * 16}px` }}
                >
                  <span className="text-muted-foreground">└</span>
                  <RikishiName id={node.id} name={node.shikona} className="text-sm" />
                  <Badge variant="outline" className="text-[10px]">
                    {node.rank}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
