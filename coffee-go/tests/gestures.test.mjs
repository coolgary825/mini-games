import test from "node:test";
import assert from "node:assert/strict";
import { gradeThrow } from "../gestures.mjs";
const target = { x: 200, y: 350, radius: 100 };
test("short and cancelled gestures do not hit", () => {
  assert.equal(gradeThrow([], target, 40).hit, false);
  assert.equal(
    gradeThrow(
      [
        { x: 200, y: 700, t: 0 },
        { x: 201, y: 698, t: 20 },
      ],
      target,
      40,
    ).hit,
    false,
  );
});
test("aimed throw hits and accuracy rewards a small circle", () => {
  const p = [
    { x: 200, y: 700, t: 0 },
    { x: 200, y: 400, t: 300 },
  ];
  assert.equal(gradeThrow(p, target, 40).hit, true);
  assert.equal(gradeThrow(p, target, 25).grade, "excellent");
  assert.equal(gradeThrow(p, target, 65).grade, "nice");
});
test("sideways throws miss rather than automatic catch", () => {
  assert.equal(
    gradeThrow(
      [
        { x: 200, y: 700, t: 0 },
        { x: 500, y: 500, t: 200 },
      ],
      target,
      40,
    ).hit,
    false,
  );
});
