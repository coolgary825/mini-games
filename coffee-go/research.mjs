import { QUESTS, copy, fail, success } from "./data.mjs?v=discovery2";
const dayKey = (now) => {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
export function refreshResearch(state, now) {
  const s = copy(state);
  for (const period of ["day", "week"]) {
    const w = s.research.windows[period];
    if (
      !w ||
      (period === "day"
        ? w.key !== dayKey(now)
        : now - w.started >= 7 * 86400000)
    ) {
      s.research.windows[period] = {
        key: period === "day" ? dayKey(now) : String(now),
        started: now,
        baseline: { ...s.metrics },
      };
    }
  }
  return s;
}
export function questProgress(state, now) {
  const s = refreshResearch(state, now);
  return QUESTS.map((q) => {
    const window = q.period === "life" ? null : s.research.windows[q.period],
      key = window?.key || "life";
    const counts = Object.fromEntries(
      Object.keys(q.needs).map((k) => [
        k,
        k === "discovered"
          ? s.discovered.length
          : Math.max(0, s.metrics[k] - (window?.baseline[k] || 0)),
      ]),
    );
    const claimed = s.research.claims[q.id] === key;
    return {
      ...q,
      key,
      counts,
      claimed,
      ready:
        !claimed && Object.entries(q.needs).every(([k, n]) => counts[k] >= n),
    };
  });
}
export function claimQuest(state, id, now) {
  const s = refreshResearch(state, now),
    q = questProgress(s, now).find((q) => q.id === id);
  if (!q?.ready)
    return fail(state, "조건을 더 채우거나 다음 연구를 기다려 주세요.");
  s.research.claims[id] = q.key;
  for (const [ball, n] of Object.entries(q.reward)) s.balls[ball] += n;
  return success(s, { reward: q.reward });
}
export function recordResearch(state, event, now) {
  const s = refreshResearch(state, now);
  if (event in s.metrics) s.metrics[event]++;
  return s;
}
