export const JAPANESE_PREFECTURES = [
  'Aichi', 'Akita', 'Aomori', 'Chiba', 'Ehime', 'Fukui', 'Fukuoka', 'Fukushima',
  'Gifu', 'Gunma', 'Hiroshima', 'Hokkaido', 'Hyogo', 'Ibaraki', 'Ishikawa', 'Iwate',
  'Kagawa', 'Kagoshima', 'Kanagawa', 'Kochi', 'Kumamoto', 'Kyoto', 'Mie', 'Miyagi',
  'Miyazaki', 'Nagano', 'Nagasaki', 'Nara', 'Niigata', 'Oita', 'Okayama', 'Okinawa',
  'Osaka', 'Saga', 'Saitama', 'Shiga', 'Shimane', 'Shizuoka', 'Tochigi', 'Tokushima',
  'Tokyo', 'Tottori', 'Toyama', 'Wakayama', 'Yamagata', 'Yamaguchi', 'Yamanashi'
];

export const SUMO_HOTBEDS = [
  'Aomori', 'Hokkaido', 'Akita', 'Oita', 'Mongolia', 'Georgia', 'Egypt'
];

export function getRandomOrigin(rng: () => number): string {
  const isForeign = rng() < 0.15; // 15% chance of foreign recruit
  if (isForeign) {
    const foreigners = ['Mongolia', 'Georgia', 'Egypt', 'USA', 'Brazil', 'Kazakhstan'];
    return foreigners[Math.floor(rng() * foreigners.length)];
  }
  
  const isHotbed = rng() < 0.3;
  if (isHotbed) {
    return SUMO_HOTBEDS[Math.floor(rng() * SUMO_HOTBEDS.length)];
  }

  return JAPANESE_PREFECTURES[Math.floor(rng() * JAPANESE_PREFECTURES.length)];
}
