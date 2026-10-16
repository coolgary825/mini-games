import { newProgress } from "./engine.mjs?v=discovery2";
import { SPECIES, BALLS, BERRIES } from "./data.mjs?v=discovery2";
export const KEY = "junwoo-coffee-go-v1";
const nonneg = (x) => Number.isSafeInteger(x) && x >= 0;
const ids = (x) => Array.isArray(x) && x.every((v) => typeof v === "string");
function petOK(p) {
  return (
    p &&
    typeof p.id === "string" &&
    (p.shiny === undefined || typeof p.shiny === "boolean") &&
    SPECIES[p.speciesId] &&
    Number.isInteger(p.level) &&
    p.level >= 1 &&
    p.level <= 40 &&
    p.iv &&
    ["attack", "defense", "stamina"].every(
      (k) => Number.isInteger(p.iv[k]) && p.iv[k] >= 0 && p.iv[k] <= 15,
    )
  );
}
export function validProgress(s, { legacy = false } = {}) {
  return !!(
    s &&
    (s.version === 2 || (legacy && s.version === 1)) &&
    (s.version === 1 ||
      (s.berries && Object.keys(BERRIES).every((k) => nonneg(s.berries[k])))) &&
    typeof s.starterChosen === "boolean" &&
    Array.isArray(s.pets) &&
    s.pets.every(petOK) &&
    new Set(s.pets.map((p) => p.id)).size === s.pets.length &&
    s.balls &&
    Object.keys(BALLS).every((k) => nonneg(s.balls[k])) &&
    nonneg(s.dust) &&
    nonneg(s.xp) &&
    Number.isFinite(s.distanceM) &&
    s.distanceM >= 0 &&
    ids(s.discovered) &&
    s.discovered.every((k) => SPECIES[k]) &&
    ids(s.caughtIds) &&
    ids(s.wonRaidIds) &&
    s.supplyTimes &&
    Object.values(s.supplyTimes).every(nonneg) &&
    s.metrics &&
    ["caught", "great", "excellent", "raids"].every((k) =>
      nonneg(s.metrics[k]),
    ) &&
    s.research?.claims &&
    s.research?.windows &&
    Object.values(s.research.claims).every(
      (v) => typeof v === "string" || Number.isFinite(v),
    ) &&
    Object.values(s.research.windows).every(
      (w) =>
        w &&
        Number.isFinite(w.started) &&
        typeof w.key === "string" &&
        w.baseline &&
        ["caught", "great", "excellent", "raids"].every((k) =>
          nonneg(w.baseline[k]),
        ),
    ) &&
    (s.pendingEncounter === null ||
      (petOK(s.pendingEncounter?.pet) &&
        typeof s.pendingEncounter.sourceId === "string" &&
        nonneg(s.pendingEncounter.attempts) &&
        (s.pendingEncounter.berry == null ||
          Object.hasOwn(BERRIES, s.pendingEncounter.berry))))
  );
}
export function loadProgress(storage) {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return { status: "new", state: newProgress() };
    try {
      const s = JSON.parse(raw);
      if (!validProgress(s, { legacy: true })) throw Error();
      if (s.version === 1) {
        s.version = 2;
        s.berries = { catch: 3, calm: 3 };
      }
      return { status: "ok", state: s };
    } catch {
      return { status: "corrupt", state: null, raw };
    }
  } catch {
    return { status: "blocked", state: newProgress() };
  }
}
export function saveProgress(storage, state) {
  try {
    if (!validProgress(state))
      return { ok: false, error: "저장할 기록을 확인할 수 없어요." };
    storage.setItem(KEY, JSON.stringify(state));
    return { ok: true };
  } catch {
    return {
      ok: false,
      error:
        "이 기기에 저장할 수 없어요. 현재 플레이는 계속되지만 창을 닫으면 기록이 사라질 수 있어요.",
    };
  }
}
