import * as THREE from 'three';
import { HAIR, SKIN, rainbow } from './palette';
import { mat } from './world';

/*
 * 舞台後方與兩側的ㄇ字型：一群伴舞的學生，跟著節目一起跳。
 * 動作完全由節目時間決定，拖曳時間軸時看到的姿勢都一樣。
 * 每 4 秒換一種舞步：舉手波浪、左右拍手、轉圈揮彩球、蹲下跳起。
 */

type Dancer = {
  outer: THREE.Group;
  body: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  k: number;
  baseYaw: number;
};

function makeDancer(scene: THREE.Scene, k: number, x: number, z: number): Dancer {
  const outer = new THREE.Group();
  outer.position.set(x, 0, z);
  // 面向舞台中央
  const baseYaw = Math.atan2(5 - x, 4 - z);
  outer.rotation.y = baseYaw;
  scene.add(outer);
  const body = new THREE.Group();
  outer.add(body);
  const shirt = mat(rainbow[k % 10]);
  const skin = mat(SKIN[k % SKIN.length]);
  const part = (
    geo: THREE.BufferGeometry,
    m: THREE.Material,
    px: number,
    py: number,
    pz: number,
    parent: THREE.Object3D = body,
  ) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(px, py, pz);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const pants = mat(k % 2 ? '#2b3a55' : '#ffffff');
  for (const sx of [-0.1, 0.1]) {
    part(new THREE.CapsuleGeometry(0.075, 0.32, 4, 8), pants, sx, 0.25, 0);
    part(new THREE.BoxGeometry(0.13, 0.07, 0.2), mat('#ffffff'), sx, 0.035, 0.03);
  }
  part(new THREE.CapsuleGeometry(0.2, 0.3, 6, 12), shirt, 0, 0.72, 0);
  const head = part(new THREE.SphereGeometry(0.25, 16, 12), skin, 0, 1.22, 0);
  head.scale.set(1, 0.95, 1);
  const hair = part(
    new THREE.SphereGeometry(0.265, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.2),
    mat(HAIR[k % HAIR.length]),
    0,
    1.25,
    -0.02,
  );
  hair.rotation.x = -0.25;
  // 女生綁兩個小包包頭
  if (k % 3 === 0)
    for (const sx of [-0.18, 0.18])
      part(new THREE.SphereGeometry(0.09, 10, 8), mat(HAIR[k % HAIR.length]), sx, 1.42, -0.04);
  for (const ex of [-0.085, 0.085]) {
    part(new THREE.SphereGeometry(0.03, 8, 6), mat('#1f2a1c'), ex, 1.24, 0.225);
    part(new THREE.SphereGeometry(0.038, 8, 6), mat('#ff9aa8'), ex * 1.55, 1.16, 0.19).scale.set(1, 0.6, 0.4);
  }
  const pom = mat(rainbow[(k + 5) % 10], { roughness: 0.6 });
  const arm = (sx: number) => {
    const g = new THREE.Group();
    g.position.set(sx * 0.25, 0.92, 0);
    body.add(g);
    part(new THREE.CapsuleGeometry(0.06, 0.28, 4, 8), shirt, 0, -0.16, 0, g);
    part(new THREE.IcosahedronGeometry(0.11, 0), pom, 0, -0.38, 0, g); // 彩球
    return g;
  };
  return { outer, body, armL: arm(1), armR: arm(-1), k, baseYaw };
}

export function createDancers(scene: THREE.Scene) {
  const dancers: Dancer[] = [];
  let k = 0;
  // ㄇ字型：後排一列，左右兩側各一列（在操控孩子的外側）
  for (let i = 0; i < 12; i++) dancers.push(makeDancer(scene, k++, -1.05 + i * 1.1, -1.5));
  for (const x of [-2.2, 12.2])
    for (let i = 0; i < 8; i++) dancers.push(makeDancer(scene, k++, x, -0.4 + i * 1.15));

  return {
    /** t：節目時間（秒）。 */
    update(t: number) {
      const beat = t * 2; // 每秒兩拍
      const move = Math.floor(t / 4) % 4;
      for (const d of dancers) {
        const wave = d.k * 0.35; // 沿著隊伍傳下去的波浪
        const s = Math.sin(beat * Math.PI - wave);
        const bounce = Math.abs(Math.sin(beat * Math.PI));
        d.body.position.y = 0;
        d.body.rotation.set(0, 0, 0);
        d.outer.rotation.y = d.baseYaw;
        if (move === 0) {
          // 舉手波浪：兩手輪流往上
          d.armL.rotation.set(0, 0, 2.2 + s * 0.7);
          d.armR.rotation.set(0, 0, -2.2 + s * 0.7);
          d.body.position.y = bounce * 0.06;
        } else if (move === 1) {
          // 左右踏步、胸前拍手
          const clap = Math.abs(Math.sin(beat * Math.PI));
          d.armL.rotation.set(-1.3, 0, 0.2 + clap * 0.5);
          d.armR.rotation.set(-1.3, 0, -0.2 - clap * 0.5);
          d.body.rotation.z = Math.sin(beat * Math.PI * 0.5) * 0.18;
        } else if (move === 2) {
          // 原地轉圈，彩球高舉
          d.outer.rotation.y = d.baseYaw + ((t % 4) / 4) * Math.PI * 2;
          d.armL.rotation.set(0, 0, 2.6);
          d.armR.rotation.set(0, 0, -2.6);
          d.body.position.y = bounce * 0.05;
        } else {
          // 蹲下再跳起，雙手打開
          const jump = Math.max(0, Math.sin(beat * Math.PI * 0.5 - wave));
          d.body.position.y = jump * 0.22;
          d.armL.rotation.set(0, 0, 0.6 + jump * 1.8);
          d.armR.rotation.set(0, 0, -0.6 - jump * 1.8);
        }
      }
    },
  };
}
