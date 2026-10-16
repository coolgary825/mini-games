import {
  SPECIES,
  BALLS,
  BERRIES,
  clamp,
  copy,
  fail,
  success,
} from "./data.mjs?v=discovery2";
export function newProgress() {
  return {
    version: 2,
    berries: { catch: 3, calm: 3 },
    starterChosen: false,
    pets: [],
    balls: { basic: 30, super: 5, hyper: 0, master: 0 },
    dust: 300,
    xp: 0,
    discovered: [],
    caughtIds: [],
    wonRaidIds: [],
    supplyTimes: {},
    pendingEncounter: null,
    research: { claims: {}, windows: {} },
    metrics: { caught: 0, great: 0, excellent: 0, raids: 0 },
    distanceM: 0,
  };
}
export function stats(pet) {
  const s = SPECIES[pet.speciesId],
    m = 0.35 + pet.level * 0.09;
  const attack = Math.floor((s.attack + pet.iv.attack) * m),
    defense = Math.floor((s.defense + pet.iv.defense) * m),
    hp = Math.floor((s.hp + pet.iv.stamina) * m);
  return {
    attack,
    defense,
    hp,
    cp: Math.max(10, Math.floor((attack * Math.sqrt(defense * hp)) / 10)),
  };
}
export function chooseStarter(state, speciesId, id) {
  if (state.starterChosen || !["coffee", "mocha", "latte"].includes(speciesId))
    return fail(state, "첫 동료는 한 번만 선택할 수 있어요.");
  const s = copy(state);
  s.starterChosen = true;
  s.pets.push({
    id,
    speciesId,
    level: 5,
    iv: { attack: 10, defense: 10, stamina: 10 },
  });
  s.discovered.push(speciesId);
  return success(s);
}
export function captureChance(pet, ball, grade = "normal", berry = null) {
  if (ball === "master") return 1;
  if (!BALLS[ball]) return 0;
  const base = clamp(
    0.62 - stats(pet).cp / 7000 - SPECIES[pet.speciesId].rarity * 0.06,
    0.12,
    0.65,
  );
  return Math.min(
    0.95,
    base *
      BALLS[ball].factor *
      (BERRIES[berry]?.factor || 1) *
      ({ normal: 1, nice: 1.15, great: 1.35, excellent: 1.65 }[grade] || 1),
  );
}
export function beginEncounter(state, entity) {
  if (
    !SPECIES[entity.speciesId] ||
    state.pendingEncounter ||
    state.caughtIds.includes(entity.id)
  )
    return fail(state, "이미 끝났거나 진행 중인 만남이에요.");
  const s = copy(state);
  s.pendingEncounter = {
    sourceId: entity.id,
    pet: {
      id: entity.id,
      speciesId: entity.speciesId,
      level: entity.level,
      iv: entity.iv,
      shiny: !!entity.shiny,
    },
    attempts: 0,
    boss: entity.boss || false,
  };
  return success(s);
}
export function throwBall(
  state,
  { ball, grade = "normal", hit = false, rng = Math.random, id },
) {
  if (!state.pendingEncounter || !BALLS[ball] || !(state.balls[ball] > 0))
    return fail(state, "사용할 볼이 없어요.");
  const s = copy(state),
    e = s.pendingEncounter;
  s.balls[ball]--;
  e.attempts++;
  if (ball !== "master" && !hit) return success(s, { kind: "miss" });
  if (grade === "great" || grade === "excellent") s.metrics.great++;
  if (grade === "excellent") s.metrics.excellent++;
  if (ball === "master" || rng() < captureChance(e.pet, ball, grade, e.berry)) {
    const pet = { ...e.pet, id };
    s.pets.push(pet);
    if (!s.discovered.includes(pet.speciesId)) s.discovered.push(pet.speciesId);
    s.caughtIds.push(e.sourceId);
    s.metrics.caught++;
    s.dust += 100;
    s.xp += 100 + (grade === "excellent" ? 100 : grade === "great" ? 50 : 0);
    s.pendingEncounter = null;
    return success(s, { kind: "caught", pet, dust: 100 });
  }
  const fleeChance = e.berry === "calm" ? 0.02 : 0.09;
  e.berry = null;
  if (rng() < fleeChance) {
    s.caughtIds.push(e.sourceId);
    s.pendingEncounter = null;
    return success(s, { kind: "fled" });
  }
  return success(s, { kind: "escaped" });
}
export function leaveEncounter(state) {
  const s = copy(state);
  s.pendingEncounter = null;
  return success(s);
}
export function upgradeCost(pet) {
  return 100 + pet.level * 40;
}
export function upgradePet(state, id) {
  const p = state.pets.find((p) => p.id === id);
  if (!p || p.level >= 40) return fail(state, "더 강화할 수 없어요.");
  const cost = upgradeCost(p);
  if (state.dust < cost) return fail(state, "별가루가 부족해요.");
  const s = copy(state);
  s.dust -= cost;
  s.pets.find((p) => p.id === id).level++;
  return success(s);
}
export function collectSupply(state, entity, now) {
  if (entity.kind !== "supply") return fail(state, "보급소가 아니에요.");
  const last = state.supplyTimes[entity.id];
  if (last != null && now - last < 300000)
    return fail(
      state,
      `보급까지 ${Math.ceil((300000 - (now - last)) / 1000)}초 남았어요.`,
    );
  const s = copy(state);
  s.supplyTimes[entity.id] = now;
  s.balls.basic += 5;
  s.berries.catch++;
  s.berries.calm++;
  return success(s, { basic: 5 });
}

export function feedBerry(state, berry) {
  if (!state.pendingEncounter || !BERRIES[berry] || !(state.berries[berry] > 0))
    return fail(state, "사용할 열매가 없어요.");
  if (state.pendingEncounter.berry)
    return fail(state, "이미 열매를 먹었어요. 다음 명중까지 효과가 유지돼요.");
  const s = copy(state);
  s.berries[berry]--;
  s.pendingEncounter.berry = berry;
  return success(s);
}
