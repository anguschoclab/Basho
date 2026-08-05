/**
 * GlossaryService.ts
 *
 * Provides sumo terminology definitions for the glossary page and in-game tooltips.
 */

export interface GlossaryTerm {
  id: string;
  term: string;
  termJa: string;
  category:
    | "rank"
    | "technique"
    | "structure"
    | "culture"
    | "tournament"
    | "attire"
    | "ceremony"
    | "officials";
  definition: string;
}

const GLOSSARY_TERMS: GlossaryTerm[] = [
  // Ranks
  {
    id: "yokozuna",
    term: "Yokozuna",
    termJa: "横綱",
    category: "rank",
    definition:
      "The highest rank in sumo. A yokozuna is a grand champion who cannot be demoted and is expected to retire if performance falters.",
  },
  {
    id: "ozeki",
    term: "Ozeki",
    termJa: "大関",
    category: "rank",
    definition:
      "The second-highest rank. An ozeki must win at least 8 bouts per tournament or face demotion (kadoban).",
  },
  {
    id: "sanyaku",
    term: "San'yaku",
    termJa: "三役",
    category: "rank",
    definition:
      "The three champion ranks below ozeki: sekiwake, komusubi, and (historically) the ozeki themselves.",
  },
  {
    id: "maegashira",
    term: "Maegashira",
    termJa: "幕下",
    category: "rank",
    definition:
      "The majority of makuuchi rikishi, ranked below the san'yaku. Numbered 1–17 from top to bottom.",
  },
  {
    id: "makuuchi",
    term: "Makuuchi",
    termJa: "幕内",
    category: "rank",
    definition:
      "The top division of professional sumo, featuring 42 rikishi including yokozuna, ozeki, and maegashira.",
  },
  {
    id: "juryo",
    term: "Juryo",
    termJa: "十両",
    category: "rank",
    definition: "The second division. Rikishi in juryo are salaried professionals (sekitori).",
  },
  {
    id: "sekitori",
    term: "Sekitori",
    termJa: "関取",
    category: "rank",
    definition:
      "A salaried rikishi in the top two divisions (makuuchi or juryo). The gateway to professional status.",
  },
  {
    id: "banzuke",
    term: "Banzuke",
    termJa: "番付",
    category: "rank",
    definition:
      "The official ranking list of all professional rikishi, published before each tournament.",
  },

  // Tournament
  {
    id: "basho",
    term: "Basho",
    termJa: "場所",
    category: "tournament",
    definition: "A grand tournament. Six official basho are held each year, lasting 15 days each.",
  },
  {
    id: "yusho",
    term: "Yusho",
    termJa: "優勝",
    category: "tournament",
    definition:
      "The tournament championship awarded to the rikishi with the best win-loss record at a basho.",
  },
  {
    id: "zensho",
    term: "Zensho",
    termJa: "全勝",
    category: "tournament",
    definition:
      "A perfect 15-0 tournament record. A zensho-yusho is a championship won with no losses.",
  },
  {
    id: "kadoban",
    term: "Kadoban",
    termJa: "角番",
    category: "tournament",
    definition:
      "An ozeki who has lost more than 7 bouts in the previous tournament and must win at least 8 in the current one to avoid demotion.",
  },
  {
    id: "kyujo",
    term: "Kyujo",
    termJa: "休場",
    category: "tournament",
    definition:
      "Absence from a tournament due to injury or illness. A kyujo results in an automatic loss for each day missed.",
  },

  // Technique
  {
    id: "tachiai",
    term: "Tachiai",
    termJa: "立合い",
    category: "technique",
    definition:
      "The initial charge at the start of a bout. A strong tachiai is critical for gaining early advantage.",
  },
  {
    id: "kimarite",
    term: "Kimarite",
    termJa: "決まり手",
    category: "technique",
    definition:
      "The winning technique used to decide a bout. The Japan Sumo Association recognizes 82 official kimarite.",
  },
  {
    id: "dohyo",
    term: "Dohyo",
    termJa: "土俵",
    category: "technique",
    definition:
      "The clay ring where bouts are fought. A rikishi loses if forced out of the dohyo or if any part of their body other than the soles of their feet touches the ground.",
  },

  // Structure
  {
    id: "heya",
    term: "Heya",
    termJa: "部屋",
    category: "structure",
    definition:
      "A sumo stable. Rikishi live and train together under the guidance of an oyakata (stablemaster).",
  },
  {
    id: "ichimon",
    term: "Ichimon",
    termJa: "一門",
    category: "structure",
    definition:
      "A faction of stables. Five ichimon exist, providing political alliances, mutual support, and training cooperation.",
  },
  {
    id: "oyakata",
    term: "Oyakata",
    termJa: "親方",
    category: "structure",
    definition:
      "A stablemaster. Former rikishi who have acquired elder stock (myoseki) and run a heya.",
  },
  {
    id: "shikona",
    term: "Shikona",
    termJa: "四股名",
    category: "structure",
    definition:
      "A rikishi's ring name, distinct from their legal name. Shikona often reflect the heya's naming traditions.",
  },

  // Culture
  {
    id: "koenkai",
    term: "Koenkai",
    termJa: "後援会",
    category: "culture",
    definition:
      "A support group or fan club that provides financial backing to a heya. Koenkai are essential for stable finances.",
  },

  // ── Additional rank terms ──
  {
    id: "sekiwake",
    term: "Sekiwake",
    termJa: "関脇",
    category: "rank",
    definition:
      "The third-highest rank in sumo, below ozeki. Sekiwake must win at least 8 bouts to maintain rank.",
  },
  {
    id: "komusubi",
    term: "Komusubi",
    termJa: "小結",
    category: "rank",
    definition:
      "The fourth-highest rank, below sekiwake. Komusubi face the toughest opponents early in a tournament.",
  },
  {
    id: "makushita",
    term: "Makushita",
    termJa: "幕下",
    category: "rank",
    definition:
      "The third division, below juryo. Makushita rikishi are unsalaried and aim for promotion to sekitori status.",
  },
  {
    id: "sandanme",
    term: "Sandanme",
    termJa: "三段目",
    category: "rank",
    definition:
      "The fourth division. Rikishi here are in the early stages of their professional development.",
  },
  {
    id: "jonidan",
    term: "Jonidan",
    termJa: "序二段",
    category: "rank",
    definition:
      "The fifth division, above only jonokuchi. Most new entrants begin here or in jonokuchi.",
  },
  {
    id: "jonokuchi",
    term: "Jonokuchi",
    termJa: "序ノ口",
    category: "rank",
    definition:
      "The lowest division in professional sumo, where new rikishi typically start their careers.",
  },

  // ── Additional tournament terms ──
  {
    id: "honbasho",
    term: "Honbasho",
    termJa: "本場所",
    category: "tournament",
    definition:
      "One of the six official grand tournaments held each year, as opposed to regional exhibition basho.",
  },
  {
    id: "senshuraku",
    term: "Senshūraku",
    termJa: "千秋楽",
    category: "tournament",
    definition: "The final day of a basho. The championship is often decided on this day.",
  },
  {
    id: "kachi-koshi",
    term: "Kachi-koshi",
    termJa: "勝ち越し",
    category: "tournament",
    definition:
      "A winning record in a tournament (more than 8 wins in a 15-day basho). Secures promotion.",
  },
  {
    id: "make-koshi",
    term: "Make-koshi",
    termJa: "負け越し",
    category: "tournament",
    definition: "A losing record in a tournament (fewer than 8 wins). Results in demotion.",
  },
  {
    id: "kinboshi",
    term: "Kinboshi",
    termJa: "金星",
    category: "tournament",
    definition:
      'A "gold star" awarded to a maegashira who defeats a yokozuna. A career-highlight achievement.',
  },
  {
    id: "nakabi",
    term: "Nakabi",
    termJa: "中日",
    category: "tournament",
    definition:
      "The middle day (Day 8) of a 15-day basho, when the tournament's direction often becomes clear.",
  },
  {
    id: "yaocho",
    term: "Yaochō",
    termJa: "八百長",
    category: "tournament",
    definition:
      "Match-fixing, a serious violation that has led to expulsions from professional sumo.",
  },
  {
    id: "mochikyukin",
    term: "Mochikyūkin",
    termJa: "持給金",
    category: "tournament",
    definition:
      "A cumulative bonus system for sekitori, paid based on tournament performance and longevity.",
  },
  {
    id: "sansho",
    term: "Sanshō",
    termJa: "三賞",
    category: "tournament",
    definition:
      "The three special prizes awarded at each honbasho: Outstanding Performance, Fighting Spirit, and Technique.",
  },
  {
    id: "maezumo",
    term: "Maezumō",
    termJa: "前相撲",
    category: "tournament",
    definition:
      "Preliminary bouts for new or low-ranked rikishi, held before the main schedule.",
  },
  {
    id: "kachi-nokori",
    term: "Kachi-nokori",
    termJa: "勝ち残り",
    category: "tournament",
    definition:
      "The surplus of wins above 8 in a basho, contributing to promotion and mochikyūkin bonuses.",
  },

  // ── Additional technique terms ──
  {
    id: "shiko",
    term: "Shiko",
    termJa: "四股",
    category: "technique",
    definition:
      "The ceremonial leg-lift-and-stomp exercise. Builds balance, flexibility, and leg strength.",
  },
  {
    id: "henka",
    term: "Henka",
    termJa: "変化",
    category: "technique",
    definition:
      "A sidestep at the tachiai to evade the opponent's charge. Effective but often frowned upon.",
  },
  {
    id: "tsuppari",
    term: "Tsuppari",
    termJa: "突っ張り",
    category: "technique",
    definition:
      "Rapid open-palm thrusting strikes, typically to the opponent's chest or face.",
  },
  {
    id: "yotsu-zumo",
    term: "Yotsu-zumō",
    termJa: "四つ相撲",
    category: "technique",
    definition:
      "Belt-fighting style focused on securing a grip on the mawashi and controlling the opponent.",
  },
  {
    id: "oshi-zumo",
    term: "Oshi-zumō",
    termJa: "押し相撲",
    category: "technique",
    definition:
      "Pushing/thrusting style that avoids belt grips in favor of driving the opponent back.",
  },
  {
    id: "kinjite",
    term: "Kinjite",
    termJa: "禁じ手",
    category: "technique",
    definition:
      "Forbidden techniques that result in disqualification, such as hair-pulling, eye-gouging, or choking.",
  },
  {
    id: "shini-tai",
    term: "Shini-tai",
    termJa: "死に体",
    category: "technique",
    definition:
      '"Dead body" — when a rikishi is falling and has no control, used to determine the loser in close calls.',
  },
  {
    id: "nekodamashi",
    term: "Nekodamashi",
    termJa: "猫騙し",
    category: "technique",
    definition: "A clapping feint at the tachiai to startle the opponent. Rare and unorthodox.",
  },
  {
    id: "hatakikomi",
    term: "Hatakikomi",
    termJa: "叩き込み",
    category: "technique",
    definition:
      "A slap-down technique, using the opponent's forward momentum against them.",
  },
  {
    id: "hikiotoshi",
    term: "Hikiotoshi",
    termJa: "引き落とし",
    category: "technique",
    definition:
      "A hand pull-down, grabbing the opponent's arm or neck and pulling them to the clay.",
  },
  {
    id: "uwatenage",
    term: "Uwatenage",
    termJa: "上手投げ",
    category: "technique",
    definition: "An overarm throw using an outside belt grip to hurl the opponent.",
  },
  {
    id: "sukuinage",
    term: "Sukuinage",
    termJa: "掬い投げ",
    category: "technique",
    definition: "A beltless arm throw, scooping under the opponent's arm to toss them.",
  },
  {
    id: "shitatenage",
    term: "Shitatenage",
    termJa: "下手投げ",
    category: "technique",
    definition: "An underarm throw using an inside belt grip to pivot the opponent down.",
  },

  // ── Additional structure terms ──
  {
    id: "keikoba",
    term: "Keikoba",
    termJa: "稽古場",
    category: "structure",
    definition:
      "The training hall within a heya where rikishi practice. The heart of daily stable life.",
  },
  {
    id: "tsukebito",
    term: "Tsukebito",
    termJa: "付け人",
    category: "structure",
    definition:
      "A personal attendant assigned to a sekitori, handling daily chores and preparation.",
  },
  {
    id: "ototodeshi",
    term: "Otōtodeshi",
    termJa: "弟弟子",
    category: "structure",
    definition:
      "Junior disciples who perform household duties in exchange for training and lodging.",
  },
  {
    id: "toshiyori",
    term: "Toshiyori",
    termJa: "年寄",
    category: "structure",
    definition:
      "A sumo elder who has retired from active competition and holds elder stock to run a heya.",
  },
  {
    id: "toshiyori-kabu",
    term: "Toshiyori Kabu",
    termJa: "年寄株",
    category: "structure",
    definition:
      "Elder stock — a limited number of elder names that must be acquired to become an oyakata.",
  },
  {
    id: "myoseki",
    term: "Myoseki",
    termJa: "名跡",
    category: "structure",
    definition:
      "The elder name associated with a toshiyori kabu. Passing a myoseki is a formal succession process.",
  },

  // ── Additional culture terms ──
  {
    id: "chankonabe",
    term: "Chankonabe",
    termJa: "ちゃんこ鍋",
    category: "culture",
    definition:
      "The protein-rich hotpot stew central to a rikishi's diet, cooked communally in the heya.",
  },
  {
    id: "chikara-mizu",
    term: "Chikara-mizu",
    termJa: "力水",
    category: "culture",
    definition:
      '"Power water" drank by a rikishi before a bout, passed by the previous winner.',
  },
  {
    id: "chikara-gami",
    term: "Chikara-gami",
    termJa: "力紙",
    category: "culture",
    definition:
      '"Power paper" — tissues used to wipe the face before a bout, part of the pre-bout ritual.',
  },
  {
    id: "kagami-mochi",
    term: "Kagami-mochi",
    termJa: "鏡餅",
    category: "culture",
    definition: "Mirror-shaped rice cakes offered during New Year celebrations in the heya.",
  },
  {
    id: "kakegoe",
    term: "Kakegoe",
    termJa: "掛け声",
    category: "culture",
    definition:
      "The rhythmic shouts and calls from the crowd during bouts, a hallmark of sumo atmosphere.",
  },
  {
    id: "sumo-ji",
    term: "Sumō-ji",
    termJa: "相撲字",
    category: "culture",
    definition:
      "The distinctive calligraphic style used to write banzuke and official sumo documents.",
  },
  {
    id: "edomoji",
    term: "Edomoji",
    termJa: "江戸文字",
    category: "culture",
    definition:
      "A brush calligraphy style used for sumo signage, banners, and formal announcements.",
  },
  {
    id: "binzuke",
    term: "Binzuke",
    termJa: "鬢付け",
    category: "culture",
    definition:
      "The hairdressing process using binzuke wax to style a rikishi's topknot.",
  },
  {
    id: "kohaku-maku",
    term: "Kōhaku Maku",
    termJa: "紅白幕",
    category: "culture",
    definition:
      "The red-and-white curtain hung around the dohyo, symbolizing the sacred boundary.",
  },
  {
    id: "gomenfuda",
    term: "Gomenfuda",
    termJa: "御免札",
    category: "culture",
    definition:
      "Apology placards displayed by stables that cannot field a full roster for a basho.",
  },
  {
    id: "soppugata",
    term: "Soppugata",
    termJa: "そっぽ型",
    category: "culture",
    definition:
      "A dismissive attitude where a rikishi turns away from the opponent at the tachiai.",
  },
  {
    id: "ankogata",
    term: "Ankogata",
    termJa: "あんこ型",
    category: "culture",
    definition: "A heavy, immobile fighting build relying on mass rather than agility.",
  },

  // ── Attire (new category) ──
  {
    id: "mawashi",
    term: "Mawashi",
    termJa: "廻し",
    category: "attire",
    definition:
      "The heavy silk belt worn during bouts, the primary grip target in yotsu-zumō.",
  },
  {
    id: "kesho-mawashi",
    term: "Keshō-mawashi",
    termJa: "化粧廻し",
    category: "attire",
    definition:
      "The ornamental ceremonial apron worn during the dohyō-iri entrance ceremony.",
  },
  {
    id: "chonmage",
    term: "Chonmage",
    termJa: "丁髷",
    category: "attire",
    definition: "The traditional topknot hairstyle worn by all professional rikishi.",
  },
  {
    id: "oichomage",
    term: "Ōichomage",
    termJa: "大銀杏",
    category: "attire",
    definition:
      "The elaborate ginkgo-leaf topknot worn only by sekitori during tournaments.",
  },
  {
    id: "fundoshi",
    term: "Fundoshi",
    termJa: "褌",
    category: "attire",
    definition: "The traditional Japanese undergarment worn beneath the mawashi.",
  },
  {
    id: "yukata",
    term: "Yukata",
    termJa: "浴衣",
    category: "attire",
    definition: "The casual cotton kimono worn by rikishi around the heya and in public.",
  },
  {
    id: "katahada",
    term: "Katahada",
    termJa: "肩肌",
    category: "attire",
    definition: "The bare-shoulder look when one side of the mawashi is dropped during a bout.",
  },

  // ── Ceremony (new category) ──
  {
    id: "dohyo-iri",
    term: "Dohyō-iri",
    termJa: "土俵入り",
    category: "ceremony",
    definition:
      "The ring-entering ceremony performed by yokozuna and other ranked rikishi before bouts.",
  },
  {
    id: "danpatsu-shiki",
    term: "Danpatsu-shiki",
    termJa: "断髪式",
    category: "ceremony",
    definition:
      "The retirement topknot-cutting ceremony, marking a rikishi's formal exit from competition.",
  },
  {
    id: "yumitori-shiki",
    term: "Yumitori-shiki",
    termJa: "弓取式",
    category: "ceremony",
    definition:
      "The bow-twirling ceremony performed by a designated yobidashi at the end of each basho day.",
  },
  {
    id: "dohyo-matsuri",
    term: "Dohyō Matsuri",
    termJa: "土俵祭り",
    category: "ceremony",
    definition:
      "The Shinto purification ceremony consecrating the dohyō before a basho begins.",
  },
  {
    id: "kanreki-dohyo-iri",
    term: "Kanreki Dohyō-iri",
    termJa: "還暦土俵入り",
    category: "ceremony",
    definition:
      "A special dohyō-iri performed by a yokozuna celebrating 60 years of age, wearing a red mawashi.",
  },
  {
    id: "tenran-zumo",
    term: "Tenran-zumō",
    termJa: "天覧相撲",
    category: "ceremony",
    definition: "Sumo performed before the Emperor, a rare and prestigious honor.",
  },
  {
    id: "shimenawa",
    term: "Shimenawa",
    termJa: "注連縄",
    category: "ceremony",
    definition: "The sacred rope marking the dohyō as a consecrated Shinto space.",
  },
  {
    id: "shide",
    term: "Shide",
    termJa: "紙垂",
    category: "ceremony",
    definition: "The zigzag paper streamers attached to the shimenawa, signifying purity.",
  },
  {
    id: "fure-daiko",
    term: "Fure-daiko",
    termJa: "触れ太鼓",
    category: "ceremony",
    definition: "The announcement drum beaten by a yobidashi to call rikishi to the dohyō.",
  },
  {
    id: "hyoshigi",
    term: "Hyōshigi",
    termJa: "拍子木",
    category: "ceremony",
    definition: "Wooden clappers struck by a yobidashi to announce the start of each bout.",
  },
  {
    id: "kore-yori-sanyaku",
    term: "Kore Yori San'yaku",
    termJa: "これより三役",
    category: "ceremony",
    definition:
      "The announcement before the san'yaku bouts begin, signaling the day's featured matchups.",
  },

  // ── Officials (new category) ──
  {
    id: "gyoji",
    term: "Gyōji",
    termJa: "行司",
    category: "officials",
    definition:
      "The referee who officiates bouts, dressed in traditional court attire, using a gunbai.",
  },
  {
    id: "shimpan",
    term: "Shimpan",
    termJa: "審判",
    category: "officials",
    definition:
      "The judges who sit around the dohyō and review disputed decisions via mono-ii.",
  },
  {
    id: "yobidashi",
    term: "Yobidashi",
    termJa: "呼出",
    category: "officials",
    definition:
      "The announcer who calls rikishi to the dohyō, beats the fure-daiko, and performs other duties.",
  },
  {
    id: "tokoyama",
    term: "Tokoyama",
    termJa: "床山",
    category: "officials",
    definition:
      "The hairdresser who styles rikishi's chonmage and ōichomage topknots.",
  },
  {
    id: "tachimochi",
    term: "Tachimochi",
    termJa: "太刀持ち",
    category: "officials",
    definition:
      "The sword-bearer in a yokozuna's dohyō-iri, a senior rikishi from the same heya or ichimon.",
  },
  {
    id: "tsuyuharai",
    term: "Tsuyuharai",
    termJa: "露払い",
    category: "officials",
    definition:
      "The dew-sweeper in a yokozuna's dohyō-iri, leading the procession and clearing the path.",
  },
  {
    id: "gunbai",
    term: "Gunbai",
    termJa: "軍配",
    category: "officials",
    definition: "The war-fan used by the gyōji to signal the winner of a bout.",
  },
  {
    id: "mono-ii",
    term: "Mono-ii",
    termJa: "物言い",
    category: "officials",
    definition:
      "A conference of shimpan to review a disputed gyōji decision, held on the dohyō.",
  },
];

export const GlossaryService = {
  all(): GlossaryTerm[] {
    return GLOSSARY_TERMS;
  },

  byId(id: string): GlossaryTerm | undefined {
    return GLOSSARY_TERMS.find((t) => t.id === id);
  },

  byCategory(category: GlossaryTerm["category"]): GlossaryTerm[] {
    return GLOSSARY_TERMS.filter((t) => t.category === category);
  },

  search(query: string): GlossaryTerm[] {
    if (!query) return GLOSSARY_TERMS;
    const q = query.toLowerCase();
    return GLOSSARY_TERMS.filter(
      (t) =>
        t.term.toLowerCase().includes(q) ||
        t.termJa.includes(query) ||
        t.definition.toLowerCase().includes(q)
    );
  },
};
