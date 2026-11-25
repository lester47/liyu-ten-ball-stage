import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { LANE_COLORS, rainbow, TEAM } from './palette';
import { groundText, pillLabel } from './labels';

/*
 * 場景座標：舞台地板 x 0–10 公尺（左→右）、z 0–8 公尺（後→前，觀眾在 +z）。
 * 第 n 條球道（n = 0 最靠觀眾）中心 z = 7 - n * 1.5。
 * 光影與配色沿用鯉魚市集白天設定：半球光、暖色太陽、ACES 色調與淡藍霧。
 */

export const laneZ = (n: number) => 7 - n * 1.5;
export const STOPS = [
  { d: 1, name: '外點', color: '#ffffff', ink: '#1f2a1c' },
  { d: 2, name: '中點', color: '#3f9a4a', ink: '#ffffff' },
  { d: 3.3, name: '急停', color: '#e5484d', ink: '#ffffff' },
  { d: 3.8, name: '內點', color: '#7658ed', ink: '#ffffff' },
];

// 低多邊形材質快取：同色共用
const MATS = new Map<string, THREE.MeshStandardMaterial>();
export function mat(color: THREE.ColorRepresentation, opt: THREE.MeshStandardMaterialParameters = {}) {
  const key = String(color) + JSON.stringify(opt);
  if (!MATS.has(key))
    MATS.set(key, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.86, ...opt }));
  return MATS.get(key)!;
}

export function box(
  parent: THREE.Object3D,
  size: [number, number, number],
  color: THREE.ColorRepresentation,
  pos: [number, number, number],
  material?: THREE.Material,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material ?? mat(color));
  mesh.position.set(...pos);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// 可重現的亂數
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

export function createRenderer(viewport: HTMLElement) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 900);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  viewport.prepend(renderer.domElement);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // 只有 LED（自發光很強）會超過門檻，白色地板與天空不會泛光
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.9, 0.55, 1.6);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(5, 0, 4);
  controls.maxPolarAngle = Math.PI / 2 - 0.06;
  controls.minDistance = 3;
  controls.maxDistance = 45;
  controls.enableDamping = true;
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;

  return { scene, camera, renderer, composer, bloom, controls };
}

const VIEWS: [number, number, number][] = [
  [5, 9.5, 20.5], // 觀眾席
  [5, 20, 4.001], // 正上方
  [-10, 7.5, 4], // 左側
  [20, 7.5, 4], // 右側
  [5, 9.5, 20.5], // 視角重設
  [5, 2.3, 16], // 家長視角（坐在觀眾席走道的高度）
];
export function setView(camera: THREE.PerspectiveCamera, controls: OrbitControls, i: number) {
  camera.position.set(...VIEWS[i]);
  controls.target.set(5, i === 5 ? 0.6 : i === 1 ? 0 : 1.2, i === 1 ? 4 : 3.2);
  controls.update();
}

function addLights(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight('#e3f2ff', '#cdb991', 1.05));
  const sun = new THREE.DirectionalLight('#fff1d6', 2.5);
  sun.position.set(-6, 18, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.target.position.set(5, 0, 4);
  scene.add(sun, sun.target);
}

function addSky(scene: THREE.Scene) {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color('#4fb0f0') },
      hor: { value: new THREE.Color('#d6eefc') },
      bot: { value: new THREE.Color('#8fd0e8') },
    },
    vertexShader:
      'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:
      'uniform vec3 top; uniform vec3 hor; uniform vec3 bot; varying vec3 vP; void main(){ float h=vP.y; vec3 c = h>0.0 ? mix(hor, top, pow(clamp(h,0.0,1.0),0.55)) : mix(hor, bot, clamp(-h*4.0,0.0,1.0)); gl_FragColor=vec4(c,1.0); }',
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), m);
  sky.renderOrder = -10;
  scene.add(sky);
  scene.fog = new THREE.Fog('#d3ebf8', 90, 420);
}

function addSea(scene: THREE.Scene) {
  const geo = new THREE.PlaneGeometry(900, 900, 120, 120);
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.MeshStandardMaterial({
    color: '#3fa6c9',
    flatShading: true,
    roughness: 0.38,
    metalness: 0.04,
  });
  const uTime = { value: 0 };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float w = sin(position.x*.16+uTime*.9)*.22 + cos(position.z*.13+uTime*.7)*.2 + sin((position.x+position.z)*.31+uTime*1.6)*.07;
        transformed.y += w;`,
      );
  };
  const sea = new THREE.Mesh(geo, m);
  sea.position.y = -1.6;
  sea.receiveShadow = true;
  scene.add(sea);
  return uTime;
}

/** 低多邊形小島：沙灘、草地、遠山與雲。 */
function addIsland(scene: THREE.Scene) {
  const r = rng(7);
  const jitter = (geo: THREE.BufferGeometry, amount: number) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i),
        a = Math.atan2(z, x);
      const k = 1 + Math.sin(a * 3 + 1.3) * amount + Math.sin(a * 7) * amount * 0.4;
      p.setX(i, x * k);
      p.setZ(i, z * k);
    }
    geo.computeVertexNormals();
    return geo;
  };
  const sand = new THREE.Mesh(jitter(new THREE.CylinderGeometry(27, 30, 1.6, 22), 0.05), mat('#ecd9a8'));
  sand.position.set(5, -1.05, 4);
  sand.receiveShadow = true;
  scene.add(sand);
  const grass = new THREE.Mesh(jitter(new THREE.CylinderGeometry(24, 25.5, 0.5, 22), 0.05), mat('#8cc66a'));
  grass.position.set(5, -0.5, 4);
  grass.receiveShadow = true;
  scene.add(grass);
  // 草地上的深淺色塊
  for (let i = 0; i < 14; i++) {
    const a = r() * Math.PI * 2,
      d = 13 + r() * 9;
    const patch = new THREE.Mesh(
      new THREE.CircleGeometry(1.5 + r() * 2.5, 7),
      mat(r() > 0.5 ? '#7fbb5d' : '#9fd178'),
    );
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(5 + Math.cos(a) * d, -0.24, 4 + Math.sin(a) * d);
    patch.receiveShadow = true;
    scene.add(patch);
  }
  // 遠山
  for (let i = 0; i < 16; i++) {
    const a = -Math.PI * 0.95 + (i / 15) * Math.PI * 0.9 + r() * 0.1;
    const d = 150 + r() * 80,
      h = 25 + r() * 40;
    const hill = new THREE.Mesh(new THREE.ConeGeometry(h * 1.4, h, 7), mat(i % 3 ? '#6aa955' : '#5a9a4d'));
    hill.position.set(5 + Math.cos(a) * d, h / 2 - 2, 4 + Math.sin(a) * d);
    hill.rotation.y = r() * 3;
    scene.add(hill);
  }
  // 雲
  for (let i = 0; i < 9; i++) {
    const cloud = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const puff = new THREE.Mesh(
        new THREE.IcosahedronGeometry(2.6 + r() * 2.2, 0),
        mat('#ffffff', { roughness: 1 }),
      );
      puff.position.set(k * 3 - 4.5, r() * 1.5, r() * 2);
      cloud.add(puff);
    }
    const a = r() * Math.PI * 2;
    cloud.position.set(
      5 + Math.cos(a) * (70 + r() * 60),
      26 + r() * 18,
      4 + Math.sin(a) * (70 + r() * 60) - 30,
    );
    scene.add(cloud);
  }
}

function tree(scene: THREE.Scene, x: number, z: number, s: number, kind: number, r: () => number) {
  const g = new THREE.Group();
  g.position.set(x, -0.25, z);
  g.scale.setScalar(s);
  g.rotation.y = r() * 6;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.9, 6), mat('#8a5a3b'));
  trunk.position.y = 0.45;
  trunk.castShadow = true;
  g.add(trunk);
  const greens = ['#4f9a48', '#5fae4f', '#3f8a46', '#6dbb57'];
  if (kind === 0) {
    for (let k = 0; k < 3; k++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.85 - k * 0.2, 1.1, 7), mat(greens[(k + 2) % 4]));
      cone.position.y = 1.2 + k * 0.6;
      cone.castShadow = true;
      g.add(cone);
    }
  } else {
    const top = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 0), mat(greens[Math.floor(r() * 4)]));
    top.position.y = 1.55;
    top.castShadow = true;
    g.add(top);
    const top2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), mat(greens[Math.floor(r() * 4)]));
    top2.position.set(0.45, 1.2, 0.2);
    top2.castShadow = true;
    g.add(top2);
  }
  scene.add(g);
}

function addTrees(scene: THREE.Scene) {
  const r = rng(21);
  for (let i = 0; i < 46; i++) {
    const a = r() * Math.PI * 2,
      d = 11 + r() * 11.5;
    const x = 5 + Math.cos(a) * d,
      z = 4 + Math.sin(a) * d;
    // 觀眾席前方保持開闊
    if (z > 8 && x > -6 && x < 16) continue;
    tree(scene, x, z, 0.8 + r() * 0.7, r() > 0.55 ? 0 : 1, r);
  }
  // 舞台四角各一棵
  for (const [x, z] of [
    [-2.4, -1.6],
    [12.4, -1.6],
  ])
    tree(scene, x, z, 1.05, 1, r);
}

/** 木造舞台、球道、停點標記與終點線。 */
function addStage(scene: THREE.Scene) {
  box(scene, [13.4, 0.5, 10.6], '#d9ae78', [5, -0.3, 4]); // 木台
  for (let i = 0; i < 9; i++)
    box(scene, [13.42, 0.04, 0.03], '#c4955f', [5, -0.12 - (i % 2) * 0.18, -1.2 + i * 1.3]);
  box(scene, [13.6, 0.08, 10.8], '#f3e3c2', [5, -0.04, 4]); // 台面收邊（前緣放停點名稱）
  box(scene, [10, 0.06, 8], '#fdf7ea', [5, 0, 4]); // 白色表演區
  // 孩子站位墊（藍／橘）
  box(scene, [1.15, 0.06, 8], TEAM.left, [-0.65, 0.005, 4], mat('#bfe0fb'));
  box(scene, [1.15, 0.06, 8], TEAM.right, [10.65, 0.005, 4], mat('#ffdcbc'));
  box(scene, [0.06, 0.07, 8], TEAM.left, [-0.06, 0.01, 4]);
  box(scene, [0.06, 0.07, 8], TEAM.right, [10.06, 0.01, 4]);
  // 前方台階
  box(scene, [3.4, 0.25, 0.6], '#d9ae78', [5, -0.38, 9.6]);

  for (let lane = 0; lane < 5; lane++) {
    const z = laneZ(lane);
    box(scene, [10, 0.012, 1.25], LANE_COLORS[lane], [5, 0.035, z]);
    box(scene, [10, 0.014, 0.04], '#ffffff', [5, 0.04, z + 0.69]);
    box(scene, [0.03, 0.016, 1.25], '#a9b7c0', [5, 0.042, z]); // 中線
    for (const left of [true, false])
      for (const s of STOPS) {
        const dot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.085, 0.085, 0.012, 16),
          new THREE.MeshStandardMaterial({ color: s.color, roughness: 0.6 }),
        );
        dot.position.set(left ? s.d : 10 - s.d, 0.046, z + 0.5);
        dot.receiveShadow = true;
        scene.add(dot);
        if (s.d !== 1)
          box(
            scene,
            [0.025, 0.013, 1.0],
            s.color,
            [left ? s.d : 10 - s.d, 0.043, z - 0.08],
            new THREE.MeshStandardMaterial({ color: s.color, transparent: true, opacity: 0.35 }),
          );
      }
  }
  box(scene, [10, 0.014, 0.04], '#ffffff', [5, 0.04, laneZ(4) - 0.69]);

  // 停點名稱：舞台前緣的膠囊標籤
  for (const s of STOPS)
    for (const left of [true, false]) {
      // 平貼在舞台前緣：從觀眾席看得清楚，低角度的家長視角也不會擋到球
      const sprite = pillLabel(`${s.name} ${s.d}`, {
        color: s.color === '#ffffff' ? '#9aa7b0' : s.color,
        height: 0.5,
      });
      const flat = new THREE.Mesh(
        new THREE.PlaneGeometry(sprite.scale.x, sprite.scale.y),
        new THREE.MeshBasicMaterial({
          map: (sprite.material as THREE.SpriteMaterial).map,
          transparent: true,
          depthWrite: false,
        }),
      );
      flat.rotation.x = -Math.PI / 2;
      // 急停與內點只差 0.5 m，前後錯開避免標籤重疊
      flat.position.set(left ? s.d : 10 - s.d, 0.04, s.d === 3.8 ? 8.3 : 8.85);
      scene.add(flat);
    }

  // 終點線（外點 1.0 m）：整條欄杆＋每條球道一段，到站亮金色
  const finishRails = [1, 9].map((x) =>
    box(
      scene,
      [0.14, 0.03, 7.4],
      '#c9d3da',
      [x, 0.05, 4],
      new THREE.MeshStandardMaterial({ color: '#c9d3da' }),
    ),
  );
  const finish = Array.from({ length: 10 }, (_, i) => {
    const left = i < 5;
    return box(
      scene,
      [0.18, 0.035, 1.15],
      '#fff',
      [left ? 1 : 9, 0.06, laneZ(i % 5)],
      new THREE.MeshStandardMaterial({ color: left ? TEAM.left : TEAM.right }),
    );
  });

  const audienceText = groundText('觀 眾 席', '#2f6a2f', 4, 0.8);
  audienceText.position.set(5, -0.23, 11.3);
  scene.add(audienceText);
  return { finish, finishRails };
}

/** 舞台後方大背板：彩虹拱門＋「鯉魚十球秀」招牌＋鯉魚。 */
function addBackdrop(scene: THREE.Scene) {
  const g = new THREE.Group();
  g.position.set(5, 0, -1.9);
  scene.add(g);
  for (const x of [-6.2, 6.2]) {
    box(g, [0.35, 4.2, 0.35], '#d9ae78', [x, 1.9, 0]);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), mat('#e3a33b'));
    cap.position.set(x, 4.15, 0);
    g.add(cap);
  }
  // 招牌
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 400;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 2048, 0);
  rainbow.forEach((col, i) => grad.addColorStop(i / (rainbow.length - 1), col));
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(0, 0, 2048, 400, 120);
  ctx.fill();
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(18, 18, 2012, 364, 104);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(46, 46, 1956, 308, 84);
  ctx.fill();
  drawKoi(ctx, 250, 200, 1);
  drawKoi(ctx, 1798, 200, -1);
  ctx.fillStyle = '#e8572b';
  ctx.font = '900 200px "Noto Sans TC","Microsoft JhengHei",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('鯉魚十球秀', 1024, 212);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(10.5, 2.05),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }),
  );
  sign.position.set(0, 2.95, 0.2);
  sign.castShadow = true;
  g.add(sign);
  box(g, [10.8, 2.25, 0.18], '#ffffff', [0, 2.95, 0.08]);
  // 背板下方的彩色條紋布幕
  for (let i = 0; i < 12; i++)
    box(
      g,
      [1.0, 1.85, 0.08],
      rainbow[i % 10],
      [-5.5 + i * 1.0, 0.92, 0.02],
      mat(rainbow[i % 10], { roughness: 0.95 }),
    );
}

function drawKoi(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.fillStyle = '#ff7a3d';
  ctx.beginPath();
  ctx.ellipse(0, 0, 150, 78, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath(); // 尾巴
  ctx.moveTo(-120, 0);
  ctx.lineTo(-215, -80);
  ctx.quadraticCurveTo(-180, 0, -215, 80);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(-20, -30, 55, 30, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(60, 35, 40, 22, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1f2a1c';
  ctx.beginPath();
  ctx.arc(95, -18, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 兩側彩旗串與熱氣球般的彩色氣球。回傳旗子（用於輕微擺動）。 */
function addBunting(scene: THREE.Scene) {
  const flags: THREE.Mesh[] = [];
  const poles: [number, number][] = [
    [-2.1, -1.3],
    [-2.1, 9.2],
    [12.1, -1.3],
    [12.1, 9.2],
  ];
  for (const [x, z] of poles) {
    box(scene, [0.12, 3.6, 0.12], '#ffffff', [x, 1.55, z]);
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), mat('#e3a33b'));
    top.position.set(x, 3.4, z);
    scene.add(top);
  }
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.17, 0, 0, 0.17, 0, 0, 0, -0.38, 0], 3));
  tri.computeVertexNormals();
  const strings: [THREE.Vector3, THREE.Vector3][] = [
    [new THREE.Vector3(-2.1, 3.3, -1.3), new THREE.Vector3(-2.1, 3.3, 9.2)],
    [new THREE.Vector3(12.1, 3.3, -1.3), new THREE.Vector3(12.1, 3.3, 9.2)],
    [new THREE.Vector3(-2.1, 3.3, -1.3), new THREE.Vector3(1.0, 4.4, -1.75)],
    [new THREE.Vector3(12.1, 3.3, -1.3), new THREE.Vector3(9.0, 4.4, -1.75)],
  ];
  let k = 0;
  for (const [a, b] of strings) {
    const n = Math.round(a.distanceTo(b) / 0.5);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = a.clone().lerp(b, t);
      p.y -= Math.sin(t * Math.PI) * 0.55;
      pts.push(p);
    }
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: '#7a6a55' }),
    );
    scene.add(line);
    for (let i = 1; i < n; i++) {
      const f = new THREE.Mesh(
        tri,
        new THREE.MeshStandardMaterial({ color: rainbow[k++ % 10], side: THREE.DoubleSide, roughness: 0.9 }),
      );
      f.position.copy(pts[i]);
      f.lookAt(pts[i].clone().add(new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3(0, 1, 0))));
      f.userData.phase = k * 0.7;
      f.userData.rz = f.rotation.z;
      f.castShadow = true;
      scene.add(f);
      flags.push(f);
    }
  }
  // 氣球束
  const r = rng(5);
  for (const [x, z] of [
    [-1.6, -1.7],
    [11.6, -1.7],
  ])
    for (let i = 0; i < 5; i++) {
      const bx = x + (r() - 0.5) * 0.9,
        bz = z + (r() - 0.5) * 0.6,
        by = 4.2 + r() * 1.1;
      const balloon = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 12, 10),
        new THREE.MeshStandardMaterial({ color: rainbow[(i * 3 + (x < 0 ? 0 : 1)) % 10], roughness: 0.35 }),
      );
      balloon.scale.y = 1.18;
      balloon.position.set(bx, by, bz);
      balloon.castShadow = true;
      scene.add(balloon);
      scene.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(bx, by - 0.35, bz),
            new THREE.Vector3(x, 2.4, z),
          ]),
          new THREE.LineBasicMaterial({ color: '#ffffff' }),
        ),
      );
    }
  return flags;
}

/** 觀眾席：長椅上坐著各色小觀眾，衝線與謝幕時舉手歡呼。 */
function addAudience(scene: THREE.Scene) {
  const r = rng(33);
  const people: { arms: THREE.Group[]; body: THREE.Group; phase: number }[] = [];
  const shirts = ['#e5484d', '#3f9a4a', '#7658ed', '#e3a33b', '#16a5ef', '#df52ba', '#13b8a6', '#ffffff'];
  for (let row = 0; row < 2; row++) {
    const z = 12.4 + row * 1.6;
    for (const side of [-1, 1]) {
      const cx = 5 + side * 3.9;
      box(scene, [5.4, 0.12, 0.5], '#c4955f', [cx, 0.15, z]);
      for (const lx of [-2.4, 2.4]) box(scene, [0.12, 0.4, 0.45], '#a87b4a', [cx + lx, -0.05, z]);
      for (let s = 0; s < 6; s++) {
        if (r() < 0.18) continue;
        const body = new THREE.Group();
        body.position.set(cx - 2.2 + s * 0.88 + (r() - 0.5) * 0.15, 0.21, z);
        body.rotation.y = Math.PI + (5 - (cx - 2.2 + s * 0.88)) * 0.03;
        const shirt = mat(shirts[Math.floor(r() * shirts.length)]);
        const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.25, 4, 8), shirt);
        torso.position.y = 0.36;
        torso.castShadow = true;
        body.add(torso);
        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.17, 12, 10),
          mat(['#f6cfaa', '#e7b088', '#d9a07a'][Math.floor(r() * 3)]),
        );
        head.position.y = 0.8;
        head.castShadow = true;
        body.add(head);
        const hair = new THREE.Mesh(
          new THREE.SphereGeometry(0.18, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.1),
          mat(['#3a2a22', '#262626', '#7a4b2a', '#9a9a9a'][Math.floor(r() * 4)]),
        );
        hair.position.y = 0.82;
        body.add(hair);
        const arms = [-1, 1].map((sx) => {
          const arm = new THREE.Group();
          arm.position.set(sx * 0.21, 0.5, 0);
          const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.24, 3, 6), shirt);
          a.position.y = -0.14;
          arm.add(a);
          arm.rotation.z = sx * 0.25;
          body.add(arm);
          return arm;
        });
        scene.add(body);
        people.push({ arms, body, phase: r() * 6 });
      }
    }
  }
  return people;
}

export function buildWorld(scene: THREE.Scene) {
  addLights(scene);
  addSky(scene);
  const seaTime = addSea(scene);
  addIsland(scene);
  addTrees(scene);
  const stage = addStage(scene);
  addBackdrop(scene);
  const flags = addBunting(scene);
  const audience = addAudience(scene);
  return { seaTime, flags, audience, ...stage };
}
