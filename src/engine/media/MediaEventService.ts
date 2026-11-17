// MediaEventService.ts — Event-driven media operations.
// Handles handleMediaEvent, evaluateScandals, generateGovernanceHeadline.

import type { WorldState } from "@/engine/types/world";
import { MediaHeadline, HeadlineTier } from "@/engine/types/media";
import { createDefaultMediaState } from "@/engine/media/MediaService";
import type { GovernanceRuling } from "@/engine/types/economy";
import { rngForWorld } from "@/engine/core/rng";
import { BardEngine } from "@/engine/bard/BardEngine";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { StateImpact } from "@/engine/core/StateImpact";
import { getHeya } from "@/engine/core/queries";

/**
 * Generates a headline for a governance or welfare event using the BardEngine.
 * Returns StateImpact describing headline generation instead of mutating state directly.
 */
export function generateGovernanceHeadline(args: {
  world: WorldState;
  heyaId: string;
  templatePath: string; // e.g., 'institutional.welfare.watch_headline'
  severity?: HeadlineTier;
  salt?: string; // caller discriminator so repeated same-template headlines mint distinct MH ids
}): StateImpact {
  const { world, heyaId, templatePath, severity = "local" } = args;
  const builder = createImpactBuilder("generateGovernanceHeadline");

  if (!world.mediaState || !world.mediaState.headlines) return builder.build();

  const heya = getHeya(world, heyaId);
  const context = {
    heyaname: heya?.name ?? "Heya",
    heya: heya?.name ?? "Heya",
  };

  const week = world.week ?? 0;
  // SeededRNG.uuid counters are per-instance — a heya can emit several
  // same-template headlines in one day (e.g. repeated scandals), so the label
  // needs the day, a caller salt, AND the current headline count or the MH
  // ids collide (precedent: ScandalService salts ruling ids with
  // governanceLog.length). The count tracks every previously-minted headline,
  // so sequential same-label calls still produce distinct ids.
  const rng = rngForWorld(
    world,
    "media",
    `gov::${heyaId}::${templatePath}::${week}::${world.dayIndexGlobal ?? 0}::${args.salt ?? ""}::${world.mediaState.headlines.length}`
  );

  // Resolve title from archive
  const { text: title } = BardEngine.resolve(rng, templatePath, context);

  const headline: MediaHeadline = {
    id: rng.uuid("MH"),
    week,
    tier: severity,
    beat: templatePath.includes("welfare") ? "discipline" : "controversy",
    tone: severity === "main_event" || severity === "national" ? "controversy" : "neutral",
    rikishiIds: [],
    heyaIds: [heyaId],
    title,
    subtitle: "", // Optional for now
    impact: severity === "main_event" ? 60 : severity === "national" ? 40 : 20,
    tags: ["governance", "institutional"],
  };

  // Update media state with new headline
  const updatedHeadlines = [...world.mediaState.headlines, headline];
  if (updatedHeadlines.length > 250) updatedHeadlines.shift();

  builder.updateWorldField("mediaState", {
    ...world.mediaState,
    headlines: updatedHeadlines,
    heyaPressure: {
      ...world.mediaState.heyaPressure,
      [heyaId]: Math.min(100, (world.mediaState.heyaPressure[heyaId] ?? 0) + headline.impact / 2),
    },
  });

  return builder.build();
}

/**
 * Handles a media event choice and applies its effects.
 * Returns StateImpact describing event handling instead of mutating state directly.
 */
export function handleMediaEvent(world: WorldState, eventId: string, choice: string): StateImpact {
  const builder = createImpactBuilder("handleMediaEvent");

  if (!world.mediaState) return builder.build();

  // Find the event in the governance log or media state. Every id the UI can
  // dispatch is a governanceLog entry — a stale/unknown id must be a no-op,
  // not fall back to the player's stable (V18-S7-25).
  const eventIndex = world.governanceLog?.findIndex((r) => r.id === eventId);
  if (eventIndex === undefined || eventIndex < 0 || !world.governanceLog) {
    return builder.build();
  }
  let targetHeyaId = world.playerHeyaId;
  if (world.governanceLog) {
    // Update the ruling with the player's choice via ImpactBuilder
    const ruling = world.governanceLog[eventIndex] as GovernanceRuling;
    targetHeyaId = ruling.heyaId ?? targetHeyaId;
    const updatedRuling: GovernanceRuling = {
      ...ruling,
      playerChoice: choice,
      playerResponse: `Player chose: ${choice}`,
    };

    // Replace the ruling in governanceLog by updating the entire array
    const updatedGovernanceLog = [...world.governanceLog];
    updatedGovernanceLog[eventIndex] = updatedRuling;
    builder.updateWorldField("governanceLog", updatedGovernanceLog);
  }

  // Apply choice effects to media state — scoped to the responding heya,
  // matching the actor-scoped NPC variant: a player apology must not cool
  // every rikishi league-wide, and a denial must not pressure every heya.
  const updatedMediaHeat = { ...world.mediaState.mediaHeat };
  const updatedHeyaPressure = { ...world.mediaState.heyaPressure };

  if (choice === "apologize" && targetHeyaId) {
    // Apologizing reduces heat but may hurt reputation
    const mediaHeat = world.mediaState.mediaHeat;
    const roster = getHeya(world, targetHeyaId)?.rikishiIds ?? [];
    for (const id of roster) {
      if (!Object.prototype.hasOwnProperty.call(mediaHeat, id)) continue;
      updatedMediaHeat[id] = Math.max(0, (mediaHeat[id] as number) - 5);
    }
    updatedHeyaPressure[targetHeyaId] = Math.max(0, (updatedHeyaPressure[targetHeyaId] ?? 0) - 5);
  } else if (choice === "deny" && targetHeyaId) {
    // Denying may increase pressure on the responding heya
    updatedHeyaPressure[targetHeyaId] = Math.min(100, (updatedHeyaPressure[targetHeyaId] ?? 0) + 5);
  } else if (choice === "ignore") {
    // Ignoring has no immediate effect but may cause decay
    // Natural decay will happen in weekly boundary
  }

  builder.updateWorldField("mediaState", {
    ...world.mediaState,
    mediaHeat: updatedMediaHeat,
    heyaPressure: updatedHeyaPressure,
  });

  return builder.build();
}

/**
 * Actor-aware variant of handleMediaEvent for NPC heyas.
 *
 * Applies media effects scoped to the acting heya — never the global
 * heat/pressure sweep of the player path — and records the resolution on
 * the ruling as `actorChoice`/`actorId` rather than `playerChoice`.
 * "deflect" shifts pressure onto the acting heya's hottest heya rival.
 */
export function handleMediaEventForHeya(
  world: WorldState,
  eventId: string,
  choice: string,
  heyaId: string
): StateImpact {
  const builder = createImpactBuilder("handleMediaEventForHeya");

  if (!world.mediaState) return builder.build();

  // Record the NPC's resolution on the ruling (only when the ruling belongs
  // to the acting heya — never touch player or foreign rulings).
  const eventIndex = world.governanceLog?.findIndex((r) => r.id === eventId);
  if (eventIndex !== undefined && eventIndex >= 0 && world.governanceLog) {
    const ruling = world.governanceLog[eventIndex] as GovernanceRuling;
    if (ruling.heyaId === heyaId) {
      const updatedRuling: GovernanceRuling = {
        ...ruling,
        actorChoice: choice,
        actorId: heyaId,
      };
      const updatedGovernanceLog = [...world.governanceLog];
      updatedGovernanceLog[eventIndex] = updatedRuling;
      builder.updateWorldField("governanceLog", updatedGovernanceLog);
    }
  }

  const updatedHeyaPressure = { ...world.mediaState.heyaPressure };
  const own = updatedHeyaPressure[heyaId] ?? 0;

  if (choice === "apologize") {
    updatedHeyaPressure[heyaId] = Math.max(0, own - 5);
  } else if (choice === "deny") {
    updatedHeyaPressure[heyaId] = Math.min(100, own + 5);
  } else if (choice === "deflect") {
    updatedHeyaPressure[heyaId] = Math.max(0, own - 3);
    // Shift the narrative onto the acting heya's hottest rival stable.
    const rivalId = hottestHeyaRival(world, heyaId);
    if (rivalId) {
      updatedHeyaPressure[rivalId] = Math.min(100, (updatedHeyaPressure[rivalId] ?? 0) + 3);
    }
    const heya = getHeya(world, heyaId);
    if (heya) {
      builder.updateHeya(heyaId, {
        reputation: Math.max(0, (heya.reputation ?? 50) - 1),
      });
    }
  }
  // "ignore" has no immediate effect; natural decay handles the rest.

  builder.updateWorldField("mediaState", {
    ...world.mediaState,
    heyaPressure: updatedHeyaPressure,
  });

  return builder.build();
}

/**
 * Dated JSA rule-change bulletins, fired at the calendar months matching the
 * real announcements. Each headline is deduped by tag so replayed boundary
 * ticks cannot double-publish.
 *
 * - 2026-07-30 (→ month boundary into August): the JSA board approves the
 *   compensation revision effective Hatsu 2027 (yusho ¥10M→¥20M, sanshō
 *   ¥2M→¥3M, sekitori salaries +~10%, non-sekitori allowances up).
 * - 2026-10-01 (→ month boundary into October): Article 9 of the bout
 *   regulations loses its 71-year-old exception — a topknot touching the
 *   clay first is now always a loss. The bout engine doesn't model hair
 *   touches; the bulletin is world-faithful ambience, not a rules change
 *   in sim terms.
 * - Boundary into January 2027 (phase05 still sees year=2026; phase06
 *   increments it after): the revised schedule takes effect.
 */
export function announceJsaBulletins(world: WorldState): StateImpact {
  const builder = createImpactBuilder("announceJsaBulletins");
  const headlines = world.mediaState?.headlines;
  if (!headlines) return builder.build();

  const year = world.year ?? 0;
  const month = world.calendar?.month ?? 0;
  const week = world.week ?? 0;

  const bulletins: Array<{
    tag: string;
    tier: HeadlineTier;
    title: string;
    subtitle: string;
    when: boolean;
  }> = [
    {
      tag: "jsa_pay_revision_announced",
      tier: "national",
      title: "JSA approves sweeping rikishi pay and prize revision",
      subtitle:
        "Effective from Hatsu 2027 — makuuchi yūshō doubles to ¥20,000,000, sanshō rise to ¥3,000,000, and sekitori salaries climb ~10%.",
      when: year === 2026 && month === 8,
    },
    {
      tag: "jsa_article9_revision",
      tier: "local",
      title: "JSA amends bout regulations for the first time in 71 years",
      subtitle:
        "Article 9's exception is gone — a topknot touching the clay first now means defeat, even for the attacking rikishi mid-throw.",
      when: year === 2026 && month === 10,
    },
    {
      tag: "jsa_pay_revision_effective",
      tier: "national",
      title: "Revised JSA pay schedule takes effect this basho",
      subtitle:
        "Yūshō prizes, sanshō, monthly salaries, and non-sekitori allowances all rise under the July 2026 board revision.",
      when: year === 2026 && month === 1,
    },
  ];

  const fired = bulletins.filter(
    (b) => b.when && !headlines.some((h) => h.tags?.includes(b.tag))
  );
  if (fired.length === 0) return builder.build();

  const rng = rngForWorld(
    world,
    "media",
    `jsa-bulletins::${year}::${month}::${headlines.length}`
  );
  const newHeadlines = [...headlines];
  for (const b of fired) {
    newHeadlines.push({
      id: rng.uuid("MH"),
      week,
      tier: b.tier,
      beat: "feature",
      tone: "neutral",
      rikishiIds: [],
      heyaIds: [],
      title: b.title,
      subtitle: b.subtitle,
      impact: b.tier === "national" ? 40 : 20,
      tags: ["governance", "jsa", b.tag],
    });
  }
  if (newHeadlines.length > 250) newHeadlines.splice(0, newHeadlines.length - 250);

  builder.updateWorldField("mediaState", {
    ...(world.mediaState ?? createDefaultMediaState()),
    headlines: newHeadlines,
  });
  return builder.build();
}

/** Deterministically pick the acting heya's hottest rival stable. */
function hottestHeyaRival(world: WorldState, heyaId: string): string | undefined {
  const pairs = world.rivalriesState?.heyaRivalryPairs;
  if (!pairs) return undefined;
  let best: { id: string; heat: number } | undefined;
  for (const key of Object.keys(pairs).sort()) {
    const p = pairs[key];
    if (p.heyaAId !== heyaId && p.heyaBId !== heyaId) continue;
    const other = p.heyaAId === heyaId ? p.heyaBId : p.heyaAId;
    if (!best || p.heat > best.heat || (p.heat === best.heat && other < best.id)) {
      best = { id: other, heat: p.heat };
    }
  }
  return best?.id;
}

/**
 * Evaluates active scandals and applies ongoing pressure/heat effects.
 * Called every week during the media tick to keep scandal dynamics alive.
 * Returns StateImpact describing scandal evaluation instead of mutating state directly.
 */
export function evaluateScandals(world: WorldState): StateImpact {
  const builder = createImpactBuilder("evaluateScandals");

  if (!world.mediaState) return builder.build();

  // Scandal pressure: stables with high scandalScore get persistent heyaPressure bumps
  const updatedHeyaPressure = { ...world.mediaState.heyaPressure };

  for (const heya of world.heyas.values()) {
    if (!heya.scandalScore || heya.scandalScore <= 0) continue;
    const pressBump = Math.floor(heya.scandalScore / 10); // 0-3 per week
    if (pressBump > 0) {
      updatedHeyaPressure[heya.id] = Math.min(100, (updatedHeyaPressure[heya.id] ?? 0) + pressBump);
    }
  }

  builder.updateWorldField("mediaState", {
    ...world.mediaState,
    heyaPressure: updatedHeyaPressure,
  });

  return builder.build();
}
