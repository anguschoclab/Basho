/**
 * src/engine/events/chains/chainRegistry.ts
 * =========================================
 * The 15 launch event-chain families. All text is bard path data
 * (`chains.<family>.<stage>_{title|summary|opt_*}`); all effects are
 * serializable descriptors — never closures — so resolution can re-derive
 * the option purely from ids.
 */

import type { EventChainDef, ChainGuard } from "@/engine/events/chains/types";
import type { WorldState } from "@/engine/types/world";
import { isSekitoriDivision } from "@/constants/engine/rankDisplay";

// ── Shared guards ────────────────────────────────────────────────────────────

const rosterOf = (world: WorldState, heyaId: string) =>
  [...world.activeRikishiIds]
    .map((id) => world.rikishi.get(id))
    .filter((r) => !!r && r.heyaId === heyaId && !r.isRetired);

const hasRoster =
  (min: number): ChainGuard =>
  (world, heya) =>
    rosterOf(world, heya.id).length >= min;

const hasSekitori: ChainGuard = (world, heya) =>
  rosterOf(world, heya.id).some((r) => r && isSekitoriDivision(r.division));

const hasVeteran: ChainGuard = (world, heya) =>
  rosterOf(world, heya.id).some((r) => (r?.age ?? 0) >= 30);

const hasStaff: ChainGuard = (_world, heya) => (heya.staffIds ?? []).length > 0;

const always: ChainGuard = () => true;

// ── Registry ─────────────────────────────────────────────────────────────────

// refactor-budget-waiver: 15 authored narrative families (~60 stages) — this
// is authored event content (data), not executable code; splitting it would
// scatter the content authors edit together.
export const EVENT_CHAIN_REGISTRY: EventChainDef[] = [
  {
    id: "bullying",
    scope: "rikishi",
    cooldownWeeks: 24,
    trigger: { weight: 8, needsRikishi: true, guard: hasRoster(4) },
    stages: [
      {
        id: "whispers",
        titlePath: "chains.bullying.s0_title",
        summaryPath: "chains.bullying.s0_summary",
        options: [
          {
            id: "intervene",
            labelPath: "chains.bullying.s0_opt_intervene",
            nextStage: { stageId: "confrontation", delayWeeks: 1 },
            effects: { morale: 3, welfareRisk: -4 },
          },
          {
            id: "observe",
            labelPath: "chains.bullying.s0_opt_observe",
            nextStage: { stageId: "escalation", delayWeeks: 2 },
          },
          {
            id: "dismiss",
            labelPath: "chains.bullying.s0_opt_dismiss",
            nextStage: { stageId: "blowup", delayWeeks: 3 },
            effects: { welfareRisk: 6 },
          },
        ],
      },
      {
        id: "confrontation",
        titlePath: "chains.bullying.s1_title",
        summaryPath: "chains.bullying.s1_summary",
        options: [
          {
            id: "discipline",
            labelPath: "chains.bullying.s1_opt_discipline",
            nextStage: { stageId: "aftermath_quiet", delayWeeks: 1 },
            effects: { morale: 4, reputation: 2, welfareRisk: -6 },
          },
          {
            id: "mediate",
            labelPath: "chains.bullying.s1_opt_mediate",
            nextStage: { stageId: "aftermath_quiet", delayWeeks: 2 },
            effects: { morale: 2, welfareRisk: -3 },
          },
        ],
      },
      {
        id: "escalation",
        titlePath: "chains.bullying.s2_title",
        summaryPath: "chains.bullying.s2_summary",
        options: [
          {
            id: "crack_down",
            labelPath: "chains.bullying.s2_opt_crackdown",
            nextStage: { stageId: "aftermath_quiet", delayWeeks: 1 },
            effects: { morale: 2, welfareRisk: -8, scandalScore: -2 },
          },
          {
            id: "keep_watching",
            labelPath: "chains.bullying.s2_opt_watch",
            nextStage: { stageId: "blowup", delayWeeks: 2 },
            effects: { welfareRisk: 5 },
          },
        ],
      },
      {
        id: "blowup",
        titlePath: "chains.bullying.s3_title",
        summaryPath: "chains.bullying.s3_summary",
        options: [
          {
            id: "public_apology",
            labelPath: "chains.bullying.s3_opt_apology",
            feeYen: 200_000,
            effects: { scandalScore: -8, reputation: -2, morale: 2, heyaPressure: -6 },
          },
          {
            id: "stonewall",
            labelPath: "chains.bullying.s3_opt_stonewall",
            effects: { scandalScore: 10, reputation: -5, morale: -4, heyaPressure: 8 },
          },
        ],
      },
      {
        id: "aftermath_quiet",
        titlePath: "chains.bullying.s4_title",
        summaryPath: "chains.bullying.s4_summary",
        options: [
          {
            id: "rebuild",
            labelPath: "chains.bullying.s4_opt_rebuild",
            effects: { morale: 3, welfareRisk: -3 },
          },
        ],
      },
    ],
  },

  {
    id: "doping_rumor",
    scope: "rikishi",
    cooldownWeeks: 40,
    trigger: { weight: 5, needsRikishi: true, guard: hasSekitori },
    stages: [
      {
        id: "whisper",
        titlePath: "chains.doping_rumor.s0_title",
        summaryPath: "chains.doping_rumor.s0_summary",
        options: [
          {
            id: "investigate",
            labelPath: "chains.doping_rumor.s0_opt_investigate",
            feeYen: 150_000,
            nextStage: { stageId: "findings", delayWeeks: 2 },
          },
          {
            id: "ignore",
            labelPath: "chains.doping_rumor.s0_opt_ignore",
            nextStage: { stageId: "press_leak", delayWeeks: 3 },
          },
        ],
      },
      {
        id: "findings",
        titlePath: "chains.doping_rumor.s1_title",
        summaryPath: "chains.doping_rumor.s1_summary",
        options: [
          {
            id: "report_clean",
            labelPath: "chains.doping_rumor.s1_opt_report",
            nextStage: { stageId: "cleared", delayWeeks: 1 },
            effects: { reputation: 3, politicalCapital: 3 },
          },
          {
            id: "bury_report",
            labelPath: "chains.doping_rumor.s1_opt_bury",
            nextStage: { stageId: "press_leak", delayWeeks: 3 },
            effects: { scandalScore: 6 },
          },
        ],
      },
      {
        id: "press_leak",
        titlePath: "chains.doping_rumor.s2_title",
        summaryPath: "chains.doping_rumor.s2_summary",
        options: [
          {
            id: "transparent_review",
            labelPath: "chains.doping_rumor.s2_opt_review",
            feeYen: 300_000,
            nextStage: { stageId: "cleared", delayWeeks: 1 },
            effects: { scandalScore: -5, heyaPressure: -6, reputation: 2 },
          },
          {
            id: "deny_everything",
            labelPath: "chains.doping_rumor.s2_opt_deny",
            nextStage: { stageId: "association_probe", delayWeeks: 2 },
            effects: { heyaPressure: 8, scandalScore: 5 },
          },
        ],
      },
      {
        id: "association_probe",
        titlePath: "chains.doping_rumor.s3_title",
        summaryPath: "chains.doping_rumor.s3_summary",
        options: [
          {
            id: "comply",
            labelPath: "chains.doping_rumor.s3_opt_comply",
            nextStage: { stageId: "cleared", delayWeeks: 1 },
            effects: { reputation: 1, scandalScore: -3, politicalCapital: -4 },
          },
          {
            id: "obstruct",
            labelPath: "chains.doping_rumor.s3_opt_obstruct",
            effects: { scandalScore: 12, reputation: -6, politicalCapital: -8 },
          },
        ],
      },
      {
        id: "cleared",
        titlePath: "chains.doping_rumor.s4_title",
        summaryPath: "chains.doping_rumor.s4_summary",
        options: [
          {
            id: "move_on",
            labelPath: "chains.doping_rumor.s4_opt_moveon",
            effects: { morale: 2, reputation: 2 },
          },
        ],
      },
    ],
  },

  {
    id: "sponsor_courtship",
    scope: "player_heya",
    cooldownWeeks: 20,
    trigger: { weight: 10, guard: always },
    stages: [
      {
        id: "introduction",
        titlePath: "chains.sponsor_courtship.s0_title",
        summaryPath: "chains.sponsor_courtship.s0_summary",
        options: [
          {
            id: "wine_dine",
            labelPath: "chains.sponsor_courtship.s0_opt_dine",
            feeYen: 120_000,
            nextStage: { stageId: "proposal", delayWeeks: 1 },
            effects: { reputation: 2 },
          },
          {
            id: "polite_decline",
            labelPath: "chains.sponsor_courtship.s0_opt_decline",
          },
        ],
      },
      {
        id: "proposal",
        titlePath: "chains.sponsor_courtship.s1_title",
        summaryPath: "chains.sponsor_courtship.s1_summary",
        options: [
          {
            id: "accept_terms",
            labelPath: "chains.sponsor_courtship.s1_opt_accept",
            nextStage: { stageId: "windfall", delayWeeks: 1 },
            effects: { funds: 1_500_000, reputation: 1 },
          },
          {
            id: "negotiate_harder",
            labelPath: "chains.sponsor_courtship.s1_opt_negotiate",
            nextStage: { stageId: "hard_bargain", delayWeeks: 2 },
          },
        ],
      },
      {
        id: "hard_bargain",
        titlePath: "chains.sponsor_courtship.s2_title",
        summaryPath: "chains.sponsor_courtship.s2_summary",
        options: [
          {
            id: "walk_away",
            labelPath: "chains.sponsor_courtship.s2_opt_walk",
            effects: { reputation: 2 },
          },
          {
            id: "take_less",
            labelPath: "chains.sponsor_courtship.s2_opt_take",
            nextStage: { stageId: "windfall", delayWeeks: 1 },
            effects: { funds: 900_000 },
          },
        ],
      },
      {
        id: "windfall",
        titlePath: "chains.sponsor_courtship.s3_title",
        summaryPath: "chains.sponsor_courtship.s3_summary",
        options: [
          {
            id: "celebrate",
            labelPath: "chains.sponsor_courtship.s3_opt_celebrate",
            effects: { morale: 3, reputation: 2 },
          },
        ],
      },
    ],
  },

  {
    id: "academy_scandal",
    scope: "player_heya",
    cooldownWeeks: 36,
    trigger: { weight: 6, guard: always },
    stages: [
      {
        id: "complaint",
        titlePath: "chains.academy_scandal.s0_title",
        summaryPath: "chains.academy_scandal.s0_summary",
        options: [
          {
            id: "review_records",
            labelPath: "chains.academy_scandal.s0_opt_review",
            nextStage: { stageId: "evidence", delayWeeks: 2 },
          },
          {
            id: "brush_off",
            labelPath: "chains.academy_scandal.s0_opt_brush",
            nextStage: { stageId: "media_storm", delayWeeks: 3 },
            effects: { scandalScore: 4 },
          },
        ],
      },
      {
        id: "evidence",
        titlePath: "chains.academy_scandal.s1_title",
        summaryPath: "chains.academy_scandal.s1_summary",
        options: [
          {
            id: "dismiss_staffer",
            labelPath: "chains.academy_scandal.s1_opt_dismiss",
            nextStage: { stageId: "resolution", delayWeeks: 1 },
            effects: { reputation: 2, scandalScore: -4, funds: -80_000 },
          },
          {
            id: "cover_up",
            labelPath: "chains.academy_scandal.s1_opt_cover",
            nextStage: { stageId: "media_storm", delayWeeks: 2 },
            effects: { scandalScore: 8 },
          },
        ],
      },
      {
        id: "media_storm",
        titlePath: "chains.academy_scandal.s2_title",
        summaryPath: "chains.academy_scandal.s2_summary",
        options: [
          {
            id: "press_conference",
            labelPath: "chains.academy_scandal.s2_opt_press",
            nextStage: { stageId: "resolution", delayWeeks: 1 },
            effects: { heyaPressure: -6, scandalScore: -3, reputation: 1 },
          },
          {
            id: "silence",
            labelPath: "chains.academy_scandal.s2_opt_silence",
            effects: { heyaPressure: 10, scandalScore: 6, reputation: -4 },
          },
        ],
      },
      {
        id: "resolution",
        titlePath: "chains.academy_scandal.s3_title",
        summaryPath: "chains.academy_scandal.s3_summary",
        options: [
          {
            id: "reform",
            labelPath: "chains.academy_scandal.s3_opt_reform",
            feeYen: 200_000,
            effects: { reputation: 4, welfareRisk: -5 },
          },
          {
            id: "status_quo",
            labelPath: "chains.academy_scandal.s3_opt_quo",
            effects: { morale: -2 },
          },
        ],
      },
    ],
  },

  {
    id: "media_persona",
    scope: "rikishi",
    cooldownWeeks: 24,
    trigger: { weight: 7, needsRikishi: true, guard: hasSekitori },
    stages: [
      {
        id: "viral_moment",
        titlePath: "chains.media_persona.s0_title",
        summaryPath: "chains.media_persona.s0_summary",
        options: [
          {
            id: "lean_in",
            labelPath: "chains.media_persona.s0_opt_lean",
            nextStage: { stageId: "spotlight", delayWeeks: 1 },
            effects: { heyaPressure: 6, reputation: 3 },
          },
          {
            id: "shield",
            labelPath: "chains.media_persona.s0_opt_shield",
            nextStage: { stageId: "quiet_life", delayWeeks: 1 },
            effects: { morale: 2, heyaPressure: -3 },
          },
        ],
      },
      {
        id: "spotlight",
        titlePath: "chains.media_persona.s1_title",
        summaryPath: "chains.media_persona.s1_summary",
        options: [
          {
            id: "tv_deal",
            labelPath: "chains.media_persona.s1_opt_tv",
            feeYen: 0,
            nextStage: { stageId: "distraction", delayWeeks: 2 },
            effects: { funds: 400_000, reputation: 3, heyaPressure: 5 },
          },
          {
            id: "focus_sumo",
            labelPath: "chains.media_persona.s1_opt_focus",
            nextStage: { stageId: "quiet_life", delayWeeks: 1 },
            effects: { morale: 3 },
          },
        ],
      },
      {
        id: "distraction",
        titlePath: "chains.media_persona.s2_title",
        summaryPath: "chains.media_persona.s2_summary",
        options: [
          {
            id: "pull_plug",
            labelPath: "chains.media_persona.s2_opt_plug",
            nextStage: { stageId: "quiet_life", delayWeeks: 1 },
            effects: { morale: 2, reputation: -1 },
          },
          {
            id: "ride_wave",
            labelPath: "chains.media_persona.s2_opt_ride",
            nextStage: { stageId: "burnout", delayWeeks: 2 },
            effects: { funds: 300_000, heyaPressure: 5 },
          },
        ],
      },
      {
        id: "burnout",
        titlePath: "chains.media_persona.s3_title",
        summaryPath: "chains.media_persona.s3_summary",
        options: [
          {
            id: "rest",
            labelPath: "chains.media_persona.s3_opt_rest",
            effects: { momentum: -5, morale: 2 },
          },
        ],
      },
      {
        id: "quiet_life",
        titlePath: "chains.media_persona.s4_title",
        summaryPath: "chains.media_persona.s4_summary",
        options: [
          {
            id: "back_to_work",
            labelPath: "chains.media_persona.s4_opt_work",
            effects: { momentum: 3 },
          },
        ],
      },
    ],
  },

  {
    id: "veteran_decline",
    scope: "rikishi",
    cooldownWeeks: 30,
    trigger: { weight: 8, needsRikishi: true, guard: hasVeteran },
    stages: [
      {
        id: "slowing",
        titlePath: "chains.veteran_decline.s0_title",
        summaryPath: "chains.veteran_decline.s0_summary",
        options: [
          {
            id: "talk",
            labelPath: "chains.veteran_decline.s0_opt_talk",
            nextStage: { stageId: "crossroads", delayWeeks: 1 },
            effects: { morale: 2 },
          },
          {
            id: "let_play",
            labelPath: "chains.veteran_decline.s0_opt_play",
            nextStage: { stageId: "hard_fall", delayWeeks: 3 },
          },
        ],
      },
      {
        id: "crossroads",
        titlePath: "chains.veteran_decline.s1_title",
        summaryPath: "chains.veteran_decline.s1_summary",
        options: [
          {
            id: "succession_path",
            labelPath: "chains.veteran_decline.s1_opt_succession",
            nextStage: { stageId: "graceful_exit", delayWeeks: 2 },
            effects: { morale: 3, reputation: 2 },
          },
          {
            id: "one_more_run",
            labelPath: "chains.veteran_decline.s1_opt_run",
            nextStage: { stageId: "hard_fall", delayWeeks: 2 },
            effects: { momentum: 4 },
          },
        ],
      },
      {
        id: "hard_fall",
        titlePath: "chains.veteran_decline.s2_title",
        summaryPath: "chains.veteran_decline.s2_summary",
        options: [
          {
            id: "retire_him",
            labelPath: "chains.veteran_decline.s2_opt_retire",
            nextStage: { stageId: "graceful_exit", delayWeeks: 1 },
            effects: { morale: 1, welfareRisk: -3 },
          },
          {
            id: "demote_grace",
            labelPath: "chains.veteran_decline.s2_opt_demote",
            effects: { morale: -3, reputation: -2 },
          },
        ],
      },
      {
        id: "graceful_exit",
        titlePath: "chains.veteran_decline.s3_title",
        summaryPath: "chains.veteran_decline.s3_summary",
        options: [
          {
            id: "honor_him",
            labelPath: "chains.veteran_decline.s3_opt_honor",
            feeYen: 150_000,
            effects: { reputation: 4, morale: 3 },
          },
          {
            id: "quiet_farewell",
            labelPath: "chains.veteran_decline.s3_opt_quiet",
            effects: { morale: 1 },
          },
        ],
      },
    ],
  },

  {
    id: "rivalry_escalation",
    scope: "rikishi",
    cooldownWeeks: 26,
    trigger: { weight: 8, needsRikishi: true, guard: hasSekitori },
    stages: [
      {
        id: "war_of_words",
        titlePath: "chains.rivalry_escalation.s0_title",
        summaryPath: "chains.rivalry_escalation.s0_summary",
        options: [
          {
            id: "stoke",
            labelPath: "chains.rivalry_escalation.s0_opt_stoke",
            nextStage: { stageId: "heated", delayWeeks: 2 },
            effects: { momentum: 4, heyaPressure: 4 },
          },
          {
            id: "cool_down",
            labelPath: "chains.rivalry_escalation.s0_opt_cool",
            nextStage: { stageId: "truce", delayWeeks: 2 },
            effects: { morale: 1 },
          },
        ],
      },
      {
        id: "heated",
        titlePath: "chains.rivalry_escalation.s1_title",
        summaryPath: "chains.rivalry_escalation.s1_summary",
        options: [
          {
            id: "let_burn",
            labelPath: "chains.rivalry_escalation.s1_opt_burn",
            nextStage: { stageId: "incident", delayWeeks: 2 },
            effects: { momentum: 3, heyaPressure: 4 },
          },
          {
            id: "intervene",
            labelPath: "chains.rivalry_escalation.s1_opt_intervene",
            nextStage: { stageId: "truce", delayWeeks: 1 },
            effects: { reputation: 2 },
          },
        ],
      },
      {
        id: "incident",
        titlePath: "chains.rivalry_escalation.s2_title",
        summaryPath: "chains.rivalry_escalation.s2_summary",
        options: [
          {
            id: "apologize",
            labelPath: "chains.rivalry_escalation.s2_opt_apologize",
            nextStage: { stageId: "truce", delayWeeks: 1 },
            effects: { reputation: 2, scandalScore: -3 },
          },
          {
            id: "defend",
            labelPath: "chains.rivalry_escalation.s2_opt_defend",
            effects: { scandalScore: 7, reputation: -3, heyaPressure: 6 },
          },
        ],
      },
      {
        id: "truce",
        titlePath: "chains.rivalry_escalation.s3_title",
        summaryPath: "chains.rivalry_escalation.s3_summary",
        options: [
          {
            id: "settle",
            labelPath: "chains.rivalry_escalation.s3_opt_settle",
            effects: { morale: 2, momentum: 2 },
          },
        ],
      },
    ],
  },

  {
    id: "koenkai_defection",
    scope: "player_heya",
    cooldownWeeks: 30,
    trigger: { weight: 6, guard: always },
    stages: [
      {
        id: "murmurs",
        titlePath: "chains.koenkai_defection.s0_title",
        summaryPath: "chains.koenkai_defection.s0_summary",
        options: [
          {
            id: "reach_out",
            labelPath: "chains.koenkai_defection.s0_opt_reach",
            feeYen: 80_000,
            nextStage: { stageId: "negotiation", delayWeeks: 1 },
          },
          {
            id: "wait",
            labelPath: "chains.koenkai_defection.s0_opt_wait",
            nextStage: { stageId: "defection", delayWeeks: 2 },
          },
        ],
      },
      {
        id: "negotiation",
        titlePath: "chains.koenkai_defection.s1_title",
        summaryPath: "chains.koenkai_defection.s1_summary",
        options: [
          {
            id: "gala_promise",
            labelPath: "chains.koenkai_defection.s1_opt_gala",
            feeYen: 250_000,
            nextStage: { stageId: "reconciliation", delayWeeks: 2 },
            effects: { reputation: 2, morale: 2 },
          },
          {
            id: "minimal_offer",
            labelPath: "chains.koenkai_defection.s1_opt_minimal",
            nextStage: { stageId: "defection", delayWeeks: 2 },
          },
        ],
      },
      {
        id: "defection",
        titlePath: "chains.koenkai_defection.s2_title",
        summaryPath: "chains.koenkai_defection.s2_summary",
        options: [
          {
            id: "win_back",
            labelPath: "chains.koenkai_defection.s2_opt_winback",
            feeYen: 400_000,
            nextStage: { stageId: "reconciliation", delayWeeks: 2 },
            effects: { reputation: 1 },
          },
          {
            id: "accept_loss",
            labelPath: "chains.koenkai_defection.s2_opt_accept",
            effects: { funds: -300_000, morale: -2, reputation: -2 },
          },
        ],
      },
      {
        id: "reconciliation",
        titlePath: "chains.koenkai_defection.s3_title",
        summaryPath: "chains.koenkai_defection.s3_summary",
        options: [
          {
            id: "renew_vows",
            labelPath: "chains.koenkai_defection.s3_opt_renew",
            effects: { funds: 500_000, morale: 2, reputation: 2 },
          },
        ],
      },
    ],
  },

  {
    id: "foreign_prospect",
    scope: "player_heya",
    cooldownWeeks: 30,
    trigger: { weight: 6, guard: always },
    stages: [
      {
        id: "rumor_abroad",
        titlePath: "chains.foreign_prospect.s0_title",
        summaryPath: "chains.foreign_prospect.s0_summary",
        options: [
          {
            id: "send_scout",
            labelPath: "chains.foreign_prospect.s0_opt_scout",
            feeYen: 200_000,
            nextStage: { stageId: "evaluation", delayWeeks: 2 },
          },
          {
            id: "pass",
            labelPath: "chains.foreign_prospect.s0_opt_pass",
          },
        ],
      },
      {
        id: "evaluation",
        titlePath: "chains.foreign_prospect.s1_title",
        summaryPath: "chains.foreign_prospect.s1_summary",
        options: [
          {
            id: "offer_deal",
            labelPath: "chains.foreign_prospect.s1_opt_offer",
            feeYen: 500_000,
            nextStage: { stageId: "visa_battle", delayWeeks: 2 },
          },
          {
            id: "walk_away",
            labelPath: "chains.foreign_prospect.s1_opt_walk",
            effects: { reputation: 1 },
          },
        ],
      },
      {
        id: "visa_battle",
        titlePath: "chains.foreign_prospect.s2_title",
        summaryPath: "chains.foreign_prospect.s2_summary",
        options: [
          {
            id: "pull_strings",
            labelPath: "chains.foreign_prospect.s2_opt_strings",
            feeYen: 300_000,
            nextStage: { stageId: "arrival", delayWeeks: 2 },
            effects: { politicalCapital: -4 },
          },
          {
            id: "let_process",
            labelPath: "chains.foreign_prospect.s2_opt_process",
            nextStage: { stageId: "rival_swoops", delayWeeks: 2 },
          },
        ],
      },
      {
        id: "rival_swoops",
        titlePath: "chains.foreign_prospect.s3_title",
        summaryPath: "chains.foreign_prospect.s3_summary",
        options: [
          {
            id: "counter_offer",
            labelPath: "chains.foreign_prospect.s3_opt_counter",
            feeYen: 400_000,
            nextStage: { stageId: "arrival", delayWeeks: 1 },
          },
          {
            id: "concede",
            labelPath: "chains.foreign_prospect.s3_opt_concede",
            effects: { morale: -2 },
          },
        ],
      },
      {
        id: "arrival",
        titlePath: "chains.foreign_prospect.s4_title",
        summaryPath: "chains.foreign_prospect.s4_summary",
        options: [
          {
            id: "welcome",
            labelPath: "chains.foreign_prospect.s4_opt_welcome",
            effects: { morale: 3, reputation: 3, heyaPressure: 4 },
          },
        ],
      },
    ],
  },

  {
    id: "succession_tension",
    scope: "player_heya",
    cooldownWeeks: 48,
    trigger: { weight: 4, guard: always },
    stages: [
      {
        id: "whisper_campaign",
        titlePath: "chains.succession_tension.s0_title",
        summaryPath: "chains.succession_tension.s0_summary",
        options: [
          {
            id: "confront",
            labelPath: "chains.succession_tension.s0_opt_confront",
            nextStage: { stageId: "factions", delayWeeks: 1 },
          },
          {
            id: "ignore",
            labelPath: "chains.succession_tension.s0_opt_ignore",
            nextStage: { stageId: "open_rebellion", delayWeeks: 3 },
            effects: { morale: -3 },
          },
        ],
      },
      {
        id: "factions",
        titlePath: "chains.succession_tension.s1_title",
        summaryPath: "chains.succession_tension.s1_summary",
        options: [
          {
            id: "name_heir",
            labelPath: "chains.succession_tension.s1_opt_heir",
            nextStage: { stageId: "stability", delayWeeks: 2 },
            effects: { morale: 2, politicalCapital: -3 },
          },
          {
            id: "stay_silent",
            labelPath: "chains.succession_tension.s1_opt_silent",
            nextStage: { stageId: "open_rebellion", delayWeeks: 2 },
            effects: { morale: -2 },
          },
        ],
      },
      {
        id: "open_rebellion",
        titlePath: "chains.succession_tension.s2_title",
        summaryPath: "chains.succession_tension.s2_summary",
        options: [
          {
            id: "crack_whip",
            labelPath: "chains.succession_tension.s2_opt_whip",
            nextStage: { stageId: "stability", delayWeeks: 1 },
            effects: { morale: -4, welfareRisk: 6, reputation: 1 },
          },
          {
            id: "appease",
            labelPath: "chains.succession_tension.s2_opt_appease",
            feeYen: 200_000,
            nextStage: { stageId: "stability", delayWeeks: 1 },
            effects: { morale: 3, politicalCapital: -2 },
          },
        ],
      },
      {
        id: "stability",
        titlePath: "chains.succession_tension.s3_title",
        summaryPath: "chains.succession_tension.s3_summary",
        options: [
          {
            id: "consolidate",
            labelPath: "chains.succession_tension.s3_opt_consolidate",
            effects: { morale: 2, politicalCapital: 3 },
          },
        ],
      },
    ],
  },

  {
    id: "injury_coverup",
    scope: "rikishi",
    cooldownWeeks: 36,
    trigger: { weight: 6, needsRikishi: true, guard: hasRoster(3) },
    stages: [
      {
        id: "hidden_limp",
        titlePath: "chains.injury_coverup.s0_title",
        summaryPath: "chains.injury_coverup.s0_summary",
        options: [
          {
            id: "order_scan",
            labelPath: "chains.injury_coverup.s0_opt_scan",
            feeYen: 100_000,
            nextStage: { stageId: "diagnosis", delayWeeks: 1 },
          },
          {
            id: "look_away",
            labelPath: "chains.injury_coverup.s0_opt_away",
            nextStage: { stageId: "collapse", delayWeeks: 3 },
            effects: { welfareRisk: 5 },
          },
        ],
      },
      {
        id: "diagnosis",
        titlePath: "chains.injury_coverup.s1_title",
        summaryPath: "chains.injury_coverup.s1_summary",
        options: [
          {
            id: "rest_him",
            labelPath: "chains.injury_coverup.s1_opt_rest",
            nextStage: { stageId: "recovery", delayWeeks: 2 },
            effects: { morale: 2, momentum: -3 },
          },
          {
            id: "tape_and_go",
            labelPath: "chains.injury_coverup.s1_opt_tape",
            nextStage: { stageId: "collapse", delayWeeks: 2 },
            effects: { momentum: 3, welfareRisk: 6 },
          },
        ],
      },
      {
        id: "collapse",
        titlePath: "chains.injury_coverup.s2_title",
        summaryPath: "chains.injury_coverup.s2_summary",
        options: [
          {
            id: "full_treatment",
            labelPath: "chains.injury_coverup.s2_opt_treat",
            feeYen: 350_000,
            nextStage: { stageId: "recovery", delayWeeks: 3 },
            effects: { welfareRisk: -5, morale: 2 },
          },
          {
            id: "spin_press",
            labelPath: "chains.injury_coverup.s2_opt_spin",
            effects: { scandalScore: 8, heyaPressure: 6, reputation: -3 },
          },
        ],
      },
      {
        id: "recovery",
        titlePath: "chains.injury_coverup.s3_title",
        summaryPath: "chains.injury_coverup.s3_summary",
        options: [
          {
            id: "patient_return",
            labelPath: "chains.injury_coverup.s3_opt_patient",
            effects: { morale: 2, welfareRisk: -3 },
          },
        ],
      },
    ],
  },

  {
    id: "elder_retirement",
    scope: "player_heya",
    cooldownWeeks: 40,
    trigger: { weight: 5, guard: hasStaff },
    stages: [
      {
        id: "farewell_hint",
        titlePath: "chains.elder_retirement.s0_title",
        summaryPath: "chains.elder_retirement.s0_summary",
        options: [
          {
            id: "persuade_stay",
            labelPath: "chains.elder_retirement.s0_opt_stay",
            nextStage: { stageId: "one_more_year", delayWeeks: 1 },
            effects: { morale: 2 },
          },
          {
            id: "plan_succession",
            labelPath: "chains.elder_retirement.s0_opt_plan",
            nextStage: { stageId: "transition", delayWeeks: 2 },
          },
        ],
      },
      {
        id: "one_more_year",
        titlePath: "chains.elder_retirement.s1_title",
        summaryPath: "chains.elder_retirement.s1_summary",
        options: [
          {
            id: "raise",
            labelPath: "chains.elder_retirement.s1_opt_raise",
            feeYen: 180_000,
            nextStage: { stageId: "renewed", delayWeeks: 1 },
          },
          {
            id: "accept_farewell",
            labelPath: "chains.elder_retirement.s1_opt_farewell",
            nextStage: { stageId: "transition", delayWeeks: 1 },
          },
        ],
      },
      {
        id: "transition",
        titlePath: "chains.elder_retirement.s2_title",
        summaryPath: "chains.elder_retirement.s2_summary",
        options: [
          {
            id: "memorial_dinner",
            labelPath: "chains.elder_retirement.s2_opt_dinner",
            feeYen: 120_000,
            effects: { reputation: 3, morale: 2 },
          },
          {
            id: "quiet_sendoff",
            labelPath: "chains.elder_retirement.s2_opt_quiet",
            effects: { morale: -1 },
          },
        ],
      },
      {
        id: "renewed",
        titlePath: "chains.elder_retirement.s3_title",
        summaryPath: "chains.elder_retirement.s3_summary",
        options: [
          {
            id: "back_to_work",
            labelPath: "chains.elder_retirement.s3_opt_work",
            effects: { morale: 3 },
          },
        ],
      },
    ],
  },

  {
    id: "noren_gift",
    scope: "player_heya",
    cooldownWeeks: 20,
    trigger: { weight: 7, guard: always },
    stages: [
      {
        id: "the_offer",
        titlePath: "chains.noren_gift.s0_title",
        summaryPath: "chains.noren_gift.s0_summary",
        options: [
          {
            id: "accept_gift",
            labelPath: "chains.noren_gift.s0_opt_accept",
            nextStage: { stageId: "unveiling", delayWeeks: 1 },
            effects: { morale: 2 },
          },
          {
            id: "decline_politely",
            labelPath: "chains.noren_gift.s0_opt_decline",
            effects: { reputation: 1 },
          },
        ],
      },
      {
        id: "unveiling",
        titlePath: "chains.noren_gift.s1_title",
        summaryPath: "chains.noren_gift.s1_summary",
        options: [
          {
            id: "ceremony",
            labelPath: "chains.noren_gift.s1_opt_ceremony",
            feeYen: 60_000,
            nextStage: { stageId: "legacy", delayWeeks: 1 },
            effects: { reputation: 3, morale: 2 },
          },
          {
            id: "hang_quietly",
            labelPath: "chains.noren_gift.s1_opt_quiet",
            nextStage: { stageId: "legacy", delayWeeks: 1 },
          },
        ],
      },
      {
        id: "legacy",
        titlePath: "chains.noren_gift.s2_title",
        summaryPath: "chains.noren_gift.s2_summary",
        options: [
          {
            id: "carry_on",
            labelPath: "chains.noren_gift.s2_opt_carry",
            effects: { morale: 3, reputation: 1 },
          },
        ],
      },
    ],
  },

  {
    id: "tsukebito_abuse",
    scope: "rikishi",
    cooldownWeeks: 30,
    trigger: { weight: 7, needsRikishi: true, guard: hasRoster(5) },
    stages: [
      {
        id: "complaints",
        titlePath: "chains.tsukebito_abuse.s0_title",
        summaryPath: "chains.tsukebito_abuse.s0_summary",
        options: [
          {
            id: "interview_juniors",
            labelPath: "chains.tsukebito_abuse.s0_opt_interview",
            nextStage: { stageId: "truth", delayWeeks: 1 },
          },
          {
            id: "side_with_senior",
            labelPath: "chains.tsukebito_abuse.s0_opt_side",
            nextStage: { stageId: "expose", delayWeeks: 3 },
            effects: { morale: -4, welfareRisk: 5 },
          },
        ],
      },
      {
        id: "truth",
        titlePath: "chains.tsukebito_abuse.s1_title",
        summaryPath: "chains.tsukebito_abuse.s1_summary",
        options: [
          {
            id: "reassign",
            labelPath: "chains.tsukebito_abuse.s1_opt_reassign",
            nextStage: { stageId: "calm", delayWeeks: 1 },
            effects: { morale: 3, welfareRisk: -4 },
          },
          {
            id: "warn_only",
            labelPath: "chains.tsukebito_abuse.s1_opt_warn",
            nextStage: { stageId: "expose", delayWeeks: 2 },
            effects: { welfareRisk: 3 },
          },
        ],
      },
      {
        id: "expose",
        titlePath: "chains.tsukebito_abuse.s2_title",
        summaryPath: "chains.tsukebito_abuse.s2_summary",
        options: [
          {
            id: "public_discipline",
            labelPath: "chains.tsukebito_abuse.s2_opt_discipline",
            nextStage: { stageId: "calm", delayWeeks: 1 },
            effects: { reputation: 2, scandalScore: -4, morale: 2 },
          },
          {
            id: "deny",
            labelPath: "chains.tsukebito_abuse.s2_opt_deny",
            effects: { scandalScore: 9, reputation: -5, heyaPressure: 7 },
          },
        ],
      },
      {
        id: "calm",
        titlePath: "chains.tsukebito_abuse.s3_title",
        summaryPath: "chains.tsukebito_abuse.s3_summary",
        options: [
          {
            id: "new_norms",
            labelPath: "chains.tsukebito_abuse.s3_opt_norms",
            effects: { welfareRisk: -4, morale: 3 },
          },
        ],
      },
    ],
  },

  {
    id: "weight_spiral",
    scope: "rikishi",
    cooldownWeeks: 26,
    trigger: { weight: 7, needsRikishi: true, guard: hasRoster(2) },
    stages: [
      {
        id: "ballooning",
        titlePath: "chains.weight_spiral.s0_title",
        summaryPath: "chains.weight_spiral.s0_summary",
        options: [
          {
            id: "diet_plan",
            labelPath: "chains.weight_spiral.s0_opt_diet",
            nextStage: { stageId: "grinding", delayWeeks: 2 },
            effects: { morale: -1 },
          },
          {
            id: "let_eat",
            labelPath: "chains.weight_spiral.s0_opt_eat",
            nextStage: { stageId: "heavy_consequences", delayWeeks: 3 },
            effects: { momentum: 2 },
          },
        ],
      },
      {
        id: "grinding",
        titlePath: "chains.weight_spiral.s1_title",
        summaryPath: "chains.weight_spiral.s1_summary",
        options: [
          {
            id: "hold_course",
            labelPath: "chains.weight_spiral.s1_opt_hold",
            nextStage: { stageId: "fit_again", delayWeeks: 2 },
            effects: { morale: 1 },
          },
          {
            id: "ease_off",
            labelPath: "chains.weight_spiral.s1_opt_ease",
            nextStage: { stageId: "heavy_consequences", delayWeeks: 2 },
          },
        ],
      },
      {
        id: "heavy_consequences",
        titlePath: "chains.weight_spiral.s2_title",
        summaryPath: "chains.weight_spiral.s2_summary",
        options: [
          {
            id: "medical_program",
            labelPath: "chains.weight_spiral.s2_opt_medical",
            feeYen: 200_000,
            nextStage: { stageId: "fit_again", delayWeeks: 2 },
            effects: { welfareRisk: -4 },
          },
          {
            id: "accept_bulk",
            labelPath: "chains.weight_spiral.s2_opt_accept",
            effects: { momentum: 2, morale: -2 },
          },
        ],
      },
      {
        id: "fit_again",
        titlePath: "chains.weight_spiral.s3_title",
        summaryPath: "chains.weight_spiral.s3_summary",
        options: [
          {
            id: "onward",
            labelPath: "chains.weight_spiral.s3_opt_onward",
            effects: { momentum: 4, morale: 2 },
          },
        ],
      },
    ],
  },
];

const byId = new Map(EVENT_CHAIN_REGISTRY.map((c) => [c.id, c]));

/** Look up a chain def by id (undefined-safe). */
export function getChainDef(chainId: string): EventChainDef | undefined {
  return byId.get(chainId);
}
