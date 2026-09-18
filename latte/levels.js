// 슈퍼 라떼 랜드 스테이지. 한 칸은 8픽셀, 높이는 16칸(화면 한 줄)이에요.
// 타일: '#' 땅 · 'B' 벽돌 · '?' 물음표 블록 · 'U' 빈 블록 · 'H' 단단한 블록 · '[' ']' '{' '}' 토관
//       'h' 숨은 블록 · '=' 발판(위에서만 밟혀요) · 'c' 구름 발판 · 'o' 뼈다귀 · '^' 가시 · '~' 뜨거운 커피 · 'C' 성벽
export const ROWS = 16;
export const GROUND = 13;

class Builder {
  constructor(id, name, width, opt = {}) {
    Object.assign(this, { id, name, w: width, theme: 'park', time: 400, mode: 'run', music: 'park' }, opt);
    this.g = Array.from({ length: ROWS }, () => Array(width).fill('.'));
    this.items = {}; this.enemies = []; this.decor = []; this.movers = []; this.checks = []; this.hints = [];
    this.goal = null; this.boss = null; this.start = { tx: 2, ty: GROUND };
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
    if (ty === undefined) { ty = 2; while (ty < ROWS && !(/[#BU?H\[\]{}=cC^]/.test(this.g[ty][x]) && !/[#BU?H\[\]{}=cC^]/.test(this.g[ty - 1][x]))) ty++; }
    this.enemies.push({ type, tx: x, ty }); return this;
  }
  fly(type, x, y) { this.enemies.push({ type, tx: x, ty: y, air: true }); return this; }
  mover(x, y, w, axis, range, speed = 1) { this.movers.push({ tx: x, ty: y, w, axis, range, speed }); return this; }
  check(x) { this.checks.push(x); return this; }
  finish(x) { this.goal = { tx: x }; this.stairsBase(x); return this; }
  stairsBase(x) { this.set(x, GROUND - 1, 'H'); }
  deco(spr, x, y) { this.decor.push({ spr, x: x * 8, y: y * 8 }); return this; }
  hint(x, text) { this.hints.push({ tx: x, text }); return this; }
  bossArena(x0, hp, final = false) {
    this.boss = { arena: x0, hp, final, tx: x0 + 15 };
    this.fill(x0 + 19, x0 + 19, 0, GROUND - 1, 'H');
    return this;
  }
  build() {
    const { id, name, w, theme, time, mode, music, items, enemies, decor, movers, checks, hints, goal, boss, start } = this;
    return { id, name, w, theme, time, mode, music, rows: this.g.map(r => r.join('')), items, enemies, decor, movers, checks, hints, goal, boss, start };
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
  b.row(53, 9, '?B?', 'bone', 'bone').hidden(58, 8, 'heart').e('can', 61).hint(59, '깡통을 밟으면 멈춰요. 한 번 더 건드리면 쭈욱 미끄러져요!');
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
  b.row(53, 8, '????', 'bone', 'bone', 'power', 'bone').e('can', 57).e('can', 61);
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
  b.row(110, 9, '??', 'heart', 'bone');
  b.hint(116, '커피는 밟거나 테니스공으로 맞혀요. 멍! 하면 잠깐 어지러워해요.');
  b.bossArena(120, 3);
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
  b.plat(161, 10, 3).row(168, 8, 'B??B', 'bone', 'power').e('can', 174);
  b.stairs(186, 6).fill(192, 193, GROUND - 6, GROUND - 1, 'H');
  b.finish(201);
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
  b.row(118, 9, '??', 'power', 'bone').e('hedgehog', 124);
  b.hint(126, '커피가 더 빨라졌어요! 털실 공을 조심해요.');
  b.bossArena(132, 4);
  return b.build();
}

// ── WORLD 3 · 커피 성 ────────────────────────────────────────
function w3s1() {
  const b = new Builder('3-1', '커피 공장', 214, { theme: 'factory', music: 'factory', time: 400 });
  b.ground(0, 26).liquid(27, 31).ground(32, 58).liquid(59, 66).ground(67, 104).liquid(105, 110).ground(111, 150).liquid(151, 158).ground(159, 213);
  b.hint(2, '커피 공장이에요! 커피잔은 뜨거운 방울을 뱉어요.');
  b.row(8, 9, 'B?B', 'power').e('cup', 16).e('bean', 21).plat(27, 10, 5);
  b.pipe(36, 10).e('can', 42).e('cup', 48).row(50, 8, '???', 'bone', 'power', 'bone').e('bean', 55);
  b.mover(59, 11, 4, 'x', 4).bones(60, 7, 6);
  b.check(70).e('hedgehog', 76).e('cup', 82).fill(86, 88, 9, 12, 'H').e('cup', 87, 9).e('bean', 94).e('bean', 97).row(98, 9, 'bB', 'star');
  b.mover(105, 10, 4, 'y', 3);
  b.pipe(114, 9).e('can', 120).e('can', 124).row(128, 8, 'BhB', 'heart').e('cup', 134).e('hedgehog', 140).e('bean', 146);
  b.mover(151, 11, 4, 'x', 4);
  b.e('cup', 166).stairs(172, 6).fill(178, 179, GROUND - 6, GROUND - 1, 'H').e('bean', 183);
  b.finish(196);
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
  b.check(96).row(97, 9, '?b?', 'bone', 'star', 'bone');
  b.plat(106, 11, 4, 'c').fly('pigeon', 110, 7).plat(112, 9, 4, 'c').plat(118, 7, 4, 'c').bones(119, 5, 3).plat(124, 10, 5, 'c').e('bean', 126, 10);
  b.mover(131, 9, 4, 'y', 3).plat(137, 11, 5, 'c').e('can', 139, 11).fly('pigeon', 143, 5).plat(144, 9, 4, 'c');
  b.row(146, 5, 'h', 'heart').plat(150, 11, 4, 'c').mover(156, 10, 4, 'x', 6).plat(167, 9, 5, 'c').e('hedgehog', 169, 9);
  b.plat(174, 11, 4, 'c').fly('pigeon', 178, 6).plat(180, 9, 4, 'c').plat(185, 11, 4, 'c');
  b.finish(198);
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
  b.check(62).e('hedgehog', 66).row(68, 9, 'C?C?C', 'power', 'bone').e('can', 74).fill(78, 79, GROUND - 1, GROUND - 1, '^').e('cup', 84);
  b.mover(91, 10, 4, 'y', 3);
  b.row(100, 9, 'hC', 'heart').e('hedgehog', 104).e('bean', 108).e('can', 112).row(116, 8, '??', 'power', 'star');
  b.e('bean', 122).e('hedgehog', 126);
  b.hint(134, '마지막 대결! 커피를 이기면 모카를 구할 수 있어요.');
  b.bossArena(138, 5, true);
  return b.build();
}

export const LEVELS = [w1s1(), w1s2(), w1s3(), w2s1(), w2s2(), w2s3(), w3s1(), w3s2(), w3s3()];
export const WORLD_NAMES = ['햇살 공원', '달밤 지붕 골목', '커피 성'];
