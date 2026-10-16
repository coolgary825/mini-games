import { createApp } from "./app.mjs?v=discovery2";
createApp({
  document,
  storage: {
    getItem: (k) => localStorage.getItem(k),
    setItem: (k, v) => localStorage.setItem(k, v),
  },
  geolocation: navigator.geolocation,
  now: Date.now,
  random: Math.random,
});
