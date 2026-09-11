(function (root) {
  'use strict';
  const MIN = 60, MAX = 660, RADIUS = 19, MAX_SPEED = 1450, STEP = 1 / 120;
  const LEVELS = [
    { name: '입문', label: '아직은 손풀기', description: '가까운 돌을 노리지만 방향과 힘 조절에 실수가 많아요.', samples: 6, error: .24, powerError: .25 },
    { name: '초보', label: '제법 맞히는데?', description: '가까운 돌을 더 정확하게 맞혀요.', samples: 16, error: .14, powerError: .18 },
    { name: '중수', label: '빈틈을 발견하다', description: '가장자리에 있는 위험한 돌을 먼저 노려요.', samples: 40, error: .08, powerError: .1 },
    { name: '고수', label: '한 수의 차이', description: '상대 돌을 밀어내면서 자기 돌도 지키려 해요.', samples: 90, error: .045, powerError: .06 },
    { name: '달인', label: '한 번에 두 알', description: '충돌을 계산해 여러 돌을 밀어내는 샷을 찾아요.', samples: 180, error: .024, powerError: .035 },
    { name: '명인', label: '판 전체를 읽다', description: '샷이 끝난 뒤의 배치와 가장자리 위험까지 따져요.', samples: 300, error: .012, powerError: .018 },
    { name: '알까기 신', label: '마지막 도전', description: '내 다음 공격까지 예상해 반격받기 어려운 샷을 골라요.', samples: 400, error: .004, powerError: .008 },
  ];
  function initialStones() {
    return [0, 1].flatMap(team => Array.from({ length: 5 }, (_, i) => ({
      id: team * 5 + i, team, x: 180 + i * 90, y: team ? 190 + (i % 2) * 28 : 530 - (i % 2) * 28,
      vx: 0, vy: 0, alive: true,
    })));
  }
  const clone = stones => stones.map(s => ({ ...s }));
  function step(stones, dt = STEP, onEvent) {
    for (const s of stones) {
      if (!s.alive) continue;
      s.x += s.vx * dt; s.y += s.vy * dt;
      const speed = Math.hypot(s.vx, s.vy);
      const factor = speed > 0 ? Math.max(0, speed - 880 * dt) / speed : 0;
      s.vx *= factor; s.vy *= factor;
      if (s.x < MIN || s.x > MAX || s.y < MIN || s.y > MAX) {
        s.alive = false; s.vx = s.vy = 0;
        if (onEvent) onEvent({ type: 'fall', x: s.x, y: s.y, team: s.team });
      }
    }
    for (let i = 0; i < stones.length; i++) {
      const a = stones[i]; if (!a.alive) continue;
      for (let j = i + 1; j < stones.length; j++) {
        const b = stones[j]; if (!b.alive) continue;
        const dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy);
        if (distance >= RADIUS * 2) continue;
        const nx = distance ? dx / distance : 1, ny = distance ? dy / distance : 0;
        const correction = (RADIUS * 2 - distance) / 2 + .01;
        a.x -= nx * correction; a.y -= ny * correction;
        b.x += nx * correction; b.y += ny * correction;
        const impact = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (impact > 0) {
          const impulse = impact * .96;
          a.vx -= impulse * nx; a.vy -= impulse * ny;
          b.vx += impulse * nx; b.vy += impulse * ny;
          if (onEvent && impact > 45) onEvent({ type: 'hit', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, impact });
        }
      }
    }
    // Separation can push a stationary stone over the edge too.
    for (const s of stones) if (s.alive && (s.x < MIN || s.x > MAX || s.y < MIN || s.y > MAX)) {
      s.alive = false; s.vx = s.vy = 0;
      if (onEvent) onEvent({ type: 'fall', x: s.x, y: s.y, team: s.team });
    }
    return stones.some(s => s.alive && (s.vx !== 0 || s.vy !== 0));
  }
  function shoot(stones, shot) {
    const s = stones.find(s => s.id === shot.id && s.alive);
    if (!s) return false;
    const speed = Math.min(MAX_SPEED, Math.max(0, shot.speed));
    s.vx = Math.cos(shot.angle) * speed; s.vy = Math.sin(shot.angle) * speed;
    return true;
  }
  function simulate(stones, shot) {
    const result = clone(stones); shoot(result, shot);
    for (let i = 0; i < 720; i++) if (!step(result)) break;
    return result;
  }
  function outcome(stones) {
    const counts = [0, 0]; stones.forEach(s => { if (s.alive) counts[s.team]++; });
    if (!counts[0] && !counts[1]) return 'draw';
    if (!counts[0]) return 1;
    if (!counts[1]) return 0;
    return null;
  }
  function evaluate(before, after, team, level) {
    let score = 0;
    const result = outcome(after);
    if (result === team) return 100000;
    if (result === 1 - team) return -100000;
    if (result === 'draw') return -100;
    for (const s of after) {
      const was = before.find(b => b.id === s.id);
      if (!s.alive) {
        if (was.alive) score += s.team === team ? -(level >= 4 ? 140 : 90) : 120;
        continue;
      }
      const edge = Math.min(s.x - MIN, MAX - s.x, s.y - MIN, MAX - s.y);
      const oldEdge = Math.min(was.x - MIN, MAX - was.x, was.y - MIN, MAX - was.y);
      score += (oldEdge - edge) * (s.team === team ? -.07 : .13);
      if (level >= 6) score += (s.team === team ? -1 : 1) * Math.max(0, 100 - edge) * .28;
    }
    return score;
  }
  function candidates(stones, team, count, rng = Math.random) {
    const own = stones.filter(s => s.alive && s.team === team);
    const enemy = stones.filter(s => s.alive && s.team !== team);
    if (!own.length || !enemy.length) return [];
    const pairs = own.flatMap(a => enemy.map(b => ({ a, b, distance: Math.hypot(a.x - b.x, a.y - b.y) })))
      .sort((a, b) => a.distance - b.distance);
    const shots = [];
    for (let i = 0; i < count; i++) {
      const { a, b, distance } = pairs[i % pairs.length];
      const cycle = Math.floor(i / pairs.length);
      const offset = cycle < 3 ? 0 : (rng() - .5) * Math.min(.7, 55 / distance);
      const angle = Math.atan2(b.y - a.y, b.x - a.x) + offset;
      const ux = Math.cos(angle), uy = Math.sin(angle);
      const edgeDistance = Math.min(ux > .001 ? (MAX - b.x) / ux : ux < -.001 ? (MIN - b.x) / ux : Infinity,
        uy > .001 ? (MAX - b.y) / uy : uy < -.001 ? (MIN - b.y) / uy : Infinity);
      const ideal = Math.sqrt(2 * 880 * (Math.max(0, distance - RADIUS * 2) + edgeDistance / (.96 * .96) + 20));
      const factor = cycle === 0 ? 1 : cycle === 1 ? .85 : cycle === 2 ? 1.12 : .65 + rng() * .55;
      shots.push({ id: a.id, angle, speed: Math.min(MAX_SPEED, Math.max(260, ideal * factor)) });
    }
    return shots;
  }
  async function chooseShot(stones, level, team = 1, options = {}) {
    const rng = options.rng || Math.random, config = LEVELS[level - 1];
    const shots = candidates(stones, team, config.samples, rng), ranked = [];
    for (let i = 0; i < shots.length; i++) {
      if (options.cancelled?.()) return null;
      const after = simulate(stones, shots[i]);
      ranked.push({ shot: shots[i], after, score: evaluate(stones, after, team, level) });
      if (i % 20 === 19 && options.yield) await options.yield();
    }
    ranked.sort((a, b) => b.score - a.score);
    if (!ranked.length) return null;
    if (level === 7) {
      for (const candidate of ranked.slice(0, 5)) {
        if (outcome(candidate.after) !== null) continue;
        let retaliation = -Infinity;
        for (const reply of candidates(candidate.after, 1 - team, 55, rng)) {
          if (options.cancelled?.()) return null;
          retaliation = Math.max(retaliation, evaluate(candidate.after, simulate(candidate.after, reply), 1 - team, 6));
        }
        candidate.score -= Math.max(0, retaliation) * .8;
        if (options.yield) await options.yield();
      }
      // Only the finalists have been checked for a counterattack.
      ranked.splice(5); ranked.sort((a, b) => b.score - a.score);
    }
    const best = { ...ranked[0].shot };
    best.angle += (rng() - .5) * config.error * 2;
    best.speed = Math.min(MAX_SPEED, best.speed * (1 + (rng() - .5) * config.powerError * 2));
    return best;
  }
  const api = { MIN, MAX, RADIUS, MAX_SPEED, STEP, LEVELS, initialStones, clone, step, shoot, simulate, outcome, chooseShot };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AlkagiPhysics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
