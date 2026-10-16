import { SPECIES } from "./data.mjs?v=discovery2";
import { getPortraits } from "./render.mjs?v=discovery2";
import { raidStats } from "./battle.mjs?v=discovery2";
export function createMap(host, { onSelect, onError = () => {} }) {
  let map,
    ready = false,
    fix = null,
    centered = false;
  const markers = new Map(),
    portraits = getPortraits();
  let latest = [];
  const api = {
    update(geo, entities) {
      if (!geo.fix) return;
      fix = geo.fix;
      latest = entities;
      if (!map) initialize();
      if (!map) return;
      if (!centered) {
        map.jumpTo({
          center: [fix.lng, fix.lat],
          zoom: 18.2,
          pitch: 45,
          bearing: -18,
        });
        centered = true;
      }
      if (ready) draw();
    },
    recenter() {
      if (map && fix)
        map.easeTo({
          center: [fix.lng, fix.lat],
          zoom: 18.2,
          pitch: 45,
          bearing: -18,
          duration: 600,
        });
    },
    resize() {
      map?.resize();
    },
    destroy() {
      markers.forEach((m) => m.remove());
      markers.clear();
      map?.remove();
      map = null;
      ready = false;
      centered = false;
    },
  };
  function initialize() {
    try {
      if (!globalThis.maplibregl)
        throw Error("지도 라이브러리를 불러오지 못했어요.");
      map = new maplibregl.Map({
        container: host,
        center: [fix.lng, fix.lat],
        zoom: 18.2,
        pitch: 45,
        bearing: -18,
        minZoom: 15,
        maxZoom: 19,
        attributionControl: false,
        renderWorldCopies: false,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              maxzoom: 19,
            },
          },
          layers: [
            {
              id: "background",
              type: "background",
              paint: { "background-color": "#b9dba2" },
            },
            {
              id: "roads",
              type: "raster",
              source: "osm",
              paint: { "raster-saturation": -0.22, "raster-opacity": 0.83 },
            },
          ],
        },
      });
      map.on("load", () => {
        ready = true;
        map.addSource("radius", { type: "geojson", data: radiusData() });
        map.addLayer({
          id: "radius-fill",
          type: "fill",
          source: "radius",
          paint: { "fill-color": "#49bba7", "fill-opacity": 0.13 },
        });
        map.addLayer({
          id: "radius-line",
          type: "line",
          source: "radius",
          paint: {
            "line-color": "#f9fffc",
            "line-width": 2,
            "line-opacity": 0.85,
          },
        });
        draw();
      });
      map.on("error", () =>
        onError(
          "지도를 불러오지 못했어요. 인터넷 연결을 확인하고 지도 재연결을 눌러 주세요.",
        ),
      );
      map
        .getCanvas()
        .addEventListener("webglcontextlost", () =>
          onError("지도 화면 연결이 끊겼어요. 지도 재연결을 눌러 주세요."),
        );
    } catch (e) {
      onError(e.message || "지도를 시작할 수 없어요.");
    }
  }
  function radiusData() {
    const coordinates = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i * Math.PI) / 32;
      coordinates.push([
        fix.lng +
          (Math.sin(a) * 80) / (111195 * Math.cos((fix.lat * Math.PI) / 180)),
        fix.lat + (Math.cos(a) * 80) / 111195,
      ]);
    }
    return {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [coordinates] },
    };
  }
  function draw() {
    map.getSource("radius")?.setData(radiusData());
    const keep = new Set(["player", ...latest.map((e) => e.id)]);
    for (const [id, m] of markers) {
      if (!keep.has(id)) {
        m.remove();
        markers.delete(id);
      }
    }
    let player = markers.get("player");
    if (!player) {
      const el = document.createElement("div");
      el.className = "player-marker";
      el.innerHTML =
        '<div class="trainer-body"><i></i><b></b><span></span></div><div class="player-pulse"></div>';
      player = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([fix.lng, fix.lat])
        .addTo(map);
      markers.set("player", player);
    }
    player.setLngLat([fix.lng, fix.lat]);
    for (const e of latest) {
      let m = markers.get(e.id);
      if (!m) {
        const el = document.createElement("button");
        el.type = "button";
        el.className = `world-marker ${e.kind}`;
        el.dataset.entity = e.id;
        const d = SPECIES[e.speciesId];
        if (e.kind === "supply") {
          el.innerHTML =
            '<span class="stop-crystal"></span><small>보급소</small>';
          el.setAttribute("aria-label", "보급소 · 기본볼 받기");
        } else if (e.kind === "raid") {
          el.innerHTML = `<span class="raid-stars">${"★".repeat(e.tier)}</span><img src="${portraits.get(e.shiny ? `${e.speciesId}:shiny` : e.speciesId) || ""}" alt=""><span class="arena-plinth"></span><small>${e.shiny ? "✦ " : ""}${d.name} 레이드</small><em>CP ${raidStats(e.tier).cp.toLocaleString()}</em>`;
          el.setAttribute("aria-label", `${d.name} ${e.tier}성 레이드`);
        } else {
          el.innerHTML = `<img src="${portraits.get(e.shiny ? `${e.speciesId}:shiny` : e.speciesId) || ""}" alt=""><span class="spawn-ring"></span><small>${e.shiny ? "✦ " : ""}${d.name}</small>`;
          el.setAttribute("aria-label", `${d.name} 포획`);
        }
        el.onclick = () => onSelect(e);
        m = new maplibregl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([e.lng, e.lat])
          .addTo(map);
        markers.set(e.id, m);
      }
    }
  }
  return api;
}
