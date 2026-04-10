// BoutReplayViewer.tsx — 2D bout visualizer
// Full canvas rendering: dohyo, rikishi silhouettes, particles, impact effects.
// Single RAF loop drives both animation state and canvas draws.

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw } from "lucide-react";
import type { BoutResult } from "@/engine/types/basho";
import type { UIRikishi } from "@/presenters/uiModels";
import { getReplayPhaseDurations } from "@/engine/systems/bout/ReplayMetadata";
import { SeededRNG } from "@/engine/rng";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BoutReplayViewerProps {
  result: BoutResult;
  eastRikishi: UIRikishi;
  westRikishi: UIRikishi;
  className?: string;
  autoPlay?: boolean;
  onComplete?: () => void;
}

type ReplayPhase =
  | "ritual"
  | "tachiai"
  | "clinch"
  | "momentum"
  | "finish"
  | "ceremony"
  | "complete";
type BodyPhase =
  | "standing"
  | "bowing"
  | "charging"
  | "grappling"
  | "pushing"
  | "throwing"
  | "falling"
  | "victory";

interface Vec2 {
  x: number;
  y: number;
}

interface RikishiState {
  pos: Vec2;
  rotation: number;
  scale: number;
  bodyPhase: BodyPhase;
  opacity: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // current lifetime remaining (0..maxLife)
  maxLife: number;
  size: number;
  color: string;
  type: "impact" | "salt" | "dust" | "spark" | "zabuton";
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PHASES: ReplayPhase[] = [
  "ritual",
  "tachiai",
  "clinch",
  "momentum",
  "finish",
  "ceremony",
  "complete",
];

const PHASE_LABELS: Record<ReplayPhase, { en: string; ja: string }> = {
  ritual: { en: "Ritual", ja: "仕切り" },
  tachiai: { en: "Tachiai", ja: "立合い" },
  clinch: { en: "Clinch", ja: "組み" },
  momentum: { en: "Momentum", ja: "攻め" },
  finish: { en: "Finish", ja: "決まり手" },
  ceremony: { en: "Ceremony", ja: "表彰" },
  complete: { en: "Complete", ja: "終了" },
};

const CROWD_TEXT: Record<ReplayPhase, string> = {
  ritual: "Silence fills the arena…",
  tachiai: "TACHIAI!",
  clinch: "The crowd holds its breath…",
  momentum: "Rising tension!",
  finish: "決まり手！",
  ceremony: "The hall erupts!",
  complete: "",
};

// ─── Math helpers ─────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 2);
}
function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// ─── Canvas drawing helpers ───────────────────────────────────────────────────

function drawDohyo(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  shake: Vec2,
) {
  const cx = W / 2 + shake.x;
  const cy = H / 2 + shake.y;
  const R = Math.min(W, H) * 0.41;

  // Platform floor
  ctx.fillStyle = "#a07840";
  ctx.fillRect(0, 0, W, H);

  // Platform border (subtle edge shadow)
  ctx.strokeStyle = "#7a5a28";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, W - 6, H - 6);

  // Sand surface — radial gradient for depth
  const sandGrad = ctx.createRadialGradient(
    cx - R * 0.1,
    cy - R * 0.15,
    0,
    cx,
    cy,
    R * 1.05,
  );
  sandGrad.addColorStop(0, "#f8e8b8");
  sandGrad.addColorStop(0.55, "#e8c878");
  sandGrad.addColorStop(1, "#c8a040");
  ctx.fillStyle = sandGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();

  // Inner ring faint texture lines
  ctx.strokeStyle = "rgba(160,120,40,0.18)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(
      cx - Math.cos(angle) * R * 0.95,
      cy - Math.sin(angle) * R * 0.95,
    );
    ctx.lineTo(
      cx + Math.cos(angle) * R * 0.95,
      cy + Math.sin(angle) * R * 0.95,
    );
    ctx.stroke();
  }

  // Tawara (straw bales) — bumps around ring edge
  const numBales = 52;
  for (let i = 0; i < numBales; i++) {
    const angle = (i / numBales) * Math.PI * 2;
    const bx = cx + Math.cos(angle) * R;
    const by = cy + Math.sin(angle) * R;
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(bx + 1, by + 1, 6, 4.5, angle, 0, Math.PI * 2);
    ctx.fill();
    // Bale
    const hue = 38 + (i % 3) * 4;
    ctx.fillStyle = `hsl(${hue}, 55%, 48%)`;
    ctx.beginPath();
    ctx.ellipse(bx, by, 6, 4.5, angle, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Outer ring stroke
  ctx.strokeStyle = "#8b6010";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  // Shikirisen — two short white starting lines at center
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  const lineHalf = R * 0.085;
  const lineThick = 3.5;
  const offset = R * 0.06;
  ctx.fillRect(cx + offset, cy - lineHalf, lineThick, lineHalf * 2); // east mark
  ctx.fillRect(cx - offset - lineThick, cy - lineHalf, lineThick, lineHalf * 2); // west mark

  // Dohyo center dot
  ctx.fillStyle = "rgba(160,110,30,0.35)";
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fill();

  // Corner tassels — 4 colored ribbons at diagonal compass points
  const tasselDist = R * 0.88;
  const tasselColors = [
    { angle: -Math.PI * 0.75, color: "#16a34a" }, // NW – green (spring / east)
    { angle: -Math.PI * 0.25, color: "#b91c1c" }, // NE – red   (summer / south)
    { angle: Math.PI * 0.25, color: "#d4d4d4" }, // SE – white (autumn / west)
    { angle: Math.PI * 0.75, color: "#1d1d1d" }, // SW – black (winter / north)
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

function drawRikishi(
  ctx: CanvasRenderingContext2D,
  state: RikishiState,
  W: number,
  H: number,
  side: "east" | "west",
  rikishi: UIRikishi,
  shake: Vec2,
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

  // Pose adjustments
  let bdy = 0; // body shift Y
  let bdx = 0; // body shift X
  let legSpread = S * 0.42;
  let lArmAng = 0; // left arm angle from vertical (deg)
  let rArmAng = 0;
  let lLegAng = 0;
  let rLegAng = 0;

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

  // Ground shadow
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(bdx, S * 0.88, legSpread * 0.85, S * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(
    bdx - legSpread * 0.55 + Math.sin((lLegAng * Math.PI) / 180) * S * 0.2,
    bdy + S * 0.52,
    S * 0.22,
    S * 0.38,
    0.25 + lLegAng * 0.01,
    0,
    Math.PI * 2,
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
    Math.PI * 2,
  );
  ctx.fill();

  // Feet
  ctx.fillStyle = "#b07050";
  ctx.beginPath();
  ctx.ellipse(
    bdx - legSpread * 0.55,
    bdy + S * 0.82,
    S * 0.22,
    S * 0.1,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(
    bdx + legSpread * 0.55,
    bdy + S * 0.82,
    S * 0.22,
    S * 0.1,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  // Body (torso)
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(bdx, bdy, S * 0.66, S * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body highlight
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.ellipse(
    bdx - S * 0.12,
    bdy - S * 0.15,
    S * 0.32,
    S * 0.28,
    -0.4,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  // Mawashi (belt)
  ctx.fillStyle = mawashi;
  ctx.beginPath();
  ctx.ellipse(bdx, bdy + S * 0.18, S * 0.7, S * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  // Sagari (front fringe of mawashi)
  for (let i = -3; i <= 3; i++) {
    ctx.fillStyle = i % 2 === 0 ? mawashiAccent : mawashi;
    ctx.fillRect(bdx + i * S * 0.09 - 1.5, bdy + S * 0.3, 3, S * 0.28);
  }

  // Arms
  ctx.lineCap = "round";
  ctx.lineWidth = S * 0.28;
  // Left arm
  const lA = ((90 + lArmAng) * Math.PI) / 180;
  ctx.strokeStyle = skin;
  ctx.beginPath();
  ctx.moveTo(bdx - S * 0.56, bdy - S * 0.08);
  ctx.lineTo(
    bdx - S * 0.56 + Math.cos(lA) * S * 0.58,
    bdy - S * 0.08 + Math.sin(lA) * S * 0.58,
  );
  ctx.stroke();
  // Right arm
  const rA = ((90 - rArmAng) * Math.PI) / 180;
  ctx.beginPath();
  ctx.moveTo(bdx + S * 0.56, bdy - S * 0.08);
  ctx.lineTo(
    bdx + S * 0.56 + Math.cos(Math.PI - rA) * S * 0.58,
    bdy - S * 0.08 + Math.sin(Math.PI - rA) * S * 0.58,
  );
  ctx.stroke();
  // Hands
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(
    bdx - S * 0.56 + Math.cos(lA) * S * 0.58,
    bdy - S * 0.08 + Math.sin(lA) * S * 0.58,
    S * 0.16,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.beginPath();
  ctx.arc(
    bdx + S * 0.56 + Math.cos(Math.PI - rA) * S * 0.58,
    bdy - S * 0.08 + Math.sin(Math.PI - rA) * S * 0.58,
    S * 0.16,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  // Neck
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(bdx, bdy - S * 0.6, S * 0.2, S * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(bdx, bdy - S * 0.8, S * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.beginPath();
  ctx.arc(bdx - S * 0.08, bdy - S * 0.88, S * 0.16, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = "rgba(40,20,5,0.7)";
  ctx.beginPath();
  ctx.arc(bdx - S * 0.1, bdy - S * 0.82, S * 0.055, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bdx + S * 0.1, bdy - S * 0.82, S * 0.055, 0, Math.PI * 2);
  ctx.fill();

  // Expression tweak for falling/victory
  if (state.bodyPhase === "falling") {
    ctx.strokeStyle = "rgba(40,20,5,0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bdx, bdy - S * 0.76, S * 0.1, 0, Math.PI); // open mouth / shock
    ctx.stroke();
  }

  // Chonmage (topknot)
  ctx.fillStyle = "#18100a";
  ctx.beginPath();
  ctx.ellipse(bdx, bdy - S * 1.1, S * 0.09, S * 0.17, 0, 0, Math.PI * 2);
  ctx.fill();
  // Topknot base (bintsuke oil sheen)
  ctx.fillStyle = "#2a1a0a";
  ctx.beginPath();
  ctx.ellipse(bdx, bdy - S * 0.96, S * 0.18, S * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rank badge — small colored tag
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
    rikishi.shikona?.length > 10
      ? rikishi.shikona.slice(0, 10)
      : rikishi.shikona || "?";
  ctx.fillText(label, bdx, bdy - S * 1.11);

  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = clamp(alpha * 0.9, 0, 1);

    if (p.type === "zabuton") {
      // Flying cushion (flat rectangle)
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

function drawImpactFlash(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  intensity: number,
) {
  if (intensity <= 0) return;
  const cx = W / 2,
    cy = H / 2;
  // Shockwave ring
  const radius = (1 - intensity) * Math.min(W, H) * 0.5;
  ctx.strokeStyle = `rgba(255, 200, 80, ${intensity * 0.8})`;
  ctx.lineWidth = 6 * intensity;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  // Center flash
  const grad = ctx.createRadialGradient(
    cx,
    cy,
    0,
    cx,
    cy,
    Math.min(W, H) * 0.25,
  );
  grad.addColorStop(0, `rgba(255,240,160,${intensity * 0.55})`);
  grad.addColorStop(1, "rgba(255,200,80,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(W, H) * 0.25, 0, Math.PI * 2);
  ctx.fill();
}

function drawCrowdAtmosphere(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  intensity: number,
  phase: ReplayPhase,
) {
  const barH = 6;
  const y = H - barH;
  // Base bar
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(0, y, W, barH);
  // Fill
  const barColor =
    phase === "tachiai" || phase === "finish" || phase === "ceremony"
      ? "#f59e0b"
      : phase === "clinch" || phase === "momentum"
        ? "#6366f1"
        : "#64748b";
  ctx.fillStyle = barColor;
  ctx.fillRect(0, y, W * clamp(intensity, 0, 1), barH);
  // Animated pulse dots
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

function drawKimariteBanner(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  kimariteName: string,
  opacity: number,
) {
  if (opacity <= 0) return;
  ctx.save();
  ctx.globalAlpha = clamp(opacity, 0, 1);
  const bannerW = Math.min(W * 0.6, 320);
  const bannerH = 44;
  const bx = (W - bannerW) / 2;
  const by = H * 0.12;
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.roundRect(bx + 3, by + 3, bannerW, bannerH, 6);
  ctx.fill();
  // Banner
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
  // Text
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

function drawUpsetBanner(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  opacity: number,
  isKinboshi: boolean,
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
  // Glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 18 * opacity;
  ctx.fillText(label, W / 2, H * 0.82);
  ctx.shadowBlur = 0;
  ctx.restore();
}

// ─── Narration helpers ────────────────────────────────────────────────────────

function getNarrationLines(
  result: BoutResult,
  east: UIRikishi,
  west: UIRikishi,
): string[] {
  const winner = result.winnerRikishiId === east.id ? east : west;
  const loser = result.winnerRikishiId === east.id ? west : east;

  // Pull from PBP if available
  const pbpTexts = (result.pbp || []).filter((t) => t && t.length > 2);
  if (pbpTexts.length > 0) return pbpTexts;

  // Fall back to narrative
  const narTexts = (result.narrative || []).filter((t) => t && t.length > 2);
  if (narTexts.length > 0) return narTexts;

  // Construct minimal fallback lines
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

function getPhaseNarrationIndex(
  phase: ReplayPhase,
  progress01: number,
  totalLines: number,
): number {
  const phaseIdx = PHASES.indexOf(phase);
  const totalPhases = PHASES.length - 1;
  const overall = (phaseIdx + progress01) / totalPhases;
  return clamp(Math.floor(overall * totalLines), 0, totalLines - 1);
}

// ─── Animation state helpers ──────────────────────────────────────────────────

function getTargetState(
  phase: ReplayPhase,
  p01: number,
  winnerSide: "east" | "west",
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

function lerpState(a: RikishiState, b: RikishiState, t: number): RikishiState {
  return {
    pos: { x: lerp(a.pos.x, b.pos.x, t), y: lerp(a.pos.y, b.pos.y, t) },
    rotation: lerp(a.rotation, b.rotation, t),
    scale: lerp(a.scale, b.scale, t),
    bodyPhase: t > 0.5 ? b.bodyPhase : a.bodyPhase,
    opacity: lerp(a.opacity, b.opacity, t),
  };
}

function getCrowdIntensity(phase: ReplayPhase, progress: number): number {
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

// ─── Main component ───────────────────────────────────────────────────────────

export function BoutReplayViewer({
  result,
  eastRikishi,
  westRikishi,
  className,
  autoPlay = false,
  onComplete,
}: BoutReplayViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);

  // Playback state (drives UI re-renders)
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState(1);
  const [uiPhase, setUiPhase] = useState<ReplayPhase>("ritual");
  const [narration, setNarration] = useState("");

  // Animation data in refs (no re-render needed for canvas)
  const phaseRef = useRef<ReplayPhase>("ritual");
  const progressRef = useRef(0); // 0..1
  const speedRef = useRef(speed);
  const isPlayingRef = useRef(isPlaying);
  const eastRef = useRef<RikishiState>({
    pos: { x: 0.27, y: 0.52 },
    rotation: 0,
    scale: 1,
    bodyPhase: "standing",
    opacity: 1,
  });
  const westRef = useRef<RikishiState>({
    pos: { x: 0.73, y: 0.52 },
    rotation: 0,
    scale: 1,
    bodyPhase: "standing",
    opacity: 1,
  });
  const particlesRef = useRef<Particle[]>([]);
  const particleId = useRef(0);
  const flashRef = useRef(0); // 0..1 impact flash intensity
  const shakeRef = useRef<Vec2>({ x: 0, y: 0 });
  const lastTimeRef = useRef(0);
  const narIndexRef = useRef(-1);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const winnerSide =
    result.winnerRikishiId === eastRikishi.id ? "east" : "west";
  const phaseDurations = useMemo(
    () => getReplayPhaseDurations(result),
    [result],
  );
  const rng = useMemo(
    () => new SeededRNG(result.boutId || "seed"),
    [result.boutId],
  );
  const lines = useMemo(
    () => getNarrationLines(result, eastRikishi, westRikishi),
    [result, eastRikishi, westRikishi],
  );

  const spawnParticles = useCallback(
    (type: Particle["type"], x: number, y: number, count: number) => {
      const np: Particle[] = [];
      for (let i = 0; i < count; i++) {
        const angle = rng.next() * Math.PI * 2;
        const spd = 0.6 + rng.next() * 3;
        const colors: Record<Particle["type"], string> = {
          impact: `hsl(${30 + rng.next() * 20},90%,60%)`,
          salt: `rgba(255,255,255,${0.7 + rng.next() * 0.3})`,
          dust: `hsl(38,55%,${55 + rng.next() * 20}%)`,
          spark: `hsl(50,100%,70%)`,
          zabuton: ["#7c3aed", "#db2777", "#0891b2", "#059669"][
            Math.floor(rng.next() * 4)
          ],
        };
        np.push({
          id: particleId.current++,
          x,
          y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd - (type === "salt" ? 2.5 : 0),
          life: 1,
          maxLife: 0.4 + rng.next() * 0.9,
          size:
            type === "salt"
              ? 2 + rng.next() * 3
              : type === "zabuton"
                ? 8 + rng.next() * 8
                : 3 + rng.next() * 5,
          color: colors[type],
          type,
        });
      }
      particlesRef.current = [...particlesRef.current.slice(-60), ...np];
    },
    [rng],
  );

  const reset = useCallback(() => {
    phaseRef.current = "ritual";
    progressRef.current = 0;
    flashRef.current = 0;
    shakeRef.current = { x: 0, y: 0 };
    particlesRef.current = [];
    narIndexRef.current = -1;
    setUiPhase("ritual");
    setNarration(lines[0] || "");
    setIsPlaying(false);
  }, [lines]);

  // ── Main RAF loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;

    lastTimeRef.current = 0;

    const loop = (timestamp: number) => {
      if (!isPlayingRef.current) return;

      const canvas = canvasRef.current;
      if (!canvas) {
        animRef.current = requestAnimationFrame(loop);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        animRef.current = requestAnimationFrame(loop);
        return;
      }

      const W = canvas.width;
      const H = canvas.height;

      // Delta time
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const rawDelta = clamp(timestamp - lastTimeRef.current, 0, 100);
      const delta = rawDelta * speedRef.current;
      lastTimeRef.current = timestamp;

      // ── Advance phase progress ──
      const phase = phaseRef.current;
      const duration = phaseDurations[phase] || 2000;
      if (phase !== "complete") {
        progressRef.current = clamp(
          progressRef.current + delta / duration,
          0,
          1,
        );
        if (progressRef.current >= 1) {
          const idx = PHASES.indexOf(phase);
          if (idx < PHASES.length - 1) {
            const next = PHASES[idx + 1];
            phaseRef.current = next;
            progressRef.current = 0;
            setUiPhase(next);
            // Phase transition effects
            if (next === "tachiai") {
              spawnParticles("salt", W * 0.3, H * 0.52, 18);
              spawnParticles("salt", W * 0.7, H * 0.52, 18);
            }
            if (next === "clinch") {
              flashRef.current = 1;
              spawnParticles("impact", W * 0.5, H * 0.5, 22);
              spawnParticles("dust", W * 0.5, H * 0.5, 14);
              shakeRef.current = {
                x: (rng.next() - 0.5) * 16,
                y: (rng.next() - 0.5) * 10,
              };
            }
            if (next === "finish") {
              spawnParticles(
                "impact",
                W * (winnerSide === "east" ? 0.62 : 0.38),
                H * 0.5,
                18,
              );
              spawnParticles("dust", W * 0.5, H * 0.6, 12);
            }
            if (next === "ceremony" && (result.upset || result.isKinboshi)) {
              spawnParticles("zabuton", W * 0.5, H * 0.35, 14);
            }
          } else {
            isPlayingRef.current = false;
            setIsPlaying(false);
            onComplete?.();
            animRef.current = requestAnimationFrame(loop);
            return;
          }
        }
      }

      // ── Update rikishi positions ──
      const target = getTargetState(
        phaseRef.current,
        progressRef.current,
        winnerSide,
      );
      const smooth = clamp(delta * 0.012, 0, 0.25);
      eastRef.current = lerpState(eastRef.current, target.east, smooth);
      westRef.current = lerpState(westRef.current, target.west, smooth);

      // ── Update particles ──
      const gravity = 0.04;
      particlesRef.current = particlesRef.current
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy + gravity,
          vy: p.vy + gravity,
          life: p.life - delta * 0.001,
        }))
        .filter((p) => p.life > 0);

      // ── Decay flash & shake ──
      flashRef.current = clamp(flashRef.current - delta * 0.0028, 0, 1);
      shakeRef.current = {
        x: shakeRef.current.x * (1 - delta * 0.015),
        y: shakeRef.current.y * (1 - delta * 0.015),
      };

      // ── Narration update ──
      const ni = getPhaseNarrationIndex(
        phaseRef.current,
        progressRef.current,
        lines.length,
      );
      if (ni !== narIndexRef.current) {
        narIndexRef.current = ni;
        setNarration(lines[ni] || "");
      }

      // ── Occasional mid-phase particles ──
      if (phaseRef.current === "ritual" && rng.next() < 0.008 * (delta / 16)) {
        spawnParticles("salt", W * (0.22 + rng.next() * 0.1), H * 0.48, 4);
      }
      if (
        (phaseRef.current === "clinch" || phaseRef.current === "momentum") &&
        rng.next() < 0.01 * (delta / 16)
      ) {
        spawnParticles("dust", W * 0.5, H * 0.52, 3);
      }
      if (
        phaseRef.current === "tachiai" &&
        progressRef.current < 0.3 &&
        rng.next() < 0.05 * (delta / 16)
      ) {
        spawnParticles("spark", W * 0.5, H * 0.5, 5);
      }

      // ── DRAW ──────────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, W, H);

      const shake = shakeRef.current;
      drawDohyo(ctx, W, H, shake);
      drawParticles(ctx, particlesRef.current);
      drawRikishi(ctx, westRef.current, W, H, "west", westRikishi, shake);
      drawRikishi(ctx, eastRef.current, W, H, "east", eastRikishi, shake);
      drawImpactFlash(ctx, W, H, flashRef.current);

      // Kimarite banner during finish + ceremony
      if (phaseRef.current === "finish" || phaseRef.current === "ceremony") {
        const bannerAlpha =
          phaseRef.current === "finish" ? easeOut(progressRef.current) : 1;
        drawKimariteBanner(
          ctx,
          W,
          H,
          result.kimariteName || result.kimarite,
          bannerAlpha,
        );
      }
      // Upset/kinboshi banner during ceremony
      if (
        phaseRef.current === "ceremony" &&
        (result.upset || result.isKinboshi)
      ) {
        drawUpsetBanner(
          ctx,
          W,
          H,
          easeOut(progressRef.current),
          !!result.isKinboshi,
        );
      }

      const intensity = getCrowdIntensity(
        phaseRef.current,
        progressRef.current,
      );
      drawCrowdAtmosphere(ctx, W, H, intensity, phaseRef.current);

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    };
  }, [
    isPlaying,
    phaseDurations,
    lines,
    winnerSide,
    result,
    eastRikishi,
    westRikishi,
    spawnParticles,
    onComplete,
    rng,
  ]);

  // Initial canvas draw when paused
  useEffect(() => {
    if (isPlaying) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width,
      H = canvas.height;
    drawDohyo(ctx, W, H, { x: 0, y: 0 });
    drawRikishi(ctx, westRef.current, W, H, "west", westRikishi, {
      x: 0,
      y: 0,
    });
    drawRikishi(ctx, eastRef.current, W, H, "east", eastRikishi, {
      x: 0,
      y: 0,
    });
  }, [isPlaying, eastRikishi, westRikishi]);

  // Overall progress for timeline bar
  const phaseIdx = PHASES.indexOf(uiPhase);
  const phaseProgress01 = progressRef.current;
  const overallPct = ((phaseIdx + phaseProgress01) / (PHASES.length - 1)) * 100;

  const label = PHASE_LABELS[uiPhase];

  return (
    <div
      className={cn(
        "rounded-lg overflow-hidden border border-border bg-card flex flex-col",
        className,
      )}
    >
      {/* Header: fighters */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-west" />
          <span className="font-semibold">{eastRikishi.shikona}</span>
          <span className="text-muted-foreground text-xs">
            {eastRikishi.rankLabel}
          </span>
        </div>
        <span className="text-muted-foreground font-medium tracking-widest text-xs">
          VS
        </span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            {westRikishi.rankLabel}
          </span>
          <span className="font-semibold">{westRikishi.shikona}</span>
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
        </div>
      </div>

      {/* Canvas */}
      <div className="relative bg-black">
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          className="w-full block"
          style={{ aspectRatio: "8/5" }}
        />

        {/* Phase badge overlay */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="flex items-center gap-1.5 bg-black/60 rounded-full px-3 py-1 border border-white/10">
            <span className="text-white/50 text-xs font-medium">
              {label.ja}
            </span>
            <span className="text-white/20 text-xs">·</span>
            <span className="text-white text-xs font-semibold tracking-wider uppercase">
              {label.en}
            </span>
          </div>
        </div>

        {/* Kensho envelopes */}
        {result.kenshoEnvelopes > 0 &&
          (uiPhase === "finish" || uiPhase === "ceremony") && (
            <div className="absolute top-3 right-3 pointer-events-none">
              <div className="flex items-center gap-1 bg-gold/20 rounded px-2 py-1 border border-gold/40">
                <span className="text-gold text-xs">¥</span>
                <span className="text-gold text-xs font-semibold">
                  {result.kenshoEnvelopes} kensho
                </span>
              </div>
            </div>
          )}

        {/* Crowd text */}
        {uiPhase !== "complete" && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
            <span
              className={cn(
                "text-xs font-medium transition-opacity duration-500 px-2 py-0.5 rounded-full",
                uiPhase === "tachiai" ||
                  uiPhase === "finish" ||
                  uiPhase === "ceremony"
                  ? "text-gold bg-black/50"
                  : "text-white/50",
              )}
            >
              {CROWD_TEXT[uiPhase]}
            </span>
          </div>
        )}
      </div>

      {/* Narration */}
      <div className="px-4 py-3 bg-muted/20 border-t border-border min-h-[3.5rem] flex items-center justify-center">
        <p className="text-sm text-center leading-snug text-foreground/90 italic">
          {narration || "…"}
        </p>
      </div>

      {/* Controls */}
      <div className="px-4 py-2.5 border-t border-border flex items-center gap-3">
        {/* Play/Pause */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setIsPlaying((p) => !p)}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        {/* Restart */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={reset}
          aria-label="Restart replay"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>

        {/* Timeline */}
        <div className="flex-1 relative h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-primary rounded-full transition-none"
            style={{ width: `${clamp(overallPct, 0, 100)}%` }}
          />
        </div>

        {/* Speed */}
        <div className="flex items-center gap-1 shrink-0">
          {([1, 2] as const).map((s) => (
            <Button
              key={s}
              variant="ghost"
              onClick={() => setSpeed(s)}
              className={cn(
                "text-xs px-2 py-0.5 rounded font-mono transition-colors",
                speed === s
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label={`Set speed to ${s}x`}
            >
              {s}×
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
