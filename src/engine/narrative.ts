import { pick } from "./utils";
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
import { rngFromSeed, rngForWorld, SeededRNG } from "./rng";
import type { BoutResult, BoutLogEntry, BashoName } from "./types/basho";
import type { Rikishi } from "./types/rikishi";
import type { Stance } from "./types/combat";
import { BASHO_CALENDAR } from "./calendar";
import { RANK_HIERARCHY } from "./banzuke";

/** Type representing voice style. */
type VoiceStyle = "formal" | "dramatic" | "understated";
/** Type representing crowd style. */
type CrowdStyle = "restrained" | "responsive" | "intimate";

/** Defines the structure for narrative context. */
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

/**
 * Get voice style.
 *  * @param day - The Day.
 *  * @param isHighStakes - The Is high stakes.
 *  * @returns The result.
 */
function getVoiceStyle(day: number, isHighStakes: boolean): VoiceStyle {
  if (day >= 13 || isHighStakes) return "dramatic";
  if (day <= 5) return "understated";
  return "formal";
}



// Deterministic estimate only (caller can override)
/**
 * Estimate kensho.
 *  * @param east - The East.
 *  * @param west - The West.
 *  * @param day - The Day.
 *  * @param rng - The Rng.
 *  * @returns The result.
 */
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
  const sponsorName = hasKensho ? pick(KENSHO_SPONSORS, () => rng.next()) : null;

  return { hasKensho, count: hasKensho ? baseCount : 0, sponsorName };
}

// === STEP 1: VENUE & DAY FRAMING ===
/**
 * Generate venue framing.
 *  * @param ctx - The Ctx.
 *  * @returns The result.
 */
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
/**
 * Generate rank context.
 *  * @param ctx - The Ctx.
 *  * @returns The result.
 */
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
/**
 * Generate ring entrance.
 *  * @param ctx - The Ctx.
 *  * @returns The result.
 */
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
/**
 * Generate ritual elements.
 *  * @param ctx - The Ctx.
 *  * @returns The result.
 */
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
    lines.push(pick(saltPhrases, () => rng.next()));

    const westSaltPhrases =
      voiceStyle === "dramatic"
        ? [
            `${west.shikona} follows, stamping the clay, eyes fixed ahead.`,
            `${west.shikona} answers with his own throw—deliberate, focused.`,
            `${west.shikona} rises, throws, and settles. The ritual unfolds.`
          ]
        : [`${west.shikona} follows suit.`, `${west.shikona} takes his turn.`];
    lines.push(pick(westSaltPhrases, () => rng.next()));
  }

  if (voiceStyle === "dramatic" && isHighStakes && rng.next() < 0.4) {
    lines.push(
      pick([
        "The tension is palpable. The crowd's low murmur drops to silence.",
        "Both men lock eyes. The psychological war has already begun.",
        "A heavy silence settles over the dohyo. The air feels thick.",
        "They exchange a final glare. No retreat in either man.",
        "The intensity radiating from the clay is unmistakable.",
        "A collective holding of breath sweeps through the hall.",
        "They wipe their faces, each lost in fierce concentration.",
        "Neither rikishi looks away. A battle of wills before the clash.",
        "The quiet in the arena is heavier than the men themselves.",
        "Anticipation crackles. The stage is set for a historic collision."
      ], () => rng.next())
    );
  }

  if (voiceStyle === "dramatic" && rng.next() < 0.3) {
    lines.push(
      pick([
        `${east.shikona} slaps his thighs, a sharp crack echoing in the hall.`,
        `${west.shikona} stretches deep, testing the grip on the clay.`,
        `${east.shikona} adjusts his mawashi, settling his massive frame.`,
        `${west.shikona} breathes deeply, centering himself for the violence to come.`,
        "A sharp exhale, a final flex of muscle. They are ready.",
        "They crouch low, knuckles hovering just above the sand.",
        "The ritual is complete. Only the clash remains.",
        "A sudden stomp against the clay from one side, answered by the other.",
        "They reset, finding the exact balance point at the shikiri-sen.",
        "The gyoji raises the gunbai. The final moments of peace."
      ], () => rng.next())
    );
  }

  return lines;
}

// === KENSHO BANNER PRE-BOUT ===
/**
 * Generate kensho banners.
 *  * @param ctx - The Ctx.
 *  * @returns The result.
 */
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
/**
 * Generate shikiri tension.
 *  * @param ctx - The Ctx.
 *  * @returns The result.
 */
function generateShikiriTension(ctx: NarrativeContext): string[] {
  const { voiceStyle, rng } = ctx;

  if (voiceStyle === "dramatic") {
    const shikiriPhrases = [
      "They crouch at the shikiri-sen. The crowd holds its breath.",
      "They crouch at the shikiri-sen… no hesitation.",
      "Down to the line. Eyes locked. Waiting.",
      "At the shikiri-sen now. Fingers to the clay. Silence falls."
    ];
    const lines = [pick(shikiriPhrases, () => rng.next())];
    if (rng.next() < 0.4) lines.push("Neither blinks.");
    return lines;
  }

  if (voiceStyle === "formal") return ["They settle at the line."];
  return ["Ready positions."];
}

// === STEP 5: TACHIAI IMPACT ===
/**
 * Generate tachiai.
 *  * @param ctx - The Ctx.
 *  * @param entry - The Entry.
 *  * @returns The result.
 */
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
        pick([
          `A devastating charge from ${winnerName}! He connects with terrifying force!`,
          `${winnerName} explodes off the mark! A perfect, punishing tachi-ai!`,
          `Tremendous impact! ${winnerName} dictates the terms immediately!`,
          `Like a freight train! ${winnerName} bowls into his opponent!`,
          `A brutal collision! ${winnerName} gets underneath and drives forward!`,
          `${winnerName} fires off the line with blinding speed!`,
          `A sickening thud echoes as ${winnerName} crashes into ${loserName}!`,
          `${winnerName} catches him high! The initial charge is overwhelming!`,
          `No hesitation! ${winnerName} launches a ferocious opening assault!`,
          `${winnerName} takes complete control at the line! The power is absolute!`
        ], () => rng.next())
      );
      lines.push(
        pick([
          `${loserName} is knocked back on his heels!`,
          `${loserName} is instantly forced onto the defensive!`,
          `He rocks ${loserName} backward! A desperate scramble to recover!`,
          `${loserName} absorbs the blow but gives up critical ground!`,
          `The shock of the impact leaves ${loserName} reeling!`,
          `${loserName} struggles to find his footing after that hit!`,
          `A massive disadvantage for ${loserName} right from the start!`,
          `He bends ${loserName} backward, searching for an immediate finish!`,
          `${loserName} is staggered! The pressure is relentless!`,
          `It's all ${loserName} can do to stay upright!`
        ], () => rng.next())
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
/**
 * Generate clinch.
 *  * @param ctx - The Ctx.
 *  * @param entry - The Entry.
 *  * @returns The result.
 */
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
          pick([
            "They lock up! A brutal test of pure strength on the belt!",
            "Deep grips established! It's a grinding battle of attrition now!",
            "They freeze in a massive embrace—four hands locked on the mawashi!",
            "A heavy yotsu-zumo battle begins! Neither giving an inch!",
            "They settle into a punishing stalemate on the belt!",
            "Morozashi! A devastating double-inside grip is threatened!",
            "They jockey for the superior angle, chests heaving!",
            "A test of immense root strength! They are immovable objects!",
            "Grips are secured! The center of gravity drops dangerously low!",
            "They bind together like ancient oaks. A profound struggle for leverage!"
          ], () => rng.next())
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
/**
 * Generate momentum.
 *  * @param ctx - The Ctx.
 *  * @param entry - The Entry.
 *  * @returns The result.
 */
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
        pick([
          `Incredible balance! ${trailingName} dances on the straw to stay alive!`,
          `A desperate parry from ${trailingName}! He survives the onslaught!`,
          `${trailingName} bends backward over the bales but refuses to fall!`,
          `He escapes! ${trailingName} slips the grip and resets the center!`,
          `Miraculous footwork! ${trailingName} skirts the edge of disaster!`,
          `${trailingName} digs deep, lowering his hips to halt the momentum!`,
          `He absorbs the thrust and fires back! ${trailingName} will not break!`,
          `A heroic defensive stand from ${trailingName}!`,
          `${trailingName} shifts his weight at the last possible millisecond!`,
          `He survives by a hair's breadth! ${trailingName} is still in this!`
        ], () => rng.next())
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
        pick([
          `${likelyLeader} applies relentless forward pressure!`,
          `${likelyLeader} unleashes a vicious flurry of tsuppari!`,
          `A brutal nodowa! ${likelyLeader} drives a hand into the throat!`,
          `${likelyLeader} seizes the momentum, forcing his man back!`,
          `The attack continues! ${likelyLeader} leaves no room to breathe!`,
          `${likelyLeader} shifts gears, overwhelming the defense!`,
          `He has him moving backward! ${likelyLeader} smells blood!`,
          `${likelyLeader} methodically breaks down his opponent's posture!`,
          `A powerful push! ${likelyLeader} is dominating the center!`,
          `${likelyLeader} tightens the grip and cranks the pressure high!`
        ], () => rng.next())
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
/**
 * Generate turning point.
 *  * @param ctx - The Ctx.
 *  * @returns The result.
 */
function generateTurningPoint(ctx: NarrativeContext): string[] {
  const { voiceStyle, east, west, result, rng } = ctx;
  const lines: string[] = [];

  if (voiceStyle === "dramatic") {
    const winnerName = result.winner === "east" ? east.shikona : west.shikona;
    const loserName = result.winner === "east" ? west.shikona : east.shikona;

    lines.push(
      pick([
        `${winnerName} sees the opening! He commits everything!`,
        `A sudden drop of the hips from ${winnerName}! The trap is sprung!`,
        `${loserName} overextends! ${winnerName} capitalizes instantly!`,
        `${winnerName} secures the devastating grip he's been searching for!`,
        `He breaks ${loserName}'s balance completely! It's all over!`,
        `${winnerName} summons a final, explosive burst of power!`,
        `A fatal mistake by ${loserName}! ${winnerName} moves in for the kill!`,
        `${winnerName} wrenches the belt with terrifying torque!`,
        `He has him on the absolute brink! ${winnerName} applies the finisher!`,
        `The resistance shatters! ${winnerName} executes the final sequence!`
      ], () => rng.next())
    );
  } else if (voiceStyle === "formal") {
    lines.push("The decisive moment arrives.");
  }

  return lines;
}

// === STEP 9-10: GYOJI RULING & KIMARITE EMPHASIS ===
/**
 * Generate finish.
 *  * @param ctx - The Ctx.
 *  * @param entry - The Entry.
 *  * @returns The result.
 */
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
/**
 * Generate kensho ceremony.
 *  * @param ctx - The Ctx.
 *  * @returns The result.
 */
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
/**
 * Generate closing.
 *  * @param ctx - The Ctx.
 *  * @returns The result.
 */
function generateClosing(ctx: NarrativeContext): string[] {
  const { voiceStyle, east, west, result, venueShortName, day, rng } = ctx;
  const lines: string[] = [];

  const winner = result.winner === "east" ? east : west;
  const loser = result.winner === "east" ? west : east;

  if (voiceStyle === "dramatic") {
    lines.push(
      pick([
        `${winner.shikona} stands tall, chest heaving, as the reality of the victory settles.`,
        `A nod of respect. ${winner.shikona} returns to his side of the dohyo.`,
        `${loser.shikona} brushes the clay from his shoulders, defeated but unbowed.`,
        `The hall buzzes with the electricity of that brutal encounter.`,
        `${winner.shikona} accepts the win with stoic grace. A true warrior.`,
        `An unforgettable finish! ${winner.shikona} cements his legacy today!`,
        `${loser.shikona} stares at the sand, dissecting the failure in silence.`,
        `The gyoji's voice rings out over the din of the ecstatic crowd.`,
        `${winner.shikona} breathes out a cloud of exertion. The battle is won.`,
        `A stunning display of sumo! The audience is left buzzing in its wake.`
      ], () => rng.next())
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
/**
 * Generate narrative.
 *  * @param east - The East.
 *  * @param west - The West.
 *  * @param result - The Result.
 *  * @param bashoName - The Basho name.
 *  * @param day - The Day.
 *  * @param opts - The Opts.
 *  * @returns The result.
 */
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

  const log = Array.isArray(result.log) ? (result.log as BoutLogEntry[]) : [];
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