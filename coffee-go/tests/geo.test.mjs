import test from "node:test";
import assert from "node:assert/strict";
import {
  distanceMeters,
  ingestFix,
  canInteract,
  watchLocation,
} from "../geo.mjs";
import { nearbyEntities } from "../spawns.mjs";
import { newProgress } from "../engine.mjs";
const now = 200000;
const fix = {
  lat: 37.5665,
  lng: 126.978,
  accuracy: 5,
  timestamp: now,
  speedMps: 0,
};
test("GPS age, accuracy and 80m range gate interactions", () => {
  const good = ingestFix(null, fix, now),
    e = { ...fix, expiresAt: now + 10000 };
  assert.equal(canInteract(good, e, now).ok, true);
  assert.equal(
    canInteract(ingestFix(null, { ...fix, accuracy: 51 }, now), e, now).ok,
    false,
  );
  assert.equal(canInteract(good, e, now + 30001).ok, false);
  assert.equal(canInteract(good, { ...e, lat: e.lat + 0.001 }, now).ok, false);
  assert.equal(canInteract(good, { ...e, expiresAt: now - 1 }, now).ok, false);
  assert.ok(distanceMeters(fix, { ...fix, lat: fix.lat + 0.001 }) > 110);
});
test("invalid coordinates and stale timestamps do not award distance", () => {
  for (const f of [
    { ...fix, lat: NaN },
    { ...fix, lng: 181 },
    { ...fix, accuracy: -1 },
    { ...fix, timestamp: now - 31000 },
  ]) {
    const g = ingestFix(null, f, now);
    assert.notEqual(g.status, "ready");
    assert.equal(g.distanceM, 0);
  }
  assert.equal(ingestFix(null, fix, now).distanceM, 0);
});
test("jitter and reconnect do not count walking; real walking does", () => {
  const g = ingestFix(null, fix, now);
  const jitter = ingestFix(
    g,
    { ...fix, lat: fix.lat + 0.00002, timestamp: now + 10000 },
    now + 10000,
  );
  assert.equal(jitter.distanceM, 0);
  const walking = ingestFix(
    g,
    { ...fix, lat: fix.lat + 0.0003, timestamp: now + 30000 },
    now + 30000,
  );
  assert.ok(walking.distanceM > 20);
  assert.equal(
    ingestFix(null, { ...fix, lat: fix.lat + 0.1 }, now).distanceM,
    0,
  );
});
test("sustained speed locks interaction and never awards distance", () => {
  let g = ingestFix(null, fix, now);
  for (let i = 1; i <= 2; i++)
    g = ingestFix(
      g,
      {
        ...fix,
        lat: fix.lat + i * 0.001,
        timestamp: now + i * 1000,
        speedMps: 30,
      },
      now + i * 1000,
    );
  assert.equal(g.movingTooFast, true);
  assert.equal(g.distanceM, 0);
  assert.equal(
    canInteract(g, { ...g.fix, expiresAt: now + 99999 }, now + 2000).ok,
    false,
  );
});
test("watcher maps permission errors, stops callbacks and resumes fresh", () => {
  let ok,
    err,
    cleared = false;
  const geo = {
    watchPosition(a, b) {
      ok = a;
      err = b;
      return 3;
    },
    clearWatch() {
      cleared = true;
    },
  };
  const states = [];
  const w = watchLocation({
    geolocation: geo,
    onState: (s) => states.push(s),
    now: () => now,
  });
  w.start();
  err({ code: 1 });
  assert.equal(states.at(-1).status, "denied");
  w.resume();
  ok({
    coords: { latitude: fix.lat, longitude: fix.lng, accuracy: 5, speed: null },
    timestamp: now,
  });
  assert.equal(states.at(-1).status, "ready");
  w.stop();
  const count = states.length;
  ok({ coords: { latitude: 1, longitude: 1, accuracy: 5 }, timestamp: now });
  assert.equal(states.length, count);
  assert.ok(cleared);
});
test("spawns are stable, nearby, expired by bucket and caught excluded", () => {
  const s = newProgress(),
    a = nearbyEntities(fix, now, s);
  assert.deepEqual(a, nearbyEntities(fix, now, s));
  assert.ok(a.filter((e) => e.kind === "wild").length >= 8);
  assert.ok(a.every((e) => distanceMeters(fix, e) <= 80));
  assert.ok(a.some((e) => e.kind === "raid" && e.tier === 1));
  s.caughtIds.push(a[0].id);
  assert.ok(!nearbyEntities(fix, now, s).some((e) => e.id === a[0].id));
  assert.notEqual(nearbyEntities(fix, now + 600000, s)[0].id, a[0].id);
});
