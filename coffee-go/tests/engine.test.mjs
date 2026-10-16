import test from "node:test";
import assert from "node:assert/strict";
import {
  newProgress,
  chooseStarter,
  stats,
  captureChance,
  beginEncounter,
  throwBall,
  upgradePet,
  collectSupply,
} from "../engine.mjs";
import { SPECIES } from "../data.mjs";
const pet = {
  id: "p",
  speciesId: "coffee",
  level: 4,
  iv: { attack: 8, defense: 8, stamina: 8 },
};
const wild = {
  id: "wild1",
  kind: "wild",
  ...pet,
  id: "wild1",
  expiresAt: 999999,
};
const start = () => chooseStarter(newProgress(), "coffee", "starter").state;
test("new trainer has nine available species and exactly one chosen companion", () => {
  let s = start();
  assert.equal(Object.keys(SPECIES).length, 9);
  assert.deepEqual(s.balls, { basic: 30, super: 5, hyper: 0, master: 0 });
  assert.equal(s.pets.length, 1);
  assert.equal(chooseStarter(s, "mocha", "x").ok, false);
});
test("better balls improve capture; master bypasses miss and caps", () => {
  assert.ok(
    captureChance(pet, "basic", "nice") < captureChance(pet, "super", "nice"),
  );
  assert.ok(
    captureChance(pet, "super", "nice") < captureChance(pet, "hyper", "nice"),
  );
  assert.equal(captureChance(pet, "master", "miss"), 1);
  assert.ok(captureChance(pet, "hyper", "excellent") <= 0.95);
});
test("successful capture consumes once, persists species and cannot replay", () => {
  let s = beginEncounter(start(), wild).state;
  let r = throwBall(s, {
    ball: "basic",
    grade: "great",
    hit: true,
    rng: () => 0,
    id: "caught",
  });
  assert.equal(r.result.kind, "caught");
  assert.equal(r.state.balls.basic, 29);
  assert.equal(r.state.pets.length, 2);
  assert.ok(r.state.caughtIds.includes("wild1"));
  assert.equal(
    throwBall(r.state, { ball: "basic", hit: true, rng: () => 0, id: "again" })
      .ok,
    false,
  );
  assert.equal(beginEncounter(r.state, wild).ok, false);
  assert.equal(s.balls.basic, 30);
});
test("miss consumes a ball; empty inventory and wrong ball preserve state", () => {
  let s = beginEncounter(start(), wild).state;
  let r = throwBall(s, {
    ball: "basic",
    grade: "miss",
    hit: false,
    rng: () => 0.9,
    id: "x",
  });
  assert.equal(r.state.balls.basic, 29);
  assert.equal(r.result.kind, "miss");
  assert.ok(r.state.pendingEncounter);
  s.balls.basic = 0;
  assert.equal(throwBall(s, { ball: "basic", hit: true }).ok, false);
  assert.equal(throwBall(s, { ball: "bogus", hit: true }).ok, false);
});
test("master guarantees catch even with extreme RNG and miss", () => {
  let s = beginEncounter(start(), wild).state;
  s.balls.master = 1;
  const r = throwBall(s, {
    ball: "master",
    grade: "miss",
    hit: false,
    rng: () => 0.99999,
    id: "masterpet",
  });
  assert.equal(r.result.kind, "caught");
  assert.equal(r.state.balls.master, 0);
});
test("failed catch can escape or flee; fled entity cannot reenter", () => {
  let s = beginEncounter(start(), wild).state;
  assert.equal(
    throwBall(s, { ball: "basic", hit: true, rng: () => 0.99, id: "x" }).result
      .kind,
    "escaped",
  );
  let seq = [0.99, 0];
  let r = throwBall(s, {
    ball: "basic",
    hit: true,
    rng: () => seq.shift(),
    id: "x",
  });
  assert.equal(r.result.kind, "fled");
  assert.equal(beginEncounter(r.state, wild).ok, false);
});
test("upgrade consumes dust and increases actual combat stats", () => {
  const s = start();
  s.dust = 1000;
  const before = stats(s.pets[0]);
  const r = upgradePet(s, "starter");
  assert.ok(r.ok);
  assert.ok(r.state.dust < 1000);
  const after = stats(r.state.pets[0]);
  for (const k of ["attack", "defense", "hp", "cp"])
    assert.ok(after[k] > before[k]);
  s.dust = 0;
  assert.equal(upgradePet(s, "starter").ok, false);
});
test("free supply recovers zero balls and rejects repeat or backwards time", () => {
  const s = start();
  s.balls.basic = 0;
  const e = { id: "stop", kind: "supply" };
  const r = collectSupply(s, e, 1000);
  assert.equal(r.state.balls.basic, 5);
  assert.equal(collectSupply(r.state, e, 1001).ok, false);
  assert.equal(collectSupply(r.state, e, 999).ok, false);
  assert.equal(collectSupply(r.state, e, 301000).state.balls.basic, 10);
});
