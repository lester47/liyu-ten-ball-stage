/*
 * 鯉魚十球秀（新）：
 * 前進 → 後退 → 拉鍊穿插 → 圍圈圈 → 繞圈圈 → 到中間集合 → 排魚造型 → 到前面排一直線 → 謝幕
 */
import {
  atD,
  bowLights,
  C,
  clamp01,
  ease,
  GOLD,
  HOME,
  ids,
  laneZ,
  lerpPt,
  lights,
  lineUp,
  matchByAngle,
  polar,
  RAINBOW,
  TEAM_L,
  TEAM_R,
  angOf,
  type FreeCard,
  type Pt,
} from './kit';

const FORWARD = ids.map((i) => atD(i, 3));
const BACK = ids.map((i) => atD(i, 1.4));
/** 拉鍊：藍隊在球道偏後、橘隊偏前，十條半路間距一樣（0.75 m），各自直直開到對面。 */
const ZIP_OFFSET = 0.375;
export const zipLane = (i: number) => laneZ(i % 5) + (i < 5 ? -ZIP_OFFSET : ZIP_OFFSET);
const ZIP_START = ids.map((i) => ({ x: BACK[i].x, z: zipLane(i) }));
const ZIP_END = ids.map((i) => ({ x: i < 5 ? 7 : 3, z: zipLane(i) }));

export const RING_R = 2.7;
const RING = ids.map((k) => polar((k * Math.PI) / 5 + Math.PI / 10, RING_R));
const RING_A = matchByAngle(ZIP_END, RING);
const TURN = Math.PI * 0.6; // 繞圈圈：一起轉約三分之一圈
const ringAt = (i: number, f: number, r = RING_R): Pt => polar(angOf(RING_A[i]) + TURN * f, r);
const RING_END = ids.map((i) => ringAt(i, 1));
const HUDDLE = ids.map((i) => ringAt(i, 1, 1.6));
/**
 * 地上的平面大鯉魚：Lester 提供的圓胖小鯉魚圖（魚頭朝右），放大平鋪在舞台中間。
 * 圖片中心與尺寸（公尺）；身體約 5.6 公尺寬，連尾巴約 7.3 公尺長。
 */
export const KOI_IMAGE = { x: 5.208, z: 3.788, w: 10.948, h: 6.644 };
/**
 * 魚形 ✕ 點：沿著圖中魚的輪廓（含背鰭、兩片尾鰭）往外 0.28 m，
 * 球停在這些點上就剛好貼著魚邊；點與點至少相距 1.6 m。
 */
export const FISH_MARKS: Pt[] = [
  { x: 8.48, z: 5.02 },
  { x: 7.06, z: 6.55 },
  { x: 5.09, z: 7.0 },
  { x: 3.26, z: 6.21 },
  { x: 0.92, z: 4.86 },
  { x: 0.97, z: 3.25 },
  { x: 3.32, z: 1.79 },
  { x: 4.99, z: 0.43 },
  { x: 6.95, z: 1.32 },
  { x: 8.45, z: 2.86 },
];
const FISH = matchByAngle(HUDDLE, FISH_MARKS);
export const LINE_Z = 6.9;
const LINE = lineUp(FISH, LINE_Z);

const rainbow = () => lights(() => {});
const goMarks = [
  { k: 'dot' as const, pts: HOME, color: 'team', size: 0.36 },
  { k: 'tick' as const, pts: FORWARD },
];

export const koiCards: FreeCard[] = [
  {
    show: 'koi',
    name: '前進',
    duration: 7,
    summary: '燈亮後一起往前開到舞台中間附近',
    tip: { kid: '燈亮了，把球往前開到中間附近停下', ok: '停在哪都好，前前後後像一群小魚游出來' },
    from: HOME,
    to: FORWARD,
    move: [1, 4.5],
    lights: (t) => lights((i, _c, b) => (b[i] = clamp01((t - 0.15 * i) / 0.3))),
    subtitle: (t) => (t < 1 ? '燈亮囉！' : '一起往前走！'),
    marks: goMarks,
  },
  {
    show: 'koi',
    name: '後退',
    duration: 6,
    summary: '一起退回自己面前',
    tip: { kid: '把球往回開，回到自己面前', ok: '退得多、退得少都可以，只要往回走' },
    from: FORWARD,
    to: BACK,
    move: [0.5, 4.5],
    lights: rainbow,
    subtitle: () => '後退～',
    marks: goMarks,
  },
  {
    show: 'koi',
    name: '拉鍊穿插',
    duration: 9,
    summary: '藍隊走後半條、橘隊走前半條，交錯穿到對面',
    tip: {
      kid: '藍隊走球道後半條、橘隊走前半條，直直開到對面',
      ok: '每人有自己那半條路，歪一點也不會撞到',
    },
    from: BACK,
    to: ZIP_END,
    // 先各自靠到自己的半條路，再一排接一排穿到對面
    motion: (t) =>
      ids.map((i) =>
        t < 1.6
          ? lerpPt(BACK[i], ZIP_START[i], ease(t / 1.6))
          : lerpPt(ZIP_START[i], ZIP_END[i], ease((t - 1.6 - (i % 5) * 0.3) / 5.8)),
      ),
    target: (t) => (t < 1.6 ? ZIP_START : ZIP_END),
    lights: () => lights((i, c) => (c[i] = i < 5 ? TEAM_L : TEAM_R)),
    subtitle: (t) => (t < 1.6 ? '藍隊靠後、橘隊靠前' : '拉鍊穿插！'),
    marks: ids.map((i) => ({
      k: 'line' as const,
      z: zipLane(i),
      x0: 1.3,
      x1: 8.7,
      color: i < 5 ? TEAM_L : TEAM_R,
      width: 0.05,
    })),
  },
  {
    show: 'koi',
    name: '圍圈圈',
    duration: 6,
    summary: '開到地上的圓圈膠帶上',
    tip: { kid: '開到地上的圓圈膠帶附近', ok: '圓圈歪一點像一朵花，不用很圓' },
    from: ZIP_END,
    to: RING_A,
    move: [0.3, 4.6],
    lights: rainbow,
    subtitle: () => '圍成一個圈圈',
    marks: [{ k: 'ring', rx: RING_R }],
  },
  {
    show: 'koi',
    name: '繞圈圈',
    duration: 8,
    summary: '大家朝同一方向慢慢繞',
    tip: { kid: '大家朝同一個方向慢慢繞', ok: '快一點慢一點都沒關係，像旋轉木馬' },
    from: RING_A,
    to: RING_END,
    motion: (t) => ids.map((i) => ringAt(i, ease((t - 0.3) / 7.4))),
    lights: (t) => lights((i, c) => (c[i] = RAINBOW[(i + Math.floor(t * 2)) % 10])),
    subtitle: () => '繞圈圈～',
    marks: [{ k: 'ring', rx: RING_R }],
  },
  {
    show: 'koi',
    name: '到中間集合',
    duration: 5,
    summary: '往舞台中間靠攏，圍成小圈',
    tip: { kid: '往舞台中間開，靠近就停', ok: '擠成一團最可愛，像小魚聚在一起' },
    from: RING_END,
    to: HUDDLE,
    move: [0.3, 4],
    lights: rainbow,
    subtitle: () => '到中間集合！',
    marks: [{ k: 'ring', rx: 1.6, n: 22 }],
  },
  {
    show: 'koi',
    name: '排魚造型',
    duration: 7,
    summary: '老師在地上鋪一條大鯉魚，大家開到魚的邊緣圍著它',
    tip: {
      kid: '開到大鯉魚旁邊的 ✕ 點上，貼著魚身、尾巴和背鰭停好',
      ok: '沒貼準也沒關係，圍在魚旁邊就看得出是一條魚',
    },
    from: HUDDLE,
    to: FISH,
    move: [0.8, 4.6],
    lights: (t) => lights((i, c) => (c[i] = t > 5.6 ? GOLD : t > 4.6 ? '#ff7a3d' : RAINBOW[i])),
    subtitle: (t) => (t < 4.6 ? '鯉魚來了！排魚造型' : '是一條大鯉魚！'),
    marks: [{ k: 'x', pts: FISH_MARKS, color: '#ff7a3d' }],
    koi: (t) => clamp01(t / 0.6),
  },
  {
    show: 'koi',
    name: '到前面排一直線',
    duration: 7,
    summary: '開到舞台前面的膠帶線上',
    tip: { kid: '把球開到舞台前面的膠帶線上', ok: '排得不直也沒關係，像一排小朋友在等拍照' },
    from: FISH,
    to: LINE,
    move: [0.2, 6.6],
    lights: rainbow,
    subtitle: () => '到前面排一直線',
    marks: [{ k: 'line', z: LINE_Z }],
    koi: () => 1,
  },
  {
    show: 'koi',
    name: '謝幕',
    duration: 5,
    summary: '閃燈說謝謝，孩子揮手鞠躬',
    tip: { kid: '閃燈說謝謝，孩子揮手鞠躬', ok: '球不用動，今天的主角是你們' },
    from: LINE,
    to: LINE,
    lights: (t) => bowLights(t),
    subtitle: () => '謝謝大家！',
    marks: [{ k: 'line', z: LINE_Z }],
    koi: () => 1,
    bow: true,
  },
];
export { C as KOI_CENTER };
