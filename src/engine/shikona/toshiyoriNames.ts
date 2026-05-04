import { SeededRNG } from "@/engine/rng";

const TOSHIYORI_NAME_POOL: readonly string[] = [
  "Saganoumi", "Ryogoku", "Azumayama", "Shiranami", "Nishikido",
  "Kasugaumi", "Otodake", "Tomozuna", "Kumagatani", "Wakamatsu",
  "Kitazakura", "Minatogawa", "Onomatsu", "Tatsunami", "Musashigawa",
  "Narutoumi", "Hamanishiki", "Michinoku", "Nakamura", "Asahiyama",
  "Izutsu", "Kitanoumi", "Kagamiyama", "Isenoumi", "Hatachiyama",
  "Oitekaze", "Sanoyama", "Fujishima", "Kataonami", "Nishimonai",
];

const GEO_PREFIXES: readonly string[] = [
  "Nishi", "Higashi", "Kita", "Minami", "Aze",
  "Mino", "Ise", "Tosa", "Kaga", "Bizen",
];

const NATURE_SUFFIXES: readonly string[] = [
  "noumi", "yama", "nishiki", "hama", "zaka",
  "gawa", "take", "shima", "ura", "zeki",
];

const CLASSICAL_COMPOUNDS: readonly string[] = [
  "Kitanofuji", "Wakachiyo", "Tochinishiki", "Harunoyama",
  "Narutaki", "Aoiyama", "Irodori", "Masuiyama",
];

/** Generate a plausible toshiyori (sumo elder) name using seeded RNG. */
export function generateToshiyoriName(rng: SeededRNG): string {
  const roll = rng.next();
  if (roll < 0.50) {
    const prefix = GEO_PREFIXES[rng.int(0, GEO_PREFIXES.length - 1)];
    const suffix = NATURE_SUFFIXES[rng.int(0, NATURE_SUFFIXES.length - 1)];
    return prefix + suffix;
  }
  if (roll < 0.85) {
    return TOSHIYORI_NAME_POOL[rng.int(0, TOSHIYORI_NAME_POOL.length - 1)];
  }
  return CLASSICAL_COMPOUNDS[rng.int(0, CLASSICAL_COMPOUNDS.length - 1)];
}
