import type { WorldState } from "@/engine/types/world";

/**
 * True when a multi-day fast-advance loop must stop and hand control back to
 * the player because a blocking decision is pending. Mirrors the gate pattern
 * in src/engine/holiday.ts (evaluateGates -> break).
 *
 * Why check `pendingDecisions` when `evaluatePendingDecisions` already promotes
 * the first blocking decision to `pendingCrisis`? Because promotion only fires
 * when `!world.pendingCrisis` — once a crisis is set, subsequent required
 * decisions accumulate in `pendingDecisions` without being promoted. This
 * check ensures those accumulated decisions also halt the loop.
 *
 * "Advance until interesting" (career plan backlog #5): also halt when the
 * world produced something *new* for the player this week — a freshly posted
 * non-required decision (ids carry -y{year}-w{week}), a new rikishi request
 * (createdWeek), or a major/headline event scoped to the player's stable or
 * the whole world. Only same-week entries halt, so ignored items go stale
 * instead of freezing every subsequent advance.
 */
export function shouldHaltAdvance(world: WorldState): boolean {
  if (world.pendingCrisis) return true;

  // Basho termination is interactive — "End Basho" in the UI calls `endBasho`
  // and no pipeline phase transitions out of `active_basho`. A multi-day
  // advance must stop at senshuraku instead of incrementing the day counter
  // into post-tournament limbo (observed live: day 33/15).
  if (world.cyclePhase === "active_basho" && (world.currentBasho?.day ?? 0) > 15) {
    return true;
  }

  const decisions = world.pendingDecisions ?? [];
  if (decisions.some((d) => d.required)) return true;

  const weekTag = `-y${world.year}-w${world.week}`;
  if (decisions.some((d) => d.id.endsWith(weekTag))) return true;

  if ((world.pendingRikishiRequests ?? []).some((q) => q.createdWeek === world.week)) {
    return true;
  }

  for (const e of world.events?.log ?? []) {
    if (e.year !== world.year || e.week !== world.week) continue;
    if (e.importance !== "major" && e.importance !== "headline") continue;
    if (e.heyaId === world.playerHeyaId || e.scope === "world") return true;
  }
  return false;
}
