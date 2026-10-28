/** First-visit contextual hints for gated/complex systems (onboarding backlog #6). */
export interface OnboardingHint {
  id: string;
  title: string;
  body: string;
}

export const ONBOARDING_HINTS: Record<string, OnboardingHint> = {
  scouting: {
    id: "scouting",
    title: "Recruitment Scouting",
    body: "Hidden candidates reveal slowly — more scouts and a scouting office tighten your read on their true talent. Higher levels expose full stats.",
  },
  finances: {
    id: "finances",
    title: "Stable Finances",
    body: "Funds drain weekly through salaries, food, and facilities. Sponsor income and koenkai support grow with prestige — but three insolvencies and the board loses confidence.",
  },
  facilities: {
    id: "facilities",
    title: "Facilities",
    body: "Training, recovery, and nutrition upgrades change how fast rikishi develop and how often they get hurt. The scouting office improves opponent reads before bouts.",
  },
};
