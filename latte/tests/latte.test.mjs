// node --test latte/tests/  — 브라우저 없이 규칙만 확인해요.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, ROWS, endlessLevel } from '../levels.js';
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
  assert.equal(LEVELS.length, 36);
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
  for (let i = 0; i < 50; i++) r.update(idle);
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

test('팝콘공: 팝!은 팝콘 세 알이 튀어 적을 물리치고, 등껍질이 한 번 막아 줘요', () => {
  const c = { ...carry(), char: 'turtle' }, r = new Run(LEVELS[0], c, {}, { easy: true });
  assert.equal(c.shield, true, '등껍질 방패로 시작해요');
  stand(r, 3 * T);
  const e = enemy(r, 'bean', 6 * T);
  r.update({ ...idle, barkPressed: true });
  assert.equal(r.shots.filter(s => s.kind === 'pop').length, 3);
  for (let i = 0; i < 40; i++) r.update(idle);
  assert.ok(e.dead);
  r.hurt(); assert.equal(r.state, 'play');
});

test('드래곤: 불!은 앞의 적을 태우고, 벽에 붙어 미끄러지다 A로 벽 점프해요', () => {
  const c = { ...carry(), char: 'lizard' }, r = new Run(LEVELS[0], c, {}, { easy: true });
  stand(r, 3 * T);
  const e = enemy(r, 'hedgehog', 5 * T);
  r.update({ ...idle, barkPressed: true });
  assert.ok(r.shots.some(s => s.kind === 'flame'));
  for (let i = 0; i < 20; i++) r.update(idle);
  assert.ok(e.dead, '가시 고슴도치도 불로 물리쳐요');
  // 1-2의 벽돌 벽(48열) 옆에서 공중에 떠 벽 쪽을 누르면 천천히 미끄러져요
  const w = new Run(LEVELS[1], { ...carry(), char: 'lizard' }, {}, { easy: true });
  w.spawnDefs = [];
  w.player.x = 48 * T - w.player.w - .5; w.player.y = 9 * T; w.player.vx = 1; w.player.vy = 1; w.player.ground = false;
  for (let i = 0; i < 3; i++) w.update({ ...idle, right: true });
  assert.ok(w.player.wallT > 0 && w.player.vy <= .8 + 1e-9, '벽에 붙어요');
  w.update({ ...idle, right: true, a: true, aPressed: true });
  assert.ok(w.player.vy < -3 && w.player.vx < 0, '벽을 차고 반대로 뛰어요');
});

test('쉬워진 규칙: 커져 있으면 구덩이에 빠져도 작아지기만 하고 다시 올라와요', () => {
  const c = { ...carry(), big: true }, r = new Run(LEVELS[0], c, {}, { easy: true });
  r.spawnDefs = [];
  stand(r, 43 * T);
  for (let i = 0; i < 5; i++) r.update(idle);
  assert.ok(r.player.safe, '마지막으로 선 땅을 기억해요');
  r.player.x = 47 * T; r.player.y = 12 * T; r.player.vy = 3;
  for (let i = 0; i < 80 && c.big; i++) r.update(idle);
  assert.equal(r.state, 'play'); assert.equal(c.big, false);
  assert.ok(r.player.y < 13 * T && r.player.x < 46 * T, '땅 위로 돌아와요');
  const s = new Run(LEVELS[0], carry(), {}, { easy: true });
  s.spawnDefs = [];
  stand(s, 43 * T); s.player.x = 47 * T; s.player.y = 12 * T; s.player.vy = 3;
  for (let i = 0; i < 80 && s.state === 'play'; i++) s.update(idle);
  assert.equal(s.state, 'dying', '작을 때 빠지면 쓰러져요');
});

test('팝콘공·드래곤·에스프레소·콜드브루로도 36스테이지를 모두 끝까지 갈 수 있어요', () => {
  for (const char of ['turtle', 'lizard', 'espresso', 'owl']) for (const L of LEVELS) { const r = searchRun(L, { char }); assert.ok(['clear', 'ending'].includes(r.result), `${char} ${L.id}: ${JSON.stringify(r)}`); }
});

// ── 3부: 월드 6~8 ──────────────────────────────────────────
const byId = id => LEVELS.find(L => L.id === id);
const talk = { say: (l, d) => d() };
function enterBoss(L, hooks = {}, c = carry()) {
  const r = new Run(L, c, { ...talk, ...hooks }, { easy: true });
  r.player.x = (L.boss.arena + 3) * T; r.player.y = r.groundBelow(r.player.x, 0) - r.player.h;
  r.update(idle); r.update(idle);
  return r;
}

test('에스프레소: 화!는 큰 불덩이 세 개, A를 누르고 있으면 사뿐히 내려와요', () => {
  const c = { ...carry(), char: 'espresso' }, r = new Run(LEVELS[0], c, {}, { easy: true });
  assert.equal(r.hero, '에스프레소');
  stand(r, 3 * T);
  const e = enemy(r, 'hedgehog', 7 * T);
  r.update({ ...idle, barkPressed: true });
  assert.equal(r.shots.filter(s => s.kind === 'flame' && s.big).length, 3);
  for (let i = 0; i < 30; i++) r.update(idle);
  assert.ok(e.dead, '가시 고슴도치도 불덩이로 물리쳐요');
  r.player.x = 3 * T; r.player.y = 2 * T; r.player.vy = 3; r.player.ground = false;
  for (let i = 0; i < 4; i++) r.update({ ...idle, a: true });
  assert.ok(r.player.vy <= .9 + 1e-9, '용 날개로 천천히 내려와요');
});

test('얼음 땅은 미끌미끌: 손을 떼도 한참 미끄러져요', () => {
  const slide = L => {
    const r = new Run(L, carry(), {}, { easy: true }); r.spawnDefs = [];
    stand(r, 2 * T);
    for (let i = 0; i < 40; i++) r.update({ ...idle, right: true });
    const x0 = r.player.x; for (let i = 0; i < 60; i++) r.update(idle);
    return r.player.x - x0;
  };
  assert.ok(slide(byId('8-1')) > slide(byId('6-1')) * 3, '얼음 위에서 훨씬 멀리 미끄러져요');
});

test('고드름은 밑으로 지나가면 떨리다가 떨어져서 아파요', () => {
  const L = byId('8-2'), c = { ...carry(), big: true }, r = new Run(L, c, {}, { easy: true });
  r.spawnDefs = r.spawnDefs.filter(d => d.type === 'icicle' && d.tx === 12);
  stand(r, 12 * T - 1);
  r.update(idle);
  const ic = r.enemies.find(e => e.type === 'icicle');
  assert.ok(ic && ic.state === 'shake', '달달 떨어요');
  for (let i = 0; i < 80 && c.big; i++) { r.player.x = 12 * T - 1; r.update(idle); }
  assert.equal(c.big, false, '고드름에 맞으면 작아져요');
});

test('사막 전갈 카라멜: 독침을 쏘고, 모래 속에 숨었다 솟아오르고, 어지러울 때 밟혀요', () => {
  const L = byId('6-3'); let cleared = false;
  const r = enterBoss(L, { clear: () => { cleared = true; } });
  r.god = true;
  const b = r.boss; assert.equal(b.kind, 'scorpion'); assert.equal(b.hp, 5);
  const seen = new Set();
  for (let i = 0; i < 900; i++) { r.update(idle); seen.add(b.state); if (r.foes.some(f => f.kind === 'sting')) seen.add('sting'); }
  for (const k of ['walk', 'under', 'erupt', 'dizzy', 'sting']) assert.ok(seen.has(k), `전갈이 ${k} 해요`);
  // 숨었을 때는 밟을 수 없어요
  b.state = 'under'; b.hidden = true; const hp = b.hp;
  r.player.x = b.x; r.player.y = b.y - r.player.h - 2; r.player.vy = 2; r.interact();
  assert.equal(b.hp, hp);
  while (b.hp > 0) r.hitBoss(b, 1);
  for (let i = 0; i < 400 && !cleared; i++) r.update(idle);
  assert.ok(cleared, '이기면 다음 스테이지로');
});

test('대왕 꽃게 마키아토: 등딱지를 밟으면 튕기고, 쿵! 한 뒤 헉헉댈 때만 아파해요', () => {
  const L = byId('7-3'), r = enterBoss(L);
  r.god = true;
  const b = r.boss; assert.equal(b.kind, 'crab');
  r.update(idle);
  assert.ok(b.armored);
  const hp = b.hp, p = r.player;
  p.x = b.x + 8; p.y = b.y - p.h + 2; p.vy = 2; p.prevBottom = b.y; r.interact();
  assert.equal(b.hp, hp, '단단해서 튕겨요'); assert.ok(p.vy < 0);
  let waves = false;
  for (let i = 0; i < 700 && b.state !== 'tired'; i++) { r.update(idle); }
  assert.equal(b.state, 'tired', '뛰어올라 쿵!');
  waves = r.foes.some(f => f.kind === 'wave'); assert.ok(waves, '파도가 밀려와요');
  p.x = b.x + 8; p.y = b.y - p.h + 2; p.vy = 2; p.prevBottom = b.y; b.hurt = 0; r.interact();
  assert.equal(b.hp, hp - 1, '헉헉댈 때 밟으면 아파해요');
});

test('얼음 부엉이 콜드브루: 얼음 조각·고드름을 쏘고, 휙 내려와 쉴 때 밟히고, 지면 진짜 엔딩', () => {
  const L = byId('8-3'); let ended = false, hinted = '';
  const r = enterBoss(L, { ending: () => { ended = true; }, hint: t => { hinted = t; } });
  r.god = true;
  const b = r.boss; assert.equal(b.kind, 'owl'); assert.ok(b.final); assert.equal(b.hp, 8);
  const seen = new Set();
  for (let i = 0; i < 700; i++) { r.update(idle); seen.add(b.state); for (const f of r.foes) seen.add(f.kind); }
  for (const k of ['shard', 'fallice', 'swoop', 'rest', 'blink']) assert.ok(seen.has(k), `콜드브루가 ${k} 해요`);
  r.hitBoss(b, 1); r.hitBoss(b, 1); r.hitBoss(b, 1); r.hitBoss(b, 1);
  b.hurt = 0; b.state = 'fly';
  for (let i = 0; i < 400 && !r.foes.some(f => f.kind === 'snow'); i++) r.update(idle);
  assert.ok(r.foes.some(f => f.kind === 'snow'), '화나면 눈덩이를 굴려요');
  assert.match(hinted, /콜드브루가 화났어요/);
  while (b.hp > 0) r.hitBoss(b, 1);
  for (let i = 0; i < 200 && !ended; i++) r.update(idle);
  assert.ok(ended);
});

// ── 4부: 월드 9~12, 난이도, 새 아이템, 끝없는 모험 ─────────────
test('난이도: 평화로움은 안 아프고, 불가능은 한 번에 끝나고, 어려움은 구덩이에서 안 구해 줘요', () => {
  const mk = (difficulty, c = { ...carry(), big: true }) => { const r = new Run(LEVELS[0], c, {}, { difficulty }); r.spawnDefs = []; stand(r, 3 * T); return r; };
  const peace = mk('peace'); peace.hurt(); assert.equal(peace.state, 'play'); assert.ok(peace.carry.big, '평화로움: 작아지지도 않아요');
  const imp = mk('impossible', { ...carry(), big: true, shield: true }); imp.hurt(); assert.equal(imp.state, 'dying', '불가능: 방패가 있어도 한 번에');
  assert.equal(imp.checks.length, 0, '불가능: 소화전이 없어요');
  const hard = mk('hard'); hard.player.x = 47 * T; hard.player.y = 12 * T; hard.player.vy = 3;
  for (let i = 0; i < 80 && hard.state === 'play'; i++) hard.update(idle);
  assert.equal(hard.state, 'dying', '어려움: 커도 구덩이에 빠지면 끝');
  const pk = mk('peace', carry()); pk.player.x = 47 * T; pk.player.y = 12 * T; pk.player.vy = 3;
  for (let i = 0; i < 80; i++) pk.update(idle);
  assert.equal(pk.state, 'play', '평화로움: 작아도 구덩이에서 구해 줘요');
  const boss = diff => { const L = byId('9-3'), r = new Run(L, carry(), talk, { difficulty: diff }); r.player.x = (L.boss.arena + 3) * T; r.player.y = r.groundBelow(r.player.x, 0) - r.player.h; r.update(idle); r.update(idle); return r.boss.hp; };
  assert.ok(boss('impossible') > boss('normal') && boss('normal') > boss('peace'), '보스 체력도 달라져요');
});

test('콜드브루(플레이어): 공중에서 두 번 퍼덕이고, 꽁!에 맞은 적은 얼었다가 닿으면 날아가요', () => {
  const c = { ...carry(), char: 'owl' }, r = new Run(LEVELS[0], c, {}, { easy: true });
  assert.equal(r.hero, '콜드브루');
  stand(r, 3 * T);
  r.update({ ...idle, a: true, aPressed: true });
  let flaps = 0;
  for (let k = 0; k < 3; k++) { for (let i = 0; i < 10; i++) r.update({ ...idle, a: true }); const v = r.player.vy; r.update({ ...idle, a: true, aPressed: true }); if (r.player.vy < v - .5) flaps++; }
  assert.equal(flaps, 2, '두 번만 퍼덕여요');
  const q = new Run(LEVELS[0], { ...carry(), char: 'owl' }, {}, { easy: true });
  stand(q, 3 * T);
  const e = enemy(q, 'hedgehog', 7 * T);
  q.update({ ...idle, barkPressed: true });
  for (let i = 0; i < 20 && !e.frozen; i++) q.update(idle);
  assert.ok(e.frozen && e.stun > 0, '꽁꽁 얼어요');
  q.player.x = e.x - 2; q.player.y = e.y + e.h - q.player.h; q.interact();
  assert.ok(e.dead, '언 적은 닿으면 톡 날아가요'); assert.equal(q.state, 'play');
});

test('새 아이템: 스프링 신발·구름 방석·병아리 친구·뼈다귀 비·무지개 사탕', () => {
  const jumpTop = power => { const r = new Run(LEVELS[0], { ...carry(), big: true, power }, {}, { easy: true }); r.spawnDefs = []; stand(r, 3 * T); const y0 = r.player.y; r.update({ ...idle, a: true, aPressed: true }); let top = y0; for (let i = 0; i < 60; i++) { r.update({ ...idle, a: true }); top = Math.min(top, r.player.y); } return y0 - top; };
  assert.ok(jumpTop('spring') > jumpTop(null) * 1.4, '스프링 신발은 훨씬 높이');
  const give = (r, kind) => { r.things.push({ kind, x: r.player.x, y: r.player.y, w: 8, h: 8, vx: 0, vy: 0, rise: 0 }); r.interact(); };
  const c = carry(), r = new Run(LEVELS[0], c, {}, { easy: true }); r.spawnDefs = []; stand(r, 43 * T);
  for (let i = 0; i < 5; i++) r.update(idle);
  give(r, 'cushion'); assert.ok(c.cushion);
  r.player.x = 47 * T; r.player.y = 12 * T; r.player.vy = 3;
  for (let i = 0; i < 80 && c.cushion; i++) r.update(idle);
  assert.equal(r.state, 'play', '작아도 구름 방석이 구해 줘요'); assert.equal(c.cushion, false);
  stand(r, 3 * T); give(r, 'chick'); assert.ok(r.buddy && c.buddy);
  const e = enemy(r, 'bean', 8 * T);
  for (let i = 0; i < 120 && !e.dead; i++) { r.player.x = 3 * T; r.update(idle); }
  assert.ok(e.dead, '병아리가 콕!');
  const before = c.bones; give(r, 'boneRain'); assert.ok(r.rain > 0);
  for (let i = 0; i < 320; i++) { const b = r.things.find(t => t.kind === 'fallBone'); if (b) { r.player.x = b.x; r.player.y = b.y; } r.update(idle); }
  assert.ok(c.bones > before + 5, '떨어지는 뼈다귀를 모아요');
  stand(r, 50 * T); give(r, 'rainbow'); assert.ok(r.player.star > 0 && r.player.rainbow > 0);
  for (let i = 0; i < 60; i++) r.update({ ...idle, right: true });
  assert.ok(Math.abs(r.player.vx) > 2.3, '무지개 사탕은 엄청 빨라요');
});

test('젤리 블록은 통통, 우주는 몸이 가벼워요, 꼬마 유령은 쳐다보면 멈춰요', () => {
  const L = byId('9-1'), r = new Run(L, carry(), {}, { easy: true }); r.spawnDefs = [];
  r.player.x = 40 * T; r.player.y = 10 * T; r.player.vy = 2; r.player.ground = false;
  for (let i = 0; i < 10 && r.player.vy >= 0; i++) r.update(idle);
  assert.ok(r.player.vy < -4, '젤리를 밟으면 높이 튀어요');
  const air = L2 => { const q = new Run(L2, carry(), {}, { easy: true }); q.spawnDefs = []; stand(q, 3 * T); q.update({ ...idle, a: true, aPressed: true }); let f = 0; while (!q.player.ground && f < 400) { q.update({ ...idle, a: true }); f++; } return f; };
  assert.ok(air(byId('12-1')) > air(LEVELS[0]) * 1.6, '우주에서는 더 오래 떠 있어요');
  const g = new Run(byId('11-1'), carry(), {}, { easy: true }); g.spawnDefs = []; stand(g, 20 * T);
  const boo = { type: 'boo', x: 30 * T, y: 9 * T, w: 11, h: 10, vx: 0, vy: 0, dir: -1, t: 0, stun: 0, state: 'hang', dead: false, gone: false };
  g.enemies = [boo];
  g.player.face = 1; const x0 = boo.x; for (let i = 0; i < 30; i++) g.updateEnemy(boo);
  assert.equal(boo.x, x0, '쳐다보면 멈춰요'); assert.equal(boo.state, 'hide');
  g.player.face = -1; for (let i = 0; i < 30; i++) g.updateEnemy(boo);
  assert.ok(boo.x < x0, '등을 돌리면 다가와요');
});

test('젤리곰·고릴라·유령·UFO 보스: 쉴 때만 밟히고, 12-3 UFO를 이기면 진짜 엔딩', () => {
  const cases = [['9-3', 'jelly', 'squish'], ['10-3', 'gorilla', 'dizzy'], ['11-3', 'ghost', 'split'], ['12-3', 'ufo', 'rest']];
  for (const [id, kind, st] of cases) {
    let ended = false, cleared = false;
    const r = enterBoss(byId(id), { ending: () => { ended = true; }, clear: () => { cleared = true; } });
    r.god = true;
    const b = r.boss; assert.equal(b.kind, kind);
    const seen = new Set();
    for (let i = 0; i < 1500 && !seen.has(st); i++) { r.update(idle); seen.add(b.state); }
    assert.ok(seen.has(st), `${kind}: ${st} 해요 (${[...seen]})`);
    while (b.hp > 0) r.hitBoss(b, 1);
    for (let i = 0; i < 400 && !ended && !cleared; i++) r.update(idle);
    assert.ok(kind === 'ufo' ? ended : cleared, `${kind} 끝`);
  }
  const g = enterBoss(byId('11-3')); g.god = true; const gb = g.boss;
  for (let i = 0; i < 1500 && gb.state !== 'split'; i++) g.update(idle);
  for (let i = 0; i < 5; i++) g.update(idle);
  assert.equal(gb.fakes.length, 2, '비엔나는 셋으로 늘어나요');
  const hp = gb.hp, f = gb.fakes[0]; g.player.x = f.x + 2; g.player.y = f.y + 2; g.update(idle);
  assert.equal(gb.hp, hp, '가짜는 밟아도 체력이 안 줄어요'); assert.equal(gb.fakes.length, 1, '가짜는 펑 사라져요');
});

test('끝없는 모험: 번호마다 같은 스테이지, 4단계마다 보스, 처음 24단계는 모두 끝까지 갈 수 있어요', () => {
  assert.deepEqual(endlessLevel(7).rows, endlessLevel(7).rows);
  assert.notDeepEqual(endlessLevel(7).rows, endlessLevel(8).rows);
  for (let n = 1; n <= 24; n++) {
    const L = endlessLevel(n);
    assert.equal(L.rows.length, ROWS); for (const row of L.rows) assert.equal(row.length, L.w);
    assert.equal(!!L.boss, n % 4 === 0, `${n}단계 보스`);
    const r = searchRun(L, { char: n % 2 ? 'latte' : 'owl' });
    assert.ok(['clear', 'ending'].includes(r.result), `${n}: ${JSON.stringify(r)}`);
  }
});

test('평화로움에서는 보스가 더 자주·더 오래 쉬어요(콜드브루도 이길 만해요)', () => {
  const watch = difficulty => {
    const L = byId('8-3'), r = new Run(L, { ...carry(), big: true }, talk, { difficulty });
    r.god = true; r.player.x = (L.boss.arena + 3) * T; r.player.y = r.groundBelow(r.player.x, 0) - r.player.h;
    r.update(idle); r.update(idle);
    const b = r.boss; let rest = 0, first = null, shards = 0;
    for (let i = 0; i < 1800; i++) { r.update(idle); if (b.state === 'rest') { rest++; first ??= i; } if (r.foes.some(f => f.kind === 'shard' && f.life > 198)) shards++; }
    return { hp: b.maxHp, rest, first, shards };
  };
  const peace = watch('peace'), normal = watch('normal');
  assert.ok(peace.hp < normal.hp, '체력이 적어요');
  assert.ok(peace.first < normal.first, '더 빨리 내려와 쉬어요');
  assert.ok(peace.rest > normal.rest * 1.5, '더 오래 쉬어요');
  assert.ok(peace.shards < normal.shards, '얼음 조각도 덜 쏴요');
});
