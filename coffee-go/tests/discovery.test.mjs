import test from "node:test";
import assert from "node:assert/strict";
import * as engine from "../engine.mjs";
import * as data from "../data.mjs";
import * as combat from "../battle.mjs";
import { nearbyEntities } from "../spawns.mjs";
import { loadProgress, saveProgress, KEY } from "../storage.mjs";
const pet = {
  id: "wild",
  speciesId: "coffee",
  level: 5,
  iv: { attack: 10, defense: 10, stamina: 10 },
  shiny: true,
};
const encounter = () =>
  engine.beginEncounter(
    engine.chooseStarter(engine.newProgress(), "coffee", "starter").state,
    pet,
  ).state;
const fix = { lat: 37.5665, lng: 126.978 };
test("all new species can be encountered and caught without losing their identity", () => {
  const seen = new Set();
  for (let i = 0; i < 36; i++)
    for (const e of nearbyEntities(fix, i * 600000, engine.newProgress()))
      if (e.kind === "wild") seen.add(e.speciesId);
  for (const id of [
    "pudding",
    "cookie",
    "brownSugar",
    "mint",
    "cocoa",
    "icewolf",
    "phoenix",
    "thunderhawk",
    "crystaldragon",
  ]) {
    assert.ok(seen.has(id), `reachable ${id}`);
    const s = engine.beginEncounter(engine.newProgress(), {
      ...pet,
      speciesId: id,
    }).state;
    const r = engine.throwBall(s, {
      ball: "basic",
      hit: true,
      rng: () => 0,
      id: "caught",
    });
    assert.equal(r.state.pets[0].speciesId, id);
    assert.ok(engine.stats(r.state.pets[0]).cp > 0);
  }
});
test("shiny identity is deterministic, uncommon, and survives capture plus storage", () => {
  const s = engine.newProgress();
  let shiny = 0,
    total = 0;
  for (let i = 0; i < 80; i++) {
    const world = nearbyEntities(fix, i * 600000, s);
    assert.deepEqual(world, nearbyEntities(fix, i * 600000, s));
    for (const e of world.filter((e) => e.kind === "wild")) {
      total++;
      if (e.shiny) shiny++;
    }
  }
  assert.ok(shiny > 0 && shiny < total / 10);
  const r = engine.throwBall(encounter(), {
    ball: "basic",
    hit: true,
    rng: () => 0,
    id: "shiny",
  });
  assert.equal(r.state.pets.at(-1).shiny, true);
  let raw;
  const storage = { getItem: () => raw, setItem: (_, v) => (raw = v) };
  assert.ok(saveProgress(storage, r.state).ok);
  assert.equal(loadProgress(storage).state.pets.at(-1).shiny, true);
});
test("capture berry changes an actual throw outcome and cannot be stacked", () => {
  const s = encounter();
  const base = engine.captureChance(pet, "basic");
  const rolled = base + 0.03;
  assert.equal(
    engine.throwBall(s, {
      ball: "basic",
      hit: true,
      rng: () => rolled,
      id: "no-berry",
    }).result.kind,
    "escaped",
  );
  const fed = engine.feedBerry(s, "catch");
  assert.ok(fed.ok);
  assert.equal(fed.state.berries.catch, s.berries.catch - 1);
  assert.equal(engine.feedBerry(fed.state, "calm").ok, false);
  assert.equal(
    engine.throwBall(fed.state, {
      ball: "basic",
      hit: true,
      rng: () => rolled,
      id: "berry",
    }).result.kind,
    "caught",
  );
  assert.equal(s.pendingEncounter.berry, undefined);
});
test("calming berry lowers flee risk, persists through misses, and ends on a failed hit", () => {
  const s = engine.feedBerry(encounter(), "calm").state;
  const miss = engine.throwBall(s, { ball: "basic", hit: false, id: "miss" });
  assert.equal(miss.state.pendingEncounter.berry, "calm");
  let rolls = [0.99, 0.05];
  const fail = engine.throwBall(miss.state, {
    ball: "basic",
    hit: true,
    rng: () => rolls.shift(),
    id: "x",
  });
  assert.equal(fail.result.kind, "escaped");
  assert.equal(fail.state.pendingEncounter.berry, null);
  rolls = [0.99, 0.05];
  assert.equal(
    engine.throwBall(fail.state, {
      ball: "basic",
      hit: true,
      rng: () => rolls.shift(),
      id: "y",
    }).result.kind,
    "fled",
  );
});
test("invalid or depleted berries do not consume inventory; supply replenishes without rare balls", () => {
  const s = encounter();
  s.berries.catch = 0;
  assert.equal(engine.feedBerry(s, "catch").ok, false);
  assert.equal(engine.feedBerry(s, "unknown").ok, false);
  assert.equal(engine.feedBerry(engine.newProgress(), "calm").ok, false);
  const r = engine.collectSupply(s, { kind: "supply", id: "stop" }, 1000);
  assert.equal(r.state.berries.catch, 1);
  assert.equal(r.state.berries.calm, s.berries.calm + 1);
  assert.equal(r.state.balls.hyper, 0);
  assert.equal(r.state.balls.master, 0);
  assert.equal(
    engine.collectSupply(r.state, { kind: "supply", id: "stop" }, 1001).ok,
    false,
  );
});
test("old saves migrate once while preserving pets, pending encounter and earned master", () => {
  const old = encounter();
  old.version = 1;
  delete old.berries;
  old.balls.master = 1;
  old.research.claims.special = "life";
  let raw = JSON.stringify(old);
  const memory = {
    getItem: (k) => (k === KEY ? raw : null),
    setItem: (_, v) => (raw = v),
  };
  const r = loadProgress(memory);
  assert.equal(r.status, "ok");
  assert.equal(r.state.version, 2);
  assert.deepEqual(r.state.pets, old.pets);
  assert.deepEqual(r.state.pendingEncounter, old.pendingEncounter);
  assert.equal(r.state.balls.master, 1);
  assert.equal(r.state.research.claims.special, "life");
  assert.deepEqual(r.state.berries, { catch: 3, calm: 3 });
  r.state.berries.catch = 0;
  assert.ok(saveProgress(memory, r.state).ok);
  assert.equal(loadProgress(memory).state.berries.catch, 0);
});
test("malformed new inventory and variant data remain recoverable corrupt saves", () => {
  for (const change of [
    (s) => (s.berries.catch = -1),
    (s) => (s.pets[0].shiny = "yes"),
    (s) => (s.pendingEncounter.berry = "infinite"),
  ]) {
    const s = encounter();
    change(s);
    const raw = JSON.stringify(s);
    assert.equal(loadProgress({ getItem: () => raw }).status, "corrupt");
  }
});
test("type advantage and resistance change actual attack damage and recommendations", () => {
  const s = engine.newProgress();
  s.pets = Array.from({ length: 6 }, (_, i) => ({
    ...pet,
    id: "p" + i,
    speciesId: "mint",
  }));
  const raid = {
    id: "raid",
    kind: "raid",
    speciesId: "phoenix",
    tier: 1,
    expiresAt: 900000,
  };
  const ids = s.pets.map((p) => p.id);
  const b = combat.createBattle(s, raid, ids, 1000).battle;
  const strong = combat.stepBattle(b, 0, "attack");
  const neutral = structuredClone(b);
  neutral.raid.speciesId = "coffee";
  const normal = combat.stepBattle(neutral, 0, "attack");
  const resistant = structuredClone(b);
  resistant.raid.speciesId = "cookie";
  const weak = combat.stepBattle(resistant, 0, "attack");
  assert.ok(strong.damage > normal.damage);
  assert.ok(weak.damage < normal.damage);
  assert.equal(data.typeMultiplier("물", "불꽃"), 1.6);
  assert.equal(data.typeMultiplier("물", "풀"), 0.625);
  s.pets[0].speciesId = "summer";
  s.pets[1].speciesId = "mint";
  assert.ok(
    combat.raidScore(s.pets[1], raid) > combat.raidScore(s.pets[0], raid),
  );
});
test("boss attacks also respect type weaknesses", () => {
  const s = engine.newProgress();
  s.pets = Array.from({ length: 6 }, (_, i) => ({
    ...pet,
    id: "p" + i,
    speciesId: "cookie",
  }));
  const b = combat.createBattle(
    s,
    { id: "r", kind: "raid", speciesId: "phoenix", tier: 1, expiresAt: 900000 },
    s.pets.map((p) => p.id),
    1000,
  ).battle;
  const fire = combat.stepBattle(b, 3.1);
  const neutral = structuredClone(b);
  neutral.raid.speciesId = "oreo";
  const other = combat.stepBattle(neutral, 3.1);
  assert.ok(fire.roster[0].hp < other.roster[0].hp);
});
test("rotating raid bosses include new species and retain shiny reward identity", () => {
  const seen = new Set();
  let shinyRaid;
  for (let i = 0; i < 120; i++)
    for (const e of nearbyEntities(fix, i * 600000, engine.newProgress()))
      if (e.kind === "raid") {
        seen.add(e.speciesId);
        if (e.shiny) shinyRaid = e;
      }
  for (const id of ["icewolf", "phoenix", "thunderhawk", "crystaldragon"])
    assert.ok(seen.has(id));
  assert.ok(shinyRaid);
  const r = combat.finishRaid(
    engine.newProgress(),
    { result: "won", raid: shinyRaid },
    "reward",
  );
  assert.equal(r.state.pendingEncounter.pet.shiny, true);
});
