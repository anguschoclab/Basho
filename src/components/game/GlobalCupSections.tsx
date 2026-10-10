/**
 * GlobalCupSections.tsx
 *
 * Global Cup page sections — hero banner, stats bar, tournament stats,
 * participants grid, event feed, bracket, and champion banner.
 */

import { Trophy, Users, Calendar, MapPin, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/layout/control-center";
import { GlobalCupBracket } from "@/components/game/GlobalCupBracket";
import { GlobalCupParticipantCard } from "@/components/game/GlobalCupParticipant";
import { ProgressArc } from "@/components/charts/ProgressArc";
import { GlobalCupDashboardStats } from "@/components/charts/GlobalCupStats";
import { EventFeed } from "@/components/dashboard/EventFeed";
import type { GlobalCupParticipant } from "@/engine/types/globalCup";
import type { WorldState } from "@/presenters/uiDigest";
import type { projectGlobalCup } from "@/presenters/projections/globalCupProjections";

type GlobalCupState = NonNullable<WorldState["globalCup"]>;
type CupProjection = ReturnType<typeof projectGlobalCup>;

const CUP_PHASE_LABELS: Record<string, { label: string; description: string }> = {
  registration: {
    label: "Registration Open",
    description: "International challengers are being confirmed for the tournament.",
  },
  quarterfinals: {
    label: "Quarterfinals",
    description: "Eight rikishi compete in single elimination. Day 1 & 2.",
  },
  semifinals: {
    label: "Semifinals",
    description: "The four victors face off for a place in the final. Day 3 & 4.",
  },
  finale: {
    label: "Finale",
    description: "The championship match. Day 5.",
  },
  complete: {
    label: "Tournament Complete",
    description: "The Global Cup champion has been crowned.",
  },
};

function cupProgressPercent(phase: string): number {
  switch (phase) {
    case "registration":
      return 0;
    case "quarterfinals":
      return 25;
    case "semifinals":
      return 50;
    case "finale":
      return 75;
    default:
      return 100;
  }
}

/** Hero banner — title, phase label, progress arc. */
export function CupHero({ cup }: { cup: GlobalCupState }) {
  const phaseInfo = CUP_PHASE_LABELS[cup.phase];

  return (
    <div className="relative p-8 rounded-lg bg-gold/10 border border-gold/30">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <PageHeader
          eyebrow="── GLOBAL CUP ──"
          title="世界大相橲"
          lede={`Worlds Exhibition · Year ${cup.year}`}
        />
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-[10px] font-mono uppercase text-muted-foreground">Phase</div>
            <div className="text-sm font-bold">{phaseInfo.label}</div>
          </div>
          <ProgressArc value={cupProgressPercent(cup.phase)} size="md" color="gold" />
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{phaseInfo.description}</p>
    </div>
  );
}

/** Stats bar — participants, week, venue. */
export function CupStatsBar({ cup }: { cup: GlobalCupState }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="p-4 rounded-lg bg-card border border-border">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-4 w-4" />
          <span className="text-[10px] font-mono uppercase">Participants</span>
        </div>
        <div className="text-2xl font-display font-bold">{cup.participants.length}</div>
      </div>
      <div className="p-4 rounded-lg bg-card border border-border">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="text-[10px] font-mono uppercase">Week</span>
        </div>
        <div className="text-2xl font-display font-bold">{cup.startedAtWeek}</div>
      </div>
      <div className="p-4 rounded-lg bg-card border border-border">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span className="text-[10px] font-mono uppercase">Location</span>
        </div>
        <div className="text-lg font-bold">Ryōgoku Kokugikan</div>
      </div>
    </div>
  );
}

/** Tournament statistics data visualization. */
export function CupStatsSection({ projection }: { projection: CupProjection }) {
  return (
    <div>
      <h2 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
        <BarChart3 className="h-5 w-5" />
        Tournament Statistics
      </h2>
      <GlobalCupDashboardStats projection={projection} />
    </div>
  );
}

/** Participants grid — one card per participant, champion highlighted. */
export function CupParticipantsGrid({ cup }: { cup: GlobalCupState }) {
  return (
    <div>
      <h2 className="text-lg font-display font-bold mb-4">Participants</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cup.participants.map((p: GlobalCupParticipant) => (
          <GlobalCupParticipantCard
            key={p.rikishiId}
            participant={p}
            isChampion={p.rikishiId === cup.championId}
          />
        ))}
      </div>
    </div>
  );
}

/** Tournament event feed. */
export function CupEventFeed() {
  return (
    <div>
      <h2 className="text-lg font-display font-bold mb-4">Tournament Events</h2>
      <EventFeed filterTypes={["GLOBAL_CUP_START", "GLOBAL_CUP_FINALE"]} maxEvents={5} />
    </div>
  );
}

/** Single-elimination bracket (hidden until matches exist). */
export function CupBracketSection({
  cup,
  rikishiNames,
}: {
  cup: GlobalCupState;
  rikishiNames: Map<string, string>;
}) {
  if (cup.bracket.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-display font-bold mb-4">Tournament Bracket</h2>
      <div className="p-4 rounded-lg bg-card border border-border overflow-x-auto">
        <GlobalCupBracket matches={cup.bracket} rikishiNames={rikishiNames} />
      </div>
    </div>
  );
}

/** Champion banner (hidden until crowned). */
export function CupChampionBanner({
  cup,
  rikishiNames,
}: {
  cup: GlobalCupState;
  rikishiNames: Map<string, string>;
}) {
  if (!cup.championId) return null;

  return (
    <div className="p-6 rounded-lg bg-gold/10 border border-gold/30">
      <div className="flex items-center gap-4">
        <Trophy className="h-12 w-12 text-gold" />
        <div>
          <div className="text-[10px] font-mono uppercase text-muted-foreground">
            {cup.year} Champion
          </div>
          <div className="text-2xl font-display font-bold text-gold">
            {rikishiNames.get(cup.championId) || "Unknown"}
          </div>
          <div className="text-sm text-muted-foreground">Winner of the Global Cup - 世界大相撲</div>
        </div>
      </div>
    </div>
  );
}
