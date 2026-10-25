import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * Animated brand emblem: a CH₄ molecule in true tetrahedral geometry that tumbles slowly and,
 * every few seconds, settles into the one orientation where its two front bonds read as a check
 * mark — the Methalytics logo. Motion explains the brand ("data → verdict"), it is not decoration.
 *
 * Cheap by design: ~6 meshes, no post-processing, renders only while visible.
 */

const TETRA = [
  new THREE.Vector3(1, 1, 1),
  new THREE.Vector3(1, -1, -1),
  new THREE.Vector3(-1, 1, -1),
  new THREE.Vector3(-1, -1, 1),
].map((v) => v.normalize());

/** Target 2D directions of the check (screen space): short bond up-left, long bond up-right. */
const TARGET_SHORT = new THREE.Vector2(-0.62, 0.62);
const TARGET_LONG = new THREE.Vector2(0.69, 0.76);

/** Search for the rotation that turns two tetrahedral bonds into the check (others point away). */
function findCheckPose(): THREE.Quaternion {
  let best = new THREE.Quaternion();
  let bestScore = Infinity;
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const tmp = new THREE.Vector3();
  // deterministic grid + refinement (no Math.random → same pose on server and client)
  for (let a = 0; a < 36; a++)
    for (let b = 0; b < 18; b++)
      for (let c = 0; c < 36; c++) {
        e.set((a / 36) * Math.PI * 2, (b / 18) * Math.PI, (c / 36) * Math.PI * 2);
        q.setFromEuler(e);
        const p = TETRA.map((v) => tmp.copy(v).applyQuaternion(q).clone());
        // bond 0 → long, bond 1 → short, bonds 2/3 behind (z < 0)
        const long = new THREE.Vector2(p[0].x, p[0].y);
        const short = new THREE.Vector2(p[1].x, p[1].y);
        const score =
          long.clone().sub(TARGET_LONG).lengthSq() +
          short.clone().sub(TARGET_SHORT).lengthSq() +
          Math.max(0, p[0].z + 0.05) +
          Math.max(0, p[1].z + 0.05) +
          Math.max(0, p[2].z + 0.25) * 2 +
          Math.max(0, p[3].z + 0.25) * 2;
        if (score < bestScore) {
          bestScore = score;
          best = q.clone();
        }
      }
  return best;
}

export interface EmblemOptions {
  reducedMotion: boolean;
}

export class MoleculeEmblem {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  private group = new THREE.Group();
  private carbonMat: THREE.MeshPhysicalMaterial;
  private checkBonds: THREE.Mesh[] = [];
  private bubbles: THREE.Mesh[] = [];
  private pose = findCheckPose();
  private timer = new THREE.Timer();
  private raf = 0;
  private running = false;
  private t = 0;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, private opts: EmblemOptions) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera.position.set(0, 0, 7.2);
    this.scene.add(this.group);
    this.scene.add(new THREE.AmbientLight("#9fe9c9", 0.6));
    const key = new THREE.DirectionalLight("#ffffff", 2.2);
    key.position.set(3, 4, 5);
    this.scene.add(key);
    const rim = new THREE.PointLight("#3ddc97", 18, 12);
    rim.position.set(-3, -2, 2);
    this.scene.add(rim);

    this.carbonMat = new THREE.MeshPhysicalMaterial({ color: "#1fbf7b", emissive: "#3ddc97", emissiveIntensity: 0.35, roughness: 0.25, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.15 });
    const hMat = new THREE.MeshPhysicalMaterial({ color: "#f4f7f5", roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 });
    const hBackMat = new THREE.MeshPhysicalMaterial({ color: "#e8a521", emissive: "#e8a521", emissiveIntensity: 0.25, roughness: 0.3, clearcoat: 1 });
    const bondMat = new THREE.MeshStandardMaterial({ color: "#3ddc97", emissive: "#3ddc97", emissiveIntensity: 0.6, roughness: 0.35 });
    const bondDim = new THREE.MeshStandardMaterial({ color: "#2a6b52", roughness: 0.5, transparent: true, opacity: 0.75 });

    this.group.add(new THREE.Mesh(new THREE.SphereGeometry(0.62, 48, 32), this.carbonMat));
    const L = 1.75;
    TETRA.forEach((dir, i) => {
      const front = i < 2;
      const bondLen = L - 0.3;
      const bond = new THREE.Mesh(new THREE.CylinderGeometry(front ? 0.13 : 0.09, front ? 0.13 : 0.09, bondLen, 20), front ? bondMat : bondDim);
      bond.position.copy(dir.clone().multiplyScalar(bondLen / 2 + 0.15));
      bond.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      this.group.add(bond);
      if (front) this.checkBonds.push(bond);
      const h = new THREE.Mesh(new THREE.SphereGeometry(i === 0 ? 0.42 : 0.36, 32, 24), i === 3 ? hBackMat : hMat);
      h.position.copy(dir.clone().multiplyScalar(L));
      this.group.add(h);
    });

    // rising "biogas" bubbles behind the molecule
    const bubbleMat = new THREE.MeshPhysicalMaterial({ color: "#e8a521", emissive: "#e8a521", emissiveIntensity: 0.4, transparent: true, opacity: 0.7, roughness: 0.1 });
    for (let i = 0; i < 7; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.06 + (i % 3) * 0.03, 12, 8), bubbleMat);
      b.position.set(-1.6 + (i * 0.53) % 3.2, -2.2 + i * 0.6, -1.4);
      this.scene.add(b);
      this.bubbles.push(b);
    }
    this.group.quaternion.copy(this.pose);
    this.renderFrame();
  }

  resize(w: number, h: number) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (!this.running) this.renderFrame();
  }

  start() {
    if (this.running || this.disposed || this.opts.reducedMotion) return;
    this.running = true;
    this.timer.reset();
    const loop = (ts: number) => {
      if (!this.running) return;
      this.timer.update(ts);
      this.tick(Math.min(this.timer.getDelta(), 0.05));
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private tumble = new THREE.Quaternion();
  private tick(dt: number) {
    this.t += dt;
    const cycle = 9; // seconds: 6 s tumbling → settle → 2 s check hold
    const phase = this.t % cycle;
    // free tumble orientation
    this.tumble.setFromEuler(new THREE.Euler(this.t * 0.45, this.t * 0.7, this.t * 0.25));
    const tumble = this.pose.clone().multiply(this.tumble);
    let k: number; // 0 = tumbling, 1 = check pose
    if (phase < 5.2) k = 0;
    else if (phase < 6.6) k = THREE.MathUtils.smootherstep(phase, 5.2, 6.6);
    else if (phase < 8.3) k = 1;
    else k = 1 - THREE.MathUtils.smoothstep(phase, 8.3, 9);
    this.group.quaternion.copy(tumble).slerp(this.pose, k);
    const glow = 0.35 + 0.9 * k;
    this.carbonMat.emissiveIntensity = glow;
    for (const b of this.checkBonds) (b.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + 1.2 * k;
    for (const [i, b] of this.bubbles.entries()) {
      b.position.y += dt * (0.35 + (i % 3) * 0.12);
      if (b.position.y > 2.4) b.position.y = -2.4;
    }
    this.renderFrame();
  }

  private renderFrame() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mat = m.material as THREE.Material | undefined;
      mat?.dispose?.();
    });
    this.scene.environment?.dispose();
    this.renderer.dispose();
  }
}
