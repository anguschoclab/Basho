import type { WorldState } from "../../types/world";
import type { StateImpact } from "../../core/StateImpact";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { TREATMENT_COST_PER_WEEK } from "../../../constants/engine/health";
import { generateKyujoNarrative } from "../../bout/boutNarrative";

/** Withdraw a rikishi from competition (kyūjō) due to injury. */
export function withdrawRikishi(world: WorldState, rikishiId: string): StateImpact {
  const builder = createImpactBuilder("withdrawRikishi");
  const r = world.rikishi.get(rikishiId);
  if (!r) return builder.build();
  builder.updateRikishi(rikishiId, { isKyujo: true, kyujoReason: "injury" });

  // Gap 10: Check if this withdrawal stems from an in-bout injury (weekOccurred matches current basho week)
  const currentWeek = world.currentBasho?.day ?? world.week ?? 0;
  const injuryWeek = r.currentInjury?.weekOccurred;
  const isInBoutInjury = injuryWeek !== undefined && injuryWeek === currentWeek;

  const narrative = generateKyujoNarrative(
    r,
    "injury_withdrawal",
    {
      area: r.injuryStatus?.location ?? r.currentInjury?.area ?? "leg",
      day: world.currentBasho?.day ?? 1,
      reason: isInBoutInjury ? "in-bout injury" : "injury",
    },
    `withdraw-${rikishiId}-${world.week ?? 0}`
  );
  builder.logEvent(
    "LIFECYCLE_EVENT",
    "injury",
    {
      rikishiId,
      heyaId: r.heyaId,
      status: "withdrawn_kyujo",
      narrative,
      isInBoutInjury,
    },
    { rikishiId, heyaId: r.heyaId }
  );
  return builder.build();
}

/** Pay to cut `weeks` off a rikishi's injury recovery; charges the heya. */
export function treatInjury(world: WorldState, rikishiId: string, weeks: number): StateImpact {
  const builder = createImpactBuilder("treatInjury");
  const r = world.rikishi.get(rikishiId);
  if (!r || !r.injured) return builder.build();
  const heya = world.heyas.get(r.heyaId);
  if (!heya) return builder.build();

  const cut = Math.min(Math.max(0, weeks), r.injuryWeeksRemaining ?? 0);
  const cost = cut * TREATMENT_COST_PER_WEEK;
  if (cut <= 0 || (heya.funds ?? 0) < cost) return builder.build();

  const remaining = (r.injuryWeeksRemaining ?? 0) - cut;
  builder.updateRikishi(rikishiId, {
    injuryWeeksRemaining: remaining,
    injured: remaining > 0,
  });
  builder.updateHeya(heya.id, { funds: (heya.funds ?? 0) - cost });
  builder.logEvent(
    "LIFECYCLE_EVENT",
    "injury",
    { rikishiId, heyaId: heya.id, status: "treated", weeksCut: cut, cost },
    { rikishiId, heyaId: heya.id }
  );
  return builder.build();
}
