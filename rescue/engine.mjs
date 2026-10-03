import { LEVELS } from './data.mjs';
import { terrainPieces, walkableSurfaces } from './terrain.mjs';

export function createGame(index = 0) {
  const level = LEVELS[index];
  if (!level) throw new Error('Unknown level');
  return { index, level, status: 'ready', time: 0, speed: 1, placed: {}, history: [], rescued: 0,
    pets: level.pets.map((id, i) => ({ id, x: level.spawn.x, y: level.spawn.y, dir: level.spawn.dir, vy: 0, fallFrom: level.spawn.y, delay: i * 1.6, state: 'waiting', recover: 0, turns: new Set() })) };
}
export function remaining(game, type) {
  return (game.level.supplies[type] || 0) - Object.values(game.placed).filter(t => t === type).length;
}
export function placeTool(game, slotId, type) {
  if (game.status === 'complete') return { ok: false, reason: 'complete' };
  const slot = game.level.slots.find(s => s.id === slotId);
  if (!slot || slot.type !== type) return { ok: false, reason: 'mismatch' };
  if (game.placed[slotId]) return { ok: false, reason: 'occupied' };
  if (remaining(game, type) < 1) return { ok: false, reason: 'empty' };
  game.history.push({ ...game.placed });
  game.placed[slotId] = type;
  return { ok: true };
}
export function undo(game) {
  if (!game.history.length || game.status === 'complete') return false;
  game.placed = game.history.pop();
  for (const pet of game.pets) pet.turns.clear();
  return true;
}
function recover(game, pet, events) {
  pet.state = 'recovering'; pet.recover = 1.4; pet.vy = 0;
  events.push({ type: 'recover', id: pet.id });
}
export function step(game, dt) {
  if (game.status !== 'playing') return [];
  const events = [];
  const delta = Math.min(Math.max(dt, 0), 0.05) * game.speed;
  game.time += delta;
  const ground = walkableSurfaces(game.level, game.placed);
  const solidGround = terrainPieces(game.level, game.placed);
  for (const pet of game.pets) {
    if (pet.state === 'saved') continue;
    if (pet.state === 'recovering') {
      pet.recover -= delta;
      if (pet.recover <= 0) {
        Object.assign(pet, { x: game.level.spawn.x, y: game.level.spawn.y, dir: game.level.spawn.dir, vy: 0, fallFrom: game.level.spawn.y, state: 'walking' });
        pet.turns.clear();
      }
      continue;
    }
    if (pet.state === 'waiting') {
      if (game.time < pet.delay) continue;
      pet.state = 'walking';
    }
    for (const slot of game.level.slots) {
      if (slot.type === 'turn' && game.placed[slot.id] && Math.abs(pet.x - slot.x) < 19 && Math.abs(pet.y - slot.y) < 10 && !pet.turns.has(slot.id)) {
        pet.dir = slot.dir; pet.turns.add(slot.id); events.push({ type: 'turn', id: pet.id });
      }
    }
    const oldY = pet.y;
    const nextX = pet.x + pet.dir * (pet.id === 'latte' ? 35 : 39) * delta;
    const wall = solidGround.find(s => nextX > s.x1 && nextX < s.x2 && pet.y > s.y + 14 && pet.y < s.y + (s.height ?? 560 - s.y));
    if (wall) {
      if (pet.vy === 0 && pet.state !== 'blocked' && pet.state !== 'falling') events.push({ type: 'blocked', id: pet.id });
    } else pet.x = nextX;
    const support = ground.find(s => pet.x >= s.x1 && pet.x <= s.x2 && Math.abs(pet.y - s.y) <= (s.stair ? 13 : 1) && pet.vy === 0);
    if (support) { pet.y = support.y; pet.fallFrom = support.y; pet.state = wall ? 'blocked' : 'walking'; }
    else {
      if (pet.state !== 'falling') { pet.fallFrom = pet.y; pet.state = 'falling'; }
      pet.vy += 470 * delta;
      pet.y += pet.vy * delta;
      const landing = ground.filter(s => pet.x >= s.x1 && pet.x <= s.x2 && oldY <= s.y && pet.y >= s.y).sort((a,b) => a.y-b.y)[0];
      if (landing) {
        const cushion = game.level.slots.find(s => s.type === 'cushion' && game.placed[s.id] && pet.x >= s.x1 && pet.x <= s.x2 && Math.abs(s.y - landing.y) < 5);
        if (landing.y - pet.fallFrom > 85 && !cushion) { recover(game, pet, events); continue; }
        pet.y = landing.y; pet.vy = 0; pet.state = 'walking'; pet.fallFrom = landing.y;
        if (cushion) events.push({ type: 'bounce', id: pet.id, x: pet.x, y: pet.y });
      }
    }
    if (pet.y > 485 || pet.x < 20 || pet.x > 940) { recover(game, pet, events); continue; }
    if (Math.abs(pet.x - game.level.goal.x) < 24 && Math.abs(pet.y - game.level.goal.y) < 12) {
      pet.state = 'saved'; game.rescued++; events.push({ type: 'saved', id: pet.id });
    }
  }
  if (game.rescued === game.pets.length) { game.status = 'complete'; events.push({ type: 'complete' }); }
  return events;
}
