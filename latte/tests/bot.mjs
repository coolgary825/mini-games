// 무적 봇으로 각 스테이지 지형을 끝까지 갈 수 있는지 확인해요(적은 무시, 지형만).
import { LEVELS } from '../levels.js';
import { Run, T } from '../engine.js';
const SOLID = '#BU?H[]{}C^';
function edgeDist(r, p, solid) {
  const feetRow = Math.floor((p.y + p.h - 1) / T);
  for (let d = 0; d < 80; d += 2) { const x = Math.floor((p.x + p.w + d) / T); if (![...Array(16)].some((_, y) => y > feetRow && solid(x, y))) return d; }
  return 99;
}
export function botPolicy(r, st, f) {
    const p = r.player;
    const tx = Math.floor((p.x + p.w + 2) / T), feetRow = Math.floor((p.y + p.h - 1) / T);
    const solid = (x, y) => SOLID.includes(r.tile(x, y)) || ((r.tile(x, y) === '=' || r.tile(x, y) === 'c'));
    const wall = solid(tx, feetRow) || solid(tx + 1, feetRow) || solid(tx, feetRow - 1);
    let gap = true; for (let k = 0; k < 3; k++) for (let y = feetRow + 1; y < 16; y++) if (solid(tx + k, y)) gap = false;
    const ground = [...Array(4)].some((_, k) => solid(Math.floor((p.x + p.w / 2) / T) + 1, feetRow + 1));
    const mover = r.movers.find(m => m.x > p.x - 8 && m.x < p.x + 90);
    let input = { right: true, b: true, a: false, aPressed: false, left: false, up: false, down: false, bPressed: false, barkPressed: false };
    if (r.fly) {
      // 날기: 앞의 단단한 벽을 피해 위아래로
      const cy = Math.floor((p.y + p.h / 2) / T);
      let best = cy, bestD = 99;
      for (let y = 0; y < 16; y++) { let free = true; for (let k = 0; k < 9; k++) if (SOLID.includes(r.tile(tx + k, y)) || SOLID.includes(r.tile(tx + k, y + 1))) free = false; if (free && Math.abs(y - cy) < bestD) { best = y; bestD = Math.abs(y - cy); } }
      input = { ...input, right: false, up: best < cy, down: best > cy, aPressed: f % 12 === 0 };
    } else if (p.ground && mover && !p.onMover && edgeDist(r, p, solid) < 56) {
      // 움직이는 발판이 뛰어서 닿을 자리에 올 때까지 기다려요
      const feet = p.y + p.h, landing = mover.axis === 'x' ? Math.abs(mover.x + mover.w / 2 - (p.x + 34)) < 8 : mover.y >= feet - 2 && mover.x - p.x < 40;
      const edge = !solid(Math.floor((p.x + p.w + 4) / T), feetRow + 1);
      input.right = !edge && edgeDist(r, p, solid) > 14 && Math.abs(p.vx) < 1; input.b = false; input.left = p.vx > .6;
      if (landing) { input.right = true; input.aPressed = true; st.hold = 30; }
    } else if (p.onMover) {
      // 발판 위: 걸어서 다음 땅이 3~5칸 앞에 올 때 폴짝
      let dist = 99;
      for (let k = 1; k < 9 && dist === 99; k++) if ([...Array(16)].some((_, y) => y >= feetRow - 2 && y <= feetRow + 3 && solid(tx + k, y))) dist = k;
      const onEdge = p.x + p.w > p.onMover.x + p.onMover.w - 2;
      input.b = false; input.right = !onEdge;
      if (dist <= 4) { input.aPressed = true; st.hold = 26; input.right = true; }
    } else if (p.ground && (wall || gap)) { input.aPressed = true; st.hold = 30; }
    if (st.hold > 0) { input.a = true; st.hold--; }
    return input;
}
export function botRun(L, { maxFrames = 60 * 200, invincible = true } = {}) {
  const carry = { lives: 3, score: 0, bones: 0, big: false, power: null };
  let result = null, deaths = 0;
  const hooks = { say: (l, d) => d(), clear: () => result = 'clear', ending: () => result = 'ending', dead: () => { deaths++; result = 'dead'; } };
  const r = new Run(L, carry, hooks, { easy: true });
  let f = 0;
  const st = { hold: 0, wait: 0 };
  for (; f < maxFrames && !result; f++) {
    if (invincible) r.player.star = 9999;
    const input = botPolicy(r, st, f);
    r.update(input);
    if (r.state === 'done' && !result) result = 'done';
  }
  return { id: L.id, result: result || 'timeout', frames: f, x: Math.round(r.player.x / T), w: L.w, deaths };
}
if (globalThis.process?.argv && import.meta.url === `file://${process.argv[1]}`) for (const L of LEVELS) console.log(JSON.stringify(botRun(L)));
