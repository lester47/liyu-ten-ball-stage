import * as THREE from 'three';
import { HAIR, SKIN, teamColor } from './palette';
import { pillLabel } from './labels';
import { mat } from './world';

/*
 * 市集風格的圓潤小朋友：大頭、圓身、隊服、手上拿平板。
 * 外層 group 面向舞台中央；內層 body 負責鞠躬；兩隻手臂可舉起或揮手。
 */

export type Kid = ReturnType<typeof createKid>;

export function createKid(scene: THREE.Scene, i: number, x: number, z: number) {
  const left = i < 5,
    n = i % 5;
  const outer = new THREE.Group();
  outer.position.set(x, 0.03, z);
  outer.rotation.y = left ? Math.PI / 2 : -Math.PI / 2; // 模型面向 +z，轉向舞台
  scene.add(outer);
  const body = new THREE.Group();
  outer.add(body);

  const shirt = mat(teamColor(i));
  const pants = mat('#2b3a55');
  const skin = mat(SKIN[n]);
  const part = (
    geo: THREE.BufferGeometry,
    m: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = body,
  ) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  for (const sx of [-0.1, 0.1]) {
    part(new THREE.CapsuleGeometry(0.075, 0.32, 4, 8), pants, sx, 0.25, 0);
    part(new THREE.BoxGeometry(0.13, 0.07, 0.2), mat('#ffffff'), sx, 0.035, 0.03);
  }
  part(new THREE.CapsuleGeometry(0.2, 0.3, 6, 12), shirt, 0, 0.72, 0);
  const head = part(new THREE.SphereGeometry(0.26, 20, 16), skin, 0, 1.24, 0);
  head.scale.set(1, 0.95, 1);
  const hair = part(
    new THREE.SphereGeometry(0.275, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2.2),
    mat(HAIR[n]),
    0,
    1.27,
    -0.02,
  );
  hair.rotation.x = -0.25;
  for (const ex of [-0.09, 0.09]) {
    part(new THREE.SphereGeometry(0.032, 8, 6), mat('#1f2a1c'), ex, 1.26, 0.235);
    part(new THREE.SphereGeometry(0.04, 8, 6), mat('#ff9aa8'), ex * 1.55, 1.18, 0.2).scale.set(1, 0.6, 0.4);
  }
  // 隊色棒球帽
  const cap = part(
    new THREE.SphereGeometry(0.28, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3.2),
    shirt,
    0,
    1.33,
    -0.01,
  );
  cap.rotation.x = -0.15;
  const brim = part(
    new THREE.CylinderGeometry(0.17, 0.17, 0.025, 16, 1, false, -Math.PI / 2, Math.PI),
    shirt,
    0,
    1.42,
    0.16,
  );
  brim.rotation.x = 0.1;

  const arm = (sx: number) => {
    const g = new THREE.Group();
    g.position.set(sx * 0.25, 0.92, 0);
    body.add(g);
    part(new THREE.CapsuleGeometry(0.06, 0.28, 4, 8), shirt, 0, -0.16, 0, g);
    part(new THREE.SphereGeometry(0.065, 8, 6), skin, 0, -0.36, 0, g);
    return g;
  };
  const armL = arm(1); // 角色左手（模型 +x）
  const armR = arm(-1); // 角色右手（模型 -x）
  // 平板拿在胸前
  const tablet = new THREE.Group();
  tablet.position.set(0, 0.66, 0.24);
  tablet.rotation.x = -0.5;
  body.add(tablet);
  part(new THREE.BoxGeometry(0.3, 0.21, 0.025), mat('#1d2633'), 0, 0, 0, tablet);
  const screen = part(
    new THREE.PlaneGeometry(0.26, 0.17),
    new THREE.MeshBasicMaterial({ color: teamColor(i) }),
    0,
    0,
    0.014,
    tablet,
  );
  screen.castShadow = false;
  armL.rotation.x = -0.9;
  armR.rotation.x = -0.9;

  const tag = pillLabel('', { badge: `${left ? 'L' : 'R'}${n + 1}`, color: teamColor(i), height: 0.34 });
  tag.position.set(x, 2.0, z);
  scene.add(tag);

  const homeX = x;
  return {
    outer,
    /**
     * pose：'idle' 拿平板、'go' 舉平板向前一步、'wave' 揮手、'bow' 鞠躬、'cheer' 雙手舉高。
     * t 為單元內秒數，讓揮手節奏由時間軸決定。
     */
    pose(kind: 'idle' | 'go' | 'wave' | 'bow' | 'cheer', t: number) {
      const step = kind === 'go' ? 0.14 : 0;
      outer.position.x = homeX + (left ? step : -step);
      body.rotation.x = kind === 'bow' ? 0.55 : 0;
      tablet.position.y = kind === 'go' ? 0.95 : 0.66;
      tablet.rotation.x = kind === 'go' ? -1.1 : -0.5;
      tablet.visible = kind !== 'wave' && kind !== 'cheer';
      if (kind === 'wave') {
        armR.rotation.set(0, 0, -2.5 + Math.sin(t * 9) * 0.35);
        armL.rotation.set(-0.2, 0, 0.15);
      } else if (kind === 'cheer') {
        armR.rotation.set(0, 0, -2.7 + Math.sin(t * 8) * 0.15);
        armL.rotation.set(0, 0, 2.7 - Math.sin(t * 8) * 0.15);
      } else if (kind === 'go') {
        armR.rotation.set(-2.0, 0, 0);
        armL.rotation.set(-2.0, 0, 0);
      } else {
        armR.rotation.set(-0.9, 0, 0);
        armL.rotation.set(-0.9, 0, 0);
      }
      tag.position.x = outer.position.x;
    },
  };
}
