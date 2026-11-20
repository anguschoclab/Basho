/**
 * geography.ts — prefecture → region mapping and basho host-city data.
 *
 * The home-region system (W E): rikishi `origin` is a prefecture (or a
 * foreign country), while `BashoInfo.location` is the host CITY. These
 * tables bridge the two so "home crowd" effects can be tiered:
 *   "home"   — origin is the host prefecture itself (Aichi at Nagoya)
 *   "region" — origin shares the host's wider region (Kumamoto at Fukuoka)
 */

export type HomeRegion =
  "kanto" | "kansai" | "chubu" | "kyushu" | "tohoku" | "hokkaido" | "chugoku" | "shikoku";

/** Prefecture name → its region. Okinawa groups with Kyushu. */
export const PREFECTURE_REGION: Record<string, HomeRegion> = {
  // Kantō
  Tokyo: "kanto",
  Kanagawa: "kanto",
  Saitama: "kanto",
  Chiba: "kanto",
  Ibaraki: "kanto",
  Tochigi: "kanto",
  Gunma: "kanto",
  Yamanashi: "kanto",
  // Kansai
  Osaka: "kansai",
  Kyoto: "kansai",
  Hyogo: "kansai",
  Nara: "kansai",
  Wakayama: "kansai",
  Shiga: "kansai",
  // Chūbu (Tōkai + Hokuriku + Kōshin)
  Aichi: "chubu",
  Gifu: "chubu",
  Shizuoka: "chubu",
  Mie: "chubu",
  Nagano: "chubu",
  Toyama: "chubu",
  Ishikawa: "chubu",
  Fukui: "chubu",
  Niigata: "chubu",
  // Kyūshū (incl. Okinawa — officially the Kyushu and Okinawa region)
  Fukuoka: "kyushu",
  Saga: "kyushu",
  Nagasaki: "kyushu",
  Kumamoto: "kyushu",
  Oita: "kyushu",
  Miyazaki: "kyushu",
  Kagoshima: "kyushu",
  Okinawa: "kyushu",
  // Tōhoku
  Aomori: "tohoku",
  Iwate: "tohoku",
  Miyagi: "tohoku",
  Akita: "tohoku",
  Yamagata: "tohoku",
  Fukushima: "tohoku",
  // Hokkaidō
  Hokkaido: "hokkaido",
  // Chūgoku
  Hiroshima: "chugoku",
  Okayama: "chugoku",
  Shimane: "chugoku",
  Tottori: "chugoku",
  Yamaguchi: "chugoku",
  // Shikoku
  Kagawa: "shikoku",
  Ehime: "shikoku",
  Tokushima: "shikoku",
  Kochi: "shikoku",
};

/**
 * Basho host city → { host prefecture, host region }.
 * The `location` strings are what `BASHO_CALENDAR[name].location` uses.
 */
export const BASHO_HOST: Record<string, { prefecture: string; region: HomeRegion }> = {
  Tokyo: { prefecture: "Tokyo", region: "kanto" },
  Osaka: { prefecture: "Osaka", region: "kansai" },
  Nagoya: { prefecture: "Aichi", region: "chubu" },
  Fukuoka: { prefecture: "Fukuoka", region: "kyushu" },
};

/** Display name for a region — used in narrative tokens. */
export const REGION_DISPLAY: Record<HomeRegion, string> = {
  kanto: "Kantō",
  kansai: "Kansai",
  chubu: "Chūbu",
  kyushu: "Kyūshū",
  tohoku: "Tōhoku",
  hokkaido: "Hokkaidō",
  chugoku: "Chūgoku",
  shikoku: "Shikoku",
};

// ── Bout-clone bonus magnitudes ──────────────────────────────────────────────

/** Mental-stat multiplier for a rikishi fighting in his home prefecture. */
export const HOMETOWN_MENTAL_BONUS_HOME = 0.03;

/** Mental-stat multiplier for a rikishi fighting in his home region. */
export const HOMETOWN_MENTAL_BONUS_REGION = 0.015;

// ── Dohyo (clay) condition — venue profiles (W J) ───────────────────────────

/**
 * Per-basho clay-condition weights: [firm, slick, heavy].
 * Commentary-informed: Kyushu's dry clay runs slick ("they water it"),
 * Nagoya's midsummer humidity packs heavy, Tokyo/Osaka mostly firm.
 */
export const DOHYO_WEIGHTS: Record<string, readonly [number, number, number]> = {
  hatsu: [0.6, 0.25, 0.15],
  haru: [0.55, 0.3, 0.15],
  natsu: [0.55, 0.25, 0.2],
  nagoya: [0.4, 0.15, 0.45],
  aki: [0.6, 0.25, 0.15],
  kyushu: [0.4, 0.5, 0.1],
};

/** Slick clay — footing slips: balance −8% (more slips/hands-down finishes). */
export const DOHYO_SLICK_BALANCE_PENALTY = 0.08;

/** Heavy clay — dead footing: speed −6%, stamina −4% (slower, tiring work). */
export const DOHYO_HEAVY_SPEED_PENALTY = 0.06;
export const DOHYO_HEAVY_STAMINA_PENALTY = 0.04;
