import { SPECIES, BALLS, copy } from "./data.mjs";
import {
  newProgress,
  chooseStarter,
  stats,
  captureChance,
  beginEncounter,
  throwBall,
  leaveEncounter,
  upgradeCost,
  upgradePet,
  collectSupply,
} from "./engine.mjs";
import { loadProgress, saveProgress, KEY } from "./storage.mjs";
import {
  watchLocation,
  canInteract,
  GEO_MESSAGES,
  distanceMeters,
} from "./geo.mjs";
import { nearbyEntities } from "./spawns.mjs";
import { createBattle, stepBattle, finishRaid, raidStats } from "./battle.mjs";
import { refreshResearch, questProgress, claimQuest } from "./research.mjs";
import { createMap } from "./map.mjs";
import { createScene, getPortraits } from "./render.mjs";
import { gradeThrow } from "./gestures.mjs";
const format = (n) => Math.floor(n).toLocaleString("ko-KR");
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const uid = () =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const ballOrb = (key) =>
  `<span class="ball-orb ${key}" style="--ball-color:${BALLS[key].color}"></span>`;
const labelMetric = {
  caught: "캐릭터 포획",
  great: "Great 이상 명중",
  excellent: "Excellent 명중",
  raids: "레이드 승리",
  discovered: "서로 다른 종류 발견",
};
export function createApp({
  document,
  storage,
  geolocation,
  now = Date.now,
  random = Math.random,
}) {
  const root = document.querySelector("#app");
  root.innerHTML = `<div id="map-stage"></div><div id="scene-stage"></div><div id="screen"></div><div id="map-attribution" class="map-attribution" hidden>지도 © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors</div><div id="map-notice" class="notice" hidden></div><div id="graphics-error" class="screen-error" hidden></div><div id="save-warning" class="save-warning" hidden></div><div id="toast" class="toast" role="status" aria-live="polite" hidden></div><dialog id="modal" class="modal"></dialog>`;
  const $ = (s) => document.querySelector(s),
    screenEl = $("#screen"),
    sceneHost = $("#scene-stage"),
    mapHost = $("#map-stage"),
    modal = $("#modal");
  let loaded = loadProgress(storage),
    state = loaded.state,
    screen = "welcome",
    geo = { status: "idle", fix: null, distanceM: 0 },
    entities = [],
    map = null,
    scene,
    screenPet = null,
    selectedStarter = "coffee",
    selectedBall = "basic",
    selection = [],
    selectedRaid = null,
    battle = null,
    result = null,
    filter = "all",
    locked = false,
    lastGpsDistance = 0,
    throwToken = 0,
    toastTimer = null,
    loop = 0,
    lastFrame = now(),
    lastUi = 0,
    stopped = false,
    mapError = "",
    graphicsError = "",
    lastFocus = null,
    nearbySignature = "",
    researchSignature = "";
  const portraits = getPortraits();
  const portrait = (id, cls = "") =>
    `<img class="${cls}" src="${portraits.get(id) || ""}" alt="${escape(SPECIES[id]?.name || "캐릭터")}">`;
  function toast(text) {
    clearTimeout(toastTimer);
    $("#toast").textContent = text;
    $("#toast").hidden = false;
    toastTimer = setTimeout(() => ($("#toast").hidden = true), 3000);
  }
  function persist() {
    const r = saveProgress(storage, state);
    if (!r.ok) {
      $("#save-warning").hidden = false;
      $("#save-warning").textContent = r.error;
    }
    return r.ok;
  }
  function command(fn) {
    state = refreshResearch(state, now());
    const r = fn(state);
    if (!r.ok) {
      toast(r.error);
      return r;
    }
    state = r.state;
    persist();
    return r;
  }
  function graphicsFail(message) {
    graphicsError = message;
    $("#graphics-error").innerHTML =
      `<p>${escape(message)}</p><button class="secondary" data-action="reload">화면 새로고침</button>`;
    $("#graphics-error").hidden = false;
  }
  scene = createScene(sceneHost, {
    onError: graphicsFail,
    reducedMotion: globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")
      .matches,
  });
  function ensureMap() {
    if (!map)
      map = createMap(mapHost, {
        onSelect: selectEntity,
        onError: (msg) => {
          mapError = msg;
          updateNotice();
        },
      });
  }
  function updateNotice() {
    const el = $("#map-notice");
    el.hidden = screen !== "map" || !mapError;
    if (!el.hidden)
      el.innerHTML = `${escape(mapError)} <button data-action="retry-map">지도 재연결</button>`;
  }
  const tracker = watchLocation({
    geolocation,
    now,
    onState: (g) => {
      if (g.status === "requesting") lastGpsDistance = 0;
      const oldStatus = geo.status;
      const delta = Math.max(0, (g.distanceM || 0) - lastGpsDistance);
      lastGpsDistance = g.distanceM || 0;
      geo = { ...g, fix: g.fix || geo.fix };
      if (state && delta > 0) {
        state.distanceM += delta;
        persist();
      }
      updateWorld();
      if (screen === "map" && (oldStatus !== g.status || !$("#gps-label")))
        renderMapHUD();
    },
  });
  function updateWorld(refreshViews = true) {
    if (!state) return;
    $("#map-attribution").hidden = screen !== "map" || !geo.fix;
    entities = geo.fix ? nearbyEntities(geo.fix, now(), state) : [];
    if (geo.fix) {
      ensureMap();
      map.update(geo, entities);
    }
    if (refreshViews && screen === "map") renderMapHUD();
    if (refreshViews && screen === "nearby") renderNearby();
  }
  function gpsText() {
    if (geo.movingTooFast) return "잠시 멈춰서 플레이하세요";
    if (geo.status === "ready" && now() - geo.fix.timestamp > 30000)
      return "GPS 다시 연결 필요";
    return geo.status === "ready"
      ? `GPS 연결 · 오차 ${Math.round(geo.fix.accuracy)}m`
      : GEO_MESSAGES[geo.status] || "GPS 연결 필요";
  }
  function show(next) {
    screen = next;
    document.body.dataset.screen = next;
    const showScene = [
      "welcome",
      "starter",
      "capture",
      "detail",
      "battle",
      "result",
    ].includes(next);
    sceneHost.hidden = !showScene;
    scene.setVisible(showScene);
    mapHost.hidden = showScene || !["map"].includes(next);
    $("#map-attribution").hidden = next !== "map" || !geo.fix;
    $("#graphics-error").hidden = !showScene || !graphicsError;
    updateNotice();
    screenEl.innerHTML = "";
    if (next === "welcome") renderWelcome();
    else if (next === "starter") renderStarter();
    else if (next === "map") {
      updateWorld();
      renderMapHUD();
      map?.resize();
    } else if (next === "menu") renderMenu();
    else if (next === "capture") renderCapture();
    else if (next === "collection" || next === "codex") renderCollection();
    else if (next === "detail") renderDetail();
    else if (next === "bag") renderBag();
    else if (next === "research") renderResearch();
    else if (next === "nearby") renderNearby();
    else if (next === "raid") renderRaid();
    else if (next === "battle") renderBattle();
    else if (next === "result") renderResult();
    else if (next === "corrupt") renderCorrupt();
  }
  function header(title, sub = "", back = "map") {
    return `<div class="sheet-header"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ""}</div><button class="close-button" data-action="view" data-view="${back}" aria-label="닫기">×</button></div>`;
  }
  function sheet(content) {
    screenEl.innerHTML = `<section class="sheet">${content}</section>`;
  }
  function renderWelcome() {
    scene.setEncounter({ speciesId: "coffee" });
    screenEl.innerHTML = `<div class="screen-shade"></div><div class="welcome-brand"><strong>COFFEE</strong><strong class="go">GO</strong><p>우리 동네의 새로운 모험</p></div><section class="welcome-bottom"><h1>가까이에서, 새로운 만남.</h1><p>커피와 친구들을 발견하고<br>여섯 동료와 함께 레이드에 도전하세요.</p><button class="primary wide" data-action="begin">${state?.starterChosen ? "위치 연결하고 이어하기" : "모험 시작하기"}</button><p class="fine">실제 GPS로 탐험해요 · 주변을 살피며 걸어 주세요</p><a class="text-button" href="../">게임천국으로</a></section>`;
  }
  function renderStarter() {
    scene.setEncounter({ speciesId: selectedStarter });
    screenEl.innerHTML = `<div class="screen-shade"></div><div class="top-bar light"><button class="circle" data-action="view" data-view="welcome" aria-label="뒤로">‹</button><span>첫 번째 동료</span></div><section class="panel starter-panel"><h1>누구와 함께 떠날까요?</h1><p>첫 동료 한 마리와 기본볼 30개를 받아요.</p><div class="starter-options">${["coffee", "mocha", "latte"].map((id) => `<button class="starter-option ${selectedStarter === id ? "active" : ""}" data-action="starter-pick" data-id="${id}">${portrait(id)}${SPECIES[id].name}<small>${SPECIES[id].kind}</small></button>`).join("")}</div><button class="primary wide" data-action="starter-confirm">${SPECIES[selectedStarter].name}와 모험 시작</button></section>`;
  }
  function renderMapHUD() {
    const good =
      geo.status === "ready" && geo.fix && now() - geo.fix.timestamp <= 30000;
    if ($("#gps-label")) {
      $("#gps-label").textContent = gpsText();
      $(".location-pill").classList.toggle("bad", !good);
      const card = $(".gps-card");
      if (good) card?.remove();
      else if (card) {
        card.querySelector("p").textContent = gpsText();
        card.querySelector("button").disabled = geo.status === "requesting";
      } else {
        const node = document.createElement("section");
        node.className = "gps-card";
        node.innerHTML = `<div class="gps-symbol">⌖</div><h2>위치 연결</h2><p>${escape(gpsText())}</p><button class="primary wide" data-action="gps" ${geo.status === "requesting" ? "disabled" : ""}>GPS 연결하기</button>`;
        screenEl.append(node);
      }
      const info = $(".map-info");
      info.textContent = good
        ? `주변 ${entities.filter((e) => e.kind === "wild").length}마리 · 레이드 ${entities.filter((e) => e.kind === "raid").length}개`
        : "도감과 가방은 위치 없이도 열 수 있어요";
      const near = entities.filter((e) => e.kind === "wild").slice(0, 3);
      const control = $(".nearby-control");
      const key = near.map((e) => e.speciesId).join(",");
      if (control.dataset.species !== key) {
        control.dataset.species = key;
        control.innerHTML = near.length
          ? near.map((e) => portrait(e.speciesId)).join("")
          : "주변 탐색";
      }
      return;
    }
    const near = entities.filter((e) => e.kind === "wild").slice(0, 3);
    screenEl.innerHTML = `<div class="top-bar"><div class="location-pill ${good ? "" : "bad"}"><i></i><span id="gps-label">${escape(gpsText())}</span></div><button class="circle" data-action="view" data-view="research" aria-label="퀘스트 연구">▤</button></div><div class="map-tools"><button class="circle" data-action="recenter" aria-label="내 위치로">⌖</button><button class="circle" data-action="gps" aria-label="GPS 다시 연결">↻</button></div>${!good ? `<section class="gps-card"><div class="gps-symbol">⌖</div><h2>${geo.status === "requesting" ? "주변을 찾는 중…" : "위치를 연결해 주세요"}</h2><p>${escape(gpsText())}</p><button class="primary wide" data-action="gps" ${geo.status === "requesting" ? "disabled" : ""}>GPS 연결하기</button><p class="mini-note">위치 권한을 허용하면 실제 동네가 표시돼요.</p></section>` : ""}<button class="map-info" data-action="view" data-view="nearby">${good ? `주변 ${entities.filter((e) => e.kind === "wild").length}마리 · 레이드 ${entities.filter((e) => e.kind === "raid").length}개` : "도감과 가방은 위치 없이도 열 수 있어요"}</button><div class="map-bottom"><button class="profile-control" data-action="view" data-view="collection" aria-label="내 동료 보관함"><span class="avatar">${portrait(state.pets[0]?.speciesId || "coffee")}</span><b>${1 + Math.floor(state.xp / 1000)}</b><span>트레이너</span></button><button class="menu-ball" data-action="view" data-view="menu" aria-label="메인 메뉴"></button><button class="nearby-control" data-action="view" data-view="nearby" aria-label="주변 캐릭터와 레이드">${near.length ? near.map((e) => portrait(e.speciesId)).join("") : "주변 탐색"}</button></div>`;
  }
  function renderMenu() {
    sheet(
      `${header("커피 GO", "우리 동네를 탐험하는 트레이너")}<div class="balance"><span>Lv. <b>${1 + Math.floor(state.xp / 1000)}</b></span><span>별가루 <b>${format(state.dust)}</b></span><span><b>${format(state.distanceM)}</b> m</span></div><div class="menu-grid">${[
        ["collection", "◈", "동료 보관함"],
        ["bag", "▣", "가방"],
        ["codex", "▥", "도감"],
        ["research", "▤", "퀘스트 연구"],
        ["nearby", "⌖", "주변 탐색"],
        ["map", "◎", "지도 돌아가기"],
      ]
        .map(
          ([v, icon, title]) =>
            `<button class="menu-item" data-action="view" data-view="${v}"><span class="menu-symbol">${icon}</span>${title}</button>`,
        )
        .join(
          "",
        )}</div><div class="sheet-footer">발견한 종류 ${state.discovered.length} / 9 · 모은 동료 ${state.pets.length}마리<br>진행 기록은 이 브라우저에 자동 저장돼요.<br>지도를 조회하면 지도 제공자에게 조회 지역이 전달돼요.<br><a href="../">게임천국으로 돌아가기</a></div>`,
    );
  }
  function petCard(p, { selectable = false, lockedCard = false } = {}) {
    const d = SPECIES[p.speciesId];
    return `<button class="pet-card ${selection.includes(p.id) && selectable ? "selected" : ""} ${lockedCard ? "locked" : ""}" data-action="${selectable ? "team-toggle" : lockedCard ? "locked" : "detail"}" data-id="${p.id}" ${lockedCard ? "disabled" : ""}><span class="cp">${lockedCard ? "미발견" : `<small>CP</small> ${format(stats(p).cp)}`}</span>${portrait(p.speciesId)}<span class="pet-name">${lockedCard ? "???" : d.name}</span><span class="pet-type">${lockedCard ? "발견해서 도감을 채워요" : `${d.type} · Lv.${p.level}`}</span></button>`;
  }
  function renderCollection() {
    const codex = screen === "codex";
    let pets = state.pets
      .filter((p) => filter === "all" || p.speciesId === filter)
      .slice()
      .sort((a, b) => stats(b).cp - stats(a).cp);
    sheet(
      `${header(codex ? "도감" : `동료 보관함 <small>${state.pets.length}</small>`, codex ? `${state.discovered.length} / 9종 발견` : "CP가 높은 동료부터 보여요")}<div class="toolbar"><span>${codex ? "새로운 만남을 기록해요" : "강한 동료를 찾아보세요"}</span>${
        codex
          ? ""
          : `<select id="species-filter" aria-label="캐릭터 종류"><option value="all">모든 종류</option>${Object.entries(
              SPECIES,
            )
              .map(
                ([id, d]) =>
                  `<option value="${id}" ${filter === id ? "selected" : ""}>${d.name}</option>`,
              )
              .join("")}</select>`
      }</div><div class="pet-grid">${
        codex
          ? Object.keys(SPECIES)
              .map((id) => {
                const p = state.pets
                  .filter((p) => p.speciesId === id)
                  .sort((a, b) => stats(b).cp - stats(a).cp)[0] || {
                  id: "locked",
                  speciesId: id,
                  level: 1,
                  iv: { attack: 0, defense: 0, stamina: 0 },
                };
                return petCard(p, {
                  lockedCard: !state.discovered.includes(id),
                });
              })
              .join("")
          : pets.map((p) => petCard(p)).join("")
      }</div>${pets.length || codex ? "" : '<p class="empty-state">주변에서 새로운 동료를 만나 보세요.</p>'}`,
    );
  }
  function renderDetail() {
    const p = state.pets.find((p) => p.id === screenPet);
    if (!p) {
      show("collection");
      return;
    }
    const d = SPECIES[p.speciesId],
      s = stats(p),
      next = stats({ ...p, level: Math.min(40, p.level + 1) });
    scene.setEncounter(p);
    screenEl.innerHTML = `<div class="top-bar"><button class="circle" data-action="view" data-view="collection" aria-label="보관함으로">‹</button><span class="type-badge">${d.kind}</span></div><div class="detail-arc"></div><div class="cp-head"><small>CP</small> ${format(s.cp)}</div><section class="panel"><h1>${d.name}</h1><span class="type-badge">${d.type}</span><div class="hp-line"></div><small>HP ${s.hp} / ${s.hp}</small><div class="stats-row"><div><strong>${s.attack}</strong><span>공격력</span></div><div><strong>${s.defense}</strong><span>방어력</span></div><div><strong>${p.level}</strong><span>레벨</span></div></div><p>${d.fast} / ${d.charged}</p><button class="primary wide" data-action="upgrade" data-id="${p.id}" ${state.dust < upgradeCost(p) || p.level >= 40 ? "disabled" : ""}>${p.level >= 40 ? "최고 레벨 달성" : `강화 · 별가루 ${format(upgradeCost(p))}`}</button><p class="mini-note">${p.level < 40 ? `다음 CP ${format(next.cp)} · ` : ""}보유 별가루 ${format(state.dust)}</p></section>`;
  }
  function renderBag() {
    sheet(
      `${header("가방", "볼은 던질 때 한 개씩 사용해요")}${Object.entries(BALLS)
        .map(
          ([key, b]) =>
            `<div class="item-row">${ballOrb(key)}<div><h2>${b.name}</h2><p>${{ basic: "보급소에서 받을 수 있는 기본 포획 도구", super: "기본볼보다 높은 포획 확률 · 정밀 연구 보상", hyper: "높은 포획 확률 · 고급 연구에서만 소량 지급", master: "반드시 포획 · 특별 연구 완료 시 단 한 개" }[key]}</p></div><b>${state.balls[key]}</b></div>`,
        )
        .join(
          "",
        )}<p class="mini-note">기본볼이 없어도 주변 보급소에서 무료로 받을 수 있어요.<br>하이퍼볼과 마스터볼은 일반 보급소에서 나오지 않아요.</p><button class="secondary wide" data-action="view" data-view="research">퀘스트와 보상 보기</button>`,
    );
  }
  function preserveSheet(render) {
    const scroll = $(".sheet")?.scrollTop || 0;
    const focused = document.activeElement;
    const action = focused?.dataset?.action,
      id = focused?.dataset?.id;
    render();
    if ($(".sheet")) $(".sheet").scrollTop = scroll;
    if (action)
      [...screenEl.querySelectorAll("[data-action]")]
        .find((el) => el.dataset.action === action && el.dataset.id === id)
        ?.focus({ preventScroll: true });
  }
  function refreshTimedViews() {
    if (screen === "map" || screen === "nearby") updateWorld();
    if (
      screen === "research" &&
      JSON.stringify(questProgress(state, now())) !== researchSignature
    )
      preserveSheet(renderResearch);
  }
  function renderResearch() {
    state = refreshResearch(state, now());
    researchSignature = JSON.stringify(questProgress(state, now()));
    persist();
    sheet(
      `${header("퀘스트 연구", "작은 발견이 특별한 보상으로 이어져요")}${questProgress(
        state,
        now(),
      )
        .map(
          (q) =>
            `<article class="quest"><h2>${q.name}</h2><span class="period">${{ day: "매일 새로운 연구", week: "7일마다 새로운 연구", life: "평생 한 번 · 마스터볼 특별 보상" }[q.period]}</span>${Object.entries(
              q.needs,
            )
              .map(
                ([k, total]) =>
                  `<div class="objective"><div><span>${labelMetric[k]}</span><b>${Math.min(q.counts[k], total)} / ${total}</b></div><div class="progress-track"><i style="width:${Math.min(100, (q.counts[k] / total) * 100)}%"></i></div></div>`,
              )
              .join("")}<div class="reward-row"><strong>${Object.entries(
              q.reward,
            )
              .map(([k, n]) => `${BALLS[k].name} × ${n}`)
              .join(
                ", ",
              )}</strong><button class="primary" data-action="claim" data-id="${q.id}" ${q.ready ? "" : "disabled"}>${q.claimed ? "수령 완료" : "보상 받기"}</button></div></article>`,
        )
        .join("")}`,
    );
  }
  function renderNearby() {
    updateWorld(false);
    const signature = JSON.stringify(
      entities.map((e) => [
        e.id,
        Math.round(distanceMeters(geo.fix, e)),
        Math.ceil((e.expiresAt - now()) / 60000),
      ]),
    );
    if ($(".nearby-list") && signature === nearbySignature) return;
    nearbySignature = signature;
    const list = entities
      .slice()
      .sort(
        (a, b) =>
          ({ raid: 0, supply: 1, wild: 2 })[a.kind] -
          { raid: 0, supply: 1, wild: 2 }[b.kind],
      );
    preserveSheet(() =>
      sheet(
        `${header("주변 탐색", geo.fix ? "80m 안의 캐릭터와 레이드에 참여할 수 있어요" : "먼저 GPS 위치를 연결해 주세요")}<div class="nearby-list">${list.map((e) => `<button data-action="entity" data-id="${e.id}">${e.kind === "supply" ? '<span class="menu-symbol" style="width:65px;height:65px;flex-shrink:0">◇</span>' : portrait(e.speciesId)}<div><h2>${e.kind === "supply" ? "보급소" : SPECIES[e.speciesId].name + (e.kind === "raid" ? " 레이드" : "")}</h2><p>${e.kind === "raid" ? `${"★".repeat(e.tier)} · CP ${format(raidStats(e.tier).cp)} · ${Math.max(0, Math.ceil((e.expiresAt - now()) / 60000))}분 남음` : e.kind === "supply" ? "기본볼 5개 · 5분마다 보급" : `야생 · CP ${format(stats({ ...e, id: e.id }).cp)}`}</p></div><em>${Math.round(distanceMeters(geo.fix, e))}m</em></button>`).join("")}</div>${list.length ? "" : '<div class="empty-state">실제 위치를 찾으면 주변의 새로운 만남이 표시돼요.<br><button class="primary" data-action="gps">위치 연결하기</button></div>'}`,
      ),
    );
  }
  function selectEntity(e) {
    if (locked) return;
    if (!e) {
      toast("주변의 만남이 바뀌었어요. 새 목록에서 선택해 주세요.");
      updateWorld();
      return;
    }
    const gate = canInteract(geo, e, now());
    if (!gate.ok) {
      toast(gate.reason);
      return;
    }
    if (state.pendingEncounter) {
      show("capture");
      return;
    }
    if (e.kind === "supply") {
      const r = command((s) => collectSupply(s, e, now()));
      if (r.ok) toast("기본볼 5개를 받았어요!");
      return;
    }
    if (e.kind === "raid") {
      selectedRaid = e;
      selection = state.pets
        .slice()
        .sort((a, b) => stats(b).cp - stats(a).cp)
        .slice(0, 6)
        .map((p) => p.id);
      show("raid");
      return;
    }
    if (command((s) => beginEncounter(s, e)).ok) show("capture");
  }
  function renderCapture() {
    const e = state.pendingEncounter;
    if (!e) {
      show("map");
      return;
    }
    const p = e.pet,
      d = SPECIES[p.speciesId];
    if (!state.balls[selectedBall])
      selectedBall =
        Object.keys(BALLS).find((k) => state.balls[k] > 0) || "basic";
    scene.setEncounter(p);
    screenEl.innerHTML = `<div class="screen-shade"></div><div class="top-bar light"><button class="circle" data-action="leave-capture" aria-label="포획 나가기">‹</button><span>${e.boss ? "레이드 보스 포획" : "야생의 만남"}</span></div><div class="encounter-title"><h1>${d.name}</h1><span><small>CP</small>${format(stats(p).cp)}</span></div><div class="capture-tip">${state.balls[selectedBall] ? `기본 명중 시 ${Math.round(captureChance(p, selectedBall) * 100)}% · 원이 작을 때 던져요` : "볼이 없어요 · 지도의 보급소를 방문해 주세요"}</div><div class="aim" id="aim"><div class="aim-ring" id="aim-ring"></div></div><div class="throw-grade" id="throw-grade"></div><div class="capture-controls"><div class="side"><button class="circle" data-action="throw-help" aria-label="던지기 도움말">?</button><small>던지는 방법</small></div><button class="ball-button" id="throw-ball" aria-label="${BALLS[selectedBall].name} 던지기. 위로 밀거나 Enter를 누르세요." ${state.balls[selectedBall] ? "" : "disabled"}>${ballOrb(selectedBall)}<strong>${BALLS[selectedBall].name} × ${state.balls[selectedBall]}</strong></button><div class="side"><button class="circle" data-action="balls" aria-label="볼 바꾸기">◉</button><small>볼 바꾸기</small></div></div>`;
    bindThrow();
  }
  function bindThrow() {
    const button = $("#throw-ball");
    let points = [],
      pointer = null,
      cancelled = false;
    button.onpointerdown = (e) => {
      if (locked || button.disabled) return;
      if (pointer !== null) {
        cancelled = true;
        return;
      }
      pointer = e.pointerId;
      cancelled = false;
      points = [{ x: e.clientX, y: e.clientY, t: now() }];
      button.setPointerCapture(e.pointerId);
    };
    button.onpointermove = (e) => {
      if (pointer !== e.pointerId || locked) return;
      points.push({ x: e.clientX, y: e.clientY, t: now() });
      button.style.setProperty(
        "--drag-x",
        `${Math.max(-100, Math.min(100, e.clientX - points[0].x))}px`,
      );
      button.style.setProperty(
        "--drag-y",
        `${Math.max(-170, Math.min(20, e.clientY - points[0].y))}px`,
      );
    };
    button.onpointercancel = () => {
      pointer = null;
      points = [];
      button.style.removeProperty("--drag-x");
      button.style.removeProperty("--drag-y");
    };
    button.onpointerup = (e) => {
      if (pointer !== e.pointerId) return;
      pointer = null;
      button.style.removeProperty("--drag-x");
      button.style.removeProperty("--drag-y");
      if (cancelled || locked) return;
      points.push({ x: e.clientX, y: e.clientY, t: now() });
      if (points[0].y - e.clientY < 45) {
        toast("볼을 누른 채 캐릭터 쪽으로 위로 밀어 주세요.");
        return;
      }
      const r = $("#aim").getBoundingClientRect();
      const radius = r.width / 2,
        scale = ringScale();
      doThrow(
        gradeThrow(
          points,
          { x: r.x + radius, y: r.y + radius, radius },
          radius * scale,
        ),
      );
    };
    button.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        doThrow({ hit: true, grade: "normal" });
      }
    };
  }
  function ringScale() {
    return 0.22 + ((now() % 1900) / 1900) * 0.7;
  }
  function doThrow(grade) {
    if (locked || screen !== "capture") return;
    if (selectedBall === "master") {
      confirmDialog(
        "마스터볼을 사용할까요?",
        "반드시 잡을 수 있지만 특별 연구에서 한 개만 받을 수 있어요.",
        "사용하고 포획",
        () => resolveThrow({ hit: true, grade: "normal" }),
      );
    } else resolveThrow(grade);
  }
  function resolveThrow(grade) {
    if (locked || !state.pendingEncounter) return;
    const r = command((s) =>
      throwBall(s, {
        ball: selectedBall,
        ...grade,
        random,
        rng: random,
        id: uid(),
      }),
    );
    if (!r.ok) return;
    locked = true;
    const token = ++throwToken;
    $("#throw-ball")?.classList.add("throwing");
    const text =
      {
        excellent: "Excellent!",
        great: "Great!",
        nice: "Nice!",
        normal: "",
        miss: "빗나갔어요",
      }[grade.grade] || "";
    $("#throw-grade").textContent = text;
    setTimeout(() => {
      if (token !== throwToken || stopped) return;
      scene.play(r.result.kind);
      $("#throw-grade").textContent = {
        caught: "잡았다!",
        escaped: "볼에서 빠져나왔어요!",
        fled: "야생의 친구가 달아났어요",
        miss: "다시 조준해 보세요",
      }[r.result.kind];
    }, 720);
    setTimeout(() => {
      if (token !== throwToken || stopped) return;
      locked = false;
      if (r.result.kind === "caught") {
        result = { kind: "caught", pet: r.result.pet };
        show("result");
      } else if (r.result.kind === "fled") {
        show("map");
        toast("다른 친구를 찾아보세요.");
      } else renderCapture();
    }, 1700);
  }
  function renderRaid() {
    const d = SPECIES[selectedRaid.speciesId];
    sheet(
      `${header("레이드 준비", "내 동료 여섯 마리로 강력한 보스에 도전하세요")}<div class="raid-header"><span class="stars">${"★".repeat(selectedRaid.tier)}</span><div>${portrait(selectedRaid.speciesId)}</div><h2>${d.name}</h2><div class="boss-cp"><small>CP</small> ${format(raidStats(selectedRaid.tier).cp)}</div><p id="raid-expiry">${Math.max(0, Math.ceil((selectedRaid.expiresAt - now()) / 60000))}분 남음 · 전투 제한 180초</p></div><div class="raid-slots">${Array.from({ length: 6 }, (_, i) => `<span>${selection[i] ? portrait(state.pets.find((p) => p.id === selection[i]).speciesId) : i + 1}</span>`).join("")}</div><div class="toolbar"><strong>${selection.length} / 6마리 선택</strong><button class="text-button" data-action="recommend">CP 높은 순 추천</button></div>${state.pets.length < 6 ? `<p class="mini-note">동료 ${6 - state.pets.length}마리를 더 모으면 입장할 수 있어요.</p>` : ""}<div class="pet-grid">${state.pets
        .slice()
        .sort((a, b) => stats(b).cp - stats(a).cp)
        .map((p) => petCard(p, { selectable: true }))
        .join(
          "",
        )}</div><div class="sticky-action"><button class="primary wide" id="start-raid" data-action="start-raid" ${selection.length === 6 ? "" : "disabled"}>6마리와 레이드 시작</button></div>`,
    );
  }
  function startRaid() {
    const gate = canInteract(geo, selectedRaid, now());
    if (!gate.ok) {
      toast(gate.reason);
      return;
    }
    const r = createBattle(state, selectedRaid, selection, now());
    if (!r.ok) {
      toast(r.error);
      return;
    }
    battle = r.battle;
    lastFrame = now();
    show("battle");
  }
  function renderBattle() {
    scene.setBattle(battle);
    screenEl.innerHTML = `<div class="screen-shade"></div><div class="battle-top"><div class="battle-top-row"><button class="circle" data-action="flee-raid" aria-label="레이드 나가기">‹</button><div class="boss-heading"><h1>${SPECIES[battle.raid.speciesId].name}</h1><p>CP ${format(battle.boss.cp)}</p></div><div class="timer" id="battle-timer">180</div></div><div class="health"><i id="boss-health"></i></div></div><div class="attack-warning" id="attack-warning" hidden>공격이 온다! 좌우로 피하세요</div><button class="full-attack-zone" id="attack-zone" aria-label="보스를 탭해 공격">공격</button><div class="battle-bottom"><div class="ally-name"><strong id="ally-name"></strong><span id="ally-cp"></span></div><div class="health"><i id="ally-health"></i></div><div class="party-dots" id="party-dots"></div><div class="battle-actions"><button class="battle-action" data-action="dodge"><span>↔</span>회피</button><button class="battle-action main" data-action="attack"><span>ϟ</span>공격</button><button class="battle-action charge" id="charged-attack" data-action="charged"><span>✦</span><b id="charge-count">0%</b></button></div></div>`;
    let down = null;
    const zone = $("#attack-zone");
    zone.onpointerdown = (e) => {
      down = { x: e.clientX, y: e.clientY, id: e.pointerId };
      zone.setPointerCapture(e.pointerId);
    };
    zone.onpointercancel = () => (down = null);
    zone.onpointerup = (e) => {
      if (!down || down.id !== e.pointerId) return;
      const dx = e.clientX - down.x;
      down = null;
      battleAction(Math.abs(dx) > 45 ? "dodge" : "attack");
    };
    zone.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        battleAction("attack");
      }
    };
    updateBattleUI();
  }
  function battleAction(action) {
    if (screen !== "battle" || !battle || battle.result) return;
    const before = battle.bossHp,
      energy = battle.energy;
    battle = stepBattle(
      battle,
      Math.max(0, (now() - lastFrame) / 1000),
      action,
    );
    lastFrame = now();
    if (action === "dodge" || battle.bossHp < before || energy > battle.energy)
      scene.play(action);
    updateBattleUI();
    checkBattleResult();
  }
  function updateBattleUI() {
    if (screen !== "battle") return;
    const p = battle.roster[battle.active];
    $("#battle-timer").textContent = Math.max(
      0,
      Math.ceil(180 - battle.elapsed),
    );
    $("#boss-health").style.width =
      `${(battle.bossHp / battle.boss.hp) * 100}%`;
    $("#ally-health").style.width = `${(p.hp / p.stats.hp) * 100}%`;
    $("#ally-name").textContent = SPECIES[p.pet.speciesId].name;
    $("#ally-cp").textContent = `CP ${p.stats.cp} · HP ${p.hp}/${p.stats.hp}`;
    $("#party-dots").innerHTML = battle.roster
      .map(
        (p, i) =>
          `<i class="${p.hp <= 0 ? "fainted" : i === battle.active ? "active" : ""}"></i>`,
      )
      .join("");
    $("#charge-count").textContent =
      battle.energy >= 100 ? "필살기" : `${battle.energy}%`;
    $("#charged-attack").disabled = battle.energy < 100;
    $("#charged-attack").style.setProperty("--energy", `${battle.energy}%`);
    $("#attack-warning").hidden = !battle.telegraph;
    scene.setBattle(battle);
  }
  function checkBattleResult() {
    if (!battle?.result || screen !== "battle") return;
    if (battle.result === "won") {
      const r = command((s) => finishRaid(s, battle, uid()));
      result = {
        kind: "won",
        speciesId: battle.raid.speciesId,
        dust: r.result?.dust || 0,
      };
      scene.play("won");
    } else result = { kind: "lost", speciesId: battle.raid.speciesId };
    show("result");
  }
  function renderResult() {
    const r = result;
    if (!r) {
      show(state.pendingEncounter ? "capture" : "map");
      return;
    }
    const id = r.pet?.speciesId || r.speciesId;
    scene.setEncounter({ speciesId: id });
    screenEl.innerHTML = `<div class="screen-shade"></div><section class="panel result-panel"><div class="result-badge">${r.kind === "lost" ? "↻" : "✦"}</div><h1>${r.kind === "caught" ? `${SPECIES[id].name}, 포획 성공!` : r.kind === "won" ? "레이드 승리!" : "다시 도전해 보세요"}</h1>${r.kind === "caught" ? `<div class="stats-row"><div><strong>${format(stats(r.pet).cp)}</strong><span>CP</span></div><div><strong>+100</strong><span>별가루</span></div></div><button class="primary wide" data-action="detail" data-id="${r.pet.id}">동료 살펴보기</button><button class="secondary wide" data-action="view" data-view="map">계속 탐험하기</button>` : r.kind === "won" ? `<p>별가루 +${format(r.dust)}<br>이제 ${SPECIES[id].name}를 잡을 기회예요.</p><button class="primary wide" data-action="view" data-view="capture">보스 포획하러 가기</button>` : `<p>동료들은 모두 회복했어요.<br>CP를 강화하고 필살기와 회피를 활용해 보세요.</p><button class="primary wide" data-action="retry-raid">다시 준비하기</button><button class="secondary wide" data-action="view" data-view="collection">동료 강화하기</button>`}</section>`;
  }
  function renderCorrupt() {
    sheet(
      `<div class="empty-state"><h1>저장 기록을 확인할 수 없어요</h1><p>기존 기록은 그대로 보관하고 있어요.<br>기록을 내려받은 뒤 새 모험을 시작할 수 있어요.</p><button class="secondary wide" data-action="download-save">기존 기록 내려받기</button><br><br><button class="danger wide" data-action="reset-corrupt">새 모험 시작</button></div>`,
    );
  }
  function openDialog(html) {
    lastFocus = document.activeElement;
    modal.innerHTML = html;
    modal.showModal();
  }
  function closeDialog() {
    modal.close();
    lastFocus?.focus?.();
  }
  function confirmDialog(title, body, label, onConfirm) {
    openDialog(
      `<h2>${title}</h2><p>${body}</p><div class="modal-actions"><button class="secondary" id="dialog-cancel">취소</button><button class="primary" id="dialog-confirm">${label}</button></div>`,
    );
    $("#dialog-cancel").onclick = closeDialog;
    $("#dialog-confirm").onclick = () => {
      closeDialog();
      onConfirm();
    };
  }
  function ballDialog() {
    openDialog(
      `<h2>사용할 볼 선택</h2><p>더 좋은 볼일수록 잡을 확률이 높아져요.</p><div class="ball-options">${Object.entries(
        BALLS,
      )
        .map(
          ([k, b]) =>
            `<button class="ball-option ${selectedBall === k ? "chosen" : ""}" data-action="ball-pick" data-id="${k}" ${state.balls[k] ? "" : "disabled"}>${ballOrb(k)}${b.name}<b>×${state.balls[k]}</b></button>`,
        )
        .join(
          "",
        )}</div><button class="secondary wide" data-action="close-modal">닫기</button>`,
    );
  }
  function click(e) {
    const target = e.target.closest("[data-action]");
    if (!target || target.disabled) return;
    const a = target.dataset.action,
      id = target.dataset.id;
    if (locked && a !== "close-modal") return;
    if (a === "view") {
      if (target.dataset.view === "map" && state?.pendingEncounter) {
        show("capture");
        return;
      }
      show(target.dataset.view);
    } else if (a === "begin") {
      if (!state.starterChosen) show("starter");
      else if (state.pendingEncounter) show("capture");
      else {
        show("map");
        tracker.start();
      }
    } else if (a === "starter-pick") {
      selectedStarter = id;
      renderStarter();
    } else if (a === "starter-confirm") {
      if (command((s) => chooseStarter(s, selectedStarter, uid())).ok) {
        show("map");
        tracker.start();
      }
    } else if (a === "gps") {
      show("map");
      tracker.start();
    } else if (a === "recenter") map?.recenter();
    else if (a === "retry-map") {
      map?.destroy();
      map = null;
      mapError = "";
      updateWorld();
      updateNotice();
    } else if (a === "detail") {
      screenPet = id;
      show("detail");
    } else if (a === "upgrade") {
      if (command((s) => upgradePet(s, id)).ok) {
        toast("동료의 CP가 올랐어요!");
        renderDetail();
      }
    } else if (a === "entity") selectEntity(entities.find((e) => e.id === id));
    else if (a === "claim") {
      if (command((s) => claimQuest(s, id, now())).ok) {
        toast("연구 보상을 받았어요!");
      }
      renderResearch();
    } else if (a === "leave-capture") {
      if (state.pendingEncounter?.boss)
        confirmDialog(
          "보스 포획을 그만둘까요?",
          "나가면 이 레이드의 포획 기회가 끝나요.",
          "포획 종료",
          () => {
            const s = copy(state);
            s.caughtIds.push(s.pendingEncounter.sourceId);
            s.pendingEncounter = null;
            state = s;
            persist();
            show("map");
          },
        );
      else {
        command(leaveEncounter);
        show("map");
      }
    } else if (a === "balls") ballDialog();
    else if (a === "ball-pick") {
      selectedBall = id;
      closeDialog();
      renderCapture();
    } else if (a === "close-modal") closeDialog();
    else if (a === "throw-help")
      toast(
        "볼을 누르고 캐릭터를 향해 위로 밀어요. 작은 원에 맞히면 포획 확률이 올라가요.",
      );
    else if (a === "recommend") {
      selection = state.pets
        .slice()
        .sort((a, b) => stats(b).cp - stats(a).cp)
        .slice(0, 6)
        .map((p) => p.id);
      renderRaid();
    } else if (a === "team-toggle") {
      if (selection.includes(id)) selection = selection.filter((x) => x !== id);
      else if (selection.length < 6) selection.push(id);
      else {
        toast("먼저 한 마리를 해제해 주세요.");
        return;
      }
      const scroll = $(".sheet").scrollTop;
      renderRaid();
      $(".sheet").scrollTop = scroll;
    } else if (a === "start-raid") startRaid();
    else if (["attack", "charged", "dodge"].includes(a)) battleAction(a);
    else if (a === "retry-raid") {
      show("raid");
    } else if (a === "flee-raid")
      confirmDialog(
        "레이드를 나갈까요?",
        "동료는 회복하지만 이번 전투의 보상은 받을 수 없어요.",
        "나가기",
        () => {
          battle = null;
          show("map");
        },
      );
    else if (a === "reload") location.reload();
    else if (a === "download-save") {
      const blob = new Blob([loaded.raw], { type: "application/json" }),
        url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = "coffee-go-save-backup.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else if (a === "reset-corrupt")
      confirmDialog(
        "새 모험을 시작할까요?",
        "확인하면 읽을 수 없던 기존 기록을 새 기록으로 바꿔요.",
        "새로 시작",
        () => {
          state = refreshResearch(newProgress(), now());
          persist();
          show("welcome");
        },
      );
  }
  root.addEventListener("click", click);
  root.addEventListener("change", (e) => {
    if (e.target.id === "species-filter") {
      filter = e.target.value;
      renderCollection();
    }
  });
  modal.addEventListener("close", () => lastFocus?.focus?.());
  let visibilityTimer = null,
    gpsPaused = false;
  function visibility() {
    clearTimeout(visibilityTimer);
    if (document.hidden) {
      visibilityTimer = setTimeout(() => {
        tracker.stop();
        gpsPaused = true;
      }, 250);
    } else {
      if (screen === "battle") {
        battle = stepBattle(
          battle,
          Math.max(0, (now() - lastFrame) / 1000),
          "none",
        );
        lastFrame = now();
        checkBattleResult();
      }
      refreshTimedViews();
      if (gpsPaused && geo.status !== "idle") {
        gpsPaused = false;
        tracker.resume();
      }
    }
  }
  document.addEventListener("visibilitychange", visibility);
  function tick() {
    if (stopped) return;
    const time = now();
    if (screen === "battle" && battle && !document.hidden) {
      battle = stepBattle(
        battle,
        Math.max(0, (time - lastFrame) / 1000),
        "none",
      );
      lastFrame = time;
      updateBattleUI();
      checkBattleResult();
    }
    if (screen === "capture" && !locked) {
      const ring = $("#aim-ring");
      if (ring) ring.style.transform = `scale(${ringScale()})`;
    }
    if (time - lastUi > 1000) {
      lastUi = time;
      refreshTimedViews();
      if (screen === "map") {
        if (
          geo.status === "ready" &&
          geo.fix &&
          time - geo.fix.timestamp > 30000
        ) {
          geo = { ...geo, status: "stale" };
          renderMapHUD();
        }
      }
      if (screen === "raid") {
        const expired = selectedRaid.expiresAt <= time;
        $("#start-raid").disabled = selection.length !== 6 || expired;
        $("#raid-expiry").textContent = expired
          ? "레이드가 종료됐어요"
          : `${Math.ceil((selectedRaid.expiresAt - time) / 60000)}분 남음 · 전투 제한 180초`;
      }
    }
    loop = setTimeout(tick, 100);
  }
  if (loaded.status === "blocked") {
    $("#save-warning").hidden = false;
    $("#save-warning").textContent =
      "저장이 제한돼 있어요. 현재 플레이는 가능하지만 창을 닫으면 기록이 사라질 수 있어요.";
  }
  if (!state) show("corrupt");
  else {
    state = refreshResearch(state, now());
    persist();
    show(state.pendingEncounter ? "capture" : "welcome");
  }
  tick();
  return {
    destroy() {
      stopped = true;
      throwToken++;
      clearTimeout(loop);
      clearTimeout(toastTimer);
      clearTimeout(visibilityTimer);
      tracker.stop();
      map?.destroy();
      scene.destroy();
      root.removeEventListener("click", click);
      document.removeEventListener("visibilitychange", visibility);
    },
  };
}
