/*
 * 鯉魚十球秀：舞台中間一開始就放著一條大鯉魚，整套節目都圍著牠。
 * 燈亮出發 → 游到鯉魚身邊 → 跟鯉魚打招呼 → 繞著鯉魚游 → 鯉魚吐泡泡
 * → 貼著鯉魚排出魚形 → 跟鯉魚一起呼吸 → 到前面排一直線 → 謝幕
 */
import {
  angOf,
  atD,
  bowLights,
  clamp01,
  ease,
  GOLD,
  HOME,
  ids,
  lerpPt,
  lights,
  lineUp,
  matchByAngle,
  polar,
  RAINBOW,
  type FreeCard,
  type Pt,
} from './kit';

/**
 * 地上的鯉魚：Lester 提供的圓胖小鯉魚圖（魚頭朝右），平鋪在舞台中間。
 * 圖片中心與尺寸（公尺）；魚身約 3.3 公尺寬，連尾巴約 4.3 公尺長。
 */
export const KOI_IMAGE = { x: 5.128, z: 3.846, w: 6.44, h: 3.908 };
/** 魚身中心。 */
export const KOI_CENTER: Pt = { x: 5.3, z: 4 };
const K = KOI_CENTER;
/**
 * 魚形 ✕ 點：沿著圖中魚的輪廓（含背鰭、兩片尾鰭）往外 0.3 m，
 * 球停在這些點上就剛好貼著魚邊；點與點至少相距 0.99 m。
 */
export const FISH_MARKS: Pt[] = [
  { x: 7.18, z: 4.61 },
  { x: 6.29, z: 5.59 },
  { x: 5.04, z: 5.87 },
  { x: 3.89, z: 5.36 },
  { x: 2.47, z: 4.5 },
  { x: 2.5, z: 3.51 },
  { x: 3.92, z: 2.57 },
  { x: 4.98, z: 1.73 },
  { x: 6.22, z: 2.27 },
  { x: 7.16, z: 3.25 },
];
export const LINE_Z = 6.9;

const FORWARD = ids.map((i) => atD(i, 2));
/** 圍著鯉魚的大圓圈。 */
export const KOI_RING_R = 3.1;
const RING = ids.map((k) => polar((k * Math.PI) / 5 + Math.PI / 10, KOI_RING_R, K));
const RING_A = matchByAngle(FORWARD, RING, K);
const TURN = Math.PI * 0.6; // 繞著鯉魚游：一起轉約三分之一圈
const ringAt = (i: number, f: number, r = KOI_RING_R): Pt => polar(angOf(RING_A[i], K) + TURN * f, r, K);
const RING_END = ids.map((i) => ringAt(i, 1));
const NEAR = ids.map((i) => ringAt(i, 0, KOI_RING_R - 0.4));
/** 集合點：十顆球擠到鯉魚肚子上，圍成一小團（半徑 1.25 m）。 */
export const GATHER_R = 1.25;
const GATHER = ids.map((i) => ringAt(i, 1, GATHER_R));
const FISH = matchByAngle(RING_END, FISH_MARKS, K);
/** 呼吸：從魚邊往外 0.35 m。 */
const BREATH = FISH.map((p) => {
  const a = angOf(p, K);
  return { x: p.x + Math.cos(a) * 0.35, z: p.z + Math.sin(a) * 0.35 };
});
const LINE = lineUp(FISH, LINE_Z);

const koiAlways = () => 1;
const rainbow = () => lights(() => {});
const ringMark = { k: 'ring' as const, rx: KOI_RING_R, cx: K.x, cz: K.z };
const fishMark = { k: 'x' as const, pts: FISH_MARKS, color: '#ff7a3d' };
const lerpAll = (a: Pt[], b: Pt[], f: number) => a.map((p, i) => lerpPt(p, b[i], f));

export const koiCards: FreeCard[] = [
  {
    show: 'koi',
    name: '燈亮出發',
    duration: 5,
    summary: '燈一顆接一顆亮起，往大鯉魚的方向開一小段',
    tip: { kid: '燈亮了，把球往大鯉魚的方向開一小段', ok: '開多開少都可以，像小魚好奇地游出來' },
    from: HOME,
    to: FORWARD,
    move: [1.2, 3.6],
    lights: (t) => lights((i, _c, b) => (b[i] = clamp01((t - 0.15 * i) / 0.3))),
    subtitle: (t) => (t < 1.2 ? '大鯉魚在舞台中間！' : '小魚游出來囉'),
    marks: [{ k: 'tick', pts: FORWARD }],
    koi: koiAlways,
  },
  {
    show: 'koi',
    name: '游到鯉魚身邊',
    duration: 6,
    summary: '開到鯉魚外圍的大圓圈上，把鯉魚圍起來',
    tip: { kid: '開到鯉魚外面那一圈膠帶附近', ok: '圈圈歪歪的也很好看，像一群小魚圍著大魚' },
    from: FORWARD,
    to: RING_A,
    move: [0.2, 5.6],
    lights: rainbow,
    subtitle: () => '游到鯉魚身邊',
    marks: [ringMark],
    koi: koiAlways,
  },
  {
    show: 'koi',
    name: '跟鯉魚打招呼',
    duration: 5,
    summary: '往鯉魚靠近一小步，閃燈說哈囉，再退回圓圈',
    tip: { kid: '往鯉魚開一小步，閃燈說哈囉，再退回來', ok: '沒退回原位也沒關係，鯉魚都看到你了' },
    from: RING_A,
    to: RING_A,
    motion: (t) => lerpAll(RING_A, NEAR, ease((t - 0.2) / 1.8) - ease((t - 2.9) / 1.9)),
    target: (t) => (t < 2.6 ? NEAR : RING_A),
    lights: (t) =>
      lights(
        (i, c, b) => (
          (c[i] = t > 1.8 && t < 3.1 ? GOLD : RAINBOW[i]),
          (b[i] = t > 1.8 && t < 3.1 ? 0.5 + 0.5 * Math.abs(Math.sin(t * 8)) : 1)
        ),
      ),
    subtitle: (t) => (t < 2.9 ? '鯉魚你好！' : '退回圓圈'),
    marks: [ringMark],
    koi: koiAlways,
  },
  {
    show: 'koi',
    name: '繞著鯉魚游',
    duration: 8,
    summary: '大家朝同一個方向，繞著鯉魚慢慢游',
    tip: { kid: '大家朝同一個方向，繞著鯉魚慢慢開', ok: '快一點慢一點都沒關係，像小魚在池塘裡轉圈' },
    from: RING_A,
    to: RING_END,
    motion: (t) => ids.map((i) => ringAt(i, ease((t - 0.2) / 7.4))),
    lights: (t) => lights((i, c) => (c[i] = RAINBOW[(i + Math.floor(t * 2)) % 10])),
    subtitle: () => '繞著鯉魚游～',
    marks: [ringMark],
    koi: koiAlways,
  },
  {
    show: 'koi',
    name: '鯉魚吐泡泡',
    duration: 4,
    summary: '不用移動，燈一顆接一顆閃白、閃藍，像鯉魚吐泡泡',
    tip: { kid: '輪到你時把燈換成白色或藍色，像一顆泡泡', ok: '閃早閃晚都可以，泡泡本來就亂亂冒' },
    from: RING_END,
    to: RING_END,
    lights: (t) =>
      lights((i, c, b) => {
        const k = (t * 3 + i * 0.9) % 3;
        c[i] = k < 1 ? '#ffffff' : '#16a5ef';
        b[i] = k < 1 ? 1 : 0.45;
      }),
    subtitle: () => '鯉魚吐泡泡～啵啵啵',
    marks: [ringMark],
    koi: koiAlways,
  },
  {
    show: 'koi',
    name: '貼著鯉魚排魚形',
    duration: 7,
    summary: '開到鯉魚邊上的 ✕ 點，貼著魚身、背鰭和尾巴排出魚形',
    tip: { kid: '開到鯉魚邊上的 ✕ 點，貼著魚身停好', ok: '沒貼準也沒關係，圍在魚旁邊就看得出是一條魚' },
    from: RING_END,
    to: FISH,
    move: [0.3, 5.2],
    lights: (t) => lights((i, c) => (c[i] = t > 6 ? GOLD : t > 5.2 ? '#ff7a3d' : RAINBOW[i])),
    subtitle: (t) => (t < 5.5 ? '貼著鯉魚排出魚形' : '變成一條發光的大鯉魚！'),
    marks: [fishMark],
    koi: koiAlways,
  },
  {
    show: 'koi',
    name: '跟鯉魚一起呼吸',
    duration: 5,
    summary: '往外一小步、再回到魚邊，做兩次，像鯉魚在呼吸',
    tip: { kid: '往外開一小步，再回到魚邊，做兩次', ok: '一次也很棒，鯉魚的呼吸本來就有大有小' },
    from: FISH,
    to: FISH,
    motion: (t) => {
      const f = (s: number) => ease((t - s) / 1.1) - ease((t - s - 1.2) / 1.1);
      return lerpAll(FISH, BREATH, f(0.2) + f(2.6));
    },
    target: (t) => ((t > 0.2 && t < 1.4) || (t > 2.6 && t < 3.8) ? BREATH : FISH),
    lights: (t) => lights((i, c, b) => ((c[i] = GOLD), (b[i] = 0.55 + 0.45 * Math.abs(Math.sin(t * 1.9))))),
    subtitle: (t) => (Math.floor((t - 0.2) / 1.2) % 2 ? '吐氣～' : '吸氣～'),
    marks: [fishMark],
    koi: koiAlways,
  },
  {
    show: 'koi',
    name: '到前面排一直線',
    duration: 6,
    summary: '開到舞台前面的膠帶線上',
    tip: { kid: '把球開到舞台前面的膠帶線上', ok: '排得不直也沒關係，像一排小魚在等拍照' },
    from: FISH,
    to: LINE,
    move: [0.2, 5.4],
    lights: rainbow,
    subtitle: () => '到前面排一直線',
    marks: [{ k: 'line', z: LINE_Z }],
    koi: koiAlways,
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
    koi: koiAlways,
    bow: true,
  },
];

/** 後來加入的段落：編號接在所有節目之後，避免舊存檔的卡片編號錯位；pos 決定在鯉魚秀裡的順序。 */
export const koiExtraCards: FreeCard[] = [
  {
    show: 'koi',
    name: '到中間集合',
    duration: 9,
    summary: '大家擠到鯉魚肚子上集合，再散回圓圈，進出兩次',
    tip: {
      kid: '往鯉魚肚子中間開，擠在一起，再退回圓圈，做兩次',
      ok: '擠歪了、退不回原位都沒關係，像小魚一下聚、一下散',
    },
    from: RING_END,
    to: RING_END,
    // 進 → 停一下 → 出 → 停一下 → 進 → 停一下 → 出
    motion: (t) => {
      const go = (s: number) => ease((t - s) / 1.9) - ease((t - s - 2.2) / 1.9);
      return lerpAll(RING_END, GATHER, go(0.2) + go(4.6));
    },
    target: (t) => ((t > 0.2 && t < 2.4) || (t > 4.6 && t < 6.8) ? GATHER : RING_END),
    lights: (t) => {
      const inside = (t > 1.9 && t < 2.6) || (t > 6.3 && t < 7);
      return lights((i, c, b) => {
        c[i] = inside ? GOLD : RAINBOW[(i + Math.floor(t * 3)) % 10];
        b[i] = inside ? 0.5 + 0.5 * Math.abs(Math.sin(t * 10)) : 1;
      });
    },
    subtitle: (t) => (t < 2.4 || (t > 4.6 && t < 6.8) ? '到中間集合！' : '散開～'),
    marks: [ringMark, { k: 'ring', rx: GATHER_R, n: 18, cx: K.x, cz: K.z }],
    koi: koiAlways,
    pos: 4.5,
  },
];
