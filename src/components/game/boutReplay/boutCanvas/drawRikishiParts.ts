/**
 * drawRikishiParts.ts
 *
 * Sub-passes of drawRikishi — pose computation (per-bodyPhase limb angles),
 * body (shadow/legs/torso/mawashi), arms, head, and rank label. Geometry
 * values are verbatim from draw.ts.
 */

import type { RikishiState } from "./types";
import type { BoutAnimationFamily } from "@/presenters/engineAccess";
import type { UIRikishi } from "@/presenters/uiModels";
import { clamp } from "./math";
import { BOUT_FIGURE_COLORS } from "@/constants/ui/drawingPalette";

/** Computed limb/body offsets for one rikishi pose. */
export interface RikishiPose {
  bdy: number;
  bdx: number;
  legSpread: number;
  lArmAng: number;
  rArmAng: number;
  lLegAng: number;
  rLegAng: number;
}

/** Compute limb angles and offsets from the animation body phase. */
export function computePose(
  state: RikishiState,
  isEast: boolean,
  S: number,
  family?: BoutAnimationFamily,
  isLoser?: boolean
): RikishiPose {
  let bdy = 0,
    bdx = 0;
  let legSpread = S * 0.42;
  let lArmAng = 0,
    rArmAng = 0,
    lLegAng = 0,
    rLegAng = 0;

  switch (state.bodyPhase) {
    case "bowing":
      bdy = S * 0.15;
      lArmAng = 20;
      rArmAng = -20;
      break;
    case "charging":
      bdx = isEast ? S * 0.18 : -S * 0.18;
      bdy = S * 0.05;
      legSpread = S * 0.52;
      lArmAng = isEast ? -15 : 15;
      rArmAng = isEast ? -15 : 15;
      lLegAng = 15;
      rLegAng = -15;
      break;
    case "grappling":
      lArmAng = isEast ? 35 : -35;
      rArmAng = isEast ? 25 : -25;
      legSpread = S * 0.48;
      break;
    case "pushing":
      bdx = isEast ? S * 0.22 : -S * 0.22;
      bdy = S * 0.06;
      lArmAng = isEast ? 20 : -20;
      rArmAng = isEast ? 20 : -20;
      legSpread = S * 0.52;
      lLegAng = 10;
      rLegAng = -10;
      break;
    case "throwing":
      bdx = isEast ? S * 0.1 : -S * 0.1;
      lArmAng = isEast ? 55 : -20;
      rArmAng = isEast ? 20 : -55;
      legSpread = S * 0.45;
      break;
    case "thrown":
      legSpread = S * 0.28;
      bdy = S * 0.05;
      lArmAng = isEast ? -60 : 60;
      rArmAng = isEast ? -60 : 60;
      break;
    case "gripping":
      bdx = isEast ? S * 0.16 : -S * 0.16;
      bdy = S * 0.08;
      lArmAng = isEast ? 40 : -40;
      rArmAng = isEast ? 30 : -30;
      legSpread = S * 0.5;
      lLegAng = 12;
      rLegAng = -12;
      break;
    case "falling":
      legSpread = S * 0.3;
      bdy = S * 0.1;
      break;
    case "victory":
      lArmAng = isEast ? -70 : 70;
      rArmAng = isEast ? 20 : -20;
      legSpread = S * 0.38;
      break;
    default:
      legSpread = S * 0.38;
  }

  // Family-specific pose overlays for thrown/falling losers and gripping winners
  if (family && isLoser && (state.bodyPhase === "thrown" || state.bodyPhase === "falling")) {
    if (family === "pull") {
      lArmAng = isEast ? 50 : -50;
      rArmAng = isEast ? 50 : -50;
    }
    if (family === "lift") {
      legSpread = S * 0.22;
      bdy = S * 0.18;
    }
  }
  if (family === "force_out" && !isLoser && state.bodyPhase === "gripping") {
    lArmAng = isEast ? 50 : -50;
    rArmAng = isEast ? 38 : -38;
  }

  return { bdy, bdx, legSpread, lArmAng, rArmAng, lLegAng, rLegAng };
}

/** Shadow, legs, torso, and mawashi. */
export function drawBody(
  ctx: CanvasRenderingContext2D,
  pose: RikishiPose,
  S: number,
  skin: string,
  mawashi: string,
  mawashiAccent: string
) {
  const { bdy, bdx, legSpread, lLegAng, rLegAng } = pose;

  ctx.fillStyle = BOUT_FIGURE_COLORS.bodyShadow;
  ctx.beginPath();
  ctx.ellipse(bdx, S * 0.88, legSpread * 0.85, S * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(
    bdx - legSpread * 0.55 + Math.sin((lLegAng * Math.PI) / 180) * S * 0.2,
    bdy + S * 0.52,
    S * 0.22,
    S * 0.38,
    0.25 + lLegAng * 0.01,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(
    bdx + legSpread * 0.55 + Math.sin((rLegAng * Math.PI) / 180) * S * 0.2,
    bdy + S * 0.52,
    S * 0.22,
    S * 0.38,
    -0.25 + rLegAng * 0.01,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.fillStyle = BOUT_FIGURE_COLORS.skinShade;
  ctx.beginPath();
  ctx.ellipse(bdx - legSpread * 0.55, bdy + S * 0.82, S * 0.22, S * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(bdx + legSpread * 0.55, bdy + S * 0.82, S * 0.22, S * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(bdx, bdy, S * 0.66, S * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BOUT_FIGURE_COLORS.highlightSoft;
  ctx.beginPath();
  ctx.ellipse(bdx - S * 0.12, bdy - S * 0.15, S * 0.32, S * 0.28, -0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = mawashi;
  ctx.beginPath();
  ctx.ellipse(bdx, bdy + S * 0.18, S * 0.7, S * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = -3; i <= 3; i++) {
    ctx.fillStyle = i % 2 === 0 ? mawashiAccent : mawashi;
    ctx.fillRect(bdx + i * S * 0.09 - 1.5, bdy + S * 0.3, 3, S * 0.28);
  }
}

/** Arms and hands. */
export function drawArms(
  ctx: CanvasRenderingContext2D,
  pose: RikishiPose,
  S: number,
  skin: string
) {
  const { bdy, bdx, lArmAng, rArmAng } = pose;

  ctx.lineCap = "round";
  ctx.lineWidth = S * 0.28;
  const lA = ((90 + lArmAng) * Math.PI) / 180;
  ctx.strokeStyle = skin;
  ctx.beginPath();
  ctx.moveTo(bdx - S * 0.56, bdy - S * 0.08);
  ctx.lineTo(bdx - S * 0.56 + Math.cos(lA) * S * 0.58, bdy - S * 0.08 + Math.sin(lA) * S * 0.58);
  ctx.stroke();
  const rA = ((90 - rArmAng) * Math.PI) / 180;
  ctx.beginPath();
  ctx.moveTo(bdx + S * 0.56, bdy - S * 0.08);
  ctx.lineTo(
    bdx + S * 0.56 + Math.cos(Math.PI - rA) * S * 0.58,
    bdy - S * 0.08 + Math.sin(Math.PI - rA) * S * 0.58
  );
  ctx.stroke();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(
    bdx - S * 0.56 + Math.cos(lA) * S * 0.58,
    bdy - S * 0.08 + Math.sin(lA) * S * 0.58,
    S * 0.16,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.beginPath();
  ctx.arc(
    bdx + S * 0.56 + Math.cos(Math.PI - rA) * S * 0.58,
    bdy - S * 0.08 + Math.sin(Math.PI - rA) * S * 0.58,
    S * 0.16,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

/** Head, eyes, grimace, and topknot. */
export function drawHead(
  ctx: CanvasRenderingContext2D,
  pose: RikishiPose,
  state: RikishiState,
  S: number,
  skin: string
) {
  const { bdy, bdx } = pose;

  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(bdx, bdy - S * 0.6, S * 0.2, S * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bdx, bdy - S * 0.8, S * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BOUT_FIGURE_COLORS.highlightFaint;
  ctx.beginPath();
  ctx.arc(bdx - S * 0.08, bdy - S * 0.88, S * 0.16, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = BOUT_FIGURE_COLORS.crease;
  ctx.beginPath();
  ctx.arc(bdx - S * 0.1, bdy - S * 0.82, S * 0.055, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bdx + S * 0.1, bdy - S * 0.82, S * 0.055, 0, Math.PI * 2);
  ctx.fill();

  if (state.bodyPhase === "falling" || state.bodyPhase === "thrown") {
    ctx.strokeStyle = BOUT_FIGURE_COLORS.creaseFaint;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bdx, bdy - S * 0.76, S * 0.1, 0, Math.PI);
    ctx.stroke();
  }

  ctx.fillStyle = BOUT_FIGURE_COLORS.hairDark;
  ctx.beginPath();
  ctx.ellipse(bdx, bdy - S * 1.1, S * 0.09, S * 0.17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BOUT_FIGURE_COLORS.hairLight;
  ctx.beginPath();
  ctx.ellipse(bdx, bdy - S * 0.96, S * 0.18, S * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Rank-colored banner with truncated shikona. */
export function drawRankLabel(
  ctx: CanvasRenderingContext2D,
  pose: RikishiPose,
  S: number,
  isEast: boolean,
  rikishi: UIRikishi
) {
  const { bdy, bdx } = pose;

  const rankColor = isEast ? BOUT_FIGURE_COLORS.eastBadge : BOUT_FIGURE_COLORS.westBadge;
  ctx.fillStyle = rankColor;
  ctx.beginPath();
  ctx.roundRect(bdx - S * 0.72, bdy - S * 1.25, S * 1.44, S * 0.28, 3);
  ctx.fill();
  ctx.fillStyle = BOUT_FIGURE_COLORS.rankLabelText;
  ctx.font = `bold ${clamp(S * 0.22, 7, 14)}px 'Shippori Mincho B1', serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const label =
    rikishi.shikona?.length > 10 ? rikishi.shikona.slice(0, 10) : rikishi.shikona || "?";
  ctx.fillText(label, bdx, bdy - S * 1.11);
}
