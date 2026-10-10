/**
 * StablePageTabs.tsx
 *
 * Tab content sections of StablePage — roster grid with mentor
 * assignment, institution panel, tsukebito attendants, and youth academy.
 */

import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/useGame";
import { useGameStore } from "@/store/gameStore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TabsContent } from "@/components/ui/tabs";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { AlertTriangle, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { InstitutionPanel } from "@/components/game/InstitutionPanel";
import { projectHeyaData } from "@/presenters/projections/heyaProjections";
import { MentorAssignmentPanel } from "@/components/game/MentorAssignmentPanel";
import { TsukebitoPanel } from "@/components/training/TsukebitoPanel";
import { YouthAcademyPanel } from "@/components/recruitment/YouthAcademyPanel";
import { projectTsukebito } from "@/presenters/tsukebitoProjections";
import { projectYouthAcademy } from "@/presenters/youthAcademyProjections";
import type { WorldState } from "@/presenters/uiDigest";
import type { projectRikishi } from "@/presenters/rikishi";
import type { Rikishi } from "@/engine/types/rikishi";
import type { Heya } from "@/engine/types/heya";

type RikishiDTO = ReturnType<typeof projectRikishi>;

/** Roster grid with per-rikishi mentor assignment panels. */
export function RosterTab({
  world,
  heya,
  rikishiList,
  rawRoster,
}: {
  world: WorldState;
  heya: Heya;
  rikishiList: RikishiDTO[];
  rawRoster: Rikishi[];
}) {
  const navigate = useNavigate();
  const { assignMentor, removeMentor } = useGame();

  return (
    <TabsContent value="roster" className="space-y-4">
      {rikishiList.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Empty Roster"
          description="Your stable has no rikishi yet."
          action={{
            label: "Visit Dashboard to Recruit",
            onClick: () => navigate({ to: "/dashboard" }),
            variant: "outline",
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rikishiList.map((r) => {
            const isHighRisk = !r.isInjured && (r.condition < 40 || r.fatigue > 70);
            return (
              <TooltipWrap
                key={r.id}
                content={`View detailed statistics and career history for ${r.shikona}`}
                side="top"
              >
                <Card
                  className="paper hover:border-primary transition-colors cursor-pointer"
                  onClick={() =>
                    navigate({ to: "/rikishi/$rikishiId", params: { rikishiId: r.id } })
                  }
                >
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        {r.shikona}
                        {r.isInjured && (
                          <TooltipWrap content={r.injurySummary ?? "Injured"} side="top">
                            <Badge
                              variant="destructive"
                              className="text-[10px] px-1.5 h-4 cursor-help"
                            >
                              INJURED
                            </Badge>
                          </TooltipWrap>
                        )}
                        {isHighRisk && (
                          <TooltipWrap
                            content="High injury risk — low condition or elevated fatigue"
                            side="top"
                          >
                            <AlertTriangle className="h-3.5 w-3.5 text-gold cursor-help shrink-0" />
                          </TooltipWrap>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground uppercase">
                        {r.rankLabel}
                        {r.rankNumber && r.rankNumber > 0 ? ` #${r.rankNumber}` : ""}
                        {r.side ? ` ${r.side === "east" ? "E" : "W"}` : ""}
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {r.currentBashoWins}-{r.currentBashoLosses}
                    </Badge>
                  </CardContent>
                  {world && heya && (
                    <CardContent className="p-4 pt-0">
                      <MentorAssignmentPanel
                        apprenticeId={r.id}
                        mentorId={r.mentorId}
                        roster={rawRoster}
                        onAssignMentor={(mentorId) => assignMentor(mentorId, r.id)}
                        onRemoveMentor={() => removeMentor(r.id)}
                      />
                    </CardContent>
                  )}
                </Card>
              </TooltipWrap>
            );
          })}
        </div>
      )}
    </TabsContent>
  );
}

/** Institution panel for the viewed heya. */
export function InstitutionTab({ world, heya }: { world: WorldState; heya: Heya }) {
  const data = projectHeyaData(world, heya.id);
  if (!data) return null;
  return (
    <TabsContent value="institution" className="space-y-4">
      <InstitutionPanel
        heya={heya}
        oyakata={data.oyakata ?? null}
        oyakataQuirks={data.oyakataQuirks}
        oyakataTraits={data.oyakataTraits ?? null}
      />
    </TabsContent>
  );
}

/** Tsukebito attendant assignments. */
export function AttendantsTab({ world, heya }: { world: WorldState; heya: Heya }) {
  const sendCommand = useGameStore((s) => s.sendCommand);
  return (
    <TabsContent value="attendants" className="space-y-4">
      <TsukebitoPanel
        projection={projectTsukebito(world, heya.id)}
        onSet={(seniorId, juniorId) =>
          sendCommand({ type: "SET_TSUKEBITO", seniorId, tsukebitoIds: [juniorId] })
        }
        onClear={(seniorId, juniorId) => {
          // SET_TSUKEBITO only appends and early-returns if the junior is
          // already present, so dispatching it with the remaining list is a
          // no-op and never removes anyone. Dispatch REMOVE_TSUKEBITO instead,
          // which calls clearTsukebito(seniorId, juniorId) for the one junior.
          sendCommand({ type: "REMOVE_TSUKEBITO", seniorId, juniorId });
        }}
      />
    </TabsContent>
  );
}

/** Youth academy build/invest/promote panel. */
export function AcademyTab({ world, heya }: { world: WorldState; heya: Heya }) {
  const sendCommand = useGameStore((s) => s.sendCommand);
  return (
    <TabsContent value="academy" className="space-y-4">
      <YouthAcademyPanel
        projection={projectYouthAcademy(world, heya.id)}
        cash={heya.funds}
        onBuild={() => sendCommand({ type: "BUILD_YOUTH_ACADEMY", heyaId: heya.id })}
        onUpgrade={() => sendCommand({ type: "UPGRADE_YOUTH_ACADEMY", heyaId: heya.id })}
        onInvest={(amount) => sendCommand({ type: "INVEST_ACADEMY", heyaId: heya.id, amount })}
        onHireStaff={(role) => sendCommand({ type: "HIRE_ACADEMY_STAFF", heyaId: heya.id, role })}
        onPromote={(prospectId) =>
          sendCommand({ type: "PROMOTE_INTAKE", heyaId: heya.id, prospectId })
        }
      />
    </TabsContent>
  );
}
