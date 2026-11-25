import Sortable from 'sortablejs';
import { compile, sample, template, energetic, names, durations, summaries } from './timeline';
import { show, total, saveCards } from './state';
import { teamColor, rainbow } from './stage/palette';

export const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;

export const VIEW_NAMES = ['觀眾席', '正上方', '左側', '右側', '視角重設', '家長視角'];
const VIEW_ICONS = ['🎟️', '🛰️', '⬅️', '➡️', '🔄', '👨‍👩‍👧'];

const ballName = (i: number) => `${i < 5 ? 'L' : 'R'}${(i % 5) + 1}`;

const involved = (i: number) =>
  i === 0 ? 'L1 · R1' : i === 1 ? 'L2–L5 · R2–R5' : i === 3 ? '單數移動 · 雙數定格' : 'L1–L5 · R1–R5';

/** 建立整頁版面。 */
export function mountMarkup() {
  const dots = rainbow.map((c) => `<i style="background:${c}"></i>`).join('');
  document.querySelector('#app')!.innerHTML = `
<header class="top">
  <div class="brand">
    <span class="logo" aria-hidden="true">鯉</span>
    <div><h1>鯉魚十球秀 <span>3D 排練舞台</span></h1><p class="tagline">十顆發光球，一起完成精彩的演出。</p></div>
  </div>
  <span class="tag-chip"><span class="dots">${dots}</span>虛擬排練 · 無需連接機器人</span>
</header>
<main>
  <section class="stage-panel">
    <div id="viewport">
      <div class="caption" aria-live="polite">
        <span id="phase" class="phase-pill">準備上場</span>
        <h2 id="subtitle"></h2>
        <strong id="countdown"></strong>
      </div>
      <div class="teams"><b class="team-l"><i></i>藍隊 L</b><b class="team-r"><i></i>橘隊 R</b></div>
      <div id="selection" class="hint-pill">點選一顆球，查看走位</div>
      <div class="views" aria-label="相機視角">${VIEW_NAMES.map(
        (x, i) =>
          `<button class="tbtn" data-view="${i}"><span aria-hidden="true">${VIEW_ICONS[i]}</span>${x}</button>`,
      ).join(
        '',
      )}<button id="glow" class="tbtn" title="自動模式在小螢幕及低核心裝置關閉後製光暈"><span aria-hidden="true">✨</span>光暈：自動</button></div>
    </div>
    <section class="transport">
      <div class="play-row">
        <button id="restart" class="btn">▶ 從頭表演</button>
        <button id="play" class="btn ghost">播放</button>
        <span id="clock"></span>
        <label>速度 <select id="speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option></select></label>
      </div>
      <input id="scrub" type="range" min="0" max="60" step="0.01" value="0" aria-label="播放進度">
      <div id="timeline"></div>
      <div class="timeline-labels"><span>0 秒</span><span id="end-label">60 秒</span></div>
    </section>
  </section>
  <aside>
    <div class="panel">
      <details class="library-section" open>
        <summary>
          <span class="section-title"><span class="no">庫</span>節目庫 <small>13 種小單元</small></span>
          <span class="hint">拖曳或點「加入」</span>
        </summary>
        <div id="library">${names
          .map(
            (name, i) => `<article class="library-card" data-type="${i}" style="--c:${rainbow[i % 10]}">
          <div><h3>${name}<span>${durations[i]} 秒</span></h3><p>${summaries[i]}</p><small>${involved(i)}</small></div>
          <button class="add" data-add="${i}" aria-label="加入${name}">＋ 加入</button></article>`,
          )
          .join('')}</div>
      </details>
    </div>
    <div class="panel playlist-panel">
      <div class="section-head playlist-head">
        <span class="section-title"><span class="no show">單</span>我的節目單</span>
        <div class="template-buttons"><button id="energetic" class="btn small">節奏秀 60 秒</button><button id="reset" class="btn ghost small">原版 60 秒</button></div>
      </div>
      <div class="summary"><strong id="total"></strong><span id="difference"></span></div>
      <div id="playlist"></div>
      <p id="save-status" role="status">${show.storageWarning || '編輯後自動儲存在此瀏覽器'}</p>
    </div>
  </aside>
</main>`;
}

/** 任何編排動作後：暫停、重算、回到 0 秒並儲存。 */
export function edit() {
  show.playing = false;
  show.previewEnd = null;
  show.time = 0;
  show.segments = compile(show.cards);
  $('#save-status').textContent = saveCards(show.cards)
    ? '已儲存 · 可隨時繼續編排'
    : '無法儲存，重新整理會遺失此次編排';
  renderList();
}

export function renderList() {
  const { cards, segments } = show;
  $('#total').textContent = `${Number(total().toFixed(1))} 秒`;
  const delta = total() - 60;
  $('#difference').textContent =
    delta === 0
      ? '剛好 60 秒'
      : `${delta > 0 ? '超出' : '少於'} 60 秒範本 ${Math.abs(delta).toFixed(1).replace('.0', '')} 秒`;
  $('#playlist').innerHTML = cards.length
    ? cards
        .map((c, i) => {
          const s = segments.find((s) => s.id === c.id)!;
          const m = segments.find((s) => s.cardId === c.id && s.transition);
          return `<article class="show-card" data-id="${c.id}" style="--c:${rainbow[c.type % 10]}">${
            m
              ? `<div class="move-note">換位 ${m.start.toFixed(1)}–${m.end.toFixed(1)} 秒 · 自動 2 秒</div>`
              : ''
          }<div class="card-title"><button class="handle" aria-label="拖曳排序${names[c.type]}">⠿</button><span class="order">${String(
            i + 1,
          ).padStart(
            2,
            '0',
          )}</span><h3>${names[c.type]}</h3><button class="mini danger" data-action="delete" aria-label="刪除${
            names[c.type]
          }">刪除</button></div><div class="card-settings"><span>${s.start.toFixed(1)}–${s.end.toFixed(
            1,
          )} 秒</span><label>時長 <input type="number" min="${c.type === 5 ? 5 : 1}" max="300" step="0.5" value="${
            c.duration
          }" aria-label="${names[c.type]}時長"> 秒</label></div><div class="card-actions"><button class="mini" data-action="up" ${
            i === 0 ? 'disabled' : ''
          }>上移</button><button class="mini" data-action="down" ${
            i === cards.length - 1 ? 'disabled' : ''
          }>下移</button><button class="mini accent" data-action="preview">預覽本段</button></div></article>`;
        })
        .join('')
    : '<div class="empty">節目單還是空白的<br>從上方加入一個小單元開始吧。</div>';
  $('#timeline').innerHTML = segments
    .map(
      (s) =>
        `<button title="${s.transition ? '換位' : names[s.type]} ${s.start}–${s.end} 秒" data-time="${
          s.start
        }" style="flex:${s.end - s.start};--c:${s.transition ? '#e7a86a' : rainbow[s.type % 10]}" class="${
          s.transition ? 'transition' : ''
        }"></button>`,
    )
    .join('');
  $('#scrub').setAttribute('max', String(total()));
  $('#end-label').textContent = `${total()} 秒`;
  ['#restart', '#play', '#scrub'].forEach((s) => (($(s) as HTMLButtonElement).disabled = !cards.length));
}

/** 綁定右側操作盤與播放列的事件。 */
export function bindControls() {
  $('#library').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-add]');
    if (!b) return;
    const type = Number(b.dataset.add);
    show.cards.push({ id: crypto.randomUUID(), type, duration: durations[type] });
    edit();
  });
  $('#playlist').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    const card = b?.closest<HTMLElement>('[data-id]');
    if (!b || !card) return;
    const cards = show.cards;
    const i = cards.findIndex((c) => c.id === card.dataset.id);
    const action = b.dataset.action;
    if (action === 'preview') {
      const ss = show.segments.filter((s) => s.cardId === cards[i].id);
      show.time = ss[0].start;
      show.previewEnd = ss.at(-1)!.end;
      show.playing = true;
      return;
    }
    if (action === 'delete') cards.splice(i, 1);
    if (action === 'up' && i > 0) [cards[i - 1], cards[i]] = [cards[i], cards[i - 1]];
    if (action === 'down' && i < cards.length - 1) [cards[i + 1], cards[i]] = [cards[i], cards[i + 1]];
    edit();
  });
  $('#playlist').addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    if (input.tagName !== 'INPUT') return;
    const c = show.cards.find((c) => c.id === input.closest<HTMLElement>('[data-id]')!.dataset.id)!;
    c.duration = Math.max(c.type === 5 ? 5 : 1, Math.min(300, Number(input.value) || durations[c.type]));
    edit();
  });
  new Sortable($('#library'), {
    group: { name: 'program', pull: 'clone', put: false },
    sort: false,
    animation: 150,
    delay: 180,
    delayOnTouchOnly: true,
    filter: 'button',
    onStart: () => (show.playing = false),
  });
  new Sortable($('#playlist'), {
    group: { name: 'program', pull: false, put: true },
    handle: '.handle',
    animation: 150,
    onStart: () => (show.playing = false),
    onAdd: (event) => {
      const type = Number(event.item.dataset.type);
      event.item.remove();
      show.cards.splice(event.newIndex ?? show.cards.length, 0, {
        id: crypto.randomUUID(),
        type,
        duration: durations[type],
      });
      edit();
    },
    onEnd: (event) => {
      if (event.oldIndex !== undefined && event.newIndex !== undefined && event.oldIndex !== event.newIndex) {
        show.cards.splice(event.newIndex, 0, show.cards.splice(event.oldIndex, 1)[0]);
        edit();
      }
    },
  });
  $('#energetic').onclick = () => {
    show.cards = energetic();
    edit();
  };
  $('#reset').onclick = () => {
    show.cards = template();
    edit();
  };
  $('#restart').onclick = () => {
    show.time = 0;
    show.previewEnd = null;
    show.playing = true;
  };
  $('#play').onclick = () => {
    if (show.time >= total()) show.time = 0;
    show.previewEnd = null;
    show.playing = !show.playing;
  };
  $('#scrub').oninput = (e) => {
    show.playing = false;
    show.previewEnd = null;
    show.time = Number((e.target as HTMLInputElement).value);
  };
  $('#speed').onchange = (e) => (show.speed = Number((e.target as HTMLSelectElement).value));
  $('#timeline').onclick = (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-time]');
    if (!b) return;
    show.playing = false;
    show.previewEnd = null;
    show.time = Number(b.dataset.time);
  };
}

type Sample = ReturnType<typeof sample>;

let lastCaption = '';
/** 每格更新字幕、倒數、時鐘與選球說明。 */
export function updateHud(state: Sample) {
  const ready = show.time === 0 && !show.playing;
  const subtitle = ready ? '選好節目，準備一起出發！' : state.subtitle;
  const sub = $('#subtitle');
  if (sub.textContent !== subtitle) {
    sub.textContent = subtitle;
    // 字幕換句時彈跳一下，讓觀眾注意到口令
    if (lastCaption) {
      sub.classList.remove('pop');
      void sub.offsetWidth;
      sub.classList.add('pop');
    }
    lastCaption = subtitle;
  }
  const cd = $('#countdown');
  if (cd.textContent !== state.countdown) {
    cd.textContent = state.countdown;
    cd.dataset.n = state.countdown;
  }
  $('#phase').textContent = ready
    ? '準備上場'
    : state.segment
      ? `${state.segment.transition ? '換位準備' : '正在排練'} · ${names[state.segment.type]}`
      : '準備上場';
  $('#play').textContent = show.playing ? '❚❚ 暫停' : '▶ 播放';
  $('#clock').textContent = `${show.time.toFixed(1)} / ${total().toFixed(1)} 秒`;
  $<HTMLInputElement>('#scrub').value = String(show.time);
  document
    .querySelectorAll<HTMLElement>('.show-card')
    .forEach((c) => c.classList.toggle('active', c.dataset.id === state.segment?.cardId));
  const sel = $('#selection');
  if (show.selected >= 0) {
    const i = show.selected,
      s = state.segment;
    const moving = s
      ? Array.from({ length: 10 }, (_, j) => j).filter((j) => Math.abs(s.from[j] - s.to[j]) > 0.001)
      : [];
    let order = '本段維持停位';
    if (s?.type === 2) order = i < 5 ? '左隊先行' : '右隊跟上';
    else if (s?.type === 6) order = (i % 5) % 2 === 0 ? '第一波出發' : '第二波出發';
    else if (s?.type === 3) order = (i % 5) % 2 === 0 ? '單數移動' : '雙數定格';
    else if (moving.includes(i)) order = s?.type === 1 ? `第 ${i % 5} 批接力` : '同步出發';
    sel.innerHTML = `<span class="no" style="background:${teamColor(i)}">${ballName(i)}</span>${order} · 位置 ${state.positions[
      i
    ].toFixed(2)} m · 停點 ${state.targets[i].toFixed(1)} m`;
    sel.classList.add('on');
  } else if (sel.classList.contains('on') || !sel.textContent) {
    sel.textContent = '點選一顆球查看走位 · 拖曳旋轉 · 滾輪縮放 · 右鍵平移';
    sel.classList.remove('on');
  }
}
