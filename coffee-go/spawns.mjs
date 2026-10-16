import { SPECIES } from "./data.mjs?v=discovery2";
export function hash(str) {
  let n = 2166136261;
  for (const c of str) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}
export function seeded(seed) {
  let n = seed;
  return () => {
    n += 0x6d2b79f5;
    let t = n;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function nearbyEntities(fix, now, progress) {
  if (!fix) return [];
  const latCell = Math.floor(fix.lat * 2000),
    lngCell = Math.floor(fix.lng * 2000),
    region = `${latCell}:${lngCell}`,
    bucket = Math.floor(now / 600000),
    rng = seeded(hash(`${region}:${bucket}`));
  const center = { lat: (latCell + 0.5) / 2000, lng: (lngCell + 0.5) / 2000 },
    offset = (radius, angle) => ({
      lat: center.lat + (Math.cos(angle) * radius) / 111195,
      lng:
        center.lng +
        (Math.sin(angle) * radius) /
          (111195 * Math.max(0.01, Math.cos((center.lat * Math.PI) / 180))),
    });
  const names = Object.keys(SPECIES),
    entities = [];
  for (let i = 0; i < 9; i++) {
    const speciesId = names[(i + hash(region) + bucket * 5) % names.length];
    entities.push({
      id: `${region}:${bucket}:wild:${i}`,
      kind: "wild",
      speciesId,
      shiny: hash(`${region}:${bucket}:wild:${i}:shiny`) % 64 === 0,
      level: 2 + Math.floor(rng() * 7),
      iv: {
        attack: Math.floor(rng() * 16),
        defense: Math.floor(rng() * 16),
        stamina: Math.floor(rng() * 16),
      },
      ...offset(23 + rng() * 7, (i * Math.PI * 2) / 9),
      expiresAt: (bucket + 1) * 600000,
    });
  }
  entities.push({
    id: `${region}:supply`,
    kind: "supply",
    ...offset(12, 0),
    expiresAt: Infinity,
  });
  for (let tier = 1; tier <= 3; tier++)
    entities.push({
      id: `${region}:${bucket}:raid:${tier}`,
      kind: "raid",
      speciesId: {
        1: ["espresso", "pudding", "cocoa"],
        2: ["popcorn", "icewolf", "thunderhawk"],
        3: ["dragon", "phoenix", "crystaldragon"],
      }[tier][(hash(region) + bucket) % 3],
      shiny: hash(`${region}:${bucket}:raid:${tier}:shiny`) % 32 === 0,
      tier,
      ...offset(28, (tier - 1) * 2.1 + 0.3),
      expiresAt: (bucket + 1) * 600000,
    });
  return entities.filter(
    (e) =>
      !progress.caughtIds.includes(e.id) && !progress.wonRaidIds.includes(e.id),
  );
}
