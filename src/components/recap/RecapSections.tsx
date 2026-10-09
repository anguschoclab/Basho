/**
 * RecapSections.tsx
 *
 * RecapPage sections — hero action buttons, kihaku/kachi-nokori/
 * exhibition stat sections, and the ceremony/modal stack.
 */

import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronRight } from "lucide-react";
import { PressConference } from "@/components/game/PressConference";
import { YokozunaDeliberation } from "@/components/game/YokozunaDeliberation";
import { HoFInductionCeremony } from "@/components/game/HoFInductionCeremony";
import { IntaiCeremony } from "@/components/game/IntaiCeremony";
import { selectTopKihakuPerformers } from "@/presenters/projections/recapKihakuProjections";
import { selectKachiNokoriLeaders } from "@/presenters/projections/recapKachiNokoriProjections";
import { selectExhibitionResults } from "@/presenters/projections/recapExhibitionProjections";
import { EntityCollection } from "@/presenters/engineAccess";
import { getPlayerHeya } from "@/presenters/engineAccess";
import { getHeya, getRikishi, getRikishiAnywhere } from "@/presenters/worldAccess";
import { projectRikishi } from "@/presenters/uiModels";
import { projectPressConferenceData } from "@/presenters/uiDigest";
import type { WorldState } from "@/presenters/uiDigest";
import type { HoFInductee } from "@/presenters/engineAccess";
import type { UIRikishi } from "@/presenters/uiModels";

/** Hero action buttons (right side of the recap page header). */
export function RecapHeroActions({
  onFinalize,
  onBanzukeReveal,
  onPressConference,
}: {
  onFinalize: () => void;
  onBanzukeReveal: () => void;
  onPressConference: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex gap-3">
      <Button
        variant="outline"
        className="h-12 px-6 font-black uppercase tracking-widest border-2"
        onClick={() => navigate({ to: "/basho/banzuke" })}
      >
        Banzuke <ArrowRight className="h-4 w-4 ml-1" />
      </Button>
      <Button
        variant="outline"
        className="h-12 px-6 font-black uppercase tracking-widest border-2"
        onClick={onBanzukeReveal}
      >
        Banzuke Reveal
      </Button>
      <Button
        variant="outline"
        className="h-12 px-6 font-black uppercase tracking-widest border-2"
        onClick={onPressConference}
      >
        Press Conference
      </Button>
      <Button
        className="h-12 px-10 gap-3 font-display font-black uppercase tracking-widest shadow-xl shadow-primary/20"
        onClick={onFinalize}
      >
        Finalize Basho <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}

/** Kihaku top-5 performers section. */
export function KihakuSection({ world }: { world: WorldState }) {
  const performers = selectTopKihakuPerformers(world);
  if (performers.length === 0) return null;
  return (
    <section data-testid="kihaku-performers-section">
      <div className="flex items-center gap-4 mb-3">
        <h2 className="text-xl font-semibold">Fighting Spirit Leaders</h2>
      </div>
      <div className="space-y-2">
        {performers.map((p, i) => (
          <div
            key={p.rikishiId}
            className="flex items-center justify-between p-3 rounded border border-border/50"
            data-testid={`kihaku-performer-${i}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground tabular-nums text-sm">#{i + 1}</span>
              <span className="font-medium">{p.shikona}</span>
              <span className="text-xs text-muted-foreground">{p.heyaName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm tabular-nums">{p.kihakuIsenScore}</span>
              <span className="text-xs text-muted-foreground">{p.label}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Kachi-nokori win-margins section. */
export function KachiNokoriSection({ world }: { world: WorldState }) {
  const leaders = selectKachiNokoriLeaders(world);
  if (leaders.length === 0) return null;
  return (
    <section data-testid="kachi-nokori-section">
      <div className="flex items-center gap-4 mb-3">
        <h2 className="text-xl font-semibold">Win Margins (Kachi-nokori)</h2>
      </div>
      <div className="space-y-2">
        {leaders.map((k, i) => (
          <div
            key={k.rikishiId}
            className="flex items-center justify-between p-3 rounded border border-border/50"
            data-testid={`kachi-nokori-${i}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground tabular-nums text-sm">#{i + 1}</span>
              <span className="font-medium">{k.shikona}</span>
              <span className="text-xs text-muted-foreground">{k.heyaName}</span>
            </div>
            <div className="flex items-center gap-3 text-sm tabular-nums">
              <span className="text-muted-foreground">{k.wins}W</span>
              <span>+{k.kachiNokori}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Exhibition / jungyo results section. */
export function ExhibitionSection({ world }: { world: WorldState }) {
  const exhibitions = selectExhibitionResults(world, world.playerHeyaId);
  if (exhibitions.length === 0) return null;
  return (
    <section data-testid="exhibition-results-section">
      <div className="flex items-center gap-4 mb-3">
        <h2 className="text-xl font-semibold">Exhibition Tour Results</h2>
      </div>
      <div className="space-y-3">
        {exhibitions.map((ex) => (
          <div
            key={ex.exhibitionId}
            className="p-3 rounded border border-border/50 space-y-2"
            data-testid={`exhibition-result-${ex.exhibitionId}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{ex.name}</span>
              <span className="text-xs text-muted-foreground">{ex.location}</span>
            </div>
            {ex.results.length > 0 && (
              <div className="text-xs space-y-1">
                {ex.results.slice(0, 5).map((r, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{r.shikona}</span>
                    <span className="tabular-nums">
                      {r.wins}-{r.losses}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/** Ceremony & modal stack rendered when the matching state is set. */
export function RecapModals({
  world,
  showPressConference,
  showYokozunaDelib,
  showHoFCeremony,
  intaiQueue,
  currentIntaiIndex,
  onPressConferenceClose,
  onYokozunaDelibClose,
  onHoFCeremonyClose,
  onIntaiAdvance,
}: {
  world: WorldState;
  showPressConference: boolean;
  showYokozunaDelib: boolean;
  showHoFCeremony: HoFInductee | null;
  intaiQueue: { rikishi: UIRikishi; reason: string }[];
  currentIntaiIndex: number;
  onPressConferenceClose: (effects: {
    reputation: number;
    morale: number;
    mediaHeat: number;
  }) => void;
  onYokozunaDelibClose: () => void;
  onHoFCeremonyClose: () => void;
  onIntaiAdvance: () => void;
}) {
  return (
    <>
      {showPressConference && (
        <PressConference
          pressData={projectPressConferenceData(world)}
          open={showPressConference}
          onClose={onPressConferenceClose}
        />
      )}

      {showYokozunaDelib && (
        <YokozunaDeliberation
          open={showYokozunaDelib}
          rikishi={projectRikishi(EntityCollection.getActiveRikishi(world)[0], world)}
          heyaName={getPlayerHeya(world)?.name || "Unknown Stable"}
          isPlayerRikishi={true}
          verdict="deferred"
          reasoning={["Continued performance required."]}
          onClose={onYokozunaDelibClose}
        />
      )}

      {showHoFCeremony && (
        <HoFInductionCeremony
          inductee={showHoFCeremony}
          heyaName={(() => {
            const r = getRikishiAnywhere(world, showHoFCeremony.rikishiId);
            const h = r ? getHeya(world, r.heyaId) : null;
            return h?.name || "Independent";
          })()}
          isPlayerRikishi={
            getRikishi(world, showHoFCeremony.rikishiId)?.heyaId === world.playerHeyaId
          }
          open={!!showHoFCeremony}
          onClose={onHoFCeremonyClose}
        />
      )}

      {intaiQueue.length > 0 && currentIntaiIndex < intaiQueue.length && (
        <IntaiCeremony
          heyaName={getPlayerHeya(world)?.name || "Unknown Stable"}
          isPlayerRikishi={true}
          open={true}
          rikishi={intaiQueue[currentIntaiIndex].rikishi}
          reason={intaiQueue[currentIntaiIndex].reason}
          onClose={onIntaiAdvance}
        />
      )}
    </>
  );
}
