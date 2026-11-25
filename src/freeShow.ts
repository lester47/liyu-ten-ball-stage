/*
 * 自由走位節目的總表：每張卡片的編號 = FREE_FIRST + 在 FREE_CARDS 的位置。
 * 鯉魚秀的 9 張卡維持 13–21，舊的存檔照樣能讀。
 */
import { ease, lanePts, lerpPt, type FreeCard, type Mark, type Pt, type ShowId } from './shows/kit';
import { koiCards, koiExtraCards } from './shows/koi';
import { fireworkCards, gardenCards, trainCards } from './shows/more';

export type { FreeCard, Mark, Pt, ShowId };
export { lanePts, lerpPt };

export const FREE_FIRST = 13;
// 新卡片一律接在最後，舊存檔裡的卡片編號才不會錯位
export const FREE_CARDS: FreeCard[] = [
  ...koiCards,
  ...gardenCards,
  ...trainCards,
  ...fireworkCards,
  ...koiExtraCards,
];
export const FREE_TYPES = FREE_CARDS.map((_, k) => FREE_FIRST + k);
export const isFree = (type: number) => type >= FREE_FIRST;
export const freeCard = (type: number) => FREE_CARDS[type - FREE_FIRST];

export const freeNames = FREE_CARDS.map((c) => c.name);
export const freeDurations = FREE_CARDS.map((c) => c.duration);
export const freeSummaries = FREE_CARDS.map((c) => c.summary);
export const freeTips = FREE_CARDS.map((c) => c.tip);

export const freeStart = (type: number) => freeCard(type).from;
export const freeEnd = (type: number) => freeCard(type).to;

/** 段內時間 t（以預設秒數計）時的標準位置。 */
export function freeMotion(type: number, t: number): Pt[] {
  const c = freeCard(type);
  if (c.motion) return c.motion(t);
  if (!c.move) return c.to;
  const [delay, dur] = c.move;
  const f = ease((t - delay) / dur);
  return c.from.map((p, i) => lerpPt(p, c.to[i], f));
}
/** 選取一顆球時顯示的「這段要去的地方」。 */
export const freeTarget = (type: number, t: number): Pt[] => freeCard(type).target?.(t) ?? freeEnd(type);
export const freeLights = (type: number, t: number) => freeCard(type).lights(t);
export const freeSubtitle = (type: number, t: number) => freeCard(type).subtitle(t);
/** 鯉魚道具出現程度 0–1。 */
export const koiProp = (type: number, t: number) => (isFree(type) ? (freeCard(type).koi?.(t) ?? 0) : 0);
export const isBow = (type: number) => isFree(type) && !!freeCard(type).bow;

/** 各套節目：名稱、按鈕文字與一句介紹。 */
export const SHOWS: { id: ShowId; label: string; title: string; blurb: string }[] = [
  { id: 'koi', label: '🐟 鯉魚秀', title: '鯉魚十球秀', blurb: '前進後退、拉鍊、圍圈、排出一條大鯉魚' },
  { id: 'garden', label: '🌈 彩虹花園', title: '彩虹花園', blurb: '種子發芽、排成大花、花開花合，移動最少' },
  { id: 'train', label: '🚂 小火車', title: '小火車開動', blurb: '跟著前一顆繞一圈，再分兩列交會、進站' },
  {
    id: 'firework',
    label: '🎆 煙火會',
    title: '新年煙火會',
    blurb: '倒數後往外衝，一次比一次大，越亂越像煙火',
  },
];
export const showOf = (type: number) => (isFree(type) ? freeCard(type).show : undefined);

/** 某套節目的卡片清單（預設秒數）。 */
export const showCards = (id: ShowId) =>
  FREE_TYPES.filter((type) => freeCard(type).show === id)
    .map((type, k) => ({ type, key: freeCard(type).pos ?? k }))
    .sort((a, b) => a.key - b.key)
    .map(({ type }) => ({ id: crypto.randomUUID(), type, duration: freeCard(type).duration }));
export const standardShow = () => showCards('koi');
