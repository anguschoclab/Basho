import type { PbpLibrary, Phrase, PhraseBucket } from "./pbp";

/** A compact but expandable default library (you can add thousands later). */
export const DEFAULT_PBP_LIBRARY: PbpLibrary = {
  tachiai: {
    decisive: [
      { id: "t_dec_1", text: "{winner} explodes off the shikirisen!", tags: ["crowd_roar"] },
      { id: "t_dec_2", text: "A thunderous tachiai — {leader} wins the hit!" },
      { id: "t_dec_3", text: "{leader} blasts forward and takes the initiative!" }
    ],
    even: [
      { id: "t_even_1", text: "They collide — neither gives an inch!" },
      { id: "t_even_2", text: "Solid contact at the tachiai, straight into a battle!" },
      { id: "t_even_3", text: "A hard charge from both men — dead even!" }
    ],
    slow: [
      { id: "t_slow_1", text: "A cautious tachiai… feeling for position." },
      { id: "t_slow_2", text: "No wild rush — they meet and measure each other." }
    ]
  },

  clinch: {
    grip_gain: [
      { id: "c_grip_1", text: "{leader} gets a hand on the mawashi!", tags: ["crowd_roar"] },
      { id: "c_grip_2", text: "Grip secured — {leader} wants yotsu!" },
      { id: "c_grip_3", text: "{leader} finds the belt and settles in." }
    ],
    grip_break: [
      { id: "c_break_1", text: "{trailer} breaks the grip — back to the center!" },
      { id: "c_break_2", text: "The hands come free — a reset in close quarters!" }
    ],
    oshi_pressure: [
      { id: "c_oshi_1", text: "{leader} pours on the tsuppari!", tags: ["crowd_roar"] },
      { id: "c_oshi_2", text: "Heavy thrusts from {leader} — driving {trailer} back!" },
      { id: "c_oshi_3", text: "{leader} keeps the chest up and shoves forward!" }
    ],
    scramble: [
      { id: "c_scr_1", text: "No grip — just brute force and footwork!" },
      { id: "c_scr_2", text: "A frantic scramble in the middle!" },
      { id: "c_scr_3", text: "Hands fighting, hips turning — nothing settled yet!" }
    ],
    rear_attack: [
      { id: "c_rear_1", text: "{leader} slips to the side — danger from behind!", tags: ["gasps"] },
      { id: "c_rear_2", text: "Angle taken! {leader} has {trailer} twisted!" }
    ],
    tsuppari_barrage: [
      { id: "str_tsup_1", text: "A furious tsuppari barrage from {leader}!" },
      { id: "str_tsup_2", text: "{leader} unleashes a relentless barrage of thrusts!" },
      { id: "str_tsup_3", text: "Rapid-fire tsuppari! {leader} is overwhelming {trailer}!" },
      { id: "str_tsup_4", text: "The thrusts come in a wave — {leader} dominates with tsuppari!" },
      { id: "str_tsup_5", text: "{leader} rains down tsuppari on {trailer}'s defense!" }
    ],
    nodowa_pressure: [
      { id: "str_nod_1", text: "A vicious nodowa! {leader} controls the throat!" },
      { id: "str_nod_2", text: "{leader} applies suffocating nodowa pressure!" },
      { id: "str_nod_3", text: "The hand goes to the throat — {leader} pushes back with nodowa!" },
      { id: "str_nod_4", text: "{leader} drives {trailer} upward with a fierce nodowa!" },
      { id: "str_nod_5", text: "Nodowa applied perfectly! {trailer} is gasping!" }
    ],
    harite_slap: [
      { id: "str_har_1", text: "Crack! A sharp harite from {leader}!" },
      { id: "str_har_2", text: "{leader} lands a ringing harite slap to the face!" },
      { id: "str_har_3", text: "A stunning slap! {leader} uses harite effectively." },
      { id: "str_har_4", text: "{trailer} stumbles after a powerful harite from {leader}!" },
      { id: "str_har_5", text: "Harite! {leader} slaps the side of the face!" }
    ],
    throat_attack: [
      { id: "str_thr_1", text: "{leader} attacks the throat directly!" },
      { id: "str_thr_2", text: "A dangerous thrust to the throat from {leader}!" },
      { id: "str_thr_3", text: "{leader} aims high and catches the throat!" },
      { id: "str_thr_4", text: "{trailer}'s chin is forced up by {leader}'s throat attack!" },
      { id: "str_thr_5", text: "Direct throat pressure! {leader} takes command!" }
    ],
    shoulder_blast: [
      { id: "str_shl_1", text: "{leader} leads with a devastating shoulder blast!" },
      { id: "str_shl_2", text: "A heavy shoulder hit! {leader} crashes into {trailer}!" },
      { id: "str_shl_3", text: "{leader} uses the shoulder to blast {trailer} backward!" },
      { id: "str_shl_4", text: "Shoulder first, {leader} clears space forcefully." },
      { id: "str_shl_5", text: "A solid shoulder blast disrupts {trailer}'s balance!" }
    ],
    migi_yotsu_established: [
      { id: "grp_mig_1", text: "{leader} locks in a deep migi-yotsu grip!" },
      { id: "grp_mig_2", text: "Right hand inside — migi-yotsu is established for {leader}!" },
      { id: "grp_mig_3", text: "The grip battle ends with {leader} securing migi-yotsu." },
      { id: "grp_mig_4", text: "{leader} finds the right-inside position. Perfect migi-yotsu!" },
      { id: "grp_mig_5", text: "Migi-yotsu! {leader} has the exact grip they wanted." }
    ],
    hidari_yotsu_established: [
      { id: "grp_hid_1", text: "{leader} secures a strong hidari-yotsu position!" },
      { id: "grp_hid_2", text: "Left hand inside! {leader} gets hidari-yotsu." },
      { id: "grp_hid_3", text: "A masterful transition into hidari-yotsu by {leader}." },
      { id: "grp_hid_4", text: "{leader} forces the hidari-yotsu grip — a dangerous setup!" },
      { id: "grp_hid_5", text: "Hidari-yotsu established! {leader} controls the inside left." }
    ],
    double_inside: [
      { id: "grp_dbl_1", text: "Double inside! {leader} dominates the grip completely!" },
      { id: "grp_dbl_2", text: "{leader} gets both hands inside — a huge advantage!" },
      { id: "grp_dbl_3", text: "An ironclad double-inside grip from {leader}." },
      { id: "grp_dbl_4", text: "{leader} controls the center with a double-inside hold." },
      { id: "grp_dbl_5", text: "Moro-zashi! {leader} has double inside control!" }
    ],
    over_under: [
      { id: "grp_ovu_1", text: "{leader} secures an over-under grip on the belt." },
      { id: "grp_ovu_2", text: "An even over-under position, but {leader} drives the action." },
      { id: "grp_ovu_3", text: "Over-under established! A classic grappling stance." },
      { id: "grp_ovu_4", text: "{leader} settles into an over-under clinch." },
      { id: "grp_ovu_5", text: "The hands lock in an over-under battle!" }
    ],
    no_grip_scramble: [
      { id: "grp_nog_1", text: "A chaotic no-grip scramble ensues!" },
      { id: "grp_nog_2", text: "Hands are flying — no one can find the mawashi!" },
      { id: "grp_nog_3", text: "Both men fighting for a hold in a wild scramble." },
      { id: "grp_nog_4", text: "A messy, no-grip exchange in the center." },
      { id: "grp_nog_5", text: "No grip yet! Just pure scramble and hustle." }
    ]
  },

  momentum: {
    edge_dance: [
      { id: "m_edge_1", text: "{trailer} teeters at the tawara!", tags: ["gasps", "close_call"] },
      { id: "m_edge_2", text: "Heels on the straw — {trailer} somehow stays in!", tags: ["gasps", "close_call"] },
      { id: "m_edge_3", text: "A tight rope act at the edge!" }
    ],
    counter_turn: [
      { id: "m_ctr_1", text: "A sudden counter — {leader} turns the tables!", tags: ["crowd_roar"] },
      { id: "m_ctr_2", text: "{leader} absorbs it and redirects the force!" },
      { id: "m_ctr_3", text: "That timing! {leader} steals the advantage!" }
    ],
    fatigue_swing: [
      { id: "m_fat_1", text: "You can see the strain — momentum swings!", tags: ["gasps"] },
      { id: "m_fat_2", text: "{trailer} slows… and {leader} surges!" }
    ],
    steady_drive: [
      { id: "m_drv_1", text: "{leader} keeps walking forward — relentless pressure." },
      { id: "m_drv_2", text: "A steady march from {leader} — no room to breathe." }
    ],
    bales_at_tawara: [
      { id: "edg_bal_1", text: "{trailer} is backed right against the tawara bales!" },
      { id: "edg_bal_2", text: "The bales are the only thing keeping {trailer} in!" },
      { id: "edg_bal_3", text: "{trailer} feels the straw — right at the edge!" },
      { id: "edg_bal_4", text: "Danger! {trailer} is pushed onto the bales!" },
      { id: "edg_bal_5", text: "{trailer}'s heels hit the tawara!" }
    ],
    steps_out_then_recovers: [
      { id: "edg_rec_1", text: "{trailer} nearly steps out but somehow recovers!" },
      { id: "edg_rec_2", text: "A miraculous recovery from {trailer} at the very edge!" },
      { id: "edg_rec_3", text: "{trailer} dances on the line and pushes back inside!" },
      { id: "edg_rec_4", text: "Looked like a step out, but {trailer} survives and recovers!" },
      { id: "edg_rec_5", text: "An impossible save! {trailer} pulls back from the brink." }
    ],
    heel_on_straw: [
      { id: "edg_hel_1", text: "{trailer}'s heel is squarely on the straw!" },
      { id: "edg_hel_2", text: "One heel rests dangerously on the boundary line." },
      { id: "edg_hel_3", text: "The gyoji watches closely — {trailer}'s heel is on the straw!" },
      { id: "edg_hel_4", text: "{trailer} balances precariously with a heel on the tawara." },
      { id: "edg_hel_5", text: "A heel touches the straw — {trailer} has no room left!" }
    ],
    dancing_escape: [
      { id: "edg_dan_1", text: "A beautiful dancing escape along the edge by {trailer}!" },
      { id: "edg_dan_2", text: "{trailer} pirouettes along the bales to stay alive!" },
      { id: "edg_dan_3", text: "Nimble footwork! {trailer} dances out of danger." },
      { id: "edg_dan_4", text: "{trailer} skirts the edge with a dancer's grace." },
      { id: "edg_dan_5", text: "A spinning, dancing escape saves {trailer}!" }
    ],
    turns_the_tables: [
      { id: "edg_tur_1", text: "At the very edge, {trailer} turns the tables!" },
      { id: "edg_tur_2", text: "A stunning reversal at the tawara! {trailer} strikes back!" },
      { id: "edg_tur_3", text: "{trailer} uses the boundary to pivot and turn the tables!" },
      { id: "edg_tur_4", text: "From the brink of defeat, {trailer} flips the momentum!" },
      { id: "edg_tur_5", text: "An edge counter! The tables are completely turned!" }
    ],
    slips_but_survives: [
      { id: "edg_slp_1", text: "{trailer} slips on the clay but survives the push!" },
      { id: "edg_slp_2", text: "A loss of footing! But {trailer} somehow stays in!" },
      { id: "edg_slp_3", text: "{trailer} stumbles and slips, yet refuses to go down!" },
      { id: "edg_slp_4", text: "A dangerous slip is met with an incredible survival instinct." },
      { id: "edg_slp_5", text: "Despite a clear slip, {trailer} holds on and survives!" }
    ],
    grip_change: [],
    footwork_angle: [],
    mistake: [],
    tachiai_win: []
  },

  injury: {
    sprain: [
      { id: "inj_spr_1", text: "A nasty sprain slows the rikishi down." },
      { id: "inj_spr_2", text: "The rikishi suffers a painful sprained joint." },
      { id: "inj_spr_3", text: "A twisted limb results in a severe sprain." },
      { id: "inj_spr_4", text: "Medical staff diagnoses a debilitating sprain." },
      { id: "inj_spr_5", text: "A sharp movement causes a sudden sprain." }
    ],
    strain: [
      { id: "inj_str_1", text: "An overextension leads to a muscle strain." },
      { id: "inj_str_2", text: "The heavy lifting takes its toll with a deep strain." },
      { id: "inj_str_3", text: "A pulled muscle strains the rikishi's mobility." },
      { id: "inj_str_4", text: "The rikishi winces from a clear muscular strain." },
      { id: "inj_str_5", text: "A severe strain will require time off the dohyo." }
    ],
    contusion: [
      { id: "inj_con_1", text: "A brutal impact leaves a deep contusion." },
      { id: "inj_con_2", text: "The rikishi sports a dark contusion from the collision." },
      { id: "inj_con_3", text: "A heavy blow results in a painful contusion." },
      { id: "inj_con_4", text: "Swelling and bruising mark a serious contusion." },
      { id: "inj_con_5", text: "The blunt force of the tachiai causes a contusion." }
    ],
    inflammation: [
      { id: "inj_inf_1", text: "Chronic inflammation flares up unexpectedly." },
      { id: "inj_inf_2", text: "Severe inflammation limits the joint's movement." },
      { id: "inj_inf_3", text: "The rikishi is sidelined by painful inflammation." },
      { id: "inj_inf_4", text: "Wear and tear results in acute inflammation." },
      { id: "inj_inf_5", text: "Medical reports cite severe localized inflammation." }
    ],
    tear: [
      { id: "inj_tea_1", text: "A devastating muscle tear stops the rikishi in their tracks." },
      { id: "inj_tea_2", text: "A loud pop signals a serious ligament tear." },
      { id: "inj_tea_3", text: "The diagnosis is grim: a full tear requiring surgery." },
      { id: "inj_tea_4", text: "A partial tear will keep the rikishi out for weeks." },
      { id: "inj_tea_5", text: "The sheer force of the throw causes a tissue tear." }
    ],
    fracture: [
      { id: "inj_fra_1", text: "A sickening crack confirms a bone fracture." },
      { id: "inj_fra_2", text: "The rikishi suffers a structural fracture." },
      { id: "inj_fra_3", text: "A heavy fall results in a clean fracture." },
      { id: "inj_fra_4", text: "X-rays reveal a hairline fracture." },
      { id: "inj_fra_5", text: "A brutal collision leaves the rikishi with a fracture." }
    ],
    nerve: [
      { id: "inj_nrv_1", text: "A pinched nerve causes shooting pain down the limb." },
      { id: "inj_nrv_2", text: "Nerve damage leaves the rikishi with lingering numbness." },
      { id: "inj_nrv_3", text: "A jarring impact causes severe nerve irritation." },
      { id: "inj_nrv_4", text: "The rikishi loses grip strength due to a nerve issue." },
      { id: "inj_nrv_5", text: "A complex nerve injury complicates recovery." }
    ],
    unknown: [
      { id: "inj_unk_1", text: "The rikishi goes down with an unspecified injury." },
      { id: "inj_unk_2", text: "Medical staff is unsure of the exact nature of the injury." },
      { id: "inj_unk_3", text: "A mysterious ailment sidelines the rikishi." },
      { id: "inj_unk_4", text: "The injury details remain unclear at this time." },
      { id: "inj_unk_5", text: "An undisclosed injury forces a withdrawal." }
    ]
  },

  institutional: {
    GOVERNANCE_STATUS_CHANGED: {
      default: [
        { id: "inst_gsc_1", text: "The JSA issues a formal notice: the heya's governance status has been officially revised." },
        { id: "inst_gsc_2", text: "An urgent dispatch from the council confirms a strict alteration in governance status." },
        { id: "inst_gsc_3", text: "In a stern ruling, the compliance committee mandates a new governance status." },
        { id: "inst_gsc_4", text: "The stablemaster accepts the board's decision to modify their institutional standing." },
        { id: "inst_gsc_5", text: "Following an internal review, the heya's governance status is publicly updated." }
      ],
      strict: [
        { id: "inst_gsc_1s", text: "The JSA issues a formal decree: the stable's governance status has been officially revised." },
        { id: "inst_gsc_2s", text: "An urgent dispatch from the council confirms a strict alteration in governance status." },
        { id: "inst_gsc_3s", text: "In a stern uncompromising mandate, the compliance committee mandates a new governance status." },
        { id: "inst_gsc_4s", text: "The Oyakata accepts the board's decision to modify their institutional standing." },
        { id: "inst_gsc_5s", text: "Following an internal review, the stable's governance status is publicly updated." }
      ],
      indulgent: [
        { id: "inst_gsc_1i", text: "The JSA issues a formal notice: the heya's governance status has been officially revised." },
        { id: "inst_gsc_2i", text: "An urgent dispatch from the council confirms a lenient alteration in governance status." },
        { id: "inst_gsc_3i", text: "In a stern ruling, the compliance committee mandates a new governance status." },
        { id: "inst_gsc_4i", text: "The stablemaster accepts the board's decision to modify their institutional standing." },
        { id: "inst_gsc_5i", text: "Following an internal review, the heya's governance status is publicly updated." }
      ],
      traditionalist: [], scientist: [], gambler: [], nurturer: [], tyrant: [], strategist: []
    },
    GOVERNANCE_RULING: {
      default: [
        { id: "inst_gov_1", text: "The elders hand down a severe governance ruling, demanding immediate compliance." },
        { id: "inst_gov_2", text: "A compassionate but firm governance ruling is issued by the committee to guide the heya." },
        { id: "inst_gov_3", text: "The board's governance ruling sends a clear message about institutional integrity." },
        { id: "inst_gov_4", text: "An unprecedented governance ruling alters the future trajectory of the stable." },
        { id: "inst_gov_5", text: "The disciplinary panel announces a final, binding governance ruling." }
      ],
      strict: [
        { id: "inst_gov_1s", text: "The elders hand down a severe governance uncompromising mandate, demanding immediate compliance." },
        { id: "inst_gov_2s", text: "A compassionate but firm governance uncompromising mandate is issued by the committee to guide the stable." },
        { id: "inst_gov_3s", text: "The board's governance uncompromising mandate sends a clear message about institutional integrity." },
        { id: "inst_gov_4s", text: "An unprecedented governance uncompromising mandate alters the future trajectory of the stable." },
        { id: "inst_gov_5s", text: "The disciplinary panel announces a final, binding governance uncompromising mandate." }
      ],
      indulgent: [
        { id: "inst_gov_1i", text: "The elders hand down a gentle governance ruling, suggesting improvements." },
        { id: "inst_gov_2i", text: "A compassionate but firm governance ruling is issued by the committee to guide the heya." },
        { id: "inst_gov_3i", text: "The board's governance ruling sends a clear message about institutional integrity." },
        { id: "inst_gov_4i", text: "An unprecedented governance ruling alters the future trajectory of the stable." },
        { id: "inst_gov_5i", text: "The disciplinary panel announces a final, binding governance ruling." }
      ],
      traditionalist: [], scientist: [], gambler: [], nurturer: [], tyrant: [], strategist: []
    },
    WELFARE_ALERT: {
      default: [
        { id: "inst_wel_1", text: "A critical welfare alert is triggered, prompting an immediate investigation by the JSA." },
        { id: "inst_wel_2", text: "The welfare committee raises a red flag regarding conditions at the heya." },
        { id: "inst_wel_3", text: "A formal welfare alert underscores deep concerns for the rikishi's wellbeing." },
        { id: "inst_wel_4", text: "The stablemaster is summoned following a serious welfare alert." },
        { id: "inst_wel_5", text: "Welfare monitors issue a stern warning detailing unacceptable conditions." }
      ],
      strict: [
        { id: "inst_wel_1s", text: "A critical welfare violation notice is triggered, prompting an immediate investigation by the JSA." },
        { id: "inst_wel_2s", text: "The welfare committee raises a red flag regarding conditions at the stable." },
        { id: "inst_wel_3s", text: "A formal welfare violation notice underscores deep concerns for the rikishi's wellbeing." },
        { id: "inst_wel_4s", text: "The Oyakata is summoned following a serious welfare violation notice." },
        { id: "inst_wel_5s", text: "Welfare monitors issue a stern warning detailing unacceptable conditions." }
      ],
      indulgent: [
        { id: "inst_wel_1i", text: "A minor welfare alert is triggered, prompting an immediate investigation by the JSA." },
        { id: "inst_wel_2i", text: "The welfare committee raises a red flag regarding conditions at the heya." },
        { id: "inst_wel_3i", text: "A formal welfare alert underscores deep concerns for the rikishi's wellbeing." },
        { id: "inst_wel_4i", text: "The stablemaster is summoned following a routine welfare alert." },
        { id: "inst_wel_5i", text: "Welfare monitors issue a stern warning detailing unacceptable conditions." }
      ],
      traditionalist: [], scientist: [], gambler: [], nurturer: [], tyrant: [], strategist: []
    }
  },

  finish: {
    normal: [
      { id: "f_n_1", text: "{winner} finishes it — {kimarite}!" },
      { id: "f_n_2", text: "That’s it! {winner} takes the bout by {kimarite}!", tags: ["crowd_roar"] },
      { id: "f_n_3", text: "{winner} seals the deal — {kimarite}!" },
      { id: "f_n_4", text: "A definitive finish! {winner} executes a perfect {kimarite}." },
      { id: "f_n_5", text: "{winner} drives the advantage home, winning with {kimarite}!" },
      { id: "f_n_6", text: "There's the climax — {winner} wins via {kimarite}!" },
      { id: "f_n_7", text: "{loser} has no answer for the {kimarite} from {winner}!" },
      { id: "f_n_8", text: "A textbook application of {kimarite} gives {winner} the victory!" }
    ],
    upset: [
      { id: "f_u_1", text: "UPSET! {winner} shocks the arena with {kimarite}!", tags: ["upset", "crowd_roar"] },
      { id: "f_u_2", text: "A stunner — {winner} steals it by {kimarite}!", tags: ["upset"] },
      { id: "f_u_3", text: "Unbelievable! {winner} pulls off a massive upset with {kimarite}!" },
      { id: "f_u_4", text: "The crowd goes wild! An unexpected {kimarite} win for {winner}!" },
      { id: "f_u_5", text: "Against all odds, {winner} conquers {loser} by {kimarite}!" },
      { id: "f_u_6", text: "A gigantic upset! {winner} catches {loser} with {kimarite}." },
      { id: "f_u_7", text: "Nobody saw that coming — {winner} uses {kimarite} to score the huge win!" }
    ],
    close_call: [
      { id: "f_c_1", text: "So close at the edge — but {winner} gets it by {kimarite}!", tags: ["close_call", "gasps"] },
      { id: "f_c_2", text: "A razor-thin finish! {winner} wins with {kimarite}!", tags: ["close_call"] },
      { id: "f_c_3", text: "It goes down to the wire, but {winner} manages a {kimarite}!" },
      { id: "f_c_4", text: "A breathless conclusion! {winner} barely pulls out the {kimarite}!" },
      { id: "f_c_5", text: "The gyoji almost had to call a mono-ii, but {winner}'s {kimarite} was clean!" },
      { id: "f_c_6", text: "Narrowly escaping defeat, {winner} counters with {kimarite}!" },
      { id: "f_c_7", text: "A hair's breadth away from a loss, {winner} secures the {kimarite}." }
    ],
    kinboshi: [
      { id: "f_k_1", text: "KINBOSHI! {winner} claims a gold star with {kimarite}!", tags: ["kinboshi", "crowd_roar"] },
      { id: "f_k_2", text: "A gold star victory! {winner} defeats a Yokozuna by {kimarite}!", tags: ["kinboshi"] },
      { id: "f_k_3", text: "The Yokozuna falls! {winner} earns a kinboshi via {kimarite}!" },
      { id: "f_k_4", text: "History is made! {winner} topples the champion with {kimarite}." },
      { id: "f_k_5", text: "A legendary moment as {winner} secures a kinboshi with {kimarite}!" },
      { id: "f_k_6", text: "The grand champion goes down! KINBOSHI for {winner} by {kimarite}!" },
      { id: "f_k_7", text: "A brilliant performance yields a gold star! {winner} wins by {kimarite}!" }
    ]
  },

  tactical: {
    oshi_strategy: [
      { id: "tac_oshi_1", text: "📋 {leader}'s game plan: deny the belt, full forward pressure." },
      { id: "tac_oshi_2", text: "📋 {leader} comes in with a clear oshi strategy — no belt wrestling today." },
      { id: "tac_oshi_3", text: "📋 The commentators note {leader} is set up for relentless pushing." },
      { id: "tac_oshi_4", text: "📋 {leader} wants to keep both hands on {trailer}'s chest — pure oshi." },
      { id: "tac_oshi_5", text: "📋 Forward pressure is the order of the day for {leader}." }
    ],
    yotsu_strategy: [
      { id: "tac_yotsu_1", text: "📋 {leader}'s approach: get to the belt at all costs." },
      { id: "tac_yotsu_2", text: "📋 {leader} wants this on the mawashi — a patient belt-hunting plan." },
      { id: "tac_yotsu_3", text: "📋 Classic yotsu preparation from {leader} — absorb and grapple." },
      { id: "tac_yotsu_4", text: "📋 {leader} aims to establish migi-yotsu early — right hand inside." },
      { id: "tac_yotsu_5", text: "📋 The commentators see {leader} adjusting the mawashi — belt sumo on the menu." }
    ],
    speedster_strategy: [
      { id: "tac_speed_1", text: "📋 {leader} will use footwork — movement sumo is the plan." },
      { id: "tac_speed_2", text: "📋 Quick feet, sharp angles — {leader} aims to stay mobile." },
      { id: "tac_speed_3", text: "📋 The commentators say {leader} will rely on lateral movement today." },
      { id: "tac_speed_4", text: "📋 {leader}'s game: don't stand still, don't let {trailer} square up." },
      { id: "tac_speed_5", text: "📋 Speed kills — {leader} plans to make {trailer} chase." }
    ],
    adaptive_strategy: [
      { id: "tac_ada_1", text: "📋 {leader} is playing it smart, adjusting to {trailer}'s every move." },
      { id: "tac_ada_2", text: "📋 High-IQ sumo from {leader} — a masterclass in adaptation." }
    ],
    blitzer_fatigue: [
      { id: "tac_blz_1", text: "📋 The high-octane start takes its toll — {leader} is slowing down." },
      { id: "tac_blz_2", text: "📋 {leader}'s explosive energy is waning... can they finish?" }
    ],
    mountain_resilience: [
      { id: "tac_mtn_1", text: "📋 {leader} is an immovable object — absorbing everything {trailer} throws." },
      { id: "tac_mtn_2", text: "📋 Like a mountain, {leader} stands firm against the assault." }
    ],
    stalwart_counter: [
      { id: "tac_stw_1", text: "📋 {leader} is waiting for the mistake, coiled and ready to counter." },
      { id: "tac_stw_2", text: "📋 A defensive masterclass from {leader} — the counter-attack is coming." }
    ],
    trickster_agility: [
      { id: "tac_tri_1", text: "📋 {leader} is all smoke and mirrors — confusing {trailer} with lateral bursts." },
      { id: "tac_tri_2", text: "📋 Trickery and speed — {leader} is dissecting the opponent's balance." }
    ]
  },

  connective: {
    short: [
      { id: "conn_1", text: "Meanwhile…" },
      { id: "conn_2", text: "Back on the clay…" },
      { id: "conn_3", text: "The battle rages on…" }
    ]
  }
};
