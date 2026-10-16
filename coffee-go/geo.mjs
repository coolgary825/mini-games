const rad = (d) => (d * Math.PI) / 180;
export function distanceMeters(a, b) {
  const dlat = rad(b.lat - a.lat),
    dlng = rad(b.lng - a.lng);
  const h =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dlng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
export const GEO_MESSAGES = {
  idle: "GPS를 연결해 탐험을 시작하세요",
  requesting: "현재 위치를 찾고 있어요",
  ready: "GPS 연결됨",
  denied: "위치 권한이 꺼져 있어요. 브라우저 설정에서 허용해 주세요.",
  unavailable: "현재 위치를 확인할 수 없어요. GPS를 켜고 다시 시도해 주세요.",
  timeout: "위치 확인이 오래 걸려요. 다시 연결해 주세요.",
  inaccurate: "GPS 오차가 커요. 탁 트인 곳에서 다시 확인해 주세요.",
  stale: "위치 정보가 오래됐어요. GPS를 다시 연결해 주세요.",
};
export function ingestFix(previous, fix, now) {
  const g = {
    status: "unavailable",
    fix: previous?.fix || null,
    distanceM: previous?.distanceM || 0,
    movingTooFast: previous?.movingTooFast || false,
    highCount: previous?.highCount || 0,
    slowCount: previous?.slowCount || 0,
    anchor: previous?.anchor || null,
  };
  if (
    !fix ||
    !Number.isFinite(fix.lat) ||
    Math.abs(fix.lat) > 90 ||
    !Number.isFinite(fix.lng) ||
    Math.abs(fix.lng) > 180 ||
    !Number.isFinite(fix.accuracy) ||
    fix.accuracy < 0 ||
    !Number.isFinite(fix.timestamp)
  )
    return g;
  if (now - fix.timestamp > 30000 || fix.timestamp > now + 5000) {
    g.status = "stale";
    return g;
  }
  if (previous?.fix && fix.timestamp <= previous.fix.timestamp)
    return { ...previous };
  g.fix = fix;
  if (fix.accuracy > 50) {
    g.status = "inaccurate";
    return g;
  }
  g.status = "ready";
  const dt = previous?.fix
    ? (fix.timestamp - previous.fix.timestamp) / 1000
    : 0;
  const speed = Math.max(
    Number.isFinite(fix.speedMps) ? fix.speedMps : 0,
    dt > 0
      ? Math.max(
          0,
          distanceMeters(previous.fix, fix) -
            Math.max(previous.fix.accuracy, fix.accuracy),
        ) / dt
      : 0,
  );
  if (speed > 20 / 3.6) {
    g.highCount++;
    g.slowCount = 0;
    if (g.highCount >= 2) g.movingTooFast = true;
    g.anchor = fix;
    return g;
  }
  g.highCount = 0;
  g.slowCount++;
  if (g.slowCount >= 2) g.movingTooFast = false;
  if (!g.anchor) {
    g.anchor = fix;
    return g;
  }
  const distance = distanceMeters(g.anchor, fix),
    uncertainty = Math.max(8, g.anchor.accuracy, fix.accuracy);
  if (distance > uncertainty && !g.movingTooFast) {
    g.distanceM += Math.max(0, distance - uncertainty);
    g.anchor = fix;
  }
  return g;
}
export function canInteract(geo, entity, now) {
  if (!geo || geo.status !== "ready" || !geo.fix)
    return {
      ok: false,
      reason: GEO_MESSAGES[geo?.status] || GEO_MESSAGES.idle,
    };
  if (now - geo.fix.timestamp > 30000)
    return { ok: false, reason: GEO_MESSAGES.stale };
  if (geo.movingTooFast)
    return {
      ok: false,
      reason: "이동 속도가 빨라요. 멈춘 뒤 다시 시도해 주세요.",
    };
  if (entity.expiresAt <= now)
    return { ok: false, reason: "이 만남은 시간이 끝났어요." };
  if (distanceMeters(geo.fix, entity) > 80)
    return { ok: false, reason: "80m 안으로 가까이 다가가 주세요." };
  return { ok: true };
}
export function watchLocation({ geolocation, onState, now = Date.now }) {
  let id = null,
    active = false,
    g = null,
    generation = 0;
  function stop() {
    active = false;
    generation++;
    if (id !== null) {
      geolocation?.clearWatch(id);
      id = null;
    }
  }
  function start() {
    stop();
    active = true;
    g = null;
    const token = generation;
    onState({ status: "requesting", fix: null, distanceM: 0 });
    if (!geolocation) {
      onState({ status: "unavailable", fix: null, distanceM: 0 });
      return;
    }
    id = geolocation.watchPosition(
      (p) => {
        if (!active || token !== generation) return;
        g = ingestFix(
          g,
          {
            lat: p.coords.latitude,
            lng: p.coords.longitude,
            accuracy: p.coords.accuracy,
            timestamp: p.timestamp,
            speedMps: p.coords.speed,
          },
          now(),
        );
        onState(g);
      },
      (e) => {
        if (!active || token !== generation) return;
        g = {
          ...g,
          status:
            { 1: "denied", 2: "unavailable", 3: "timeout" }[e.code] ||
            "unavailable",
          distanceM: g?.distanceM || 0,
        };
        onState(g);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
  }
  return { start, stop, resume: start };
}
