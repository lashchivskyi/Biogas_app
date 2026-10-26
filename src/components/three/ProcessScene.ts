import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

/**
 * Cinematic, fully procedural scene of an agro-industrial biogas plant at dusk, laid out in the real
 * process order of a CSTR plant (EU 142/2011 hygienisation, ATEX gas train):
 *   barn & delivery truck → reception / pre-tank → hygienisation 70 °C (animal by-products)
 *   → digester (side-entry agitators, double-membrane gas roof that breathes, rising bubbles)
 *   → gas cleaning (condensate trap + desulphurisation columns) with emergency flare
 *   → CHP → electricity (overhead line) + useful heat (greenhouse) + heat loop back to the digester
 *   → or upgrading (membranes) → biomethane injection station
 *   → digestate storage → screw-press separator → field spreading.
 *
 * No external assets: geometry + small shaders only, so it ships with the JS bundle. High quality adds
 * soft shadows and bloom; low quality halves particles; reduced motion renders a single still frame.
 * The camera is driven by "chapters" (scroll story on the home page); each chapter highlights its flows.
 */

export const CHAPTERS = ["overview", "feedstock", "digester", "biogas", "energy", "digestate", "outro"] as const;
export type ChapterId = (typeof CHAPTERS)[number];

type FlowKey = "feed" | "gas" | "power" | "heat" | "loop" | "bm" | "digestate";
type Shot = { pos: THREE.Vector3; target: THREE.Vector3; focus: FlowKey[] | "all"; dome: boolean };

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const SHOTS: Record<ChapterId, Shot> = {
  overview: { pos: v(30, 15, 34), target: v(2, 1.5, -1), focus: "all", dome: true },
  feedstock: { pos: v(-26, 7.5, 17), target: v(-11, 1.2, -0.5), focus: ["feed"], dome: false },
  digester: { pos: v(-8, 7.5, 14), target: v(0, 2.2, 0), focus: ["loop"], dome: true },
  biogas: { pos: v(-1, 8.5, 16), target: v(5, 2.8, 3), focus: ["gas"], dome: true },
  energy: { pos: v(4, 8.5, 21), target: v(13, 2, -1), focus: ["power", "heat", "bm"], dome: false },
  digestate: { pos: v(-12, 11, -31), target: v(2, 0.5, -9), focus: ["digestate"], dome: false },
  outro: { pos: v(38, 23, 32), target: v(2, 0, -2), focus: "all", dome: true },
};

const COLORS = {
  feed: new THREE.Color("#8fd16a"),
  gas: new THREE.Color("#ffbf3d"),
  power: new THREE.Color("#5b9bff"),
  heat: new THREE.Color("#ff7a45"),
  digestate: new THREE.Color("#c99a62"),
  bm: new THREE.Color("#46d9ff"),
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
  private static readonly tmp = new THREE.Vector3();
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
    const tmp = Flow.tmp;
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

const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const SKY_FRAG = /* glsl */ `
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y, -0.1, 1.0);
    vec3 zenith = vec3(0.012, 0.045, 0.036);
    vec3 horizon = vec3(0.039, 0.114, 0.086); // = fog colour, so the ground edge dissolves
    vec3 col = mix(horizon, zenith, pow(max(h, 0.0), 0.55));
    // warm after-glow where the sun has set (west, -x)
    float west = pow(max(dot(normalize(vec3(vDir.x, 0.0, vDir.z)), vec3(-0.85, 0.0, -0.53)), 0.0), 6.0);
    col += vec3(0.16, 0.07, 0.02) * west * exp(-max(h, 0.0) * 14.0);
    gl_FragColor = vec4(col, 1.0);
  }
`;
const UV_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const FLAME_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uSize;
  void main() {
    vec2 p = vUv - vec2(0.5, 0.12);
    float flick = 0.08 * sin(uTime * 23.0 + p.y * 14.0) + 0.05 * sin(uTime * 37.0);
    float w = (0.22 + flick) * (1.0 - p.y * 1.1);
    float body = smoothstep(w, 0.0, abs(p.x + 0.03 * sin(uTime * 9.0 + p.y * 8.0)))
      * smoothstep(0.95 * uSize, 0.0, p.y) * smoothstep(-0.08, 0.04, p.y);
    vec3 col = mix(vec3(1.0, 0.85, 0.45), vec3(1.0, 0.35, 0.05), clamp(p.y * 1.4, 0.0, 1.0));
    gl_FragColor = vec4(col * 2.2, body);
  }
`;

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
  private agitators: THREE.Object3D[] = [];
  private flame!: THREE.Mesh;
  private flameMat!: THREE.ShaderMaterial;
  private truck!: THREE.Group;
  private tractor!: THREE.Group;
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

  constructor(canvas: HTMLCanvasElement, opts: SceneOptions) {
    this.opts = opts;
    const high = opts.quality === "high";
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !high, alpha: false, powerPreference: "high-performance" });
    const pr = Math.min(window.devicePixelRatio || 1, high ? 1.75 : 1.25);
    this.renderer.setPixelRatio(pr);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    if (high) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    this.scene.background = new THREE.Color("#06110d");
    this.scene.fog = new THREE.FogExp2("#0a1d16", 0.011);
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(320, 32, 16), new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false })));

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camTarget);

    this.buildWorld();
    if (high) this.enableShadows();

    const P = (x: number, y: number, z: number) => v(x, y, z);
    const count = (n: number) => (high ? n : Math.round(n * 0.5));
    this.flows = {
      // barn → pre-tank → hygienisation → digester
      feed: new Flow([P(-14, 0.6, 2.2), P(-12, 1.7, -0.3), P(-9.6, 2.3, -2.4), P(-8.4, 2.3, -3.2), P(-6, 1.1, -1.6), P(-4.2, 0.9, -0.4)], COLORS.feed, count(80), { speed: 0.05, size: 1.3, pixelRatio: pr }),
      // gas roof → condensate trap / desulphurisation → CHP
      gas: new Flow([P(0, 4.75, 0), P(2.4, 5.2, 2.2), P(5.2, 3.3, 4.0), P(5.4, 1.0, 4.3), P(7.0, 1.2, 3.9), P(8.0, 1.4, 3.4)], COLORS.gas, count(90), { speed: 0.09, size: 1.2, spread: 0.05, pixelRatio: pr }),
      // cleaned gas → membrane upgrading → injection station
      bm: new Flow([P(5.8, 0.6, 4.6), P(7.0, 0.6, 1.4), P(8.6, 1.2, -0.8), P(10.4, 1.2, -1.6), P(12.4, 0.6, -5.2), P(14.6, 0.6, -8.2)], COLORS.bm, count(70), { speed: 0.08, size: 1.1, spread: 0.04, tube: 0.05, pixelRatio: pr }),
      // CHP heat back to the digester heating circuit (process heat comes first)
      loop: new Flow([P(7.6, 0.45, 2.4), P(5.6, 0.4, 2.2), P(4.15, 0.6, 1.2), P(3.6, 0.9, -1.8)], COLORS.heat, count(40), { speed: 0.11, size: 1.0, spread: 0.03, tube: 0.04, pixelRatio: pr }),
      power: new Flow([P(10, 3.4, 2.4), P(12.5, 5.6, -0.5), P(14.5, 5.2, -3), P(16.5, 3.6, -4.5)], COLORS.power, count(70), { speed: 0.18, size: 1.1, spread: 0.02, tube: 0.03, pixelRatio: pr }),
      heat: new Flow([P(10.8, 0.5, 3.6), P(13, 0.5, 5.2), P(15.5, 0.6, 6), P(17.2, 0.9, 6.2)], COLORS.heat, count(60), { speed: 0.09, size: 1.3, pixelRatio: pr }),
      // digester → gas-tight storage → separator → fields
      digestate: new Flow([P(3.4, 0.4, -2.4), P(6, 0.5, -6), P(8.6, 0.7, -9.4), P(4, 0.35, -12), P(-3, 0.3, -14.5), P(-9, 0.3, -15.5)], COLORS.digestate, count(90), { speed: 0.045, size: 1.4, spread: 0.14, pixelRatio: pr }),
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
    this.buildProcessEquipment(steel, dark);
  }

  /** Equipment that makes the process chain technically correct (see the class comment). */
  private buildProcessEquipment(steel: THREE.Material, dark: THREE.Material) {
    const s = this.scene;
    const hot = new THREE.MeshStandardMaterial({ color: "#8a4a22", emissive: "#ff7a45", emissiveIntensity: 1.1 });
    const cyan = new THREE.MeshStandardMaterial({ color: "#0f3b47", emissive: "#46d9ff", emissiveIntensity: 1.2 });
    const amber = new THREE.MeshStandardMaterial({ color: "#3a2a08", emissive: "#ffbf3d", emissiveIntensity: 0.9 });
    const add = <T extends THREE.Object3D>(m: T, x: number, y: number, z: number): T => {
      m.position.set(x, y, z);
      s.add(m);
      return m;
    };

    // hygienisation (70 °C for 60 min, EU 142/2011) — two batch tanks with hot bands
    for (const z of [-2.4, -4.0]) {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 2.3, 24), steel), -8.9, 1.15, z);
      add(new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.05, 6, 32), hot), -8.9, 1.7, z).rotation.x = Math.PI / 2;
    }

    // side-entry agitators on the digester wall: motor outside, propeller turning inside the tank
    const motorMat = new THREE.MeshStandardMaterial({ color: "#2f5a4c", roughness: 0.5, metalness: 0.3 });
    const bladeMat = new THREE.MeshStandardMaterial({ color: "#3ddc97", emissive: "#3ddc97", emissiveIntensity: 0.8 });
    for (const ang of [Math.PI * 0.18, Math.PI * 0.82, Math.PI * 1.5]) {
      const g = new THREE.Group();
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.9, 16), motorMat);
      motor.rotation.z = Math.PI / 2;
      g.add(motor);
      const hub = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI * 2) / 3;
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 0.14), bladeMat);
        b.position.set(0, Math.cos(a) * 0.22, Math.sin(a) * 0.22);
        b.rotation.x = a;
        hub.add(b);
      }
      hub.position.x = -0.55;
      g.add(hub);
      g.position.set(Math.cos(ang) * 4.35, 0.85, Math.sin(ang) * 4.35);
      g.rotation.y = -ang;
      s.add(g);
      this.agitators.push(hub);
    }

    // gas cleaning: two desulphurisation columns (activated carbon / biofilter) + condensate trap
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.7, 20), steel), 5.0, 1.35, 4.0);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.7, 20), steel), 5.95, 1.35, 4.7);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), dark), 6.9, 0.25, 4.2);

    // emergency flare (mandatory safety device) with a shader flame
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 4.4, 10), steel), 3.1, 2.2, 5.9);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.14, 0.35, 12), steel), 3.1, 4.5, 5.9);
    this.flameMat = new THREE.ShaderMaterial({ vertexShader: UV_VERT, fragmentShader: FLAME_FRAG, uniforms: { uTime: { value: 0 }, uSize: { value: 0.3 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.flame = add(new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.2), this.flameMat), 3.1, 5.55, 5.9);

    // membrane upgrading container → biomethane injection station with grid marker
    add(new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.2, 2.0), new THREE.MeshStandardMaterial({ color: "#1d3d47", roughness: 0.5, metalness: 0.25 })), 9.6, 1.1, -1.6);
    add(new THREE.Mesh(new THREE.BoxGeometry(3.62, 0.06, 2.02), cyan), 9.6, 1.85, -1.6);
    for (let i = 0; i < 4; i++) add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 8), cyan), 9.6, 2.35, -2.2 + i * 0.4).rotation.z = Math.PI / 2;
    add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 1.3), dark), 14.8, 0.65, -8.5);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.8, 8), amber), 15.9, 0.9, -8.0);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), amber), 15.9, 1.85, -8.0);

    // digestate: screw-press separator and solid-fraction heap
    add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.1), new THREE.MeshStandardMaterial({ color: "#4b5a53", roughness: 0.6, metalness: 0.3 })), 9.2, 1.2, -9.6);
    add(new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.1, 18), new THREE.MeshStandardMaterial({ color: "#6b4c2c", roughness: 1 })), 10.9, 0.55, -10.8);

    // access road + delivery tanker (feedstock also arrives from processors, not only the barn)
    add(new THREE.Mesh(new THREE.PlaneGeometry(46, 2.6), new THREE.MeshStandardMaterial({ color: "#1b2622", roughness: 1 })), -37, 0.025, 8.4).rotation.set(-Math.PI / 2, 0, 0.1);
    this.truck = new THREE.Group();
    const trailer = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 4.2, 18), new THREE.MeshStandardMaterial({ color: "#c9d3ce", roughness: 0.4, metalness: 0.5 }));
    trailer.rotation.z = Math.PI / 2;
    trailer.position.set(-0.6, 1.25, 0);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.7, 1.7), motorMat);
    cab.position.set(2.2, 1.05, 0);
    const lamp = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.25), new THREE.MeshStandardMaterial({ color: "#222222", emissive: "#fff3c4", emissiveIntensity: 2.4 }));
    lamp.position.set(2.92, 0.7, 0);
    lamp.rotation.y = Math.PI / 2;
    this.truck.add(trailer, cab, lamp);
    s.add(this.truck);

    // digestate tanker with trailing-hose boom on the field (nutrients go back to the soil)
    this.tractor = new THREE.Group();
    const tanker = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.4, 16), new THREE.MeshStandardMaterial({ color: "#7a5a36", roughness: 0.6 }));
    tanker.rotation.z = Math.PI / 2;
    tanker.position.set(-1.2, 0.9, 0);
    const tr = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 1.0), new THREE.MeshStandardMaterial({ color: "#2f7a43", roughness: 0.6 }));
    tr.position.set(0.8, 0.75, 0);
    const boom = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 4.2), steel);
    boom.position.set(-2.5, 0.45, 0);
    this.tractor.add(tanker, tr, boom);
    s.add(this.tractor);
  }

  private enableShadows() {
    const moon = this.scene.children.find((o) => (o as THREE.DirectionalLight).isDirectionalLight) as THREE.DirectionalLight | undefined;
    if (moon) {
      moon.castShadow = true;
      moon.shadow.mapSize.set(2048, 2048);
      const c = moon.shadow.camera;
      c.left = -40;
      c.right = 40;
      c.top = 40;
      c.bottom = -40;
      c.near = 1;
      c.far = 120;
      moon.shadow.bias = -0.0004;
      moon.shadow.normalBias = 0.03;
    }
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !(m.material instanceof THREE.MeshStandardMaterial)) return;
      m.receiveShadow = true;
      m.castShadow = !(m.geometry instanceof THREE.PlaneGeometry);
    });
  }

  setChapter(id: ChapterId, immediate = false) {
    this.chapter = id;
    const shot = SHOTS[id];
    for (const [k, f] of Object.entries(this.flows) as [FlowKey, Flow][]) {
      f.targetIntensity = shot.focus === "all" ? 1 : shot.focus.includes(k) ? 1.6 : 0.22;
    }
    this.domeMat.uniforms.uGlow.value = shot.dome ? 1 : 0.35;
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

    // gas roof breathing (gas holder filling / emptying)
    const fill = Math.sin(t * 0.6);
    const breathe = 0.74 + fill * 0.035;
    this.dome.scale.set(1, breathe, 1);
    this.domeMat.uniforms.uTime.value = t;
    // the emergency flare only burns while the gas holder is near full — a safety device, never routine
    const flare = Math.max(0, (fill - 0.7) / 0.3);
    this.flameMat.uniforms.uTime.value = t;
    this.flameMat.uniforms.uSize.value = 0.25 + 0.75 * flare;
    this.flame.visible = flare > 0.02 || this.chapter === "biogas";
    this.flame.lookAt(this.camera.position.x, this.flame.position.y, this.camera.position.z);
    // side-entry agitators
    for (const a of this.agitators) a.rotation.x = t * 2.4;
    // delivery truck: drives in, unloads, returns (24 s cycle)
    const ct = (t % 24) / 24;
    const leg = ct < 0.4 ? ct / 0.4 : ct < 0.55 ? 1 : 1 - (ct - 0.55) / 0.45;
    const e = leg * leg * (3 - 2 * leg);
    this.truck.position.set(THREE.MathUtils.lerp(-58, -16.5, e), 0, THREE.MathUtils.lerp(10.5, 6.4, e));
    this.truck.rotation.y = ct < 0.55 ? 0.1 : Math.PI + 0.1;
    // digestate tanker crossing the field
    const ft = (t % 30) / 30;
    const sweep = ft < 0.5 ? ft * 2 : 2 - ft * 2;
    this.tractor.position.set(-23 + sweep * 20, 0, -18 + Math.sin(ft * Math.PI * 2) * 0.4);
    this.tractor.rotation.y = ft < 0.5 ? 0.1 : Math.PI + 0.1;

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
