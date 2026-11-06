/**
 * publicInjury.ts — Public Injury & Availability projection
 * =========================================================
 * The always-public injury surface for compare views (constitution §42.3.6).
 *
 * Public at every disclosure tier: injury PRESENCE (injured / kyūjō), the
 * remaining duration, kyūjō filings, and the public career record (basho
 * results incl. days missed).
 *
 * Disclosure-tiered: diagnosis specificity follows the existing rikishi
 * scouting level — confirmed (exact type + area + severity), reported
 * (body area only), undisclosed (presence only). A filed medicalCertificate
 * is an official public document and is shown at any tier.
 *
 * Never public: hidden proneness/durability internals — the durability
 * descriptor is derived only from the public careerHistory record.
 */

import type { Rikishi } from "@/engine/types/rikishi";
import type { WorldState } from "@/engine/types/world";
import { getTotalBashodays } from "@/engine/calendar/scheduleHelpers";
import {
  BODY_AREA_LABELS,
  INJURY_TYPE_LABELS,
  type InjurySeverity,
} from "@/engine/health/BodyDefinitions";
import { getScoutingLevel } from "@/engine/recruitment/scoutingStore";
import { SeededRNG } from "@/engine/core/rng";
import { BardEngine } from "@/engine/bard/BardEngine";

export type PublicAvailabilityStatus =
  "healthy" | "injured" | "kyujo" | "returning" | "retired" | "no_record";

export type DiagnosisTier = "confirmed" | "reported" | "undisclosed" | "none";

export type DurabilityBand = "durable" | "frequent_absence" | "no_pattern";

export interface PublicInjuryAvailability {
  status: PublicAvailabilityStatus;
  statusLabel: string;
  /** Diagnosis/episode text honoring the disclosure tier; undefined when healthy. */
  episodeLabel?: string;
  /** Public: remaining weeks on the current injury/kyūjō episode. */
  weeksRemaining?: number;
  /** Days missed across retained careerHistory rows; undefined with no record. */
  missedDaysRecent?: number;
  /** Number of recorded basho the history fields cover. */
  recordedBasho: number;
  /** Recorded basho missed entirely (0 bouts contested). */
  bashosMissedEntirely: number;
  /** "N days missed" label — undefined with no recorded history. */
  missedDaysLabel?: string;
  /** "across N recorded basho" label — undefined with no recorded history. */
  recordedBashoLabel?: string;
  /** Public-record-derived durability descriptor — never a raw stat. */
  durability: DurabilityBand;
  durabilityLabel: string;
  diagnosisTier: DiagnosisTier;
}

/** Scouting level (0-100) thresholds for diagnosis specificity. */
const CONFIRMED_SCOUT_LEVEL = 70;
const REPORTED_SCOUT_LEVEL = 20;

/** Durability bands: ≥45 missed days or ≥1 fully-missed basho → frequent. */
const FREQUENT_ABSENCE_MISSED_DAYS = 45;
/** "Durable" needs a meaningful clean record, not one good basho. */
const DURABLE_MIN_RECORDED_BASHO = 3;

const SEVERITY_LABELS: Record<Exclude<InjurySeverity, "none">, string> = {
  minor: "Minor",
  moderate: "Moderate",
  serious: "Serious",
};

const AVAIL = "ui.labels.injury.availability";

function label(rng: SeededRNG, path: string, ctx?: Record<string, string>): string {
  return BardEngine.resolve(rng, path, ctx).text;
}

type InjuryStatusLike = NonNullable<Rikishi["injuryStatus"]>;

function isRikishiInjured(r: Rikishi): boolean {
  // `r.injury` is the legacy alias projections read as injured.
  return !!r.injured || !!r.injury;
}

/** Exact diagnosis for confirmed access; area-only for reported; vague otherwise. */
function injuryEpisodeLabel(r: Rikishi, tier: DiagnosisTier, rng: SeededRNG): string {
  const status: InjuryStatusLike | undefined = r.injuryStatus ?? r.injury;
  if (!status) return label(rng, `${AVAIL}.undisclosed`);

  if (tier === "confirmed") {
    const severity = status.severity !== "none" ? SEVERITY_LABELS[status.severity] : undefined;
    const area = status.location
      ? (BODY_AREA_LABELS[status.location] ?? status.location)
      : undefined;
    const type =
      status.type && status.type !== "none"
        ? (INJURY_TYPE_LABELS[status.type] ?? label(rng, `${AVAIL}.generic`))
        : label(rng, `${AVAIL}.generic`);
    return [severity, area, type].filter(Boolean).join(" ");
  }

  if (tier === "reported") {
    const area = status.location
      ? (BODY_AREA_LABELS[status.location] ?? status.location)
      : undefined;
    return area
      ? label(rng, `${AVAIL}.reported_format`, { AREA: area })
      : label(rng, `${AVAIL}.generic`);
  }

  return label(rng, `${AVAIL}.undisclosed`);
}

function resolveDiagnosisTier(r: Rikishi, world: WorldState): DiagnosisTier {
  const level = getScoutingLevel(world, r.id);
  if (level >= CONFIRMED_SCOUT_LEVEL) return "confirmed";
  if (level >= REPORTED_SCOUT_LEVEL) return "reported";
  return "undisclosed";
}

export function projectPublicInjuryAvailability(
  rikishi: Rikishi | undefined,
  world: WorldState | null | undefined
): PublicInjuryAvailability {
  // Deterministic per-call rng — the label templates are single-option, so
  // resolution is stable; fresh each call avoids shared-counter coupling.
  const rng = new SeededRNG("public-injury-availability");

  if (!rikishi || !world) {
    return {
      status: "no_record",
      statusLabel: label(rng, `${AVAIL}.status.no_record`),
      recordedBasho: 0,
      bashosMissedEntirely: 0,
      durability: "no_pattern",
      durabilityLabel: label(rng, `${AVAIL}.durability.no_record`),
      diagnosisTier: "none",
    };
  }

  const diagnosisTier = resolveDiagnosisTier(rikishi, world);
  const injured = isRikishiInjured(rikishi);

  // Public record: missed days derived arithmetically per recorded basho —
  // scheduled days not contested (fusenshō + unscheduled withdrawal tail).
  const history = rikishi.careerHistory ?? [];
  const recordedBasho = history.length;
  let missedDaysRecent: number | undefined;
  let bashosMissedEntirely = 0;
  if (recordedBasho > 0) {
    missedDaysRecent = 0;
    for (const row of history) {
      const days = getTotalBashodays(row.division);
      const missed = Math.max(0, days - (row.wins ?? 0) - (row.losses ?? 0));
      missedDaysRecent += missed;
      if (missed >= days) bashosMissedEntirely++;
    }
  }

  const durability: DurabilityBand =
    bashosMissedEntirely >= 1 || (missedDaysRecent ?? 0) >= FREQUENT_ABSENCE_MISSED_DAYS
      ? "frequent_absence"
      : recordedBasho >= DURABLE_MIN_RECORDED_BASHO && missedDaysRecent === 0
        ? "durable"
        : "no_pattern";

  let status: PublicAvailabilityStatus;
  if (rikishi.isRetired) status = "retired";
  else if (rikishi.isKyujo) status = "kyujo";
  else if (injured) status = "injured";
  else if (rikishi.recentlyReturnedFromInjury) status = "returning";
  else status = "healthy";

  let episodeLabel: string | undefined;
  if (rikishi.isKyujo) {
    if (rikishi.kyujoReason === "injury" || injured) {
      // A filed medical certificate is the official public diagnosis.
      episodeLabel =
        rikishi.medicalCertificate?.injury ?? injuryEpisodeLabel(rikishi, diagnosisTier, rng);
    } else {
      episodeLabel = label(rng, `${AVAIL}.kyujo_reason_format`, {
        REASON: rikishi.kyujoReason ?? "personal",
      });
    }
  } else if (injured) {
    episodeLabel = injuryEpisodeLabel(rikishi, diagnosisTier, rng);
  }

  const rawWeeks =
    rikishi.injuryWeeksRemaining ??
    rikishi.injuryStatus?.weeksRemaining ??
    rikishi.injury?.weeksRemaining;
  const weeksRemaining = injured || rikishi.isKyujo ? (rawWeeks ?? 0) || undefined : undefined;

  return {
    status,
    statusLabel: label(rng, `${AVAIL}.status.${status}`),
    episodeLabel,
    weeksRemaining,
    missedDaysRecent,
    recordedBasho,
    bashosMissedEntirely,
    missedDaysLabel:
      missedDaysRecent !== undefined
        ? label(rng, `${AVAIL}.missed_days_format`, { DAYS: String(missedDaysRecent) })
        : undefined,
    recordedBashoLabel:
      recordedBasho > 0
        ? label(rng, `${AVAIL}.recorded_basho_format`, { N: String(recordedBasho) })
        : undefined,
    durability,
    durabilityLabel: label(rng, `${AVAIL}.durability.${durability}`),
    diagnosisTier,
  };
}
