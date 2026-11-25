import * as THREE from 'three';
import { rainbow, teamColor } from './palette';
import { radialTexture } from './labels';
import { pillLabel } from './labels';

/*
 * 放大的 Sphero BOLT 示意模型（半徑 0.15 m）：
 * 帶該球顏色的半透明外殼、內部強自發光 LED 核心、電路板、兩個輪子、8×8 像素球號；
 * 地面有一圈彩色光暈（不靠即時光源，平板也看得到）與接觸陰影。
 */

const R = 0.15;
const glowTex = radialTexture();
const shadowTex = radialTexture('rgba(20,40,30,0.55)', 'rgba(20,40,30,0)');
const tmp = new THREE.Color();
const WHITE = new THREE.Color('#ffffff');

export type Sphero = ReturnType<typeof createSphero>;

export function createSphero(scene: THREE.Scene, i: number) {
  const n = i % 5;
  const color = new THREE.Color(rainbow[i]);
  const root = new THREE.Group();
  scene.add(root);

  const ball = new THREE.Group();
  ball.position.y = R + 0.045;
  root.add(ball);

  const shellMat = new THREE.MeshPhysicalMaterial({
    color: color.clone().lerp(new THREE.Color('#ffffff'), 0.12),
    transmission: 0.35,
    roughness: 0.22,
    thickness: 0.08,
    ior: 1.45,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    emissive: color.clone(),
    emissiveIntensity: 0.35,
  });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 24), shellMat);
  shell.castShadow = true;
  shell.userData.index = i;
  ball.add(shell);

  const ledMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 6,
    roughness: 0.3,
  });
  const led = new THREE.Mesh(new THREE.SphereGeometry(R * 0.55, 16, 12), ledMat);
  ball.add(led);

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(0.19, 0.022, 0.13),
    new THREE.MeshStandardMaterial({ color: '#1f6b4f', roughness: 0.6 }),
  );
  board.position.y = -0.06;
  ball.add(board);
  for (const wx of [-0.088, 0.088]) {
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.046, 0.046, 0.03, 12),
      new THREE.MeshStandardMaterial({ color: '#263a44', roughness: 0.7 }),
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, -0.06, 0);
    ball.add(wheel);
  }
  // 8×8 LED 矩陣：顯示球號
  const pc = document.createElement('canvas');
  pc.width = pc.height = 8;
  const px = pc.getContext('2d')!;
  px.fillStyle = '#0d2633';
  px.fillRect(0, 0, 8, 8);
  px.font = 'bold 8px monospace';
  px.fillStyle = '#ffffff';
  px.fillText(String(n + 1), 2, 7);
  const ptex = new THREE.CanvasTexture(pc);
  ptex.magFilter = THREE.NearestFilter;
  const matrix = new THREE.Mesh(
    new THREE.PlaneGeometry(0.1, 0.1),
    new THREE.MeshBasicMaterial({ map: ptex, toneMapped: false }),
  );
  matrix.rotation.x = -Math.PI / 2;
  matrix.position.y = 0.1;
  ball.add(matrix);

  // 地面彩色光暈與接觸陰影
  const glowMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    color,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.05;
  glow.renderOrder = 2;
  root.add(glow);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.42),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.048;
  root.add(shadow);

  // 選取時的脈動外圈（隊色）
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.34, 40),
    new THREE.MeshBasicMaterial({
      color: teamColor(i),
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.052;
  ring.visible = false;
  root.add(ring);

  const tag = pillLabel('', { badge: `${i < 5 ? 'L' : 'R'}${n + 1}`, color: teamColor(i), height: 0.26 });
  tag.position.y = 0.62;
  root.add(tag);

  return {
    root,
    shell,
    update(hex: string, brightness: number, selected: boolean, now: number) {
      tmp.set(hex);
      ledMat.color.copy(tmp);
      ledMat.emissive.copy(tmp);
      ledMat.emissiveIntensity = 1 + brightness * 6;
      shellMat.emissive.copy(tmp);
      shellMat.emissiveIntensity = 0.12 + brightness * 0.35;
      shellMat.color.copy(tmp).lerp(WHITE, 0.12);
      glowMat.color.copy(tmp);
      glowMat.opacity = Math.min(0.8, 0.1 + brightness * 0.5);
      const s = selected ? 1.4 : 1;
      ball.scale.setScalar(s);
      ball.position.y = R * s + 0.045;
      glow.scale.setScalar(selected ? 1.4 : 0.8 + brightness * 0.35);
      ring.visible = selected;
      if (selected) ring.scale.setScalar(1 + Math.sin(now * 6) * 0.08);
      tag.position.y = selected ? 0.8 : 0.62;
    },
  };
}
