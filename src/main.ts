import * as THREE from 'three';
import { sample } from './timeline';
import { show, total } from './state';
import { $, bindControls, mountMarkup, renderList, updateHud } from './ui';
import { buildWorld, createRenderer, laneZ, setView } from './stage/world';
import { createSphero } from './stage/sphero';
import { createKid } from './stage/kid';
import { radialTexture } from './stage/labels';
import { createFreeMarks } from './stage/freeMarks';
import { createDancers } from './stage/dancers';
import { isBow, isFree, koiProp } from './freeShow';
import './style.css';

mountMarkup();
bindControls();
renderList();

const viewport = $('#viewport');
const { scene, camera, renderer, composer, controls } = createRenderer(viewport);
const world = buildWorld(scene);
const marks = createFreeMarks(scene);
const dancers = createDancers(scene);
setView(camera, controls, 0);
document
  .querySelectorAll<HTMLElement>('[data-view]')
  .forEach((b) => (b.onclick = () => setView(camera, controls, Number(b.dataset.view))));

// 光暈：自動／開啟／關閉
let glowMode = 0;
const glowButton = $('#glow');
glowButton.onclick = () => {
  glowMode = (glowMode + 1) % 3;
  glowButton.lastChild!.textContent = ['光暈：自動', '光暈：開啟', '光暈：關閉'][glowMode];
};

const spheros = Array.from({ length: 10 }, (_, i) => createSphero(scene, i));
const kids = Array.from({ length: 10 }, (_, i) => createKid(scene, i, i < 5 ? -0.65 : 10.65, laneZ(i % 5)));
spheros.forEach((s, i) => (s.root.position.z = laneZ(i % 5)));

// 衝線尾光：以歷史秒點重建，不累積殘影
const trailTex = radialTexture();
const trails = spheros.map(() =>
  Array.from({ length: 6 }, (_, k) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(0.34 * (1 - k * 0.12), 0.34 * (1 - k * 0.12)),
      new THREE.MeshBasicMaterial({
        map: trailTex,
        transparent: true,
        opacity: 0.75 - k * 0.11,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.2;
    m.visible = false;
    scene.add(m);
    return m;
  }),
);

// 點選球
const ray = new THREE.Raycaster(),
  pointer = new THREE.Vector2();
let down = [0, 0];
renderer.domElement.addEventListener('pointerdown', (e) => (down = [e.clientX, e.clientY]));
renderer.domElement.addEventListener('pointerup', (e) => {
  if (Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
  const r = renderer.domElement.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, (-(e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(pointer, camera);
  const hit = ray.intersectObjects(spheros.map((s) => s.shell))[0];
  show.selected = hit ? Number(hit.object.userData.index) : -1;
});

new ResizeObserver(() => {
  const w = viewport.clientWidth,
    h = viewport.clientHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  camera.aspect = w / Math.max(h, 1);
  camera.updateProjectionMatrix();
}).observe(viewport);

const GOLD = '#ffd23c';
let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const secs = now / 1000;
  if (show.playing) {
    const end = show.previewEnd ?? total();
    show.time = Math.min(show.time + dt * show.speed, end);
    if (show.time >= end) show.playing = false;
  }
  const { segments, time, previewEnd } = show;
  const state = sample(
    segments,
    previewEnd !== null && time === previewEnd ? Math.max(0, time - 0.000001) : time,
  );
  const previous = sample(segments, Math.max(0, time - 0.04));
  updateHud(state);

  const seg = state.segment;
  const dash = seg?.type === 6 && !seg.transition;
  const trailStates = dash
    ? Array.from({ length: 6 }, (_, k) => sample(segments, Math.max(seg!.start, time - (k + 1) * 0.06)))
    : [];
  const bowing = (seg?.type === 7 || (!!seg && isBow(seg.type))) && !seg.transition;
  // 自由走位：收起球道，換成這段要用的地上膠帶
  const freeNow = !!seg && (seg.free || isFree(seg.type));
  world.lanes.visible = !freeNow;
  marks.update(
    seg && isFree(seg.type) ? seg.type : null,
    seg ? koiProp(seg.type, seg.transition ? 0 : state.local) : 0,
    secs,
  );

  spheros.forEach((s, i) => {
    const p = state.points[i];
    s.root.position.set(p.x, s.root.position.y, p.z);
    s.update(state.colors[i], state.brightness[i], show.selected === i, secs);

    const arrived = state.finishLit[i] > 0;
    const end = world.finish[i].material as THREE.MeshStandardMaterial;
    end.color.set(arrived ? GOLD : i < 5 ? '#2f8fe0' : '#f08a2c');
    end.emissive.set(arrived ? '#ffc21a' : '#000000');
    end.emissiveIntensity = arrived ? 2.6 : 0;

    const odd = (i % 5) % 2 === 0;
    trails[i].forEach((m, k) => {
      m.visible = dash && state.local < (odd ? 1.5 : 2.5) && state.local > (odd ? 0 : 1);
      if (!m.visible) return;
      const tp = trailStates[k].points[i];
      m.position.set(tp.x, 0.2, tp.z);
      (m.material as THREE.MeshBasicMaterial).color.set(state.colors[i]);
    });

    const movingNow =
      !seg?.transition && Math.hypot(p.x - previous.points[i].x, p.z - previous.points[i].z) > 0.001;
    const t = state.local;
    kids[i].pose(bowing ? (t < 2 ? 'wave' : t < 5 ? 'bow' : 'idle') : movingNow ? 'go' : 'idle', t);
  });

  const allArrived = state.finishLit.every((v) => v > 0);
  world.finishRails.forEach((line) => {
    const m = line.material as THREE.MeshStandardMaterial;
    m.color.set(allArrived ? GOLD : '#c9d3da');
    m.emissive.set(allArrived ? '#ffc21a' : '#000000');
    m.emissiveIntensity = allArrived ? 2.4 : 0;
  });

  // 觀眾：十球到站與謝幕時歡呼（由時間軸決定，回拉結果一致）
  const cheer =
    (!freeNow && allArrived) || (dash && state.local > 2.5) || (bowing && !!seg && isBow(seg.type));
  world.audience.forEach((p) => {
    const lift = cheer ? 2.6 + Math.sin(time * 7 + p.phase) * 0.25 : 0.25;
    p.arms[0].rotation.z = -lift;
    p.arms[1].rotation.z = lift;
    p.body.position.y = 0.21 + (cheer ? Math.max(0, Math.sin(time * 7 + p.phase)) * 0.06 : 0);
  });
  // 海浪（與表演無關）；伴舞學生跟著節目時間跳
  world.seaTime.value = secs;
  dancers.update(time);

  controls.update();
  const useBloom =
    glowMode === 1 || (glowMode === 0 && innerWidth > 1000 && (navigator.hardwareConcurrency || 4) > 4);
  if (useBloom) composer.render();
  else renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
