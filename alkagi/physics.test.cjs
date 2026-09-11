const { test } = require('node:test');
const assert = require('node:assert/strict');
const P = require('./physics.js');
const stone = (id, team, x, y, vx = 0, vy = 0) => ({ id, team, x, y, vx, vy, alive: true });

test('starts with five stationary stones on each side', () => {
  const stones = P.initialStones();
  assert.equal(stones.filter(s => s.team === 0).length, 5);
  assert.equal(stones.filter(s => s.team === 1).length, 5);
  assert.equal(P.step(stones), false);
  assert.equal(P.outcome(stones), null);
});

test('a direct hit transfers momentum without accelerating either stone', () => {
  const stones = [stone(0, 0, 300, 360, 800), stone(1, 1, 340, 360)];
  P.step(stones);
  assert.ok(stones[1].vx > 700);
  assert.ok(stones[0].vx < 50);
  assert.ok(Math.hypot(stones[1].x - stones[0].x, stones[1].y - stones[0].y) >= P.RADIUS * 2);
  assert.ok(stones.reduce((sum, s) => sum + s.vx ** 2 + s.vy ** 2, 0) < 800 ** 2);
});

test('maximum-speed shots cannot tunnel through an adjacent stone', () => {
  const stones = [stone(0, 0, 300, 360, P.MAX_SPEED), stone(1, 1, 345, 360)];
  P.step(stones);
  assert.ok(stones[1].vx > 1000);
});

test('edge knockout removes a stone and reports the correct winner', () => {
  const stones = [stone(0, 0, 400, 360), stone(1, 1, 630, 360)];
  const result = P.simulate(stones, { id: 0, angle: 0, speed: 800 });
  assert.equal(result[0].alive, true);
  assert.equal(result[1].alive, false);
  assert.equal(P.outcome(result), 0);
  assert.equal(stones[0].x, 400, 'simulation leaves its input untouched');
});

test('all four board edges are open, and simultaneous elimination is a draw', () => {
  for (const [x, y, vx, vy] of [[61, 360, -500, 0], [659, 360, 500, 0], [360, 61, 0, -500], [360, 659, 0, 500]]) {
    const stones = [stone(0, 0, x, y, vx, vy)];
    let falls = 0; P.step(stones, P.STEP, e => { if (e.type === 'fall') falls++; });
    assert.equal(stones[0].alive, false); assert.equal(falls, 1);
  }
  const stones = [stone(0, 0, 61, 200, -500), stone(1, 1, 659, 500, 500)];
  P.step(stones); assert.equal(P.outcome(stones), 'draw');
});

test('friction brings surviving stones to a complete stop', () => {
  const result = P.simulate([stone(0, 0, 250, 360), stone(1, 1, 550, 500)], { id: 0, angle: 0, speed: 400 });
  assert.ok(result.every(s => s.vx === 0 && s.vy === 0));
  assert.ok(result[0].x > 330 && result[0].x < 350);
});

test('all seven AIs return legal shots; strongest AI takes a winning shot', async () => {
  for (let level = 1; level <= 7; level++) {
    const shot = await P.chooseShot(P.initialStones(), level, 1, { rng: () => .5 });
    assert.ok(shot.id >= 5 && shot.id <= 9);
    assert.ok(Number.isFinite(shot.angle) && shot.speed > 0 && shot.speed <= P.MAX_SPEED);
  }
  const stones = [stone(0, 0, 630, 360), stone(1, 1, 400, 360)];
  const shot = await P.chooseShot(stones, 7, 1, { rng: () => .5 });
  assert.equal(P.outcome(P.simulate(stones, shot)), 1);
});

test('AI computation can be cancelled when a match is reset', async () => {
  assert.equal(await P.chooseShot(P.initialStones(), 7, 1, { cancelled: () => true }), null);
  let cancelled = false;
  const result = await P.chooseShot(P.initialStones(), 7, 1, {
    cancelled: () => cancelled, yield: async () => { cancelled = true; },
  });
  assert.equal(result, null);
});
