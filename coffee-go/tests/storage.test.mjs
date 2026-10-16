import test from "node:test";
import assert from "node:assert/strict";
import { newProgress, chooseStarter } from "../engine.mjs";
import { loadProgress, saveProgress, KEY } from "../storage.mjs";
function memory() {
  const m = new Map([["other-game", "keep"]]);
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
}
test("roundtrip retains pets without touching other games", () => {
  let m = memory(),
    s = chooseStarter(newProgress(), "latte", "first").state;
  assert.equal(saveProgress(m, s).ok, true);
  assert.deepEqual(loadProgress(m).state, s);
  assert.equal(m.getItem("other-game"), "keep");
});
test("corrupt and malformed saves remain untouched", () => {
  for (const raw of [
    "{",
    JSON.stringify({ ...newProgress(), balls: { basic: -1 } }),
  ]) {
    const m = memory();
    m.setItem(KEY, raw);
    assert.equal(loadProgress(m).status, "corrupt");
    assert.equal(m.getItem(KEY), raw);
  }
});
test("blocked storage returns recoverable status without throwing", () => {
  const m = {
    getItem() {
      throw Error("blocked");
    },
    setItem() {
      throw Error("full");
    },
  };
  assert.equal(loadProgress(m).status, "blocked");
  assert.equal(saveProgress(m, newProgress()).ok, false);
});
