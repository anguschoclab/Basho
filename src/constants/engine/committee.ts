// committee.ts
// =======================================================
// Shared constants for every JSA-style committee in the game:
// banzuke composition, sansho selection, the Yokozuna
// Deliberation Council, and the board election.
//
// All committees share one shape (see engine/committee/committee.ts):
// seeded members deliberate over cases whose mechanical baseline is
// adjusted by informal evidence (merits/demerits) inside a bounded
// discretion cap. Tweak committee feel here; never in call sites.
// =======================================================

export interface CommitteeSpec {
  /** Stable identifier, also used as the RNG namespace label. */
  readonly id: string;
  /** Number of seated members; determines vote totals. */
  readonly size: number;
  /** Max |score − baseScore| the committee may apply to any one case. */
  readonly discretionCap: number;
  /** Score units contributed by each point of merit/demerit evidence. */
  readonly meritWeight: number;
  /** Score units a same-faction member bloc can contribute (bounded by cap). */
  readonly factionWeight: number;
}

/**
 * Banzuke composition committee (番付編成会議).
 * Real: ~23 oyakata-rank members meet after senshuraku; movement ≈
 * (wins − losses)/2 rank slots, kyujo ≈ losses, achievements informal.
 */
export const BANZUKE_COMMITTEE: CommitteeSpec = {
  id: "banzuke",
  size: 23,
  discretionCap: 2,
  meritWeight: 1,
  factionWeight: 1,
};

/** Sansho selection committee (三賞選考委員会) — the real 5-member panel. */
export const SANSHO_COMMITTEE: CommitteeSpec = {
  id: "sansho",
  size: 5,
  discretionCap: 1,
  meritWeight: 1,
  factionWeight: 0,
};

/**
 * Yokozuna Deliberation Council (横綱審議委員会).
 * Membership is fixed in YokozunaService; this spec governs how much
 * informal evidence may bend a deliberation record.
 */
export const YDC_COMMITTEE: CommitteeSpec = {
  id: "ydc",
  size: 10,
  discretionCap: 1,
  meritWeight: 1,
  factionWeight: 0,
};

/**
 * Board of directors election (理事選) — biennial, week 10.
 * Real board: 10 riji (plus ~3-4 auditors, unmodeled — cosmetic).
 */
export const BOARD_COMMITTEE: CommitteeSpec = {
  id: "board",
  size: 10,
  discretionCap: 0,
  meritWeight: 0,
  factionWeight: 0,
};

/**
 * §3 Rikishi-kai / Rikishi-ken (力士会, Sekitori Wrestlers' Association).
 * Chaired by the Kaichō (top Yokozuna / senior sekitori) with Makuuchi
 * and Juryo delegates (7-seat executive panel).
 */
export const RIKISHI_COUNCIL_COMMITTEE: CommitteeSpec = {
  id: "rikishi_council",
  size: 7,
  discretionCap: 1,
  meritWeight: 1,
  factionWeight: 1,
};

export const ALL_COMMITTEES: readonly CommitteeSpec[] = [
  BANZUKE_COMMITTEE,
  SANSHO_COMMITTEE,
  YDC_COMMITTEE,
  BOARD_COMMITTEE,
  RIKISHI_COUNCIL_COMMITTEE,
];
