import test from "node:test";
import assert from "node:assert/strict";
import { newProgress } from "../engine.mjs";
import { refreshResearch, questProgress, claimQuest } from "../research.mjs";
const now = new Date(2026, 9, 17, 12).getTime();
function complete() {
  const s = refreshResearch(newProgress(), now);
  s.metrics = { caught: 150, great: 40, excellent: 30, raids: 15 };
  s.discovered = [
    "coffee",
    "mocha",
    "latte",
    "autumn",
    "summer",
    "oreo",
    "popcorn",
    "dragon",
    "espresso",
  ];
  return s;
}
test("quests require every threshold before awarding rare balls", () => {
  const s = complete();
  s.metrics.raids = 2;
  assert.equal(claimQuest(s, "advanced", now).ok, false);
  s.metrics.raids = 3;
  const r = claimQuest(s, "advanced", now);
  assert.equal(r.state.balls.hyper, 3);
  assert.equal(claimQuest(r.state, "advanced", now).ok, false);
  assert.equal(
    questProgress(r.state, now).find((q) => q.id === "advanced").claimed,
    true,
  );
});
test("master is a one-time earned reward across date changes", () => {
  const s = complete();
  s.discovered.pop();
  assert.equal(claimQuest(s, "special", now).ok, false);
  s.discovered.push("espresso");
  const r = claimQuest(s, "special", now);
  assert.equal(r.state.balls.master, 1);
  assert.equal(claimQuest(r.state, "special", now + 8 * 86400000).ok, false);
});
test("daily reset requires new catches, advanced resets after seven days", () => {
  let s = claimQuest(complete(), "daily", now).state;
  assert.equal(s.balls.basic, 40);
  assert.equal(claimQuest(s, "daily", now).ok, false);
  s = refreshResearch(s, now + 86400000);
  assert.equal(claimQuest(s, "daily", now + 86400000).ok, false);
  s.metrics.caught += 5;
  assert.equal(claimQuest(s, "daily", now + 86400000).ok, true);
  let w = claimQuest(complete(), "advanced", now).state;
  w = refreshResearch(w, now + 7 * 86400000);
  assert.equal(claimQuest(w, "advanced", now + 7 * 86400000).ok, false);
});
