// BashoPage.tsx — Redesigned Tournament Page
// Clean layout with prominent day controls, better standings, and bout cards

import { useNavigate } from "@tanstack/react-router";
import { TOURNAMENT_TABS } from "@/constants/ui/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/control-center";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MatchDayViewer } from "@/components/game/MatchDayViewer";
import { CornerAdvicePanel } from "@/components/game/CornerAdvicePanel";
import { BashoStandingsEvolution } from "@/components/basho/BashoStandingsEvolution";
import { BASHO_CALENDAR, getDayName, getTotalBashodays, isKeyDay } from "@/presenters/uiDigest";
import type { BashoName } from "@/engine/types/basho";
import { getRikishiMap } from "@/presenters/worldAccess";
import { NakabiHighlightCard } from "@/components/basho/NakabiHighlightCard";
import { OfficialsPanel } from "@/components/officials/OfficialsPanel";
import { useBashoPageState } from "@/hooks/useBashoPageState";
import {
  BashoDayControls,
  JungyoResultsCard,
  GlobalCupBanner,
  ScheduleOverviewPanel,
  BashoStandingsSidebar,
  BashoModals,
  NoActiveBashoEmpty,
} from "@/components/basho/BashoPageSections";

/** basho page. */
export default function BashoPage() {
  const navigate = useNavigate();
  const s = useBashoPageState();
  const { world, bashoDigest } = s;

  if (!world) return null;

  if (!bashoDigest) {
    return <NoActiveBashoEmpty />;
  }

  const {
    bashoName,
    day,
    matches,
    standings,
    playerRikishiIds,
    completedBouts,
    dayProgress,
    seasonalFlavor,
  } = bashoDigest;
  const bashoInfo = BASHO_CALENDAR[bashoName as keyof typeof BASHO_CALENDAR];
  const dayInfo = getDayName(day);
  const remainingBouts = matches.length - completedBouts;

  return (
    <AppLayout
      pageTitle={bashoInfo?.nameEn || "Tournament"}
      subNavTabs={TOURNAMENT_TABS}
      activeSubTab="basho"
    >
      <title>{`${bashoInfo?.nameEn || "Tournament"} Day ${day}`}</title>

      <div className="space-y-4">
        {/* ═══════════ DAY HEADER ═══════════ */}
        <PageHeader
          eyebrow="── TOURNAMENT ──"
          title={bashoInfo?.nameJa ?? "Basho"}
          lede={`${dayInfo?.dayJa ?? `Day ${day}`} · ${bashoInfo?.location ?? "—"} · ${completedBouts}/${matches.length} bouts complete${seasonalFlavor ? ` · ${seasonalFlavor}` : ""}`}
          actions={
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-xs"
                onClick={() => navigate({ to: "/dashboard" })}
              >
                ← Dashboard
              </Button>
              <Badge variant="outline" className="font-mono text-sm px-3 py-1">
                Day {day}/{getTotalBashodays("makuuchi")}
              </Badge>
              {isKeyDay(day) && (
                <Badge className="bg-gold/20 text-gold border-gold/30 text-xs">Key Day</Badge>
              )}
              {bashoDigest?.isNakabiDay && (
                <Badge
                  className="bg-primary/20 text-primary border-primary/40 text-xs"
                  data-testid="nakabi-badge"
                >
                  Nakabi (Mid-Basho)
                </Badge>
              )}
            </div>
          }
        />
        <BashoDayControls
          day={day}
          remainingBouts={remainingBouts}
          nextBoutIndex={s.nextBoutIndex}
          dayProgress={dayProgress}
          onSimulateNext={s.handleSimulateNext}
          onSimulateAll={s.handleSimulateAll}
          onNextDay={s.handleNextDay}
        />

        {/* Nakabi highlight card — shown on day 8 */}
        {bashoDigest?.isNakabiDay && <NakabiHighlightCard projection={s.nakabiProjection} />}

        {/* Officials panel — gyoji & shimpan */}
        {s.officialsProjection.gyoji.length > 0 && (
          <OfficialsPanel projection={s.officialsProjection} />
        )}

        {/* Jungyo (exhibition) results from event log */}
        <JungyoResultsCard world={world} />

        {/* Global Cup Banner - During Interim Weeks */}
        <GlobalCupBanner world={world} day={day} />

        {/* ═══════════ MAIN LAYOUT ═══════════ */}
        <div className="grid gap-4 lg:grid-cols-4">
          {/* Schedule Overview - Collapsible */}
          <ScheduleOverviewPanel
            day={day}
            open={s.showScheduleOverview}
            onOpenChange={s.setShowScheduleOverview}
          />

          {/* Standings sidebar */}
          <BashoStandingsSidebar standings={standings} playerRikishiIds={playerRikishiIds} />

          {/* Match viewer */}
          <div className="lg:col-span-3 lg:order-1 space-y-3">
            <CornerAdvicePanel advice={s.cornerAdvice} />
            <MatchDayViewer
              matches={matches}
              world={world}
              playerRikishiIds={new Set(playerRikishiIds)}
              onSimulateBout={s.simulateBout}
              onSimulateAll={s.simulateAllBouts}
              onTacticChange={s.handleTacticChange}
              onEndDay={s.handleNextDay}
              highlightRikishiId={world.selectedRikishiId || undefined}
              playerTactics={s.state.boutTactics}
              onBoutClick={s.handleBoutClick}
            />
          </div>
        </div>

        {/* Standings evolution chart — active basho only */}
        {world.cyclePhase === "active_basho" && world.currentBasho && (
          <BashoStandingsEvolution basho={world.currentBasho} rikishiMap={getRikishiMap(world)} />
        )}
      </div>

      {/* Modals */}
      <BashoModals
        world={world}
        bashoName={bashoName as BashoName}
        day={day}
        officialsProjection={s.officialsProjection}
        selectedBout={s.selectedBout}
        autoShowPlayerBout={s.autoShowPlayerBout}
        onCloseSelected={() => s.setSelectedBout(null)}
        onCloseAutoShow={() => s.setAutoShowPlayerBout(null)}
        showEndBashoConfirm={s.showEndBashoConfirm}
        onEndBashoChange={s.setShowEndBashoConfirm}
        onConfirmEndBasho={s.confirmEndBasho}
      />
    </AppLayout>
  );
}
