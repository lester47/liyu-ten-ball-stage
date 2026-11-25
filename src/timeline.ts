export const names = [
  '慢速亮相',
  '依序接力',
  '左右對拍',
  '十球開花',
  '快走急停',
  '觀眾倒數',
  '雙波衝線',
  '定格謝幕',
  '波浪點燈',
  '左右問答',
  '交錯開合',
  '假動作急停',
  '節拍蓄力',
];
export const durations = [6, 8, 8, 8, 8, 7, 8, 7, 8, 8, 8, 6, 8];
export const summaries = [
  '第一對緩緩前進，點亮舞台',
  '2 至 5 號依序成對出發',
  '左隊先走，右隊跟上，兩次對拍',
  '單數向外、定格，再收回來',
  '十球退至急停點，整齊停住',
  '保持隊形，迎接 3、2、1',
  '單數先衝，雙數接力到站',
  '揮手、鞠躬，向觀眾致謝',
  '五對球依序推進，再反向掀起波浪',
  '左問右答，兩輪加速逼近內點',
  '單雙交錯開合，最後一起收攏',
  '先快退、突然收回，再整齊急停',
  '短促脈衝三連拍，蓄力等待衝線',
];
export type Card = { id: string; type: number; duration: number };
export type Segment = {
  id: string;
  cardId: string;
  type: number;
  start: number;
  end: number;
  from: number[];
  to: number[];
  transition: boolean;
};
export const template = (): Card[] =>
  durations.slice(0, 8).map((duration, type) => ({ id: crypto.randomUUID(), type, duration }));
export const energetic = (): Card[] =>
  [8, 9, 10, 11, 12, 5, 6, 7].map((type) => ({ id: crypto.randomUUID(), type, duration: durations[type] }));
const all = (d: number) => Array(10).fill(d) as number[];
const initial = (type: number): number[] | null =>
  type === 8
    ? all(1)
    : type === 9
      ? all(2)
      : type === 10 || type === 11
        ? all(3.8)
        : type === 12
          ? all(3.3)
          : type === 0
            ? all(1)
            : type === 1
              ? all(1).map((v, i) => (i % 5 === 0 ? 2 : v))
              : type === 2
                ? all(2)
                : type === 3 || type === 4
                  ? all(3.8)
                  : type === 6
                    ? all(3.3)
                    : null;
const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));
export function motion(type: number, t: number, from: number[]): number[] {
  return from.map((d, i) => {
    const n = i % 5;
    const left = i < 5;
    if (type === 8) {
      const start = n * 0.35;
      return t < 4
        ? lerp(d, 2, (t - start) / 0.8)
        : t < 6
          ? lerp(2, 2.9, (t - 4 - (4 - n) * 0.2) / 0.55)
          : lerp(2.9, 2, (t - 6 - n * 0.15) / 0.6);
    }
    if (type === 9) {
      const offset = left ? 0 : 1;
      return t < 4 ? lerp(d, 2.9, (t - offset) / 0.65) : lerp(2.9, 3.8, (t - 4 - offset * 0.5) / 0.45);
    }
    if (type === 10) {
      if (t >= 6) return 3.8;
      const phase = t % 3,
        delay = n % 2 === 0 ? 0 : 0.4;
      if (phase < 1.3) return lerp(3.8, 2, (phase - delay) / 0.6);
      return lerp(2, 3.8, (phase - 1.3 - delay) / 0.6);
    }
    if (type === 11) {
      if (t < 0.7) return lerp(d, 2.5, t / 0.7);
      if (t < 1.1) return 2.5;
      if (t < 1.8) return lerp(2.5, 3.8, (t - 1.1) / 0.7);
      if (t < 3) return 3.8;
      return lerp(3.8, 3.3, (t - 3) / 0.5);
    }
    if (type === 12) {
      if (t >= 6) return 3.3;
      const beat = t % 2;
      const offset = left ? 0 : 0.25;
      return beat < offset
        ? 3.3
        : beat < offset + 0.45
          ? lerp(3.3, 2.8, (beat - offset) / 0.45)
          : lerp(2.8, 3.3, (beat - offset - 0.45) / 0.45);
    }
    if (type === 0 && n === 0) return lerp(d, 2, (t - 1) / 4);
    if (type === 1 && n > 0) return lerp(d, 2, (t - (n - 1) * 2) / 2);
    if (type === 2) {
      const first = left ? 0 : 2,
        second = left ? 4 : 6;
      return t < second ? lerp(d, 2.9, (t - first) / 1.5) : lerp(2.9, 3.8, (t - second) / 1.5);
    }
    if (type === 3 && n % 2 === 0) return t < 4 ? lerp(d, 2, t / 2) : lerp(2, 3.8, (t - 4) / 2);
    if (type === 4) return lerp(d, 3.3, t);
    if (type === 6) return lerp(d, 1, (t - (n % 2 === 0 ? 0 : 1)) / 1.5);
    return d;
  });
}
export function compile(cards: Card[]): Segment[] {
  let state = all(1),
    time = 0;
  const segments: Segment[] = [];
  for (const card of cards) {
    const required = initial(card.type);
    if (required && required.some((d, i) => Math.abs(d - state[i]) > 0.00001)) {
      segments.push({
        id: `move-${card.id}`,
        cardId: card.id,
        type: card.type,
        start: time,
        end: time + 2,
        from: [...state],
        to: [...required],
        transition: true,
      });
      time += 2;
      state = required;
    }
    const to = motion(card.type, durations[card.type], state);
    segments.push({
      id: card.id,
      cardId: card.id,
      type: card.type,
      start: time,
      end: time + card.duration,
      from: [...state],
      to,
      transition: false,
    });
    state = to;
    time += card.duration;
  }
  return segments;
}
export const rainbow = [
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
// Small-action targets use the same normalized local time as motion().
export function targets(type: number, t: number, from: number[]): number[] {
  return from.map((d, i) => {
    const n = i % 5,
      left = i < 5;
    if (type === 0) return n === 0 ? 2 : d;
    if (type === 1) return n > 0 ? 2 : d;
    if (type === 2) return t < (left ? 4 : 6) ? 2.9 : 3.8;
    if (type === 3) return n % 2 === 0 ? (t < 4 ? 2 : 3.8) : d;
    if (type === 4) return 3.3;
    if (type === 6) return 1;
    if (type === 8) return t < 4 ? 2 : t < 6 ? 2.9 : 2;
    if (type === 9) return t < 4 ? 2.9 : 3.8;
    if (type === 10) return t >= 6 ? 3.8 : t % 3 < 1.3 ? 2 : 3.8;
    if (type === 11) return t < 1.1 ? 2.5 : t < 3 ? 3.8 : 3.3;
    if (type === 12) return t >= 6 ? 3.3 : t % 2 < (left ? 0 : 0.25) + 0.45 ? 2.8 : 3.3;
    return d;
  });
}
function lighting(type: number, t: number, positions: number[]) {
  const colors = [...rainbow],
    brightness = all(1);
  for (let i = 0; i < 10; i++) {
    const n = i % 5,
      left = i < 5;
    if (type === 0 || type === 8) brightness[i] = Math.max(0, Math.min(1, (t - n * 0.15) / 0.3));
    if (type === 1 && n > 0 && t >= (n - 1) * 2 && t < (n - 1) * 2 + 0.25) colors[i] = '#ffffff';
    if (type === 2 || type === 9) {
      const leftOn = type === 2 ? t < 2 || (t >= 4 && t < 6) : t < 1 || (t >= 4 && t < 4.5);
      brightness[i] = left === leftOn ? 1 : 0.18;
    }
    if ((type === 3 || type === 10) && n % 2 === 0) colors[i] = '#fff1fc';
    if (type === 4 && t >= 1 && t < 1.35) colors[i] = '#ff263c';
    if (type === 5 && t >= 4 && t < 7) colors[i] = ['#ff304b', '#ffcc19', '#23d77e'][Math.floor(t - 4)];
    if (type === 6) {
      colors[i] = positions[i] <= 1.001 ? '#ffd34e' : rainbow[i];
      brightness[i] = 1.3;
    }
    if (type === 7) colors[i] = rainbow[(i + Math.floor(t * 2)) % 10];
  }
  return { colors, brightness };
}
export function sample(segments: Segment[], time: number) {
  const segment =
    segments.find((s) => time >= s.start && time < s.end) ?? (time >= 0 ? segments.at(-1) : undefined);
  if (!segment)
    return {
      positions: all(1),
      subtitle: '準備好，讓十顆球一起上場',
      countdown: '',
      segment: undefined,
      local: 0,
      targets: all(1),
      colors: [...rainbow],
      brightness: all(0.35),
      finishLit: all(0),
    };
  const progress = Math.max(0, Math.min(1, (time - segment.start) / (segment.end - segment.start)));
  const t = progress * durations[segment.type];
  const positions = segment.transition
    ? segment.from.map((d, i) => lerp(d, segment.to[i], progress))
    : motion(segment.type, t, segment.from);
  let subtitle = names[segment.type],
    countdown = '';
  if (segment.transition) subtitle = `換位準備 · ${names[segment.type]}`;
  else if (segment.type === 0) subtitle = '第一對出發！';
  else if (segment.type === 1) subtitle = `第 ${Math.min(5, Math.floor(t / 2) + 2)} 對出發！`;
  else if (segment.type === 2) subtitle = t < 2 || (t >= 4 && t < 6) ? '左！' : '右！';
  else if (segment.type === 3) subtitle = t < 2 ? '單數向外！' : t < 4 ? '定格！' : '收回來！';
  else if (segment.type === 4) subtitle = t < 1 ? '快走！' : '停！';
  else if (segment.type === 5) {
    subtitle = '觀眾一起倒數！';
    countdown = t >= 4 && t < 7 ? String(3 - Math.floor(t - 4)) : '';
  } else if (segment.type === 6) subtitle = t < 1 ? '衝！' : t < 2.5 ? '第二波跟上！' : '十球到站！';
  else if (segment.type === 8)
    subtitle = t < 4 ? '一對接一對，波浪出發！' : t < 6 ? '反向接力！' : '一起收回！';
  else if (segment.type === 9)
    subtitle = t < 4 ? (t < 1 ? '左隊出題！' : '右隊回答！') : t < 4.5 ? '加速，左！' : '加速，右！';
  else if (segment.type === 10)
    subtitle = t >= 6 ? '十球合拍！' : t % 3 < 1.3 ? '交錯打開！' : '收回，再一次！';
  else if (segment.type === 11)
    subtitle = t < 1.1 ? '退！' : t < 1.8 ? '收！' : t < 3 ? '別急，等一下……' : '快走，停！';
  else if (segment.type === 12)
    subtitle = t < 6 ? ['第一拍！', '第二拍！', '第三拍！'][Math.floor(t / 2)] : '準備，全場一起倒數！';
  else if (segment.type === 7) subtitle = '掌聲送給鯉魚機器人隊！';
  const goal = segment.transition ? segment.to : targets(segment.type, t, segment.from);
  let lights = lighting(segment.type, t, positions);
  if (segment.transition) {
    const previous = segments[segments.indexOf(segment) - 1];
    lights = previous
      ? lighting(previous.type, durations[previous.type], previous.to)
      : { colors: [...rainbow], brightness: all(0.5) };
    lights.brightness = lights.brightness.map((v) => v * 0.55);
  }
  const index = segments.indexOf(segment);
  let finishLit = all(0);
  if (!segment.transition && segment.type === 6) finishLit = positions.map((d) => (d <= 1.001 ? 1 : 0));
  if (!segment.transition && segment.type === 7) {
    let prev = index - 1;
    while (prev >= 0 && !segments[prev].transition && segments[prev].type === 7) prev--;
    if (prev >= 0 && !segments[prev].transition && segments[prev].type === 6) finishLit = all(1);
  }
  return { positions, subtitle, countdown, segment, local: t, targets: goal, ...lights, finishLit };
}
