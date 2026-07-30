import { Badge } from "@/components/ui/badge";
import { Users, User } from "lucide-react";
import { RikishiName } from "@/components/ClickableName";
import type { Rikishi } from "@/engine/types/rikishi";
import { LineageTree } from "@/components/game/LineageTree";

interface RikishiLineageProps {
  mentor: Rikishi | null;
  mentees: (Rikishi | null)[];
  rikishiId: string;
}

export function RikishiLineage({ mentor, mentees, rikishiId }: RikishiLineageProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
      {/* Mentor & Mentees Summary */}
      <div className="md:col-span-1 space-y-4">
        <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-xl h-full">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
            <Users className="h-4 w-4" /> Mentorship
          </h3>

          <div className="space-y-6">
            <div>
              <p className="text-[10px] text-slate-500 uppercase mb-2">Primary Mentor</p>
              {mentor ? (
                <div className="flex items-center gap-3 p-3 bg-slate-950/50 border border-slate-800/50 rounded-lg group hover:border-amber-500/50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                  <div>
                    <RikishiName
                      id={mentor.id}
                      name={mentor.shikona}
                      className="font-bold text-sm"
                    />
                    <p className="text-[9px] text-muted-foreground uppercase">{mentor.rank}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-600 italic">No direct mentor recorded.</p>
              )}
            </div>

            <div>
              <p className="text-[10px] text-slate-500 uppercase mb-2">
                Mentees ({mentees.length})
              </p>
              <div className="space-y-2">
                {mentees.length > 0 ? (
                  mentees.map(
                    (m) =>
                      m && (
                        <div
                          key={m.id}
                          className="flex items-center justify-between p-2 hover:bg-slate-800/30 rounded-md transition-colors"
                        >
                          <RikishiName id={m.id} name={m.shikona} className="text-xs" />
                          <Badge variant="outline" className="text-[8px] px-1 py-0">
                            {m.rank}
                          </Badge>
                        </div>
                      )
                  )
                ) : (
                  <p className="text-xs text-slate-600 italic">No current mentees.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The Spirit Lineage Tree */}
      <div className="md:col-span-2">
        <LineageTree rikishiId={rikishiId} />
      </div>
    </div>
  );
}
