/**
 * shikona/constants.ts
 *
 * Constants for shikona generation system.
 */

export const SHIKONA_PREFIXES = {
  power: [
    "Taka",
    "Waka",
    "Dai",
    "Oo",
    "Ko",
    "Sei",
    "Ryu",
    "Rai",
    "Tetsu",
    "Go",
    "Yu",
    "Shin",
    "Ken",
    "Kyo",
    "So",
  ],
  nature: [
    "Asa",
    "Nishi",
    "Higa",
    "Aki",
    "Fuyu",
    "Haru",
    "Natsu",
    "Kaze",
    "Yama",
    "Umi",
    "Tani",
    "Mori",
    "Hana",
    "Tsuki",
  ],
  tradition: [
    "Tochi",
    "Haku",
    "Kai",
    "Koto",
    "Miya",
    "Mitake",
    "Kiyo",
    "Sada",
    "Teru",
    "Ichi",
    "Ao",
    "Kiri",
    "Tama",
    "Ura",
  ],
  regional: [
    "Endo",
    "Ono",
    "Namba",
    "Chiya",
    "Tobi",
    "Sho",
    "Masa",
    "Tomo",
    "Hide",
    "Kise",
    "Ama",
    "Kak",
    "Hiro",
  ],
} as const;

export const SHIKONA_SUFFIXES = {
  mountain: ["yama", "zan", "take", "mine", "iwa", "shima", "ishi"],
  water: ["umi", "nami", "kawa", "ryu", "taki", "mizu"],
  sky: ["kaze", "arashi", "sora", "kumo", "tora"],
  flora: ["fuji", "sakura", "hana", "take", "matsu", "ume"],
  noble: ["sho", "nishiki", "ho", "omi", "sei", "ryu"],
  endings: ["noshin", "maru", "shu", "ho", "waka"],
} as const;

export const PRESTIGIOUS_FULL_NAMES = [
  "Hakuryu",
  "Kaio",
  "Takanofuji",
  "Wakatora",
  "Asashoryu",
  "Kotoshogiku",
  "Tochishima",
  "Terunofuji",
  "Mitakeumi",
  "Ichinojo",
  "Aoiyama",
  "Kirishima",
  "Tamanoshima",
] as const;

export const NATIONALITY_PREFIXES: Record<string, string[]> = {
  Mongolia: ["Teru", "Haku", "Ichi", "Ao", "Ryu", "Dai"],
  Georgia: ["Tochi", "Gaga", "Koto", "Koko"],
  Bulgaria: ["Ao", "Koto", "Bara"],
  USA: ["Musa", "Aka", "Taka", "Dai"],
  Brazil: ["Kai", "Asa", "Sho"],
  Egypt: ["Oo", "Sada", "Osa"],
  default: ["Taka", "Waka", "Asa", "Koto", "Tochi", "Haku", "Kai"],
};

export const BASE_PATTERN_WEIGHTS = {
  "nat+terrain": 18,
  "power+any": 18,
  "nature+noble": 16,
  "tradition+flora": 14,
  "regional+ending": 10,
  "cat+cat": 18,
  triple: 6,
} as const;
