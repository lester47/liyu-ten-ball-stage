import * as THREE from 'three';
import { FISH_MARKS, FREE_CENTER, FREE_FIRST, LINE_Z, RING_R, zipLane } from '../freeShow';
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

function dashedCircle(parent: THREE.Object3D, r: number, m: THREE.Material, n = 36) {
  for (let k = 0; k < n; k++) {
    const a = ((k + 0.5) / n) * Math.PI * 2;
    const len = ((Math.PI * 2 * r) / n) * 0.6;
    strip(
      parent,
      len,
      0.07,
      FREE_CENTER.x + Math.cos(a) * r,
      FREE_CENTER.z + Math.sin(a) * r,
      m,
      -a - Math.PI / 2,
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

export function createFreeMarks(scene: THREE.Scene) {
  const root = new THREE.Group();
  scene.add(root);
  const tape = tapeMat(TAPE);
  const groups = Array.from({ length: 9 }, () => {
    const g = new THREE.Group();
    root.add(g);
    return g;
  });

  // 前進／後退：自己面前的起點，和「大概開到這裡」的中線記號
  const go = new THREE.Group();
  for (let i = 0; i < 10; i++) {
    const left = i < 5;
    const z = 7 - (i % 5) * 1.5;
    const team = tapeMat(left ? TEAM.left : TEAM.right, 0.85);
    strip(go, 0.36, 0.36, left ? 1 : 9, z, team);
    strip(go, 0.08, 0.9, left ? 3 : 7, z, tape);
  }
  groups[0].add(go);
  groups[1].add(go.clone());

  // 拉鍊：藍隊、橘隊各自的半條路
  for (let i = 0; i < 10; i++)
    strip(groups[2], 7.4, 0.05, 5, zipLane(i), tapeMat(i < 5 ? TEAM.left : TEAM.right, 0.55));

  // 圍圈圈、繞圈圈：圓形膠帶
  dashedCircle(groups[3], RING_R, tape);
  dashedCircle(groups[4], RING_R, tape);
  // 中間集合：小圈
  dashedCircle(groups[5], 1.6, tape, 22);
  // 魚造型：✕ 點
  FISH_MARKS.forEach((p) => cross(groups[6], p.x, p.z, tapeMat('#ff7a3d')));
  // 前面一直線
  strip(groups[7], 9.2, 0.08, 5, LINE_Z, tape);
  strip(groups[8], 9.2, 0.08, 5, LINE_Z, tape);

  const koi = buildKoi();
  scene.add(koi.group);

  return {
    /** type 為自由走位卡片時顯示對應膠帶；koi 為鯉魚道具的出現程度 0–1。 */
    update(type: number | null, koiAmount: number, now: number) {
      groups.forEach((g, k) => (g.visible = type === FREE_FIRST + k));
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
