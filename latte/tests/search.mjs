// 몇 수 앞을 미리 해 보는 탐색 봇: 모든 스테이지를 적 없이(무적) 지형만으로 끝까지 갈 수 있는지 확인해요.
import { LEVELS } from '../levels.js';
import { Run, T } from '../engine.js';

export const MACROS = [
  { right: 1 }, { right: 1, b: 1 }, {}, { left: 1 },
  { right: 1, b: 1, jump: 30 }, { right: 1, jump: 30 }, { right: 1, jump: 10 }, { jump: 30 }, { left: 1, jump: 20 },
];
export const FLY = [{ right: 1 }, { up: 1 }, { down: 1 }, { right: 1, up: 1 }, { right: 1, down: 1 }, {}, { left: 1 }, { left: 1, up: 1 }, { left: 1, down: 1 }];

export function clone(r) {
  const { hooks, L } = r; r.hooks = null; r.L = null;
  const c = structuredClone(r); r.hooks = hooks; r.L = L;
  Object.setPrototypeOf(c, Run.prototype); c.hooks = hooks; c.L = L; return c;
}
export function play(r, m, frames, from = 0) {
  for (let i = 0; i < frames; i++) {
    const k = from + i;
    r.update({ right: !!m.right, left: !!m.left, up: !!m.up, down: !!m.down, b: !!m.b, a: !!m.jump && k < m.jump, aPressed: !!m.jump && k === 0 });
    if (r.state !== 'play') return;
  }
}
const dead = r => r.state === 'dying' || r.dead;

export function searchRun(L, { step = 8, look = 40, maxFrames = 60 * 400, char = 'latte' } = {}) {
  let outcome = null;
  const noop = () => {}, base = { sound: noop, music: noop, hint: noop };
  const hooks = { ...base, say: (l, d) => d(), clear: () => outcome ??= 'clear', ending: () => outcome ??= 'ending', dead: () => outcome ??= 'dead' };
  const r = new Run(L, { lives: 3, score: 0, bones: 0, big: false, power: null, char }, hooks, { easy: true });
  r.god = true;
  const macros = r.fly ? FLY : MACROS;
  let f = 0;
  while (!outcome && f < maxFrames) {
    if (r.state !== 'play') { r.update({}); f++; if (r.state === 'dying') outcome = 'dead'; continue; }
    let best = null, bestNext = null, bestScore = -Infinity;
    for (const a of macros) for (const b of macros) {
      const c = clone(r); c.hooks = { ...base, clear() { c.won = true; }, ending() { c.won = true; }, dead() { c.dead = true; }, say: (l, d) => d() };
      play(c, a, step); if (c.state === 'play') play(c, b, step);
      if (c.state === 'play') play(c, {}, look);
      const alive = !dead(c) && (c.fly || c.player.y > -4 || !/[BC]/.test(L.rows[0][0]));
      const score = c.won || ['pole', 'walkout', 'tally', 'bossTalk', 'bossEnd', 'done'].includes(c.state) && alive ? 1e6 : alive ? c.player.x + (c.player.onMover ? 4 : 0) - (c.player.y > 14 * T ? 50 : 0) : -1e6 + c.player.x;
      if (score > bestScore) { bestScore = score; best = a; bestNext = b; }
    }
    // 보스는 무적 상태로 밟거나 기다리면 끝나요
    if (globalThis.process?.env.DBG && r.player.x > +process.env.DBG * T) console.log(f, (r.player.x / T).toFixed(2), ((r.player.y + r.player.h) / T).toFixed(2), JSON.stringify(best), bestScore.toFixed(0), r.state);
    play(r, best, step); f += step;
    if (bestScore >= 1e6 && r.state === 'play') { play(r, bestNext, step); f += step; }
    // 보스방: 보스 머리를 향해 뛰어오르기
    if (r.boss && !r.boss.dead && r.state === 'play') {
      const b = r.boss, p = r.player, dir = Math.sign(b.x - p.x);
      for (let i = 0; i < 30 && r.state === 'play'; i++, f++) r.update({ right: dir > 0, left: dir < 0, a: i < 25, aPressed: i === 0 && p.ground });
    }
  }
  return { id: L.id, result: outcome || (r.state === 'done' ? 'done' : 'timeout'), frames: f, x: Math.round(r.player.x / T), w: L.w };
}
if (globalThis.process?.argv && import.meta.url === `file://${process.argv[1]}`) {
  const only = process.argv[2]?.split(',');
  for (const L of LEVELS) if (!only || only.includes(L.id)) { const t = Date.now(); console.log(JSON.stringify({ ...searchRun(L), ms: Date.now() - t })); }
}
