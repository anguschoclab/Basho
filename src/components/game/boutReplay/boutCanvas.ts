/**
 * src/components/game/boutReplay/boutCanvas.ts
 * ==============================================
 * Pure canvas drawing functions, math helpers, animation state helpers,
 * and narration utilities for the BoutReplayViewer.
 *
 * No React dependencies — fully testable in isolation.
 */

import type { UIRikishi } from "@/presenters/uiModels";
import type { BoutResult } from "@/engine/types/basho";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReplayPhase =
  | "ritual"
  | "tachiai"
  | "clinch"
  | "momentum"
  | "finish"
  | "ceremony"
  | "complete";

export type BodyPhase =
  | "standing"
  | "bowing"
  | "charging"
  | "grappling"
  | "pushing"
  | "throwing"
  | "falling"
  | "victory";

export interface Vec2 {
  x: number;
  y: number;
}

export interface RikishiState {
  pos: Vec2;
  rotation: number;
  scale: number;
  bodyPhase: BodyPhase;
  opacity: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: "impact" | "salt" | "dust" | "spark" | "zabuton";
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const PHASES: ReplayPhase[] = [
  "ritual",
  "tachiai",
  "clinch",
  "momentum",
  "finish",
  "ceremony",
  "complete",
];

export const PHASE_LABELS: Record<ReplayPhase, { en: string; ja: string }> = {
  ritual: { en: "Ritual", ja: "仕切り" },
  tachiai: { en: "Tachiai", ja: "立合い" },
  clinch: { en: "Clinch", ja: "組み" },
  momentum: { en: "Momentum", ja: "攻め" },
  finish: { en: "Finish", ja: "決まり手" },
  ceremony: { en: "Ceremony", ja: "表彰" },
  complete: { en: "Complete", ja: "終了" },
};

export const CROWD_TEXT: Record<ReplayPhase, string> = {
  ritual: "Silence fills the arena…",
  tachiai: "TACHIAI!",
  clinch: "The crowd holds its breath…",
  momentum: "Rising tension!",
  finish: "決まり手！",
  ceremony: "The hall erupts!",
  complete: "",
};

// ─── Math helpers ─────────────────────────────────────────────────────────────

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
export function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
export function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 2);
}
export function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// ─── Canvas drawing helpers ───────────────────────────────────────────────────

export function drawDohyo(ctx: CanvasRenderingContext2D, W: number, H: number, shake: Vec2) {
  const cx = W / 2 + shake.x;
  const cy = H / 2 + shake.y;
  const R = Math.min(W, H) * 0.41;

  ctx.fillStyle = "#a07840";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#7a5a28";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, W - 6, H - 6);

  const sandGrad = ctx.createRadialGradient(cx - R * 0.1, cy - R * 0.15, 0, cx, cy, R * 1.05);
  sandGrad.addColorStop(0, "#f8e8b8");
  sandGrad.addColorStop(0.55, "#e8c878");
  sandGrad.addColorStop(1, "#c8a040");
  ctx.fillStyle = sandGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(160,120,40,0.18)";
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
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(bx + 1, by + 1, 6, 4.5, angle, 0, Math.PI * 2);
    ctx.fill();
    const hue = 38 + (i % 3) * 4;
    ctx.fillStyle = `hsl(${hue}, 55%, 48%)`;
    ctx.beginPath();
    ctx.ellipse(bx, by, 6, 4.5, angle, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  ctx.strokeStyle = "#8b6010";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  const lineHalf = R * 0.085;
  const lineThick = 3.5;
  const offset = R * 0.06;
  ctx.fillRect(cx + offset, cy - lineHalf, lineThick, lineHalf * 2);
  ctx.fillRect(cx - offset - lineThick, cy - lineHalf, lineThick, lineHalf * 2);

  ctx.fillStyle = "rgba(160,110,30,0.35)";
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fill();

  const tasselDist = R * 0.88;
  const tasselColors = [
    { angle: -Math.PI * 0.75, color: "#16a34a" },
    { angle: -Math.PI * 0.25, color: "#b91c1c" },
    { angle: Math.PI * 0.25, color: "#d4d4d4" },
    { angle: Math.PI * 0.75, color: "#1d1d1d" },
  ];
  for (const { angle, color } of tasselColors) {
    const tx = cx + Math.cos(angle) * tasselDist;
    const ty = cy + Math.sin(angle) * tasselDist;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(tx, ty, 7, 12, angle + Math.PI / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
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
  shake: Vec2
) {
  const px = state.pos.x * W + shake.x;
  const py = state.pos.y * H + shake.y;
  const S = 26 * state.scale;

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate((state.rotation * Math.PI) / 180);
  ctx.globalAlpha = clamp(state.opacity, 0, 1);

  const isEast = side === "east";
  const skin = "#c8906a";
  const mawashi = isEast ? "#1d4ed8" : "#b91c1c";
  const mawashiAccent = isEast ? "#93c5fd" : "#fca5a5";

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

  ctx.fillStyle = "rgba(0,0,0,0.18)";
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

  ctx.fillStyle = "#b07050";
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
  ctx.fillStyle = "rgba(255,255,255,0.08)";
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

  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(bdx, bdy - S * 0.6, S * 0.2, S * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bdx, bdy - S * 0.8, S * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.beginPath();
  ctx.arc(bdx - S * 0.08, bdy - S * 0.88, S * 0.16, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(40,20,5,0.7)";
  ctx.beginPath();
  ctx.arc(bdx - S * 0.1, bdy - S * 0.82, S * 0.055, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bdx + S * 0.1, bdy - S * 0.82, S * 0.055, 0, Math.PI * 2);
  ctx.fill();

  if (state.bodyPhase === "falling") {
    ctx.strokeStyle = "rgba(40,20,5,0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bdx, bdy - S * 0.76, S * 0.1, 0, Math.PI);
    ctx.stroke();
  }

  ctx.fillStyle = "#18100a";
  ctx.beginPath();
  ctx.ellipse(bdx, bdy - S * 1.1, S * 0.09, S * 0.17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a1a0a";
  ctx.beginPath();
  ctx.ellipse(bdx, bdy - S * 0.96, S * 0.18, S * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();

  const rankColor = isEast ? "#1d4ed8" : "#b91c1c";
  ctx.fillStyle = rankColor;
  ctx.beginPath();
  ctx.roundRect(bdx - S * 0.72, bdy - S * 1.25, S * 1.44, S * 0.28, 3);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = `bold ${clamp(S * 0.22, 7, 14)}px 'Segoe UI', system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const label =
    rikishi.shikona?.length > 10 ? rikishi.shikona.slice(0, 10) : rikishi.shikona || "?";
  ctx.fillText(label, bdx, bdy - S * 1.11);
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
  ctx.strokeStyle = `rgba(255, 200, 80, ${intensity * 0.8})`;
  ctx.lineWidth = 6 * intensity;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.25);
  grad.addColorStop(0, `rgba(255,240,160,${intensity * 0.55})`);
  grad.addColorStop(1, "rgba(255,200,80,0)");
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
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(0, y, W, barH);
  const barColor =
    phase === "tachiai" || phase === "finish" || phase === "ceremony"
      ? "#f59e0b"
      : phase === "clinch" || phase === "momentum"
        ? "#6366f1"
        : "#64748b";
  ctx.fillStyle = barColor;
  ctx.fillRect(0, y, W * clamp(intensity, 0, 1), barH);
  if (intensity > 0.4) {
    const now = Date.now() * 0.003;
    for (let i = 0; i < 6; i++) {
      const dx = (W / 7) * (i + 1);
      const pulse = Math.abs(Math.sin(now + i * 0.8)) * intensity;
      ctx.fillStyle = `rgba(255,255,255,${pulse * 0.6})`;
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
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.roundRect(bx + 3, by + 3, bannerW, bannerH, 6);
  ctx.fill();
  const g = ctx.createLinearGradient(bx, by, bx, by + bannerH);
  g.addColorStop(0, "#7c2d12");
  g.addColorStop(1, "#451a03");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(bx, by, bannerW, bannerH, 6);
  ctx.fill();
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(bx, by, bannerW, bannerH, 6);
  ctx.stroke();
  ctx.fillStyle = "#fef3c7";
  ctx.font = `bold ${Math.min(16, bannerW * 0.07)}px 'Segoe UI', system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("決まり手  —  " + kimariteName.toUpperCase(), W / 2, by + 8);
  ctx.font = `${Math.min(11, bannerW * 0.05)}px 'Segoe UI', system-ui, sans-serif`;
  ctx.fillStyle = "#fcd34d";
  ctx.fillText("KIMARITE", W / 2, by + 26);
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
  const label = isKinboshi ? "✦  KINBOSHI  ✦" : "UPSET!";
  const color = isKinboshi ? "#f59e0b" : "#ef4444";
  ctx.fillStyle = color;
  ctx.font = `bold ${Math.min(22, W * 0.05)}px 'Segoe UI', system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = color;
  ctx.shadowBlur = 18 * opacity;
  ctx.fillText(label, W / 2, H * 0.82);
  ctx.shadowBlur = 0;
  ctx.restore();
}

// ─── Animation state helpers ──────────────────────────────────────────────────

export function getTargetState(
  phase: ReplayPhase,
  p01: number,
  winnerSide: "east" | "west"
): { east: RikishiState; west: RikishiState } {
  const p = easeInOut(p01);
  const pe = easeOut(p01);

  switch (phase) {
    case "ritual":
      return {
        east: {
          pos: { x: 0.27, y: 0.52 },
          rotation: 0,
          scale: 1,
          bodyPhase: p01 < 0.55 ? "standing" : "bowing",
          opacity: 1,
        },
        west: {
          pos: { x: 0.73, y: 0.52 },
          rotation: 0,
          scale: 1,
          bodyPhase: p01 < 0.55 ? "standing" : "bowing",
          opacity: 1,
        },
      };
    case "tachiai":
      return {
        east: {
          pos: { x: lerp(0.27, 0.42, p), y: lerp(0.52, 0.5, p) },
          rotation: lerp(0, 10, p),
          scale: lerp(1, 1.1, p),
          bodyPhase: "charging",
          opacity: 1,
        },
        west: {
          pos: { x: lerp(0.73, 0.58, p), y: lerp(0.52, 0.5, p) },
          rotation: lerp(0, -10, p),
          scale: lerp(1, 1.1, p),
          bodyPhase: "charging",
          opacity: 1,
        },
      };
    case "clinch":
      return {
        east: {
          pos: { x: 0.43, y: 0.5 },
          rotation: 6,
          scale: 1.06,
          bodyPhase: "grappling",
          opacity: 1,
        },
        west: {
          pos: { x: 0.57, y: 0.5 },
          rotation: -6,
          scale: 1.06,
          bodyPhase: "grappling",
          opacity: 1,
        },
      };
    case "momentum":
      if (winnerSide === "east") {
        return {
          east: {
            pos: { x: lerp(0.43, 0.53, pe), y: 0.5 },
            rotation: 14,
            scale: 1.12,
            bodyPhase: "pushing",
            opacity: 1,
          },
          west: {
            pos: { x: lerp(0.57, 0.67, pe), y: lerp(0.5, 0.52, p) },
            rotation: -18,
            scale: 0.96,
            bodyPhase: "grappling",
            opacity: 1,
          },
        };
      }
      return {
        east: {
          pos: { x: lerp(0.43, 0.33, pe), y: lerp(0.5, 0.52, p) },
          rotation: 18,
          scale: 0.96,
          bodyPhase: "grappling",
          opacity: 1,
        },
        west: {
          pos: { x: lerp(0.57, 0.47, pe), y: 0.5 },
          rotation: -14,
          scale: 1.12,
          bodyPhase: "pushing",
          opacity: 1,
        },
      };
    case "finish":
      if (winnerSide === "east") {
        return {
          east: {
            pos: { x: lerp(0.53, 0.56, p), y: lerp(0.5, 0.49, p) },
            rotation: 4,
            scale: 1.16,
            bodyPhase: "throwing",
            opacity: 1,
          },
          west: {
            pos: { x: lerp(0.67, 0.8, p), y: lerp(0.52, 0.63, p) },
            rotation: lerp(-18, -65, p),
            scale: lerp(0.96, 0.72, p),
            bodyPhase: "falling",
            opacity: lerp(1, 0.75, p),
          },
        };
      }
      return {
        east: {
          pos: { x: lerp(0.33, 0.2, p), y: lerp(0.52, 0.63, p) },
          rotation: lerp(18, 65, p),
          scale: lerp(0.96, 0.72, p),
          bodyPhase: "falling",
          opacity: lerp(1, 0.75, p),
        },
        west: {
          pos: { x: lerp(0.47, 0.44, p), y: lerp(0.5, 0.49, p) },
          rotation: -4,
          scale: 1.16,
          bodyPhase: "throwing",
          opacity: 1,
        },
      };
    case "ceremony":
      if (winnerSide === "east") {
        return {
          east: {
            pos: { x: 0.5, y: 0.48 },
            rotation: 0,
            scale: 1.22,
            bodyPhase: "victory",
            opacity: 1,
          },
          west: {
            pos: { x: 0.76, y: 0.55 },
            rotation: 0,
            scale: 0.88,
            bodyPhase: "standing",
            opacity: 0.65,
          },
        };
      }
      return {
        east: {
          pos: { x: 0.24, y: 0.55 },
          rotation: 0,
          scale: 0.88,
          bodyPhase: "standing",
          opacity: 0.65,
        },
        west: {
          pos: { x: 0.5, y: 0.48 },
          rotation: 0,
          scale: 1.22,
          bodyPhase: "victory",
          opacity: 1,
        },
      };
    default:
      return {
        east: {
          pos: { x: 0.27, y: 0.52 },
          rotation: 0,
          scale: 1,
          bodyPhase: "standing",
          opacity: 1,
        },
        west: {
          pos: { x: 0.73, y: 0.52 },
          rotation: 0,
          scale: 1,
          bodyPhase: "standing",
          opacity: 1,
        },
      };
  }
}

export function lerpState(a: RikishiState, b: RikishiState, t: number): RikishiState {
  return {
    pos: { x: lerp(a.pos.x, b.pos.x, t), y: lerp(a.pos.y, b.pos.y, t) },
    rotation: lerp(a.rotation, b.rotation, t),
    scale: lerp(a.scale, b.scale, t),
    bodyPhase: t > 0.5 ? b.bodyPhase : a.bodyPhase,
    opacity: lerp(a.opacity, b.opacity, t),
  };
}

export function getCrowdIntensity(phase: ReplayPhase, progress: number): number {
  switch (phase) {
    case "ritual":
      return 0.08 + progress * 0.05;
    case "tachiai":
      return 0.85 + progress * 0.15;
    case "clinch":
      return 0.35 + progress * 0.25;
    case "momentum":
      return 0.55 + progress * 0.3;
    case "finish":
      return 0.9;
    case "ceremony":
      return 0.75;
    default:
      return 0;
  }
}

// ─── Narration helpers ────────────────────────────────────────────────────────

export function getNarrationLines(result: BoutResult, east: UIRikishi, west: UIRikishi): string[] {
  const winner = result.winnerRikishiId === east.id ? east : west;
  const loser = result.winnerRikishiId === east.id ? west : east;

  const pbpTexts = (result.pbp || []).filter((t) => t && t.length > 2);
  if (pbpTexts.length > 0) return pbpTexts;

  const narTexts = (result.narrative || []).filter((t) => t && t.length > 2);
  if (narTexts.length > 0) return narTexts;

  const lines: string[] = [
    `${east.shikona} (East) faces ${west.shikona} (West).`,
    `They crouch at the shikiri-sen. Silence falls.`,
    `TACHIAI! The collision echoes through the hall.`,
    `${winner.shikona} drives forward with relentless pressure.`,
    `${loser.shikona} cannot find an answer.`,
    `${winner.shikona} wins by ${result.kimariteName || "yorikiri"}!`,
  ];
  if (result.upset) lines.push("UPSET! The arena is in disbelief!");
  if (result.isKinboshi) lines.push("KINBOSHI! The Yokozuna has been toppled!");
  return lines;
}

export function getPhaseNarrationIndex(
  phase: ReplayPhase,
  progress01: number,
  totalLines: number
): number {
  const phaseIdx = PHASES.indexOf(phase);
  const totalPhases = PHASES.length - 1;
  const overall = (phaseIdx + progress01) / totalPhases;
  return clamp(Math.floor(overall * totalLines), 0, totalLines - 1);
}
