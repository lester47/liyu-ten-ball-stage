import * as THREE from 'three';
import { freeCard, isFree, type Mark } from '../freeShow';
import { C as FREE_CENTER } from '../shows/kit';
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

/** 低多邊形鯉魚道具：老師放在舞台中間，魚頭朝右。 */
function buildKoi() {
  const g = new THREE.Group();
  const orange = new THREE.MeshStandardMaterial({
    color: '#ff7a3d',
    flatShading: true,
    roughness: 0.55,
    transparent: true,
  });
  const white = new THREE.MeshStandardMaterial({
    color: '#fffaf0',
    flatShading: true,
    roughness: 0.6,
    transparent: true,
  });
  const ink = new THREE.MeshStandardMaterial({ color: '#1f2a1c', roughness: 0.4, transparent: true });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), orange);
  body.scale.set(0.8, 0.28, 0.38);
  body.position.y = 0.28;
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.55, 4), orange);
  tail.rotation.z = -Math.PI / 2;
  tail.scale.set(1, 1, 0.3);
  tail.position.set(-0.95, 0.3, 0);
  const spot1 = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), white);
  spot1.scale.set(1.3, 0.5, 1);
  spot1.position.set(-0.15, 0.5, 0.05);
  const spot2 = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), white);
  spot2.scale.set(1.2, 0.5, 1);
  spot2.position.set(0.35, 0.46, -0.08);
  const eyes = [-1, 1].map((s) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), ink);
    e.position.set(0.62, 0.36, s * 0.22);
    return e;
  });
  g.add(body, tail, spot1, spot2, ...eyes);
  g.traverse((o) => (o.castShadow = true));
  g.position.set(FREE_CENTER.x, 0, FREE_CENTER.z);
  return { group: g, materials: [orange, white, ink] };
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
        const pop = 1 + Math.sin(Math.min(1, koiAmount) * Math.PI) * 0.15;
        koi.group.scale.setScalar(Math.max(0.01, koiAmount) * pop);
        koi.group.rotation.y = Math.sin(now * 1.4) * 0.05;
        koi.materials.forEach((m) => (m.opacity = Math.min(1, koiAmount * 1.4)));
      }
    },
  };
}
