import * as THREE from 'three';
import type { DanceMove } from '../freeShow';
import { HAIR, SKIN, rainbow } from './palette';
import { mat } from './world';

/*
 * 舞台後方與兩側的ㄇ字型：66 位伴舞學生（加上 10 位操控球的孩子共 76 人）。
 * 後方兩排各 13 人、左右兩側各兩排 10 人，都面向舞台中央。
 * 舞步跟著節目的段落變化（見 shows/dance.ts），姿勢完全由節目時間決定，
 * 拖曳時間軸時看到的動作都一樣。
 */

type Dancer = {
  outer: THREE.Group;
  body: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  k: number;
  /** 沿著ㄇ字型的順序（0–1），波浪從左前方傳到右前方 */
  along: number;
};

// 66 人共用幾何體，只有身體和頭投影，維持流暢
const G = {
  leg: new THREE.CapsuleGeometry(0.075, 0.32, 3, 6),
  shoe: new THREE.BoxGeometry(0.13, 0.07, 0.2),
  torso: new THREE.CapsuleGeometry(0.2, 0.3, 4, 10),
  head: new THREE.SphereGeometry(0.25, 14, 10),
  hair: new THREE.SphereGeometry(0.265, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.2),
  bun: new THREE.SphereGeometry(0.09, 8, 6),
  eye: new THREE.SphereGeometry(0.03, 6, 4),
  arm: new THREE.CapsuleGeometry(0.06, 0.28, 3, 6),
  pom: new THREE.IcosahedronGeometry(0.11, 0),
};

function makeDancer(scene: THREE.Scene, k: number, x: number, z: number, along: number): Dancer {
  const outer = new THREE.Group();
  outer.position.set(x, 0, z);
  outer.rotation.y = Math.atan2(5 - x, 4 - z); // 面向舞台中央
  scene.add(outer);
  const body = new THREE.Group();
  outer.add(body);
  const shirt = mat(rainbow[k % 10]);
  const hairMat = mat(HAIR[k % HAIR.length]);
  const part = (
    geo: THREE.BufferGeometry,
    m: THREE.Material,
    px: number,
    py: number,
    pz: number,
    parent: THREE.Object3D = body,
    shadow = false,
  ) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(px, py, pz);
    mesh.castShadow = shadow;
    parent.add(mesh);
    return mesh;
  };
  const pants = mat(k % 2 ? '#2b3a55' : '#ffffff');
  for (const sx of [-0.1, 0.1]) {
    part(G.leg, pants, sx, 0.25, 0);
    part(G.shoe, mat('#ffffff'), sx, 0.035, 0.03);
  }
  part(G.torso, shirt, 0, 0.72, 0, body, true);
  part(G.head, mat(SKIN[k % SKIN.length]), 0, 1.22, 0, body, true).scale.set(1, 0.95, 1);
  part(G.hair, hairMat, 0, 1.25, -0.02).rotation.x = -0.25;
  if (k % 3 === 0) for (const sx of [-0.18, 0.18]) part(G.bun, hairMat, sx, 1.42, -0.04);
  for (const ex of [-0.085, 0.085]) part(G.eye, mat('#1f2a1c'), ex, 1.24, 0.225);
  const pom = mat(rainbow[(k + 5) % 10], { roughness: 0.6 });
  const arm = (sx: number) => {
    const g = new THREE.Group();
    g.position.set(sx * 0.25, 0.92, 0);
    body.add(g);
    part(G.arm, shirt, 0, -0.16, 0, g);
    part(G.pom, pom, 0, -0.38, 0, g); // 彩球
    return g;
  };
  return { outer, body, armL: arm(1), armR: arm(-1), k, along };
}

const ease = (t: number) => (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, t)))) / 2;

export function createDancers(scene: THREE.Scene) {
  const dancers: Dancer[] = [];
  let k = 0;
  const add = (x: number, z: number, along: number) => dancers.push(makeDancer(scene, k++, x, z, along));
  // 左側兩排（由前往後）、後方兩排（由左往右）、右側兩排（由後往前）
  for (let i = 0; i < 10; i++) {
    add(-2.2, 8.05 - i * 0.95, i / 50);
    add(-3.1, 7.6 - i * 0.95, (i + 0.5) / 50);
  }
  for (let i = 0; i < 13; i++) {
    add(-1.6 + i * 1.1, -1.5, (10 + i * (30 / 13)) / 50);
    add(-1.05 + i * 1.1, -2.4, (10.5 + i * (30 / 13)) / 50);
  }
  for (let i = 0; i < 10; i++) {
    add(12.2, -0.5 + i * 0.95, (40 + i) / 50);
    add(13.1, -0.05 + i * 0.95, (40.5 + i) / 50);
  }

  return {
    count: dancers.length,
    /**
     * move：這段的舞步；time：節目總時間；local：段內秒數。
     */
    update(move: DanceMove, time: number, local: number) {
      const beat = time * 2; // 每秒兩拍
      for (const d of dancers) {
        const ph = beat * Math.PI - d.along * Math.PI * 6; // 沿隊伍傳遞的波浪
        const s = Math.sin(beat * Math.PI);
        const bounce = Math.abs(s);
        let lz = 0.25,
          rz = -0.25,
          lx = 0,
          rx = 0,
          y = 0,
          tilt = 0,
          bow = 0;
        switch (move) {
          case 'idle':
            tilt = Math.sin(time * 1.5 + d.k) * 0.05;
            break;
          case 'clap': {
            lx = rx = -1.3;
            lz = 0.15 + bounce * 0.5;
            rz = -lz;
            y = bounce * 0.04;
            tilt = Math.sin(beat * Math.PI * 0.5) * 0.12;
            break;
          }
          case 'swim':
            lx = rx = -1.2;
            lz = 0.6 + 0.45 * s;
            rz = -(0.6 - 0.45 * s);
            tilt = Math.sin(beat * Math.PI * 0.5 + d.along * 8) * 0.15;
            break;
          case 'hello':
            rz = -2.6 + 0.35 * Math.sin(beat * Math.PI * 2);
            lz = 0.5;
            y = bounce * 0.03;
            break;
          case 'wave':
            lz = 2.0 + 0.8 * Math.sin(ph);
            rz = -2.0 + 0.8 * Math.sin(ph);
            y = Math.max(0, Math.sin(ph)) * 0.08;
            break;
          case 'bubble':
            lz = 1.4 + 1.3 * Math.max(0, s);
            rz = -(1.4 + 1.3 * Math.max(0, -s));
            y = bounce * 0.05;
            break;
          case 'point':
            lx = rx = -1.5;
            lz = 0.08;
            rz = -0.08;
            bow = 0.12;
            y = bounce * 0.03;
            break;
          case 'open':
            lz = 1.6;
            rz = -1.6;
            y = bounce * 0.06;
            tilt = Math.sin(beat * Math.PI * 0.5) * 0.1;
            break;
          case 'cheer': {
            const j = Math.max(0, Math.sin(beat * Math.PI + d.k * 0.9));
            y = j * 0.25;
            lz = 2.7 + 0.25 * Math.sin(beat * Math.PI * 2 + d.k);
            rz = -2.7 + 0.25 * Math.sin(beat * Math.PI * 2 + d.k + 1);
            break;
          }
          case 'breathe': {
            const f = (1 - Math.cos((time * Math.PI) / 1.2)) / 2;
            lz = 0.3 + 2.3 * f;
            rz = -lz;
            y = f * 0.05;
            break;
          }
          case 'train':
            lx = -1.0 + 0.7 * Math.sin(beat * Math.PI);
            rx = -1.0 - 0.7 * Math.sin(beat * Math.PI);
            lz = 0.2;
            rz = -0.2;
            y = bounce * 0.04;
            tilt = Math.sin(beat * Math.PI * 0.5) * 0.08;
            break;
          case 'count':
            rz = -2.7 + 0.45 * (1 - Math.abs(Math.sin(time * Math.PI)));
            lz = 0.7;
            y = (1 - Math.abs(Math.sin(time * Math.PI))) * 0.06;
            break;
          case 'bloom': {
            const g = ease(local / 5.5 - d.along * 0.3);
            y = -0.28 * (1 - g);
            lz = 0.3 + 2.3 * g;
            rz = -lz;
            break;
          }
          case 'bow': {
            const b = ease((local - 1.8) / 0.8) - ease((local - 4) / 0.8);
            bow = 0.75 * b;
            lz = b > 0.1 ? 0.2 : 2.5;
            rz = b > 0.1 ? -0.2 : -2.5 + 0.35 * Math.sin(beat * Math.PI * 2);
            break;
          }
        }
        d.body.position.y = y;
        d.body.rotation.set(bow, 0, tilt);
        d.armL.rotation.set(lx, 0, lz);
        d.armR.rotation.set(rx, 0, rz);
      }
    },
  };
}
