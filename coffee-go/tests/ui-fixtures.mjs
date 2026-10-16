import { createApp } from "../app.mjs";
import { newProgress, chooseStarter } from "../engine.mjs";
import { refreshResearch } from "../research.mjs";
import { KEY } from "../storage.mjs";
const mode = new URLSearchParams(location.search).get("case") || "fresh";
let timeOffset = 0;
const now = () => Date.now() + timeOffset;
let state = refreshResearch(newProgress(), now());
let errorCode = null,
  accuracy = 5;
if (mode !== "fresh") {
  state = chooseStarter(state, "coffee", "starter").state;
  if (["team", "master", "quests", "empty", "battle"].includes(mode)) {
    const species = ["mocha", "latte", "autumn", "summer", "oreo"];
    for (let i = 0; i < 5; i++)
      state.pets.push({
        id: "fixture-" + i,
        speciesId: species[i],
        level: 7,
        iv: { attack: 10, defense: 10, stamina: 10 },
      });
    state.discovered = ["coffee", ...species];
  }
  if (mode === "master") state.balls.master = 1;
  if (mode === "empty")
    state.balls = { basic: 0, super: 0, hyper: 0, master: 0 };
  if (mode === "quests") {
    state.metrics = { caught: 150, great: 40, excellent: 30, raids: 15 };
    state.discovered = [
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
  }
  if (mode === "denied") errorCode = 1;
  if (mode === "inaccurate") accuracy = 100;
}
const fixtureKey =
  "coffee-go-test-" +
  mode +
  "-" +
  (new URLSearchParams(location.search).get("run") || "default");
let raw =
  mode === "corrupt"
    ? "{broken"
    : sessionStorage.getItem(fixtureKey) || JSON.stringify(state);
const storage = {
  getItem: (k) => (k === KEY ? raw : null),
  setItem(k, v) {
    if (mode === "blocked") throw Error("blocked");
    raw = v;
    sessionStorage.setItem(fixtureKey, v);
  },
};
let interval;
const geolocation = {
  watchPosition(ok, fail) {
    clearInterval(interval);
    function send() {
      if (errorCode) fail({ code: errorCode });
      else
        ok({
          coords: { latitude: 37.5665, longitude: 126.978, accuracy, speed: 0 },
          timestamp: now(),
        });
    }
    setTimeout(send, 50);
    interval = setInterval(send, 5000);
    return 1;
  },
  clearWatch() {
    clearInterval(interval);
  },
};
window.fixture = {
  read: () => JSON.parse(raw),
  advance: (ms) => {
    timeOffset += ms;
  },
  setError: (code) => {
    errorCode = code;
  },
  setAccuracy: (a) => {
    accuracy = a;
  },
};
createApp({ document, storage, geolocation, now, random: () => 0 });
