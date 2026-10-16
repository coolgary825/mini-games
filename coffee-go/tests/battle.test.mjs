import test from "node:test";
import assert from "node:assert/strict";
import { newProgress, stats } from "../engine.mjs";
import { createBattle, stepBattle, finishRaid, raidStats } from "../battle.mjs";
const now = 1000;
const raid = {
  id: "raid-1",
  kind: "raid",
  speciesId: "espresso",
  tier: 1,
  expiresAt: 900000,
};
export function team(level = 5) {
  const s = newProgress();
  s.starterChosen = true;
  for (let i = 0; i < 6; i++)
    s.pets.push({
      id: `p${i}`,
      speciesId: "coffee",
      level,
      iv: { attack: 8, defense: 8, stamina: 8 },
    });
  s.discovered = ["coffee"];
  return s;
}
const ids = Array.from({ length: 6 }, (_, i) => `p${i}`);
export function fight(level, tier) {
  const s = team(level);
  let b = createBattle(s, { ...raid, tier }, ids, now).battle;
  for (let i = 0; i < 1800 && !b.result; i++)
    b = stepBattle(
      b,
      0.1,
      b.energy >= 100 ? "charged" : b.telegraph ? "dodge" : "attack",
    );
  return b;
}
test("raid enforces exactly six distinct owned pets and a live boss", () => {
  const s = team();
  assert.equal(createBattle(s, raid, ids.slice(0, 5), now).ok, false);
  assert.equal(
    createBattle(s, raid, [...ids.slice(0, 5), "p0"], now).ok,
    false,
  );
  assert.equal(
    createBattle(s, raid, [...ids.slice(0, 5), "alien"], now).ok,
    false,
  );
  assert.equal(
    createBattle(s, { ...raid, expiresAt: now }, ids, now).ok,
    false,
  );
  assert.equal(createBattle(s, raid, ids, now).ok, true);
});
test("attack cooldown, charged cost and dodge affect real combat", () => {
  const b = createBattle(team(), raid, ids, now).battle;
  const a = stepBattle(b, 0, "attack");
  assert.ok(a.bossHp < b.bossHp);
  assert.equal(a.energy, 10);
  assert.equal(stepBattle(a, 0, "attack").bossHp, a.bossHp);
  assert.equal(stepBattle(a, 0, "charged").bossHp, a.bossHp);
  const c = stepBattle({ ...a, energy: 100 }, 0, "charged");
  assert.equal(c.energy, 0);
  assert.ok(c.bossHp < a.bossHp);
  const warned = stepBattle(b, 2.8, "none"),
    dodged = stepBattle(warned, 0.1, "dodge");
  assert.ok(
    stepBattle(dodged, 0.2, "none").roster[0].hp >
      stepBattle(warned, 0.3, "none").roster[0].hp,
  );
});
test("fainting rotates roster; timeout loses without removing collection", () => {
  let b = createBattle(team(), raid, ids, now).battle;
  b.roster[0].hp = 1;
  b = stepBattle(b, 3.1, "none");
  assert.equal(b.active, 1);
  assert.equal(stepBattle(b, 180, "none").result, "lost");
  assert.equal(team().pets.length, 6);
});
test("early six-pet team beats tier 1; stronger team wins faster; tier 3 needs growth", () => {
  const early = fight(5, 1),
    grown = fight(20, 1);
  assert.equal(early.result, "won");
  assert.equal(grown.result, "won");
  assert.ok(grown.elapsed < early.elapsed);
  assert.equal(fight(5, 3).result, "lost");
  assert.equal(fight(35, 3).result, "won");
  for (const [tier, target] of [
    [1, 3000],
    [2, 10000],
    [3, 25000],
  ])
    assert.ok(Math.abs(raidStats(tier).cp - target) < 100);
});
test("raid rewards and boss encounter are atomic and cannot repeat", () => {
  const s = team(),
    b = fight(5, 1);
  const r = finishRaid(s, b, "reward-pet");
  assert.equal(r.ok, true);
  assert.equal(r.state.metrics.raids, 1);
  assert.ok(r.state.pendingEncounter.boss);
  assert.equal(finishRaid(r.state, b, "again").ok, false);
  assert.equal(finishRaid(s, { ...b, result: "lost" }, "x").ok, false);
});
test("caught raid pet has ordinary CP below its boss form", () => {
  const r = finishRaid(team(), fight(5, 1), "boss");
  assert.ok(stats(r.state.pendingEncounter.pet).cp < raidStats(1).cp);
});
