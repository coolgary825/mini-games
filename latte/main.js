// 슈퍼 라떼 랜드 — 화면 그리기, 입력, 메뉴, 이야기, 저장
import { SPRITES, spriteSize, SCREEN_PALETTES, COLOR_PALETTES, THEME_PALETTES, PIECE_PALETTES, THEME_PIECES, THEME_SKY, COSTUMES } from './sprites.js';
import { LEVELS, WORLD_NAMES, ROWS } from './levels.js';
import { Run, T, VIEW_W } from './engine.js';
import { Chip } from './audio.js';

const $ = id => document.getElementById(id);
const cv = $('screen'), g = cv.getContext('2d');
g.imageSmoothingEnabled = false;
const HUD = 16, W = 160, H = 144, SCALE = 2; // 속은 160×144, 실제로는 두 배 해상도로 그려 움직임이 더 부드러워요
const R = v => Math.round(v * SCALE) / SCALE;
const chip = new Chip();
const PLAYERS = ['준우', '은우', '리우', '아빠', '손님'];

// ── 저장 ────────────────────────────────────────────────────
const SAVE_KEY = 'latte-land-v1';
const save = (() => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; } })();
save.player = PLAYERS.includes(save.player) ? save.player : '준우';
save.palette = SCREEN_PALETTES[save.palette] ? save.palette : 'color';
if ((save.v || 1) < 2) { save.palette = 'color'; save.v = 2; } // 기본을 컬러로
save.profiles ??= {};
const profile = () => { const p = (save.profiles[save.player] ??= { unlocked: 0, best: 0, done: false }); p.golds ??= {}; p.costume ??= 'none'; return p; };
// 황금 뼈다귀 수와 꾸미기
const bitCount = n => { let c = 0; for (; n; n &= n - 1) c++; return c; };
const goldTotal = () => Object.values(profile().golds).reduce((a, m) => a + bitCount(m), 0);
const costume = () => { const c = COSTUMES.find(k => k.id === profile().costume); return c && c.spr && goldTotal() >= c.need ? c : null; };
function drawCostume(x, y, face = 1, big = false, pose = '') {
  const c = costume(); if (!c) return;
  const w = spriteSize(SPRITES[c.spr]).w, dy = pose === 'Jump' ? 0 : 0;
  draw(c.spr, face > 0 ? x + c.x : x + 16 - c.x - w, y + c.y + dy, face < 0);
}
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch {} };
chip.setMuted(!!save.muted);

// ── 5×7 비트맵 글꼴 ─────────────────────────────────────────
const FONT = {
  A: '01110 10001 10001 11111 10001 10001 10001', B: '11110 10001 10001 11110 10001 10001 11110', C: '01110 10001 10000 10000 10000 10001 01110',
  D: '11110 10001 10001 10001 10001 10001 11110', E: '11111 10000 10000 11110 10000 10000 11111', F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01111', H: '10001 10001 10001 11111 10001 10001 10001', I: '01110 00100 00100 00100 00100 00100 01110',
  J: '00111 00010 00010 00010 00010 10010 01100', K: '10001 10010 10100 11000 10100 10010 10001', L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001', N: '10001 10001 11001 10101 10011 10001 10001', O: '01110 10001 10001 10001 10001 10001 01110',
  P: '11110 10001 10001 11110 10000 10000 10000', Q: '01110 10001 10001 10001 10101 10010 01101', R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110', T: '11111 00100 00100 00100 00100 00100 00100', U: '10001 10001 10001 10001 10001 10001 01110',
  V: '10001 10001 10001 10001 10001 01010 00100', W: '10001 10001 10001 10101 10101 10101 01010', X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100', Z: '11111 00001 00010 00100 01000 10000 11111',
  0: '01110 10001 10011 10101 11001 10001 01110', 1: '00100 01100 00100 00100 00100 00100 01110', 2: '01110 10001 00001 00010 00100 01000 11111',
  3: '11111 00010 00100 00010 00001 10001 01110', 4: '00010 00110 01010 10010 11111 00010 00010', 5: '11111 10000 11110 00001 00001 10001 01110',
  6: '00110 01000 10000 11110 10001 10001 01110', 7: '11111 00001 00010 00100 01000 01000 01000', 8: '01110 10001 10001 01110 10001 10001 01110',
  9: '01110 10001 10001 01111 00001 00010 01100', x: '00000 00000 10001 01010 00100 01010 10001', '-': '00000 00000 00000 11111 00000 00000 00000',
  '!': '00100 00100 00100 00100 00100 00000 00100', '.': '00000 00000 00000 00000 00000 01100 01100', ':': '00000 01100 01100 00000 01100 01100 00000',
  '?': '01110 10001 00001 00010 00100 00000 00100', '(': '00010 00100 01000 01000 01000 00100 00010', ')': '01000 00100 00010 00010 00010 00100 01000',
  "'": '00100 00100 01000 00000 00000 00000 00000', '/': '00001 00010 00010 00100 01000 01000 10000',
};
function text(str, x, y, color, scale = 1) {
  g.fillStyle = color;
  for (const ch of String(str).toUpperCase().replace(/X(?=\d)/g, 'x')) {
    const glyph = FONT[ch] || (ch === 'x' ? FONT.x : null);
    if (glyph) glyph.split(' ').forEach((row, j) => [...row].forEach((b, i) => { if (b === '1') g.fillRect(x + i * scale, y + j * scale, scale, scale); }));
    x += 6 * scale;
  }
}
const textW = (s, scale = 1) => String(s).length * 6 * scale - scale;

// ── 색 ──────────────────────────────────────────────────────
const CATEGORY = [
  [/^(latte|big)/, 'latte'], [/^mocha/, 'mocha'], [/^coffee/, 'coffee'], [/^bean|^drop/, 'bean'], [/^can/, 'can'], [/^pigeon/, 'pigeon'],
  [/^hedgehog/, 'hedgehog'], [/^cup/, 'cup'], [/^(bone|meat|star|flag)/, 'item'], [/^(ball|smallBall)/, 'ball'], [/^(heart|hydrant|balloon|yarn)/, 'heart'], [/^house/, 'latte'],
];
let theme = 'park';
const isColor = () => !SCREEN_PALETTES[save.palette].colors;
function colorsFor(name) {
  const scr = SCREEN_PALETTES[save.palette].colors;
  if (scr) return scr;
  const piece = THEME_PIECES[theme]?.[name] || PIECE_PALETTES[name];
  if (piece) return piece;
  for (const [re, cat] of CATEGORY) if (re.test(name)) return COLOR_PALETTES[cat];
  return THEME_PALETTES[theme];
}
const bgColors = () => { const scr = SCREEN_PALETTES[save.palette].colors; if (scr) return scr; const k = THEME_SKY[theme] || THEME_SKY.park; return [k.sky, k.far, k.mid, k.ink]; };
const cache = new Map();
function sprite(name, flip = false, flipY = false, colors = colorsFor(name)) {
  const key = name + colors.join('') + flip + flipY;
  let c = cache.get(key);
  if (c) return c;
  const rows = SPRITES[name], { w, h } = spriteSize(rows);
  c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch >= '0' && ch <= '3') { x.fillStyle = colors[+ch]; x.fillRect(flip ? w - 1 - i : i, flipY ? h - 1 - j : j, 1, 1); } }));
  cache.set(key, c); return c;
}
const draw = (name, x, y, flip, flipY, colors) => g.drawImage(sprite(name, flip, flipY, colors), R(x), R(y));
// 히트박스 아래쪽 가운데에 맞춰 그리기
function drawOn(name, e, flip = false, flipY = false, colors, cam = 0) {
  const s = sprite(name, flip, flipY, colors);
  g.drawImage(s, R(e.x + e.w / 2 - s.width / 2 - cam), R(e.y + e.h - s.height + HUD));
}

// ── 입력 ────────────────────────────────────────────────────
const held = { left: 0, right: 0, up: 0, down: 0, a: 0, b: 0, bark: 0, start: 0, select: 0 };
let prev = { ...held };
// 한 프레임보다 짧은 탭도 놓치지 않게 눌림을 다음 프레임까지 기억해요
const tapped = {};
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  KeyZ: 'a', Space: 'a', KeyK: 'a', KeyX: 'b', ShiftLeft: 'b', ShiftRight: 'b', KeyJ: 'b', KeyC: 'bark', KeyL: 'bark',
  Enter: 'start', Escape: 'start', KeyP: 'start', Tab: 'select', Backspace: 'select',
};
addEventListener('keydown', e => {
  const k = KEYMAP[e.code]; chip.unlock();
  if (!k) return;
  if (!e.target.closest?.('select, input')) e.preventDefault();
  if (!e.repeat) { held[k] |= 1; tapped[k] = true; }
});
addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) held[k] &= ~1; });
addEventListener('blur', () => { for (const k in held) held[k] = 0; });

// 화면 버튼(터치·마우스). 십자키는 손가락을 미끄러뜨려도 방향이 바뀌어요.
for (const el of document.querySelectorAll('[data-btn]')) {
  const k = el.dataset.btn;
  const on = e => { e.preventDefault(); chip.unlock(); try { el.setPointerCapture(e.pointerId); } catch {} held[k] |= 2; tapped[k] = true; el.classList.add('down'); if (navigator.vibrate && k !== 'start') navigator.vibrate(8); };
  const off = e => { e.preventDefault(); held[k] &= ~2; el.classList.remove('down'); };
  el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off);
  el.addEventListener('contextmenu', e => e.preventDefault());
}
const pad = $('dpad');
let padPointer = null;
function padDir(e) {
  const r = pad.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), dead = r.width * .12;
  for (const k of ['left', 'right', 'up', 'down']) held[k] &= ~4;
  if (Math.abs(dx) > dead) { const k = dx < 0 ? 'left' : 'right'; if (!(held[k] & 4)) tapped[k] = true; held[k] |= 4; }
  if (Math.abs(dy) > dead * 1.6) { const k = dy < 0 ? 'up' : 'down'; if (!(held[k] & 4)) tapped[k] = true; held[k] |= 4; }
  pad.dataset.dir = ['left', 'right', 'up', 'down'].filter(k => held[k] & 4).join(' ');
}
pad.addEventListener('pointerdown', e => { e.preventDefault(); chip.unlock(); padPointer = e.pointerId; try { pad.setPointerCapture(e.pointerId); } catch {} padDir(e); });
pad.addEventListener('pointermove', e => { if (e.pointerId === padPointer) padDir(e); });
const padOff = e => { if (e.pointerId !== padPointer) return; padPointer = null; for (const k of ['left', 'right', 'up', 'down']) held[k] &= ~4; pad.dataset.dir = ''; };
pad.addEventListener('pointerup', padOff); pad.addEventListener('pointercancel', padOff);
pad.addEventListener('contextmenu', e => e.preventDefault());

function pollGamepad() {
  for (const k in held) held[k] &= ~8;
  const gp = navigator.getGamepads?.().find(Boolean);
  if (!gp) return;
  const b = i => gp.buttons[i]?.pressed, ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
  if (b(14) || ax < -.4) held.left |= 8; if (b(15) || ax > .4) held.right |= 8;
  if (b(12) || ay < -.4) held.up |= 8; if (b(13) || ay > .4) held.down |= 8;
  if (b(0)) held.a |= 8; if (b(1) || b(2)) held.b |= 8; if (b(3)) held.bark |= 8; if (b(9)) held.start |= 8; if (b(8)) held.select |= 8;
}
const pressed = k => (held[k] && !prev[k]) || !!tapped[k];

// ── 화면 위 메뉴·대화·안내 ──────────────────────────────────
const menuEl = $('menu'), dialogEl = $('dialog'), hintEl = $('hint'), cardEl = $('card');
let menu = null, dialog = null, hintTimer = 0;
function openMenu(title, items, onBack) {
  menu = { items, index: Math.max(0, items.findIndex(i => !i.disabled)), onBack };
  menuEl.hidden = false;
  menuEl.innerHTML = '';
  if (title) { const h = document.createElement('h2'); h.textContent = title; menuEl.append(h); }
  items.forEach((it, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = it.label; b.disabled = !!it.disabled;
    if (it.small) { const s = document.createElement('small'); s.textContent = it.small; b.append(s); }
    b.addEventListener('pointerenter', () => { if (!it.disabled) { menu.index = i; paintMenu(); } });
    b.addEventListener('click', () => { chip.unlock(); if (!it.disabled) { chip.sfx('select'); it.action(); } });
    menuEl.append(b);
  });
  paintMenu();
}
function paintMenu() { [...menuEl.querySelectorAll('button')].forEach((b, i) => b.classList.toggle('on', i === menu.index)); menuEl.querySelectorAll('button')[menu.index]?.scrollIntoView({ block: 'nearest' }); }
function closeMenu() { menu = null; menuEl.hidden = true; menuEl.innerHTML = ''; }
function menuInput() {
  if (!menu) return false;
  const n = menu.items.length, move = d => { let i = menu.index; for (let k = 0; k < n; k++) { i = (i + d + n) % n; if (!menu.items[i].disabled) break; } menu.index = i; chip.sfx('select'); paintMenu(); };
  if (pressed('down')) move(1);
  if (pressed('up')) move(-1);
  if (pressed('a') || pressed('start')) { const it = menu.items[menu.index]; if (it && !it.disabled) { chip.sfx('select'); it.action(); } }
  else if (pressed('b') && menu?.onBack) menu.onBack();
  return true;
}
function say(lines, done) {
  dialog = { lines: [...lines], done }; hintEl.hidden = true; hintTimer = 0;
  showLine();
}
function showLine() {
  const line = dialog.lines.shift();
  const m = /^([^:]{1,4}):\s*(.*)$/.exec(line);
  dialogEl.hidden = false;
  dialogEl.querySelector('b').textContent = m ? m[1] : '';
  dialogEl.querySelector('p').textContent = m ? m[2] : line;
  dialogEl.dataset.who = m ? m[1] : '';
  dialog.wait = 12;
}
function dialogInput() {
  if (!dialog) return false;
  if (dialog.wait > 0) { dialog.wait--; return true; }
  if (mode === 'story' && pressed('start')) { const s = scene; dialog = null; dialogEl.hidden = true; scene = null; s?.done(); return true; }
  if (pressed('a') || pressed('b') || pressed('start')) advanceDialog();
  return true;
}
function advanceDialog() {
  if (!dialog || dialog.wait > 0) return;
  chip.sfx('select');
  if (dialog.lines.length) return showLine();
  const done = dialog.done; dialog = null; dialogEl.hidden = true; done?.();
}
cv.addEventListener('pointerdown', e => { e.preventDefault(); chip.unlock(); if (mode === 'title' && !menu && modeT > 10) quickStart(); else if (mode === 'card' && modeT > 8) beginRun(); });
dialogEl.addEventListener('pointerdown', e => { e.preventDefault(); chip.unlock(); advanceDialog(); });
function hint(textKo) { hintEl.textContent = textKo; hintEl.hidden = false; hintTimer = 60 * 5; }

// ── 게임 흐름 ───────────────────────────────────────────────
let mode = 'title', run = null, stageIndex = 0, carry = null, checkpoint = null, modeT = 0, scene = null, lastScore = 0;
const newCarry = () => ({ lives: save.easy ? 99 : 3, score: 0, bones: 0, big: false, power: null });

function toTitle() {
  mode = 'title'; modeT = 0; run = null; closeMenu(); cardEl.hidden = true; theme = 'park'; syncUi();
  chip.play('title');
}
// 누르자마자 시작: 저장된 스테이지부터 이어서, 처음이면 짧은 이야기부터
function quickStart() {
  const p = profile();
  startGame(Math.min(p.unlocked, LEVELS.length - 1), !p.story);
  if (!p.story) { p.story = true; persist(); }
}
function titleMenu() {
  const p = profile(), next = Math.min(p.unlocked, LEVELS.length - 1);
  openMenu('', [
    { label: p.unlocked > 0 ? `이어하기 ${LEVELS[next].id}` : '모험 시작', small: p.unlocked > 0 ? LEVELS[next].name : '라떼가 모카를 구하러 가요', action: () => startGame(next, p.unlocked === 0) },
    { label: '라떼 꾸미기', small: `황금 뼈다귀 ${goldTotal()} / 27개 모음`, action: costumeMenu },
    { label: '스테이지 고르기', small: `${Math.min(p.unlocked + 1, LEVELS.length)} / ${LEVELS.length} 스테이지 열림`, action: stageSelect },
    { label: `플레이어: ${save.player}`, small: '플레이어마다 기록을 따로 저장해요', action: () => { save.player = PLAYERS[(PLAYERS.indexOf(save.player) + 1) % PLAYERS.length]; persist(); titleMenu(); } },
    { label: `화면 색: ${SCREEN_PALETTES[save.palette].name}`, small: '원조 초록 · 포켓 회색 · 컬러', action: () => { const ks = Object.keys(SCREEN_PALETTES); save.palette = ks[(ks.indexOf(save.palette) + 1) % ks.length]; persist(); syncScreenColor(); titleMenu(); } },
    { label: `쉬운 모드: ${save.easy ? '켜짐' : '꺼짐'}`, small: save.easy ? '목숨 99개 · 시간 제한 없음' : '원작처럼 목숨 3개 · 시간 제한', action: () => { save.easy = !save.easy; persist(); titleMenu(); } },
    { label: `소리: ${save.muted ? '꺼짐' : '켜짐'}`, action: () => { save.muted = !save.muted; chip.setMuted(save.muted); persist(); if (!save.muted) chip.play('title'); titleMenu(); } },
  ], () => { closeMenu(); });
  const m = menu; m.index = 0; paintMenu();
}
function costumeMenu() {
  const have = goldTotal(), p = profile();
  openMenu(`라떼 꾸미기 · 황금 뼈다귀 ${have}개`, [
    ...COSTUMES.map(c => ({ label: `${p.costume === c.id ? '✓ ' : ''}${c.name}`, small: have >= c.need ? (c.need ? '입어 보기' : '꾸미지 않아요') : `🔒 황금 뼈다귀 ${c.need}개가 필요해요`, disabled: have < c.need, action: () => { p.costume = c.id; persist(); chip.sfx('power'); costumeMenu(); } })),
    { label: '← 뒤로', action: titleMenu },
  ], titleMenu);
}
function stageSelect() {
  const p = profile();
  openMenu('스테이지 고르기', [
    ...LEVELS.map((L, i) => ({ label: `${L.id}  ${L.name}`, small: i > p.unlocked ? '🔒 앞 스테이지를 깨면 열려요' : `${WORLD_NAMES[+L.id[0] - 1]} · 황금 뼈다귀 ${'★'.repeat(bitCount(p.golds[L.id] || 0))}${'☆'.repeat(3 - bitCount(p.golds[L.id] || 0))}`, disabled: i > p.unlocked, action: () => startGame(i, false) })),
    { label: '← 뒤로', action: titleMenu },
  ], titleMenu);
}
function startGame(index, withStory) {
  closeMenu(); carry = newCarry(); lastScore = 0;
  if (withStory) return startStory(() => showCard(index));
  showCard(index);
}
function showCard(index) {
  stageIndex = index; checkpoint = null; mode = 'card'; modeT = 0; run = null;
  const L = LEVELS[index]; theme = L.theme; syncUi();
  cardEl.hidden = false; cardEl.querySelector('b').textContent = `WORLD ${L.id}`; cardEl.querySelector('span').textContent = L.name;
  chip.stop(); chip.jingle('course');
}
function beginRun() {
  cardEl.hidden = true;
  const L = LEVELS[stageIndex]; theme = L.theme; syncUi();
  run = new Run(L, carry, hooks, { easy: save.easy, checkpoint, goldHave: profile().golds[L.id] || 0 });
  mode = 'play'; modeT = 0;
}
const hooks = {
  sound: n => { if (n === 'die') chip.jingle('die'); else if (n === 'clear') chip.jingle('clear'); else chip.sfx(n); },
  music: n => { if (n) chip.play(n); else chip.stop(); },
  hint,
  say,
  dead: ({ checkpoint: cp }) => {
    checkpoint = cp;
    if (!save.easy) carry.lives--;
    if (carry.lives <= 0) return gameOver();
    mode = 'card'; modeT = 0; run = null;
    const L = LEVELS[stageIndex];
    cardEl.hidden = false; cardEl.querySelector('b').textContent = `WORLD ${L.id}`; cardEl.querySelector('span').textContent = cp !== null ? `${L.name} · 소화전부터` : L.name;
  },
  clear: () => {
    const p = profile();
    p.unlocked = Math.max(p.unlocked, stageIndex + 1); p.best = Math.max(p.best, carry.score); persist();
    const next = stageIndex + 1;
    if (next >= LEVELS.length) return startEnding();
    if (!LEVELS[stageIndex].boss) { setTimeout(() => startBonus(next), 300); mode = 'wait'; return; }
    setTimeout(() => showCard(next), 400);
    mode = 'wait';
  },
  gold: i => {
    const p = profile(), id = LEVELS[stageIndex].id, before = goldTotal(), first = !p.golds[id] && before === 0;
    p.golds[id] = (p.golds[id] || 0) | (1 << i); persist();
    const now = goldTotal(), opened = COSTUMES.find(c => c.need > before && c.need <= now);
    if (opened) hint(`새 꾸미기가 열렸어요: ${opened.name}! 첫 화면에서 SELECT → 라떼 꾸미기`);
    else if (first) hint('황금 뼈다귀! 스테이지마다 3개씩 숨어 있어요. 모으면 라떼를 꾸밀 수 있어요.');
  },
  ending: () => { const p = profile(); p.unlocked = LEVELS.length - 1; p.done = true; p.best = Math.max(p.best, carry.score); persist(); startEnding(); },
};
// ── 보너스 룰렛(스테이지를 깨면) ───────────────────────────
const PRIZES = [{ spr: 'heart', name: '목숨 하나 더!' }, { spr: 'meat', name: '고기! 커다란 라떼로 출발' }, { spr: 'ball', name: '테니스공 파워!' }, { spr: 'bone', name: '뼈다귀 10개!' }];
let bonus = null;
function startBonus(next) {
  mode = 'bonus'; modeT = 0; run = null; theme = 'park'; syncUi();
  bonus = { next, idx: 0, speed: 3, t: 0, stopping: false, done: false, doneT: 0 };
  chip.play('star'); hintEl.hidden = true;
}
function updateBonus() {
  const b = bonus; b.t++;
  if (!b.done) {
    if (!b.stopping && (pressed('a') || pressed('b') || pressed('start') || b.t > 60 * 6)) { b.stopping = true; b.t = 0; }
    if (b.t % b.speed === 0) { b.idx = (b.idx + 1) % PRIZES.length; chip.sfx('tick'); if (b.stopping) b.speed += 2; }
    if (b.stopping && b.speed > 17) {
      b.done = true; b.doneT = 0; chip.stop(); chip.sfx('oneup');
      const k = PRIZES[b.idx];
      if (k.spr === 'heart') carry.lives = Math.min(99, carry.lives + 1);
      else if (k.spr === 'meat') carry.big = true;
      else if (k.spr === 'ball') { carry.big = true; carry.power = 'ball'; }
      else { carry.bones += 10; while (carry.bones >= 100) { carry.bones -= 100; carry.lives = Math.min(99, carry.lives + 1); } }
      hint(k.name);
    }
  } else if (++b.doneT > 110 || (b.doneT > 30 && (pressed('a') || pressed('start')))) { bonus = null; showCard(b.next); }
}
function renderBonus() {
  const c = bgColors(), b = bonus; if (!b) return;
  g.fillStyle = c[0]; g.fillRect(0, 0, W, H); if (isColor()) drawBackdrop(modeT * .5);
  for (let x = 0; x < W; x += 8) { draw('t_top', x, 120); draw('t_dirt', x, 128); draw('t_dirt', x, 136); }
  text('BONUS GAME', 80 - textW('BONUS GAME') / 2, 26, c[3]);
  if (!b.done && (modeT >> 4) % 2) text('PRESS A!', 80 - textW('PRESS A!') / 2, 80, c[3]);
  PRIZES.forEach((k, i) => {
    const x = 14 + i * 34, y = 44, on = i === b.idx, flash = b.done && on && (b.doneT >> 3) % 2;
    g.fillStyle = on ? (isColor() ? '#ffcf3a' : c[2]) : c[3]; g.fillRect(x - 2, y - 2, 30, 30);
    g.fillStyle = flash ? c[1] : (isColor() ? '#fff8ea' : c[0]); g.fillRect(x, y, 26, 26);
    const s = spriteSize(SPRITES[k.spr]); draw(k.spr, x + 13 - s.w / 2, y + 13 - s.h / 2 - (k.spr === 'bone' ? 3 : 0));
    if (k.spr === 'bone') text('10', x + 7, y + 16, isColor() ? '#2b2233' : c[3]);
  });
  const lx = 14 + b.idx * 34 + 5;
  draw(b.done ? 'latteBark' : (modeT >> 3) % 2 ? 'latteWalk1' : 'latteStand', lx, 104); drawCostume(lx, 104);
}
function gameOver() {
  mode = 'gameover'; modeT = 0; run = null; chip.stop(); chip.jingle('gameover');
  const p = profile(); p.best = Math.max(p.best, carry.score); persist();
}
function pauseMenu() {
  mode = 'pause'; chip.sfx('pause'); chip.musicBus && (chip.musicBus.gain.value = .15);
  openMenu('잠깐 쉬어요', [
    { label: '계속하기', action: resume },
    { label: '이 스테이지 처음부터', action: () => { closeMenu(); checkpoint = null; resume(); beginRun(); } },
    { label: `소리: ${save.muted ? '꺼짐' : '켜짐'}`, action: () => { save.muted = !save.muted; chip.setMuted(save.muted); persist(); pauseMenu(); } },
    { label: `화면 색: ${SCREEN_PALETTES[save.palette].name}`, action: () => { const ks = Object.keys(SCREEN_PALETTES); save.palette = ks[(ks.indexOf(save.palette) + 1) % ks.length]; persist(); syncScreenColor(); pauseMenu(); } },
    { label: '타이틀로', action: toTitle },
  ], resume);
}
function resume() { closeMenu(); mode = 'play'; if (chip.musicBus) chip.musicBus.gain.value = .55; }

// ── 이야기 장면 ─────────────────────────────────────────────
function startStory(done) {
  mode = 'story'; modeT = 0; theme = 'park'; chip.play('park2');
  scene = { t: 0, phase: 0, latte: 40, mocha: 92, coffee: 190, carry: false, done };
  say(['모카: 라떼야~ 오늘 날씨 정말 좋다!', '라떼: 멍멍! 공원에서 같이 놀자!'], () => { scene.phase = 1; scene.t = 0; });
}
function updateStory() {
  const s = scene; s.t++;
  if (s.phase === 1) { s.coffee -= 2.2; if (s.coffee <= s.mocha + 12) { s.phase = 2; chip.sfx('bossJump'); say(['커피: 냐하하! 모카는 내가 데려간다냥!', '모카: 꺄악! 라떼, 도와줘~!'], () => { s.phase = 3; s.carry = true; }); } }
  if (s.phase === 3) { s.coffee += 2.4; s.mocha = s.coffee + 2; if (s.coffee > 200) { s.phase = 4; say(['라떼: 멍! 기다려, 모카!', '라떼: 내가 꼭 구해 줄게!'], () => { scene = null; s.done(); }); } }
}
function startEnding() {
  mode = 'ending'; modeT = 0; theme = 'park'; chip.play('ending');
  scene = { t: 0, phase: 0, hearts: [] };
  setTimeout(() => say(['모카: 라떼, 구하러 와 줘서 정말 고마워!', '커피: 미안해... 이제 나도 친구 해도 돼냥?', '라떼: 멍멍! 우리 셋이 매일매일 같이 놀자!'], () => { scene.phase = 1; }), 600);
}

// ── 한 프레임 ───────────────────────────────────────────────
function step() {
  pollGamepad();
  modeT++;
  if (hintTimer > 0 && --hintTimer === 0) hintEl.hidden = true;
  if (dialogInput()) return endStep();
  if (menuInput()) return endStep();
  if (mode === 'title') { if (modeT > 10) { if (pressed('select')) titleMenu(); else if (['a', 'b', 'start', 'bark', 'left', 'right', 'up', 'down'].some(pressed)) quickStart(); } }
  else if (mode === 'card') { if (modeT > 100 || (modeT > 8 && (pressed('a') || pressed('start')))) beginRun(); }
  else if (mode === 'play') {
    if (pressed('start')) pauseMenu();
    else if (pressed('select')) { const ks = Object.keys(SCREEN_PALETTES); save.palette = ks[(ks.indexOf(save.palette) + 1) % ks.length]; persist(); syncScreenColor(); chip.sfx('select'); hint(`화면 색: ${SCREEN_PALETTES[save.palette].name} (SELECT로 바꿔요)`); }
    else if (window.__latte.autopilot) run.update(window.__latte.autopilot(run));
    else run.update({ left: !!held.left, right: !!held.right, up: !!held.up, down: !!held.down, a: !!held.a, b: !!held.b, aPressed: pressed('a'), bPressed: pressed('b'), barkPressed: pressed('bark') });
  }
  else if (mode === 'story') { if (scene) updateStory(); }
  else if (mode === 'ending') { if (scene) scene.t++; if (scene?.phase === 1 && modeT > 120 && (pressed('a') || pressed('start'))) toTitle(); }
  else if (mode === 'bonus') { if (bonus) updateBonus(); }
  else if (mode === 'gameover') { if (modeT > 90 && (pressed('a') || pressed('start'))) toTitle(); }
  endStep();
  const barkBtn = $('bark');
  if (run && mode === 'play') { const cd = run.player.barkCd; barkBtn.classList.toggle('ready', cd === 0); barkBtn.style.setProperty('--cd', (cd / 150).toFixed(2)); }
  else { barkBtn.classList.add('ready'); barkBtn.style.setProperty('--cd', 0); }
}

function endStep() { prev = { ...held }; for (const k in tapped) delete tapped[k]; }

// ── 그리기 ──────────────────────────────────────────────────
function tileSprite(c, tx, ty, r) {
  switch (c) {
    case '#': return theme === 'castle' ? 't_castle' : /[#]/.test(r.tile(tx, ty - 1)) ? 't_dirt' : 't_top';
    case 'B': return 't_brick'; case '?': return (r.frame >> 4) % 3 === 2 ? 't_q1' : 't_q0'; case 'U': return 't_used'; case 'H': return 't_hard';
    case '[': return 't_pipeTL'; case ']': return 't_pipeTR'; case '{': return 't_pipeBL'; case '}': return 't_pipeBR';
    case '=': return 't_plat'; case 'c': return 't_cloudPlat'; case '^': return 't_spike'; case '~': return (r.frame >> 4) % 2 ? 't_liquid1' : 't_liquid0';
    case 'C': return 't_castle';
  }
  return null;
}
function renderRun(r) {
  const shake = r.shake > 0 ? ((r.shake % 2) * 2 - 1) * Math.min(2, r.shake * .25) : 0;
  g.translate(0, shake);
  const cam = R(r.cam), L = r.L;
  const bg = bgColors();
  g.fillStyle = bg[0]; g.fillRect(0, HUD, W, H - HUD);
  if (isColor()) drawBackdrop(cam);
  // 배경 장식
  for (const d of L.decor) { const s = SPRITES[d.spr]; if (!s) continue; const w = spriteSize(s).w; if (d.x + w < cam || d.x > cam + W) continue; draw(d.spr, d.x - cam, d.y + HUD); }
  // 골: 깃대·개집
  if (L.goal) {
    const gx = L.goal.tx * T - cam;
    if (gx > -40 && gx < W + 8) {
      draw('t_poleTop', gx, 3 * T + HUD - 8);
      for (let y = 3; y < ROWS - 4; y++) draw('t_pole', gx, y * T + HUD);
      draw('flag', gx - 5, (r.flag ? r.flag.y : 3 * T) + HUD);
      draw('house', gx + 3 * T, (ROWS - 3) * T - 16 + HUD);
    }
  }
  // 소화전
  for (const c of r.checks) { const x = c.tx * T - cam; if (x > -16 && x < W) draw(c.on ? 'hydrantOn' : 'hydrant', x - 1, r.groundBelow(c.tx * T + 4, 0) - 12 + HUD); }
  // 보스 방의 우리(마지막 성)
  if (L.boss?.final) {
    const x = (L.boss.arena + 15) * T - cam, y = (ROWS - 3) * T - 19 + HUD, freed = r.state === 'bossEnd' || r.state === 'done';
    if (!freed) { draw('mochaSit', x + 3, y + 2); draw('cage', x - 1, y); }
    else draw('mochaWave', x + 3 - Math.min(40, r.stateT * .5), y + 3, true);
  }
  // 타일
  const tx0 = Math.floor(cam / T), tx1 = tx0 + W / T + 1;
  for (let ty = 0; ty < ROWS; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const c = r.tile(tx, ty), x = tx * T - cam, y = ty * T + HUD - (bumpOffset(r, tx, ty));
    if (c === 'o') { draw('bone', x, y + 1 + (((r.frame >> 3) + tx) % 4 === 0 ? -1 : 0)); continue; }
    if (c === 'G') { const i = L.golds.findIndex(q => q.tx === tx && q.ty === ty), old = r.goldHave & (1 << i); if (old) g.globalAlpha = .4; draw('goldBone', x - 1, y + 1 + Math.round(Math.sin((r.frame + tx * 9) / 10))); g.globalAlpha = 1; if (!old && (r.frame + tx * 13) % 50 < 8) draw('twinkle', x + 5, y - 2); continue; }
    if (c === 'h') { if (r.reveal > 0 && (r.frame >> 2) % 2) { g.globalAlpha = .45; draw('t_q0', x, y); g.globalAlpha = 1; } continue; }
    if (tx < 0 || tx >= L.w) continue;
    const name = tileSprite(c, tx, ty, r); if (name) draw(name, x, y);
  }
  for (const m of r.movers) for (let i = 0; i < m.w; i += T) draw(theme === 'sky' ? 't_cloudPlat' : 't_plat', m.x + i - cam, m.y + HUD);
  // 아이템
  for (const it of r.things) {
    const name = it.kind === 'bonePop' ? 'bone' : it.kind;
    if (it.rise > 0) { g.save(); g.beginPath(); g.rect(0, HUD, W, Math.round(it.y + it.rise * .5 + 8) - 8 + HUD); g.clip(); drawOn(name, it, false, false, undefined, cam); g.restore(); }
    else drawOn(name, it, false, false, undefined, cam);
  }
  // 적
  for (const e of r.enemies) {
    const walk = (e.t >> 3) % 2, flip = e.dir > 0;
    let name = { bean: walk ? 'beanStep' : 'bean', can: walk ? 'canStep' : 'can', hedgehog: walk ? 'hedgehogStep' : 'hedgehog', pigeon: (e.t >> 3) % 2 ? 'pigeonUp' : 'pigeon', cup: 'cup' }[e.type];
    if (e.state === 'flat') name = 'beanFlat';
    if (e.state === 'shell') name = 'canShell';
    const flipY = e.dead && e.state === 'fall' || e.stun > 0 && e.type !== 'pigeon';
    if (e.stun > 0 && e.stun < 50 && (e.t >> 2) % 2) continue;
    drawOn(name, e, e.type === 'pigeon' ? false : flip, flipY, undefined, cam);
  }
  // 보스
  const b = r.boss;
  if (b && !(b.hurt > 0 && (b.hurt >> 2) % 2)) {
    const name = b.hurt > 0 || b.dead ? 'coffeeHurt' : b.ground && Math.abs(b.vx) > .1 ? ((b.t >> 3) % 2 ? 'coffeeB' : 'coffeeA') : 'coffeeA';
    drawOn(name, b, b.dir > 0, b.stun > 0 && false, undefined, cam);
  }
  for (const f of r.foes) drawOn(f.kind === 'drop' ? 'drop' : 'yarn', f, false, false, undefined, cam);
  for (const s of r.shots) drawOn('smallBall', s, false, false, undefined, cam);
  drawPlayer(r, cam);
  // 효과
  const ink = bg[3];
  for (const f of r.fx) {
    if (f.kind === 'ring') { g.strokeStyle = ink; g.lineWidth = .75; g.beginPath(); g.arc(R(f.x - cam) + .25, R(f.y) + HUD + .25, (22 - f.life) * 2.2 + 4, 0, Math.PI * 2); g.stroke(); if (f.life > 10) { g.beginPath(); g.arc(R(f.x - cam) + .25, R(f.y) + HUD + .25, (22 - f.life) * 1.3 + 2, 0, Math.PI * 2); g.stroke(); } }
    else if (f.kind === 'brick') draw('brickBit', f.x - cam, f.y + HUD);
    else if (f.kind === 'dust') { g.fillStyle = isColor() ? '#ffffffcc' : bg[1]; const r2 = 1 + (12 - f.life) * .18; g.beginPath(); g.arc(R(f.x - cam), R(f.y) + HUD - r2 * .6, r2, 0, Math.PI * 2); g.fill(); }
    else if (f.kind === 'sparkle') { const k = (f.big ? 30 : 14) - f.life, d = k * (f.big ? .8 : .6); for (let i = 0; i < (f.big ? 6 : 4); i++) { const a = i * Math.PI * 2 / (f.big ? 6 : 4) + k * .1; g.fillStyle = isColor() ? (i % 2 ? '#fff6a0' : '#ffffff') : ink; g.fillRect(R(f.x - cam + Math.cos(a) * d) - .5, R(f.y + Math.sin(a) * d) + HUD - .5, 1, 1); } }
    else if (f.kind === 'splash') draw('puff', f.x - cam - 3, f.y + HUD - 2);
    else if (f.kind === 'stars') for (let i = 0; i < 3; i++) { const a = f.life * .2 + i * 2.1; draw('twinkle', f.x - cam + Math.cos(a) * 7 - 2, f.y + HUD + Math.sin(a) * 2 - 2); }
  }
  for (const q of r.pops) { const s = String(q.text); textSmall(s, Math.round(q.x - cam), Math.round(q.y) + HUD, ink); }
  // 멍! 말풍선
  const p = r.player;
  if (p.barkT > 8 && !p.hidden) { g.fillStyle = isColor() ? '#ffffff' : bg[0]; g.fillRect(Math.round(p.x - cam) + (p.face > 0 ? 10 : -22), Math.round(p.y) + HUD - 11, 22, 10); g.strokeStyle = ink; g.strokeRect(Math.round(p.x - cam) + (p.face > 0 ? 10 : -22) + .5, Math.round(p.y) + HUD - 10.5, 21, 9); textSmall('WOOF', Math.round(p.x - cam) + (p.face > 0 ? 12 : -20), Math.round(p.y) + HUD - 9, ink); }
  g.translate(0, -shake);
  renderHud(r);
}
function bumpOffset(r, tx, ty) { const v = r.bumps.get(`${tx},${ty}`); return v ? [0, 1, 2, 3, 4, 4, 3, 2, 1][v] || 0 : 0; }
function drawPlayer(r, cam) {
  const p = r.player;
  if (p.hidden) return;
  if (p.inv > 0 && (r.frame >> 2) % 2 && r.state === 'play') return;
  const big = carry.big && !r.fly && r.state !== 'dying';
  let pose = 'Stand';
  if (r.state === 'dying') pose = 'Jump';
  else if (r.fly || !p.ground && r.state === 'play' || r.state === 'pole') pose = 'Jump';
  else if (p.barkT > 0) pose = 'Bark';
  else if (Math.abs(p.vx) > .1) pose = Math.floor(p.anim) % 2 ? 'Walk1' : 'Walk2';
  const name = (big ? 'big' : 'latte') + pose;
  let colors;
  if (p.star > 0) { const base = SCREEN_PALETTES[save.palette].colors; colors = (r.frame >> 2) % 2 ? (base ? [...base].reverse() : COLOR_PALETTES.item) : undefined; }
  else if (carry.power === 'ball' && !SCREEN_PALETTES[save.palette].colors) colors = ['#ffffff', '#f5d27a', '#6aa84f', '#1d2a10'];
  if (r.fly) { draw('balloon', p.x - cam + 3, p.y + HUD - 11); }
  drawOn(name, p, p.face < 0, r.state === 'dying', colors, cam);
  if (r.state !== 'dying') { const s = sprite(name, p.face < 0, false, colors); drawCostume(R(p.x + p.w / 2 - s.width / 2 - cam), R(p.y + p.h - s.height + HUD), p.face < 0 ? -1 : 1); }
}
function textSmall(s, x, y, color) {
  // 3×5 작은 숫자 글꼴(점수 팝업)
  const D = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001111', U: '101101101101111', P: '111101111100100', O: '111101101101111', K: '101101110101101', W: '101101111111101', F: '111100110100100', '!': '010010010000010' };
  g.fillStyle = color;
  for (const ch of s) { const m = D[ch]; if (m) [...m].forEach((bit, i) => { if (bit === '1') g.fillRect(x + (i % 3), y + Math.floor(i / 3), 1, 1); }); x += 4; }
}
function renderHud(r) {
  const c = bgColors(), col = isColor(), ink = col ? '#ffffff' : c[3], num = col ? '#ffd76a' : c[3];
  g.fillStyle = col ? '#1d2140' : c[0]; g.fillRect(0, 0, W, HUD);
  if (col) { g.fillStyle = '#ffffff22'; g.fillRect(0, HUD - .5, W, .5); }
  const pad2 = n => String(Math.max(0, n)).padStart(2, '0');
  text('LATTE', 2, 1, ink); text('x' + pad2(carry.lives), 32, 1, num);
  text(String(carry.score).padStart(6, '0'), 2, 9, num);
  draw('bone', 42, 8); text('x' + pad2(carry.bones), 50, 9, num);
  if (carry.power === 'ball') draw('ball', 58, 0);
  if (r.player.star > 0) draw('star', 68, 0);
  if (r.fly) for (let i = 0; i < 3; i++) if (i < r.player.flyHp) draw('heart', 58 + i * 7, 0);
  if (r.L.golds?.length) for (let i = 0; i < 3; i++) { const got = r.gold & (1 << i), old = r.goldHave & (1 << i), x = 68 + i * 4; g.fillStyle = got ? (col ? '#ffd23a' : ink) : old ? (col ? '#8a6a20' : c[2]) : (col ? '#ffffff44' : c[1]); g.fillRect(x, 10, 3, 5); }
  text('WORLD', 82, 1, ink); text(r.L.id, 88, 9, num);
  if (r.boss && !r.boss.dead) { text('BOSS', 130, 1, ink); for (let i = 0; i < r.boss.hp; i++) draw('heart', 152 - i * 8, 8); }
  else { text('TIME', 130, 1, ink); text(save.easy ? '---' : String(r.time).padStart(3, '0'), 136, 9, num); }
}
function renderTitle() {
  const c = bgColors(), ink = c[3];
  g.fillStyle = c[0]; g.fillRect(0, 0, W, H);
  draw('cloud', 10, 10); draw('cloud', 120, 24);
  // 로고 판
  const col = isColor(), frame = col ? ['#5a2e14', '#ffb347', '#fff6e0'] : [c[3], c[1], c[0]];
  if (col) drawBackdrop(0);
  g.fillStyle = frame[0]; g.fillRect(14, 22, 132, 44); g.fillStyle = frame[1]; g.fillRect(16, 24, 128, 40); g.fillStyle = frame[2]; g.fillRect(18, 26, 124, 36);
  text('SUPER', 80 - textW('SUPER') / 2, 29, col ? '#2f6fd0' : c[2]);
  if (col) text('LATTE', 80 - textW('LATTE', 2) / 2 + 1, 39, '#f4b08a', 2);
  text('LATTE', 80 - textW('LATTE', 2) / 2, 38, col ? '#d4502a' : ink, 2);
  text('LAND', 80 - textW('LAND') / 2, 54, col ? '#2f6fd0' : c[2]);
  for (let x = 0; x < W; x += 8) { draw('t_top', x, 120); draw('t_dirt', x, 128); draw('t_dirt', x, 136); }
  draw('hill', 100, 104); draw('bush', 8, 114);
  const bob = (modeT >> 4) % 2;
  draw(bob ? 'latteWalk1' : 'latteStand', 44, 104); drawCostume(44, 104);
  draw('mochaSit', 64, 104);
  draw('coffeeA', 124, 101 + (modeT % 120 < 60 ? 0 : 2), true);
  if ((modeT >> 5) % 2 === 0 && !menu) text('PRESS ANY BUTTON', 80 - textW('PRESS ANY BUTTON') / 2, 71, ink);
  if (!menu) text('SELECT: MENU', 80 - textW('SELECT: MENU') / 2, 81, c[2]);
  text("(C)2026 JUNWOO'S", 80 - textW("(C)2026 JUNWOO'S") / 2, 93, c[2]);
}
function renderCard() {
  const c = bgColors(), ink = c[3], L = LEVELS[stageIndex];
  g.fillStyle = c[0]; g.fillRect(0, 0, W, H);
  text('WORLD ' + L.id, 80 - textW('WORLD ' + L.id) / 2, 40, ink);
  draw(carry.big ? 'bigStand' : 'latteStand', 56, 70 - (carry.big ? 4 : 0)); drawCostume(56, 70 - (carry.big ? 4 : 0));
  text('x ' + String(carry.lives).padStart(2, '0'), 78, 76, ink);
  if (save.easy) text('EASY', 80 - textW('EASY') / 2, 100, c[2]);
}
function renderStory() {
  theme = 'park'; const c = bgColors();
  g.fillStyle = c[0]; g.fillRect(0, 0, W, H); if (isColor()) drawBackdrop(0);
  draw('cloud', 20, 20); draw('cloud', 110, 12); draw('tree', 124, 84); draw('bush', 4, 108);
  for (let x = 0; x < W; x += 8) { draw('t_top', x, 120); draw('t_dirt', x, 128); draw('t_dirt', x, 136); }
  const s = scene; if (!s) return;
  const walk = (modeT >> 3) % 2;
  draw(s.phase >= 4 ? (walk ? 'latteWalk1' : 'latteBark') : 'latteStand', s.latte, 104);
  if (s.phase < 3) draw('mochaSit', s.mocha, 104, false);
  if (s.coffee < 200) {
    draw(s.phase === 1 || s.phase === 3 ? (walk ? 'coffeeB' : 'coffeeA') : 'coffeeA', s.coffee, 101, s.phase === 3);
    if (s.carry) draw('mochaWave', s.coffee + 3, 88, true);
  }
}
function renderEnding() {
  theme = 'park'; const c = bgColors();
  g.fillStyle = c[0]; g.fillRect(0, 0, W, H); if (isColor()) drawBackdrop(0);
  draw('cloud', 16, 14); draw('cloud', 112, 26); draw('hill', 110, 104); draw('tree', 8, 84);
  for (let x = 0; x < W; x += 8) { draw('t_top', x, 120); draw('t_dirt', x, 128); draw('t_dirt', x, 136); }
  const t = modeT, hop = k => (Math.floor((t + k * 20) / 16) % 2) * -2;
  draw('latteStand', 40, 104 + hop(0)); drawCostume(40, 104 + hop(0)); draw('mochaWave', 62, 104 + hop(1)); draw('coffeeA', 86, 101 + hop(2));
  for (let i = 0; i < 5; i++) { const y = 96 - ((t * .4 + i * 23) % 70); draw('heart', 30 + i * 22 + Math.sin((t + i * 30) / 15) * 3, y); }
  if (scene?.phase === 1) {
    text('THE END', 80 - textW('THE END', 2) / 2, 20, c[3], 2);
    text('SCORE ' + String(carry?.score ?? 0).padStart(6, '0'), 80 - textW('SCORE 000000') / 2, 44, c[2]);
    if ((t >> 5) % 2) text('PRESS A', 80 - textW('PRESS A') / 2, 60, c[3]);
  }
}
function renderGameOver() {
  const c = bgColors();
  g.fillStyle = c[0]; g.fillRect(0, 0, W, H);
  text('GAME OVER', 80 - textW('GAME OVER') / 2, 56, c[3]);
  draw('latteJump', 72, 76, false, true);
  text('SCORE ' + String(carry?.score ?? 0).padStart(6, '0'), 80 - textW('SCORE 000000') / 2, 100, c[2]);
}
// 컬러 모드의 먼 배경(천천히 따라 움직여요)
const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function drawBackdrop(cam) {
  const k = THEME_SKY[theme]; if (!k) return;
  const ground = (ROWS - 3) * T + HUD;
  g.save(); g.beginPath(); g.rect(0, HUD, W, H - HUD); g.clip();
  if (theme === 'park') {
    const off = cam * .25;
    for (let i = Math.floor(off / 48) - 1; i < off / 48 + 5; i++) { const r = 22 + hash(i) * 20; g.fillStyle = hash(i + 50) > .5 ? k.far : '#a6df8c'; g.beginPath(); g.ellipse(i * 48 - off + 24, ground, r, r * .75, 0, Math.PI, Math.PI * 2); g.fill(); }
  } else if (theme === 'sky') {
    const off = cam * .2; g.fillStyle = k.far;
    for (let i = Math.floor(off / 40) - 1; i < off / 40 + 6; i++) { const y = HUD + 16 + hash(i) * 80, r = 10 + hash(i + 9) * 12; g.beginPath(); g.ellipse(i * 40 - off, y, r * 1.8, r * .7, 0, 0, Math.PI * 2); g.fill(); }
  } else if (theme === 'roof') {
    const off = cam * .35;
    for (let i = Math.floor(off / 20) - 1; i < off / 20 + 10; i++) {
      const w = 12 + hash(i) * 8, h = 18 + hash(i + 3) * 40, x = i * 20 - off;
      g.fillStyle = k.far; g.fillRect(x, ground - h, w, h + 16);
      g.fillStyle = '#ffe89a';
      for (let wy = 0; wy < h - 6; wy += 5) for (let wx = 2; wx < w - 2; wx += 4) if (hash(i * 31 + wy * 7 + wx) > .62) g.fillRect(x + wx, ground - h + 3 + wy, 1.5, 1.5);
    }
  } else if (theme === 'sewer' || theme === 'castle') {
    const off = cam * .5; g.fillStyle = k.far;
    for (let y = HUD; y < H; y += 8) for (let x = -((off + (y / 8 % 2) * 8) % 16) - 16; x < W; x += 16) { g.fillRect(x, y, 15.5, 7.5); }
    if (theme === 'castle') for (let i = Math.floor(off / 64) - 1; i < off / 64 + 4; i++) { const x = i * 64 - off + 30; g.fillStyle = '#c0304a'; g.fillRect(x, HUD + 20, 10, 26); g.fillStyle = '#ffd76a'; g.fillRect(x + 4, HUD + 26, 2, 2); }
  } else if (theme === 'factory') {
    const off = cam * .3;
    for (let i = Math.floor(off / 36) - 1; i < off / 36 + 6; i++) {
      const x = i * 36 - off, h = 40 + hash(i) * 40;
      g.fillStyle = k.far; g.fillRect(x, ground - h, 9, h); g.fillStyle = '#c98a5a'; g.fillRect(x, ground - h + 4, 9, 2);
      g.fillStyle = '#fff4e4aa'; const t = (modeT * .3 + i * 20) % 30; g.beginPath(); g.ellipse(x + 4.5 + t * .3, ground - h - 4 - t * .5, 3 + t * .12, 2 + t * .08, 0, 0, Math.PI * 2); g.fill();
    }
  }
  g.restore();
}
function render() {
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0); g.imageSmoothingEnabled = false;
  if (mode === 'title') renderTitle();
  else if (mode === 'card') renderCard();
  else if (mode === 'story') renderStory();
  else if (mode === 'ending') renderEnding();
  else if (mode === 'gameover') renderGameOver();
  else if (mode === 'bonus') renderBonus();
  else if (run) renderRun(run);
}

function syncScreenColor() { syncUi(); cache.clear(); }
// 화면 위 글상자 색: 컬러 모드는 크림색 상자, 흑백 모드는 화면 색 그대로
function syncUi() {
  const c = bgColors(), st = document.documentElement.style;
  st.setProperty('--lcd', isColor() ? '#fffaf0' : c[0]); st.setProperty('--lcd-ink', isColor() ? '#2b2233' : c[3]); st.setProperty('--sky', c[0]);
}
// 화면 한 칸이 기기 화소에 딱 맞으면 도트가 고르게 보여요(크기가 10% 넘게 줄면 그냥 꽉 채워요)
function fitScreen() {
  const r = cv.parentElement.getBoundingClientRect(), dpr = devicePixelRatio || 1, dev = r.width * dpr, k = Math.floor(dev / W);
  if (k >= 2 && k * W / dev >= .9) { cv.style.width = k * W / dpr + 'px'; cv.style.height = k * H / dpr + 'px'; }
  else { cv.style.width = ''; cv.style.height = ''; }
}
new ResizeObserver(fitScreen).observe(cv.parentElement);

// ── 시작 ────────────────────────────────────────────────────
let acc = 0, last = performance.now(), paused = false;
function loop(now) {
  acc += Math.min(100, now - last); last = now;
  const dt = 1000 / 60;
  while (acc >= dt) { if (!paused) step(); acc -= dt; }
  render();
  requestAnimationFrame(loop);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden && mode === 'play' && !menu && !dialog) pauseMenu();
});
syncScreenColor();
toTitle();
if ('serviceWorker' in navigator && location.protocol === 'https:') addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
requestAnimationFrame(loop);
// 테스트·디버그용 창구
window.__latte = { get run() { return run; }, get mode() { return mode; }, get carry() { return carry; }, get menu() { return menu; }, get dialog() { return dialog; }, startGame, showCard, beginRun, LEVELS, save };
