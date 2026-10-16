import { copy, fail, success, clamp } from "./data.mjs";
import { stats } from "./engine.mjs";
export function raidStats(tier) {
  const [attack, defense, hp] = {
    1: [120, 42, 1488],
    2: [220, 120, 1722],
    3: [350, 250, 2041],
  }[tier] || [120, 42, 1488];
  return {
    attack,
    defense,
    hp,
    cp: Math.floor((attack * Math.sqrt(defense * hp)) / 10),
  };
}
export function createBattle(state, raid, petIds, now) {
  if (
    raid.kind !== "raid" ||
    !Number.isInteger(raid.tier) ||
    raid.tier < 1 ||
    raid.tier > 3 ||
    raid.expiresAt <= now ||
    state.wonRaidIds.includes(raid.id)
  )
    return fail(state, "레이드가 종료됐어요.");
  if (
    petIds.length !== 6 ||
    new Set(petIds).size !== 6 ||
    petIds.some((id) => !state.pets.some((p) => p.id === id))
  )
    return fail(state, "서로 다른 동료 6마리를 선택해 주세요.");
  const boss = raidStats(raid.tier);
  return {
    ok: true,
    battle: {
      raid: copy(raid),
      boss,
      bossHp: boss.hp,
      roster: petIds.map((id) => {
        const pet = copy(state.pets.find((p) => p.id === id)),
          s = stats(pet);
        return { pet, stats: s, hp: s.hp };
      }),
      active: 0,
      energy: 0,
      elapsed: 0,
      lastAttack: -1,
      lastCharge: -1,
      dodgeUntil: -1,
      lastDodge: -2,
      nextBoss: 3,
      telegraph: false,
      result: null,
      damage: 0,
    },
  };
}
export function stepBattle(input, dt, action = "none") {
  if (input.result) return input;
  const b = copy(input);
  const end = Math.min(
    180,
    b.elapsed + Math.max(0, Number.isFinite(dt) ? dt : 0),
  );
  while (b.elapsed < end && !b.result) {
    b.elapsed = Math.min(end, b.elapsed + 0.1);
    if (b.elapsed + 1e-8 >= b.nextBoss) {
      const p = b.roster[b.active],
        heavy = Math.round(b.nextBoss / 3) % 3 === 0;
      const hit = Math.max(
        2,
        Math.floor((b.boss.attack / p.stats.defense) * (heavy ? 22 : 13)),
      );
      p.hp = Math.max(
        0,
        p.hp - Math.ceil(hit * (b.dodgeUntil >= b.elapsed ? 0.2 : 1)),
      );
      b.nextBoss += 3;
      if (p.hp <= 0) {
        b.active++;
        b.energy = 0;
        if (b.active >= 6) {
          b.active = 5;
          b.result = "lost";
        }
      }
    }
  }
  if (!b.result && b.elapsed >= 180) b.result = "lost";
  if (!b.result) {
    const p = b.roster[b.active];
    if (action === "dodge" && b.elapsed - b.lastDodge >= 1) {
      b.dodgeUntil = b.elapsed + 0.6;
      b.lastDodge = b.elapsed;
    }
    if (action === "attack" && b.elapsed - b.lastAttack >= 0.499) {
      const hit = Math.max(
        1,
        Math.floor((p.stats.attack / b.boss.defense) * 9),
      );
      b.bossHp = Math.max(0, b.bossHp - hit);
      b.damage += hit;
      b.energy = clamp(b.energy + 10, 0, 100);
      b.lastAttack = b.elapsed;
    }
    if (
      action === "charged" &&
      b.energy >= 100 &&
      b.elapsed - b.lastCharge >= 0.5
    ) {
      const hit = Math.max(
        1,
        Math.floor((p.stats.attack / b.boss.defense) * 70),
      );
      b.bossHp = Math.max(0, b.bossHp - hit);
      b.damage += hit;
      b.energy = 0;
      b.lastCharge = b.elapsed;
    }
    if (b.bossHp <= 0) b.result = "won";
  }
  b.telegraph = !b.result && b.nextBoss - b.elapsed <= 1;
  return b;
}
export function finishRaid(state, battle, id) {
  if (
    battle.result !== "won" ||
    state.wonRaidIds.includes(battle.raid.id) ||
    state.pendingEncounter
  )
    return fail(state, "이미 받은 보상이거나 끝나지 않은 전투예요.");
  const s = copy(state),
    tier = battle.raid.tier;
  s.wonRaidIds.push(battle.raid.id);
  s.metrics.raids++;
  s.dust += tier * 500;
  s.xp += tier * 500;
  s.pendingEncounter = {
    sourceId: `${battle.raid.id}:reward`,
    attempts: 0,
    boss: true,
    pet: {
      id,
      speciesId: battle.raid.speciesId,
      level: 5 + tier * 2,
      iv: { attack: 12, defense: 12, stamina: 12 },
    },
  };
  return success(s, { dust: tier * 500 });
}
