import React, { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/useGame";
import { Badge } from "@/components/ui/badge";
import { StableName } from "@/components/ClickableName";
import { Swords, Flame } from "lucide-react";
import { BaseWidget } from "./BaseWidget";
import { selectTopRivals } from "@/presenters/selectors";

const RivalRow = React.memo(
  ({
    id,
    name,
    prestige,
    roster,
    heat,
  }: {
    id: string;
    name: string;
    prestige: string;
    roster: string;
    heat: string;
  }) => {
    return (
      <div className="flex items-center gap-2 py-1.5 px-2 rounded-md text-xs hover:bg-muted/50 transition-colors">
        <StableName id={id} name={name} className="font-medium flex-1 truncate" />
        <Badge variant="outline" className="text-[10px] capitalize shrink-0">
          {prestige}
        </Badge>
        <span className="text-[10px] text-muted-foreground capitalize w-16 text-right">
          {roster}
        </span>
        {(heat === "blazing" || heat === "hot") && (
          <Flame className="h-3 w-3 text-accent shrink-0 animate-pulse-glow" />
        )}
      </div>
    );
  }
);

/** rivals widget. */
const RivalList = React.memo(({ rivals }: { rivals: ReturnType<typeof selectTopRivals> }) => {
  return (
    <>
      {(() => {
        const limit = rivals.length;
        const nodes = new Array(limit);
        for (let i = 0; i < limit; i++) {
          const r = rivals[i];
          nodes[i] = (
            <RivalRow
              key={r.id}
              id={r.id}
              name={r.name}
              prestige={r.prestige}
              roster={r.roster}
              heat={r.heat}
            />
          );
        }
        return nodes;
      })()}
    </>
  );
});

export function RivalsWidget() {
  const { state } = useGame();
  const navigate = useNavigate();
  const headerAction = useMemo(
    () => ({
      label: "All",
      onClick: () => navigate({ to: "/basho/rivalries" }),
      tooltip: "Analyze rival stables and their relative prestige",
    }),
    [navigate]
  );
  const world = state.world;

  const rivals = useMemo(() => {
    if (!world) return [];
    return selectTopRivals(world);
  }, [world]);

  if (!world || !rivals.length) return null;

  return (
    <BaseWidget title="Rival Stables" icon={Swords} headerAction={headerAction}>
      <div className="space-y-0.5">
        <RivalList rivals={rivals} />
      </div>
    </BaseWidget>
  );
}
