// node --test latte/tests/  — 브라우저 없이 규칙만 확인해요.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, ROWS } from '../levels.js';
import { Run, T } from '../engine.js';
import { SPRITES } from '../sprites.js';
import { searchRun } from './search.mjs';

const carry = () => ({ lives: 3, score: 0, bones: 0, big: false, power: null });
const idle = { left: false, right: false, a: false, b: false, aPressed: false, bPressed: false, barkPressed: false };
function stand(r, x) { const p = r.player; p.x = x; p.y = r.groundBelow(x + 5, 0) - p.h; p.vx = 0; p.vy = 0; r.update(idle); }
function enemy(r, type, x) {
  r.spawnDefs = []; r.enemies = [];
  const h = { bean: 11, can: 12, hedgehog: 9 }[type];
  const e = { type, x, y: r.groundBelow(x + 4, 0) - h, w: type === 'hedgehog' ? 13 : 10, h, vx: 0, vy: 0, dir: -1, t: 0, stun: 0, state: 'walk', dead: false, gone: false };
  r.enemies.push(e); return e;
}

test('모든 스테이지 지도가 16줄이고 너비가 맞아요', () => {
  assert.equal(LEVELS.length, 9);
  for (const L of LEVELS) {
    assert.equal(L.rows.length, ROWS, L.id);
    for (const row of L.rows) assert.equal(row.length, L.w, L.id);
    assert.ok(L.goal || L.boss || L.mode === 'fly', `${L.id} 끝이 있어요`);
    for (const e of L.enemies) assert.ok(e.tx >= 0 && e.tx < L.w && e.ty >= 0 && e.ty < ROWS, `${L.id} ${e.type}`);
    for (const d of L.decor) assert.ok(SPRITES[d.spr], `${L.id} 장식 ${d.spr}`);
  }
});

test('모든 스테이지를 끝까지 갈 수 있어요 (지형 검사)', () => {
  for (const L of LEVELS) {
    const r = searchRun(L);
    assert.ok(['clear', 'ending'].includes(r.result), `${L.id}: ${JSON.stringify(r)}`);
  }
});

test('천장이 있는 스테이지에서도 라떼는 땅 위에서 시작해요', () => {
  for (const L of LEVELS) {
    const r = new Run(L, carry(), {}, { easy: true });
    if (L.mode === 'fly') continue;
    assert.ok(r.player.y > 2 * T, `${L.id} 시작 높이 ${r.player.y}`);
    for (const cp of L.checks) { const again = new Run(L, carry(), {}, { easy: true, checkpoint: cp }); assert.ok(again.player.y > 2 * T, `${L.id} 소화전 ${cp}`); }
  }
});

test('커피콩을 밟으면 납작해지고 점수를 받아요', () => {
  const c = carry(), r = new Run(LEVELS[0], c, {}, { easy: true });
  stand(r, 3 * T);
  const e = enemy(r, 'bean', 4 * T);
  r.player.y = e.y - r.player.h - 6; r.player.x = e.x; r.player.vy = 2;
  for (let i = 0; i < 4; i++) r.update(idle);
  assert.equal(e.state, 'flat');
  assert.ok(c.score >= 100);
  assert.ok(r.player.vy < 0, '밟으면 튀어 올라요');
});

test('깡통은 밟으면 멈추고 건드리면 미끄러져요', () => {
  const c = carry(), r = new Run(LEVELS[0], c, {}, { easy: true });
  stand(r, 3 * T);
  const e = enemy(r, 'can', 6 * T);
  r.stomp(e);
  assert.equal(e.state, 'shell'); assert.equal(e.vx, 0);
  r.kick(e);
  assert.ok(Math.abs(e.vx) === 3);
});

test('멍! 하면 가까운 적이 기절하고, 기절한 고슴도치는 밟을 수 있어요', () => {
  const c = carry(), r = new Run(LEVELS[0], c, {}, { easy: true });
  stand(r, 3 * T);
  const e = enemy(r, 'hedgehog', 6 * T);
  r.update({ ...idle, barkPressed: true });
  assert.ok(e.stun > 0);
  assert.ok(r.player.barkCd > 0, '멍!은 잠깐 쉬었다 다시 써요');
  r.update({ ...idle, barkPressed: true });
  r.player.x = e.x; r.player.y = e.y - r.player.h - 4; r.player.vy = 2;
  for (let i = 0; i < 4; i++) r.update(idle);
  assert.ok(e.dead);
  assert.equal(r.state, 'play');
});

test('고기를 먹으면 커지고, 다치면 작아졌다가 한 번 더 다치면 쓰러져요', () => {
  const c = carry(), r = new Run(LEVELS[0], c, {}, { easy: true });
  stand(r, 3 * T);
  r.grow(); assert.ok(c.big); assert.equal(r.player.h, 20);
  r.player.inv = 0; r.hurt(); assert.ok(!c.big); assert.equal(r.player.h, 13);
  r.player.inv = 0; r.hurt(); assert.equal(r.state, 'dying');
});

test('뼈다귀 100개를 모으면 목숨이 하나 늘어요', () => {
  const c = carry(), r = new Run(LEVELS[0], c, {}, { easy: true });
  c.bones = 99; r.addBone();
  assert.equal(c.bones, 0); assert.equal(c.lives, 4);
});

test('? 블록을 치면 물건이 나오고 빈 블록이 돼요', () => {
  const c = carry(), r = new Run(LEVELS[0], c, {}, { easy: true });
  r.bumpBlock(15, 9);
  assert.equal(r.tile(15, 9), 'U');
  assert.ok(r.things.some(t => t.kind === 'meat'));
});

test('소화전에 닿으면 거기서 다시 시작해요', () => {
  const L = LEVELS[0], c = carry();
  let cp = null;
  const r = new Run(L, c, { dead: d => { cp = d.checkpoint; } }, { easy: true });
  stand(r, (L.checks[0] - 1) * T);
  for (let i = 0; i < 30; i++) r.update({ ...idle, right: true });
  assert.equal(r.checkpoint, L.checks[0]);
  r.die(); for (let i = 0; i < 200; i++) r.update(idle);
  assert.equal(cp, L.checks[0]);
  const again = new Run(L, c, {}, { easy: true, checkpoint: cp });
  assert.ok(Math.abs(again.player.x - cp * T) < T);
});

test('보스 커피는 밟을 때마다 체력이 줄고 마지막에 도망가요', () => {
  const L = LEVELS[2], c = carry();
  let cleared = false;
  const r = new Run(L, c, { say: (l, done) => done(), clear: () => { cleared = true; } }, { easy: true });
  r.player.x = (L.boss.arena + 3) * T; r.player.y = r.groundBelow(r.player.x, 0) - r.player.h;
  r.update(idle); r.update(idle);
  assert.ok(r.boss, '보스 방에 들어가면 커피가 나와요');
  const hp = r.boss.hp;
  r.hitBoss(r.boss, 1); assert.equal(r.boss.hp, hp - 1);
  while (r.boss.hp > 0) r.hitBoss(r.boss, 1);
  for (let i = 0; i < 400 && !cleared; i++) r.update(idle);
  assert.ok(cleared);
});
