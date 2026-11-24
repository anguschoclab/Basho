import type { WorldState } from "@/engine/types/world";
import type { BashoState } from "@/engine/types/basho";
import type { Rikishi } from "@/engine/types/rikishi";
import type { StateImpact } from "@/engine/core/StateImpact";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { determineSpecialPrizes } from "@/engine/banzuke/specialPrizes";
import { isYokozunaOrOzekiRank } from "@/constants/engine/rankDisplay";
import { rngForWorld } from "@/engine/core/rng";

/**
 * Sanshō conditional announcement — the committee's morning-of-senshuraku
 * session (WS-12 residual).
 *
 * The real panel convenes on day 15 before the card and releases its
 * provisional table: a candidate whose profile already stands is named
 * `secured`; a 7-7 rikishi on today's card is announced `needs_win` — the
 * press line "wins the prize with a victory today". The binding award still
 * resolves in `distributePrizes` on the completed 15-day results; this
 * deliberation is the provisional report, run on days 1–14.
 *
 * Consumes its own `sansho_committee_am` RNG domain so the post-basho
 * `sansho_committee` stream position is untouched.
 *
 * Fires only while day-15 bouts are unresolved — on day 14, or once the
 * card has results, it is a no-op.
 */
export function announceConditionalSansho(world: WorldState, basho: BashoState): StateImpact {
  const builder = createImpactBuilder("announceConditionalSansho");
  if (basho.day !== 15) return builder.build();

  const resolved = basho.matches.filter((m) => m.day < 15 && m.result);
  const todayPending = basho.matches.filter((m) => m.day === 15 && !m.result);
  if (todayPending.length === 0) return builder.build();

  // Provisional leader — the committee deliberates against today's table.
  let yushoId = "";
  let bestWins = -1;
  for (const [id, rec] of basho.standings ?? []) {
    if (rec.wins > bestWins) {
      bestWins = rec.wins;
      yushoId = id;
    }
  }

  const provisional = determineSpecialPrizes(
    resolved,
    world.rikishi,
    yushoId,
    rngForWorld(world, "governance", "sansho_committee_am")
  );

  // Candidate pool mirrors determineSpecialPrizes: makuuchi, below ozeki.
  const winCounts = new Map<string, number>();
  for (const m of resolved) {
    const w = m.result?.winnerRikishiId;
    if (w) winCounts.set(w, (winCounts.get(w) ?? 0) + 1);
  }

  const announced = new Set<string>();
  const provisionalLists: [string[], string][] = [
    [provisional.shukunsho, "Shukun-sho"],
    [provisional.kantosho, "Kanto-sho"],
    [provisional.ginoSho, "Gino-sho"],
  ];

  // Secured candidates: already ≥8 wins — a day-15 loss cannot strip
  // eligibility, though the final table may still reorder.
  for (const [holders, prizeName] of provisionalLists) {
    for (const id of holders) {
      announced.add(id);
      const r: Rikishi | undefined = world.rikishi.get(id);
      builder.logEvent(
        "SANSHO_CONDITIONAL",
        "governance",
        {
          status: "sansho_conditional",
          condition: "secured",
          prize: prizeName,
          rikishiId: id,
          shikona: r?.shikona,
          day: 15,
        },
        { rikishiId: id, heyaId: r?.heyaId, importance: "standard" }
      );
    }
  }

  // The classic conditional: a sub-ozeki makuuchi rikishi at 7 wins with a
  // bout today enters candidacy only by winning — announced "needs a win".
  for (const m of todayPending) {
    for (const id of [m.eastRikishiId, m.westRikishiId]) {
      if (announced.has(id)) continue;
      const r = world.rikishi.get(id);
      if (!r || r.division !== "makuuchi" || isYokozunaOrOzekiRank(r.rank)) continue;
      if ((winCounts.get(id) ?? 0) !== 7) continue;
      builder.logEvent(
        "SANSHO_CONDITIONAL",
        "governance",
        {
          status: "sansho_conditional",
          condition: "needs_win",
          rikishiId: id,
          shikona: r.shikona,
          day: 15,
        },
        { rikishiId: id, heyaId: r.heyaId, importance: "standard" }
      );
    }
  }

  return builder.build();
}
