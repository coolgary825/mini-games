// 슈퍼 라떼 랜드 스테이지. 한 칸은 8픽셀, 높이는 16칸(화면 한 줄)이에요.
// 타일: '#' 땅 · 'B' 벽돌 · '?' 물음표 블록 · 'U' 빈 블록 · 'H' 단단한 블록 · '[' ']' '{' '}' 토관
//       'h' 숨은 블록 · '=' 발판(위에서만 밟혀요) · 'c' 구름 발판 · 'o' 뼈다귀 · 'G' 황금 뼈다귀 · '^' 가시 · '~' 뜨거운 커피(용암) · 'C' 성벽 · 'F' 무너지는 블록 · 'J' 통통 젤리
export const ROWS = 16;
export const GROUND = 13;

class Builder {
  constructor(id, name, width, opt = {}) {
    Object.assign(this, { id, name, w: width, theme: 'park', time: 400, mode: 'run', music: 'park' }, opt);
    this.g = Array.from({ length: ROWS }, () => Array(width).fill('.'));
    this.items = {}; this.enemies = []; this.decor = []; this.movers = []; this.checks = []; this.hints = [];
    this.goal = null; this.boss = null; this.start = { tx: 2, ty: GROUND }; this.golds = [];
  }
  set(x, y, c) { if (x >= 0 && x < this.w && y >= 0 && y < ROWS) this.g[y][x] = c; return this; }
  fill(x0, x1, y0, y1, c) { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) this.set(x, y, c); return this; }
  ground(x0, x1, top = GROUND) { return this.fill(x0, x1, top, ROWS - 1, '#'); }
  hole(x0, x1) { return this.fill(x0, x1, 0, ROWS - 1, '.'); }
  liquid(x0, x1) { this.hole(x0, x1); return this.fill(x0, x1, 14, 15, '~'); }
  // 문자열로 한 줄 놓기. '?'와 'h'와 아이템이 든 'B'는 kinds에서 차례로 내용물을 받아요.
  row(x, y, str, ...kinds) {
    [...str].forEach((c, i) => {
      if (c === ' ') return;
      this.set(x + i, y, c === 'b' ? 'B' : c);
      if ((c === '?' || c === 'h' || c === 'b') && kinds.length) this.items[`${x + i},${y}`] = kinds.shift();
    });
    return this;
  }
  // 황금 뼈다귀: 스테이지마다 3개, 빈칸에만 놓아요
  gold(x, y) {
    if (this.g[y][x] !== '.') throw Error(`${this.id} 황금 뼈다귀 자리 (${x},${y})가 비어 있지 않아요: ${this.g[y][x]}`);
    this.golds.push({ tx: x, ty: y }); return this.set(x, y, 'G');
  }
  q(x, y, kind = 'bone') { return this.row(x, y, '?', kind); }
  hidden(x, y, kind = 'heart') { return this.row(x, y, 'h', kind); }
  bones(x, y, n, dy = 0) { for (let i = 0; i < n; i++) this.set(x + i, y + Math.round(dy * i), 'o'); return this; }
  pipe(x, top, bottom = GROUND - 1) {
    this.set(x, top, '[').set(x + 1, top, ']');
    for (let y = top + 1; y <= bottom; y++) this.set(x, y, '{').set(x + 1, y, '}');
    return this;
  }
  stairs(x, h, dir = 1, base = GROUND - 1, c = 'H') {
    for (let i = 0; i < h; i++) for (let k = 0; k <= i; k++) this.set(dir > 0 ? x + i : x + h - 1 - i, base - k, c);
    return this;
  }
  plat(x, y, w, c = '=') { for (let i = 0; i < w; i++) this.set(x + i, y, c); return this; }
  // 적 위치: 서 있는 땅 줄(ty)을 비우면 그 칸 아래 첫 땅을 찾아요.
  e(type, x, ty) {
    if (ty === undefined) { ty = 2; while (ty < ROWS && !(/[#BU?H\[\]{}=cC^FJ]/.test(this.g[ty][x]) && !/[#BU?H\[\]{}=cC^FJ]/.test(this.g[ty - 1][x]))) ty++; }
    this.enemies.push({ type, tx: x, ty }); return this;
  }
  crumble(x, y, w) { for (let i = 0; i < w; i++) this.set(x + i, y, 'F'); return this; }
  ember(x, peak) { this.enemies.push({ type: 'ember', tx: x, ty: peak, air: true }); return this; }
  fly(type, x, y) { this.enemies.push({ type, tx: x, ty: y, air: true }); return this; }
  mover(x, y, w, axis, range, speed = 1) { this.movers.push({ tx: x, ty: y, w, axis, range, speed }); return this; }
  check(x) { this.checks.push(x); return this; }
  finish(x) { this.goal = { tx: x }; this.stairsBase(x); return this; }
  stairsBase(x) { this.set(x, GROUND - 1, 'H'); }
  deco(spr, x, y) { this.decor.push({ spr, x: x * 8, y: y * 8 }); return this; }
  hint(x, text) { this.hints.push({ tx: x, text }); return this; }
  bossArena(x0, hp, final = false, kind = 'coffee') {
    this.boss = { arena: x0, hp, final, kind, tx: x0 + ({ dragon: 12, owl: 12, scorpion: 13, crab: 13, jelly: 13, gorilla: 13, ghost: 12, ufo: 11 }[kind] || 15) };
    this.fill(x0 + 19, x0 + 19, 0, GROUND - 1, 'H');
    return this;
  }
  build() {
    const { id, name, w, theme, time, mode, music, items, enemies, decor, movers, checks, hints, goal, boss, start, golds, meteors = false, endless = false } = this;
    return { id, name, w, theme, time, mode, music, rows: this.g.map(r => r.join('')), items, enemies, decor, movers, checks, hints, goal, boss, start, golds, meteors, endless };
  }
}

function parkDecor(b, from, to) {
  for (let x = from; x < to; x += 23) b.deco('cloud', x + 3, 1 + (x % 3));
  for (let x = from + 8; x < to; x += 31) b.deco('hill', x, GROUND - .75);
  for (let x = from + 16; x < to; x += 27) b.deco(x % 2 ? 'bush' : 'tree', x, x % 2 ? GROUND - .75 : GROUND - 1.5);
}
function nightDecor(b, from, to) {
  b.deco('moon', from + 12, 2);
  for (let x = from; x < to; x += 9) b.deco('twinkle', x + (x * 7) % 5, 1 + (x * 13) % 6);
}
function skyDecor(b, from, to) { for (let x = from; x < to; x += 17) b.deco('cloud', x, 2 + (x * 3) % 9); }

// ── WORLD 1 · 햇살 공원 ──────────────────────────────────────
function w1s1() {
  const b = new Builder('1-1', '햇살 공원', 200, { theme: 'park', music: 'park' });
  parkDecor(b, 0, 200);
  b.ground(0, 45).ground(49, 95).ground(100, 140).ground(144, 199);
  b.hint(1, '→ 로 걸어요. A(Z)로 점프! B(X)를 누른 채로 달려요.');
  b.q(10, 9).hint(8, '? 블록을 머리로 쿵! 뼈다귀 100개면 목숨이 하나 늘어요.');
  b.row(14, 9, 'B?B?B', 'power', 'bone').q(16, 5, 'bone');
  b.e('bean', 21).hint(17, '커피콩은 위에서 밟으면 납작해져요!');
  b.pipe(25, 11).e('bean', 30).pipe(34, 10).bones(38, 9, 5).e('bean', 41).e('bean', 43);
  b.bones(46, 9, 3);
  b.row(53, 9, '?B?', 'clock', 'bone').hidden(58, 8, 'heart').e('can', 61).hint(59, '깡통을 밟으면 멈춰요. 한 번 더 건드리면 쭈욱 미끄러져요!');
  b.stairs(66, 4).fill(70, 72, GROUND - 4, GROUND - 1, 'H').stairs(73, 4, -1);
  b.check(79).hint(78, '소화전에 닿으면 여기서 다시 시작할 수 있어요.');
  b.row(82, 9, 'BBbB', 'star').row(83, 5, '??', 'bone', 'power').e('bean', 87).e('bean', 89).e('can', 93);
  b.plat(96, 10, 3).bones(96, 8, 3);
  b.pipe(104, 10).e('bean', 108).pipe(112, 9);
  b.row(118, 9, 'B?BB?B', 'bone', 'power');
  b.e('hedgehog', 128).hint(122, '고슴도치는 밟으면 아파요! 멍!(C)으로 기절시킨 뒤 밟아요.');
  b.e('bean', 134).bones(141, 9, 3);
  b.e('bean', 148).e('bean', 150);
  b.stairs(152, 8).fill(160, 160, GROUND - 8, GROUND - 1, 'H');
  b.finish(170);
  b.gold(18, 4); b.gold(98, 6); b.gold(162, 2);
  b.check(130);
  return b.build();
}

function w1s2() {
  const b = new Builder('1-2', '공원 지하 하수도', 190, { theme: 'sewer', music: 'sewer', time: 400 });
  b.fill(0, 189, 0, 1, 'B');
  b.ground(0, 30).liquid(31, 36).ground(37, 70).liquid(71, 78).ground(79, 120).liquid(121, 124).ground(125, 189);
  b.hint(3, '어두운 하수도예요. 뜨거운 물에 빠지지 않게 조심!');
  b.row(12, 9, 'BB?BB', 'power').e('bean', 20).e('bean', 23);
  b.mover(31, 11, 3, 'x', 3);
  b.pipe(40, 10).e('hedgehog', 45).fill(48, 50, 10, 12, 'B');
  b.row(53, 8, '????', 'bone', 'shield', 'power', 'bigBone').e('can', 57).e('can', 61);
  b.check(65);
  b.mover(71, 10, 4, 'x', 3);
  b.fill(84, 96, 8, 8, 'B').bones(85, 11, 10).e('bean', 88).e('bean', 91).e('bean', 94);
  b.stairs(100, 4).stairs(104, 4, -1).e('hedgehog', 110).e('can', 114);
  b.hidden(116, 9, 'heart');
  b.plat(121, 10, 4);
  b.row(130, 9, 'B?B', 'power').pipe(138, 9).bones(141, 8, 6).e('bean', 146).e('hedgehog', 152);
  b.row(156, 9, 'bBB', 'bones').e('can', 160);
  b.stairs(164, 5).fill(169, 170, GROUND - 5, GROUND - 1, 'H');
  b.finish(178);
  b.gold(51, 6); b.gold(117, 5); b.gold(123, 6);
  b.check(140);
  return b.build();
}

function w1s3() {
  const b = new Builder('1-3', '커피의 놀이터', 158, { theme: 'park', music: 'park2', time: 350 });
  parkDecor(b, 0, 118);
  b.ground(0, 40).ground(46, 80).ground(85, 157);
  b.hint(2, '저 멀리 커피가 기다리고 있어요. 비둘기는 날아다녀요!');
  b.fill(18, 19, GROUND - 1, GROUND - 1, '^').bones(17, 8, 4);
  b.fly('pigeon', 26, 8).fly('pigeon', 36, 7);
  b.mover(41, 10, 3, 'x', 2);
  b.row(50, 9, '?B?', 'power', 'bone').e('bean', 55).e('bean', 58).e('hedgehog', 63);
  b.check(69);
  b.plat(81, 10, 4);
  b.fly('pigeon', 92, 8).e('can', 96).fly('pigeon', 101, 6).row(104, 9, 'B?B', 'power');
  b.row(110, 9, '??', 'heart', 'shield');
  b.hint(116, '커피는 밟거나 테니스공으로 맞혀요. 멍! 하면 잠깐 어지러워해요.');
  b.bossArena(120, 2);
  b.gold(19, 7); b.gold(51, 5); b.gold(82, 7);
  b.check(100);
  return b.build();
}

// ── WORLD 2 · 달밤 지붕 골목 ─────────────────────────────────
function w2s1() {
  const b = new Builder('2-1', '달밤 지붕 골목', 212, { theme: 'roof', music: 'roof', time: 400 });
  nightDecor(b, 0, 212);
  const roofs = [[0, 24, 13], [28, 44, 12], [48, 60, 11], [64, 84, 13], [88, 96, 10], [100, 124, 12], [128, 140, 13], [144, 160, 11], [164, 180, 12], [184, 211, 13]];
  for (const [a, z, top] of roofs) b.ground(a, z, top);
  b.hint(2, '지붕 사이를 폴짝! 달리면서(B) 뛰면 더 멀리 가요.');
  b.row(8, 9, '?B?', 'bone', 'power').e('bean', 14).pipe(20, 11);
  b.bones(25, 9, 3).e('can', 36).row(32, 8, 'BbB', 'bones');
  b.fly('pigeon', 45, 7).pipe(52, 9).e('bean', 57);
  b.bones(61, 8, 3).e('hedgehog', 70).row(72, 9, 'B?B?', 'power', 'bone').e('bean', 78);
  b.plat(85, 11, 3).q(92, 6, 'star');
  b.check(104).fly('pigeon', 110, 6).e('can', 114).e('bean', 118).pipe(121, 10);
  b.plat(125, 10, 3).row(132, 9, 'hB?', 'heart', 'bone').e('hedgehog', 136);
  b.fly('pigeon', 142, 8).e('bean', 150).e('bean', 153).pipe(157, 9);
  b.plat(161, 10, 3).row(168, 8, 'B??B', 'wing', 'power').e('can', 174);
  b.stairs(186, 6).fill(192, 193, GROUND - 6, GROUND - 1, 'H');
  b.finish(201);
  b.gold(95, 4); b.gold(126, 7); b.gold(152, 6);
  b.check(170);
  return b.build();
}

function w2s2() {
  const b = new Builder('2-2', '풍선 타고 밤하늘', 250, { theme: 'sky', music: 'sky', time: 300, mode: 'fly' });
  skyDecor(b, 0, 250);
  b.start = { tx: 3, ty: 7 };
  b.hint(1, '풍선을 타고 날아요! 방향키로 움직이고 A나 B로 테니스공을 던져요.');
  b.bones(14, 5, 5).fly('pigeon', 24, 6).fly('pigeon', 28, 10);
  b.fill(34, 36, 0, 4, 'H').fill(34, 36, 11, 15, 'H').bones(35, 7, 1).bones(35, 8, 1);
  b.fly('pigeon', 44, 4).fly('pigeon', 46, 12).fly('pigeon', 52, 8);
  b.fill(58, 60, 9, 15, 'H').e('cup', 59, 9).bones(62, 3, 6);
  b.fly('pigeon', 70, 5).fly('pigeon', 74, 9).fly('pigeon', 78, 13);
  b.fill(86, 88, 0, 6, 'H').fill(96, 98, 8, 15, 'H').e('cup', 97, 8).bones(90, 10, 5);
  b.fly('pigeon', 106, 3).fly('pigeon', 110, 7).fly('pigeon', 114, 11).fly('pigeon', 118, 5);
  b.fill(124, 126, 0, 3, 'H').fill(124, 126, 10, 15, 'H').bones(125, 6, 1);
  b.bones(132, 9, 8, -.4).fly('pigeon', 140, 6).fly('pigeon', 142, 11);
  b.fill(150, 152, 5, 9, 'H').bones(154, 3, 4).bones(154, 12, 4);
  b.fly('pigeon', 164, 4).fly('pigeon', 168, 8).fly('pigeon', 172, 12).fly('pigeon', 176, 6).fly('pigeon', 180, 10);
  b.fill(188, 190, 0, 5, 'H').fill(188, 190, 11, 15, 'H').fill(200, 202, 7, 15, 'H');
  b.bones(206, 4, 6).fly('pigeon', 214, 5).fly('pigeon', 220, 9);
  b.gold(35, 9); b.gold(97, 4); b.gold(189, 8);
  return b.build();
}

function w2s3() {
  const b = new Builder('2-3', '빨랫줄 탑', 172, { theme: 'roof', music: 'roof2', time: 350 });
  nightDecor(b, 0, 132);
  b.ground(0, 18).ground(62, 72).ground(98, 105).ground(114, 171);
  b.hint(2, '빨랫줄은 위에서만 밟을 수 있어요. 아래로 떨어지지 않게!');
  b.plat(20, 11, 4).plat(26, 9, 4).plat(32, 7, 4).bones(33, 5, 3).plat(38, 9, 4).e('hedgehog', 40, 9).plat(44, 11, 5);
  b.plat(51, 10, 4).fly('pigeon', 54, 6).plat(57, 12, 4);
  b.row(64, 9, 'B?B', 'power').e('can', 69).check(66);
  b.plat(74, 11, 3).plat(79, 9, 3).plat(84, 11, 3).fly('pigeon', 86, 6).plat(89, 9, 3).e('bean', 90, 9).plat(94, 11, 3);
  b.row(100, 9, '?', 'heart').plat(107, 10, 5).bones(107, 8, 5);
  b.row(118, 9, '??', 'power', 'shield').e('hedgehog', 124);
  b.hint(126, '커피가 더 빨라졌어요! 털실 공을 조심해요.');
  b.bossArena(132, 3);
  b.gold(34, 3); b.gold(80, 5); b.gold(111, 6);
  b.check(118);
  return b.build();
}

// ── WORLD 3 · 커피 성 ────────────────────────────────────────
function w3s1() {
  const b = new Builder('3-1', '커피 공장', 214, { theme: 'factory', music: 'factory', time: 400 });
  b.ground(0, 26).liquid(27, 31).ground(32, 58).liquid(59, 66).ground(67, 104).liquid(105, 110).ground(111, 150).liquid(151, 158).ground(159, 213);
  b.hint(2, '커피 공장이에요! 커피잔은 뜨거운 방울을 뱉어요.');
  b.row(8, 9, 'B?B', 'power').e('cup', 16).e('bean', 21).plat(27, 10, 5);
  b.pipe(36, 10).e('can', 42).e('cup', 48).row(50, 8, '???', 'magnet', 'power', 'clock').e('bean', 55);
  b.mover(59, 11, 4, 'x', 4).bones(60, 7, 6);
  b.check(70).e('hedgehog', 76).e('cup', 82).fill(86, 88, 9, 12, 'H').e('cup', 87, 9).e('bean', 94).e('bean', 97).row(98, 9, 'bB', 'star');
  b.mover(105, 10, 4, 'y', 3);
  b.pipe(114, 9).e('can', 120).e('can', 124).row(128, 8, 'BhB', 'heart').e('cup', 134).e('hedgehog', 140).e('bean', 146);
  b.mover(151, 11, 4, 'x', 4);
  b.e('cup', 166).stairs(172, 6).fill(178, 179, GROUND - 6, GROUND - 1, 'H').e('bean', 183);
  b.finish(196);
  b.gold(88, 4); b.gold(62, 6); b.gold(178, 2);
  b.check(135);
  return b.build();
}

function w3s2() {
  const b = new Builder('3-2', '구름 다리', 206, { theme: 'sky', music: 'sky2', time: 400 });
  skyDecor(b, 0, 206);
  b.ground(0, 14).ground(92, 104).ground(190, 205);
  b.hint(2, '구름 다리를 건너요. 아래는 끝없는 하늘이에요!');
  b.plat(16, 11, 5, 'c').plat(23, 9, 4, 'c').e('bean', 25, 9).plat(29, 11, 5, 'c').bones(30, 9, 4).plat(36, 8, 4, 'c');
  b.fly('pigeon', 40, 5).plat(42, 10, 6, 'c').e('can', 45, 10).plat(50, 12, 4, 'c').plat(55, 9, 6, 'c').q(57, 5, 'power');
  b.mover(62, 10, 4, 'x', 4).plat(71, 11, 5, 'c').e('hedgehog', 73, 11).fly('pigeon', 76, 6).plat(78, 9, 4, 'c').plat(84, 11, 6, 'c');
  b.check(96).row(97, 9, '?b?', 'wing', 'star', 'bigBone');
  b.plat(106, 11, 4, 'c').fly('pigeon', 110, 7).plat(112, 9, 4, 'c').plat(118, 7, 4, 'c').bones(119, 5, 3).plat(124, 10, 5, 'c').e('bean', 126, 10);
  b.mover(131, 9, 4, 'y', 3).plat(137, 11, 5, 'c').e('can', 139, 11).fly('pigeon', 143, 5).plat(144, 9, 4, 'c');
  b.row(146, 5, 'h', 'heart').plat(150, 11, 4, 'c').mover(156, 10, 4, 'x', 6).plat(167, 9, 5, 'c').e('hedgehog', 169, 9);
  b.plat(174, 11, 4, 'c').fly('pigeon', 178, 6).plat(180, 9, 4, 'c').plat(185, 11, 4, 'c');
  b.finish(198);
  b.gold(37, 4); b.gold(120, 3); b.gold(148, 5);
  return b.build();
}

function w3s3() {
  const b = new Builder('3-3', '커피 성의 꼭대기', 178, { theme: 'castle', music: 'castle', time: 400 });
  b.fill(0, 177, 0, 1, 'C');
  b.ground(0, 22).liquid(23, 27).ground(28, 50).liquid(51, 58).ground(59, 90).liquid(91, 95).ground(96, 177);
  for (let x = 4; x < 130; x += 14) b.deco('windowS', x, 4);
  b.hint(2, '드디어 커피 성이에요! 모카가 저 안에 있어요.');
  b.row(8, 9, 'C?C', 'power').e('hedgehog', 14).fill(18, 19, GROUND - 1, GROUND - 1, '^').plat(23, 10, 5);
  b.e('can', 32).fill(36, 38, 9, 12, 'C').e('cup', 37, 9).e('bean', 42).e('bean', 45).row(46, 8, '?', 'bone');
  b.mover(51, 11, 4, 'x', 4).bones(52, 7, 6);
  b.check(62).e('hedgehog', 66).row(68, 9, 'C?C?C', 'power', 'shield').e('can', 74).fill(78, 79, GROUND - 1, GROUND - 1, '^').e('cup', 84);
  b.mover(91, 10, 4, 'y', 3);
  b.row(100, 9, 'hC', 'heart').e('hedgehog', 104).e('bean', 108).e('can', 112).row(116, 8, '??', 'power', 'star');
  b.e('bean', 122).e('hedgehog', 126);
  b.hint(134, '마지막 대결! 커피를 이기면 모카를 구할 수 있어요.');
  b.bossArena(138, 4, true);
  b.gold(36, 5); b.gold(54, 5); b.gold(118, 4);
  b.check(110);
  return b.build();
}


function volcanoDecor(b, from, to) { for (let x = from + 6; x < to; x += 41) b.deco('volcano', x, GROUND - 1); }

// ── WORLD 4 · 불꽃 화산 (더 어려워요) ────────────────────────
function w4s1() {
  const b = new Builder('4-1', '불꽃 화산 골짜기', 216, { theme: 'volcano', music: 'volcano', time: 350 });
  volcanoDecor(b, 0, 216);
  b.ground(0, 20).liquid(21, 26).ground(27, 45).liquid(46, 55).ground(56, 80).liquid(81, 88).ground(89, 120).liquid(121, 127).ground(128, 160).liquid(161, 170).ground(171, 215);
  b.hint(2, '용 에스프레소의 화산이에요! 용암에서 불꽃이 튀어 올라요.');
  b.row(8, 9, '?B?', 'power', 'bone').ember(23, 6);
  b.e('dino', 34).hint(30, '꼬마 용은 불을 뿜어요. 위에서 밟으면 돼요!').fly('bat', 40, 4);
  b.crumble(46, 12, 10).ember(50, 6).hint(44, '금이 간 블록은 밟으면 무너져요. 멈추지 말고 건너요!');
  b.row(60, 9, '?B?', 'clock', 'power').e('dino', 66).e('dino', 72).e('hedgehog', 76);
  b.mover(82, 11, 3, 'x', 3, 1.2).ember(86, 5);
  b.check(92).fly('bat', 98, 4).e('hedgehog', 100).fly('bat', 104, 5).pipe(108, 10).e('dino', 114);
  b.crumble(122, 11, 5).ember(124, 5);
  b.row(134, 8, '??', 'shield', 'bigBone').e('dino', 140).fly('bat', 146, 4).e('cup', 152);
  b.crumble(162, 11, 1).crumble(165, 10, 1).crumble(168, 11, 1).ember(164, 5).ember(167, 6);
  b.stairs(180, 6).fill(186, 187, GROUND - 6, GROUND - 1, 'H').e('dino', 193);
  b.finish(202);
  b.gold(37, 7); b.gold(100, 7); b.gold(165, 6);
  b.check(140);
  return b.build();
}

function w4s2() {
  const b = new Builder('4-2', '용암 동굴', 200, { theme: 'volcano', music: 'volcano2', time: 330 });
  b.fill(0, 199, 0, 1, 'B');
  b.ground(0, 18).liquid(19, 24).ground(25, 50).liquid(51, 60).ground(61, 90).liquid(91, 98).ground(99, 130).liquid(131, 140).ground(141, 199);
  b.hint(3, '뜨거운 동굴이에요. 천장의 박쥐를 조심해요!');
  b.mover(19, 11, 3, 'y', 3, 1.2).ember(22, 4);
  b.fill(30, 44, 2, 6, 'B').fly('bat', 34, 7).fly('bat', 40, 7).e('dino', 46);
  b.mover(51, 11, 3, 'x', 4, 1.2).ember(58, 4);
  b.check(64).row(66, 9, 'B?B', 'power').e('hedgehog', 70).e('dino', 76).fill(80, 82, 9, 12, 'B').fly('bat', 86, 6);
  b.crumble(92, 12, 6).ember(95, 5);
  b.e('dino', 104).e('dino', 110).row(114, 8, '?h?', 'bigBone', 'heart', 'magnet').fly('bat', 118, 5).e('can', 122).e('hedgehog', 126);
  b.mover(131, 11, 3, 'x', 3, 1.3).crumble(138, 11, 2).ember(136, 4);
  b.e('dino', 148).fly('bat', 152, 6).e('cup', 156).stairs(165, 5).fill(170, 171, GROUND - 5, GROUND - 1, 'H');
  b.finish(182);
  b.gold(42, 8); b.gold(96, 8); b.gold(172, 3);
  b.check(115);
  return b.build();
}

function w4s3() {
  const b = new Builder('4-3', '용의 둥지 입구', 160, { theme: 'volcano', music: 'volcano', time: 320 });
  volcanoDecor(b, 0, 130);
  b.ground(0, 30).liquid(31, 36).ground(37, 60).liquid(61, 68).ground(69, 100).liquid(101, 106).ground(107, 159);
  b.hint(2, '땅이 흔들려요... 커다란 용이 가까이 있어요!');
  b.crumble(32, 11, 4).ember(34, 5);
  b.e('dino', 44).fly('bat', 50, 4).e('hedgehog', 55);
  b.mover(62, 11, 3, 'x', 3, 1.2).ember(66, 4);
  b.check(72).row(76, 9, '?B?', 'power', 'shield').e('dino', 84).e('dino', 90).fly('bat', 94, 5);
  b.crumble(102, 11, 4).ember(104, 5);
  b.row(114, 9, '??', 'heart', 'power').e('can', 120);
  b.hint(126, '용은 날아다니며 불을 뿜어요. 땅에 내려와 쉴 때 머리를 밟아요!');
  b.bossArena(136, 4, false, 'dragon');
  b.gold(34, 7); b.gold(77, 5); b.gold(118, 5);
  b.check(112);
  return b.build();
}

// ── WORLD 5 · 용의 하늘 성 (가장 어려워요) ───────────────────
function w5s1() {
  const b = new Builder('5-1', '바람 부는 구름 성벽', 220, { theme: 'dragon', music: 'dragon', time: 330 });
  skyDecor(b, 0, 220);
  b.ground(0, 14);
  b.hint(2, '용의 하늘 성이에요! 구름과 무너지는 블록뿐이에요.');
  b.plat(16, 11, 4, 'c').crumble(22, 10, 2).plat(26, 9, 4, 'c').e('dino', 28, 9).plat(32, 11, 5, 'c').fly('bat', 36, 6).crumble(39, 10, 3);
  b.fill(44, 48, 11, 15, 'C').e('hedgehog', 46, 11).plat(51, 9, 3, 'c').fly('pigeon', 54, 6).plat(56, 11, 4, 'c').mover(62, 10, 3, 'x', 4, 1.3);
  b.fill(70, 80, 12, 15, 'C').check(72).row(74, 8, '?B?', 'power', 'wing').e('dino', 78, 12);
  b.crumble(82, 11, 2).crumble(86, 10, 2).crumble(90, 11, 2).fly('bat', 88, 5);
  b.fill(94, 100, 10, 15, 'C').e('cup', 97, 10).plat(103, 8, 4, 'c').fly('bat', 106, 4).plat(109, 11, 3, 'c').mover(114, 10, 3, 'y', 4, 1.2).plat(119, 7, 4, 'c').e('dino', 120, 7).plat(125, 10, 4, 'c');
  b.crumble(131, 11, 6).fly('bat', 134, 6);
  b.fill(139, 146, 11, 15, 'C').e('hedgehog', 143, 11).row(141, 7, '?', 'shield');
  b.mover(149, 11, 3, 'x', 5, 1.4).plat(160, 9, 4, 'c').fly('pigeon', 162, 5).plat(166, 11, 4, 'c').e('dino', 168, 11).crumble(172, 10, 3);
  b.ground(178, 219).stairs(184, 6).fill(190, 191, GROUND - 6, GROUND - 1, 'H');
  b.finish(202);
  b.gold(29, 6); b.gold(99, 6); b.gold(121, 4);
  b.check(142);
  return b.build();
}

function w5s2() {
  const b = new Builder('5-2', '용의 하늘길', 270, { theme: 'dragon', music: 'sky', time: 300, mode: 'fly' });
  skyDecor(b, 0, 270);
  b.start = { tx: 3, ty: 7 };
  b.hint(1, '다시 풍선이에요! 이번엔 박쥐와 불꽃이 가득해요.');
  b.bones(12, 6, 5).fly('pigeon', 22, 5).fly('bat', 26, 10);
  b.fill(30, 32, 0, 5, 'C').fill(30, 32, 11, 15, 'C').fly('bat', 40, 4).fly('bat', 44, 10).fly('pigeon', 48, 7);
  b.fill(56, 58, 8, 15, 'C').e('dino', 57, 8).fill(66, 68, 0, 5, 'C').fly('bat', 74, 9).fly('bat', 78, 3).fly('pigeon', 82, 12);
  b.fill(90, 92, 0, 4, 'C').fill(90, 92, 10, 15, 'C').fill(100, 102, 5, 10, 'C').fly('pigeon', 108, 2).fly('pigeon', 110, 13);
  b.fill(118, 120, 9, 15, 'C').e('cup', 119, 9).fill(126, 128, 0, 5, 'C').fly('bat', 134, 10).fly('bat', 138, 4).fly('bat', 142, 8);
  b.fill(150, 152, 0, 4, 'C').fill(150, 152, 10, 15, 'C').bones(151, 6, 1).bones(151, 7, 1).fill(160, 162, 5, 9, 'C');
  b.fly('pigeon', 170, 3).fly('bat', 172, 12).fly('pigeon', 176, 7).fly('bat', 180, 4).fly('bat', 184, 10);
  b.fill(192, 194, 0, 6, 'C').fill(202, 204, 8, 15, 'C').e('dino', 203, 8).fill(212, 214, 0, 4, 'C').fill(212, 214, 10, 15, 'C');
  b.fly('bat', 222, 5).fly('bat', 226, 11).fly('pigeon', 230, 8).bones(236, 5, 6).fly('bat', 244, 7);
  b.gold(61, 3); b.gold(131, 10); b.gold(213, 7);
  return b.build();
}

function w5s3() {
  const b = new Builder('5-3', '에스프레소의 성', 184, { theme: 'dragon', music: 'dragon', time: 350 });
  b.fill(0, 183, 0, 1, 'C');
  b.ground(0, 20).liquid(21, 27).ground(28, 48).liquid(49, 58).ground(59, 84).liquid(85, 94).ground(95, 124).liquid(125, 130).ground(131, 183);
  for (let x = 4; x < 140; x += 14) b.deco('windowS', x, 4);
  b.hint(2, '마지막 성이에요! 모카가 저 안에 있어요.');
  b.crumble(22, 11, 5).ember(24, 5).e('dino', 34).fill(38, 39, GROUND - 1, GROUND - 1, '^').fly('bat', 42, 5).e('hedgehog', 45);
  b.mover(49, 11, 3, 'x', 5, 1.4).ember(53, 4).ember(56, 5);
  b.check(62).row(64, 9, 'C?C?C', 'power', 'shield').e('dino', 70).fill(74, 75, GROUND - 1, GROUND - 1, '^').e('cup', 78).fly('bat', 82, 5);
  b.crumble(86, 11, 2).crumble(89, 10, 2).crumble(92, 11, 2).ember(88, 5).ember(91, 4);
  b.e('dino', 100).e('dino', 106).row(110, 8, '?h?', 'power', 'heart', 'star').fly('bat', 114, 4).e('hedgehog', 118);
  b.crumble(126, 11, 4).ember(128, 5);
  b.row(136, 9, '??', 'heart', 'power');
  b.hint(142, '마지막 대결! 용 에스프레소를 이기고 모카를 구해요!');
  b.bossArena(150, 6, true, 'dragon');
  b.gold(35, 7); b.gold(66, 5); b.gold(111, 4);
  b.check(100);
  return b.build();
}

// ── 3부: 콜드브루가 햇볕 돌 세 개를 훔쳐 갔어요 ──────────────
// 땅 위에만 장식을 놓아요(모래늪·바다 위에 떠 있지 않게)
function onGround(b, x) { return b.g[GROUND][x] === '#' && b.g[GROUND - 1][x] === '.'; }
function desertDecor(b, from, to) { for (let x = from + 5; x < to; x += 23) if (onGround(b, x) && onGround(b, x + 4)) b.deco('cactus', x, GROUND - 1.25); }
function beachDecor(b, from, to) { for (let x = from + 7; x < to; x += 29) if (onGround(b, x) && onGround(b, x + 5)) b.deco('palm', x, GROUND - 1.5); }
function iceDecor(b, from, to) { for (let x = from + 9; x < to; x += 31) if (onGround(b, x)) b.deco('snowman', x, GROUND - 1.375); }

// ── WORLD 6 · 햇살 사막 (드래곤의 고향) ──────────────────────
function w6s1() {
  const b = new Builder('6-1', '햇살 사막', 212, { theme: 'desert', music: 'desert', time: 360 });
  b.ground(0, 24).liquid(25, 30).ground(31, 58).liquid(59, 66).ground(67, 100).liquid(101, 108).ground(109, 146).liquid(147, 156).ground(157, 211);
  desertDecor(b, 0, 212);
  b.hint(2, '드래곤의 고향, 햇살 사막이에요! 모래늪에 빠지지 않게 조심해요.');
  b.row(8, 9, '?B?', 'power', 'bone').e('bean', 16).set(20, GROUND - 1, '^').hint(17, '초록 선인장 가시는 밟으면 아파요!');
  b.plat(26, 10, 3);
  b.e('scorp', 36).hint(32, '꼬마 전갈은 꼬리가 뾰족해서 그냥 밟으면 아파요! 멍!(C)으로 기절시킨 뒤 밟아요.');
  b.pipe(42, 10).e('bean', 47).row(50, 8, 'B?B?', 'bone', 'clock').e('can', 55);
  b.mover(59, 11, 3, 'x', 4, 1.1).bones(60, 8, 5);
  b.check(70).e('dino', 76).stairs(80, 4).fill(84, 86, GROUND - 4, GROUND - 1, 'H').stairs(87, 4, -1).e('scorp', 94).fly('pigeon', 97, 6);
  b.crumble(102, 11, 6);
  b.row(114, 9, 'B?B', 'power').e('scorp', 120).e('bean', 124).set(128, GROUND - 1, '^').set(129, GROUND - 1, '^').e('can', 134).row(138, 8, 'h', 'heart').e('dino', 142);
  b.mover(147, 11, 3, 'x', 5, 1.2).fly('pigeon', 152, 6);
  b.e('scorp', 162).row(166, 9, '??', 'bone', 'bigBone').stairs(174, 6).fill(180, 181, GROUND - 6, GROUND - 1, 'H');
  b.finish(196);
  b.gold(27, 7); b.gold(85, 6); b.gold(151, 7);
  b.check(130);
  return b.build();
}

function w6s2() {
  const b = new Builder('6-2', '피라미드 속 보물길', 200, { theme: 'tomb', music: 'tomb', time: 360 });
  b.fill(0, 199, 0, 1, 'B');
  b.ground(0, 20).liquid(21, 26).ground(27, 52).liquid(53, 60).ground(61, 96).liquid(97, 104).ground(105, 140).liquid(141, 148).ground(149, 199);
  for (let x = 6; x < 190; x += 16) b.deco('windowS', x, 4);
  b.hint(3, '어두운 피라미드 속이에요. 가시 함정과 무너지는 블록을 조심해요!');
  b.row(8, 9, 'B?B', 'power').e('scorp', 14).plat(22, 10, 4);
  b.set(30, GROUND - 1, '^').set(31, GROUND - 1, '^').e('bean', 35).fill(38, 40, 9, 12, 'B').e('scorp', 44).row(46, 8, '???', 'bone', 'shield', 'magnet').fly('bat', 50, 4);
  b.crumble(54, 11, 6);
  b.check(64).e('can', 68).set(72, GROUND - 1, '^').set(73, GROUND - 1, '^').e('dino', 78).fill(82, 90, 7, 8, 'B').bones(83, 11, 7).e('scorp', 86).fly('bat', 92, 5);
  b.mover(97, 11, 3, 'x', 4, 1.2);
  b.row(108, 9, 'BhB', 'heart').e('scorp', 114).e('bean', 118).set(122, GROUND - 1, '^').set(123, GROUND - 1, '^').e('dino', 128).fly('bat', 132, 4).row(134, 8, '?b', 'power', 'star');
  b.crumble(142, 11, 2).crumble(145, 10, 2);
  b.e('scorp', 154).e('can', 160).stairs(166, 5).fill(171, 172, GROUND - 5, GROUND - 1, 'H');
  b.finish(184);
  b.gold(39, 7); b.gold(100, 7); b.gold(146, 7);
  b.check(120);
  return b.build();
}

function w6s3() {
  const b = new Builder('6-3', '카라멜의 모래 언덕', 170, { theme: 'desert', music: 'desert2', time: 330 });
  b.ground(0, 26).liquid(27, 32).ground(33, 62).liquid(63, 70).ground(71, 102).liquid(103, 108).ground(109, 169);
  desertDecor(b, 0, 124);
  b.hint(2, '모래바람이 불어요... 이 언덕 너머에 첫 번째 햇볕 돌이 있어요!');
  b.row(8, 9, '?B?', 'power', 'bone').e('scorp', 16).e('bean', 20).plat(28, 10, 3).fly('pigeon', 30, 6);
  b.e('dino', 38).set(42, GROUND - 1, '^').set(43, GROUND - 1, '^').e('scorp', 48).row(52, 8, '?h?', 'shield', 'heart', 'bone').e('can', 58);
  b.crumble(64, 11, 2).crumble(67, 10, 2).check(74);
  b.e('scorp', 80).e('dino', 86).fly('pigeon', 90, 5).e('bean', 95).mover(103, 11, 3, 'x', 3, 1.2);
  b.row(114, 9, '??', 'power', 'heart').e('scorp', 120);
  b.hint(124, '카라멜은 모래 속에 숨어요! 둔덕이 흔들리면 얼른 피하고, 어지러워할 때 밟아요.');
  b.bossArena(130, 5, false, 'scorpion');
  b.gold(29, 7); b.gold(50, 6); b.gold(68, 6);
  b.check(112);
  return b.build();
}

// ── WORLD 7 · 파도 바닷가 (팝콘공의 고향) ────────────────────
function w7s1() {
  const b = new Builder('7-1', '반짝 해변', 214, { theme: 'beach', music: 'beach', time: 360 });
  b.ground(0, 22).liquid(23, 30).ground(31, 56).liquid(57, 66).ground(67, 98).liquid(99, 108).ground(109, 140).liquid(141, 152).ground(153, 213);
  beachDecor(b, 0, 214);
  b.hint(2, '팝콘공의 고향, 파도 바닷가예요! 바닷물에 빠지면 안 돼요.');
  b.row(8, 9, '?B?', 'power', 'bone').e('crabling', 15).e('crabling', 19).hint(12, '꼬마 꽃게는 빨라요! 위에서 콩 밟아요.');
  b.plat(25, 10, 3);
  b.e('bean', 36).pipe(40, 10).e('crabling', 45).row(48, 8, 'B??B', 'clock', 'power').fly('pigeon', 52, 5);
  b.mover(57, 11, 3, 'x', 6, 1.2).bones(59, 8, 6);
  b.check(70).e('crabling', 75).e('can', 80).e('crabling', 84).fill(88, 90, 9, 12, 'H').e('crabling', 94);
  b.plat(100, 11, 2).plat(104, 10, 2);
  b.row(113, 9, 'BhB', 'heart').e('crabling', 118).e('dino', 124).fly('pigeon', 128, 6).e('crabling', 133).row(136, 8, '?', 'shield');
  b.mover(141, 11, 3, 'x', 3, 1.2).plat(147, 10, 2);
  b.e('crabling', 158).e('crabling', 162).stairs(168, 6).fill(174, 175, GROUND - 6, GROUND - 1, 'H');
  b.finish(190);
  b.gold(26, 7); b.gold(89, 6); b.gold(148, 7);
  b.check(134);
  return b.build();
}

function w7s2() {
  const b = new Builder('7-2', '갈매기 바다 위', 262, { theme: 'beach', music: 'sky2', time: 300, mode: 'fly' });
  skyDecor(b, 0, 262);
  b.fill(0, 261, 14, 15, '~');
  b.start = { tx: 3, ty: 7 };
  b.hint(1, '풍선을 타고 바다를 건너요! 갈매기와 산호 기둥을 조심해요.');
  b.bones(12, 6, 5).fly('pigeon', 22, 5).fly('pigeon', 26, 10);
  b.fill(30, 32, 0, 4, 'H').fill(30, 32, 10, 13, 'H').fly('pigeon', 40, 4).fly('pigeon', 44, 10).fly('bat', 48, 7);
  b.fill(56, 58, 8, 13, 'H').e('crabling', 57, 8).fill(66, 68, 0, 5, 'H').fly('pigeon', 74, 9).fly('bat', 78, 3).fly('pigeon', 82, 12);
  b.fill(90, 92, 0, 4, 'H').fill(90, 92, 10, 13, 'H').fill(100, 102, 5, 9, 'H').fly('pigeon', 108, 2).fly('pigeon', 110, 12);
  b.fill(118, 120, 9, 13, 'H').e('crabling', 119, 9).fill(126, 128, 0, 5, 'H').fly('bat', 134, 10).fly('pigeon', 138, 4).fly('bat', 142, 8);
  b.fill(150, 152, 0, 4, 'H').fill(150, 152, 10, 13, 'H').bones(151, 6, 1).bones(151, 7, 1).fill(160, 162, 5, 9, 'H');
  b.fly('pigeon', 170, 3).fly('bat', 172, 12).fly('pigeon', 176, 7).fly('bat', 180, 4).fly('pigeon', 184, 10);
  b.fill(192, 194, 0, 6, 'H').fill(202, 204, 8, 13, 'H').e('crabling', 203, 8).fill(212, 214, 0, 4, 'H').fill(212, 214, 10, 13, 'H');
  b.fly('bat', 222, 5).fly('pigeon', 226, 11).fly('pigeon', 230, 8).bones(236, 5, 6).fly('bat', 244, 7);
  b.gold(61, 3); b.gold(131, 10); b.gold(213, 7);
  return b.build();
}

function w7s3() {
  const b = new Builder('7-3', '마키아토의 산호 동굴', 176, { theme: 'beach', music: 'beach2', time: 330 });
  b.fill(0, 175, 0, 1, 'C');
  b.ground(0, 22).liquid(23, 29).ground(30, 56).liquid(57, 64).ground(65, 96).liquid(97, 104).ground(105, 175);
  b.hint(2, '분홍 산호 동굴이에요. 천장에 박쥐가 살아요!');
  b.row(8, 9, 'C?C', 'power').e('crabling', 14).e('crabling', 18).crumble(24, 11, 5);
  b.fly('bat', 34, 3).e('can', 38).fill(42, 44, 9, 12, 'C').e('crabling', 43, 9).e('crabling', 48).row(50, 8, '?h?', 'bigBone', 'heart', 'power').fly('bat', 54, 4);
  b.mover(57, 11, 3, 'x', 5, 1.3).check(68);
  b.e('dino', 72).e('crabling', 76).set(80, GROUND - 1, '^').set(81, GROUND - 1, '^').e('crabling', 85).fly('bat', 88, 4).e('can', 92);
  b.crumble(98, 11, 2).crumble(101, 10, 2);
  b.row(110, 9, '??', 'power', 'shield').e('crabling', 116).e('crabling', 120);
  b.hint(126, '마키아토 등딱지는 단단해요! 쿵! 한 뒤 헉헉댈 때 밟아요. 파도는 점프로 넘어요!');
  b.bossArena(132, 6, false, 'crab');
  b.gold(43, 5); b.gold(60, 7); b.gold(102, 7);
  b.check(112);
  return b.build();
}

// ── WORLD 8 · 콜드브루의 얼음 나라 (가장 어려워요) ───────────
function w8s1() {
  const b = new Builder('8-1', '꽁꽁 눈 들판', 216, { theme: 'ice', music: 'ice', time: 360 });
  b.ground(0, 22).liquid(23, 29).ground(30, 58).liquid(59, 67).ground(68, 100).liquid(101, 109).ground(110, 146).liquid(147, 156).ground(157, 215);
  iceDecor(b, 0, 216); nightDecor(b, 0, 216);
  b.hint(2, '콜드브루의 얼음 나라예요! 얼음 땅은 미끌미끌해요. 일찍 멈춰요.');
  b.row(8, 9, '?B?', 'power', 'bone').e('penguin', 16).plat(24, 10, 4);
  b.e('penguin', 32).row(36, 8, 'B?B', 'clock').fill(44, 46, 10, 12, 'H').e('penguin', 50).fly('bat', 54, 5).hint(34, '펭귄은 미끄러지듯 빨라요!');
  b.crumble(60, 11, 7);
  b.check(71).e('penguin', 76).e('can', 80).plat(84, 9, 5).e('penguin', 92).fly('bat', 96, 5);
  b.mover(101, 11, 3, 'x', 5, 1.3);
  b.row(114, 9, 'BhB', 'heart').e('penguin', 120).set(124, GROUND - 1, '^').set(125, GROUND - 1, '^').e('penguin', 130).row(134, 8, '?b', 'power', 'star').e('dino', 140);
  b.crumble(148, 11, 2).crumble(151, 10, 2).crumble(154, 11, 2);
  b.e('penguin', 162).e('penguin', 166).stairs(172, 6).fill(178, 179, GROUND - 6, GROUND - 1, 'H');
  b.finish(192);
  b.gold(26, 7); b.gold(86, 6); b.gold(152, 7);
  b.check(135);
  return b.build();
}

function w8s2() {
  const b = new Builder('8-2', '고드름 얼음 동굴', 206, { theme: 'ice', music: 'ice2', time: 360 });
  b.fill(0, 205, 0, 1, 'C');
  b.ground(0, 20).liquid(21, 27).ground(28, 54).liquid(55, 62).ground(63, 98).liquid(99, 106).ground(107, 142).liquid(143, 150).ground(151, 205);
  b.hint(3, '고드름 동굴이에요! 고드름이 달달 떨리면 얼른 지나가요.');
  b.fly('icicle', 12, 2).row(8, 9, 'C?C', 'power').e('penguin', 16).plat(22, 10, 4);
  b.fly('icicle', 32, 2).fly('icicle', 35, 2).e('penguin', 38).fly('bat', 42, 3).row(44, 8, '???', 'bone', 'shield', 'bigBone').fly('icicle', 50, 2);
  b.crumble(56, 11, 6);
  b.check(66).fly('icicle', 70, 2).e('penguin', 74).fly('icicle', 78, 2).fly('icicle', 81, 2).fill(84, 86, 9, 12, 'C').e('penguin', 85, 9).fly('bat', 90, 3).e('can', 94);
  b.mover(99, 11, 3, 'x', 5, 1.4);
  b.row(110, 9, 'ChC', 'heart').fly('icicle', 116, 2).e('penguin', 118).fly('icicle', 122, 2).fly('icicle', 125, 2).e('dino', 130).row(134, 8, '?', 'power').fly('bat', 138, 4);
  b.crumble(144, 11, 2).crumble(147, 10, 2);
  b.fly('icicle', 156, 2).e('penguin', 160).fly('icicle', 164, 2).stairs(170, 5).fill(175, 176, GROUND - 5, GROUND - 1, 'H');
  b.finish(188);
  b.gold(24, 7); b.gold(85, 5); b.gold(148, 7);
  b.check(120);
  return b.build();
}

function w8s3() {
  const b = new Builder('8-3', '콜드브루의 얼음 성', 186, { theme: 'ice', music: 'castle', time: 360 });
  b.fill(0, 185, 0, 1, 'C');
  b.ground(0, 20).liquid(21, 27).ground(28, 50).liquid(51, 58).ground(59, 86).liquid(87, 96).ground(97, 124).liquid(125, 130).ground(131, 185);
  for (let x = 4; x < 140; x += 14) b.deco('windowS', x, 4);
  b.hint(2, '마지막 성이에요! 마지막 햇볕 돌이 저 안에 있어요.');
  b.crumble(22, 11, 5).fly('icicle', 30, 2).e('penguin', 34).set(38, GROUND - 1, '^').set(39, GROUND - 1, '^').fly('bat', 42, 4).e('penguin', 46);
  b.mover(51, 11, 3, 'x', 5, 1.4).fly('icicle', 56, 2);
  b.check(62).row(64, 9, 'C?C?C', 'power', 'shield').e('penguin', 70).set(74, GROUND - 1, '^').set(75, GROUND - 1, '^').fly('icicle', 78, 2).e('dino', 80).fly('bat', 84, 4);
  b.crumble(88, 11, 2).crumble(91, 10, 2).crumble(94, 11, 2);
  b.e('penguin', 102).fly('icicle', 106, 2).e('penguin', 110).row(112, 8, '?h?', 'power', 'heart', 'star').fly('bat', 116, 4).e('can', 120);
  b.crumble(126, 11, 4);
  b.row(136, 9, '??', 'heart', 'power');
  b.hint(142, '마지막 대결! 콜드브루가 휙 내려와 어지러워할 때 머리를 밟아요!');
  b.bossArena(150, 8, true, 'owl');
  b.gold(30, 6); b.gold(65, 6); b.gold(111, 6);
  b.check(100);
  return b.build();
}

// ── 4부: 너구리 해적 아포가토가 모카를 우주선에 태워 갔어요 ──
function candyDecor(b, from, to) { for (let x = from + 4; x < to; x += 19) if (onGround(b, x) && onGround(b, x + 5)) b.deco(x % 2 ? 'lollipop' : 'candyCane', x, GROUND - (x % 2 ? 1.625 : 1.375)); }
function jungleDecor(b, from, to) { for (let x = from + 3; x < to; x += 13) if (onGround(b, x) && onGround(b, x + 5)) b.deco(x % 3 ? 'palm' : 'tree', x, GROUND - 1.5); }
function ghostDecor(b, from, to) { b.deco('moon', from + 14, 2); for (let x = from + 6; x < to; x += 17) if (onGround(b, x) && onGround(b, x + 8)) b.deco('tomb', x, GROUND - 1.125); }
function spaceDecor(b, from, to) { for (let x = from; x < to; x += 7) b.deco('twinkle', x + (x * 7) % 5, 1 + (x * 13) % 9); for (let x = from + 20; x < to; x += 70) b.deco('planet', x, 3 + (x % 3)); }

// ── WORLD 9 · 사탕 과자 나라 ─────────────────────────────────
function w9s1() {
  const b = new Builder('9-1', '달콤 사탕 언덕', 212, { theme: 'candy', music: 'candy', time: 380 });
  b.ground(0, 26).liquid(27, 32).ground(33, 70).liquid(71, 78).ground(79, 120).liquid(121, 128).ground(129, 166).liquid(167, 174).ground(175, 211);
  candyDecor(b, 0, 212);
  b.hint(2, '사탕 과자 나라예요! 초코 강에 빠지지 않게 조심해요.');
  b.row(8, 9, '?B?', 'power', 'bone').e('gummy', 16).e('gummy', 20).hint(14, '젤리는 통통 뛰어요. 위에서 밟아요!');
  b.plat(28, 10, 4);
  b.set(40, GROUND - 1, 'J').fill(43, 44, GROUND - 5, GROUND - 1, 'H').hint(37, '분홍 젤리 블록을 밟으면 높이 튀어 올라요! A를 누르고 있으면 더 높이!');
  b.e('bean', 50).row(54, 8, 'B?B?', 'spring', 'bone').e('gummy', 60).e('can', 66);
  b.mover(71, 11, 3, 'x', 5, 1.2).bones(72, 8, 5);
  b.check(82).e('gummy', 88).set(92, GROUND - 1, 'J').set(93, GROUND - 1, 'J').fill(96, 97, GROUND - 5, GROUND - 1, 'H').bones(96, 5, 2).e('bean', 104).e('gummy', 110).row(113, 9, 'BhB', 'heart');
  b.plat(122, 10, 2).plat(126, 9, 2);
  b.e('gummy', 134).row(138, 8, '??', 'cushion', 'power').e('can', 144).fly('pigeon', 150, 6).e('gummy', 156).e('gummy', 160);
  b.crumble(168, 11, 6);
  b.e('bean', 180).stairs(186, 6).fill(192, 193, GROUND - 6, GROUND - 1, 'H');
  b.finish(202);
  b.gold(44, 5); b.gold(97, 2); b.gold(127, 6);
  b.check(140);
  return b.build();
}

function w9s2() {
  const b = new Builder('9-2', '솜사탕 구름 다리', 214, { theme: 'candy', music: 'candy2', time: 380 });
  skyDecor(b, 0, 214);
  b.ground(0, 14).ground(96, 108).ground(196, 213);
  b.hint(2, '솜사탕 구름을 건너요. 젤리 블록으로 통통 뛰어 올라요!');
  b.plat(16, 11, 5, 'c').set(23, 12, 'J').plat(26, 8, 4, 'c').e('gummy', 27, 8).plat(32, 10, 5, 'c').bones(33, 8, 4).set(39, 12, 'J').plat(41, 7, 5, 'c');
  b.fly('pigeon', 46, 5).plat(48, 10, 6, 'c').e('gummy', 51, 10).plat(56, 12, 3, 'c').set(60, 12, 'J').plat(62, 8, 5, 'c').q(64, 4, 'rainbow');
  b.mover(69, 10, 4, 'x', 5, 1.2).plat(80, 11, 4, 'c').e('gummy', 81, 11).set(86, 12, 'J').plat(88, 8, 5, 'c');
  b.check(99).row(100, 9, '?b?', 'chick', 'bones', 'power');
  b.plat(110, 11, 4, 'c').set(116, 12, 'J').plat(118, 7, 5, 'c').e('gummy', 120, 7).plat(125, 10, 4, 'c').fly('pigeon', 128, 6).plat(131, 12, 4, 'c');
  b.mover(137, 9, 4, 'y', 3, 1.2).plat(143, 10, 5, 'c').e('gummy', 145, 10).set(150, 12, 'J').plat(152, 7, 4, 'c').plat(158, 10, 5, 'c');
  b.mover(165, 10, 4, 'x', 6, 1.3).plat(177, 11, 4, 'c').set(183, 12, 'J').plat(185, 8, 5, 'c').e('gummy', 187, 8);
  b.finish(204);
  b.gold(43, 4); b.gold(120, 3); b.gold(154, 4);
  b.check(150);
  return b.build();
}

function w9s3() {
  const b = new Builder('9-3', '바닐라의 케이크 성', 172, { theme: 'candy', music: 'candy', time: 340 });
  b.ground(0, 26).liquid(27, 32).ground(33, 64).liquid(65, 72).ground(73, 104).liquid(105, 110).ground(111, 171);
  candyDecor(b, 0, 126);
  b.hint(2, '케이크 성이에요! 젤리곰 바닐라가 모카의 행방을 알고 있대요.');
  b.row(8, 9, '?B?', 'power', 'bone').e('gummy', 16).e('gummy', 20).plat(28, 10, 3);
  b.e('bean', 38).set(42, GROUND - 1, 'J').fill(45, 46, GROUND - 5, GROUND - 1, 'H').e('gummy', 52).row(56, 8, '?h?', 'shield', 'heart', 'bone').e('can', 60);
  b.crumble(66, 11, 2).crumble(69, 10, 2).check(76);
  b.e('gummy', 82).e('gummy', 86).fly('pigeon', 90, 5).e('bean', 96).mover(105, 11, 3, 'x', 3, 1.2);
  b.row(114, 9, '??', 'power', 'heart').e('gummy', 120);
  b.hint(124, '바닐라는 통통 뛸 때 밟으면 튕겨요! 세 번 뛰고 납작 쉴 때 밟아요.');
  b.bossArena(130, 6, false, 'jelly');
  b.gold(29, 7); b.gold(46, 4); b.gold(70, 6);
  b.check(112);
  return b.build();
}

// ── WORLD 10 · 초록 정글 ──────────────────────────────────────
function w10s1() {
  const b = new Builder('10-1', '초록 정글', 214, { theme: 'jungle', music: 'jungle', time: 380 });
  b.ground(0, 24).liquid(25, 32).ground(33, 62).liquid(63, 72).ground(73, 110).liquid(111, 120).ground(121, 158).liquid(159, 168).ground(169, 213);
  jungleDecor(b, 0, 214);
  b.hint(2, '초록 정글이에요! 야자나무 밑을 지나면 코코넛이 떨어져요.');
  b.row(8, 9, '?B?', 'power', 'bone').fly('coconut', 14, 8).e('monkey', 20).hint(17, '원숭이는 바나나를 던져요!');
  b.mover(25, 11, 3, 'x', 5, 1.1);
  b.e('crabling', 38).fly('coconut', 44, 8).row(48, 8, 'B?B?', 'bone', 'chick').e('monkey', 56).fly('bat', 60, 5);
  b.mover(63, 11, 3, 'x', 7, 1.2).bones(64, 8, 7);
  b.check(76).e('monkey', 82).fly('coconut', 88, 8).fill(92, 94, 9, 12, 'H').e('monkey', 93, 9).e('crabling', 100).row(104, 9, 'BhB', 'heart');
  b.plat(112, 11, 2).plat(116, 10, 2);
  b.fly('coconut', 126, 8).e('monkey', 130).row(134, 8, '??', 'spring', 'power').e('crabling', 142).fly('coconut', 148, 8).e('monkey', 152);
  b.mover(159, 11, 3, 'x', 4, 1.3).plat(165, 10, 2);
  b.e('monkey', 176).stairs(182, 6).fill(188, 189, GROUND - 6, GROUND - 1, 'H');
  b.finish(200);
  b.gold(29, 7); b.gold(93, 6); b.gold(166, 7);
  b.check(138);
  return b.build();
}

function w10s2() {
  const b = new Builder('10-2', '폭포 통나무 다리', 208, { theme: 'jungle', music: 'jungle2', time: 380 });
  b.ground(0, 18).liquid(19, 40).ground(41, 58).liquid(59, 84).ground(85, 104).liquid(105, 128).ground(129, 146).liquid(147, 170).ground(171, 207);
  jungleDecor(b, 0, 208);
  b.hint(2, '큰 강이 흘러요. 통나무를 타고 건너요!');
  b.row(8, 9, '?B?', 'power', 'cushion').e('monkey', 14);
  b.mover(19, 11, 3, 'x', 6, 1.1).crumble(29, 10, 3).mover(33, 11, 3, 'x', 4, 1.2);
  b.e('crabling', 46).fly('coconut', 50, 8).e('monkey', 54);
  b.mover(59, 11, 3, 'y', 3, 1.1).plat(64, 9, 3).mover(69, 11, 3, 'x', 5, 1.3).crumble(78, 10, 3);
  b.check(88).e('monkey', 92).row(95, 8, '?b?', 'bigBone', 'bones', 'rainbow').fly('coconut', 100, 8);
  b.mover(105, 11, 3, 'x', 5, 1.2).plat(113, 9, 3).fly('bat', 115, 5).mover(118, 11, 3, 'x', 5, 1.3);
  b.e('crabling', 134).e('monkey', 140).fly('coconut', 144, 8);
  b.crumble(148, 11, 3).mover(152, 10, 3, 'x', 5, 1.3).crumble(161, 11, 3).plat(166, 10, 3);
  b.e('monkey', 176).fly('coconut', 180, 8).stairs(184, 5).fill(189, 190, GROUND - 5, GROUND - 1, 'H');
  b.finish(198);
  b.gold(31, 7); b.gold(65, 6); b.gold(114, 6);
  b.check(132);
  return b.build();
}

function w10s3() {
  const b = new Builder('10-3', '헤이즐넛의 나무 왕국', 172, { theme: 'jungle', music: 'jungle', time: 340 });
  b.ground(0, 26).liquid(27, 32).ground(33, 64).liquid(65, 72).ground(73, 104).liquid(105, 110).ground(111, 171);
  jungleDecor(b, 0, 124);
  b.hint(2, '정글의 왕 헤이즐넛이 사는 곳이에요. 쿵쿵 소리가 들려요!');
  b.row(8, 9, '?B?', 'power', 'bone').e('monkey', 16).fly('coconut', 20, 8).mover(27, 11, 3, 'x', 3, 1.1);
  b.e('crabling', 38).e('monkey', 44).fly('coconut', 50, 8).row(54, 8, '?h?', 'shield', 'heart', 'spring').e('monkey', 60);
  b.crumble(66, 11, 2).crumble(69, 10, 2).check(76);
  b.e('monkey', 82).fly('coconut', 86, 8).e('crabling', 90).fly('bat', 94, 5).e('monkey', 98).mover(105, 11, 3, 'x', 3, 1.2);
  b.row(114, 9, '??', 'power', 'heart').e('monkey', 120);
  b.hint(124, '헤이즐넛이 쿵쿵 뛰면 공중으로 피해요! 벽에 부딪혀 어지러울 때 밟아요.');
  b.bossArena(130, 7, false, 'gorilla');
  b.gold(29, 7); b.gold(52, 6); b.gold(70, 6);
  b.check(112);
  return b.build();
}

// ── WORLD 11 · 으스스 유령의 집 (어두워요) ────────────────────
function w11s1() {
  const b = new Builder('11-1', '으스스 묘지', 212, { theme: 'ghost', music: 'ghost', time: 380 });
  b.ground(0, 24).ground(29, 60).ground(66, 98).ground(104, 140).ground(146, 211);
  ghostDecor(b, 0, 212);
  b.hint(2, '깜깜한 묘지예요! 꼬마 유령은 쳐다보면 멈추고, 등을 돌리면 다가와요.');
  b.row(8, 9, '?B?', 'power', 'bone').fly('boo', 20, 8).e('hedgehog', 22);
  b.plat(25, 10, 3);
  b.e('bean', 36).fly('bat', 40, 4).row(44, 8, 'B?B?', 'bone', 'chick').fly('boo', 50, 7).e('hedgehog', 56);
  b.plat(61, 10, 4);
  b.check(70).fly('boo', 76, 6).e('bean', 80).set(84, GROUND - 1, '^').set(85, GROUND - 1, '^').fly('bat', 88, 4).e('hedgehog', 92).row(94, 9, 'BhB', 'heart');
  b.plat(99, 11, 2).plat(102, 10, 2);
  b.fly('boo', 110, 8).e('can', 114).row(118, 8, '??', 'rainbow', 'power').fly('boo', 126, 6).e('bean', 130).fly('bat', 134, 4);
  b.crumble(141, 11, 5);
  b.fly('boo', 152, 7).e('hedgehog', 158).fly('boo', 164, 9).stairs(172, 6).fill(178, 179, GROUND - 6, GROUND - 1, 'H');
  b.finish(190);
  b.gold(26, 7); b.gold(63, 7); b.gold(143, 7);
  b.check(122);
  return b.build();
}

function w11s2() {
  const b = new Builder('11-2', '유령의 집 복도', 204, { theme: 'ghost', music: 'ghost2', time: 380 });
  b.fill(0, 203, 0, 1, 'C');
  b.ground(0, 20).liquid(21, 26).ground(27, 54).liquid(55, 62).ground(63, 96).liquid(97, 104).ground(105, 140).liquid(141, 148).ground(149, 203);
  for (let x = 6; x < 196; x += 16) b.deco('windowS', x, 4);
  b.hint(3, '유령의 집 복도예요. 보라색 물에 빠지지 말아요!');
  b.row(8, 9, 'C?C', 'power').fly('boo', 16, 8).plat(22, 10, 4);
  b.fly('bat', 30, 3).e('hedgehog', 34).set(38, GROUND - 1, '^').set(39, GROUND - 1, '^').fly('boo', 44, 7).row(46, 8, '???', 'bone', 'shield', 'cushion').e('can', 50);
  b.crumble(56, 11, 6);
  b.check(66).fly('boo', 72, 6).e('hedgehog', 76).fill(80, 82, 9, 12, 'C').fly('boo', 81, 5).fly('bat', 88, 3).e('bean', 92);
  b.mover(97, 11, 3, 'x', 5, 1.3);
  b.row(108, 9, 'ChC', 'heart').fly('boo', 114, 7).e('hedgehog', 118).fly('boo', 124, 9).set(128, GROUND - 1, '^').fly('bat', 132, 3).row(135, 8, '?', 'power');
  b.crumble(142, 11, 2).crumble(145, 10, 2);
  b.fly('boo', 156, 7).e('hedgehog', 160).fly('boo', 166, 9).stairs(170, 5).fill(175, 176, GROUND - 5, GROUND - 1, 'H');
  b.finish(186);
  b.gold(24, 7); b.gold(81, 5); b.gold(146, 7);
  b.check(120);
  return b.build();
}

function w11s3() {
  const b = new Builder('11-3', '비엔나의 다락방', 176, { theme: 'ghost', music: 'ghost2', time: 340 });
  b.fill(0, 175, 0, 1, 'C');
  b.ground(0, 22).liquid(23, 29).ground(30, 56).liquid(57, 64).ground(65, 96).liquid(97, 104).ground(105, 175);
  for (let x = 4; x < 130; x += 14) b.deco('windowS', x, 4);
  b.hint(2, '다락방 끝에 유령 비엔나가 기다려요...');
  b.row(8, 9, 'C?C', 'power').fly('boo', 16, 7).crumble(24, 11, 5);
  b.fly('bat', 34, 3).e('hedgehog', 38).fill(42, 44, 9, 12, 'C').fly('boo', 48, 6).row(50, 8, '?h?', 'bigBone', 'heart', 'power').fly('bat', 54, 4);
  b.mover(57, 11, 3, 'x', 5, 1.3).check(68);
  b.fly('boo', 72, 8).e('hedgehog', 76).set(80, GROUND - 1, '^').set(81, GROUND - 1, '^').fly('boo', 86, 6).fly('bat', 88, 4).e('can', 92);
  b.crumble(98, 11, 2).crumble(101, 10, 2);
  b.row(110, 9, '??', 'power', 'shield').fly('boo', 116, 7).e('bean', 120);
  b.hint(126, '모자 쓴 게 진짜 비엔나예요! 가짜는 닿으면 펑 사라져요.');
  b.bossArena(132, 6, false, 'ghost');
  b.gold(43, 5); b.gold(60, 7); b.gold(102, 7);
  b.check(112);
  return b.build();
}

// ── WORLD 12 · 별빛 우주 (몸이 가벼워요) ─────────────────────
function w12s1() {
  const b = new Builder('12-1', '둥실둥실 달 표면', 220, { theme: 'space', music: 'space', time: 380, meteors: true });
  b.ground(0, 24).ground(32, 60).ground(69, 98).ground(107, 140).ground(150, 219);
  spaceDecor(b, 0, 220);
  b.hint(2, '우주에서는 몸이 가벼워서 아주 높이 뛰어요! 떨어지는 운석을 조심해요.');
  b.row(8, 9, '?B?', 'power', 'bone').e('alien', 16).e('alien', 20).hint(14, '외계인은 폴짝폴짝 뛰어요. 위에서 밟아요!');
  b.bones(26, 7, 5, -.4);
  b.e('alien', 38).row(44, 7, 'B?B?', 'bone', 'spring').e('alien', 52).fill(56, 58, 9, 12, 'H');
  b.bones(62, 5, 6);
  b.check(72).e('alien', 78).fill(84, 86, 6, 12, 'H').e('alien', 85, 6).e('alien', 92).row(94, 8, 'BhB', 'heart');
  b.plat(101, 9, 3).bones(101, 7, 3);
  b.e('alien', 112).row(118, 7, '??', 'chick', 'power').e('alien', 126).fill(130, 132, 8, 12, 'H').e('alien', 136);
  b.plat(143, 8, 3).bones(143, 5, 3);
  b.e('alien', 156).e('alien', 162).stairs(172, 6).fill(178, 179, GROUND - 6, GROUND - 1, 'H');
  b.finish(196);
  b.gold(29, 3); b.gold(85, 3); b.gold(145, 3);
  b.check(122);
  return b.build();
}

function w12s2() {
  const b = new Builder('12-2', '별똥별 우주길', 266, { theme: 'space', music: 'space2', time: 300, mode: 'fly' });
  spaceDecor(b, 0, 266);
  b.start = { tx: 3, ty: 7 };
  b.hint(1, '로켓 풍선을 타고 우주를 날아요! 운석과 외계인을 조심해요.');
  b.bones(12, 6, 5).fly('bat', 22, 5).fly('pigeon', 26, 10);
  b.fill(30, 32, 0, 4, 'H').fill(30, 32, 10, 15, 'H').fly('bat', 40, 4).fly('bat', 44, 10).fly('pigeon', 48, 7);
  b.fill(56, 58, 8, 15, 'H').e('alien', 57, 8).fill(66, 68, 0, 5, 'H').fly('bat', 74, 9).fly('bat', 78, 3).fly('pigeon', 82, 12);
  b.fill(90, 92, 0, 4, 'H').fill(90, 92, 10, 15, 'H').fill(100, 102, 5, 9, 'H').fly('pigeon', 108, 2).fly('pigeon', 110, 13);
  b.fill(118, 120, 9, 15, 'H').e('alien', 119, 9).fill(126, 128, 0, 5, 'H').fly('bat', 134, 10).fly('pigeon', 138, 4).fly('bat', 142, 8);
  b.fill(150, 152, 0, 4, 'H').fill(150, 152, 10, 15, 'H').bones(151, 6, 1).bones(151, 7, 1).fill(160, 162, 5, 9, 'H');
  b.fly('pigeon', 170, 3).fly('bat', 172, 12).fly('pigeon', 176, 7).fly('bat', 180, 4).fly('bat', 184, 10);
  b.fill(192, 194, 0, 6, 'H').fill(202, 204, 8, 15, 'H').e('alien', 203, 8).fill(212, 214, 0, 4, 'H').fill(212, 214, 10, 15, 'H');
  b.fly('bat', 222, 5).fly('pigeon', 226, 11).fly('bat', 230, 8).bones(236, 5, 6).fly('bat', 244, 7).fill(250, 252, 0, 5, 'H').fill(250, 252, 11, 15, 'H');
  b.gold(61, 3); b.gold(131, 10); b.gold(213, 7);
  return b.build();
}

function w12s3() {
  const b = new Builder('12-3', '아포가토의 우주 기지', 190, { theme: 'space', music: 'space', time: 380, meteors: true });
  b.ground(0, 22).ground(30, 54).ground(62, 88).ground(96, 124).ground(132, 189);
  spaceDecor(b, 0, 150);
  b.hint(2, '마지막 우주 기지예요! 모카가 저 안에 있어요.');
  b.row(8, 9, '?B?', 'power', 'bone').e('alien', 14).e('alien', 18).bones(24, 6, 4);
  b.e('alien', 36).fill(40, 42, 8, 12, 'H').e('alien', 41, 8).row(46, 7, '?h?', 'rainbow', 'heart', 'power').e('alien', 50);
  b.plat(56, 9, 3).check(66);
  b.e('alien', 70).fill(74, 76, 6, 12, 'H').e('alien', 80).fly('bat', 84, 4).e('alien', 86);
  b.plat(90, 8, 3);
  b.e('alien', 100).row(104, 7, '??', 'shield', 'cushion').e('alien', 110).fill(114, 116, 8, 12, 'H').e('alien', 120);
  b.row(138, 9, '??', 'heart', 'power');
  b.hint(142, '마지막 대결! 광선이 깜빡이면 얼른 옆으로! 우주선이 내려와 쉴 때 밟아요!');
  b.bossArena(150, 10, true, 'ufo');
  b.gold(26, 3); b.gold(75, 3); b.gold(115, 4);
  b.check(100);
  return b.build();
}

// ── 끝없는 모험: 조각을 이어 붙여 스테이지를 끝없이 만들어요(번호마다 늘 같은 모양) ──
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const ENDLESS = [
  { theme: 'park', music: 'park', foes: ['bean', 'can', 'hedgehog'], decor: parkDecor },
  { theme: 'desert', music: 'desert', foes: ['scorp', 'bean', 'dino'], liquid: true, decor: desertDecor },
  { theme: 'roof', music: 'roof', foes: ['bean', 'can', 'hedgehog'], air: ['pigeon'], decor: nightDecor },
  { theme: 'candy', music: 'candy', foes: ['gummy', 'bean', 'can'], liquid: true, jelly: true, decor: candyDecor },
  { theme: 'factory', music: 'factory', foes: ['cup', 'bean', 'can'], liquid: true },
  { theme: 'beach', music: 'beach', foes: ['crabling', 'bean'], air: ['pigeon'], liquid: true, decor: beachDecor },
  { theme: 'jungle', music: 'jungle', foes: ['monkey', 'crabling'], liquid: true, hang: 'coconut', decor: jungleDecor },
  { theme: 'volcano', music: 'volcano', foes: ['dino', 'hedgehog'], air: ['bat'], liquid: true, ember: true, decor: volcanoDecor },
  { theme: 'ice', music: 'ice', foes: ['penguin', 'bean'], air: ['bat'], liquid: true, decor: iceDecor },
  { theme: 'ghost', music: 'ghost', foes: ['hedgehog', 'bean'], air: ['boo', 'bat'], decor: ghostDecor },
  { theme: 'space', music: 'space', foes: ['alien'], meteors: true, decor: spaceDecor },
  { theme: 'dragon', music: 'dragon', foes: ['dino', 'hedgehog'], air: ['bat'], liquid: true, ember: true },
];
const ENDLESS_BOSSES = ['coffee', 'scorpion', 'jelly', 'dragon', 'crab', 'gorilla', 'owl', 'ghost', 'ufo'];
export function endlessLevel(n) {
  const R = rng(n * 9973 + 17), pick = a => a[Math.floor(R() * a.length)], ri = (a, z) => a + Math.floor(R() * (z - a + 1));
  const th = ENDLESS[(n - 1) % ENDLESS.length], boss = n % 4 === 0, hard = Math.min(1, (n - 1) / 24);
  const W = boss ? 190 : 214;
  const b = new Builder(`E-${n}`, `끝없는 모험 ${n}`, W, { theme: th.theme, music: th.music, time: 400, meteors: !!th.meteors, endless: true });
  const pit = (a, z) => th.liquid ? b.liquid(a, z) : b.hole(a, z);
  const foe = x => { if (th.air && R() < .35) b.fly(pick(th.air), x, ri(4, 8)); else b.e(pick(th.foes), x); };
  const itemsAll = ['power', 'bone', 'bone', 'spring', 'shield', 'chick', 'cushion', 'rainbow', 'magnet', 'heart', 'boneRain', 'wing', 'clock', 'bigBone'];
  b.ground(0, 14); b.hint(1, `끝없는 모험 ${n}단계! 어디까지 갈 수 있을까요?`);
  let x = 15, lastCheck = 0;
  const end = boss ? W - 46 : W - 34;
  while (x < end) {
    const room = end - x, k = pick(['flat', 'flat', 'gap', 'gap', 'plat', 'mover', 'crumble', 'stairs', 'pipes', 'spikes', 'blocks', ...(th.jelly ? ['jelly', 'jelly'] : []), ...(th.hang ? ['hang'] : [])]);
    if (room < 16 || k === 'flat') { const w = Math.min(room, ri(8, 14)); b.ground(x, x + w - 1); if (w > 8) { foe(x + 4); if (R() < .3 + hard * .5) foe(x + w - 3); } if (x - lastCheck > 70 && w > 6) { b.check(x + 2); lastCheck = x; } x += w; continue; }
    if (k === 'gap') { const g = ri(2, 3 + Math.round(hard * 2)); pit(x, x + g - 1); if (th.ember && R() < .5) b.ember(x + Math.floor(g / 2), 5); b.bones(x, 8, g); x += g; b.ground(x, x + 5); x += 6; }
    else if (k === 'plat') { const g = ri(6, 8); pit(x, x + g - 1); b.plat(x + 2, 10, 3); if (R() < .5) b.bones(x + 2, 8, 3); x += g; b.ground(x, x + 5); x += 6; }
    else if (k === 'mover') { const g = ri(7, 9); pit(x, x + g - 1); b.mover(x, 11, 3, 'x', g - 4, 1 + hard * .4); x += g; b.ground(x, x + 5); x += 6; }
    else if (k === 'crumble') { const g = ri(5, 7); pit(x, x + g - 1); b.crumble(x + 1, 11, g - 2); x += g; b.ground(x, x + 5); x += 6; }
    else if (k === 'stairs') { const h = ri(3, 4); b.ground(x, x + h * 2 + 6); b.stairs(x + 1, h).fill(x + 1 + h, x + h + 3, GROUND - h, GROUND - 1, 'H').stairs(x + h + 4, h, -1); if (R() < .5) b.bones(x + h + 1, GROUND - h - 3, 3); x += h * 2 + 7; }
    else if (k === 'pipes') { b.ground(x, x + 13); b.pipe(x + 2, ri(9, 11)); foe(x + 7); b.pipe(x + 10, ri(9, 11)); x += 14; }
    else if (k === 'spikes') { b.ground(x, x + 9); b.set(x + 4, GROUND - 1, '^'); if (R() < hard) b.set(x + 5, GROUND - 1, '^'); b.bones(x + 3, 9, 4); x += 10; }
    else if (k === 'blocks') { b.ground(x, x + 11); b.row(x + 3, 9, pick(['?B?', 'B?B?', '?b?', 'BhB']), pick(itemsAll), pick(itemsAll), 'bones'); foe(x + 9); x += 12; }
    else if (k === 'jelly') { b.ground(x, x + 11); b.set(x + 3, GROUND - 1, 'J'); b.fill(x + 6, x + 7, GROUND - 5, GROUND - 1, 'H'); b.bones(x + 6, 4, 2); x += 12; }
    else if (k === 'hang') { b.ground(x, x + 11); b.fly(th.hang, x + 4, 8); b.fly(th.hang, x + 8, 8); x += 12; }
  }
  b.ground(x, W - 1);
  th.decor?.(b, 0, W);
  if (boss) { const kind = ENDLESS_BOSSES[(n / 4 - 1) % ENDLESS_BOSSES.length]; b.row(x + 2, 9, '??', 'heart', 'power'); b.bossArena(W - 21, Math.min(8, 3 + Math.floor(n / 8)), false, kind); }
  else { b.stairs(W - 26, 5).fill(W - 21, W - 20, GROUND - 5, GROUND - 1, 'H'); b.finish(W - 12); }
  return b.build();
}

export const LEVELS = [w1s1(), w1s2(), w1s3(), w2s1(), w2s2(), w2s3(), w3s1(), w3s2(), w3s3(), w4s1(), w4s2(), w4s3(), w5s1(), w5s2(), w5s3(), w6s1(), w6s2(), w6s3(), w7s1(), w7s2(), w7s3(), w8s1(), w8s2(), w8s3(), w9s1(), w9s2(), w9s3(), w10s1(), w10s2(), w10s3(), w11s1(), w11s2(), w11s3(), w12s1(), w12s2(), w12s3()];
export const WORLD_NAMES = ['햇살 공원', '달밤 지붕 골목', '커피 성', '불꽃 화산', '용의 하늘 성', '햇살 사막', '파도 바닷가', '콜드브루의 얼음 나라', '사탕 과자 나라', '초록 정글', '으스스 유령의 집', '별빛 우주'];
export const STORY1_END = 8; // 3-3을 깨면 첫 번째 이야기 끝, 용이 나타나요
export const STORY2_END = 14; // 5-3을 깨면 두 번째 이야기 끝, 콜드브루가 나타나요(에스프레소도 고를 수 있어요)
export const STORY3_END = 23; // 8-3을 깨면 세 번째 이야기 끝, 아포가토가 모카를 데려가요(콜드브루도 고를 수 있어요)
export const worldOf = L => L.endless ? '끝없는 모험' : WORLD_NAMES[+L.id.split('-')[0] - 1];
