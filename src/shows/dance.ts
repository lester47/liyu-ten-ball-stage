/*
 * 伴舞學生的舞步：每一段配一種動作，跟著節目的節奏與高潮變化。
 * key 為「節目:段落名稱」；值可以是固定舞步，或依段內秒數 t 變化。
 */
import type { ShowId } from './kit';

export type DanceMove =
  | 'idle' // 準備：輕輕左右搖
  | 'clap' // 踏步拍手
  | 'swim' // 雙手在胸前像魚鰭擺動
  | 'hello' // 單手揮手打招呼
  | 'wave' // 舉手波浪，沿著隊伍傳下去
  | 'bubble' // 雙手輪流往上戳，像冒泡泡
  | 'point' // 一起往舞台中間比
  | 'open' // 雙手大大打開
  | 'cheer' // 跳起來舉手歡呼
  | 'breathe' // 雙手慢慢舉起、放下
  | 'train' // 手臂像火車輪子轉
  | 'count' // 倒數：舉手比數字，一拍一下
  | 'bloom' // 從蹲下慢慢站起、雙手像花開
  | 'bow'; // 揮手後鞠躬

type Dance = DanceMove | ((t: number) => DanceMove);

const DANCES: Record<string, Dance> = {
  // 🐟 鯉魚秀
  'koi:燈亮出發': (t) => (t < 1.2 ? 'idle' : 'clap'),
  'koi:游到鯉魚身邊': 'swim',
  'koi:跟鯉魚打招呼': (t) => (t > 1.8 && t < 3.1 ? 'hello' : 'swim'),
  'koi:繞著鯉魚游': 'wave',
  'koi:鯉魚吐泡泡': 'bubble',
  'koi:到中間集合': (t) =>
    t < 1.9 || (t > 4.6 && t < 6.3) ? 'point' : t < 2.6 || (t > 6.3 && t < 7) ? 'cheer' : 'open',
  'koi:貼著鯉魚排魚形': (t) => (t > 6 ? 'cheer' : 'swim'),
  'koi:跟鯉魚一起呼吸': 'breathe',
  'koi:到前面排一直線': 'clap',
  'koi:謝幕': 'bow',
  // 🌈 彩虹花園
  'garden:撒種子': 'swim',
  'garden:發芽': 'bloom',
  'garden:往中間長': 'breathe',
  'garden:排成大花': (t) => (t > 6.5 ? 'cheer' : 'point'),
  'garden:花瓣變色': 'wave',
  'garden:花開花合': (t) => (t < 4 ? 'open' : 'point'),
  'garden:到前面排一排': 'clap',
  'garden:謝幕': 'bow',
  // 🚂 小火車開動
  'train:排隊上車': 'clap',
  'train:鳴笛出發': (t) => (t < 2 ? 'cheer' : 'train'),
  'train:繞舞台一圈': 'train',
  'train:分成兩列': 'clap',
  'train:兩列火車交會': (t) => (t < 4.5 ? 'train' : 'hello'),
  'train:進站停好': (t) => (t > 6.5 ? 'cheer' : 'train'),
  'train:謝幕': 'bow',
  // 🎆 新年煙火會
  'firework:到中間集合': 'point',
  'firework:倒數 3、2、1': (t) => (t < 4 ? 'count' : 'cheer'),
  'firework:小煙火': (t) => (t < 4.5 ? 'cheer' : 'point'),
  'firework:中煙火': (t) => (t < 2.2 ? 'cheer' : t < 5.5 ? 'wave' : 'point'),
  'firework:大煙火': (t) => (t < 2.8 ? 'cheer' : 'wave'),
  'firework:煙火散落': 'bubble',
  'firework:到前面排一排': 'clap',
  'firework:謝幕': 'bow',
};

export function danceFor(show: ShowId, name: string, t: number): DanceMove {
  const d = DANCES[`${show}:${name}`];
  if (!d) return 'clap';
  return typeof d === 'function' ? d(t) : d;
}

/** 這段有沒有專屬舞步（測試用）。 */
export const hasDance = (show: ShowId, name: string) => `${show}:${name}` in DANCES;
