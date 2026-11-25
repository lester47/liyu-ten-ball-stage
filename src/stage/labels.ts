import * as THREE from 'three';

const FONT = '"Noto Sans TC","Microsoft JhengHei","PingFang TC",sans-serif';

type PillOptions = {
  /** 左側彩色圓章內的字（例如球號）；省略則只有文字。 */
  badge?: string;
  /** 圓章與底線顏色。 */
  color?: string;
  /** 世界座標中的高度（公尺）。 */
  height?: number;
  /** 文字顏色。 */
  ink?: string;
};

/**
 * 鯉魚市集風格的白底膠囊標籤：圓角白底、彩色號碼圓章、下緣一條彩色陰影。
 * 回傳 Sprite，永遠面向相機，可直接 add 到場景。
 */
export function pillLabel(text: string, opt: PillOptions = {}) {
  const { badge, color = '#3f7d3a', height = 0.36, ink = '#1f2a1c' } = opt;
  const scale = 3; // 高解析畫布
  const h = 44 * scale;
  const pad = 14 * scale;
  const ctx0 = document.createElement('canvas').getContext('2d')!;
  ctx0.font = `900 ${20 * scale}px ${FONT}`;
  const textW = text ? ctx0.measureText(text).width : 0;
  const badgeW = badge ? 32 * scale : 0;
  const gap = badge && text ? 8 * scale : 0;
  const w = Math.ceil(
    (badge && !text ? 6 * scale : pad) + badgeW + gap + textW + (badge && !text ? 6 * scale : pad),
  );
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h + 6 * scale;
  const ctx = canvas.getContext('2d')!;
  const r = h / 2;
  const pill = (y: number) => {
    ctx.beginPath();
    ctx.roundRect(0, y, w, h, r);
  };
  // 彩色底緣（市集標籤的「3px 彩色陰影」）
  ctx.fillStyle = color;
  pill(4 * scale);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  pill(0);
  ctx.fill();
  let x = badge && !text ? 6 * scale : pad;
  if (badge) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + badgeW / 2, h / 2, badgeW / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${(badge.length > 2 ? 13 : 16) * scale}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badge, x + badgeW / 2, h / 2 + scale);
    x += badgeW + gap;
  }
  if (text) {
    ctx.fillStyle = ink;
    ctx.font = `900 ${20 * scale}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, h / 2 + scale);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true, fog: false }),
  );
  const worldH = height * (canvas.height / h);
  sprite.scale.set((worldH * canvas.width) / canvas.height, worldH, 1);
  sprite.renderOrder = 5;
  return sprite;
}

/** 平放在地面上的文字貼片（例如舞台前緣的「觀眾席」）。 */
export function groundText(text: string, color: string, width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = Math.round((1024 * height) / width);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.font = `900 ${canvas.height * 0.62}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

/** 柔邊圓形光斑貼圖（地面彩色光圈、接觸陰影共用）。 */
export function radialTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(0.35, inner.replace(/[\d.]+\)$/, '0.75)'));
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}
