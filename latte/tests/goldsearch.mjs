// 황금 뼈다귀마다 "정말 모을 수 있는지" 탐색 봇으로 확인해요(적 무시, 지형만).
import { LEVELS } from '../levels.js';
import { Run, T } from '../engine.js';
import { MACROS, FLY, clone } from './search.mjs';

const noop = () => {};
const base = { sound: noop, music: noop, hint: noop, say: (l, d) => d(), clear: noop, ending: noop, dead: noop };
const input = (m, k) => ({ right: !!m.right, left: !!m.left, up: !!m.up, down: !!m.down, b: !!m.b, a: !!m.jump && k < m.jump, aPressed: !!m.jump && k === 0 });

function rollout(c, seq, step, look, target, bit) {
  let best = Infinity, k = 0;
  const frames = [...seq.flatMap(m => Array.from({ length: step }, (_, i) => [m, i])), ...Array.from({ length: look }, () => [{}, 0])];
  for (const [m, i] of frames) {
    if (c.state !== 'play') break;
    c.update(input(m, i)); k++;
    if (c.gold & bit) return 1e6 - k;
    const p = c.player, d = Math.hypot(p.x + p.w / 2 - target.x, p.y + p.h / 2 - target.y);
    if (d < best) best = d;
  }
  if (c.state === 'dying') return -1e6;
  return -best;
}

export function goldRun(L, i, { step = 8, look = 30, maxDecisions = 400 } = {}) {
  const g = L.golds[i], bit = 1 << i, target = { x: g.tx * T + 4, y: g.ty * T + 4 };
  const r = new Run(L, { lives: 3, score: 0, bones: 0, big: false, power: null }, base, { easy: true });
  r.god = true;
  const macros = r.fly ? FLY : MACROS;
  for (let d = 0; d < maxDecisions; d++) {
    if (r.gold & bit) return { ok: true, decisions: d };
    if (r.state !== 'play') return { ok: false, why: r.state, x: r.player.x / T };
    const near = Math.abs(r.player.x - target.x) < 80;
    const depth = near ? 3 : 2;
    let best = null, bestScore = -Infinity;
    const walk = (seq) => {
      if (seq.length === depth) {
        const c = clone(r); c.hooks = base;
        const sc = near ? rollout(c, seq, step, look, target, bit) : (() => { const v = rollout(c, seq, step, look, target, bit); return v >= 1e5 || v <= -1e5 ? v : c.player.x - (c.state === 'dying' ? 1e6 : 0); })();
        if (sc > bestScore) { bestScore = sc; best = seq; }
        return;
      }
      for (const m of macros) walk([...seq, m]);
    };
    walk([]);
    const moves = bestScore >= 1e5 ? best : best.slice(0, 1);
    for (const m of moves) for (let k = 0; k < step && r.state === 'play'; k++) r.update(input(m, k));
    if (!near && r.player.x > target.x + 40) return { ok: false, why: 'passed', x: r.player.x / T };
  }
  return { ok: !!(r.gold & bit), why: 'timeout', x: r.player.x / T };
}
if (globalThis.process?.argv && import.meta.url === `file://${process.argv[1]}`) {
  const only = process.argv[2]?.split(',');
  for (const L of LEVELS) if (!only || only.includes(L.id)) L.golds.forEach((g, i) => { const t = Date.now(); console.log(L.id, i, JSON.stringify(g), JSON.stringify(goldRun(L, i)), Date.now() - t + 'ms'); });
}
