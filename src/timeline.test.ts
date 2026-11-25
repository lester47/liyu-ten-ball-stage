import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compile, sample, template, energetic } from './timeline.ts';
test('60 秒範本及指定驗收秒點', () => {
  const s = compile(template());
  assert.equal(s.at(-1)?.end, 60);
  assert.equal(s.filter((x) => x.transition).length, 0);
  assert.deepEqual(sample(s, 25).positions, [2, 3.8, 2, 3.8, 2, 2, 3.8, 2, 3.8, 2]);
  assert.equal(sample(s, 43).countdown, '2');
  const p = sample(s, 45.5).positions;
  assert.ok(p[0] < 3.3);
  assert.equal(p[1], 3.3);
});
test('開花移至第一段會自動換位，並保持連續', () => {
  const c = template();
  c.unshift(c.splice(3, 1)[0]);
  const s = compile(c);
  assert.equal(s[0].transition, true);
  assert.equal(s[0].end, 2);
  assert.equal(sample(s, 1).positions[0], 2.4);
  for (let t = 0; t < s.at(-1)!.end; t += 0.05) {
    const a = sample(s, t),
      b = sample(s, t + 0.001);
    a.positions.forEach((p, i) => {
      assert.ok(p >= 1 && p <= 3.8);
      assert.ok(Math.abs(p - b.positions[i]) < 0.02);
    });
  }
});
test('同類獨立時長、縮放、沿用球位與可重現取樣', () => {
  const c = template();
  c[0].duration = 12;
  c.splice(1, 0, { ...c[0], id: 'duplicate', duration: 3 });
  const s = compile(c);
  assert.equal(s.find((x) => x.id === c[0].id)!.end, 12);
  assert.equal(sample(s, 6).positions[0], 1.5);
  assert.deepEqual(sample(s, 20), sample(s, 20));
  assert.deepEqual(compile([]), []);
});

test('節奏秀 60 秒無額外換位，所有球位連續且不越界', () => {
  const s = compile(energetic());
  assert.equal(s.at(-1)!.end, 60);
  assert.equal(s.filter((x) => x.transition).length, 0);
  for (let t = 0; t < 60; t += 0.01) {
    const a = sample(s, t),
      b = sample(s, t + 0.001);
    a.positions.forEach((p, i) => {
      assert.ok(p >= 1 - 1e-9 && p <= 3.8 + 1e-9);
      assert.ok(Math.abs(p - b.positions[i]) < 0.02, `t=${t}, ball=${i}`);
    });
  }
});

test('當前目標停點對應小動作，而非整段結束', () => {
  const s = compile(template());
  assert.equal(sample(s, 23).targets[0], 2);
  assert.equal(sample(s, 27).targets[0], 3.8);
  assert.equal(sample(s, 23).targets[1], 3.8);
});
test('交錯開合字幕與三秒週期動作一致', () => {
  const s = compile([{ id: 'open', type: 10, duration: 8 }]);
  const start = s.find((x) => !x.transition)!.start;
  assert.equal(sample(s, start + 3.5).subtitle, '交錯打開！');
  assert.equal(sample(s, start + 4.5).subtitle, '收回，再一次！');
  assert.equal(sample(s, start + 6).subtitle, '十球合拍！');
});
test('燈光可重現，倒數紅黃綠，終點亮燈延續至謝幕', () => {
  const s = compile(template());
  assert.deepEqual(sample(s, 25).colors, sample(s, 25).colors);
  assert.deepEqual(sample(s, 25).brightness, sample(s, 25).brightness);
  assert.equal(sample(s, 42).colors[0], '#ff304b');
  assert.equal(sample(s, 43).colors[0], '#ffcc19');
  assert.equal(sample(s, 44).colors[0], '#23d77e');
  assert.ok(sample(s, 48).finishLit.every((v) => v === 1));
  assert.ok(sample(s, 59).finishLit.every((v) => v === 1));
  assert.ok(sample(s, 20).finishLit.every((v) => v === 0));
});
test('換位延續前段燈色並調暗', () => {
  const c = template();
  const s = compile([c[6], c[3]]);
  const move = s.filter((x) => x.transition).at(-1)!;
  assert.equal(sample(s, move.start + 1).colors[0], '#ffd34e');
  assert.ok(sample(s, move.start + 1).brightness[0] < 1);
});
