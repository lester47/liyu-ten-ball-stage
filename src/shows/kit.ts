/*
 * 自由走位節目共用的工具。
 *
 * 座標：x 0–10 公尺（左→右），z 0–8 公尺（後→前，觀眾在 z = 8 那一側）。
 * 球 0–4 = L1–L5（左側孩子），5–9 = R1–R5；第 n 號在 z = 7 - 1.5n 那一排。
 * 每套節目都是「標準」路線：整齊、寬間距、中低速，讓孩子看得懂要做什麼；
 * 實際表演做不到也沒關係，所以每段都附上「做不到也沒關係」的提示。
 */

export type Pt = { x: number; z: number };
export type Lights = { colors: string[]; brightness: number[] };

/** 地上膠帶記號。color 為 'team' 時依左右隊上色。 */
export type Mark =
  | { k: 'ring'; rx: number; rz?: number; n?: number; color?: string; cx?: number; cz?: number }
  | { k: 'x'; pts: Pt[]; color?: string }
  | { k: 'line'; z: number; x0?: number; x1?: number; color?: string; width?: number }
  | { k: 'dot'; pts: Pt[]; color?: string; size?: number }
  | { k: 'tick'; pts: Pt[]; color?: string };

export type ShowId = 'koi' | 'garden' | 'train' | 'firework';

export type FreeCard = {
  show: ShowId;
  name: string;
  duration: number;
  summary: string;
  /** 給孩子的提示：這段要做什麼、做不到也沒關係。 */
  tip: { kid: string; ok: string };
  from: Pt[];
  to: Pt[];
  /** 預設動作：延遲 delay 秒後，用 dur 秒從 from 緩動到 to。 */
  move?: [number, number];
  motion?: (t: number) => Pt[];
  /** 選球時顯示的目標（預設為 to）。 */
  target?: (t: number) => Pt[];
  lights: (t: number) => Lights;
  subtitle: (t: number) => string;
  marks: Mark[];
  /** 鯉魚道具出現程度 0–1。 */
  koi?: (t: number) => number;
  /** 謝幕：孩子揮手鞠躬、觀眾歡呼。 */
  bow?: boolean;
  /** 在節目裡的順序（預設照加入順序）；後來插入的段落用小數排進中間。 */
  pos?: number;
};

export const C: Pt = { x: 5, z: 4 };
export const laneZ = (n: number) => 7 - n * 1.5;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
/** 正弦緩動：起步、停下都柔和，最高速只有平均速度的 1.57 倍。 */
export const ease = (t: number) => (1 - Math.cos(Math.PI * clamp01(t))) / 2;
export const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({
  x: a.x + (b.x - a.x) * t,
  z: a.z + (b.z - a.z) * t,
});
export const ids = Array.from({ length: 10 }, (_, i) => i);
export const atD = (i: number, d: number): Pt => ({ x: i < 5 ? d : 10 - d, z: laneZ(i % 5) });
export const lanePts = (d: number[]): Pt[] => d.map((v, i) => atD(i, v));
export const HOME = ids.map((i) => atD(i, 1));
export const TEAM_L = '#2f8fe0';
export const TEAM_R = '#f08a2c';
export const GOLD = '#ffd23c';
export const RAINBOW = [
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

export const angOf = (p: Pt, c: Pt = C) => Math.atan2(p.z - c.z, p.x - c.x);
export const polar = (a: number, r: number, c: Pt = C): Pt => ({
  x: c.x + Math.cos(a) * r,
  z: c.z + Math.sin(a) * r,
});

/** 依繞中心的角度做循環對應，讓大家不交叉地各自找到最近的位置。 */
export function matchByAngle(from: Pt[], targets: Pt[], c: Pt = C): Pt[] {
  const fi = ids.slice().sort((a, b) => angOf(from[a], c) - angOf(from[b], c));
  const ti = ids.slice().sort((a, b) => angOf(targets[a], c) - angOf(targets[b], c));
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

/** 依目前 x 由左到右排進一直線（不交叉）。 */
export function lineUp(from: Pt[], z: number, x0 = 0.6, x1 = 9.4): Pt[] {
  const order = ids.slice().sort((a, b) => from[a].x - from[b].x || from[a].z - from[b].z);
  const out: Pt[] = [];
  order.forEach((i, k) => (out[i] = { x: x0 + (k * (x1 - x0)) / 9, z }));
  return out;
}

export const lights = (f: (i: number, colors: string[], brightness: number[]) => void): Lights => {
  const colors = [...RAINBOW],
    brightness = Array(10).fill(1) as number[];
  ids.forEach((i) => f(i, colors, brightness));
  return { colors, brightness };
};
/** 謝幕閃燈。 */
export const bowLights = (t: number, color?: (i: number) => string) =>
  lights((i, c, b) => {
    if (color) c[i] = color(i);
    b[i] = 0.45 + 0.55 * Math.abs(Math.sin(t * 4 + i * 0.4));
  });
