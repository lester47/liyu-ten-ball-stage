/*
 * 另外三套自由走位節目：🌈 彩虹花園、🚂 小火車開動、🎆 新年煙火會。
 * 原則與鯉魚秀相同：入門好做、標準路線寬間距中低速、每段附「做不到也沒關係」。
 */
import {
  angOf,
  bowLights,
  C,
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
  TEAM_L,
  TEAM_R,
  type FreeCard,
  type Pt,
} from './kit';

const LINE_Z = 6.9;
const lerpAll = (a: Pt[], b: Pt[], f: number) => ids.map((i) => lerpPt(a[i], b[i], f));
const scaleAbout = (p: Pt[], s: number) => p.map((q) => lerpPt(C, q, s));

// =====================================================================
// 🌈 彩虹花園：種子撒在舞台各處，發芽、長高、排成一朵大花，花一開一合。
// =====================================================================
const SEED_MARKS: Pt[] = [
  { x: 2.0, z: 6.6 },
  { x: 3.4, z: 5.0 },
  { x: 1.6, z: 3.4 },
  { x: 2.8, z: 1.6 },
  { x: 4.8, z: 2.6 },
  { x: 5.2, z: 6.4 },
  { x: 6.6, z: 4.6 },
  { x: 8.2, z: 6.4 },
  { x: 7.4, z: 2.0 },
  { x: 8.6, z: 3.8 },
];
const SEEDS = matchByAngle(HOME, SEED_MARKS);
const GROW = scaleAbout(SEEDS, 0.75);
const PETAL_R = 2.6,
  HEART_R = 1.2;
const PETALS = ids.slice(0, 5).map((k) => polar(Math.PI / 2 + (k * 2 * Math.PI) / 5, PETAL_R));
const HEART = ids.slice(0, 5).map((k) => polar(Math.PI / 2 + Math.PI / 5 + (k * 2 * Math.PI) / 5, HEART_R));
/** 離中心最近的五顆當花心，其餘當花瓣，各自依角度對應。 */
const FLOWER = (() => {
  const d = (p: Pt) => Math.hypot(p.x - C.x, p.z - C.z);
  const byDist = ids.slice().sort((a, b) => d(GROW[a]) - d(GROW[b]));
  const inner = byDist.slice(0, 5),
    outer = byDist.slice(5);
  const out: Pt[] = [];
  const assign = (group: number[], spots: Pt[]) => {
    const g = group.slice().sort((a, b) => angOf(GROW[a]) - angOf(GROW[b]));
    const s = spots.slice().sort((a, b) => angOf(a) - angOf(b));
    let best = 0,
      bestCost = Infinity;
    for (let shift = 0; shift < 5; shift++) {
      const cost = g.reduce((acc, i, k) => {
        const p = s[(k + shift) % 5];
        return acc + (GROW[i].x - p.x) ** 2 + (GROW[i].z - p.z) ** 2;
      }, 0);
      if (cost < bestCost) [best, bestCost] = [shift, cost];
    }
    g.forEach((i, k) => (out[i] = s[(k + best) % 5]));
  };
  assign(outer, PETALS);
  assign(inner, HEART);
  return out;
})();
const isPetal = ids.map((i) => Math.hypot(FLOWER[i].x - C.x, FLOWER[i].z - C.z) > 2);
const BLOOM = ids.map((i) => lerpPt(C, FLOWER[i], isPetal[i] ? 3.4 / PETAL_R : 2.0 / HEART_R));
const GARDEN_LINE = lineUp(FLOWER, LINE_Z);
const PINKS = ['#ff5fa2', '#ff7a3d', '#df52ba', '#ee5267', '#c55ce0'];
const flowerColor = (i: number, t: number) => (isPetal[i] ? PINKS[(i + Math.floor(t * 1.5)) % 5] : GOLD);
const seedDots = { k: 'dot' as const, pts: SEED_MARKS, color: '#73b82e', size: 0.4 };
const flowerDots = [
  { k: 'dot' as const, pts: PETALS, color: '#ff8fc0', size: 0.46 },
  { k: 'dot' as const, pts: HEART, color: '#ffd23c', size: 0.4 },
];

export const gardenCards: FreeCard[] = [
  {
    show: 'garden',
    name: '撒種子',
    duration: 8,
    summary: '從自己面前開到舞台上的綠色種子點',
    tip: { kid: '把球開到離你最近的綠色圓點，停下來當種子', ok: '停在圓點旁邊也可以，種子本來就撒得亂亂的' },
    from: HOME,
    to: SEEDS,
    move: [0.5, 6.5],
    lights: () => lights((i, c, b) => ((c[i] = '#73b82e'), (b[i] = 0.35))),
    subtitle: (t) => (t < 1 ? '我們來種花！' : '把種子撒出去～'),
    marks: [seedDots],
  },
  {
    show: 'garden',
    name: '發芽',
    duration: 7,
    summary: '不用移動，種子一顆接一顆亮燈發芽',
    tip: { kid: '輪到你的時候，把燈換成你喜歡的顏色', ok: '早一點、晚一點亮都可以，花園本來就是慢慢冒芽' },
    from: SEEDS,
    to: SEEDS,
    lights: (t) =>
      lights((i, c, b) => {
        const on = clamp01((t - 0.5 - i * 0.55) / 0.4);
        c[i] = on > 0 ? RAINBOW[i] : '#73b82e';
        b[i] = 0.35 + 0.65 * on;
      }),
    subtitle: (t) => (t < 5.5 ? '發芽囉！一顆接一顆' : '整片花園都亮了！'),
    marks: [seedDots],
  },
  {
    show: 'garden',
    name: '往中間長',
    duration: 7,
    summary: '大家一起往舞台中間靠近一點點',
    tip: { kid: '朝舞台中間慢慢開一小段', ok: '多走、少走都沒關係，小苗本來就長得不一樣高' },
    from: SEEDS,
    to: GROW,
    move: [0.5, 5.5],
    lights: (t) => lights((i, c, b) => (b[i] = 0.75 + 0.25 * Math.sin(t * 3 + i))),
    subtitle: () => '慢慢長高～',
    marks: [seedDots],
  },
  {
    show: 'garden',
    name: '排成大花',
    duration: 9,
    summary: '五顆當花瓣、五顆當花心，排成一朵大花',
    tip: { kid: '外圈的開到粉紅點當花瓣，裡面的開到黃點當花心', ok: '花瓣大小不一樣也很美，像真的花一樣' },
    from: GROW,
    to: FLOWER,
    // 花心先走、花瓣晚一點出發，彼此不會擠在一起
    motion: (t) =>
      ids.map((i) => lerpPt(GROW[i], FLOWER[i], ease(isPetal[i] ? (t - 1.5) / 6 : (t - 0.5) / 5.5))),
    lights: (t) => lights((i, c) => (c[i] = t > 6.5 ? flowerColor(i, 0) : RAINBOW[i])),
    subtitle: (t) => (t < 6.5 ? '排成一朵大花' : '開出一朵花了！'),
    marks: flowerDots,
  },
  {
    show: 'garden',
    name: '花瓣變色',
    duration: 7,
    summary: '不用移動，花瓣輪流換顏色',
    tip: { kid: '花瓣換成粉紅、紫色，花心換成黃色', ok: '換錯顏色也沒關係，彩虹花本來就五顏六色' },
    from: FLOWER,
    to: FLOWER,
    lights: (t) => lights((i, c, b) => ((c[i] = flowerColor(i, t)), (b[i] = isPetal[i] ? 1 : 0.8))),
    subtitle: () => '花瓣變顏色～',
    marks: flowerDots,
  },
  {
    show: 'garden',
    name: '花開花合',
    duration: 8,
    summary: '大家往外開一小步（花開），再退回來（花合）',
    tip: { kid: '先往外開一小步，再退回原來的點', ok: '開大開小都可愛，像花在呼吸' },
    from: FLOWER,
    to: FLOWER,
    motion: (t) => lerpAll(FLOWER, BLOOM, ease((t - 0.5) / 3) - ease((t - 4.3) / 3.2)),
    target: (t) => (t < 4 ? BLOOM : FLOWER),
    lights: (t) => lights((i, c) => (c[i] = flowerColor(i, t))),
    subtitle: (t) => (t < 4 ? '花開了！' : '花合起來～'),
    marks: [...flowerDots, { k: 'ring', rx: 3.4 }],
  },
  {
    show: 'garden',
    name: '到前面排一排',
    duration: 7,
    summary: '開到舞台前面的膠帶線上',
    tip: { kid: '把球開到舞台前面的膠帶線上', ok: '排得不直也沒關係，像一排花盆' },
    from: FLOWER,
    to: GARDEN_LINE,
    move: [0.3, 6.2],
    lights: () => lights(() => {}),
    subtitle: () => '到前面排一排',
    marks: [{ k: 'line', z: LINE_Z }],
  },
  {
    show: 'garden',
    name: '謝幕',
    duration: 7,
    summary: '閃燈說謝謝，孩子揮手鞠躬',
    tip: { kid: '閃燈說謝謝，孩子揮手鞠躬', ok: '球不用動，今天的花是你們' },
    from: GARDEN_LINE,
    to: GARDEN_LINE,
    lights: (t) => bowLights(t, (i) => [...PINKS, GOLD, ...PINKS][i]),
    subtitle: () => '謝謝大家！',
    marks: [{ k: 'line', z: LINE_Z }],
    bow: true,
  },
];

// =====================================================================
// 🚂 小火車開動：一顆接一顆排成火車繞舞台一圈，再分成藍、橘兩列交會、進站。
// =====================================================================
export const TRACK_RX = 3.0,
  TRACK_RZ = 2.0;
/** 橢圓軌道依弧長取點：s 從軌道最前方（靠觀眾）開始，逆時針（從上方看）。 */
const TRACK = (() => {
  const N = 2400,
    pts: Pt[] = [],
    len: number[] = [0];
  for (let k = 0; k <= N; k++) {
    const a = Math.PI / 2 - (k / N) * Math.PI * 2;
    pts.push({ x: C.x + Math.cos(a) * TRACK_RX, z: C.z + Math.sin(a) * TRACK_RZ });
    if (k) len.push(len[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].z - pts[k - 1].z));
  }
  return { pts, len, total: len[N] };
})();
const TRACK_LEN = TRACK.total;
function onTrack(s: number): Pt {
  s = ((s % TRACK_LEN) + TRACK_LEN) % TRACK_LEN;
  let lo = 0,
    hi = TRACK.len.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (TRACK.len[mid] <= s) lo = mid;
    else hi = mid;
  }
  const f = (s - TRACK.len[lo]) / (TRACK.len[hi] - TRACK.len[lo] || 1);
  return lerpPt(TRACK.pts[lo], TRACK.pts[hi], f);
}
const CAR_GAP = 1.1;
const HEAD_S = TRACK_LEN * 0.62;
const SLOTS = ids.map((k) => onTrack(HEAD_S - k * CAR_GAP));
const TRAIN = matchByAngle(HOME, SLOTS);
/** 每顆球在火車裡是第幾節（0 = 火車頭）。 */
const carOf = ids.map((i) => SLOTS.findIndex((p) => p === TRAIN[i]));
/** 平順的加速、等速、減速：最高速 = 距離 /（時間 - 加速時間）。 */
function cruise(t: number, T: number, ta: number) {
  const v = 1 / (T - ta);
  if (t <= 0) return 0;
  if (t >= T) return 1;
  if (t < ta) return (v * t * t) / (2 * ta);
  if (t > T - ta) return 1 - (v * (T - t) ** 2) / (2 * ta);
  return v * (t - ta / 2);
}
const ROW_L_Z = 5.4,
  ROW_R_Z = 2.6;
const rowOf = (from: Pt[], team: (i: number) => boolean, z: number, x0: number) => {
  const out: Pt[] = [];
  ids
    .filter(team)
    .sort((a, b) => from[a].x - from[b].x)
    .forEach((i, k) => (out[i] = { x: x0 + k * 1.3, z }));
  return out;
};
const ROWS = (() => {
  const l = rowOf(TRAIN, (i) => i < 5, ROW_L_Z, 0.9),
    r = rowOf(TRAIN, (i) => i >= 5, ROW_R_Z, 3.9);
  return ids.map((i) => (i < 5 ? l[i] : r[i]));
})();
const PASSED = ROWS.map((p, i) => ({ x: p.x + (i < 5 ? 3.2 : -3.2), z: p.z }));
const STATION_L = 6.6,
  STATION_R = 4.2;
const STATION = PASSED.map((p, i) => ({ x: p.x, z: i < 5 ? STATION_L : STATION_R }));
const carColor = (i: number) => (carOf[i] === 0 ? GOLD : RAINBOW[carOf[i]]);
const trackMark = { k: 'ring' as const, rx: TRACK_RX, rz: TRACK_RZ, n: 44 };
const rowMarks = (zl: number, zr: number, shift = 0) => [
  { k: 'line' as const, z: zl, x0: 0.6 + shift, x1: 6.3 + shift, color: TEAM_L },
  { k: 'line' as const, z: zr, x0: 3.6 - shift, x1: 9.3 - shift, color: TEAM_R },
];

export const trainCards: FreeCard[] = [
  {
    show: 'train',
    name: '排隊上車',
    duration: 10,
    summary: '開到橢圓軌道上，排成一列小火車',
    tip: { kid: '把球開到橢圓形的軌道膠帶上，跟前面那顆排好', ok: '車廂排得歪歪的也沒關係，像玩具火車' },
    from: HOME,
    to: TRAIN,
    move: [0.5, 8],
    lights: () => lights((i, c, b) => ((c[i] = carColor(i)), (b[i] = 0.6))),
    subtitle: (t) => (t < 1 ? '小火車要出發囉' : '排隊上車！'),
    marks: [trackMark],
  },
  {
    show: 'train',
    name: '鳴笛出發',
    duration: 5,
    summary: '不用移動，火車頭先亮燈，車廂一節一節跟著亮',
    tip: { kid: '火車頭先閃燈，後面的人看到前面亮了再亮', ok: '亮慢了也沒關係，火車本來就是一節一節動起來' },
    from: TRAIN,
    to: TRAIN,
    lights: (t) =>
      lights((i, c, b) => {
        c[i] = carColor(i);
        b[i] = carOf[i] === 0 ? 0.5 + 0.5 * Math.abs(Math.sin(t * 6)) : t > 1 + carOf[i] * 0.35 ? 1 : 0.35;
      }),
    subtitle: (t) => (t < 2 ? '嘟嘟～' : '準備出發！'),
    marks: [trackMark],
  },
  {
    show: 'train',
    name: '繞舞台一圈',
    duration: 14,
    summary: '跟著前面那顆，沿著軌道繞一圈',
    tip: { kid: '跟著你前面那顆球走，繞舞台一圈', ok: '跟丟了就切近路追上去，火車晃一晃更可愛' },
    from: TRAIN,
    to: TRAIN,
    motion: (t) => {
      const s = cruise(t - 0.5, 13, 1.5) * TRACK_LEN;
      return ids.map((i) => onTrack(HEAD_S - carOf[i] * CAR_GAP + s));
    },
    lights: (t) =>
      lights((i, c, b) => {
        c[i] = carColor(i);
        b[i] = 0.75 + 0.25 * Math.sin(t * 5 - carOf[i] * 0.7);
      }),
    subtitle: (t) => (t < 7 ? '火車開動囉！' : '繞一圈回來～'),
    marks: [trackMark],
  },
  {
    show: 'train',
    name: '分成兩列',
    duration: 8,
    summary: '藍隊、橘隊各自排成一列火車',
    tip: { kid: '藍隊開到藍色膠帶，橘隊開到橘色膠帶，排成一列', ok: '排不直也沒關係，兩列火車分得出來就好' },
    from: TRAIN,
    to: ROWS,
    move: [0.5, 6.5],
    lights: (t) => lights((i, c) => (c[i] = t > 2 ? (i < 5 ? TEAM_L : TEAM_R) : carColor(i))),
    subtitle: () => '分成藍色、橘色兩列',
    marks: rowMarks(ROW_L_Z, ROW_R_Z),
  },
  {
    show: 'train',
    name: '兩列火車交會',
    duration: 9,
    summary: '藍色火車往右、橘色火車往左，擦身而過',
    tip: { kid: '藍隊往右開、橘隊往左開，各走自己的那條線', ok: '兩條線隔很遠，開歪一點也不會撞' },
    from: ROWS,
    to: PASSED,
    move: [0.5, 7.5],
    lights: (t) =>
      lights((i, c, b) => {
        c[i] = i < 5 ? TEAM_L : TEAM_R;
        b[i] = 0.7 + 0.3 * Math.sin(t * 6 + i);
      }),
    subtitle: (t) => (t < 4.5 ? '兩列火車交會！' : '叭叭～打招呼'),
    marks: [
      { k: 'line', z: ROW_L_Z, x0: 0.6, x1: 9.4, color: TEAM_L },
      { k: 'line', z: ROW_R_Z, x0: 0.6, x1: 9.4, color: TEAM_R },
    ],
  },
  {
    show: 'train',
    name: '進站停好',
    duration: 8,
    summary: '兩列火車往前開，停進月台',
    tip: { kid: '往前開到你們隊的月台膠帶停下', ok: '停早一點、晚一點都可以，到站就好' },
    from: PASSED,
    to: STATION,
    move: [0.5, 6],
    lights: (t) => lights((i, c, b) => ((c[i] = i < 5 ? TEAM_L : TEAM_R), (b[i] = t > 6.5 ? 0.6 : 1))),
    subtitle: (t) => (t < 6.5 ? '進站囉～' : '到站了！'),
    marks: [
      { k: 'line', z: STATION_L, x0: 3.6, x1: 9.6, color: TEAM_L, width: 0.12 },
      { k: 'line', z: STATION_R, x0: 0.4, x1: 6.4, color: TEAM_R, width: 0.12 },
    ],
  },
  {
    show: 'train',
    name: '謝幕',
    duration: 6,
    summary: '閃燈說謝謝，孩子揮手鞠躬',
    tip: { kid: '閃燈說謝謝，孩子揮手鞠躬', ok: '球不用動，今天的司機是你們' },
    from: STATION,
    to: STATION,
    lights: (t) => bowLights(t, carColor),
    subtitle: () => '謝謝大家！',
    marks: [
      { k: 'line', z: STATION_L, x0: 3.6, x1: 9.6, color: TEAM_L, width: 0.12 },
      { k: 'line', z: STATION_R, x0: 0.4, x1: 6.4, color: TEAM_R, width: 0.12 },
    ],
    bow: true,
  },
];

// =====================================================================
// 🎆 新年煙火會：十球在中間集合，倒數後往外衝出、換色、轉圈、再集合，一次比一次大。
// =====================================================================
const CORE_R = 1.3;
const CORE = ids.map((k) => polar(Math.PI / 10 + (k * Math.PI) / 5, CORE_R));
const CORE_A = matchByAngle(HOME, CORE);
const baseAng = ids.map((i) => angOf(CORE_A[i]));
const SPIN = Math.PI * 0.2;
const at = (i: number, r: number, spin: number) => polar(baseAng[i] + spin, r);
const ringPts = (r: number, spin: number) => ids.map((i) => at(i, r, spin));
const STAR_MARKS: Pt[] = [
  { x: 1.4, z: 5.8 },
  { x: 2.6, z: 3.6 },
  { x: 1.6, z: 1.4 },
  { x: 3.8, z: 1.0 },
  { x: 4.2, z: 5.6 },
  { x: 5.8, z: 3.0 },
  { x: 6.2, z: 6.6 },
  { x: 7.4, z: 4.4 },
  { x: 8.6, z: 6.4 },
  { x: 8.4, z: 1.8 },
];
const BIG = ringPts(3.4, SPIN * 2);
const STARS = matchByAngle(BIG, STAR_MARKS);
const FIRE_LINE = lineUp(STARS, LINE_Z);
const FIRE = ['#ff304b', '#ffd23c', '#23d77e', '#16a5ef', '#c55ce0'];
/** 衝出去時一起換成同一種煙火色，收回來時恢復彩虹。 */
const burstLights = (t: number, color: string, outAt: number, backAt: number) =>
  lights((i, c, b) => {
    const out = t > outAt && t < backAt;
    c[i] = out ? (Math.floor(t * 4) % 2 ? color : FIRE[(i + 2) % 5]) : RAINBOW[i];
    b[i] = out ? 1 : 0.6;
  });
const burst =
  (
    r: number,
    outEnd: number,
    spinFrom: number,
    spinTo: number,
    spinT: [number, number],
    backT?: [number, number],
  ) =>
  (t: number) => {
    const out = ease((t - 0.3) / (outEnd - 0.3));
    const back = backT ? ease((t - backT[0]) / (backT[1] - backT[0])) : 0;
    const radius = CORE_R + (r - CORE_R) * (out - back);
    const spin = spinFrom + (spinTo - spinFrom) * ease((t - spinT[0]) / (spinT[1] - spinT[0]));
    return ids.map((i) => at(i, radius, spin));
  };

export const fireworkCards: FreeCard[] = [
  {
    show: 'firework',
    name: '到中間集合',
    duration: 8,
    summary: '大家開到舞台中間的小圈圈，準備放煙火',
    tip: { kid: '把球開到舞台中間的小圓圈上', ok: '擠一點沒關係，煙火本來就是一大包' },
    from: HOME,
    to: CORE_A,
    move: [0.5, 6.5],
    lights: () => lights((i, _c, b) => (b[i] = 0.5)),
    subtitle: (t) => (t < 1 ? '新年煙火會！' : '大家到中間集合'),
    marks: [{ k: 'ring', rx: CORE_R, n: 18 }],
  },
  {
    show: 'firework',
    name: '倒數 3、2、1',
    duration: 5,
    summary: '不用移動，跟觀眾一起倒數，燈一下一下閃',
    tip: { kid: '和觀眾一起喊 3、2、1，每喊一聲閃一下燈', ok: '閃早閃晚都沒關係，大家一起喊最重要' },
    from: CORE_A,
    to: CORE_A,
    lights: (t) =>
      lights((i, c, b) => {
        const beat = t - Math.floor(t);
        c[i] = t > 4 ? GOLD : RAINBOW[i];
        b[i] = t > 4 ? 1 : 0.3 + 0.7 * Math.max(0, 1 - beat * 2.5);
      }),
    subtitle: (t) => (t < 1 ? '準備倒數！' : t < 2 ? '3' : t < 3 ? '2' : t < 4 ? '1' : '咻～'),
    marks: [{ k: 'ring', rx: CORE_R, n: 18 }],
  },
  {
    show: 'firework',
    name: '小煙火',
    duration: 7,
    summary: '往外衝一小步、換顏色，再收回來',
    tip: { kid: '往外衝一小步，換個顏色，再開回中間', ok: '衝多衝少都好看，每朵煙火本來就不一樣' },
    from: CORE_A,
    to: CORE_A,
    motion: burst(2.2, 1.5, 0, 0, [0, 1], [4.5, 6.5]),
    target: (t) => (t < 4.5 ? ringPts(2.2, 0) : CORE_A),
    lights: (t) => burstLights(t, '#ff304b', 0.4, 4.6),
    subtitle: (t) => (t < 4.5 ? '砰！小煙火' : '收回來～'),
    marks: [
      { k: 'ring', rx: CORE_R, n: 18 },
      { k: 'ring', rx: 2.2, n: 28 },
    ],
  },
  {
    show: 'firework',
    name: '中煙火',
    duration: 8,
    summary: '衝得更遠，一起轉一點點，再收回來',
    tip: { kid: '衝到第二圈，大家往同一邊轉一點點，再開回中間', ok: '轉多轉少都沒關係，煙火會旋轉更漂亮' },
    from: CORE_A,
    to: ringPts(CORE_R, SPIN),
    motion: burst(2.9, 2.0, 0, SPIN, [2.2, 5.2], [5.5, 7.7]),
    target: (t) => (t < 5.5 ? ringPts(2.9, SPIN) : ringPts(CORE_R, SPIN)),
    lights: (t) => burstLights(t, '#23d77e', 0.4, 5.6),
    subtitle: (t) => (t < 2.2 ? '砰！中煙火' : t < 5.5 ? '轉一轉～' : '再收回來'),
    marks: [
      { k: 'ring', rx: CORE_R, n: 18 },
      { k: 'ring', rx: 2.9, n: 34 },
    ],
  },
  {
    show: 'firework',
    name: '大煙火',
    duration: 9,
    summary: '衝到最大圈，轉一轉，滿台都是光',
    tip: { kid: '衝到最外圈，跟大家一起轉一點點', ok: '越亂越像煙火，衝到哪裡都很美' },
    from: ringPts(CORE_R, SPIN),
    to: BIG,
    motion: burst(3.4, 2.5, SPIN, SPIN * 2, [2.8, 6.8]),
    target: () => BIG,
    lights: (t) =>
      lights((i, c, b) => {
        c[i] = t < 0.4 ? RAINBOW[i] : FIRE[(i + Math.floor(t * 5)) % 5];
        b[i] = t < 0.4 ? 0.6 : 0.6 + 0.4 * Math.abs(Math.sin(t * 7 + i));
      }),
    subtitle: (t) => (t < 2.8 ? '砰砰！大煙火！' : '滿天都是光！'),
    marks: [{ k: 'ring', rx: 3.4, n: 40 }],
  },
  {
    show: 'firework',
    name: '煙火散落',
    duration: 8,
    summary: '像煙火灑下來，開到舞台上的星星點',
    tip: { kid: '慢慢開到附近的黃色星星點', ok: '停在哪都像星星，亂亂的最好看' },
    from: BIG,
    to: STARS,
    move: [0.5, 6],
    lights: (t) =>
      lights((i, c, b) => ((c[i] = GOLD), (b[i] = 0.4 + 0.6 * Math.abs(Math.sin(t * 3 + i * 1.7))))),
    subtitle: () => '一閃一閃亮晶晶',
    marks: [{ k: 'dot', pts: STAR_MARKS, color: GOLD, size: 0.4 }],
  },
  {
    show: 'firework',
    name: '到前面排一排',
    duration: 8,
    summary: '開到舞台前面的膠帶線上',
    tip: { kid: '把球開到舞台前面的膠帶線上', ok: '排得不直也沒關係，像一排仙女棒' },
    from: STARS,
    to: FIRE_LINE,
    move: [0.3, 6.5],
    lights: () => lights(() => {}),
    subtitle: () => '到前面排一排',
    marks: [{ k: 'line', z: LINE_Z }],
  },
  {
    show: 'firework',
    name: '謝幕',
    duration: 7,
    summary: '閃燈說新年快樂，孩子揮手鞠躬',
    tip: { kid: '閃燈說新年快樂，孩子揮手鞠躬', ok: '球不用動，今天的煙火是你們' },
    from: FIRE_LINE,
    to: FIRE_LINE,
    lights: (t) => bowLights(t, (i) => FIRE[i % 5]),
    subtitle: () => '新年快樂！謝謝大家！',
    marks: [{ k: 'line', z: LINE_Z }],
    bow: true,
  },
];
