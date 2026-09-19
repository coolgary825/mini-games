// node --test latte/tests/  — 브라우저 없이 규칙만 확인해요.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, ROWS } from '../levels.js';
import { Run, T } from '../engine.js';
import { SPRITES } from '../sprites.js';
import { searchRun } from './search.mjs';
import { goldRun } from './goldsearch.mjs';

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
  assert.equal(LEVELS.length, 15);
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

test('황금 뼈다귀는 스테이지마다 3개이고 모두 모을 수 있어요', () => {
  for (const L of LEVELS) {
    assert.equal(L.golds.length, 3, L.id);
    L.golds.forEach((g, i) => { const r = goldRun(L, i); assert.ok(r.ok, `${L.id} #${i} ${JSON.stringify(g)} ${JSON.stringify(r)}`); });
  }
});

test('황금 뼈다귀를 먹으면 표시가 켜지고 알림이 가요', () => {
  const L = LEVELS[0], c = carry(); let got = null;
  const r = new Run(L, c, { gold: i => { got = i; } }, { easy: true });
  const g = L.golds[0];
  r.player.x = g.tx * T - 1; r.player.y = g.ty * T - 2; r.player.vy = 0;
  r.collectTiles(r.player);
  assert.equal(got, 0); assert.equal(r.gold & 1, 1); assert.equal(r.tile(g.tx, g.ty), '.');
});

test('커피의 냥냥 대시는 고슴도치도 물리치고, 대시 중에는 다치지 않아요', () => {
  const c = { ...carry(), char: 'coffee' }, r = new Run(LEVELS[0], c, {}, { easy: true });
  stand(r, 3 * T);
  const e = enemy(r, 'hedgehog', 5 * T);
  r.update({ ...idle, barkPressed: true });
  assert.ok(r.player.dashT > 0);
  for (let i = 0; i < 12; i++) r.update(idle);
  assert.ok(e.dead); assert.equal(r.state, 'play');
});

test('커피는 공중에서 한 번 더 뛰어요(이단 점프), 라떼는 날개가 있어야 해요', () => {
  for (const [char, power, expect] of [['coffee', null, true], ['latte', null, false], ['latte', 'wing', true]]) {
    const c = { ...carry(), char, power, big: !!power }, r = new Run(LEVELS[0], c, {}, { easy: true });
    stand(r, 3 * T);
    r.update({ ...idle, a: true, aPressed: true });
    for (let i = 0; i < 12; i++) r.update({ ...idle, a: true });
    const vyBefore = r.player.vy;
    r.update({ ...idle, a: true, aPressed: true });
    assert.equal(r.player.vy < vyBefore - 1, expect, `${char} ${power}`);
  }
});

test('날개가 있으면 A를 누른 채 천천히 내려와요', () => {
  const c = { ...carry(), power: 'wing', big: true }, r = new Run(LEVELS[0], c, {}, { easy: true });
  r.player.x = 3 * T; r.player.y = 2 * T; r.player.vy = 2; r.player.ground = false;
  for (let i = 0; i < 5; i++) r.update({ ...idle, a: true });
  assert.ok(r.player.vy <= .7 + 1e-9);
});

test('방울 방패는 한 번 막아 주고, 자석은 뼈다귀를 끌어와요', () => {
  const c = { ...carry(), shield: true }, r = new Run(LEVELS[0], c, {}, { easy: true });
  stand(r, 3 * T);
  r.hurt(); assert.equal(r.state, 'play'); assert.equal(c.shield, false);
  const m = new Run(LEVELS[0], carry(), {}, { easy: true });
  m.player.x = 37 * T; m.player.y = 11 * T - m.player.h; m.player.magnet = 60;
  const before = m.carry.bones; m.pullBones(m.player);
  assert.ok(m.carry.bones > before);
});

test('무너지는 블록은 밟으면 잠시 뒤 사라지고, 한참 뒤 다시 생겨요', () => {
  const L = LEVELS[9], r = new Run(L, carry(), {}, { easy: true });
  const tx = 47, ty = 12; assert.equal(r.tile(tx, ty), 'F');
  r.player.x = tx * T; r.player.y = ty * T - r.player.h - 1; r.player.vy = 1;
  r.update(idle);
  assert.ok(r.crumbles.has(`${tx},${ty}`));
  for (let i = 0; i < 30; i++) r.update(idle);
  assert.equal(r.tile(tx, ty), '.');
  r.player.x = 2 * T; r.player.y = r.groundBelow(2 * T, 0) - r.player.h;
  for (let i = 0; i < 340; i++) { r.player.x = 2 * T; r.player.y = r.groundBelow(2 * T, 0) - r.player.h; r.update(idle); }
  assert.equal(r.tile(tx, ty), 'F');
});

test('용 에스프레소: 쉬려고 내려오고, 밟으면 체력이 줄고, 마지막 성에서 지면 엔딩이에요', () => {
  const L = LEVELS[14]; let ended = false;
  const r = new Run(L, carry(), { say: (l, d) => d(), ending: () => { ended = true; } }, { easy: true });
  r.god = true;
  r.player.x = (L.boss.arena + 3) * T; r.player.y = r.groundBelow(r.player.x, 0) - r.player.h;
  r.update(idle); r.update(idle);
  const b = r.boss; assert.equal(b.kind, 'dragon');
  let rested = false;
  for (let i = 0; i < 600 && !rested; i++) { r.update(idle); if (b.state === 'rest') rested = true; }
  assert.ok(rested, '용이 내려와 쉬어요');
  while (b.hp > 0) r.hitBoss(b, 1);
  for (let i = 0; i < 200 && !ended; i++) r.update(idle);
  assert.ok(ended);
});

test('모카의 하트 날리기는 적을 물리치고, 모카는 A를 누르면 천천히 내려와요', () => {
  const c = { ...carry(), char: 'mocha' }, r = new Run(LEVELS[0], c, {}, { easy: true });
  stand(r, 3 * T);
  const e = enemy(r, 'bean', 8 * T);
  r.update({ ...idle, barkPressed: true });
  assert.ok(r.shots.some(s => s.kind === 'heart'));
  for (let i = 0; i < 30; i++) r.update(idle);
  assert.ok(e.dead);
  r.player.y = 2 * T; r.player.vy = 3; r.player.ground = false;
  r.update({ ...idle, a: true });
  assert.ok(r.player.vy <= 1.5 + 1e-9);
  assert.equal(r.friend, '라떼', '모카로 하면 라떼를 구하러 가요');
});

test('모카로도 15스테이지를 모두 끝까지 갈 수 있어요', () => {
  for (const L of LEVELS) { const r = searchRun(L, { char: 'mocha' }); assert.ok(['clear', 'ending'].includes(r.result), `${L.id}: ${JSON.stringify(r)}`); }
});
