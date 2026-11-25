import { compile, template, names, type Card, type Segment } from './timeline';

const STORAGE_KEY = 'liyu-show-v2';

/** 從 localStorage 讀回節目單；格式不符時回傳 null。 */
function loadCards(): { cards: Card[] | null; warning: string } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { cards: null, warning: '' };
    const parsed = JSON.parse(saved);
    const valid =
      Array.isArray(parsed) &&
      parsed.every(
        (c) =>
          typeof c.id === 'string' &&
          Number.isInteger(c.type) &&
          c.type >= 0 &&
          c.type < names.length &&
          Number.isFinite(c.duration) &&
          c.duration >= (c.type === 5 ? 5 : 1) &&
          c.duration <= 300,
      ) &&
      new Set(parsed.map((c) => c.id)).size === parsed.length;
    return { cards: valid ? parsed : null, warning: '' };
  } catch {
    return { cards: null, warning: '瀏覽器無法讀取儲存資料，本次仍可編排。' };
  }
}

/** 儲存節目單，回傳是否成功。 */
export function saveCards(cards: Card[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    return true;
  } catch {
    return false;
  }
}

const loaded = loadCards();

/** 全頁共用的播放與編排狀態。 */
export const show = {
  cards: loaded.cards ?? template(),
  segments: [] as Segment[],
  time: 0,
  playing: false,
  speed: 1,
  previewEnd: null as number | null,
  selected: -1,
  storageWarning: loaded.warning,
};
show.segments = compile(show.cards);

export const total = () => show.segments.at(-1)?.end ?? 0;
