/**
 * BoutPreMatchOverlay.tsx
 * =======================
 * NHK broadcast-style pre-bout overlay that surfaces historical H2H data
 * before a player bout begins. Displays:
 *   - Both fighters side-by-side (shikona, rank, current record, favored move)
 *   - Lifetime H2H record with lead indicator
 *   - Recent meetings table (last 3 bouts with tournament/winner/kimarite)
 *   - Rivalry heat badge
 *   - Dismiss / Begin Bout action buttons
 */

import { Badge } from "@/components/ui/badge";
import { RikishiName } from "@/components/ClickableName";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import { Button } from "@/components/ui/button";
import { Swords } from "lucide-react";
import type { BoutPreviewUI } from "@/presenters/boutPreviewUI";
import type { UIRikishi } from "@/presenters/uiModels";
import type { H2HRecentMeeting } from "@/engine/types/records";
import { getHeatBand, HEAT_CONFIG } from "./BoutCard";

interface BoutPreMatchOverlayProps {
  preview: BoutPreviewUI;
  onDismiss: () => void;
  onBegin: () => void;
}

// ── Fighter column ─────────────────────────────────────

interface FighterColumnProps {
  rikishi: UIRikishi;
  side: "east" | "west";
}

function FighterColumn({ rikishi, side }: FighterColumnProps) {
  const isEast = side === "east";
  return (
    <div
      className={`flex flex-col gap-0.5 ${isEast ? "items-end text-right" : "items-start text-left"}`}
    >
      <div className="font-display text-base font-bold leading-tight">
        <RikishiName id={rikishi.id} name={rikishi.shikona} />
      </div>
      <div className="text-xs text-muted-foreground">{rikishi.rankLabel}</div>
      <div className={`font-mono text-sm font-semibold mt-1 ${isEast ? "text-east" : "text-west"}`}>
        {rikishi.currentBashoWins}–{rikishi.currentBashoLosses}
      </div>
      <div className="text-[11px] text-muted-foreground mt-0.5">
        {rikishi.favoredKimariteDisplay}
      </div>
    </div>
  );
}

// ── Recent meetings table ───────────────────────────────

interface RecentMeetingsTableProps {
  meetings: H2HRecentMeeting[];
  eastId: string;
  eastShikona: string;
  westShikona: string;
}

function RecentMeetingsTable({
  meetings,
  eastId,
  eastShikona,
  westShikona,
}: RecentMeetingsTableProps) {
  if (meetings.length === 0) return null;
  return (
    <div className="mt-3 rounded-md border border-border/50 overflow-hidden">
      <div className="px-2 py-1 bg-muted/40 text-[10px] text-muted-foreground uppercase tracking-wider">
        Recent Meetings
      </div>
      {meetings.slice(0, 3).map((m, i) => {
        const winnerName = m.winnerId === eastId ? eastShikona : westShikona;
        const kimariteDisplay = m.kimarite.charAt(0).toUpperCase() + m.kimarite.slice(1);
        return (
          <div
            key={i}
            className="flex items-center gap-2 px-2 py-1.5 text-xs border-t border-border/40"
          >
            <span className="text-muted-foreground font-mono w-10 shrink-0">{m.year}</span>
            <span className="text-muted-foreground shrink-0">Day {m.day}</span>
            <span className="flex-1 font-semibold truncate">
              <RikishiName id={m.winnerId} name={winnerName} />
            </span>
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {kimariteDisplay}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ──────────────────────────────────────

export function BoutPreMatchOverlay({ preview, onDismiss, onBegin }: BoutPreMatchOverlayProps) {
  const { eastRikishi, westRikishi, h2hReport, rivalryHeat, day } = preview;

  const heatBand = getHeatBand(rivalryHeat);
  const heatConfig = HEAT_CONFIG[heatBand];
  const showHeat = rivalryHeat >= 25;

  const aLeads = h2hReport.aWins > h2hReport.bWins;
  const bLeads = h2hReport.bWins > h2hReport.aWins;
  const isFirstMeeting = h2hReport.totalMeetings === 0;

  let leadLabel: string;
  if (isFirstMeeting) {
    leadLabel = "First Meeting";
  } else if (!aLeads && !bLeads) {
    leadLabel = "Even";
  } else if (aLeads) {
    leadLabel = `${eastRikishi.shikona} leads`;
  } else {
    leadLabel = `${westRikishi.shikona} leads`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
        {/* Top color accent bars */}
        <div className="flex h-1">
          <div className="flex-1 bg-east" />
          <div className="flex-1 bg-west" />
        </div>

        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <Swords className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-widest">
              Day {day} — Pre-Bout
            </span>
          </div>

          {/* Two-column fighter display */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
            <FighterColumn rikishi={eastRikishi} side="east" />

            {/* Center column: VS + H2H record */}
            <div className="flex flex-col items-center text-center gap-0.5 pt-1">
              <div className="text-base font-display font-bold text-muted-foreground">vs</div>
              {!isFirstMeeting && (
                <>
                  <div className="text-[10px] text-muted-foreground mt-1">H2H</div>
                  <div className="font-mono text-sm font-bold">
                    <span className={aLeads ? "text-success" : ""}>{h2hReport.aWins}</span>
                    <span className="text-muted-foreground mx-1">–</span>
                    <span className={bLeads ? "text-success" : ""}>{h2hReport.bWins}</span>
                  </div>
                </>
              )}
              <div className="text-[10px] text-muted-foreground mt-0.5">{leadLabel}</div>
            </div>

            <FighterColumn rikishi={westRikishi} side="west" />
          </div>

          {/* Recent meetings */}
          <RecentMeetingsTable
            meetings={h2hReport.recentMeetings}
            eastId={eastRikishi.id}
            eastShikona={eastRikishi.shikona}
            westShikona={westRikishi.shikona}
          />

          {/* Rivalry heat badge */}
          {showHeat && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <SumoAvatar
                  config={eastRikishi.avatarConfig}
                  size="md"
                  showHairstyle={
                    eastRikishi.division === "makuuchi" || eastRikishi.division === "juryo"
                  }
                  fallback={eastRikishi.shikona}
                  className="mb-1"
                />
                <RikishiName
                  id={eastRikishi.id}
                  name={eastRikishi.shikona}
                  className="font-bold text-sm"
                />
              </div>
              <div className="text-left">
                <SumoAvatar
                  config={westRikishi.avatarConfig}
                  size="md"
                  showHairstyle={
                    westRikishi.division === "makuuchi" || westRikishi.division === "juryo"
                  }
                  fallback={westRikishi.shikona}
                  className="mb-1"
                />
                <RikishiName
                  id={westRikishi.id}
                  name={westRikishi.shikona}
                  className="font-bold text-sm"
                />
              </div>
              <Badge variant="outline" className={`gap-1.5 text-xs ${heatConfig.classes}`}>
                {heatConfig.icon}
                {heatConfig.label}
              </Badge>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={onDismiss} className="flex-1">
              Dismiss
            </Button>
            <Button size="sm" onClick={onBegin} className="flex-1">
              Begin Bout
            </Button>
          </div>
        </div>

        {/* Bottom color accent bars */}
        <div className="flex h-0.5">
          <div className="flex-1 bg-east/40" />
          <div className="flex-1 bg-west/40" />
        </div>
      </div>
    </div>
  );
}
