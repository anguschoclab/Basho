// BoutCanvas barrel — implementation decomposed into boutCanvas/ directory.

export type { ReplayPhase, BodyPhase, Vec2, RikishiState, Particle } from "./boutCanvas/types";
export { PHASES, PHASE_LABELS, CROWD_TEXT } from "./boutCanvas/constants";
export { lerp, clamp, easeOut, easeInOut } from "./boutCanvas/math";
export {
  drawDohyo,
  drawRikishi,
  drawParticles,
  drawImpactFlash,
  drawCrowdAtmosphere,
  drawKimariteBanner,
  drawUpsetBanner,
} from "./boutCanvas/draw";
export { getTargetState, lerpState, getCrowdIntensity } from "./boutCanvas/animation";
export { getNarrationLines, getPhaseNarrationIndex } from "./boutCanvas/narration";
