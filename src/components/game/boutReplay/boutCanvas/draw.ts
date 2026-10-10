import type { UIRikishi } from "@/presenters/uiModels";
import type { RikishiState, Particle, ReplayPhase } from "./types";
import type { BoutAnimationFamily } from "@/presenters/engineAccess";
import { clamp } from "./math";
import {
  BOUT_FIGURE_COLORS,
  BOUT_HUD_COLORS,
  DOHYO_COLORS,
  withAlpha,
} from "@/constants/ui/drawingPalette";
import { computePose, drawBody, drawArms, drawHead, drawRankLabel } from "./drawRikishiParts";

export function drawDohyo(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  shake: { x: number; y: number }
) {
  const cx = W / 2 + shake.x;
  const cy = H / 2 + shake.y;
  const R = Math.min(W, H) * 0.41;

  ctx.fillStyle = DOHYO_COLORS.wood;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = DOHYO_COLORS.woodDark;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, W - 6, H - 6);

  const sandGrad = ctx.createRadialGradient(cx - R * 0.1, cy - R * 0.15, 0, cx, cy, R * 1.05);
  sandGrad.addColorStop(0, DOHYO_COLORS.sandCore);
  sandGrad.addColorStop(0.55, DOHYO_COLORS.sandMid);
  sandGrad.addColorStop(1, DOHYO_COLORS.sandEdge);
  ctx.fillStyle = sandGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = DOHYO_COLORS.ringLine;
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(angle) * R * 0.95, cy - Math.sin(angle) * R * 0.95);
    ctx.lineTo(cx + Math.cos(angle) * R * 0.95, cy + Math.sin(angle) * R * 0.95);
    ctx.stroke();
  }

  const numBales = 52;
  for (let i = 0; i < numBales; i++) {
    const angle = (i / numBales) * Math.PI * 2;
    const bx = cx + Math.cos(angle) * R;
    const by = cy + Math.sin(angle) * R;
    ctx.fillStyle = DOHYO_COLORS.baleShadow;
    ctx.beginPath();
    ctx.ellipse(bx + 1, by + 1, 6, 4.5, angle, 0, Math.PI * 2);
    ctx.fill();
    const hue = 38 + (i % 3) * 4;
    ctx.fillStyle = `hsl(${hue}, 55%, 48%)`;
    ctx.beginPath();
    ctx.ellipse(bx, by, 6, 4.5, angle, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = DOHYO_COLORS.baleEdge;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  ctx.strokeStyle = DOHYO_COLORS.rope;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = DOHYO_COLORS.shikiri;
  const lineHalf = R * 0.085;
  const lineThick = 3.5;
  const offset = R * 0.06;
  ctx.fillRect(cx + offset, cy - lineHalf, lineThick, lineHalf * 2);
  ctx.fillRect(cx - offset - lineThick, cy - lineHalf, lineThick, lineHalf * 2);

  ctx.fillStyle = DOHYO_COLORS.ropeShadow;
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fill();

  const tasselDist = R * 0.88;
  const tasselColors = [
    { angle: -Math.PI * 0.75, color: DOHYO_COLORS.tasselGreen },
    { angle: -Math.PI * 0.25, color: DOHYO_COLORS.tasselRed },
    { angle: Math.PI * 0.25, color: DOHYO_COLORS.tasselWhite },
    { angle: Math.PI * 0.75, color: DOHYO_COLORS.tasselBlack },
  ];
  for (const { angle, color } of tasselColors) {
    const tx = cx + Math.cos(angle) * tasselDist;
    const ty = cy + Math.sin(angle) * tasselDist;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(tx, ty, 7, 12, angle + Math.PI / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = DOHYO_COLORS.tasselEdge;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

export function drawRikishi(
  ctx: CanvasRenderingContext2D,
  state: RikishiState,
  W: number,
  H: number,
  side: "east" | "west",
  rikishi: UIRikishi,
  shake: { x: number; y: number },
  family?: BoutAnimationFamily,
  isLoser?: boolean
) {
  const px = state.pos.x * W + shake.x;
  let py = state.pos.y * H + shake.y;

  if (state.arcProgress != null && state.arcHeight != null) {
    py -= Math.sin(state.arcProgress * Math.PI) * state.arcHeight * H;
  }

  const S = 26 * state.scale;

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate((state.rotation * Math.PI) / 180);
  ctx.globalAlpha = clamp(state.opacity, 0, 1);

  const isEast = side === "east";
  const skin = BOUT_FIGURE_COLORS.skin;
  const mawashi = isEast ? BOUT_FIGURE_COLORS.mawashiEast : BOUT_FIGURE_COLORS.mawashiWest;
  const mawashiAccent = isEast
    ? BOUT_FIGURE_COLORS.mawashiEastAccent
    : BOUT_FIGURE_COLORS.mawashiWestAccent;

  const pose = computePose(state, isEast, S, family, isLoser);

  drawBody(ctx, pose, S, skin, mawashi, mawashiAccent);
  drawArms(ctx, pose, S, skin);
  drawHead(ctx, pose, state, S, skin);
  drawRankLabel(ctx, pose, S, isEast, rikishi);
  ctx.restore();
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = clamp(alpha * 0.9, 0, 1);
    if (p.type === "zabuton") {
      ctx.translate(p.x, p.y);
      ctx.rotate((p.life * 8) % (Math.PI * 2));
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size, -p.size * 0.6, p.size * 2, p.size * 1.2);
    } else if (p.type === "spark") {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size * 0.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
      ctx.stroke();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export function drawImpactFlash(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  intensity: number
) {
  if (intensity <= 0) return;
  const cx = W / 2,
    cy = H / 2;
  const radius = (1 - intensity) * Math.min(W, H) * 0.5;
  ctx.strokeStyle = withAlpha(255, 200, 80, intensity * 0.8);
  ctx.lineWidth = 6 * intensity;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.25);
  grad.addColorStop(0, withAlpha(255, 240, 160, intensity * 0.55));
  grad.addColorStop(1, withAlpha(255, 200, 80, 0));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(W, H) * 0.25, 0, Math.PI * 2);
  ctx.fill();
}

export function drawCrowdAtmosphere(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  intensity: number,
  phase: ReplayPhase
) {
  const barH = 6,
    y = H - barH;
  ctx.fillStyle = BOUT_HUD_COLORS.barBackdrop;
  ctx.fillRect(0, y, W, barH);
  const barColor =
    phase === "tachiai" || phase === "finish" || phase === "ceremony"
      ? BOUT_HUD_COLORS.barCharge
      : phase === "clinch" || phase === "momentum"
        ? BOUT_HUD_COLORS.barClinch
        : BOUT_HUD_COLORS.barNeutral;
  ctx.fillStyle = barColor;
  ctx.fillRect(0, y, W * clamp(intensity, 0, 1), barH);
  if (intensity > 0.4) {
    const now = Date.now() * 0.003;
    for (let i = 0; i < 6; i++) {
      const dx = (W / 7) * (i + 1);
      const pulse = Math.abs(Math.sin(now + i * 0.8)) * intensity;
      ctx.fillStyle = withAlpha(255, 255, 255, pulse * 0.6);
      ctx.beginPath();
      ctx.arc(dx, y + barH / 2, barH * 0.4 * pulse, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawKimariteBanner(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  kimariteName: string,
  opacity: number
) {
  if (opacity <= 0) return;
  ctx.save();
  ctx.globalAlpha = clamp(opacity, 0, 1);
  const bannerW = Math.min(W * 0.6, 320),
    bannerH = 44;
  const bx = (W - bannerW) / 2,
    by = H * 0.12;
  ctx.fillStyle = BOUT_HUD_COLORS.barShadow;
  ctx.beginPath();
  ctx.roundRect(bx + 3, by + 3, bannerW, bannerH, 6);
  ctx.fill();
  const g = ctx.createLinearGradient(bx, by, bx, by + bannerH);
  g.addColorStop(0, BOUT_HUD_COLORS.bannerTop);
  g.addColorStop(1, BOUT_HUD_COLORS.bannerBottom);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(bx, by, bannerW, bannerH, 6);
  ctx.fill();
  ctx.strokeStyle = BOUT_HUD_COLORS.bannerBorder;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(bx, by, bannerW, bannerH, 6);
  ctx.stroke();
  ctx.fillStyle = BOUT_HUD_COLORS.bannerText;
  ctx.font = `bold ${Math.min(16, bannerW * 0.07)}px 'Shippori Mincho B1', serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("決まり手  —  " + kimariteName, W / 2, by + 8);
  ctx.font = `${Math.min(11, bannerW * 0.05)}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = BOUT_HUD_COLORS.bannerCaption;
  ctx.fillText("Kimarite", W / 2, by + 26);
  ctx.restore();
}

export function drawUpsetBanner(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  opacity: number,
  isKinboshi: boolean
) {
  if (opacity <= 0) return;
  ctx.save();
  ctx.globalAlpha = clamp(opacity, 0, 1);
  const label = isKinboshi ? "✦  Kinboshi  ✦" : "Upset!";
  const color = isKinboshi ? BOUT_HUD_COLORS.kinboshi : BOUT_HUD_COLORS.upset;
  ctx.fillStyle = color;
  ctx.font = `bold ${Math.min(22, W * 0.05)}px 'Shippori Mincho B1', serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = color;
  ctx.shadowBlur = 18 * opacity;
  ctx.fillText(label, W / 2, H * 0.82);
  ctx.shadowBlur = 0;
  ctx.restore();
}
