import * as THREE from 'three';
import { freeCard, isFree, type Mark } from '../freeShow';
import { C as FREE_CENTER } from '../shows/kit';
import { KOI_SHAPE } from '../shows/koi';
import { TEAM } from './palette';

/*
 * 自由走位用的「地上膠帶」：每段只亮出這段要用的記號，
 * 像老師在教室地板貼的紙膠帶，給孩子一個大概的目標就好。
 */

const TAPE = '#f2b632';
const tapeMat = (color: string, opacity = 0.9) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.75, transparent: true, opacity });

function strip(
  parent: THREE.Object3D,
  w: number,
  d: number,
  x: number,
  z: number,
  m: THREE.Material,
  rot = 0,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, d), m);
  mesh.position.set(x, 0.042, z);
  mesh.rotation.y = rot;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function dashedRing(parent: THREE.Object3D, rx: number, rz: number, m: THREE.Material, n = 36) {
  for (let k = 0; k < n; k++) {
    const a = ((k + 0.5) / n) * Math.PI * 2;
    // 切線方向：膠帶沿著圓（或橢圓）貼
    const dx = -Math.sin(a) * rx,
      dz = Math.cos(a) * rz;
    const len = ((Math.hypot(dx, dz) * Math.PI * 2) / n) * 0.6;
    strip(
      parent,
      len,
      0.07,
      FREE_CENTER.x + Math.cos(a) * rx,
      FREE_CENTER.z + Math.sin(a) * rz,
      m,
      -Math.atan2(dz, dx),
    );
  }
}

function cross(parent: THREE.Object3D, x: number, z: number, m: THREE.Material) {
  strip(parent, 0.42, 0.08, x, z, m, Math.PI / 4);
  strip(parent, 0.42, 0.08, x, z, m, -Math.PI / 4);
}

type P2 = [number, number];
/** 經過各點的平滑封閉曲線（Catmull-Rom）。 */
function smoothClosed(ctx: CanvasRenderingContext2D, pts: P2[]) {
  const n = pts.length;
  ctx.moveTo(...pts[0]);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n],
      p1 = pts[i],
      p2 = pts[(i + 1) % n],
      p3 = pts[(i + 2) % n];
    ctx.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) / 6,
      p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6,
      p2[1] - (p3[1] - p1[1]) / 6,
      p2[0],
      p2[1],
    );
  }
  ctx.closePath();
}

/** 一片半透明、帶鰭條的魚鰭（從 base 往外飄）。 */
function fin(ctx: CanvasRenderingContext2D, base: P2, a: P2, tip: P2, b: P2, color: string) {
  const g = ctx.createLinearGradient(base[0], base[1], tip[0], tip[1]);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(255,150,90,0.6)');
  ctx.beginPath();
  ctx.moveTo(...base);
  ctx.quadraticCurveTo(a[0], a[1], tip[0], tip[1]);
  ctx.quadraticCurveTo(b[0], b[1], base[0], base[1]);
  ctx.fillStyle = g;
  ctx.fill();
  // 鰭條：從根部放射到鰭緣
  ctx.strokeStyle = 'rgba(200,60,15,0.4)';
  ctx.lineWidth = 0.025;
  const ma: P2 = [(a[0] + tip[0]) / 2, (a[1] + tip[1]) / 2],
    mb: P2 = [(b[0] + tip[0]) / 2, (b[1] + tip[1]) / 2];
  for (let k = 0; k <= 6; k++) {
    const f = k / 6;
    const end: P2 =
      f < 0.5
        ? [ma[0] + (tip[0] - ma[0]) * f * 2, ma[1] + (tip[1] - ma[1]) * f * 2]
        : [tip[0] + (mb[0] - tip[0]) * (f - 0.5) * 2, tip[1] + (mb[1] - tip[1]) * (f - 0.5) * 2];
    ctx.beginPath();
    ctx.moveTo(...base);
    ctx.lineTo(...end);
    ctx.stroke();
  }
}

/** 平鋪在地上的大錦鯉（魚頭朝右）：紅白錦鯉配金色頭頂，球排在牠的邊緣上。 */
function buildKoi() {
  const K = KOI_SHAPE;
  const x0 = 0.4,
    x1 = 9.6,
    z0 = K.cz - 3.1,
    z1 = K.cz + 3.1,
    ppm = 180;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round((x1 - x0) * ppm);
  canvas.height = Math.round((z1 - z0) * ppm);
  const ctx = canvas.getContext('2d')!;
  // 以公尺作畫：畫布 x → 舞台 x，畫布 y → 舞台 z
  ctx.scale(ppm, ppm);
  ctx.translate(-x0, -z0);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const { cx, cz, rx, rz } = K;
  const on = (deg: number, side: number, k = 1): P2 => [
    cx + Math.cos((deg * Math.PI) / 180) * rx * k,
    cz + side * Math.sin((deg * Math.PI) / 180) * rz * k,
  ];
  const OUTLINE = '#d9480f';

  // 池塘水波：淡淡的藍色漣漪，讓魚像在水裡
  ctx.strokeStyle = 'rgba(56,160,220,0.28)';
  for (const [k, w] of [
    [1.12, 0.05],
    [1.24, 0.035],
  ]) {
    ctx.lineWidth = w;
    ctx.setLineDash([0.5, 0.25]);
    ctx.beginPath();
    ctx.ellipse(cx - 0.4, cz, (rx + 1.2) * k, rz * k, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // 尾鰭：蝴蝶般飄逸的雙尾
  const ped: P2 = [cx - rx * 0.86, cz];
  const tail = (side: number) => {
    const tip: P2 = [K.tailTipX, cz + side * K.tailTipZ];
    const g = ctx.createLinearGradient(ped[0], cz, K.tailTipX, cz);
    g.addColorStop(0, 'rgba(255,110,50,0.95)');
    g.addColorStop(0.6, 'rgba(255,150,90,0.75)');
    g.addColorStop(1, 'rgba(255,214,170,0.55)');
    ctx.beginPath();
    ctx.moveTo(ped[0], cz + side * 0.45);
    ctx.bezierCurveTo(ped[0] - 0.6, cz + side * 1.1, tip[0] + 0.5, tip[1] - side * 0.1, tip[0], tip[1]);
    ctx.bezierCurveTo(tip[0] + 0.15, tip[1] - side * 0.9, K.notchX - 0.25, cz + side * 0.7, K.notchX, cz);
    ctx.lineTo(ped[0], cz);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 0.06;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    // 鰭條
    ctx.strokeStyle = 'rgba(217,72,15,0.3)';
    ctx.lineWidth = 0.03;
    for (let k = 1; k <= 6; k++) {
      const f = k / 7;
      ctx.beginPath();
      ctx.moveTo(ped[0], cz + side * 0.25);
      ctx.quadraticCurveTo(
        ped[0] - 0.8,
        cz + side * (0.4 + f * 1.4),
        K.notchX - 0.1 + (tip[0] - K.notchX) * (0.4 + f * 0.6),
        cz + side * (0.25 + f * (K.tailTipZ - 0.35)),
      );
      ctx.stroke();
    }
  };
  tail(-1);
  tail(1);

  // 胸鰭、腹鰭：半透明，像薄紗
  for (const side of [-1, 1]) {
    const base = on(62, side, 0.78);
    fin(
      ctx,
      base,
      [base[0] + 0.9, base[1] + side * 0.9],
      [base[0] - 0.2, base[1] + side * 1.25],
      [base[0] - 0.7, base[1] + side * 0.4],
      'rgba(255,170,110,0.85)',
    );
    const base2 = on(128, side, 0.8);
    fin(
      ctx,
      base2,
      [base2[0] + 0.2, base2[1] + side * 0.6],
      [base2[0] - 0.7, base2[1] + side * 0.75],
      [base2[0] - 0.6, base2[1] + side * 0.15],
      'rgba(255,170,110,0.75)',
    );
  }

  // 身體：經過所有 ✕ 點，後段收細接到尾巴
  const BODY: P2[] = [
    on(0, 1),
    on(25, 1),
    on(50, 1),
    on(75, 1),
    on(95, 1),
    on(120, 1),
    on(140, 1),
    [ped[0] + 0.1, cz + 0.62],
    [ped[0] - 0.05, cz],
    [ped[0] + 0.1, cz - 0.62],
    on(140, -1),
    on(120, -1),
    on(95, -1),
    on(75, -1),
    on(50, -1),
    on(25, -1),
  ];
  const bodyPath = () => {
    ctx.beginPath();
    smoothClosed(ctx, BODY);
  };
  ctx.save();
  ctx.shadowColor = 'rgba(120,60,20,0.35)';
  ctx.shadowBlur = 0.25 * ppm;
  ctx.shadowOffsetY = 0.08 * ppm;
  bodyPath();
  const base = ctx.createRadialGradient(cx + 0.8, cz, 0.2, cx, cz, rx * 1.05);
  base.addColorStop(0, '#fffdf8');
  base.addColorStop(0.75, '#fff3e4');
  base.addColorStop(1, '#ffe0c4');
  ctx.fillStyle = base;
  ctx.fill();
  ctx.restore();

  // 以下花紋都限制在身體裡
  ctx.save();
  bodyPath();
  ctx.clip();
  // 紅色大斑（紅白錦鯉）
  const red = (pts: P2[], c = '#d7191c') => {
    ctx.beginPath();
    smoothClosed(ctx, pts);
    const g = ctx.createLinearGradient(pts[0][0], pts[0][1] - 1, pts[0][0], pts[0][1] + 1);
    g.addColorStop(0, c);
    g.addColorStop(1, '#ee3524');
    ctx.fillStyle = g;
    ctx.fill();
  };
  // 頭頂丹頂、背上三塊紅斑
  red([
    [cx + rx - 1.25, cz - 0.55],
    [cx + rx - 0.55, cz - 0.6],
    [cx + rx - 0.35, cz],
    [cx + rx - 0.55, cz + 0.6],
    [cx + rx - 1.25, cz + 0.55],
    [cx + rx - 1.5, cz],
  ]);
  red([
    [cx + 0.9, cz - 1.9],
    [cx + 1.5, cz - 0.9],
    [cx + 1.1, cz + 0.5],
    [cx + 0.2, cz + 0.9],
    [cx - 0.3, cz - 0.2],
    [cx + 0.1, cz - 1.5],
  ]);
  red([
    [cx - 0.8, cz + 0.3],
    [cx - 0.3, cz + 1.4],
    [cx - 1.1, cz + 2.1],
    [cx - 1.9, cz + 1.2],
    [cx - 1.6, cz + 0.2],
  ]);
  red([
    [cx - 1.9, cz - 1.0],
    [cx - 1.3, cz - 0.4],
    [cx - 1.9, cz + 0.1],
    [cx - 2.5, cz - 0.4],
  ]);
  // 金色光澤
  const gold = ctx.createLinearGradient(cx, cz - rz, cx, cz + rz);
  gold.addColorStop(0, 'rgba(255,210,60,0.0)');
  gold.addColorStop(0.5, 'rgba(255,210,60,0.18)');
  gold.addColorStop(1, 'rgba(255,210,60,0.0)');
  ctx.fillStyle = gold;
  ctx.fillRect(cx - rx, cz - rz, rx * 2, rz * 2);
  // 鱗片：一排排淡淡的弧線
  ctx.strokeStyle = 'rgba(180,80,30,0.1)';
  ctx.lineWidth = 0.025;
  const sc = 0.34;
  for (let x = cx + rx - 1.6; x > ped[0] - 0.2; x -= sc * 0.8)
    for (let z = cz - rz; z < cz + rz + sc; z += sc) {
      const off = Math.round((cx + rx - x) / (sc * 0.8)) % 2 ? sc / 2 : 0;
      ctx.beginPath();
      ctx.arc(x, z + off, sc / 2, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();
    }
  // 背鰭：沿著背脊的一道細長鰭
  const dorsal = ctx.createLinearGradient(cx + 0.9, cz, cx - 1.8, cz);
  dorsal.addColorStop(0, 'rgba(255,120,60,0.0)');
  dorsal.addColorStop(0.3, 'rgba(255,120,60,0.55)');
  dorsal.addColorStop(1, 'rgba(255,120,60,0.2)');
  ctx.beginPath();
  ctx.moveTo(cx + 0.9, cz);
  ctx.quadraticCurveTo(cx - 0.5, cz - 0.32, cx - 1.9, cz - 0.05);
  ctx.quadraticCurveTo(cx - 0.5, cz + 0.12, cx + 0.9, cz);
  ctx.fillStyle = dorsal;
  ctx.fill();
  ctx.strokeStyle = 'rgba(217,72,15,0.45)';
  ctx.lineWidth = 0.02;
  for (let k = 0; k < 9; k++) {
    const x = cx + 0.7 - k * 0.3;
    ctx.beginPath();
    ctx.moveTo(x, cz - 0.02);
    ctx.lineTo(x - 0.18, cz - 0.2 + k * 0.012);
    ctx.stroke();
  }
  // 身體高光
  const hi = ctx.createRadialGradient(cx + 1.2, cz - 0.9, 0.05, cx + 1.2, cz - 0.9, 1.3);
  hi.addColorStop(0, 'rgba(255,255,255,0.55)');
  hi.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hi;
  ctx.fillRect(cx - rx, cz - rz, rx * 2, rz * 2);
  ctx.restore();

  // 輪廓：球就貼著這條線排
  bodyPath();
  ctx.lineWidth = 0.08;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();

  // 眼睛（有亮點）與嘴邊鬚
  for (const side of [-1, 1]) {
    const ex = cx + rx - 0.95,
      ez = cz + side * 0.72;
    ctx.beginPath();
    ctx.arc(ex, ez, 0.26, 0, Math.PI * 2);
    ctx.fillStyle = '#fff8e8';
    ctx.fill();
    ctx.lineWidth = 0.04;
    ctx.strokeStyle = '#d9480f';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ex + 0.05, ez, 0.16, 0, Math.PI * 2);
    ctx.fillStyle = '#1f2a1c';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex + 0.1, ez - 0.06, 0.05, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + rx - 0.2, cz + side * 0.25);
    ctx.bezierCurveTo(
      cx + rx + 0.25,
      cz + side * 0.35,
      cx + rx + 0.2,
      cz + side * 0.75,
      cx + rx + 0.5,
      cz + side * 0.85,
    );
    ctx.lineWidth = 0.035;
    ctx.strokeStyle = '#c2410c';
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(cx + rx - 0.3, cz, 0.2, -0.8, 0.8);
  ctx.lineWidth = 0.05;
  ctx.strokeStyle = '#a8350c';
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const material = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    roughness: 0.8,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.add(mesh);
  group.position.set((x0 + x1) / 2, 0.036, (z0 + z1) / 2);
  return { group, materials: [material] };
}

const teamOf = (x: number) => (x < 5 ? TEAM.left : TEAM.right);

function buildMarks(parent: THREE.Object3D, marks: Mark[]) {
  const tape = tapeMat(TAPE);
  const colored = (color?: string, x = 0) =>
    color === 'team' ? tapeMat(teamOf(x), 0.85) : color ? tapeMat(color, 0.85) : tape;
  for (const m of marks) {
    if (m.k === 'ring') dashedRing(parent, m.rx, m.rz ?? m.rx, colored(m.color), m.n ?? 36);
    if (m.k === 'line') {
      const x0 = m.x0 ?? 0.4,
        x1 = m.x1 ?? 9.6;
      strip(parent, x1 - x0, m.width ?? 0.08, (x0 + x1) / 2, m.z, colored(m.color));
    }
    if (m.k === 'x') m.pts.forEach((p) => cross(parent, p.x, p.z, colored(m.color, p.x)));
    if (m.k === 'tick') m.pts.forEach((p) => strip(parent, 0.08, 0.9, p.x, p.z, colored(m.color, p.x)));
    if (m.k === 'dot')
      m.pts.forEach((p) => {
        const r = (m.size ?? 0.36) / 2;
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.012, 24), colored(m.color, p.x));
        disc.position.set(p.x, 0.042, p.z);
        disc.receiveShadow = true;
        parent.add(disc);
      });
  }
}

export function createFreeMarks(scene: THREE.Scene) {
  const root = new THREE.Group();
  scene.add(root);
  // 每種卡片的膠帶記號第一次用到時才建立
  const groups = new Map<number, THREE.Group>();
  const groupOf = (type: number) => {
    if (!groups.has(type)) {
      const g = new THREE.Group();
      buildMarks(g, freeCard(type).marks);
      root.add(g);
      groups.set(type, g);
    }
    return groups.get(type)!;
  };

  const koi = buildKoi();
  scene.add(koi.group);

  return {
    /** type 為自由走位卡片時顯示對應膠帶；koi 為鯉魚道具的出現程度 0–1。 */
    update(type: number | null, koiAmount: number, now: number) {
      const shown = type !== null && isFree(type) ? groupOf(type) : null;
      groups.forEach((g) => (g.visible = g === shown));
      koi.group.visible = koiAmount > 0;
      if (koiAmount > 0) {
        // 放下時輕輕彈一下
        const pop = 1 + Math.sin(Math.min(1, koiAmount) * Math.PI) * 0.06;
        koi.group.scale.set(pop, 1, pop);
        koi.materials.forEach((m) => (m.opacity = Math.min(1, koiAmount * 1.4)));
      }
    },
  };
}
