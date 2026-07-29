// MediaPreBashoService.ts — Pre-basho journalism and media digest.
// Handles triggerPreBashoJournalism, buildMediaDigest, and the
// private helper generateInterviewPrompt.

import type { WorldState } from "../../types/world";
import type { RivalryPairState } from "../../../constants/engine/rivalry";
import { MediaHeadline } from "../../types/media";
import { rngForWorld, SeededRNG } from "../../rng";
import { generatePreBashoHeadline } from "./HeadlineGenerator";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { getHeya, getRikishi } from "../../queries";

/**
 * Trigger pre-basho journalism hype.
 * (P0-D: Pre-Basho Journalism)
 */
export function triggerPreBashoJournalism(world: WorldState): StateImpact {
  const builder = createImpactBuilder("triggerPreBashoJournalism");
  const rng = rngForWorld(world, "media", `pre_basho_${world.year}_${world.currentBasho?.name}`);
  const week = world.week ?? 0;
  const headlines: MediaHeadline[] = [];

  // A. Rivalry Watch
  const rivalriesState = world.rivalriesState;
  if (rivalriesState?.pairs) {
    const hotPair = Object.values(rivalriesState.pairs).sort(
      (a: RivalryPairState, b: RivalryPairState) => b.heat - a.heat
    )[0];

    if (hotPair && hotPair.heat > 30) {
      const rA = getRikishi(world, hotPair.aId);
      const rB = getRikishi(world, hotPair.bId);
      const { title, subtitle } = generatePreBashoHeadline({
        rng,
        kind: "rivalryWatch",
        ctx: { SHIKONA1: rA?.shikona || "Champion", SHIKONA2: rB?.shikona || "Rival" },
      });
      headlines.push({
        id: rng.uuid("MH"),
        week,
        tier: "high",
        beat: "rivalry",
        tone: "dramatic",
        rikishiIds: [hotPair.aId, hotPair.bId],
        title,
        subtitle,
        tags: ["pre_basho", "rivalry"],
      });
    }
  }

  // B. Promotion Race
  const ozekiRikishi: Rikishi[] = [];
  for (const id of world.activeRikishiIds) {
    const r = getRikishi(world, id);
    if (r && r.rank === "ozeki" && (r.consecutiveStrongOzeki ?? 0) >= 1) {
      ozekiRikishi.push(r);
    }
  }
  ozekiRikishi.sort((a, b) => (b.consecutiveStrongOzeki ?? 0) - (a.consecutiveStrongOzeki ?? 0));

  if (ozekiRikishi.length > 0) {
    const r = ozekiRikishi[0];
    const { title, subtitle } = generatePreBashoHeadline({
      rng,
      kind: "promotionRace",
      ctx: { SHIKONA: r.shikona },
    });
    headlines.push({
      id: rng.uuid("MH"),
      week,
      tier: "main_event",
      beat: "promotion",
      tone: "praise",
      rikishiIds: [r.id],
      title,
      subtitle,
      tags: ["pre_basho", "ozeki_watch"],
    });
  }

  // C. Update Media State
  const currentHeadlines = world.mediaState?.headlines || [];
  builder.updateWorldField("mediaState", {
    ...world.mediaState,
    headlines: [...currentHeadlines, ...headlines].slice(-50),
  });

  // D. Emit Management Decision Event for UI Overlay (D1)
  const interviewPrompt = generateInterviewPrompt(world, rng);
  builder.addEvent({
    id: rng.uuid("EV"),
    type: "MANAGEMENT_DECISION",
    category: "narrative",
    title: "Media Day",
    summary: "The press has arrived at the heya. It's time to address the public.",
    tags: ["pre_basho", "press_conference", "blocking"],
    phase: "pre_basho",
    year: world.year,
    week,
    data: {
      interviewPrompt,
    },
  });

  builder.logEvent("PRE_BASHO_JOURNALISM", "media", {
    headlines,
    year: world.year,
    week,
  });

  return builder.build();
}

/**
 * Generates a random interview prompt for the player stable.
 */
function generateInterviewPrompt(world: WorldState, rng: SeededRNG) {
  const prompts = [
    {
      question:
        "Your top rikishi is entering this tournament as a heavy favorite. How is the stable handling the pressure?",
      choices: [
        { id: "modest", text: "We focus on one bout at a time.", impact: { rep: 5, heat: -10 } },
        {
          id: "confident",
          text: "He's better than ever. The title is ours.",
          impact: { rep: -10, heat: 25 },
        },
        {
          id: "deflect",
          text: "The dojo results will speak for themselves.",
          impact: { rep: 0, heat: 0 },
        },
      ],
    },
    {
      question:
        "There are rumors of tension between your stable and the Isegahama faction. Any comment?",
      choices: [
        {
          id: "deny",
          text: "We have nothing but respect for our brothers.",
          impact: { rep: 5, politicalCapital: 5 },
        },
        {
          id: "challenge",
          text: "Success naturally breeds envy.",
          impact: { rep: -15, heat: 30, politicalCapital: -10 },
        },
      ],
    },
  ];
  return rng.pick(prompts);
}

/**
 * Builds a summarized media digest object for display in the UI.
 */
export function buildMediaDigest(world: WorldState): {
  topHeadlines: MediaHeadline[];
  hotRikishi: Array<{ id: string; name: string; heat: number }>;
  hotHeya: Array<{ id: string; name: string; pressure: number }>;
  weeklyGazette: string[];
} {
  const mediaState = world.mediaState;
  if (!mediaState) {
    return { topHeadlines: [], hotRikishi: [], hotHeya: [], weeklyGazette: [] };
  }

  const topHeadlines = [...mediaState.headlines]
    .sort((a, b) => (b.impact as number) - (a.impact as number))
    .slice(0, 5);

  const hotRikishiRaw = [];
  for (const id in mediaState.mediaHeat) {
    if (!Object.prototype.hasOwnProperty.call(mediaState.mediaHeat, id)) continue;
    const heat = mediaState.mediaHeat[id] as number;
    const r = getRikishi(world, id);
    hotRikishiRaw.push({ id, name: r?.shikona ?? r?.name ?? id, heat });
  }
  const hotRikishi = hotRikishiRaw.sort((a, b) => b.heat - a.heat).slice(0, 5);

  const hotHeyaRaw = [];
  for (const id in mediaState.heyaPressure) {
    if (!Object.prototype.hasOwnProperty.call(mediaState.heyaPressure, id)) continue;
    const pressure = mediaState.heyaPressure[id] as number;
    const h = getHeya(world, id);
    hotHeyaRaw.push({ id, name: h?.name ?? id, pressure });
  }
  const hotHeya = hotHeyaRaw.sort((a, b) => b.pressure - a.pressure).slice(0, 5);

  const weeklyGazette: string[] = [];
  for (const h of topHeadlines) {
    if (h.title) weeklyGazette.push(h.title);
  }

  return { topHeadlines, hotRikishi, hotHeya, weeklyGazette };
}
