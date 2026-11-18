/**
 * OyakataProfilePage.tsx — dedicated elder profile (/oyakata/$oyakataId),
 * the /oyakata directory index, and the /stable/oyakata → player redirect.
 *
 * Public record (name, stable, tenure record, career-as-rikishi, elder
 * status) is always visible. Private intel — archetype, mood, personality
 * traits, coaching stats, mentorship internals — only renders for the
 * player's own stable or a rival stable with WS7 scouting coverage
 * (hasScoutingCoverage), matching the fog-of-war rules used by the global
 * entity search and rival-stables projections.
 */

import { useMemo } from "react";
import { useParams, useNavigate, Navigate } from "@tanstack/react-router";
import {
  Crown,
  Landmark,
  ScrollText,
  Users,
  Activity,
  ShieldAlert,
  UserSearch,
} from "lucide-react";
import { useGame } from "@/state/game/useGame";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/page-shell/index";
import { SimpleRankBadge } from "@/components/layout/page-shell/RankBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import { TraitsCard, CareerAsRikishiCard } from "@/components/oyakata/OyakataPageSections";
import { StableName, RikishiName } from "@/components/shared/ClickableName";
import { getOyakata, getAllOyakata, getHeya, getRikishi } from "@/presenters/worldAccess";
import { getPlayerHeya, menteesOf } from "@/presenters/engineAccess";
import { hasScoutingCoverage } from "@/presenters/projections/rivalStablesProjections";
import { projectNPCAgentActivity } from "@/presenters/projections/npcAgentProjections";
import { resolveAvatar, oyakataStageInput } from "@/presenters/projections/avatarProjections";
import { getRankDisplayEntry, isSekitoriDivision } from "@/constants/engine/rankDisplay";
import { activationKeyHandler } from "@/lib/a11y";
import type { Oyakata } from "@/engine/types/oyakata";
import type { WorldState } from "@/presenters/uiDigest";
import type { Rikishi } from "@/engine/types/rikishi";

const ZERO_TENURE = {
  startedYear: 0,
  bashoServed: 0,
  championships: 0,
  sekitoriProduced: 0,
  sanyakuProduced: 0,
  ozekiProduced: 0,
  yokozunaProduced: 0,
  insolvencyEvents: 0,
  majorScandals: 0,
  forcedMergers: 0,
  boardSeatsWon: 0,
};

type Tenure = typeof ZERO_TENURE;

function tenureOf(o: Oyakata): Tenure {
  return { ...ZERO_TENURE, ...o.tenure };
}

function elderStatusLabel(o: Oyakata): string | null {
  switch (o.elderStatus) {
    case "ichidai_toshiyori":
      return "Ichidai Toshiyori";
    case "jun_toshiyori":
      return "Jun Toshiyori";
    case "toshiyori":
      return "Toshiyori";
    default:
      return null;
  }
}

/** Whether the viewer may see this elder's private intel. */
function canSeeOyakataIntel(world: WorldState, o: Oyakata, playerHeyaId?: string | null): boolean {
  return (!!playerHeyaId && o.heyaId === playerHeyaId) || hasScoutingCoverage(world, o.heyaId);
}

/** Roster counts for the stable snapshot card. */
function rosterCounts(world: WorldState, heyaId: string) {
  const heya = getHeya(world, heyaId);
  if (!heya) return null;
  let sekitori = 0;
  let sanyaku = 0;
  let counted = 0;
  for (const id of heya.rikishiIds ?? []) {
    const r = getRikishi(world, id);
    if (!r) continue;
    counted++;
    const entry = r.rank ? getRankDisplayEntry(r.rank) : undefined;
    if (entry && isSekitoriDivision(entry.division)) sekitori++;
    if (entry?.isSanyaku) sanyaku++;
  }
  return { heya, roster: heya.rikishiIds?.length ?? counted, sekitori, sanyaku };
}

/** Mentor→mentee pairs inside the oyakata's stable (training internals). */
function mentorshipPairs(world: WorldState, heyaId: string) {
  const heya = getHeya(world, heyaId);
  const pairs: { mentor: Rikishi; mentees: Rikishi[] }[] = [];
  if (!heya?.rikishiIds) return pairs;
  for (const id of [...new Set(heya.rikishiIds)]) {
    const r = getRikishi(world, id);
    if (!r) continue;
    const mentees = menteesOf(world, r);
    if (mentees.length > 0) pairs.push({ mentor: r, mentees });
  }
  return pairs;
}

function StatCell({ value, label }: { value: number | string; label: string }) {
  return (
    <div>
      <div className="font-mono font-bold tabular-nums">{value}</div>
      <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
        {label}
      </div>
    </div>
  );
}

/** Measured record of the reign — the management-game scorecard. */
function ManagerRecordCard({ o }: { o: Oyakata }) {
  const t = tenureOf(o);
  const blackMarks = t.insolvencyEvents + t.majorScandals + t.forcedMergers;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Crown className="h-4 w-4" /> Management Record
        </CardTitle>
        <CardDescription>
          {t.startedYear > 0
            ? `In charge since ${t.startedYear}`
            : "Measured record of this reign."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-3 gap-2 text-center">
          <StatCell value={t.bashoServed} label="Basho" />
          <StatCell value={t.championships} label="Yusho" />
          <StatCell value={t.sekitoriProduced} label="Sekitori" />
          <StatCell value={t.sanyakuProduced} label="San'yaku" />
          <StatCell value={t.ozekiProduced} label="Ozeki" />
          <StatCell value={t.yokozunaProduced} label="Yokozuna" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">
            <Landmark className="mr-1 h-3 w-3" />
            {t.boardSeatsWon} board seats won
          </Badge>
          {blackMarks > 0 && (
            <Badge variant="destructive">
              <ShieldAlert className="mr-1 h-3 w-3" />
              {t.insolvencyEvents > 0 && `${t.insolvencyEvents} insolvency`}
              {t.insolvencyEvents > 0 && t.majorScandals + t.forcedMergers > 0 && " · "}
              {t.majorScandals > 0 && `${t.majorScandals} scandal`}
              {t.majorScandals > 0 && t.forcedMergers > 0 && " · "}
              {t.forcedMergers > 0 && `${t.forcedMergers} forced merger`}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** Elder stock / myoseki status — descriptive detail; badges live in the header. */
function ElderStatusCard({ o }: { o: Oyakata }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Landmark className="h-4 w-4" /> Elder Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {o.elderExpiryYear != null && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Term expires</span>
            <span>{o.elderExpiryYear}</span>
          </div>
        )}
        {o.grudges && o.grudges.length > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Known grudges</span>
            <span>{o.grudges.length}</span>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {o.elderStatus === "ichidai_toshiyori"
            ? "One-generation elder name — cannot be inherited."
            : o.elderStatus === "jun_toshiyori"
              ? "Temporary elder appointment without stock; lapses on expiry."
              : "Holds a myoseki (elder share) in the Association."}
        </p>
      </CardContent>
    </Card>
  );
}

/** Private intel — archetype, mood, traits, coaching stats. WS7 gated. */
function IntelCard({ o, visible }: { o: Oyakata; visible: boolean }) {
  return (
    <Card data-testid="oyakata-intel">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <UserSearch className="h-4 w-4" /> Manager Intel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {visible ? (
          <>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="capitalize">
                {o.archetype?.replace(/_/g, " ")}
              </Badge>
              {o.mood && (
                <Badge variant="outline" className="capitalize">
                  {o.mood}
                </Badge>
              )}
              {o.temperament && (
                <Badge variant="outline" className="capitalize">
                  {o.temperament}
                </Badge>
              )}
            </div>
            {o.stats && (
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <StatCell value={o.stats.scouting} label="Scouting" />
                <StatCell value={o.stats.training} label="Training" />
                <StatCell value={o.stats.politics} label="Politics" />
              </div>
            )}
            {o.quirks && o.quirks.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {o.quirks.map((q) => (
                  <Badge key={q} variant="outline" className="text-xs">
                    {q.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-muted-foreground">
            Limited intel. Assign a scout to observe this stable to reveal the elder's managerial
            profile.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Succession outlook — player's own stable only (private dynasty planning). */
function SuccessionCard({ o, world }: { o: Oyakata; world: WorldState }) {
  const successor = o.successorCandidateId ? getRikishi(world, o.successorCandidateId) : undefined;
  const readinessLabel =
    o.successionReadiness === "mandatory"
      ? "Mandatory retirement approaching"
      : o.successionReadiness === "transitioning"
        ? "Transition underway"
        : "Stable";
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <ScrollText className="h-4 w-4" /> Succession
        </CardTitle>
        <CardDescription>Who inherits this elder's share and stable.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Readiness</span>
          <span>{readinessLabel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Designated successor</span>
          <span>
            {successor ? (
              <RikishiName
                id={successor.id}
                name={successor.shikona || successor.name || "Unknown"}
              />
            ) : (
              "None designated"
            )}
          </span>
        </div>
        {o.retirementYear != null && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Retires</span>
            <span>{o.retirementYear}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Mentor/mentee pairings inside the stable — private internals. */
function MentorshipSection({ world, heyaId }: { world: WorldState; heyaId: string }) {
  const pairs = mentorshipPairs(world, heyaId);
  if (pairs.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Users className="h-4 w-4" /> Stable Mentorship
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {pairs.map((pair) => (
          <div key={pair.mentor.id} className="p-3 bg-muted/30 rounded-lg">
            <div className="font-medium mb-1.5">
              <RikishiName
                id={pair.mentor.id}
                name={pair.mentor.shikona || pair.mentor.name || "Unknown"}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {pair.mentees.map((m) => (
                <Badge key={m.id} variant="outline" className="text-xs">
                  <RikishiName id={m.id} name={m.shikona || m.name || "Unknown"} />
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** Recent managerial decisions surfaced from the event log. */
function RecentActivityCard({ world, heyaId }: { world: WorldState; heyaId: string }) {
  const activity = useMemo(() => projectNPCAgentActivity(world), [world]);
  const rows = activity.decisions.filter((d) => d.heyaId === heyaId).slice(0, 5);
  if (rows.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Activity className="h-4 w-4" /> Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5 text-sm">
          {rows.map((d, i) => (
            <li key={i} className="flex items-baseline gap-2">
              <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                {d.category.replace(/_/g, " ")}
              </Badge>
              <span>{d.decision}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/** Directory listing — rows deep-link to /oyakata/$id. Archetype gated per row. */
export function OyakataIndex({
  world,
  playerHeyaId,
  excludeId,
}: {
  world: WorldState;
  playerHeyaId?: string | null;
  excludeId?: string;
}) {
  const navigate = useNavigate();
  const all = getAllOyakata(world).filter((o) => o.id !== excludeId);
  if (all.length === 0) return null;
  const sorted = [...all].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">All Oyakata</CardTitle>
        <CardDescription>Stable masters across the sumo world.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {sorted.map((o) => {
            const heya = getHeya(world, o.heyaId);
            const scouted = canSeeOyakataIntel(world, o, playerHeyaId);
            return (
              <div
                key={o.id}
                role="button"
                tabIndex={0}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/40 cursor-pointer hover:bg-muted/50 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                onClick={() => navigate({ to: "/oyakata/$oyakataId", params: { oyakataId: o.id } })}
                onKeyDown={activationKeyHandler(() =>
                  navigate({ to: "/oyakata/$oyakataId", params: { oyakataId: o.id } })
                )}
              >
                <SumoAvatar
                  avatar={resolveAvatar({
                    id: o.id,
                    stored: o.avatarConfig,
                    seedAliases: o.formerRikishiId ? [o.formerRikishiId] : [],
                    ...oyakataStageInput(o),
                  })}
                  size="sm"
                  fallback={o.name}
                />
                <div className="min-w-0">
                  <p className="font-medium truncate">{o.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {heya?.name ?? "—"} · {o.yearsInCharge}y in charge
                  </p>
                </div>
                <div className="ml-auto flex gap-1">
                  {scouted && o.archetype && (
                    <Badge
                      variant="outline"
                      className="text-[10px] capitalize hidden sm:inline-flex"
                    >
                      {o.archetype.replace(/_/g, " ")}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/** /oyakata — elders directory index. */
export function OyakataDirectoryPage() {
  const { state } = useGame();
  const world = state.world;
  return (
    <AppLayout pageTitle="Oyakata">
      <title>Oyakata | Basho</title>
      <div className="space-y-6">
        <PageHeader
          eyebrow="ASSOCIATION"
          title="Elders of the Kyokai"
          lede="Every stable master in the association — their record, their stock, their lineage."
        />
        {world ? (
          <OyakataIndex world={world} playerHeyaId={state.playerHeyaId ?? world.playerHeyaId} />
        ) : (
          <EmptyState
            icon={UserSearch}
            title="No world loaded"
            description="Load or create a world to browse elders."
          />
        )}
      </div>
    </AppLayout>
  );
}

/** /oyakata/$oyakataId — the dedicated elder profile. */
export default function OyakataProfilePage() {
  const { oyakataId } = useParams({ strict: false }) as { oyakataId?: string };
  const { state } = useGame();
  const world = state.world;
  const playerHeyaId = state.playerHeyaId ?? world?.playerHeyaId;

  const o = world && oyakataId ? getOyakata(world, oyakataId) : undefined;

  if (!world || !o) {
    return (
      <AppLayout pageTitle="Oyakata">
        <EmptyState
          icon={UserSearch}
          title={world ? "Oyakata not found" : "Loading"}
          description={world ? "No elder exists with this name." : "Fetching elder profile..."}
          iconClassName={world ? undefined : "animate-spin text-muted-foreground"}
        />
      </AppLayout>
    );
  }

  const playerOwned = !!playerHeyaId && o.heyaId === playerHeyaId;
  const intelVisible = canSeeOyakataIntel(world, o, playerHeyaId);
  const heya = getHeya(world, o.heyaId);
  const counts = rosterCounts(world, o.heyaId);
  const status = elderStatusLabel(o);

  const lede = [
    intelVisible && o.archetype ? o.archetype.replace(/_/g, " ") : null,
    `Age ${o.age}`,
    `${o.yearsInCharge} years in charge`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <AppLayout pageTitle={o.name}>
      <title>{o.name} | Basho</title>
      <div className="space-y-6">
        <PageHeader
          eyebrow={playerOwned ? "MY STABLE" : "ASSOCIATION"}
          title={o.name}
          lede={lede}
        />

        <div className="flex flex-wrap items-center gap-2">
          {o.isEmeritus && <Badge variant="secondary">Emeritus</Badge>}
          {o.isCaretaker && <Badge variant="outline">Caretaker</Badge>}
          {status && <Badge variant="outline">{status}</Badge>}
          {o.highestRank && <SimpleRankBadge rank={o.highestRank} />}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <ManagerRecordCard o={o} />
            <CareerAsRikishiCard oyakata={o} />
            <ElderStatusCard o={o} />
            {playerOwned && <SuccessionCard o={o} world={world} />}
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Stable</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Heya</span>
                  <span>{heya ? <StableName id={heya.id} name={heya.name} /> : "—"}</span>
                </div>
                {counts && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Roster</span>
                      <span>{counts.roster}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sekitori</span>
                      <span>{counts.sekitori}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">San'yaku</span>
                      <span>{counts.sanyaku}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            <IntelCard o={o} visible={intelVisible} />
            {intelVisible && <MentorshipSection world={world} heyaId={o.heyaId} />}
            <RecentActivityCard world={world} heyaId={o.heyaId} />
          </div>
        </div>

        {intelVisible && <TraitsCard oyakata={o} />}
        <OyakataIndex world={world} playerHeyaId={playerHeyaId} excludeId={o.id} />
      </div>
    </AppLayout>
  );
}

/**
 * /stable/oyakata — legacy entry point. Redirects to the player's own
 * elder profile; falls back to a not-found state when the player's stable
 * has no sitting oyakata.
 */
export function PlayerOyakataRedirect() {
  const { state } = useGame();
  const world = state.world;
  const playerHeya = world ? getPlayerHeya(world) : undefined;
  const o = world && playerHeya?.oyakataId ? getOyakata(world, playerHeya.oyakataId) : undefined;

  if (!o) {
    return (
      <AppLayout pageTitle="Oyakata">
        <EmptyState
          icon={UserSearch}
          title="No oyakata found"
          description="Your stable has no sitting oyakata."
        />
      </AppLayout>
    );
  }
  return <Navigate to="/oyakata/$oyakataId" params={{ oyakataId: o.id }} replace />;
}
