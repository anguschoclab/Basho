/**
 * GlobalCupPage.tsx
 * =================
 * Main tournament page for the Global Cup (Worlds Exhibition).
 */

import { Helmet } from "react-helmet";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGame } from "@/contexts/GameContext";
import { Trophy, Users, Calendar, MapPin } from "lucide-react";
import { GlobalCupBracket } from "@/components/game/GlobalCupBracket";
import { GlobalCupParticipantCard } from "@/components/game/GlobalCupParticipant";
import { ProgressArc } from "@/components/charts/ProgressArc";
import type { GlobalCupParticipant } from "@/engine/types/globalCup";

export default function GlobalCupPage() {
  const { state } = useGame();
  const world = state.world;
  const cup = world?.globalCup;

  const phaseLabels: Record<string, { label: string; description: string }> = {
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

  if (!cup || !cup.isActive) {
    return (
      <AppLayout pageTitle="Global Cup">
        <Helmet>
          <title>Global Cup | Basho</title>
        </Helmet>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
          <Trophy className="h-16 w-16 text-gold/50" />
          <h1 className="text-3xl font-display font-bold">世界大相撲</h1>
          <p className="text-xl text-muted-foreground">Worlds Exhibition</p>
          <p className="text-sm text-muted-foreground max-w-md">
            The Global Cup will be held during interim weeks 10-11 each year. The top 6 JSA rikishi
            face 2 international challengers in a single elimination tournament.
          </p>
        </div>
      </AppLayout>
    );
  }

  const phaseInfo = phaseLabels[cup.phase];
  const progressPercent =
    cup.phase === "registration"
      ? 0
      : cup.phase === "quarterfinals"
        ? 25
        : cup.phase === "semifinals"
          ? 50
          : cup.phase === "finale"
            ? 75
            : 100;

  // Build rikishi name map
  const rikishiNames = new Map<string, string>();
  cup.participants.forEach((p: { rikishiId: string; shikona: string }) => {
    rikishiNames.set(p.rikishiId, p.shikona);
  });

  return (
    <AppLayout pageTitle="Global Cup">
      <Helmet>
        <title>Global Cup | Basho</title>
      </Helmet>

      <div className="space-y-8">
        {/* Hero Section */}
        <div className="relative p-8 rounded-lg bg-gradient-to-r from-gold/20 to-primary/10 border border-gold/30">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="h-8 w-8 text-gold" />
                <span className="text-3xl font-display font-bold">世界大相撲</span>
              </div>
              <p className="text-lg text-muted-foreground">Worlds Exhibition Year {cup.year}</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-[10px] font-mono uppercase text-muted-foreground">Phase</div>
                <div className="text-sm font-bold">{phaseInfo.label}</div>
              </div>
              <ProgressArc value={progressPercent} size="md" color="gold" />
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{phaseInfo.description}</p>
        </div>

        {/* Stats Bar */}
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

        {/* Participants Grid */}
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

        {/* Bracket */}
        {cup.bracket.length > 0 && (
          <div>
            <h2 className="text-lg font-display font-bold mb-4">Tournament Bracket</h2>
            <div className="p-4 rounded-lg bg-card border border-border overflow-x-auto">
              <GlobalCupBracket matches={cup.bracket} rikishiNames={rikishiNames} />
            </div>
          </div>
        )}

        {/* Champion Section */}
        {cup.championId && (
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
                <div className="text-sm text-muted-foreground">
                  Winner of the Global Cup - 世界大相撲
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
