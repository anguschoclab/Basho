import type { PbpLibrary, Phrase, PhraseBucket } from "./pbp";

/** Expanded phrase library — high variety across all phases and buckets. */
export const DEFAULT_PBP_LIBRARY: PbpLibrary = {
  tachiai: {
    decisive: [
      { id: "t_dec_1",  text: "{winner} explodes off the shikirisen!", tags: ["crowd_roar"] },
      { id: "t_dec_2",  text: "A thunderous tachiai — {leader} wins the hit!" },
      { id: "t_dec_3",  text: "{leader} blasts forward and takes the initiative!" },
      { id: "t_dec_4",  text: "Devastating first contact! {leader} owns the opening moment.", tags: ["crowd_roar"] },
      { id: "t_dec_5",  text: "{leader} fires low and hard — {trailer} is immediately on the back foot!" },
      { id: "t_dec_6",  text: "Like a cannonball! {leader} detonates at the shikirisen!" },
      { id: "t_dec_7",  text: "The hit echoes through the hall. {leader} wins the tachiai decisively.", tags: ["crowd_roar"] },
      { id: "t_dec_8",  text: "{leader} gets the jump — and it's immediately, visibly, a problem for {trailer}." },
      { id: "t_dec_9",  text: "Perfect timing! {leader} is underneath and driving before {trailer} can react!" },
      { id: "t_dec_10", text: "A ferocious opening blow. {leader} establishes total control at the line." },
      { id: "t_dec_11", text: "{leader} drives the head into the chest — a brutally effective tachiai!" },
      { id: "t_dec_12", text: "No hesitation, no caution. {leader} commits everything and the result is immediate." },
      { id: "t_dec_13", text: "The collision is lopsided from the first millisecond. {leader} takes complete command.", tags: ["crowd_roar"] },
      { id: "t_dec_14", text: "{trailer} is rocked before the crowd even finishes exhaling." },
      { id: "t_dec_15", text: "A monstrous charge! {leader}'s tachiai tonight is something to behold." },
      { id: "t_dec_16", text: "{leader} bursts upward from the clay, catching {trailer} completely unprepared." },
      { id: "t_dec_17", text: "A breathtaking collision! {leader} claims the center immediately." },
      { id: "t_dec_18", text: "Pure velocity! {leader} converts momentum into absolute positional dominance." }
    ],
    even: [
      { id: "t_even_1", text: "They collide — neither gives an inch!" },
      { id: "t_even_2", text: "Solid contact at the tachiai, straight into a battle!" },
      { id: "t_even_3", text: "A hard charge from both men — dead even!" },
      { id: "t_even_4", text: "Simultaneous impact! Both men absorb the blow without flinching." },
      { id: "t_even_5", text: "They meet in the middle and the earth seems to hold still." },
      { id: "t_even_6", text: "Equal force, equal will — the tachiai settles nothing." },
      { id: "t_even_7", text: "A thunderclap of flesh on flesh. Neither man with any early advantage." },
      { id: "t_even_8", text: "The charge is mutual and clean. Now the real work begins." },
      { id: "t_even_9", text: "Both men hit their marks. No one flinches. The bout has truly begun." },
      { id: "t_even_10", text: "An even collision — the gyoji watches intently as they lock up." },
      { id: "t_even_11", text: "A mirror image at the tachiai! Neither can establish an early angle." },
      { id: "t_even_12", text: "Head to head, chest to chest! The impact is perfectly balanced." },
      { id: "t_even_13", text: "Both men hold their ground like ancient oaks. A true test of strength begins." }
    ],
    slow: [
      { id: "t_slow_1", text: "A cautious tachiai… feeling for position." },
      { id: "t_slow_2", text: "No wild rush — they meet and measure each other." },
      { id: "t_slow_3", text: "Both men ease into contact. This will be a thinking man's bout." },
      { id: "t_slow_4", text: "A deliberate, patient opening. Neither willing to overcommit early." },
      { id: "t_slow_5", text: "Slow hands, slow feet. They are studying each other." },
      { id: "t_slow_6", text: "The tachiai is careful — almost gentle. The danger will come later." },
      { id: "t_slow_7", text: "A chess match begins. Neither man wants to be the first to blink." },
      { id: "t_slow_8", text: "They meet softly and start to probe. The crowd senses a long one." },
      { id: "t_slow_9", text: "A calculating start. {leader} refuses to rush the engagement." },
      { id: "t_slow_10", text: "They stand up slowly, eyes locked, daring the other to commit first." }
    ]
  },

  clinch: {
    grip_gain: [
      { id: "c_grip_1",  text: "{leader} gets a hand on the mawashi!", tags: ["crowd_roar"] },
      { id: "c_grip_2",  text: "Grip secured — {leader} wants yotsu!" },
      { id: "c_grip_3",  text: "{leader} finds the belt and settles in." },
      { id: "c_grip_4",  text: "There it is! {leader} snatches a grip on the canvas." },
      { id: "c_grip_5",  text: "{leader} digs a hand inside and the dynamic shifts immediately!" },
      { id: "c_grip_6",  text: "After a furious grip battle, {leader} finally secures the hold they wanted." },
      { id: "c_grip_7",  text: "{leader} threads the arm inside — a hard-fought grip is won." },
      { id: "c_grip_8",  text: "A clean grip! {leader} locks on and the pressure begins in earnest.", tags: ["crowd_roar"] },
      { id: "c_grip_9",  text: "{trailer} tried everything to deny it, but {leader} has the mawashi now." },
      { id: "c_grip_10", text: "{leader} earns a deep grip — patience rewarded." },
      { id: "c_grip_11", text: "{leader} snatches the thick fabric of the mawashi, anchoring their position." },
      { id: "c_grip_12", text: "A tactical masterstroke! {leader} finally secures the grip they've been hunting for." }
    ],
    grip_break: [
      { id: "c_break_1", text: "{trailer} breaks the grip — back to the center!" },
      { id: "c_break_2", text: "The hands come free — a reset in close quarters!" },
      { id: "c_break_3", text: "A fierce wrenching motion and {trailer} strips the grip off the belt!" },
      { id: "c_break_4", text: "{trailer} twists free — the hold is broken, the bout resets." },
      { id: "c_break_5", text: "Hands come apart! {trailer} escapes the danger and creates distance." },
      { id: "c_break_6", text: "{leader}'s grip is broken in a desperate, violent disengagement." },
      { id: "c_break_7", text: "A savage grip break from {trailer} — back to neutral they go." },
      { id: "c_break_8", text: "{trailer} pivots hard and sheds the hold. The bout starts over." },
      { id: "c_break_9", text: "With a violent shudder, {trailer} snaps the grip away!" },
      { id: "c_break_10", text: "A desperate hip toss forces the hands apart. The danger is momentarily cleared." }
    ],
    oshi_pressure: [
      { id: "c_oshi_1",  text: "{leader} pours on the tsuppari!", tags: ["crowd_roar"] },
      { id: "c_oshi_2",  text: "Heavy thrusts from {leader} — driving {trailer} back!" },
      { id: "c_oshi_3",  text: "{leader} keeps the chest up and shoves forward!" },
      { id: "c_oshi_4",  text: "No belt — just palms and momentum from {leader}!" },
      { id: "c_oshi_5",  text: "Pure oshi-zumo. {leader} wants nothing to do with the mawashi." },
      { id: "c_oshi_6",  text: "A wall of hands! {leader} drives forward, one thrust at a time." },
      { id: "c_oshi_7",  text: "{leader} builds a rhythm with the tsuppari — {trailer} can't get set." },
      { id: "c_oshi_8",  text: "The pressure is relentless. {leader} keeps {trailer} upright and moving backward." },
      { id: "c_oshi_9",  text: "No grip, no mercy — {leader} uses sheer forward pressure to dominate." },
      { id: "c_oshi_10", text: "{trailer}'s arms are scrambling to deflect the barrage from {leader}." }
    ],
    scramble: [
      { id: "c_scr_1", text: "No grip — just brute force and footwork!" },
      { id: "c_scr_2", text: "A frantic scramble in the middle!" },
      { id: "c_scr_3", text: "Hands fighting, hips turning — nothing settled yet!" },
      { id: "c_scr_4", text: "Chaos at close quarters! Both men grappling for control." },
      { id: "c_scr_5", text: "A wild, tangled exchange — the gyoji tracks every step." },
      { id: "c_scr_6", text: "Neither man can establish anything clean. Pure wrestling instinct takes over." },
      { id: "c_scr_7", text: "Limbs everywhere! This is sumo at its most primal." },
      { id: "c_scr_8", text: "A messy battle for leverage — both men burning energy fast." },
      { id: "c_scr_9", text: "No dominant position — just ferocity and noise." },
      { id: "c_scr_10", text: "The scramble is exhausting to watch. One of them must find an angle soon." },
      { id: "c_scr_11", text: "A flurry of desperate parries and feints! It's a chaotic wrestling match." },
      { id: "c_scr_12", text: "Neither gives an inch in this furious, untethered exchange of leverage." }
    ],
    rear_attack: [
      { id: "c_rear_1", text: "{leader} slips to the side — danger from behind!", tags: ["gasps"] },
      { id: "c_rear_2", text: "Angle taken! {leader} has {trailer} twisted!" },
      { id: "c_rear_3", text: "{leader} circles behind — {trailer} is in serious trouble!", tags: ["gasps"] },
      { id: "c_rear_4", text: "A stunning positional shift! {leader} is at the back now." },
      { id: "c_rear_5", text: "{trailer} spins desperately, but {leader} has established the rear angle!" },
      { id: "c_rear_6", text: "{leader} works around the side and gets behind — almost impossible to recover from this." },
      { id: "c_rear_7", text: "Okuridashi territory! {leader} has slipped behind and the crowd knows it.", tags: ["crowd_roar"] }
    ],
    tsuppari_barrage: [
      { id: "str_tsup_1",  text: "A furious tsuppari barrage from {leader}!" },
      { id: "str_tsup_2",  text: "{leader} unleashes a relentless barrage of thrusts!" },
      { id: "str_tsup_3",  text: "Rapid-fire tsuppari! {leader} is overwhelming {trailer}!" },
      { id: "str_tsup_4",  text: "The thrusts come in a wave — {leader} dominates with tsuppari!" },
      { id: "str_tsup_5",  text: "{leader} rains down tsuppari on {trailer}'s defense!" },
      { id: "str_tsup_6",  text: "Machine-gun thrusts! {trailer} cannot find a counter." },
      { id: "str_tsup_7",  text: "The tempo is brutal. {leader}'s tsuppari rhythm is breaking {trailer} apart." },
      { id: "str_tsup_8",  text: "Thrust after thrust after thrust — {trailer}'s guard is crumbling." },
      { id: "str_tsup_9",  text: "{leader} switches angles mid-barrage to keep {trailer} guessing." },
      { id: "str_tsup_10", text: "A dazzling combination! The tsuppari from {leader} is pin-point tonight.", tags: ["crowd_roar"] },
      { id: "str_tsup_11", text: "{trailer} absorbs hit after hit. The question is how long they can hold." },
      { id: "str_tsup_12", text: "The tsuppari is so fast {trailer} can't even set their feet properly." }
    ],
    nodowa_pressure: [
      { id: "str_nod_1",  text: "A vicious nodowa! {leader} controls the throat!" },
      { id: "str_nod_2",  text: "{leader} applies suffocating nodowa pressure!" },
      { id: "str_nod_3",  text: "The hand goes to the throat — {leader} pushes back with nodowa!" },
      { id: "str_nod_4",  text: "{leader} drives {trailer} upward with a fierce nodowa!" },
      { id: "str_nod_5",  text: "Nodowa applied perfectly! {trailer} is gasping!" },
      { id: "str_nod_6",  text: "A crushing palm to the throat! {trailer}'s chin flies up." },
      { id: "str_nod_7",  text: "The nodowa is suffocating — {trailer} can barely keep their hips low." },
      { id: "str_nod_8",  text: "{leader} jabs the nodowa in deep. {trailer} stands straight and loses leverage instantly." },
      { id: "str_nod_9",  text: "Throat control established. {leader} uses it to dictate every movement." },
      { id: "str_nod_10", text: "{trailer} claws at the arm, but the nodowa grip is ironclad." },
      { id: "str_nod_11", text: "A sustained nodowa — {leader} is slowly strangling the fight out of {trailer}." }
    ],
    harite_slap: [
      { id: "str_har_1",  text: "Crack! A sharp harite from {leader}!" },
      { id: "str_har_2",  text: "{leader} lands a ringing harite slap to the face!" },
      { id: "str_har_3",  text: "A stunning slap! {leader} uses harite effectively." },
      { id: "str_har_4",  text: "{trailer} stumbles after a powerful harite from {leader}!" },
      { id: "str_har_5",  text: "Harite! {leader} slaps the side of the face!" },
      { id: "str_har_6",  text: "The sound of the harite echoes across the arena.", tags: ["gasps"] },
      { id: "str_har_7",  text: "{leader} uses harite as a distraction and immediately follows with a push!" },
      { id: "str_har_8",  text: "An open hand stings {trailer}'s cheek! The crowd winces." },
      { id: "str_har_9",  text: "Two harite in quick succession from {leader}! {trailer}'s head is spinning." },
      { id: "str_har_10", text: "A vicious harite throws {trailer}'s balance for a critical second — and {leader} exploits it." }
    ],
    throat_attack: [
      { id: "str_thr_1",  text: "{leader} attacks the throat directly!" },
      { id: "str_thr_2",  text: "A dangerous thrust to the throat from {leader}!" },
      { id: "str_thr_3",  text: "{leader} aims high and catches the throat!" },
      { id: "str_thr_4",  text: "{trailer}'s chin is forced up by {leader}'s throat attack!" },
      { id: "str_thr_5",  text: "Direct throat pressure! {leader} takes command!" },
      { id: "str_thr_6",  text: "The throat thrust snaps {trailer}'s posture upright — a nightmare position." },
      { id: "str_thr_7",  text: "{leader} goes high and straight — palm driving into the throat." },
      { id: "str_thr_8",  text: "A targeted attack! {leader} goes for the throat and finds it cleanly." },
      { id: "str_thr_9",  text: "{trailer} struggles to lower their hips with a hand at their throat." }
    ],
    shoulder_blast: [
      { id: "str_shl_1",  text: "{leader} leads with a devastating shoulder blast!" },
      { id: "str_shl_2",  text: "A heavy shoulder hit! {leader} crashes into {trailer}!" },
      { id: "str_shl_3",  text: "{leader} uses the shoulder to blast {trailer} backward!" },
      { id: "str_shl_4",  text: "Shoulder first, {leader} clears space forcefully." },
      { id: "str_shl_5",  text: "A solid shoulder blast disrupts {trailer}'s balance!" },
      { id: "str_shl_6",  text: "{leader} drops the shoulder and drives through like a freight train." },
      { id: "str_shl_7",  text: "A bull rush! {leader} leads with the shoulder and leaves {trailer} reeling.", tags: ["crowd_roar"] },
      { id: "str_shl_8",  text: "The shoulder connects with a sickening thud. {trailer} is shifted." },
      { id: "str_shl_9",  text: "{leader} times the shoulder blast perfectly — {trailer} was just leaning in." }
    ],
    migi_yotsu_established: [
      { id: "grp_mig_1",  text: "{leader} locks in a deep migi-yotsu grip!" },
      { id: "grp_mig_2",  text: "Right hand inside — migi-yotsu is established for {leader}!" },
      { id: "grp_mig_3",  text: "The grip battle ends with {leader} securing migi-yotsu." },
      { id: "grp_mig_4",  text: "{leader} finds the right-inside position. Perfect migi-yotsu!" },
      { id: "grp_mig_5",  text: "Migi-yotsu! {leader} has the exact grip they wanted." },
      { id: "grp_mig_6",  text: "{leader} confidently slides the right hand inside for migi-yotsu." },
      { id: "grp_mig_7",  text: "The right hand is firmly inside! {leader} establishes migi-yotsu." },
      { id: "grp_mig_8",  text: "A textbook migi-yotsu grip from {leader}! The advantage is clear." },
      { id: "grp_mig_9",  text: "{leader} wins the grip fight, securing a beautiful migi-yotsu." },
      { id: "grp_mig_10", text: "Migi-yotsu locked in! {leader} controls the grappling exchange." },
      { id: "grp_mig_11", text: "The right hand snakes inside and finds the canvas. Migi-yotsu!" },
      { id: "grp_mig_12", text: "{leader} has waited for this position all bout — the migi-yotsu is finally his." },
      { id: "grp_mig_13", text: "Deep right-hand inside. {leader} settles into a commanding migi-yotsu." }
    ],
    hidari_yotsu_established: [
      { id: "grp_hid_1",  text: "{leader} secures a strong hidari-yotsu position!" },
      { id: "grp_hid_2",  text: "Left hand inside! {leader} gets hidari-yotsu." },
      { id: "grp_hid_3",  text: "A masterful transition into hidari-yotsu by {leader}." },
      { id: "grp_hid_4",  text: "{leader} forces the hidari-yotsu grip — a dangerous setup!" },
      { id: "grp_hid_5",  text: "Hidari-yotsu established! {leader} controls the inside left." },
      { id: "grp_hid_6",  text: "A swift left hand inside — {leader} secures hidari-yotsu." },
      { id: "grp_hid_7",  text: "{leader} dominates the inside track with a hidari-yotsu grip." },
      { id: "grp_hid_8",  text: "Hidari-yotsu! {leader} has the left-inside advantage." },
      { id: "grp_hid_9",  text: "The left hand finds its mark. {leader} locks in hidari-yotsu!" },
      { id: "grp_hid_10", text: "{leader} expertly maneuvers into a commanding hidari-yotsu hold." },
      { id: "grp_hid_11", text: "Left arm in deep — hidari-yotsu, and {leader} looks very dangerous." },
      { id: "grp_hid_12", text: "{leader} hunts the left-inside and claims it. Hidari-yotsu established." },
      { id: "grp_hid_13", text: "The inside left is won. {leader} adjusts the hips and begins to work." }
    ],
    double_inside: [
      { id: "grp_dbl_1", text: "Double inside! {leader} dominates the grip completely!" },
      { id: "grp_dbl_2", text: "{leader} gets both hands inside — a huge advantage!", tags: ["crowd_roar"] },
      { id: "grp_dbl_3", text: "An ironclad double-inside grip from {leader}." },
      { id: "grp_dbl_4", text: "{leader} controls the center with a double-inside hold." },
      { id: "grp_dbl_5", text: "Moro-zashi! {leader} has double inside control!", tags: ["crowd_roar"] },
      { id: "grp_dbl_6", text: "Both arms inside! The advantage is total. {trailer} is in desperate trouble." },
      { id: "grp_dbl_7", text: "Moro-zashi secured! This bout could be over very quickly." },
      { id: "grp_dbl_8", text: "{leader} claims both inside positions. The leverage is overwhelming." },
      { id: "grp_dbl_9", text: "A rare double-inside grip — and {leader} has it locked." },
      { id: "grp_dbl_10", text: "{trailer} has no answer for the moro-zashi. Both arms are compromised." }
    ],
    over_under: [
      { id: "grp_ovu_1", text: "{leader} secures an over-under grip on the belt." },
      { id: "grp_ovu_2", text: "An even over-under position, but {leader} drives the action." },
      { id: "grp_ovu_3", text: "Over-under established! A classic grappling stance." },
      { id: "grp_ovu_4", text: "{leader} settles into an over-under clinch." },
      { id: "grp_ovu_5", text: "The hands lock in an over-under battle!" },
      { id: "grp_ovu_6", text: "A mutual over-under — the bout enters its grinding, tactical phase." },
      { id: "grp_ovu_7", text: "Over-under. Neither man is comfortable, but {leader} looks to impose." },
      { id: "grp_ovu_8", text: "{leader} accepts the over-under and immediately looks for a step." }
    ],
    no_grip_scramble: [
      { id: "grp_nog_1", text: "A chaotic no-grip scramble ensues!" },
      { id: "grp_nog_2", text: "Hands are flying — no one can find the mawashi!" },
      { id: "grp_nog_3", text: "Both men fighting for a hold in a wild scramble." },
      { id: "grp_nog_4", text: "A messy, no-grip exchange in the center." },
      { id: "grp_nog_5", text: "No grip yet! Just pure scramble and hustle." },
      { id: "grp_nog_6", text: "Frantic hands, shifting hips — nobody has established anything clean." },
      { id: "grp_nog_7", text: "Neither man can get on the mawashi. The bout is all footwork right now." },
      { id: "grp_nog_8", text: "A wrestling scramble with no resolution — the crowd is tense." }
    ]
  },

  momentum: {
    edge_dance: [
      { id: "m_edge_1", text: "{trailer} teeters at the tawara!", tags: ["gasps", "close_call"] },
      { id: "m_edge_2", text: "Heels on the straw — {trailer} somehow stays in!", tags: ["gasps", "close_call"] },
      { id: "m_edge_3", text: "A tight rope act at the edge!" },
      { id: "m_edge_4", text: "The gyoji leans in — {trailer} is right at the boundary!", tags: ["gasps"] },
      { id: "m_edge_5", text: "{trailer} is balanced on nothing. The dohyo is about to claim a victim.", tags: ["gasps"] },
      { id: "m_edge_6", text: "Right at the bales! {trailer} needs a miracle here." },
      { id: "m_edge_7", text: "{trailer} is half out! The crowd holds its collective breath." },
      { id: "m_edge_8", text: "Out of room! {trailer} is pressed against the tawara with nowhere to go." }
    ],
    counter_turn: [
      { id: "m_ctr_1", text: "A sudden counter — {leader} turns the tables!", tags: ["crowd_roar"] },
      { id: "m_ctr_2", text: "{leader} absorbs it and redirects the force!" },
      { id: "m_ctr_3", text: "That timing! {leader} steals the advantage!" },
      { id: "m_ctr_4", text: "A clinical reversal! {leader} uses {trailer}'s own momentum against them." },
      { id: "m_ctr_5", text: "The counter arrives like a thunderbolt! {leader} is back in this!", tags: ["crowd_roar"] },
      { id: "m_ctr_6", text: "{leader} waits, waits, and then — the counter! Perfect timing." },
      { id: "m_ctr_7", text: "A sudden pivot! {leader} has turned the entire bout around." },
      { id: "m_ctr_8", text: "{trailer} overextends, and {leader} capitalizes with a swift counter." },
      { id: "m_ctr_9", text: "The momentum swings like a pendulum! {leader} is suddenly in control." },
      { id: "m_ctr_10", text: "{leader} shifts the center of gravity, utterly neutralizing {trailer}'s drive." },
      { id: "m_ctr_11", text: "A brilliant tactical retreat from {leader} opens the door for a fierce counter-attack!" }
    ],
    fatigue_swing: [
      { id: "m_fat_1", text: "You can see the strain — momentum swings!", tags: ["gasps"] },
      { id: "m_fat_2", text: "{trailer} slows… and {leader} surges!" },
      { id: "m_fat_3", text: "The pace is taking its toll. {trailer} is visibly fading." },
      { id: "m_fat_4", text: "{trailer}'s legs are heavy now. {leader} smells blood." },
      { id: "m_fat_5", text: "The longer this goes, the better it looks for {leader}." },
      { id: "m_fat_6", text: "{trailer} gasps between exchanges. The tank is nearly empty." },
      { id: "m_fat_7", text: "Fatigue is the great equalizer. {trailer} can feel it in every step." }
    ],
    steady_drive: [
      { id: "m_drv_1", text: "{leader} keeps walking forward — relentless pressure." },
      { id: "m_drv_2", text: "A steady march from {leader} — no room to breathe." },
      { id: "m_drv_3", text: "{leader} advances methodically. There is no panic here — just pressure." },
      { id: "m_drv_4", text: "Inexorable forward movement from {leader}. {trailer} can only retreat." },
      { id: "m_drv_5", text: "A slow, grinding drive! {leader} earns every centimeter." },
      { id: "m_drv_6", text: "{leader} is a machine. The drive continues without pause." },
      { id: "m_drv_7", text: "Steady, heavy, inevitable. {trailer} is being walked to the edge." },
      { id: "m_drv_8", text: "The pressure is constant and suffocating. {trailer} cannot find a foothold." }
    ],
    bales_at_tawara: [
      { id: "edg_bal_1", text: "{trailer} is backed right against the tawara bales!" },
      { id: "edg_bal_2", text: "The bales are the only thing keeping {trailer} in!" },
      { id: "edg_bal_3", text: "{trailer} feels the straw — right at the edge!" },
      { id: "edg_bal_4", text: "Danger! {trailer} is pushed onto the bales!" },
      { id: "edg_bal_5", text: "{trailer}'s heels hit the tawara!" },
      { id: "edg_bal_6", text: "The tawara presses into {trailer}'s heels. One more step ends this." },
      { id: "edg_bal_7", text: "Backed up! {trailer} has no real estate left." },
      { id: "edg_bal_8", text: "{trailer} is against the straw boundary. The crowd leans forward." },
      { id: "edg_bal_9", text: "The bales are there. {leader} knows it. {trailer} can feel it." }
    ],
    steps_out_then_recovers: [
      { id: "edg_rec_1", text: "{trailer} nearly steps out but somehow recovers!" },
      { id: "edg_rec_2", text: "A miraculous recovery from {trailer} at the very edge!" },
      { id: "edg_rec_3", text: "{trailer} dances on the line and pushes back inside!" },
      { id: "edg_rec_4", text: "Looked like a step out, but {trailer} survives and recovers!" },
      { id: "edg_rec_5", text: "An impossible save! {trailer} pulls back from the brink." },
      { id: "edg_rec_6", text: "The foot touches down, then lifts — {trailer} refuses to go!" },
      { id: "edg_rec_7", text: "The crowd gasps, then roars! {trailer} has survived the impossible.", tags: ["crowd_roar", "gasps"] },
      { id: "edg_rec_8", text: "{trailer} is back in bounds! Sheer survival instinct at work." }
    ],
    heel_on_straw: [
      { id: "edg_hel_1", text: "{trailer}'s heel is squarely on the straw!" },
      { id: "edg_hel_2", text: "One heel rests dangerously on the boundary line." },
      { id: "edg_hel_3", text: "The gyoji watches closely — {trailer}'s heel is on the straw!" },
      { id: "edg_hel_4", text: "{trailer} balances precariously with a heel on the tawara." },
      { id: "edg_hel_5", text: "A heel touches the straw — {trailer} has no room left!" },
      { id: "edg_hel_6", text: "One more push and that heel becomes a loss." },
      { id: "edg_hel_7", text: "The heel is down on the straw bales. The gyoji has seen it." },
      { id: "edg_hel_8", text: "{trailer} walks a razor's edge — literally. That heel is all the way back." }
    ],
    dancing_escape: [
      { id: "edg_dan_1", text: "A beautiful dancing escape along the edge by {trailer}!" },
      { id: "edg_dan_2", text: "{trailer} pirouettes along the bales to stay alive!" },
      { id: "edg_dan_3", text: "Nimble footwork! {trailer} dances out of danger." },
      { id: "edg_dan_4", text: "{trailer} skirts the edge with a dancer's grace." },
      { id: "edg_dan_5", text: "A spinning, dancing escape saves {trailer}!" },
      { id: "edg_dan_6", text: "{trailer} glides along the tawara, somehow keeping two feet in bounds." },
      { id: "edg_dan_7", text: "An athletic escape! {trailer} uses footwork that belongs in a different sport." },
      { id: "edg_dan_8", text: "{trailer} traces the boundary line like a tightrope walker. The crowd is stunned." }
    ],
    turns_the_tables: [
      { id: "edg_tur_1", text: "At the very edge, {trailer} turns the tables!", tags: ["crowd_roar"] },
      { id: "edg_tur_2", text: "A stunning reversal at the tawara! {trailer} strikes back!", tags: ["crowd_roar"] },
      { id: "edg_tur_3", text: "{trailer} uses the boundary to pivot and turn the tables!" },
      { id: "edg_tur_4", text: "From the brink of defeat, {trailer} flips the momentum!" },
      { id: "edg_tur_5", text: "An edge counter! The tables are completely turned!" },
      { id: "edg_tur_6", text: "Utchari! {trailer} plants and twists at the very last moment!", tags: ["crowd_roar"] },
      { id: "edg_tur_7", text: "With back to the crowd, {trailer} somehow reverses the whole situation." },
      { id: "edg_tur_8", text: "{leader} had it won. Then {trailer} found one last desperate burst." }
    ],
    slips_but_survives: [
      { id: "edg_slp_1", text: "{trailer} slips on the clay but survives the push!" },
      { id: "edg_slp_2", text: "A loss of footing! But {trailer} somehow stays in!" },
      { id: "edg_slp_3", text: "{trailer} stumbles and slips, yet refuses to go down!" },
      { id: "edg_slp_4", text: "A dangerous slip is met with an incredible survival instinct." },
      { id: "edg_slp_5", text: "Despite a clear slip, {trailer} holds on and survives!" },
      { id: "edg_slp_6", text: "A foot gives way — but {trailer} finds the ground before going over!" },
      { id: "edg_slp_7", text: "Slipping, stumbling, but still upright! {trailer} has escaped somehow." },
      { id: "edg_slp_8", text: "The clay betrays {trailer}'s foot — but willpower keeps them in the bout." }
    ],
    grip_change: [
      { id: "m_gc_1", text: "{leader} shifts the grip — hunting for a better angle!", tags: ["crowd_roar"] },
      { id: "m_gc_2", text: "A sudden grip adjustment from {leader} catches {trailer} off guard!" },
      { id: "m_gc_3", text: "{leader} releases and re-grabs — the mawashi changes hands!" },
      { id: "m_gc_4", text: "Smart wrestling from {leader}, swapping to a stronger inside grip." },
      { id: "m_gc_5", text: "{leader} reads the position and transitions to a fresh hold on the belt." },
      { id: "m_gc_6", text: "The grip switch is fast and deliberate. {trailer} had no time to react." },
      { id: "m_gc_7", text: "{leader} abandons the outside grip and goes hunting for the inside. Patient." },
      { id: "m_gc_8", text: "A seamless grip change! {leader} upgrades their hold mid-battle." }
    ],
    footwork_angle: [
      { id: "m_fa_1", text: "{leader} shuffles the feet and cuts a brutal new angle!" },
      { id: "m_fa_2", text: "A sharp lateral step from {leader} — geometry shifts in their favor." },
      { id: "m_fa_3", text: "{leader} pivots, redirecting the whole fight with a single footwork adjustment." },
      { id: "m_fa_4", text: "The footwork from {leader} is exceptional — {trailer} is suddenly exposed." },
      { id: "m_fa_5", text: "{leader} finds the angle that {trailer} cannot cover. Masterful positioning." },
      { id: "m_fa_6", text: "A half-step to the side opens the whole dohyo for {leader}." },
      { id: "m_fa_7", text: "{leader} shuffles laterally and the fight changes shape entirely." },
      { id: "m_fa_8", text: "Brilliant ring IQ! {leader} finds the crease with precise footwork." }
    ],
    mistake: [
      { id: "m_mis_1", text: "{trailer} overcommits — and {leader} makes them pay!", tags: ["crowd_roar"] },
      { id: "m_mis_2", text: "A fatal lunge from {trailer}! {leader} seizes the opening instantly." },
      { id: "m_mis_3", text: "{trailer} reaches too far — the balance is gone!" },
      { id: "m_mis_4", text: "A momentary lapse from {trailer}, and {leader} is already capitalizing." },
      { id: "m_mis_5", text: "Costly mistake! {trailer} loses their center and the momentum swings." },
      { id: "m_mis_6", text: "{trailer} lunges forward and finds nothing — {leader} sidestepped!" },
      { id: "m_mis_7", text: "The error is small. The consequence is enormous. {leader} pounces." },
      { id: "m_mis_8", text: "{trailer} telegraphs the move and {leader} has read it perfectly." }
    ],
    tachiai_win: [
      { id: "m_tw_1", text: "The tachiai advantage is telling — {leader} has dictated the whole bout!" },
      { id: "m_tw_2", text: "{leader}'s first-step dominance is bearing fruit deep into the bout." },
      { id: "m_tw_3", text: "From that opening collision, {leader} has never let {trailer} get comfortable." },
      { id: "m_tw_4", text: "The momentum from the tachi-ai keeps paying dividends for {leader}." },
      { id: "m_tw_5", text: "That first-step win is still reverberating. {trailer} has been chasing ever since." },
      { id: "m_tw_6", text: "{leader} built the entire bout on the foundation of that opening hit." }
    ]
  },

  injury: {
    sprain: [
      { id: "inj_spr_1", text: "A nasty sprain slows the rikishi down." },
      { id: "inj_spr_2", text: "Medical staff diagnoses a debilitating sprain." },
      { id: "inj_spr_3", text: "A twisted limb results in a severe sprain." },
      { id: "inj_spr_4", text: "A sharp movement causes a sudden sprain." },
      { id: "inj_spr_5", text: "The grimace says it all — a painful sprain to the joint." },
      { id: "inj_spr_6", text: "He lands awkwardly and the ankle gives. The crowd goes quiet." },
      { id: "inj_spr_7", text: "A sprain to the lower limb. Not career-ending, but the damage is done today." }
    ],
    strain: [
      { id: "inj_str_1", text: "An overextension leads to a muscle strain." },
      { id: "inj_str_2", text: "The heavy lifting takes its toll with a deep strain." },
      { id: "inj_str_3", text: "A pulled muscle strains the rikishi's mobility." },
      { id: "inj_str_4", text: "The rikishi winces from a clear muscular strain." },
      { id: "inj_str_5", text: "A severe strain will require time off the dohyo." },
      { id: "inj_str_6", text: "Something pulls in the push — a strain that will linger." },
      { id: "inj_str_7", text: "The back seizes on the drive and the rikishi loses all power." }
    ],
    contusion: [
      { id: "inj_con_1", text: "A brutal impact leaves a deep contusion." },
      { id: "inj_con_2", text: "The rikishi sports a dark contusion from the collision." },
      { id: "inj_con_3", text: "A heavy blow results in a painful contusion." },
      { id: "inj_con_4", text: "Swelling and bruising mark a serious contusion." },
      { id: "inj_con_5", text: "The blunt force of the tachiai causes a contusion." },
      { id: "inj_con_6", text: "A deep bruise forms instantly where the blow landed." },
      { id: "inj_con_7", text: "The area swells immediately. It will be far worse in the morning." }
    ],
    inflammation: [
      { id: "inj_inf_1", text: "Chronic inflammation flares up unexpectedly." },
      { id: "inj_inf_2", text: "Severe inflammation limits the joint's movement." },
      { id: "inj_inf_3", text: "The rikishi is sidelined by painful inflammation." },
      { id: "inj_inf_4", text: "Wear and tear results in acute inflammation." },
      { id: "inj_inf_5", text: "Medical reports cite severe localized inflammation." },
      { id: "inj_inf_6", text: "An old inflammation site flares under the tournament's strain." },
      { id: "inj_inf_7", text: "The knee swells visibly. The inflammation is not new — but it is severe." }
    ],
    tear: [
      { id: "inj_tea_1", text: "A devastating muscle tear stops the rikishi in their tracks." },
      { id: "inj_tea_2", text: "A loud pop signals a serious ligament tear." },
      { id: "inj_tea_3", text: "The diagnosis is grim: a full tear requiring surgery." },
      { id: "inj_tea_4", text: "A partial tear will keep the rikishi out for weeks." },
      { id: "inj_tea_5", text: "The sheer force of the throw causes a tissue tear." },
      { id: "inj_tea_6", text: "An audible pop. The arena falls silent. This is serious." },
      { id: "inj_tea_7", text: "The tear is complete. Medical staff move swiftly. Everyone knows what it means." }
    ],
    fracture: [
      { id: "inj_fra_1", text: "A sickening crack confirms a bone fracture." },
      { id: "inj_fra_2", text: "The rikishi suffers a structural fracture." },
      { id: "inj_fra_3", text: "A heavy fall results in a clean fracture." },
      { id: "inj_fra_4", text: "X-rays reveal a hairline fracture." },
      { id: "inj_fra_5", text: "A brutal collision leaves the rikishi with a fracture." },
      { id: "inj_fra_6", text: "The sound that follows the fall is one nobody in the hall wants to hear." },
      { id: "inj_fra_7", text: "A fracture. The kind that ends tournaments and tests careers." }
    ],
    nerve: [
      { id: "inj_nrv_1", text: "A pinched nerve causes shooting pain down the limb." },
      { id: "inj_nrv_2", text: "Nerve damage leaves the rikishi with lingering numbness." },
      { id: "inj_nrv_3", text: "A jarring impact causes severe nerve irritation." },
      { id: "inj_nrv_4", text: "The rikishi loses grip strength due to a nerve issue." },
      { id: "inj_nrv_5", text: "A complex nerve injury complicates recovery." },
      { id: "inj_nrv_6", text: "The arm hangs differently. A nerve has been affected." },
      { id: "inj_nrv_7", text: "Numbness and weakness in the limb — a nerve injury that may take months." }
    ],
    unknown: [
      { id: "inj_unk_1", text: "The rikishi goes down with an unspecified injury." },
      { id: "inj_unk_2", text: "Medical staff is unsure of the exact nature of the injury." },
      { id: "inj_unk_3", text: "A mysterious ailment sidelines the rikishi." },
      { id: "inj_unk_4", text: "The injury details remain unclear at this time." },
      { id: "inj_unk_5", text: "An undisclosed injury forces a withdrawal." },
      { id: "inj_unk_6", text: "Something has gone wrong. The rikishi is down and the stable is silent." },
      { id: "inj_unk_7", text: "Medics attend to the rikishi. No announcement is made. The arena waits." }
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
      { id: "f_n_1",  text: "{winner} finishes it — {kimarite}!" },
      { id: "f_n_2",  text: "That's it! {winner} takes the bout by {kimarite}!", tags: ["crowd_roar"] },
      { id: "f_n_3",  text: "{winner} seals the deal — {kimarite}!" },
      { id: "f_n_4",  text: "A definitive finish! {winner} executes a perfect {kimarite}." },
      { id: "f_n_5",  text: "{winner} drives the advantage home, winning with {kimarite}!" },
      { id: "f_n_6",  text: "There's the climax — {winner} wins via {kimarite}!" },
      { id: "f_n_7",  text: "{loser} has no answer for the {kimarite} from {winner}!" },
      { id: "f_n_8",  text: "A textbook application of {kimarite} gives {winner} the victory!" },
      { id: "f_n_9",  text: "{winner} muscles {loser} over the edge with a powerful {kimarite}!" },
      { id: "f_n_10", text: "No escape for {loser}! {winner} ends it via {kimarite}." },
      { id: "f_n_11", text: "A brilliant {kimarite} execution from {winner} to secure the win!" },
      { id: "f_n_12", text: "{winner} powers through the defense, concluding with {kimarite}!" },
      { id: "f_n_13", text: "The bout concludes as {winner} forcefully delivers a {kimarite}." },
      { id: "f_n_14", text: "{winner} has done it. {kimarite}. The gyoji's fan points clearly." },
      { id: "f_n_15", text: "Clean and decisive — {winner} finishes with {kimarite} and there is no doubt." },
      { id: "f_n_16", text: "The win was built on patience. The finish was {kimarite}. Classic." },
      { id: "f_n_17", text: "{loser} is out! {winner} gets the decision — {kimarite}." },
      { id: "f_n_18", text: "{winner} completes the job with {kimarite}. A professional performance." },
      { id: "f_n_19", text: "The gyoji calls it. {winner} via {kimarite}. No argument from the judges." },
      { id: "f_n_20", text: "{winner} steers {loser} to the boundary and the {kimarite} does the rest." },
      { id: "f_n_21", text: "An absolute masterclass! {winner} ends the struggle with a breathtaking {kimarite}." },
      { id: "f_n_22", text: "{winner} channels every ounce of power into a devastating {kimarite} to seal the match." },
      { id: "f_n_23", text: "The technique is undeniable! {winner} completes the {kimarite} as the gyoji points the fan." }
    ],
    upset: [
      { id: "f_u_1",  text: "UPSET! {winner} shocks the arena with {kimarite}!", tags: ["upset", "crowd_roar"] },
      { id: "f_u_2",  text: "A stunner — {winner} steals it by {kimarite}!", tags: ["upset"] },
      { id: "f_u_3",  text: "Unbelievable! {winner} pulls off a massive upset with {kimarite}!", tags: ["upset"] },
      { id: "f_u_4",  text: "The crowd goes wild! An unexpected {kimarite} win for {winner}!", tags: ["upset", "crowd_roar"] },
      { id: "f_u_5",  text: "Against all odds, {winner} conquers {loser} by {kimarite}!", tags: ["upset"] },
      { id: "f_u_6",  text: "A gigantic upset! {winner} catches {loser} with {kimarite}.", tags: ["upset"] },
      { id: "f_u_7",  text: "Nobody saw that coming — {winner} uses {kimarite} to score the huge win!", tags: ["upset"] },
      { id: "f_u_8",  text: "A breathtaking upset! {winner} brings down the giant with {kimarite}!", tags: ["upset", "crowd_roar"] },
      { id: "f_u_9",  text: "{loser} looks stunned! {winner} snatches victory via {kimarite}!", tags: ["upset"] },
      { id: "f_u_10", text: "Defying all expectations, {winner} pulls out a {kimarite} win!", tags: ["upset"] },
      { id: "f_u_11", text: "A David vs. Goliath moment! {winner} achieves the impossible with {kimarite}!", tags: ["upset"] },
      { id: "f_u_12", text: "The arena is in shock! {winner} drops {loser} with a sudden {kimarite}!", tags: ["upset", "gasps"] },
      { id: "f_u_13", text: "Cushions in the air! {winner} topples the favourite with {kimarite}!", tags: ["upset", "crowd_roar"] },
      { id: "f_u_14", text: "A seismic result! Nobody in the Kokugikan believed this was possible.", tags: ["upset"] },
      { id: "f_u_15", text: "{winner} will remember this forever. {kimarite}. The upset is complete.", tags: ["upset"] }
    ],
    close_call: [
      { id: "f_c_1", text: "So close at the edge — but {winner} gets it by {kimarite}!", tags: ["close_call", "gasps"] },
      { id: "f_c_2", text: "A razor-thin finish! {winner} wins with {kimarite}!", tags: ["close_call"] },
      { id: "f_c_3", text: "It goes down to the wire, but {winner} manages a {kimarite}!", tags: ["close_call"] },
      { id: "f_c_4", text: "A breathless conclusion! {winner} barely pulls out the {kimarite}!", tags: ["close_call", "gasps"] },
      { id: "f_c_5", text: "The gyoji almost had to call a mono-ii, but {winner}'s {kimarite} was clean!", tags: ["close_call"] },
      { id: "f_c_6", text: "Narrowly escaping defeat, {winner} counters with {kimarite}!", tags: ["close_call"] },
      { id: "f_c_7", text: "A hair's breadth away from a loss, {winner} secures the {kimarite}.", tags: ["close_call"] },
      { id: "f_c_8", text: "The judges huddle. After a tense mono-ii, the {kimarite} is confirmed for {winner}.", tags: ["close_call", "mono_ii"] },
      { id: "f_c_9", text: "That had to go to review — but the decision stands. {winner}, {kimarite}.", tags: ["close_call"] },
      { id: "f_c_10", text: "Both men seemed to touch down simultaneously, but {winner} is awarded the {kimarite}.", tags: ["close_call", "gasps"] }
    ],
    kinboshi: [
      { id: "f_k_1", text: "KINBOSHI! {winner} claims a gold star with {kimarite}!", tags: ["kinboshi", "crowd_roar"] },
      { id: "f_k_2", text: "A gold star victory! {winner} defeats a Yokozuna by {kimarite}!", tags: ["kinboshi"] },
      { id: "f_k_3", text: "The Yokozuna falls! {winner} earns a kinboshi via {kimarite}!", tags: ["kinboshi"] },
      { id: "f_k_4", text: "History is made! {winner} topples the champion with {kimarite}.", tags: ["kinboshi"] },
      { id: "f_k_5", text: "A legendary moment as {winner} secures a kinboshi with {kimarite}!", tags: ["kinboshi"] },
      { id: "f_k_6", text: "The grand champion goes down! KINBOSHI for {winner} by {kimarite}!", tags: ["kinboshi", "crowd_roar"] },
      { id: "f_k_7", text: "A brilliant performance yields a gold star! {winner} wins by {kimarite}!", tags: ["kinboshi"] },
      { id: "f_k_8", text: "The zabuton rain begins! A kinboshi for {winner}! The Yokozuna has fallen!", tags: ["kinboshi", "crowd_roar"] },
      { id: "f_k_9", text: "{winner} will wear that gold star proudly. {kimarite}. The Yokozuna had no answer.", tags: ["kinboshi"] },
      { id: "f_k_10", text: "A moment that will echo through every tournament record. Kinboshi — {winner} over the Yokozuna.", tags: ["kinboshi"] }
    ]
  },

  tactical: {
    oshi_strategy: [
      { id: "tac_oshi_1", text: "📋 {leader}'s game plan: deny the belt, full forward pressure." },
      { id: "tac_oshi_2", text: "📋 {leader} comes in with a clear oshi strategy — no belt wrestling today." },
      { id: "tac_oshi_3", text: "📋 The commentators note {leader} is set up for relentless pushing." },
      { id: "tac_oshi_4", text: "📋 {leader} wants to keep both hands on {trailer}'s chest — pure oshi." },
      { id: "tac_oshi_5", text: "📋 Forward pressure is the order of the day for {leader}." },
      { id: "tac_oshi_6", text: "📋 No mawashi, no problem. {leader} has all the tools to win with thrusts alone." },
      { id: "tac_oshi_7", text: "📋 {leader} will stay tall and thrust. Don't expect any belt grabbing." }
    ],
    yotsu_strategy: [
      { id: "tac_yotsu_1", text: "📋 {leader}'s approach: get to the belt at all costs." },
      { id: "tac_yotsu_2", text: "📋 {leader} wants this on the mawashi — a patient belt-hunting plan." },
      { id: "tac_yotsu_3", text: "📋 Classic yotsu preparation from {leader} — absorb and grapple." },
      { id: "tac_yotsu_4", text: "📋 {leader} aims to establish migi-yotsu early — right hand inside." },
      { id: "tac_yotsu_5", text: "📋 The commentators see {leader} adjusting the mawashi — belt sumo on the menu." },
      { id: "tac_yotsu_6", text: "📋 {leader} is a grappler at heart. Get to the belt, drive, win." },
      { id: "tac_yotsu_7", text: "📋 The inside position is everything for {leader}. That's where this bout gets decided." }
    ],
    speedster_strategy: [
      { id: "tac_speed_1", text: "📋 {leader} will use footwork — movement sumo is the plan." },
      { id: "tac_speed_2", text: "📋 Quick feet, sharp angles — {leader} aims to stay mobile." },
      { id: "tac_speed_3", text: "📋 The commentators say {leader} will rely on lateral movement today." },
      { id: "tac_speed_4", text: "📋 {leader}'s game: don't stand still, don't let {trailer} square up." },
      { id: "tac_speed_5", text: "📋 Speed kills — {leader} plans to make {trailer} chase." },
      { id: "tac_speed_6", text: "📋 {leader} will circle, probe, and attack from unexpected angles." },
      { id: "tac_speed_7", text: "📋 If {leader} can stay on the move, {trailer}'s size advantage vanishes." }
    ],
    adaptive_strategy: [
      { id: "tac_ada_1", text: "📋 {leader} is playing it smart, adjusting to {trailer}'s every move." },
      { id: "tac_ada_2", text: "📋 High-IQ sumo from {leader} — a masterclass in adaptation." },
      { id: "tac_ada_3", text: "📋 {leader} has no fixed plan. The plan is to read and react." },
      { id: "tac_ada_4", text: "📋 Versatile and unpredictable — {leader} gives opponents no pattern to exploit." }
    ],
    blitzer_fatigue: [
      { id: "tac_blz_1", text: "📋 The high-octane start takes its toll — {leader} is slowing down." },
      { id: "tac_blz_2", text: "📋 {leader}'s explosive energy is waning... can they finish?" },
      { id: "tac_blz_3", text: "📋 The blitz strategy only works if the bout ends early. It hasn't." },
      { id: "tac_blz_4", text: "📋 {leader} burned hard out of the gate. The question now is reserves." }
    ],
    mountain_resilience: [
      { id: "tac_mtn_1", text: "📋 {leader} is an immovable object — absorbing everything {trailer} throws." },
      { id: "tac_mtn_2", text: "📋 Like a mountain, {leader} stands firm against the assault." },
      { id: "tac_mtn_3", text: "📋 The bigger they are, the longer the bout can last. {leader} counts on it." },
      { id: "tac_mtn_4", text: "📋 {leader}'s strategy is simple: take the hits, stay upright, and wait." }
    ],
    stalwart_counter: [
      { id: "tac_stw_1", text: "📋 {leader} is waiting for the mistake, coiled and ready to counter." },
      { id: "tac_stw_2", text: "📋 A defensive masterclass from {leader} — the counter-attack is coming." },
      { id: "tac_stw_3", text: "📋 {leader} gives ground deliberately. The trap will be sprung when the time is right." },
      { id: "tac_stw_4", text: "📋 Patience is the weapon. {leader} needs {trailer} to overcommit once." }
    ],
    trickster_agility: [
      { id: "tac_tri_1", text: "📋 {leader} is all smoke and mirrors — confusing {trailer} with lateral bursts." },
      { id: "tac_tri_2", text: "📋 Trickery and speed — {leader} is dissecting the opponent's balance." },
      { id: "tac_tri_3", text: "📋 {leader} will feint, pull, and redirect. {trailer} must not chase." },
      { id: "tac_tri_4", text: "📋 Unconventional is {leader}'s game. Expect the unexpected at every turn." }
    ]
  },

  connective: {
    short: [
      { id: "conn_1",  text: "Meanwhile…" },
      { id: "conn_2",  text: "Back on the clay…" },
      { id: "conn_3",  text: "The battle rages on…" },
      { id: "conn_4",  text: "And still they fight…" },
      { id: "conn_5",  text: "Neither man yields…" },
      { id: "conn_6",  text: "The dohyo demands more…" },
      { id: "conn_7",  text: "Seconds feel like minutes inside that ring…" },
      { id: "conn_8",  text: "The gyoji watches. The crowd watches. Nobody breathes." },
      { id: "conn_9",  text: "On the clay…" },
      { id: "conn_10", text: "Time stretches in the Kokugikan…" },
      { id: "conn_11", text: "They reset. The tension does not." },
      { id: "conn_12", text: "A moment of stillness before the next storm." },
      { id: "conn_13", text: "Neither willing to concede an inch…" },
      { id: "conn_14", text: "The bout goes on…" },
      { id: "conn_15", text: "Breathing hard. Still standing." }
    ]
  }
};
