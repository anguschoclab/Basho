// narrative.ts
// Play-by-Play Narrative Generator
// Constitution PBP System Section 7 — 12-step canonical order with ritual elements
// "The bout is resolved by the engine. It is remembered by the hall."
//
// NOTE:
// - Expects result.log phases: "tachiai" | "clinch" | "momentum" | "finish"
// - Expects tachiai log entry data includes { winner, margin }
// - Expects clinch log entry data includes { stance, advantage, position? }
// - Expects momentum log entry data includes { position?, recovery?, reason?, advantage?, edgeEvent? }
//
// Engine position vocabulary:
// - "front" | "lateral" | "rear"
import { rngFromSeed, rngForWorld } from "./rng";
import { SeededRNG } from "./utils/SeededRNG";
import type { BoutResult, BoutLogEntry, Rikishi, BashoName, Stance } from "./types";
import { BASHO_CALENDAR } from "./calendar";
import { RANK_HIERARCHY } from "./banzuke";

type VoiceStyle = "formal" | "dramatic" | "understated";
type CrowdStyle = "restrained" | "responsive" | "intimate";

interface NarrativeContext {
  rng: SeededRNG;
  east: Rikishi;
  west: Rikishi;
  result: BoutResult;

  // Canon location/venue info
  location: string; // Tokyo/Osaka/Nagoya/Fukuoka
  venue: string; // venue building name
  venueShortName: string;

  day: number;
  voiceStyle: VoiceStyle;
  crowdStyle: CrowdStyle;
  isHighStakes: boolean;
  boutSeed: string;

  hasKensho: boolean;
  kenshoCount: number;
  sponsorName: string | null;
}

// Keyed by LOCATION (matches BASHO_CALENDAR.location)
const VENUE_PROFILES: Record<
  string,
  {
    shortName: string;
    venue: string;
    crowdStyle: CrowdStyle;
  }
> = {
  Tokyo: { shortName: "Ryōgoku", venue: "Ryōgoku Kokugikan", crowdStyle: "restrained" },
  Osaka: { shortName: "Osaka", venue: "Edion Arena Osaka", crowdStyle: "responsive" },
  Nagoya: { shortName: "Nagoya", venue: "Aichi Prefectural Gymnasium", crowdStyle: "responsive" },
  Fukuoka: { shortName: "Fukuoka", venue: "Fukuoka Kokusai Center", crowdStyle: "intimate" }
};

const KENSHO_SPONSORS = [
  "Nagatanien",
  "Morinaga",
  "Yaokin",
  "Kirin Brewery",
  "Suntory",
  "Takashimaya",
  "Mitsukoshi",
  "Asahi Breweries",
  "Pocari Sweat",
  "Meiji Holdings",
  "Yamazaki Baking"
];

function getVoiceStyle(day: number, isHighStakes: boolean): VoiceStyle {
  if (day >= 13 || isHighStakes) return "dramatic";
  if (day <= 5) return "understated";
  return "formal";
}

function pick<T>(rng: SeededRNG, arr: T[]): T {
  return arr[Math.floor(rng.next() * arr.length)];
}

// Deterministic estimate only (caller can override)
function estimateKensho(
  east: Rikishi,
  west: Rikishi,
  day: number,
  rng: SeededRNG
): { hasKensho: boolean; count: number; sponsorName: string | null } {
  const eastRank = RANK_HIERARCHY[east.rank];
  const westRank = RANK_HIERARCHY[west.rank];
  const highestTier = Math.min(eastRank.tier, westRank.tier);

  let baseChance = 0;
  let baseCount = 0;

  if (highestTier <= 1) {
    baseChance = 0.95;
    baseCount = 15 + Math.floor(rng.next() * 20);
  } else if (highestTier <= 2) {
    baseChance = 0.85;
    baseCount = 8 + Math.floor(rng.next() * 12);
  } else if (highestTier <= 4) {
    baseChance = 0.7;
    baseCount = 4 + Math.floor(rng.next() * 8);
  } else if (highestTier <= 5) {
    baseChance = 0.5;
    baseCount = 2 + Math.floor(rng.next() * 4);
  } else {
    baseChance = 0.15;
    baseCount = 1 + Math.floor(rng.next() * 2);
  }

  if (day >= 13) {
    baseChance = Math.min(1, baseChance + 0.2);
    baseCount = Math.floor(baseCount * 1.3);
  }

  const hasKensho = rng.next() < baseChance;
  const sponsorName = hasKensho ? pick(rng, KENSHO_SPONSORS) : null;

  return { hasKensho, count: hasKensho ? baseCount : 0, sponsorName };
}

// === STEP 1: VENUE & DAY FRAMING ===
function generateVenueFraming(ctx: NarrativeContext): string[] {
  const { day, venueShortName, voiceStyle } = ctx;

  if (voiceStyle === "dramatic") {
    if (day === 15) return [`Day Fifteen—senshuraku—here in ${venueShortName}. The air is electric.`];
    if (day >= 13) return [`Day ${day} in ${venueShortName}, and the hall is already alive.`];
    return [`Day ${day} here in ${venueShortName}, and the crowd is already alive.`];
  }

  if (voiceStyle === "understated") return [`Day ${day} in ${venueShortName}. The early basho rhythm continues.`];
  return [`Day ${day} at ${venueShortName}.`];
}

// === STEP 2: RANK / STAKE CONTEXT ===
function generateRankContext(ctx: NarrativeContext): string[] {
  const { east, west, isHighStakes, voiceStyle } = ctx;
  const lines: string[] = [];

  const eastRank = RANK_HIERARCHY[east.rank];
  const westRank = RANK_HIERARCHY[west.rank];

  if (isHighStakes && voiceStyle !== "understated") {
    if (eastRank.tier <= 1 || westRank.tier <= 1) lines.push("A Yokozuna bout. The hall knows what this demands.");
    else if (eastRank.tier <= 2 || westRank.tier <= 2) lines.push("Ozeki-level sumo. The stakes are clear.");
  }

  return lines;
}

// === STEP 3: RING ENTRANCE RITUALS ===
function generateRingEntrance(ctx: NarrativeContext): string[] {
  const { east, west, crowdStyle, isHighStakes } = ctx;
  const lines: string[] = [];

  const eastRank = RANK_HIERARCHY[east.rank];
  const westRank = RANK_HIERARCHY[west.rank];

  if (crowdStyle === "intimate") {
    lines.push(`${east.shikona} steps onto the dohyo—greeted warmly by this hall.`);
    lines.push(`${west.shikona} follows, expression tight.`);
    return lines;
  }

  if (crowdStyle === "responsive") {
    if (isHighStakes) {
      lines.push(`${east.shikona} approaches the dohyo. The hall stirs.`);
      lines.push(`${west.shikona} rises. A ripple of anticipation.`);
    } else {
      lines.push(`${east.shikona} takes his position.`);
      lines.push(`${west.shikona} settles across the ring.`);
    }
    return lines;
  }

  // Restrained Tokyo style
  if (eastRank.tier <= 2 || westRank.tier <= 2) {
    lines.push(`${east.shikona} ascends. The hall knows what this rank demands.`);
    lines.push(`${west.shikona} waits. History watches.`);
  } else {
    lines.push(`${east.shikona} and ${west.shikona} take their marks.`);
  }

  return lines;
}

// === RITUAL ELEMENTS ===
function generateRitualElements(ctx: NarrativeContext): string[] {
  const { east, west, voiceStyle, isHighStakes, rng } = ctx;
  const lines: string[] = [];

  if (voiceStyle !== "understated" || rng.next() < 0.5) {
    const saltPhrases =
      voiceStyle === "dramatic"
        ? [
            `${east.shikona} steps forward, lifting the salt high before casting it across the ring.`,
            `${east.shikona} throws the salt with practiced ceremony—a generous handful.`,
            `Salt arcs through the air from ${east.shikona}'s hand, catching the light.`
          ]
        : [`${east.shikona} takes his salt.`, `${east.shikona} tosses the salt—a simple gesture.`];
    lines.push(pick(rng, saltPhrases));

    const westSaltPhrases =
      voiceStyle === "dramatic"
        ? [
            `${west.shikona} follows, stamping the clay, eyes fixed ahead.`,
            `${west.shikona} answers with his own throw—deliberate, focused.`,
            `${west.shikona} rises, throws, and settles. The ritual unfolds.`
          ]
        : [`${west.shikona} follows suit.`, `${west.shikona} takes his turn.`];
    lines.push(pick(rng, westSaltPhrases));
  }

  if (voiceStyle === "dramatic" && isHighStakes && rng.next() < 0.4) {
    lines.push(
      pick(rng, [
        "Both men stamp the clay—the sound echoes in the rafters.",
        "The shiko stamps ring out, driving away evil spirits.",
        "They stomp in rhythm, the ancient gesture of purification."
      ])
    );
  }

  if (voiceStyle === "dramatic" && rng.next() < 0.3) {
    lines.push(
      pick(rng, [
        "Deep breaths. Shoulders squared. The moment approaches.",
        "They settle into themselves. The crowd goes quiet.",
        "A final exhale. Both men find their center."
      ])
    );
  }

  return lines;
}

// === KENSHO BANNER PRE-BOUT ===
function generateKenshoBanners(ctx: NarrativeContext): string[] {
  const { hasKensho, kenshoCount, sponsorName, voiceStyle } = ctx;
  const lines: string[] = [];

  if (hasKensho && sponsorName) {
    if (voiceStyle === "dramatic") {
      if (kenshoCount >= 20) lines.push(`The banners multiply—${kenshoCount} kenshō today! ${sponsorName} and others line the dohyo.`);
      else if (kenshoCount >= 10) lines.push(`The banners from ${sponsorName} and others frame the dohyo as the crowd settles.`);
      else lines.push(`Kenshō banners circle the ring. ${sponsorName} among them.`);
    } else if (voiceStyle === "formal") {
      lines.push(`${kenshoCount} kenshō banners are presented.`);
    }
  }

  return lines;
}

// === STEP 4: SHIKIRI TENSION ===
function generateShikiriTension(ctx: NarrativeContext): string[] {
  const { voiceStyle, rng } = ctx;

  if (voiceStyle === "dramatic") {
    const shikiriPhrases = [
      "They crouch at the shikiri-sen. The crowd holds its breath.",
      "They crouch at the shikiri-sen… no hesitation.",
      "Down to the line. Eyes locked. Waiting.",
      "At the shikiri-sen now. Fingers to the clay. Silence falls."
    ];
    const lines = [pick(rng, shikiriPhrases)];
    if (rng.next() < 0.4) lines.push("Neither blinks.");
    return lines;
  }

  if (voiceStyle === "formal") return ["They settle at the line."];
  return ["Ready positions."];
}

// === STEP 5: TACHIAI IMPACT ===
function generateTachiai(ctx: NarrativeContext, entry: BoutLogEntry): string[] {
  const { voiceStyle, east, west, rng, crowdStyle } = ctx;
  const lines: string[] = [];

  const winnerSide = (entry.data?.winner as "east" | "west") ?? "east";
  const winnerName = winnerSide === "east" ? east.shikona : west.shikona;
  const loserName = winnerSide === "east" ? west.shikona : east.shikona;
  const margin = (entry.data?.margin as number) ?? 0;

  if (voiceStyle === "dramatic") {
    lines.push("The fan drops—*tachiai!*");
    if (margin > 10) {
      lines.push(
        pick(rng, [
          `${winnerName} launches forward with a low, powerful charge!`,
          `An explosive collision! ${winnerName} drives forward with thunderous force!`,
          `${winnerName} fires from the shikiri-sen like a cannon! The impact echoes through the hall!`,
          `They crash together—the sound ripples through the rafters! ${winnerName} wins the initial clash!`
        ])
      );
      lines.push(
        pick(rng, [
          `${loserName} attempts to sidestep but is caught by the charge!`,
          `${loserName} staggers back from the impact!`,
          `The crowd gasps as ${loserName} is driven backward!`
        ])
      );
      if (crowdStyle !== "restrained" && rng.next() < 0.35) lines.push("A sharp intake of breath from the seats!");
    } else if (margin > 5) {
      lines.push(`They crash together! Neither gives! ${winnerName} finds the better of it—just.`);
    } else {
      lines.push("A measured clash—evenly matched! Both wrestlers feel each other out.");
    }
    return lines;
  }

  if (voiceStyle === "understated") {
    lines.push("The fan drops.");
    if (margin > 10) lines.push(`${winnerName} wins the tachiai decisively.`);
    else lines.push("A clean charge from both. Neither surprised.");
    return lines;
  }

  // Formal
  lines.push("The fan drops—tachiai.");
  if (margin > 8) lines.push(`${winnerName} takes control from the start.`);
  else lines.push("The initial clash is even. The bout begins.");
  return lines;
}

// === STEP 6: CONTROL ESTABLISHMENT (Clinch) ===
function generateClinch(ctx: NarrativeContext, entry: BoutLogEntry): string[] {
  const { voiceStyle, east, west, rng } = ctx;
  const lines: string[] = [];

  const stance = (entry.data?.stance as Stance) ?? "no-grip";
  const advantage = (entry.data?.advantage as "east" | "west" | "none") ?? "none";
  const advantagedName = advantage === "east" ? east.shikona : advantage === "west" ? west.shikona : null;

  switch (stance) {
    case "belt-dominant":
      if (voiceStyle === "dramatic") {
        lines.push(
          pick(rng, [
            `${advantagedName ?? east.shikona} gets both hands to the mawashi—deep and strong!`,
            `A murmur spreads—someone has secured a deep belt grip!`,
            `${advantagedName ?? west.shikona} finds the mawashi! That's exactly what he wanted!`
          ])
        );
      } else {
        lines.push(`${advantagedName ?? "Both men"} secure the mawashi. Deep grip established.`);
      }
      break;

    case "push-dominant":
      if (voiceStyle === "dramatic") {
        lines.push("No belt work here—pure oshi-zumo! Hands at the chest!");
        if (advantagedName) lines.push(`${advantagedName} presses, palms driving at the throat and chest!`);
      } else {
        lines.push("They settle into a pushing exchange.");
      }
      break;

    case "migi-yotsu":
      if (voiceStyle === "dramatic") lines.push("Migi-yotsu—right hands in. The grips lock.");
      else lines.push("Migi-yotsu position. Right hands in.");
      if (advantagedName) lines.push(`${advantagedName} has the better angle.`);
      break;

    case "hidari-yotsu":
      if (voiceStyle === "dramatic") lines.push("Hidari-yotsu—left hands in. A tense belt battle.");
      else lines.push("Hidari-yotsu position. Left hands in.");
      if (advantagedName) lines.push(`${advantagedName} looks settled.`);
      break;

    default:
      if (voiceStyle === "dramatic") lines.push("They struggle for position—neither can settle! Hands slapping at arms and shoulders!");
      else lines.push("No clear grip established yet.");
  }

  return lines;
}

// === STEP 7: MOMENTUM SHIFT(S) ===
function generateMomentum(ctx: NarrativeContext, entry: BoutLogEntry): string[] {
  const { voiceStyle, east, west, result, rng, crowdStyle } = ctx;
  const lines: string[] = [];

  const recovery = (entry.data?.recovery as boolean) ?? false;
  const position = (entry.data?.position as "front" | "lateral" | "rear" | "frontal" | undefined) ?? undefined;

  const pos = position === "frontal" ? "front" : position;

  // Map engine positions into narrative beats
  if (pos === "lateral") {
    const mover = east.speed > west.speed ? east.shikona : west.shikona;
    lines.push(
      voiceStyle === "dramatic"
        ? `${mover} uses the forward pressure against his opponent—a sharp lateral pivot!`
        : `${mover} angles sideways—seeking advantage!`
    );
  } else if (pos === "rear") {
    const winnerName = result.winner === "east" ? east.shikona : west.shikona;
    lines.push(voiceStyle === "dramatic" ? `${winnerName} circles behind! Dangerous position for his opponent!` : `${winnerName} finds the back.`);
  }

  if (recovery) {
    const trailingName = result.winner === "east" ? west.shikona : east.shikona;
    if (voiceStyle === "dramatic") {
      lines.push(
        pick(rng, [
          `${trailingName} plants his feet and refuses to go quietly!`,
          `${trailingName} gives ground but stays balanced—still in this!`,
          `Remarkable recovery by ${trailingName}! He absorbs the pressure and pushes back!`
        ])
      );
      if (crowdStyle !== "restrained") lines.push("The crowd holds its breath!");
    } else {
      lines.push(`${trailingName} absorbs the pressure. Still alive.`);
    }
    return lines;
  }

  // Infer who is pressing (momentum entries may carry advantage; fall back to match winner)
  const adv = (entry.data?.advantage as "east" | "west" | "none" | undefined) ?? "none";
  const likelyLeader =
    adv === "east" ? east.shikona : adv === "west" ? west.shikona : result.winner === "east" ? east.shikona : west.shikona;

  if (rng.next() > 0.55) {
    if (voiceStyle === "dramatic") {
      lines.push(
        pick(rng, [
          `${likelyLeader} surges—relentless pressure!`,
          `The pressure is unrelenting—step by step!`,
          `${likelyLeader} drives! Legs churning against the clay!`
        ])
      );
    } else if (voiceStyle === "formal") {
      lines.push(`${likelyLeader} maintains forward pressure.`);
    } else {
      lines.push(`${likelyLeader} presses. Patient.`);
    }
  }

  return lines;
}

// === STEP 8: DECISIVE ACTION (Turning Point) ===
function generateTurningPoint(ctx: NarrativeContext): string[] {
  const { voiceStyle, east, west, result, rng } = ctx;
  const lines: string[] = [];

  if (voiceStyle === "dramatic") {
    const winnerName = result.winner === "east" ? east.shikona : west.shikona;
    const loserName = result.winner === "east" ? west.shikona : east.shikona;

    lines.push(
      pick(rng, [
        `${loserName} hesitates—just a moment! That's all ${winnerName} needs!`,
        `A grip slips! The balance shifts—this is it!`,
        `${loserName} tries to reset—too late! The opening appears!`,
        `The legs give. There's nothing left in the tank.`,
        `${winnerName} uses the forward momentum against his opponent!`
      ])
    );
  } else if (voiceStyle === "formal") {
    lines.push("The decisive moment arrives.");
  }

  return lines;
}

// === STEP 9-10: GYOJI RULING & KIMARITE EMPHASIS ===
function generateFinish(ctx: NarrativeContext, entry: BoutLogEntry): string[] {
  const { voiceStyle, east, west, crowdStyle, rng, result } = ctx;
  const lines: string[] = [];

  const winnerSide = (entry.data?.winner as "east" | "west") ?? result.winner;
  const winnerName = winnerSide === "east" ? east.shikona : west.shikona;
  const kimariteName = (entry.data?.kimariteName as string) || result.kimariteName;
  const isCounter = (entry.data?.isCounter as boolean) ?? false;

  if (voiceStyle === "dramatic") {
    if (isCounter) lines.push(`A reversal! ${winnerName} finds the counter!`);
    else lines.push(`${winnerName} drives through with **a textbook ${kimariteName}!**`);
    lines.push("Out!");

    if (crowdStyle === "intimate") lines.push("The hall erupts!");
    else if (crowdStyle === "responsive") lines.push("The crowd roars its approval!");
    else lines.push("A wave of applause rolls through Ryōgoku.");
    return lines;
  }

  if (voiceStyle === "understated") {
    lines.push(isCounter ? `${winnerName} finds the counter. It is done.` : `${winnerName} completes the work. Quietly decisive.`);
    lines.push("Polite applause.");
    return lines;
  }

  // Formal
  lines.push(isCounter ? `A reversal! ${winnerName} with the counter!` : `${winnerName} executes cleanly by ${kimariteName}.`);
  lines.push(`The gyoji points ${winnerSide}.`);
  return lines;
}

// === STEP 11: KENSHO CEREMONY ===
function generateKenshoCeremony(ctx: NarrativeContext): string[] {
  const { hasKensho, kenshoCount, voiceStyle, result, east, west } = ctx;
  const lines: string[] = [];
  if (!hasKensho) return lines;

  const winner = result.winner === "east" ? east : west;

  if (voiceStyle === "dramatic") {
    lines.push("The banners are lowered.");
    lines.push(kenshoCount >= 10 ? "The envelopes are presented, one by one." : "The envelopes are presented.");
    lines.push(`${winner.shikona} receives the kenshō with a measured bow.`);
  } else if (voiceStyle === "formal") {
    lines.push(`${winner.shikona} collects the kenshō.`);
  }

  return lines;
}

// === STEP 12: IMMEDIATE AFTERMATH FRAMING (Closing) ===
function generateClosing(ctx: NarrativeContext): string[] {
  const { voiceStyle, east, west, result, venueShortName, day, rng } = ctx;
  const lines: string[] = [];

  const winner = result.winner === "east" ? east : west;
  const loser = result.winner === "east" ? west : east;

  if (voiceStyle === "dramatic") {
    lines.push(
      pick(rng, [
        `What a moment in ${venueShortName}! Patience, balance, and pressure carry ${winner.shikona} through.`,
        `${winner.shikona} has done it! The hall will remember this one.`,
        `Sumo at its finest. ${winner.shikona} prevails.`,
        `Day ${day} delivers. ${winner.shikona} stands victorious.`
      ])
    );
    return lines;
  }

  if (voiceStyle === "understated") {
    lines.push(`${winner.shikona} takes the win.`);
    return lines;
  }

  lines.push(`${winner.shikona} defeats ${loser.shikona} by ${result.kimariteName}.`);
  return lines;
}

// === MAIN NARRATIVE GENERATOR ===
export function generateNarrative(
  east: Rikishi,
  west: Rikishi,
  result: BoutResult,
  bashoName: BashoName,
  day: number,
  opts?: {
    // If economics already computed kensho, feed it in.
    hasKensho?: boolean;
    kenshoCount?: number;
    sponsorName?: string | null;
  }
): string[] {
  const bashoInfo = BASHO_CALENDAR[bashoName];

  const location = bashoInfo?.location ?? "Tokyo";
  const venueProfile = VENUE_PROFILES[location] ?? VENUE_PROFILES["Tokyo"];

  const eastRank = RANK_HIERARCHY[east.rank];
  const westRank = RANK_HIERARCHY[west.rank];

  const isHighStakes = eastRank.tier <= 2 || westRank.tier <= 2 || day >= 13 || !!result.upset;
  const voiceStyle = getVoiceStyle(day, isHighStakes);

  const boutSeed = `${bashoName}-${day}-${east.id}-${west.id}-${result.kimarite}`;
  const rng = rngFromSeed(boutSeed, "narrative", "bout");

  const kensho =
    typeof opts?.hasKensho === "boolean"
      ? {
          hasKensho: opts.hasKensho,
          count: Math.max(0, Math.floor(opts.kenshoCount ?? 0)),
          sponsorName: opts.sponsorName ?? null
        }
      : estimateKensho(east, west, day, rng);

  const ctx: NarrativeContext = {
    rng,
    east,
    west,
    result,
    location,
    venue: venueProfile.venue,
    venueShortName: venueProfile.shortName,
    day,
    voiceStyle,
    crowdStyle: venueProfile.crowdStyle,
    isHighStakes,
    boutSeed,
    hasKensho: kensho.hasKensho,
    kenshoCount: kensho.count,
    sponsorName: kensho.sponsorName
  };

  const lines: string[] = [];

  // 1. Venue & day framing
  lines.push(...generateVenueFraming(ctx));

  // 2. Rank / stake context
  lines.push(...generateRankContext(ctx));

  // 3. Ring entrance rituals
  lines.push(...generateRingEntrance(ctx));

  // Ritual elements
  lines.push(...generateRitualElements(ctx));

  // Kensho banners
  lines.push(...generateKenshoBanners(ctx));

  // 4. Shikiri tension
  lines.push(...generateShikiriTension(ctx));

  // Steps 5–10 from log
  let hasClimax = false;

  const log = Array.isArray((result as any).log) ? ((result as any).log as BoutLogEntry[]) : [];
  for (const entry of log) {
    switch (entry.phase) {
      case "tachiai":
        lines.push(...generateTachiai(ctx, entry));
        break;
      case "clinch":
        lines.push(...generateClinch(ctx, entry));
        break;
      case "momentum": {
        const momentumLines = generateMomentum(ctx, entry);
        if (momentumLines.length > 0 && lines.length < 18) lines.push(...momentumLines);
        break;
      }
      case "finish":
        if (!hasClimax) {
          lines.push(...generateTurningPoint(ctx));
          hasClimax = true;
        }
        lines.push(...generateFinish(ctx, entry));
        break;
    }
  }

  // 11. Kensho ceremony
  lines.push(...generateKenshoCeremony(ctx));

  // 12. Closing
  lines.push(...generateClosing(ctx));

  return lines;
}