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
