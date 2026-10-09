/**
 * NarrativeSummarySections.tsx
 *
 * Sections of the NarrativeSummary "Timeline Dossier" — prestige
 * shifts, movement ledger, departures, governance, YDC
 * accountability, press conference, and the wrap-up footer.
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Clock,
  TrendingUp,
  TrendingDown,
  Building2,
  UserX,
  ShieldAlert,
  Info,
  History,
  Gavel,
  Newspaper,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GovernanceRuling } from "@/engine/types/economy";

export interface GroupedNarrativeEvents {
  promotions: { title: string; summary: string; type: string }[];
  retirements: { title: string; summary: string }[];
  governance: { title: string; summary: string }[];
  ydcAccountability?: {
    title: string;
    summary: string;
    status: string;
    chairmanName?: string;
    references?: string[];
    publicStatement?: string;
    privateSentiment?: string;
  }[];
  pressConference?: {
    title: string;
    summary: string;
    narrative?: { text: string; id: string }[];
  }[];
}

export interface PrestigeChange {
  heya: { name: string; prestigeBand: string; reputation: number };
  change: string;
}

/** Promotion/demotion/retirement ledger card. */
export function EventCard({
  title,
  summary,
  isPromotion,
  isRetirement,
  icon: Icon,
}: {
  title: string;
  summary: string;
  isPromotion?: boolean;
  isRetirement?: boolean;
  icon: React.ElementType;
}) {
  const isDemotion = isPromotion === false;
  return (
    <div
      className={cn(
        "dossier-paper p-4 rounded-lg flex items-center gap-4 border-l-4",
        isPromotion
          ? "border-l-success"
          : isDemotion
            ? "border-l-gold"
            : "border-l-destructive bg-destructive/[0.02]"
      )}
    >
      <div
        className={cn(
          "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
          isPromotion ? "bg-success/10" : isDemotion ? "bg-gold/10" : "bg-destructive/10"
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5",
            isPromotion ? "text-success" : isDemotion ? "text-gold" : "text-destructive"
          )}
        />
      </div>
      <div className="flex-1">
        <div className="font-display font-black text-sm uppercase tracking-tight">{title}</div>
        <p className="text-[10px] text-muted-foreground italic leading-relaxed opacity-80">
          {summary}
        </p>
      </div>
      <div className="text-right">
        {isRetirement ? (
          <Badge
            variant="secondary"
            className="text-[10px] font-black uppercase tracking-widest bg-destructive/10 text-destructive"
          >
            INTAI
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-black uppercase tracking-widest",
              isPromotion ? "border-success/30 text-success" : "border-gold/30 text-gold"
            )}
          >
            {isPromotion ? "Promotion" : "Demotion"}
          </Badge>
        )}
      </div>
    </div>
  );
}

/** Association prestige shifts grid. */
export function PrestigeShiftsSection({ prestigeChanges }: { prestigeChanges: PrestigeChange[] }) {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <h3 className="pro-header">Association Prestige Shifts</h3>
        <div className="h-px flex-1 bg-border/20" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {prestigeChanges.map((item, i) => (
          <div
            key={i}
            className="dossier-paper p-5 rounded-lg border-l-4 border-l-primary flex items-start gap-4 hover:border-primary/40 transition-colors"
          >
            <div className="h-10 w-10 bg-primary/5 rounded-lg flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between">
                <div className="font-display font-black text-lg">{item.heya.name}</div>
                <Badge
                  variant="outline"
                  className="text-[10px] font-black uppercase tracking-widest"
                >
                  {item.heya.prestigeBand}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed italic">
                "{item.change}"
              </p>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary opacity-30"
                  style={{ width: `${item.heya.reputation}%` }}
                />
              </div>
              <div className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest leading-none">
                Stability Rating: {item.heya.reputation}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Movement ledger + venerated departures side-by-side grid. */
export function MovementsSection({ groupedEvents }: { groupedEvents: GroupedNarrativeEvents }) {
  const hasPromotions = groupedEvents.promotions?.length > 0;
  const hasRetirements = groupedEvents.retirements?.length > 0;
  return (
    <div className="grid lg:grid-cols-2 gap-12">
      {hasPromotions && (
        <section className="space-y-6">
          <div className="flex items-center gap-3 pl-4 border-l-4 border-primary">
            <div>
              <h3 className="text-xl font-display font-black uppercase tracking-tight">
                Movement Ledger
              </h3>
              <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                Promotion & Demotion Records
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {groupedEvents.promotions.map(
              (e: { title: string; summary: string; type: string }, i: number) => {
                const isPromotion = !e.type.includes("DEMOTION");
                return (
                  <EventCard
                    key={i}
                    title={e.title}
                    summary={e.summary}
                    isPromotion={isPromotion}
                    icon={isPromotion ? TrendingUp : TrendingDown}
                  />
                );
              }
            )}
          </div>
        </section>
      )}

      {hasRetirements && (
        <section className="space-y-6">
          <div className="flex items-center gap-3 pl-4 border-l-4 border-destructive">
            <div>
              <h3 className="text-xl font-display font-black uppercase tracking-tight">
                Venerated Departures
              </h3>
              <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                Retirements & Career Erasings
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {groupedEvents.retirements.map((e: { title: string; summary: string }, i: number) => (
              <EventCard key={i} title={e.title} summary={e.summary} isRetirement icon={UserX} />
            ))}
            {groupedEvents.retirements.length === 0 && (
              <EmptyState
                icon={UserX}
                title="No veteran departures recorded this basho."
                compact
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}

/** Governing body deliberations + historical timeline drift. */
export function NarrativeGovernanceSection({
  groupedEvents,
  governanceLog,
}: {
  groupedEvents: GroupedNarrativeEvents;
  governanceLog: GovernanceRuling[];
}) {
  return (
    <section className="space-y-6 pt-6">
      <div className="flex items-center gap-3">
        <h3 className="pro-header">Governing Body Deliberations</h3>
        <div className="h-px flex-1 bg-border/20" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="dossier-paper border-0 shadow-none bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display font-black uppercase tracking-tighter flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" /> Official Directives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(groupedEvents.governance ?? []).map(
                (e: { title: string; summary: string }, i: number) => (
                  <div
                    key={i}
                    className="flex gap-4 p-3 bg-card border-2 border-primary/10 rounded-lg"
                  >
                    <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <Info className="h-4 w-4 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-black uppercase tracking-widest text-primary">
                        {e.title}
                      </div>
                      <p className="text-xs text-muted-foreground italic leading-relaxed">
                        "{e.summary}"
                      </p>
                    </div>
                  </div>
                )
              )}
              {groupedEvents.governance.length === 0 && (
                <EmptyState
                  icon={ShieldAlert}
                  title="No disciplinary or political directives issued."
                  compact
                />
              )}
            </div>
          </CardContent>
        </Card>

        {governanceLog && governanceLog.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-2">
              <Clock className="h-3 w-3" /> Historical Timeline Drift
            </h4>
            <div className="space-y-3 pl-4 border-l-2 border-border/40">
              {governanceLog
                .slice(-5)
                .map((log: GovernanceRuling, i: number) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[22px] top-1 h-2 w-2 rounded-full bg-border" />
                    <div className="text-[10px] font-bold text-muted-foreground mb-1">
                      {log.date || "Association Record"}
                    </div>
                    <p className="text-xs font-display italic leading-snug">{log.reason}</p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ydcToneClass(status: string) {
  const isPraise = status === "praise";
  const isEncouragement = status === "encouragement";
  const isWarning = status === "warning" || status === "demand_reflection";
  const isCynicism = status === "private_cynicism";
  const isAbsence = status === "absence_criticism";
  return isPraise
    ? "border-l-success bg-success/[0.02]"
    : isEncouragement
      ? "border-l-primary bg-primary/[0.02]"
      : isWarning
        ? "border-l-gold bg-gold/[0.02]"
        : isCynicism
          ? "border-l-destructive/40 bg-destructive/[0.01]"
          : isAbsence
            ? "border-l-destructive/60 bg-destructive/[0.02]"
            : "border-l-border";
}

/** Single YDC accountability entry card. */
function YdcEntry({ e }: { e: NonNullable<GroupedNarrativeEvents["ydcAccountability"]>[number] }) {
  const isPraise = e.status === "praise";
  const isWarning = e.status === "warning" || e.status === "demand_reflection";
  return (
    <div
      className={cn(
        "dossier-paper p-4 rounded-lg border-l-4 flex items-start gap-4",
        ydcToneClass(e.status)
      )}
    >
      <div
        className={cn(
          "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
          isPraise ? "bg-success/10" : isWarning ? "bg-gold/10" : "bg-destructive/10"
        )}
      >
        <Gavel
          className={cn(
            "h-5 w-5",
            isPraise ? "text-success" : isWarning ? "text-gold" : "text-destructive"
          )}
        />
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-display font-black text-sm uppercase tracking-tight">
            {e.title}
          </span>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-black uppercase tracking-widest",
              isPraise
                ? "border-success/30 text-success"
                : isWarning
                  ? "border-gold/30 text-gold"
                  : "border-destructive/30 text-destructive"
            )}
          >
            {e.status.replace(/_/g, " ").toUpperCase()}
          </Badge>
          {e.chairmanName && (
            <span className="text-[10px] text-muted-foreground italic">
              — Chairman {e.chairmanName}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground italic leading-relaxed">
          "{e.summary}"
        </p>
        {e.references && e.references.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {e.references.map((ref, j) => (
              <Badge
                key={j}
                variant="secondary"
                className="text-[10px] font-bold uppercase tracking-wider bg-muted/50"
              >
                {ref}
              </Badge>
            ))}
          </div>
        )}
        {e.privateSentiment && e.privateSentiment !== e.publicStatement && (
          <p className="text-[10px] text-muted-foreground/60 italic border-l-2 border-destructive/20 pl-2">
            Private sentiment: {e.privateSentiment}
          </p>
        )}
      </div>
    </div>
  );
}

/** Yokozuna Deliberation Council accountability section. */
export function YdcSection({ groupedEvents }: { groupedEvents: GroupedNarrativeEvents }) {
  return (
    <section className="space-y-6 pt-6">
      <div className="flex items-center gap-3">
        <h3 className="pro-header">Yokozuna Deliberation Council</h3>
        <div className="h-px flex-1 bg-border/20" />
      </div>
      <div className="space-y-3">
        {(groupedEvents.ydcAccountability ?? []).map((e, i) => (
          <YdcEntry key={i} e={e} />
        ))}
      </div>
    </section>
  );
}

/** Post-basho press conference section. */
export function PressConferenceSection({ groupedEvents }: { groupedEvents: GroupedNarrativeEvents }) {
  return (
    <section className="space-y-6 pt-6">
      <div className="flex items-center gap-3">
        <h3 className="pro-header">Post-Basho Press Conference</h3>
        <div className="h-px flex-1 bg-border/20" />
      </div>
      <div className="space-y-4">
        {(groupedEvents.pressConference ?? []).map((e, i) => (
          <div key={i} className="dossier-paper p-5 rounded-lg border-l-4 border-l-primary">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                <Newspaper className="h-4 w-4 text-primary" />
              </div>
              <div className="font-display font-black text-sm uppercase tracking-tight">
                {e.title}
              </div>
            </div>
            <p className="text-xs text-muted-foreground italic leading-relaxed mb-3">
              {e.summary}
            </p>
            {e.narrative && e.narrative.length > 0 && (
              <div className="space-y-2 pl-4 border-l-2 border-primary/10">
                {e.narrative.map((line, j) => (
                  <p
                    key={j}
                    className="text-xs text-muted-foreground/80 italic leading-relaxed"
                  >
                    {line.text}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/** Association wrap-up footer card. */
export function WrapUpFooter({
  year,
  activeHeyasCount,
}: {
  year: number;
  activeHeyasCount: number;
}) {
  return (
    <section className="pt-12 flex justify-center">
      <div className="max-w-2xl w-full dossier-paper p-10 rounded-lg border-2 border-dashed border-primary/20 text-center space-y-6 bg-primary/[0.01]">
        <div className="h-16 w-16 bg-primary/5 rounded-full mx-auto flex items-center justify-center">
          <History className="h-8 w-8 text-primary opacity-30" />
        </div>
        <div className="space-y-2">
          <h3 className="text-3xl font-display font-black tracking-tighter uppercase italic">
            Association Wrap-up
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto italic font-display">
            "The Association has ratified another successful tournament. The Banzuke committee
            will now begin deliberations for the coming year."
          </p>
        </div>
        <div className="bg-primary/5 p-4 rounded-lg flex items-center justify-center gap-12">
          <div className="text-center">
            <div className="text-2xl font-display font-black text-primary">{year}</div>
            <div className="text-[10px] uppercase font-black opacity-40">Association Year</div>
          </div>
          <div className="w-px h-8 bg-primary/10" />
          <div className="text-center">
            <div className="text-2xl font-display font-black text-primary">
              {activeHeyasCount}
            </div>
            <div className="text-[10px] uppercase font-black opacity-40">Active Stables</div>
          </div>
        </div>
      </div>
    </section>
  );
}
