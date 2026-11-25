/*
 * 鯉魚十球秀（新）：十顆球像舞者一樣在整個舞台走位的「標準動作」範例。
 * 前進 → 後退 → 拉鍊穿插 → 圍圈圈 → 繞圈圈 → 到中間集合 → 排魚造型 → 到前面排一直線 → 謝幕
 *
 * 座標：x 0–10 公尺（左→右），z 0–8 公尺（後→前，觀眾在 z = 8 那一側）。
 * 球 0–4 = L1–L5（左側孩子），5–9 = R1–R5；第 n 號在 z = 7 - 1.5n 那一排。
 * 這裡是「標準」路線：整齊、間距約 1 公尺、中低速，讓孩子看得懂要做什麼。
 * 實際表演做不到也沒關係，所以每段都附上「做不到也沒關係」的提示。
 */

export type Pt = { x: number; z: number };

export const FREE_FIRST = 13;
export const FREE_TYPES = [13, 14, 15, 16, 17, 18, 19, 20, 21];
export const isFree = (type: number) => type >= FREE_FIRST;

export const freeNames = [
  '前進',
  '後退',
  '拉鍊穿插',
  '圍圈圈',
  '繞圈圈',
  '到中間集合',
  '排魚造型',
  '到前面排一直線',
  '謝幕',
];
export const freeDurations = [7, 6, 9, 6, 8, 5, 8, 6, 5];
export const freeSummaries = [
  '燈亮後一起往前開到舞台中間附近',
  '一起退回自己面前',
  '藍隊走後半條、橘隊走前半條，交錯穿到對面',
  '開到地上的圓圈膠帶上',
  '大家朝同一方向慢慢繞',
  '往舞台中間靠攏，圍成小圈',
  '老師放上鯉魚道具，大家開到魚形的點上',
  '開到舞台前面的膠帶線上',
  '閃燈說謝謝，孩子揮手鞠躬',
];
/** 每段給孩子的提示：這段要做什麼、做不到也沒關係。 */
export const freeTips = [
  { kid: '燈亮了，把球往前開到中間附近停下', ok: '停在哪都好，前前後後像一群小魚游出來' },
  { kid: '把球往回開，回到自己面前', ok: '退得多、退得少都可以，只要往回走' },
  { kid: '藍隊走球道後半條、橘隊走前半條，直直開到對面', ok: '每人有自己那半條路，歪一點也不會撞到' },
  { kid: '開到地上的圓圈膠帶附近', ok: '圓圈歪一點像一朵花，不用很圓' },
  { kid: '大家朝同一個方向慢慢繞', ok: '快一點慢一點都沒關係，像旋轉木馬' },
  { kid: '往舞台中間開，靠近就停', ok: '擠成一團最可愛，像小魚聚在一起' },
  { kid: '開到魚形膠帶的 ✕ 點上', ok: '點和點之間很寬，大概在附近就看得出是一條魚' },
  { kid: '把球開到舞台前面的膠帶線上', ok: '排得不直也沒關係，像一排小朋友在等拍照' },
  { kid: '閃燈說謝謝，孩子揮手鞠躬', ok: '球不用動，今天的主角是你們' },
];

export const FREE_CENTER: Pt = { x: 5, z: 4 };
const C = FREE_CENTER;
const laneZ = (n: number) => 7 - n * 1.5;
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
/** 正弦緩動：起步、停下都柔和，最高速只有平均速度的 1.57 倍。 */
export const ease = (t: number) => (1 - Math.cos(Math.PI * clamp01(t))) / 2;
export const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({
  x: a.x + (b.x - a.x) * t,
  z: a.z + (b.z - a.z) * t,
});
const ids = Array.from({ length: 10 }, (_, i) => i);
const atD = (i: number, d: number): Pt => ({ x: i < 5 ? d : 10 - d, z: laneZ(i % 5) });

/** 球道隊形（距同側站位線 d 公尺）轉成舞台座標。 */
export const lanePts = (d: number[]): Pt[] => d.map((v, i) => atD(i, v));

// ---------- 標準隊形 ----------
const HOME = ids.map((i) => atD(i, 1));
const FORWARD = ids.map((i) => atD(i, 3));
const BACK = ids.map((i) => atD(i, 1.4));
/** 拉鍊：藍隊在球道偏後、橘隊偏前，十條半路間距一樣（0.75 m），各自直直開到對面。 */
const ZIP_OFFSET = 0.375;
export const zipLane = (i: number) => laneZ(i % 5) + (i < 5 ? -ZIP_OFFSET : ZIP_OFFSET);
const ZIP_START = ids.map((i) => ({ x: BACK[i].x, z: zipLane(i) }));
const ZIP_END = ids.map((i) => ({ x: i < 5 ? 7 : 3, z: zipLane(i) }));

function matchByAngle(from: Pt[], targets: Pt[]): Pt[] {
  const ang = (p: Pt) => Math.atan2(p.z - C.z, p.x - C.x);
  const fi = ids.slice().sort((a, b) => ang(from[a]) - ang(from[b]));
  const ti = ids.slice().sort((a, b) => ang(targets[a]) - ang(targets[b]));
  let best: number[] = [],
    bestCost = Infinity;
  for (let s = 0; s < 10; s++) {
    let cost = 0;
    const m: number[] = [];
    for (let k = 0; k < 10; k++) {
      const a = from[fi[k]],
        b = targets[ti[(k + s) % 10]];
      cost += (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
      m[fi[k]] = ti[(k + s) % 10];
    }
    if (cost < bestCost) {
      bestCost = cost;
      best = m;
    }
  }
  return ids.map((i) => targets[best[i]]);
}

export const RING_R = 2.7;
const RING = ids.map((k) => ({
  x: C.x + Math.cos((k * Math.PI) / 5 + Math.PI / 10) * RING_R,
  z: C.z + Math.sin((k * Math.PI) / 5 + Math.PI / 10) * RING_R,
}));
const RING_A = matchByAngle(ZIP_END, RING);
const TURN = Math.PI * 0.6; // 繞圈圈：一起轉約三分之一圈
const angOf = (p: Pt) => Math.atan2(p.z - C.z, p.x - C.x);
const ringAt = (i: number, f: number, r = RING_R): Pt => {
  const a = angOf(RING_A[i]) + TURN * f;
  return { x: C.x + Math.cos(a) * r, z: C.z + Math.sin(a) * r };
};
const RING_END = ids.map((i) => ringAt(i, 1));
const HUDDLE = ids.map((i) => ringAt(i, 1, 1.6));
/** 魚形膠帶點（魚頭朝右）：點與點至少相距 1.2 m。 */
export const FISH_MARKS: Pt[] = [
  { x: 8.1, z: 4 },
  { x: 6.9, z: 2.3 },
  { x: 5.2, z: 1.8 },
  { x: 3.6, z: 2.3 },
  { x: 2.0, z: 1.6 },
  { x: 2.7, z: 4 },
  { x: 2.0, z: 6.4 },
  { x: 3.6, z: 5.7 },
  { x: 5.2, z: 6.2 },
  { x: 6.9, z: 5.7 },
];
const FISH = matchByAngle(HUDDLE, FISH_MARKS);
export const LINE_Z = 6.9;
const LINE = (() => {
  const order = ids.slice().sort((a, b) => FISH[a].x - FISH[b].x || FISH[a].z - FISH[b].z);
  const out: Pt[] = [];
  order.forEach((i, k) => (out[i] = { x: 0.6 + k * (8.8 / 9), z: LINE_Z }));
  return out;
})();

/** 每段的標準起點與終點隊形。 */
const STARTS = [HOME, FORWARD, BACK, ZIP_END, RING_A, RING_END, HUDDLE, FISH, LINE];
const ENDS = [FORWARD, BACK, ZIP_END, RING_A, RING_END, HUDDLE, FISH, LINE, LINE];
export const freeStart = (type: number) => STARTS[type - FREE_FIRST];
export const freeEnd = (type: number) => ENDS[type - FREE_FIRST];

/** 段內時間 t（以預設秒數計）時的標準位置。 */
export function freeMotion(type: number, t: number): Pt[] {
  const k = type - FREE_FIRST,
    a = STARTS[k],
    b = ENDS[k];
  return ids.map((i) => {
    if (k === 2) {
      // 先各自靠到自己的半條路，再一排接一排穿到對面
      if (t < 1.6) return lerpPt(a[i], ZIP_START[i], ease(t / 1.6));
      return lerpPt(ZIP_START[i], b[i], ease((t - 1.6 - (i % 5) * 0.3) / 5.8));
    }
    if (k === 4) return ringAt(i, ease((t - 0.3) / 7.4));
    if (k === 8) return b[i];
    const [delay, dur] = [
      [1, 4.5],
      [0.5, 4.5],
      [0, 0],
      [0.3, 4.6],
      [0, 0],
      [0.3, 4],
      [0.6, 4.6],
      [0.2, 5.6],
    ][k];
    return lerpPt(a[i], b[i], ease((t - delay) / dur));
  });
}

/** 選取一顆球時顯示的「這段要去的地方」。 */
export const freeTarget = (type: number, t: number): Pt[] =>
  type === FREE_FIRST + 2 && t < 1.6 ? ZIP_START : freeEnd(type);

const RAINBOW = [
  '#16a5ef',
  '#7658ed',
  '#df52ba',
  '#13b8a6',
  '#73b82e',
  '#ff933b',
  '#ee5267',
  '#d39c13',
  '#c55ce0',
  '#138cb8',
];
export function freeLights(type: number, t: number) {
  const k = type - FREE_FIRST;
  const colors = [...RAINBOW],
    brightness = Array(10).fill(1) as number[];
  ids.forEach((i) => {
    if (k === 0) brightness[i] = clamp01((t - 0.15 * i) / 0.3); // 一顆接一顆亮起
    if (k === 2) colors[i] = i < 5 ? '#2f8fe0' : '#f08a2c'; // 拉鍊：分清楚兩隊
    if (k === 4) colors[i] = RAINBOW[(i + Math.floor(t * 2)) % 10]; // 繞圈：彩虹追光
    if (k === 6) colors[i] = t > 6 ? '#ffd23c' : t > 4.6 ? '#ff7a3d' : RAINBOW[i]; // 魚：變橘再變金
    if (k === 8) brightness[i] = 0.45 + 0.55 * Math.abs(Math.sin(t * 4 + i * 0.4)); // 謝幕閃燈
  });
  return { colors, brightness };
}

export function freeSubtitle(type: number, t: number) {
  const k = type - FREE_FIRST;
  return [
    t < 1 ? '燈亮囉！' : '一起往前走！',
    '後退～',
    t < 1.6 ? '藍隊靠後、橘隊靠前' : '拉鍊穿插！',
    '圍成一個圈圈',
    '繞圈圈～',
    '到中間集合！',
    t < 4.6 ? '鯉魚來了！排魚造型' : '是一條大鯉魚！',
    '到前面排一直線',
    '謝謝大家！',
  ][k];
}

/** 老師的鯉魚道具在「排魚造型」段放上舞台中間，之後留到謝幕。 */
export const koiProp = (type: number, t: number) =>
  type === FREE_FIRST + 6 ? clamp01((t - 1.6) / 0.8) : type > FREE_FIRST + 6 ? 1 : 0;

export const standardShow = () =>
  FREE_TYPES.map((type) => ({ id: crypto.randomUUID(), type, duration: freeDurations[type - FREE_FIRST] }));
