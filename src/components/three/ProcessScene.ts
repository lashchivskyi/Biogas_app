import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

/**
 * Cinematic, fully procedural scene of a farm-scale biogas plant at dusk:
 * barn → feedstock pipe → digester (breathing gas dome, rising bubbles) → gas line → CHP
 * → electricity (overhead line) + heat (to greenhouse) → digestate back to the fields.
 *
 * No external assets: everything is geometry + small shaders, so it loads with the JS bundle.
 * The camera is driven by "chapters" (scroll story on the home page); each chapter highlights its flow.
 */

export const CHAPTERS = ["overview", "feedstock", "digester", "biogas", "energy", "digestate", "outro"] as const;
export type ChapterId = (typeof CHAPTERS)[number];

type Shot = { pos: THREE.Vector3; target: THREE.Vector3; focus: FlowKey | "all" | "dome" };
type FlowKey = "feed" | "gas" | "power" | "heat" | "digestate";

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const SHOTS: Record<ChapterId, Shot> = {
  overview: { pos: v(30, 15, 34), target: v(2, 1.5, -1), focus: "all" },
  feedstock: { pos: v(-27, 7, 16), target: v(-15, 1.5, 1.5), focus: "feed" },
  digester: { pos: v(-7, 7.5, 14), target: v(0, 2.4, 0), focus: "dome" },
  biogas: { pos: v(-3, 10, 15), target: v(4.5, 4, 1.5), focus: "gas" },
  energy: { pos: v(5, 7.5, 21), target: v(14, 2, 1), focus: "power" },
  digestate: { pos: v(-14, 10, -30), target: v(0, 0.5, -8), focus: "digestate" },
  outro: { pos: v(38, 23, 32), target: v(2, 0, -2), focus: "all" },
};

const COLORS = {
  feed: new THREE.Color("#8fd16a"),
  gas: new THREE.Color("#ffbf3d"),
  power: new THREE.Color("#5b9bff"),
  heat: new THREE.Color("#ff7a45"),
  digestate: new THREE.Color("#c99a62"),
  dome: new THREE.Color("#3ddc97"),
};

/* ---------------- particles flowing along a curve ---------------- */

const POINT_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  varying float vAlpha;
  uniform float uPixelRatio;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (110.0 / -mv.z);
    vAlpha = aAlpha;
  }
`;
const POINT_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = smoothstep(0.5, 0.0, d);
    a *= a;
    gl_FragColor = vec4(uColor * (0.6 + uIntensity), a * vAlpha * clamp(uIntensity, 0.15, 1.6));
  }
`;

class Flow {
  readonly points: THREE.Points;
  readonly tube: THREE.Mesh;
  private readonly curve: THREE.CatmullRomCurve3;
  private readonly offsets: Float32Array;
  private readonly pos: Float32Array;
  private readonly speed: number;
  private readonly spread: number;
  readonly material: THREE.ShaderMaterial;
  private readonly tubeMat: THREE.MeshBasicMaterial;
  intensity = 1;
  targetIntensity = 1;

  constructor(pts: THREE.Vector3[], color: THREE.Color, count: number, opts: { speed?: number; size?: number; spread?: number; tube?: number; pixelRatio: number }) {
    this.curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.4);
    this.speed = opts.speed ?? 0.08;
    this.spread = opts.spread ?? 0.08;
    this.offsets = new Float32Array(count);
    this.pos = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      this.offsets[i] = i / count + Math.random() * 0.01;
      sizes[i] = (opts.size ?? 1) * (0.7 + Math.random() * 0.6);
      alphas[i] = 0.55 + Math.random() * 0.45;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));
    this.material = new THREE.ShaderMaterial({
      vertexShader: POINT_VERT,
      fragmentShader: POINT_FRAG,
      uniforms: { uColor: { value: color }, uIntensity: { value: 1 }, uPixelRatio: { value: opts.pixelRatio } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(g, this.material);
    this.points.frustumCulled = false;

    this.tubeMat = new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(0.55), transparent: true, opacity: 0.5 });
    this.tube = new THREE.Mesh(new THREE.TubeGeometry(this.curve, 80, opts.tube ?? 0.07, 6, false), this.tubeMat);
    this.update(0, 0);
  }

  update(time: number, dt: number) {
    this.intensity += (this.targetIntensity - this.intensity) * Math.min(1, dt * 2.5);
    this.material.uniforms.uIntensity.value = this.intensity;
    this.tubeMat.opacity = 0.22 + 0.4 * Math.min(1, this.intensity);
    const n = this.offsets.length;
    const tmp = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const t = (this.offsets[i] + time * this.speed) % 1;
      this.curve.getPointAt(t, tmp);
      const j = i * 3;
      const w = Math.sin(i * 12.9898 + time * 2) * this.spread;
      this.pos[j] = tmp.x + w;
      this.pos[j + 1] = tmp.y + Math.cos(i * 4.1 + time * 1.7) * this.spread;
      this.pos[j + 2] = tmp.z + Math.sin(i * 7.3) * this.spread;
    }
    (this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
}

/* ---------------- shaders for dome & ground ---------------- */

const DOME_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vY;
  uniform float uTime;
  void main() {
    vec3 p = position;
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vView = normalize(-mv.xyz);
    vY = position.y;
    gl_Position = projectionMatrix * mv;
  }
`;
const DOME_FRAG = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vY;
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uGlow;
  void main() {
    float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.2);
    float bands = 0.5 + 0.5 * sin(vY * 9.0 - uTime * 1.6);
    vec3 base = vec3(0.86, 0.92, 0.88) * 0.10;
    vec3 col = base + uColor * (fres * (0.9 + uGlow) + bands * 0.05 * uGlow);
    gl_FragColor = vec4(col, 0.55 + fres * 0.4);
  }
`;

function stripeTexture(colA: string, colB: string, rows: number): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = colA;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = colB;
  const h = 256 / rows;
  for (let i = 0; i < rows; i += 2) ctx.fillRect(0, i * h, 256, h * 0.55);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------------- the scene ---------------- */

export interface SceneOptions {
  quality: "high" | "low";
  reducedMotion: boolean;
}

export class ProcessScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer | null = null;
  private bloom: UnrealBloomPass | null = null;
  private flows: Record<FlowKey, Flow>;
  private bubbles: THREE.Points;
  private bubbleData: Float32Array;
  private dome: THREE.Mesh;
  private domeMat: THREE.ShaderMaterial;
  private stars: THREE.Points;
  private last = 0;
  private raf = 0;
  private running = false;
  private time = 0;
  private chapter: ChapterId = "overview";
  private camPos = SHOTS.overview.pos.clone();
  private camTarget = SHOTS.overview.target.clone();
  private pointer = new THREE.Vector2();
  private disposed = false;
  private readonly opts: SceneOptions;
  onFirstFrame?: () => void;
  private firstFrameSent = false;

  constructor(private canvas: HTMLCanvasElement, opts: SceneOptions) {
    this.opts = opts;
    const high = opts.quality === "high";
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !high, alpha: false, powerPreference: "high-performance" });
    const pr = Math.min(window.devicePixelRatio || 1, high ? 1.75 : 1.25);
    this.renderer.setPixelRatio(pr);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene.background = new THREE.Color("#06110d");
    this.scene.fog = new THREE.FogExp2("#0a1d16", 0.012);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camTarget);

    this.buildWorld();

    const P = (x: number, y: number, z: number) => v(x, y, z);
    const count = (n: number) => (high ? n : Math.round(n * 0.5));
    this.flows = {
      feed: new Flow([P(-14, 0.6, 2.2), P(-11, 0.7, 1.8), P(-7.5, 0.7, 1.2), P(-4.3, 0.9, 0.6)], COLORS.feed, count(70), { speed: 0.06, size: 1.3, pixelRatio: pr }),
      gas: new Flow([P(0, 4.9, 0), P(2.5, 6.0, 0.6), P(6, 5.0, 2), P(8.6, 3.0, 3)], COLORS.gas, count(90), { speed: 0.1, size: 1.2, spread: 0.06, pixelRatio: pr }),
      power: new Flow([P(10, 3.4, 2.4), P(12.5, 5.6, -0.5), P(14.5, 5.2, -3), P(16.5, 3.6, -4.5)], COLORS.power, count(70), { speed: 0.18, size: 1.1, spread: 0.02, tube: 0.03, pixelRatio: pr }),
      heat: new Flow([P(10.8, 0.5, 3.6), P(13, 0.5, 5.2), P(15.5, 0.6, 6), P(17.2, 0.9, 6.2)], COLORS.heat, count(60), { speed: 0.09, size: 1.3, pixelRatio: pr }),
      digestate: new Flow([P(3.6, 0.4, -2.2), P(6, 0.5, -6), P(3, 0.35, -11), P(-3, 0.3, -14.5), P(-9, 0.3, -15)], COLORS.digestate, count(90), { speed: 0.05, size: 1.4, spread: 0.14, pixelRatio: pr }),
    };
    for (const f of Object.values(this.flows)) this.scene.add(f.tube, f.points);

    // dome (gas holder membrane)
    this.domeMat = new THREE.ShaderMaterial({
      vertexShader: DOME_VERT,
      fragmentShader: DOME_FRAG,
      uniforms: { uColor: { value: COLORS.dome }, uTime: { value: 0 }, uGlow: { value: 0.4 } },
      transparent: true,
      depthWrite: false,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(4.05, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), this.domeMat);
    this.dome.position.set(0, 2.4, 0);
    this.scene.add(this.dome);

    // bubbles rising inside the digester
    const nb = high ? 220 : 110;
    this.bubbleData = new Float32Array(nb * 3);
    const bpos = new Float32Array(nb * 3);
    const bsize = new Float32Array(nb);
    const balpha = new Float32Array(nb);
    for (let i = 0; i < nb; i++) {
      const r = Math.sqrt(Math.random()) * 3.3;
      const a = Math.random() * Math.PI * 2;
      this.bubbleData[i * 3] = Math.cos(a) * r;
      this.bubbleData[i * 3 + 1] = Math.sin(a) * r;
      this.bubbleData[i * 3 + 2] = Math.random();
      bsize[i] = 0.5 + Math.random() * 0.9;
      balpha[i] = 0.4 + Math.random() * 0.6;
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute("position", new THREE.BufferAttribute(bpos, 3));
    bg.setAttribute("aSize", new THREE.BufferAttribute(bsize, 1));
    bg.setAttribute("aAlpha", new THREE.BufferAttribute(balpha, 1));
    this.bubbles = new THREE.Points(
      bg,
      new THREE.ShaderMaterial({
        vertexShader: POINT_VERT,
        fragmentShader: POINT_FRAG,
        uniforms: { uColor: { value: COLORS.gas }, uIntensity: { value: 0.9 }, uPixelRatio: { value: pr } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.bubbles.frustumCulled = false;
    this.scene.add(this.bubbles);

    // stars
    const ns = 600;
    const sp = new Float32Array(ns * 3);
    for (let i = 0; i < ns; i++) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.random() * 0.45 * Math.PI;
      const R = 160;
      sp[i * 3] = R * Math.cos(th) * Math.cos(ph);
      sp[i * 3 + 1] = 20 + R * Math.sin(ph);
      sp[i * 3 + 2] = R * Math.sin(th) * Math.cos(ph);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: "#a9c9bb", size: 0.6, sizeAttenuation: true, transparent: true, opacity: 0.55, fog: false }));
    this.scene.add(this.stars);

    if (high) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.85, 0.55, 0.18);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    }

    this.setChapter("overview", true);
  }

  private buildWorld() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight("#6fa894", "#0d1712", 1.15));
    const moon = new THREE.DirectionalLight("#c9dcff", 1.25);
    moon.position.set(-30, 40, 20);
    s.add(moon);
    const warm = new THREE.PointLight("#ffb347", 18, 26, 2);
    warm.position.set(17, 2, 6);
    s.add(warm);
    const amber = new THREE.PointLight("#ffbf3d", 10, 14, 2);
    amber.position.set(0, 6.5, 0);
    s.add(amber);
    const green = new THREE.PointLight("#3ddc97", 6, 16, 2);
    green.position.set(-2, 3, 5);
    s.add(green);

    // ground + fields
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: "#11241b", roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    s.add(ground);
    const grid = new THREE.GridHelper(400, 200, "#16352a", "#10261e");
    grid.position.y = 0.01;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.45;
    s.add(grid);
    const fieldTex = stripeTexture("#173a26", "#235c3a", 24);
    const fields: Array<[number, number, number, number, number]> = [
      [-12, -18, 26, 14, 0.1],
      [14, -20, 22, 16, -0.15],
      [-30, 2, 16, 22, 0.05],
      [30, 14, 20, 18, 0.2],
      [-4, 22, 24, 12, -0.08],
    ];
    for (const [x, z, w, d, rot] of fields) {
      const tex = fieldTex.clone();
      tex.repeat.set(1, d / 6);
      tex.needsUpdate = true;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = rot;
      m.position.set(x, 0.02, z);
      s.add(m);
    }

    const concrete = new THREE.MeshStandardMaterial({ color: "#56645e", roughness: 0.85, metalness: 0.05 });
    const dark = new THREE.MeshStandardMaterial({ color: "#2a3832", roughness: 0.8 });
    const steel = new THREE.MeshStandardMaterial({ color: "#5d6b66", roughness: 0.4, metalness: 0.6 });
    const windowMat = new THREE.MeshStandardMaterial({ color: "#1a1206", emissive: "#ffb347", emissiveIntensity: 2.2 });

    // digester body + ring
    const digester = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 2.4, 48), concrete);
    digester.position.set(0, 1.2, 0);
    s.add(digester);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.05, 0.08, 8, 64), new THREE.MeshStandardMaterial({ color: "#3ddc97", emissive: "#3ddc97", emissiveIntensity: 1.6 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 2.4;
    s.add(ring);

    const glowTex = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const g = c.getContext("2d")!;
      const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, "rgba(61,220,151,0.55)");
      grd.addColorStop(1, "rgba(61,220,151,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    })();
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.03;
    s.add(glow);

    // storage tank (post-digester)
    const store = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 1.6, 40), concrete);
    store.position.set(6, 0.8, -6);
    s.add(store);
    const storeDome = new THREE.Mesh(new THREE.SphereGeometry(3.02, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#d9e2dc", roughness: 0.6 }));
    storeDome.scale.y = 0.45;
    storeDome.position.set(6, 1.6, -6);
    s.add(storeDome);

    // barn
    const barn = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(7, 2.6, 4.5), dark);
    body.position.y = 1.3;
    barn.add(body);
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-3.8, 0);
    roofShape.lineTo(0, 1.6);
    roofShape.lineTo(3.8, 0);
    roofShape.closePath();
    const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(roofShape, { depth: 4.9, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: "#6b4630", roughness: 0.85 }));
    roof.position.set(0, 2.6, -2.45);
    barn.add(roof);
    for (let i = -2; i <= 2; i++) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45), windowMat);
      w.position.set(i * 1.3, 1.6, 2.26);
      barn.add(w);
    }
    barn.position.set(-17, 0, 2);
    s.add(barn);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.6, 24), concrete);
    tank.position.set(-12, 0.8, -1.5);
    s.add(tank);

    // CHP container + stack
    const chp = new THREE.Mesh(new THREE.BoxGeometry(4, 2.4, 2.2), new THREE.MeshStandardMaterial({ color: "#2f5a4c", roughness: 0.55, metalness: 0.2 }));
    chp.position.set(9.5, 1.2, 3);
    s.add(chp);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.02, 0.05, 2.22), new THREE.MeshStandardMaterial({ color: "#ffbf3d", emissive: "#ffbf3d", emissiveIntensity: 0.7 }));
    stripe.position.set(9.5, 2.0, 3);
    s.add(stripe);
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 3.2, 12), steel);
    stack.position.set(10.9, 3.4, 2.6);
    s.add(stack);

    // greenhouse
    const ghGroup = new THREE.Group();
    const ghBox = new THREE.BoxGeometry(7, 2.2, 4);
    const glass = new THREE.Mesh(ghBox, new THREE.MeshStandardMaterial({ color: "#ffe2b0", emissive: "#ff9d3d", emissiveIntensity: 0.18, transparent: true, opacity: 0.16, roughness: 0.1, depthWrite: false }));
    glass.position.y = 1.1;
    ghGroup.add(glass);
    const frameMat = new THREE.LineBasicMaterial({ color: "#ffc27a", transparent: true, opacity: 0.85 });
    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(ghBox), frameMat);
    frame.position.y = 1.1;
    ghGroup.add(frame);
    const roofG = new THREE.CylinderGeometry(2, 2, 7, 4, 1, true, 0, Math.PI);
    const roofLines = new THREE.LineSegments(new THREE.EdgesGeometry(roofG), frameMat);
    roofLines.rotation.set(0, 0, Math.PI / 2);
    roofLines.scale.set(1, 1, 0.6);
    roofLines.position.y = 2.2;
    ghGroup.add(roofLines);
    const plantMat = new THREE.MeshStandardMaterial({ color: "#2f7a43", emissive: "#2f7a43", emissiveIntensity: 0.35 });
    for (let r = -1; r <= 1; r++) {
      const row = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.45, 0.5), plantMat);
      row.position.set(0, 0.25, r * 1.15);
      ghGroup.add(row);
    }
    ghGroup.position.set(19, 0, 6.3);
    s.add(ghGroup);

    // consumer building + windows
    const fac = new THREE.Mesh(new THREE.BoxGeometry(6, 3.6, 4), dark);
    fac.position.set(19, 1.8, -5);
    s.add(fac);
    for (let r = 0; r < 2; r++)
      for (let c = 0; c < 4; c++) {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), new THREE.MeshStandardMaterial({ color: "#081428", emissive: "#5b9bff", emissiveIntensity: 1.8 }));
        w.position.set(16.95, 1.1 + r * 1.3, -6.4 + c * 0.95);
        w.rotation.y = -Math.PI / 2;
        s.add(w);
      }

    // pylons
    for (const [x, z] of [[12.5, -0.5], [14.5, -3]] as const) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 5.6, 6), steel);
      pole.position.set(x, 2.8, z);
      s.add(pole);
    }

    // trees (low-poly cones) for scale
    const tree = new THREE.MeshStandardMaterial({ color: "#123826", roughness: 1 });
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    for (let i = 0; i < 46; i++) {
      const x = rnd(-60, 60);
      const z = rnd(-50, 40);
      if (Math.abs(x) < 24 && Math.abs(z) < 18) continue;
      const h = rnd(2, 4.5);
      const t = new THREE.Mesh(new THREE.ConeGeometry(h * 0.35, h, 6), tree);
      t.position.set(x, h / 2, z);
      s.add(t);
    }
  }

  setChapter(id: ChapterId, immediate = false) {
    this.chapter = id;
    const shot = SHOTS[id];
    for (const [k, f] of Object.entries(this.flows) as [FlowKey, Flow][]) {
      f.targetIntensity = shot.focus === "all" ? 1 : shot.focus === k ? 1.6 : 0.25;
    }
    this.domeMat.uniforms.uGlow.value = shot.focus === "dome" || shot.focus === "all" ? 1 : 0.35;
    if (immediate || this.opts.reducedMotion) {
      this.camPos.copy(shot.pos);
      this.camTarget.copy(shot.target);
      if (!this.running) this.renderOnce();
    }
  }

  setPointer(x: number, y: number) {
    this.pointer.set(x, y);
  }

  resize(w: number, h: number) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // narrow screens: pull back so the plant stays in frame
    this.camera.fov = w / h < 0.8 ? 58 : 42;
    // wide screens: shift the frame so the subject sits right of the copy column
    if (w / h > 1.1) this.camera.setViewOffset(w, h, -w * 0.17, 0, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    this.composer?.setSize(w, h);
    this.bloom?.setSize(w, h);
    if (!this.running) this.renderOnce();
  }

  start() {
    if (this.running || this.disposed) return;
    if (this.opts.reducedMotion) {
      this.renderOnce();
      return;
    }
    this.running = true;
    this.last = performance.now();
    const loop = (ts: number) => {
      if (!this.running) return;
      const dt = Math.min(Math.max((ts - this.last) / 1000, 0), 0.05);
      this.last = ts;
      this.tick(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private renderOnce() {
    this.tick(0);
  }

  private tick(dt: number) {
    this.time += dt;
    const t = this.time;
    const shot = SHOTS[this.chapter];

    // camera: ease toward the chapter shot; idle orbit on overview; subtle pointer parallax
    const k = 1 - Math.exp(-dt * 2.2);
    const goal = shot.pos.clone();
    if (this.chapter === "overview" || this.chapter === "outro") {
      const a = t * 0.04;
      const rel = goal.clone().sub(shot.target);
      rel.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.sin(a) * 0.35);
      goal.copy(shot.target).add(rel);
    }
    goal.x += this.pointer.x * 1.2;
    goal.y += this.pointer.y * 0.6;
    if (dt === 0) {
      this.camPos.copy(goal);
    } else {
      this.camPos.lerp(goal, k);
      this.camTarget.lerp(shot.target, k);
    }
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camTarget);

    for (const f of Object.values(this.flows)) f.update(t, dt === 0 ? 1 : dt);

    // gas dome breathing (gas holder filling / emptying)
    const breathe = 0.74 + Math.sin(t * 0.6) * 0.035;
    this.dome.scale.set(1, breathe, 1);
    this.domeMat.uniforms.uTime.value = t;

    // bubbles
    const pos = this.bubbles.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const n = arr.length / 3;
    for (let i = 0; i < n; i++) {
      const y = (this.bubbleData[i * 3 + 2] + t * (0.05 + (i % 7) * 0.008)) % 1;
      arr[i * 3] = this.bubbleData[i * 3] + Math.sin(t * 1.3 + i) * 0.06;
      arr[i * 3 + 1] = 1.0 + y * 4.3 * breathe;
      arr[i * 3 + 2] = this.bubbleData[i * 3 + 1] + Math.cos(t * 1.1 + i) * 0.06;
    }
    pos.needsUpdate = true;
    this.stars.rotation.y = t * 0.003;

    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);

    if (!this.firstFrameSent && this.onFirstFrame) {
      this.firstFrameSent = true;
      this.onFirstFrame();
    }
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose?.();
    });
    this.composer?.dispose();
    this.renderer.dispose();
  }
}
