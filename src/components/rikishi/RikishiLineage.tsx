import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { RikishiName } from "@/components/ClickableName";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import { resolveAvatar, rikishiStageInput } from "@/presenters/avatarProjections";
import { DEFAULT_START_YEAR } from "@/constants/engine/calendar";
import type { Rikishi } from "@/engine/types/rikishi";
import { LineageTree } from "@/components/game/LineageTree";

interface RikishiLineageProps {
  mentor: Rikishi | null;
  mentees: (Rikishi | null)[];
  rikishiId: string;
  currentYear?: number;
}

export function RikishiLineage({ mentor, mentees, rikishiId, currentYear = DEFAULT_START_YEAR }: RikishiLineageProps) {
  const avatarOf = (r: Rikishi) =>
    resolveAvatar({
      id: r.id,
      stored: r.avatarConfig,
      nationality: r.nationality,
      ...rikishiStageInput(r, currentYear),
    });
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
      {/* Mentor & Mentees Summary */}
      <div className="md:col-span-1 space-y-4">
        <div className="p-5 bg-card/40 border border-border rounded-xl h-full">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
            <Users className="h-4 w-4" /> Mentorship
          </h3>

          <div className="space-y-6">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase mb-2">Primary Mentor</p>
              {mentor ? (
                <div className="flex items-center gap-3 p-3 bg-card/50 border border-border/50 rounded-lg group hover:border-gold/50 transition-colors">
                  <SumoAvatar avatar={avatarOf(mentor)} size="sm" fallback={mentor.shikona} />
                  <div>
                    <RikishiName
                      id={mentor.id}
                      name={mentor.shikona}
                      className="font-bold text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground uppercase">{mentor.rank}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No direct mentor recorded.</p>
              )}
            </div>

            <div>
              <p className="text-[10px] text-muted-foreground uppercase mb-2">
                Mentees ({mentees.length})
              </p>
              <div className="space-y-2">
                {mentees.length > 0 ? (
                  mentees.map(
                    (m) =>
                      m && (
                        <div
                          key={m.id}
                          className="flex items-center justify-between p-2 hover:bg-card/30 rounded-md transition-colors"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <SumoAvatar avatar={avatarOf(m)} size="xs" fallback={m.shikona} />
                            <RikishiName id={m.id} name={m.shikona} className="text-xs" />
                          </span>
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {m.rank}
                          </Badge>
                        </div>
                      )
                  )
                ) : (
                  <p className="text-xs text-muted-foreground italic">No current mentees.</p>
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
