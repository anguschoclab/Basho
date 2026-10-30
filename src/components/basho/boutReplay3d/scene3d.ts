/**
 * scene3d.ts
 * ==========
 * three.js scene for the 3D bout replay. Procedurally builds the kokugikan:
 * dohyo + tawara ring, suspended tsuriyane canopy, gyoji, crowd bowls —
 * plus articulated rikishi rigs driven each frame by the same RikishiState
 * refs the 2D canvas consumes (pos/rotation/scale/bodyPhase/arc).
 */

import * as THREE from "three";
import type { RikishiState, Particle, BodyPhase, ReplayPhase } from "@/components/basho/boutReplay/boutCanvas/types";

/** World half-extent mapped from normalized 2D pos.x (0..1). */
const ARENA_X = 4.2;
/** Depth mapping for 2D pos.y (0.5 ≈ ring center). */
const ARENA_Z = 2.4;
const DOHYO_R = 2.35;
const DOHYO_H = 0.5;

const SKIN = 0xd9a066;
const SKIN_DARK = 0xb07f4f;
const CLAY = 0x9a7b52;
const TAWARA = 0x4a3b2a;
const MAWASHI_EAST = 0x24365e;
const MAWASHI_WEST = 0x5e2430;
const GYOJI = 0x6b3fa0;

interface RikishiRig {
  group: THREE.Group;
  torso: THREE.Mesh;
  head: THREE.Group;
  armL: THREE.Mesh;
  armR: THREE.Mesh;
  mats: THREE.MeshStandardMaterial[];
  side: "east" | "west";
}

function rikishiRig(side: "east" | "west", mawashiColor: number, skinTone: number): RikishiRig {
  const g = new THREE.Group();
  const mats: THREE.MeshStandardMaterial[] = [];

  const skin = new THREE.MeshStandardMaterial({ color: skinTone, roughness: 0.85 });
  const belt = new THREE.MeshStandardMaterial({ color: mawashiColor, roughness: 0.7 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 0.9 });
  mats.push(skin, belt, hair);

  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.56, 24, 18), skin);
  torso.scale.set(0.95, 1.05, 1.18);
  torso.position.y = 1.28;
  g.add(torso);

  const mawashi = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.58, 0.32, 20), belt);
  mawashi.position.y = 0.98;
  g.add(mawashi);
  const sagari = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.1), belt);
  sagari.position.set(0, 0.82, 0.42);
  g.add(sagari);

  const head = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 14), skin);
  head.add(skull);
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), hair);
  knot.scale.set(1.4, 0.6, 1.4);
  knot.position.y = 0.24;
  head.add(knot);
  head.position.y = 1.98;
  g.add(head);

  const armGeo = new THREE.CapsuleGeometry(0.13, 0.42, 4, 10);
  const armL = new THREE.Mesh(armGeo, skin);
  armL.position.set(0, 1.5, 0.58);
  const armR = new THREE.Mesh(armGeo, skin);
  armR.position.set(0, 1.5, -0.58);
  g.add(armL, armR);

  const legGeo = new THREE.CapsuleGeometry(0.17, 0.45, 4, 10);
  const legL = new THREE.Mesh(legGeo, skin);
  legL.position.set(0, 0.42, 0.3);
  const legR = new THREE.Mesh(legGeo, skin);
  legR.position.set(0, 0.42, -0.3);
  g.add(legL, legR);

  return { group: g, torso, head, armL, armR, mats, side };
}

/** Pose the rig from a replay BodyPhase + facing direction (+x = east). */
function poseRig(rig: RikishiRig, st: RikishiState): void {
  const g = rig.group;
  const facing = rig.side === "east" ? 0 : Math.PI; // rig forward is +x
  let leanX = 0;
  let tiltZ = 0;
  let squat = 0;
  let armF = 0.3; // forward rotation of arms
  let armSpread = 0.35;

  switch (st.bodyPhase as BodyPhase) {
    case "bowing":
      leanX = 0.7;
      armF = 1.2;
      break;
    case "charging":
      leanX = 0.55;
      squat = 0.12;
      armF = 1.0;
      armSpread = 0.5;
      break;
    case "grappling":
    case "gripping":
      leanX = 0.35;
      squat = 0.1;
      armF = 1.15;
      armSpread = 0.55;
      break;
    case "pushing":
      leanX = 0.3;
      squat = 0.08;
      armF = 1.45;
      armSpread = 0.42;
      break;
    case "throwing":
      leanX = 0.25;
      armF = 1.9;
      armSpread = 0.6;
      break;
    case "thrown":
      leanX = -0.4;
      tiltZ = rig.side === "east" ? 0.9 : -0.9;
      squat = -0.35;
      armF = 0.4;
      break;
    case "falling":
      leanX = 0.9;
      squat = -0.3;
      break;
    case "victory":
      leanX = -0.08;
      armF = -0.2;
      armSpread = 0.8;
      break;
    default:
      break;
  }

  g.rotation.set(0, facing, 0);
  // 2D rotation is planar tilt; in 3D it reads as a lean toward the opponent.
  tiltZ += THREE.MathUtils.degToRad(-st.rotation * 0.6);
  g.rotateX(leanX);
  g.rotateZ(tiltZ);
  g.scale.setScalar(Math.max(0.05, st.scale));
  g.position.y += squat * -1; // squat lowers, negative squat (thrown) raises baseline then arc lifts

  rig.armL.rotation.x = armF;
  rig.armR.rotation.x = armF;
  rig.armL.rotation.z = -armSpread * 0.4;
  rig.armR.rotation.z = armSpread * 0.4;
  rig.head.rotation.x = -leanX * 0.6;

  for (const m of rig.mats) {
    m.transparent = st.opacity < 1;
    m.opacity = st.opacity;
  }
}

function buildArena(scene: THREE.Scene): void {
  // Arena floor
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(9.5, 10.5, 0.4, 48),
    new THREE.MeshStandardMaterial({ color: 0x1a1611, roughness: 1 })
  );
  floor.position.y = -0.45;
  scene.add(floor);

  // Dohyo
  const dohyo = new THREE.Mesh(
    new THREE.CylinderGeometry(DOHYO_R, DOHYO_R + 0.15, DOHYO_H, 40),
    new THREE.MeshStandardMaterial({ color: CLAY, roughness: 0.95 })
  );
  dohyo.position.y = 0;
  scene.add(dohyo);

  // Tawara bales — ring of small blocks on the dohyo edge
  const baleGeo = new THREE.BoxGeometry(0.34, 0.16, 0.2);
  const baleMat = new THREE.MeshStandardMaterial({ color: TAWARA, roughness: 1 });
  const bales = new THREE.InstancedMesh(baleGeo, baleMat, 20);
  const m = new THREE.Matrix4();
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    m.makeRotationY(-a);
    m.setPosition(Math.cos(a) * (DOHYO_R - 0.28), DOHYO_H / 2 + 0.08, Math.sin(a) * (DOHYO_R - 0.28));
    bales.setMatrixAt(i, m);
  }
  scene.add(bales);

  // Shikiri lines (two short starting lines)
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xd8cfc0 });
  for (const x of [-0.9, 0.9]) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 1.0), lineMat);
    line.position.set(x, DOHYO_H / 2 + 0.01, 0);
    scene.add(line);
  }

  // Suspended canopy (tsuriyane): 4 pillars + roof slab + corner tassels
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x3a2f22, roughness: 0.9 });
  for (const [px, pz] of [
    [4.6, 4.6],
    [4.6, -4.6],
    [-4.6, 4.6],
    [-4.6, -4.6],
  ]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 7, 10), pillarMat);
    pillar.position.set(px, 3.3, pz);
    scene.add(pillar);
  }
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(10.6, 0.5, 10.6),
    new THREE.MeshStandardMaterial({ color: 0x27201a, roughness: 0.9 })
  );
  roof.position.y = 7.1;
  scene.add(roof);
  const roofTrim = new THREE.Mesh(
    new THREE.BoxGeometry(11.2, 0.18, 11.2),
    new THREE.MeshStandardMaterial({ color: 0x4a3a26 })
  );
  roofTrim.position.y = 6.8;
  scene.add(roofTrim);
  const tasselColors = [0x2d6a4f, 0xb84040, 0xd9d9d9, 0x222];
  const tasselPos: Array<[number, number]> = [
    [4.9, 4.9],
    [4.9, -4.9],
    [-4.9, -4.9],
    [-4.9, 4.9],
  ];
  tasselPos.forEach(([tx, tz], i) => {
    const tassel = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.8, 8),
      new THREE.MeshStandardMaterial({ color: tasselColors[i] })
    );
    tassel.position.set(tx, 6.3, tz);
    tassel.rotation.x = Math.PI;
    scene.add(tassel);
  });

  // Gyoji — referee figure beside the ring
  const gyoji = new THREE.Group();
  const robe = new THREE.Mesh(
    new THREE.ConeGeometry(0.32, 1.35, 12),
    new THREE.MeshStandardMaterial({ color: GYOJI })
  );
  robe.position.y = 0.68;
  gyoji.add(robe);
  const gHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 12, 10),
    new THREE.MeshStandardMaterial({ color: SKIN })
  );
  gHead.position.y = 1.45;
  gyoji.add(gHead);
  const gunbai = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.03, 12),
    new THREE.MeshStandardMaterial({ color: 0xd4af37 })
  );
  gunbai.position.set(0.3, 1.0, 0);
  gunbai.rotation.z = 1.2;
  gyoji.add(gunbai);
  gyoji.position.set(0, DOHYO_H / 2, 3.3);
  scene.add(gyoji);

  // Crowd bowls — instanced dim figures in concentric arcs
  const crowdGeo = new THREE.BoxGeometry(0.3, 0.5, 0.3);
  const crowdMat = new THREE.MeshStandardMaterial({ roughness: 1 });
  const crowd = new THREE.InstancedMesh(crowdGeo, crowdMat, 420);
  const c = new THREE.Color();
  let ci = 0;
  for (let ring = 0; ring < 3; ring++) {
    const r = 6.4 + ring * 1.4;
    const h = 0.6 + ring * 0.9;
    const n = 140;
    for (let i = 0; i < n && ci < 420; i++) {
      const a = (i / n) * Math.PI * 2;
      m.makeRotationY(-a);
      m.setPosition(Math.cos(a) * r, h, Math.sin(a) * r);
      crowd.setMatrixAt(ci, m);
      c.setHSL(0.08 + ((i * 37) % 10) * 0.02, 0.25, 0.12 + ((i * 13) % 6) * 0.03);
      crowd.setColorAt(ci, c);
      ci++;
    }
  }
  scene.add(crowd);
}

const PARTICLE_COLOR: Record<Particle["type"], number> = {
  impact: 0xf5f0e6,
  salt: 0xffffff,
  dust: 0xb09873,
  spark: 0xffd764,
  zabuton: 0x8f4fd1,
  confetti: 0xff6d8a,
};

export interface BoutScene3D {
  canvas: HTMLCanvasElement;
  apply(east: RikishiState, west: RikishiState, particles: Particle[], flash: number, shake: { x: number; y: number }, phase: ReplayPhase, t: number): void;
  dispose(): void;
}

/** Build the full scene bound to a WebGL canvas. */
export function createBoutScene(width: number, height: number): BoutScene3D {
  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.display = "block";
  canvas.style.aspectRatio = "8/5";

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));
  renderer.setSize(width, height, false);
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0b08);
  scene.fog = new THREE.Fog(0x0d0b08, 14, 26);

  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 60);
  const camBase = new THREE.Vector3(6.8, 5.2, 8.6);
  camera.position.copy(camBase);
  camera.lookAt(0, 0.9, 0);

  // Lighting: cool ambient + warm key spotlight over the dohyo + rim fill.
  scene.add(new THREE.AmbientLight(0x334, 0.55));
  const key = new THREE.SpotLight(0xffe6b0, 220, 30, Math.PI / 4.5, 0.4);
  key.position.set(0, 7.6, 0.5);
  key.target.position.set(0, 0, 0);
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x6a86ff, 0.7);
  rim.position.set(-6, 4, -6);
  scene.add(rim);

  buildArena(scene);

  const east = rikishiRig("east", MAWASHI_EAST, SKIN);
  const west = rikishiRig("west", MAWASHI_WEST, SKIN_DARK);
  east.group.position.y = DOHYO_H / 2;
  west.group.position.y = DOHYO_H / 2;
  scene.add(east.group, west.group);

  // Particle pool — one Points cloud, per-vertex colors.
  const MAX_P = 256;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(MAX_P * 3);
  const pCol = new Float32Array(MAX_P * 3);
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
  const pMat = new THREE.PointsMaterial({
    size: 0.12,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });
  const points = new THREE.Points(pGeo, pMat);
  points.frustumCulled = false;
  scene.add(points);
  const tmpColor = new THREE.Color();

  function writeParticles(list: Particle[]): void {
    const n = Math.min(list.length, MAX_P);
    for (let i = 0; i < MAX_P; i++) {
      if (i < n) {
        const p = list[i];
        // Canvas px (800x500) → world: x across, y maps to height above dohyo.
        pPos[i * 3] = (p.x / 800 - 0.5) * 8;
        pPos[i * 3 + 1] = Math.max(0.1, (0.62 - p.y / 500) * 7) + 0.3;
        pPos[i * 3 + 2] = ((p.id * 7919) % 100) / 100 * 1.6 - 0.8;
        tmpColor.set(PARTICLE_COLOR[p.type] ?? 0xffffff);
        // zabuton/confetti carry their own palette — use their css color.
        if (p.type === "zabuton" || p.type === "confetti") tmpColor.set(p.color || PARTICLE_COLOR[p.type]);
        pCol[i * 3] = tmpColor.r;
        pCol[i * 3 + 1] = tmpColor.g;
        pCol[i * 3 + 2] = tmpColor.b;
      } else {
        pPos[i * 3 + 1] = -100; // park unused below floor
      }
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.color.needsUpdate = true;
  }

  function placeRikishi(rig: RikishiRig, st: RikishiState): void {
    rig.group.position.x = (st.pos.x - 0.5) * 2 * ARENA_X;
    rig.group.position.z = (st.pos.y - 0.52) * 2 * ARENA_Z;
    rig.group.position.y = DOHYO_H / 2;
    if (st.arcHeight && st.arcProgress && st.arcProgress > 0) {
      rig.group.position.y += Math.sin(st.arcProgress * Math.PI) * st.arcHeight * 14;
    }
    poseRig(rig, st);
  }

  return {
    canvas,
    apply(e, w, particles, flash, shake, phase, t) {
      placeRikishi(east, e);
      placeRikishi(west, w);
      writeParticles(particles);

      // Slow broadcast drift + shake + flash kick on the key light.
      const drift = Math.sin(t * 0.00012) * 0.6;
      camera.position.set(
        camBase.x + drift + shake.x * 0.03,
        camBase.y + shake.y * 0.03,
        camBase.z + Math.cos(t * 0.00009) * 0.5
      );
      camera.lookAt(0, 0.9, 0);
      key.intensity = 220 + flash * 260;
      rim.intensity = phase === "ceremony" ? 1.3 : 0.7;
      renderer.render(scene, camera);
    },
    dispose() {
      renderer.dispose();
      pGeo.dispose();
      pMat.dispose();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
      });
    },
  };
}
