/** Manager career milestones — surfaced by projectManagerCareer. */
export interface CareerMilestoneDef {
  id: string;
  label: string;
  target: number;
}

export const CAREER_MILESTONES: CareerMilestoneDef[] = [
  { id: "first-sekitori", label: "First sekitori produced", target: 1 },
  { id: "first-yusho", label: "First yusho as oyakata", target: 1 },
  { id: "ten-sekitori", label: "10 sekitori produced", target: 10 },
  { id: "prestige-band", label: "Reach prestigious standing", target: 1 },
  { id: "board-seat", label: "Win a JSA board seat", target: 1 },
  { id: "chairman", label: "Become JSA chairman", target: 1 },
  { id: "legacy-tier", label: "Reach dynasty legacy", target: 1 },
];
