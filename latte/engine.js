// 슈퍼 라떼 랜드 게임 규칙. 화면·소리·입력은 main.js가 맡고 여기서는 규칙만 다뤄요(노드에서도 돌아가요).
import { ROWS } from './levels.js';

export const T = 8, VIEW_W = 160, VIEW_H = 128;
const SOLID = '#BU?H[]{}C^F';
const PHYS = { walk: 1.25, run: 2.05, acc: .07, airAcc: .055, friction: .09, skid: .16, jump: 3.45, runJump: 3.8, gHold: .16, g: .34, maxFall: 4.5 };
const SIZES = {
  bean: [10, 11], can: [10, 12], hedgehog: [13, 9], pigeon: [12, 8], cup: [12, 10], boss: [18, 18],
  bat: [11, 7], ember: [5, 7], dino: [10, 12], dragon: [26, 18],
};
const STILL = ['ball', 'wing', 'magnet', 'clock', 'bigBone', 'shield'];
const STOMP_SCORES = [100, 200, 400, 800, 1000, 2000, 4000, 8000];

export const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export class Run {
  // carry: 목숨·점수·뼈다귀·변신 상태처럼 스테이지를 넘어 이어지는 값. hooks: 소리·대사·클리어 알림.
  constructor(level, carry, hooks = {}, opts = {}) {
    this.L = level; this.carry = carry; this.easy = !!opts.easy;
    this.hooks = { sound() {}, music() {}, hint() {}, say(lines, done) { done?.(); }, clear() {}, dead() {}, ending() {}, gold() {}, ...hooks };
    this.goldHave = opts.goldHave || 0; // 전에 모은 황금 뼈다귀(흐리게 보여요)
    this.checkpoint = opts.checkpoint ?? null;
    this.reset();
  }

  reset() {
    const L = this.L;
    this.grid = L.rows.map(r => [...r]);
    this.items = { ...L.items };
    this.bumps = new Map();
    this.spawnDefs = L.enemies.map(e => ({ ...e, spawned: false }));
    this.enemies = []; this.things = []; this.shots = []; this.foes = []; this.fx = []; this.pops = [];
    this.movers = L.movers.map(m => ({ ...m, x: m.tx * T, y: m.ty * T, ox: m.tx * T, oy: m.ty * T, w: m.w * T, h: 4, t: 0, dx: 0, dy: 0 }));
    this.checks = L.checks.map(tx => ({ tx, on: this.checkpoint !== null && tx <= this.checkpoint }));
    this.hintsShown = new Set();
    this.frame = 0; this.time = L.time; this.timeTick = 0; this.state = 'play'; this.stateT = 0;
    this.gold = 0; this.shake = 0; this.crumbles = new Map(); this.respawns = new Map();
    this.char = ['coffee', 'turtle', 'lizard'].includes(this.carry.char) ? this.carry.char : 'latte';
    this.hero = { latte: '라떼', coffee: '커피', turtle: '팝콘공', lizard: '드래곤' }[this.char]; this.friend = '모카';
    if (this.char === 'turtle') this.carry.shield = true; // 팝콘공의 단단한 등껍질: 스테이지마다 한 번 막아 줘요
    this.chain = 0; this.reveal = 0; this.flag = null; this.boss = null; this.bossStarted = false; this.clearT = 0;
    this.fly = L.mode === 'fly';
    const sx = this.checkpoint !== null ? this.checkpoint * T : L.start.tx * T;
    const p = this.player = { x: sx, y: 0, w: 10, h: 13, vx: 0, vy: 0, face: 1, ground: false, coyote: 0, jumpBuf: 0, inv: 0, star: 0, barkCd: 0, barkT: 0, shotCd: 0, anim: 0, onMover: null, isPlayer: true, flyHp: 3, airJumps: 0, dashT: 0, dashDir: 1, magnet: 0 };
    if (!this.fly && this.carry.big) { p.h = 20; }
    p.y = (this.fly ? L.start.ty * T : this.groundBelow(sx + 5, 0) ) - (this.fly ? 0 : p.h);
    this.cam = this.fly ? 0 : clamp(p.x - 64, 0, L.w * T - VIEW_W);
    this.hooks.music(this.L.music);
  }

  // ── 타일 ───────────────────────────────────────────────────
  tile(tx, ty) {
    if (ty < 0 || ty >= ROWS) return '.';
    if (tx < 0 || tx >= this.L.w) return 'H';
    return this.grid[ty][tx];
  }
  fits(e) {
    for (let ty = Math.floor(e.y / T); ty <= Math.floor((e.y + e.h - .01) / T); ty++)
      for (let tx = Math.floor(e.x / T); tx <= Math.floor((e.x + e.w - .01) / T); tx++) if (SOLID.includes(this.tile(tx, ty))) return false;
    return e.y >= 0 && e.y + e.h <= VIEW_H;
  }
  setTile(tx, ty, c) { if (ty >= 0 && ty < ROWS && tx >= 0 && tx < this.L.w) this.grid[ty][tx] = c; }
  groundBelow(px, fromY) {
    const tx = Math.floor(px / T);
    for (let ty = Math.max(2, Math.floor(fromY / T)); ty < ROWS; ty++) if (SOLID.includes(this.tile(tx, ty)) && !SOLID.includes(this.tile(tx, ty - 1))) return ty * T;
    return (ROWS - 3) * T;
  }
  solidFor(c, e, tx, ty, dy) {
    if (SOLID.includes(c)) return true;
    if ((c === '=' || c === 'c') && dy > 0 && e.prevBottom <= ty * T + .01) return true;
    if (c === 'h' && dy < 0 && e.isPlayer && e.prevTop >= (ty + 1) * T - .01) return true;
    return false;
  }
  moveX(e, dx) {
    e.x += dx;
    const y0 = Math.floor(e.y / T), y1 = Math.floor((e.y + e.h - .01) / T);
    if (dx > 0) {
      const tx = Math.floor((e.x + e.w - .01) / T);
      for (let ty = y0; ty <= y1; ty++) if (this.solidFor(this.tile(tx, ty), e, tx, ty, 0)) { e.x = tx * T - e.w; return this.tile(tx, ty); }
    } else if (dx < 0) {
      const tx = Math.floor(e.x / T);
      for (let ty = y0; ty <= y1; ty++) if (this.solidFor(this.tile(tx, ty), e, tx, ty, 0)) { e.x = (tx + 1) * T; return this.tile(tx, ty); }
    }
    return null;
  }
  moveY(e, dy) {
    e.prevBottom = e.y + e.h; e.prevTop = e.y; e.y += dy;
    const x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + e.w - .01) / T), hits = [];
    if (dy > 0) {
      const ty = Math.floor((e.y + e.h - .01) / T);
      for (let tx = x0; tx <= x1; tx++) if (this.solidFor(this.tile(tx, ty), e, tx, ty, dy)) hits.push([tx, ty, this.tile(tx, ty)]);
      if (hits.length) e.y = hits[0][1] * T - e.h;
    } else if (dy < 0) {
      const ty = Math.floor(e.y / T);
      for (let tx = x0; tx <= x1; tx++) if (this.solidFor(this.tile(tx, ty), e, tx, ty, dy)) hits.push([tx, ty, this.tile(tx, ty)]);
      if (hits.length) e.y = (ty + 1) * T;
    }
    return hits;
  }

  // ── 한 프레임 ──────────────────────────────────────────────
  update(input) {
    this.frame++; this.inputA = !!input.a;
    if (this.state === 'dying') return this.updateDying();
    if (this.state === 'pole' || this.state === 'walkout' || this.state === 'tally') return this.updateGoal(input);
    if (this.state === 'bossTalk' || this.state === 'done') return;
    if (this.state === 'bossEnd') return this.updateBossEnd();
    this.updateMovers();
    if (this.fly) this.updateFlyer(input); else this.updatePlayer(input);
    if (this.state !== 'play') return;
    this.spawnEnemies();
    for (const e of this.enemies) this.updateEnemy(e);
    this.enemies = this.enemies.filter(e => !e.gone);
    if (this.boss) this.updateBoss(this.boss);
    this.updateThings(); this.updateShots(); this.updateFoes(); this.updateFx();
    this.interact();
    this.updateCamera();
    this.updateTimer();
    this.checkHints();
    for (const [k, v] of this.bumps) if (v > 1) this.bumps.set(k, v - 1); else this.bumps.delete(k);
    this.updateCrumbles();
    if (this.reveal > 0) this.reveal--;
  }

  // 무너지는 블록: 밟고 잠깐 뒤 떨어지고, 한참 뒤 다시 생겨요
  updateCrumbles() {
    for (const [k, t] of this.crumbles) {
      if (t > 1) { this.crumbles.set(k, t - 1); continue; }
      this.crumbles.delete(k);
      const [tx, ty] = k.split(',').map(Number);
      this.setTile(tx, ty, '.'); this.respawns.set(k, 320); this.hooks.sound('crumble');
      this.fx.push({ kind: 'fallblock', x: tx * T, y: ty * T, vy: 0, life: 50 });
    }
    for (const [k, t] of this.respawns) {
      if (t > 1) { this.respawns.set(k, t - 1); continue; }
      const [tx, ty] = k.split(',').map(Number), p = this.player;
      if (p.x + p.w > tx * T && p.x < tx * T + T && p.y + p.h > ty * T && p.y < ty * T + T) continue;
      this.respawns.delete(k); this.setTile(tx, ty, 'F');
    }
  }
  touchCrumble(hits) { for (const [tx, ty, c] of hits) if (c === 'F' && !this.crumbles.has(`${tx},${ty}`)) this.crumbles.set(`${tx},${ty}`, 45); }

  updateMovers() {
    for (const m of this.movers) {
      m.t += m.speed * .045 / Math.sqrt(Math.max(1, m.range));
      const phase = (1 - Math.cos(m.t)) / 2;
      const nx = m.ox + (m.axis === 'x' ? phase * m.range * T : 0), ny = m.oy + (m.axis === 'y' ? phase * m.range * T : 0);
      m.dx = nx - m.x; m.dy = ny - m.y; m.x = nx; m.y = ny;
    }
  }

  updatePlayer(input) {
    const p = this.player, P = PHYS;
    if (p.inv > 0) p.inv--; if (p.barkCd > 0) p.barkCd--; if (p.barkT > 0) p.barkT--; if (p.shotCd > 0) p.shotCd--;
    if (p.star > 0) { p.star--; if (p.star === 0) this.hooks.music(this.L.music); }
    // 움직이는 발판에 탄 채로 함께 이동
    if (p.onMover) { const m = p.onMover; this.moveX(p, m.dx); if (m.dy < 0) p.y += m.dy; }
    if (p.magnet > 0) { p.magnet--; this.pullBones(p); }
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0), max = input.b ? P.run : P.walk;
    if (p.dashT > 0) { // 커피의 냥냥 대시: 곧게 쌩 날아가요
      p.dashT--; p.vx = p.dashDir * 3.6; p.vy = 0;
      if (this.frame % 2 === 0) this.fx.push({ kind: 'dust', x: p.x + p.w / 2, y: p.y + p.h / 2, life: 10, dir: -p.dashDir });
      if (p.dashT === 0) p.vx = p.dashDir * 1.6;
    } else if (dir) {
      if (p.ground && p.vx && Math.sign(p.vx) !== dir) p.vx += dir * P.skid;
      else p.vx += dir * (p.ground ? P.acc : P.airAcc);
      if (Math.abs(p.vx) > max) p.vx = Math.sign(p.vx) * Math.max(max, Math.abs(p.vx) - .06);
      p.face = dir;
    } else if (p.ground) {
      p.vx = Math.abs(p.vx) <= P.friction ? 0 : p.vx - Math.sign(p.vx) * P.friction;
    }
    p.jumpBuf = input.aPressed ? 7 : Math.max(0, p.jumpBuf - 1);
    p.coyote = p.ground ? 6 : Math.max(0, p.coyote - 1);
    if (p.ground) p.airJumps = (this.char === 'coffee' ? 1 : 0) + (this.carry.power === 'wing' ? 1 : 0);
    if (p.jumpBuf && p.coyote) {
      p.vy = -(Math.abs(p.vx) > 1.6 ? P.runJump : P.jump); p.coyote = 0; p.jumpBuf = 0; p.ground = false; p.onMover = null;
      this.hooks.sound(this.carry.big ? 'jumpBig' : 'jump');
    } else if (this.char === 'lizard' && p.wallT > 0 && !p.ground && input.aPressed) {
      p.vy = -3.5; p.vx = -p.wall * 1.9; p.face = -p.wall; p.wallT = 0; p.jumpBuf = 0; this.hooks.sound('jump2');
      this.fx.push({ kind: 'dust', x: p.x + (p.wall > 0 ? p.w : 0), y: p.y + p.h / 2, life: 12, dir: -p.wall });
    } else if (input.aPressed && !p.ground && !p.coyote && p.airJumps > 0 && p.dashT === 0) {
      p.airJumps--; p.vy = -3.1; p.jumpBuf = 0; this.hooks.sound('jump2');
      this.fx.push({ kind: 'dust', x: p.x + 1, y: p.y + p.h, life: 12, dir: -1 }, { kind: 'dust', x: p.x + p.w - 1, y: p.y + p.h, life: 12, dir: 1 });
    }
    if (p.dashT === 0) p.vy = Math.min(P.maxFall, p.vy + (p.vy < 0 && input.a ? P.gHold : P.g));
    if (this.carry.power === 'wing' && !p.ground && input.a && p.vy > .7) p.vy = .7; // 날개로 사뿐히
    if (input.barkPressed) this.special();
    if (input.bPressed && this.carry.power === 'ball' && this.shots.filter(s => s.kind === 'ball').length < 2) {
      this.shots.push({ kind: 'ball', x: p.x + (p.face > 0 ? p.w : -4), y: p.y + 3, w: 4, h: 4, vx: p.face * 2.3, vy: 2.3, life: 240 });
      this.hooks.sound('throw');
    }
    if (p.ground && dir && p.vx && Math.sign(p.vx) !== dir && Math.abs(p.vx) > .8 && this.frame % 4 === 0) this.fx.push({ kind: 'dust', x: p.x + p.w / 2, y: p.y + p.h, life: 10, dir: -dir });
    p.wasGround = p.ground;
    const hitX = this.moveX(p, p.vx);
    if (hitX) { if (hitX === '^') this.hurt(); p.vx = 0; if (p.dashT > 0) { p.dashT = 0; this.shake = Math.max(this.shake, 3); } }
    if (p.wallT > 0) p.wallT--;
    if (this.char === 'lizard' && hitX && hitX !== '^' && dir && !p.ground) { p.wall = dir; p.wallT = 8; if (p.vy > .8) p.vy = .8; }
    const hits = this.moveY(p, p.vy);
    p.ground = false;
    if (p.vy >= 0 && hits.length) this.touchCrumble(hits);
    if (p.vy > 0 && hits.length) {
      if (!p.wasGround && p.vy > 2.6) { this.fx.push({ kind: 'dust', x: p.x + 1, y: p.y + p.h, life: 12, dir: -1 }, { kind: 'dust', x: p.x + p.w - 1, y: p.y + p.h, life: 12, dir: 1 }); }
      p.ground = true; p.vy = 0; p.onMover = null; this.chain = 0;
      if (hits.some(h => h[2] === '^')) this.hurt();
    } else if (p.vy < 0 && hits.length) {
      p.vy = .5;
      const cx = p.x + p.w / 2, best = hits.reduce((a, h) => Math.abs((h[0] + .5) * T - cx) < Math.abs((a[0] + .5) * T - cx) ? h : a);
      this.bumpBlock(best[0], best[1]);
    }
    // 움직이는 발판 착지
    if (p.vy >= 0) {
      p.onMover = null;
      for (const m of this.movers) if (p.x + p.w > m.x && p.x < m.x + m.w && p.prevBottom <= m.y - m.dy + 1 && p.y + p.h >= m.y) { p.y = m.y - p.h; p.vy = 0; p.ground = true; p.onMover = m; this.chain = 0; }
    }
    this.collectTiles(p);
    p.anim = p.ground ? (p.anim + Math.abs(p.vx) * .18) : p.anim;
    // 뜨거운 커피·구덩이
    const feet = p.y + p.h;
    if (p.ground && !p.onMover) { const l = this.tile(Math.floor((p.x + 1) / T), Math.floor(feet / T)), r = this.tile(Math.floor((p.x + p.w - 1) / T), Math.floor(feet / T)); if (SOLID.replace('F', '').includes(l) && SOLID.replace('F', '').includes(r)) p.safe = { x: p.x, feet }; }
    if (feet > ROWS * T + 12) return this.fall();
    const tx0 = Math.floor(p.x / T), tx1 = Math.floor((p.x + p.w - 1) / T), ty = Math.floor((feet - 2) / T);
    for (let tx = tx0; tx <= tx1; tx++) if (this.tile(tx, ty) === '~') return this.fall();
    // 체크포인트와 골
    for (const c of this.checks) if (!c.on && p.x + p.w > c.tx * T + 2 && p.x < c.tx * T + 6) { c.on = true; this.checkpoint = c.tx; this.hooks.sound('check'); this.pop(c.tx * T, (ROWS - 5) * T, 'OK!'); }
    if (this.L.goal && p.x + p.w >= this.L.goal.tx * T + 3) this.touchPole();
    if (this.L.boss && !this.bossStarted && p.x > (this.L.boss.arena + 2) * T) this.startBoss();
    if (this.bossStarted) { const a0 = this.L.boss.arena * T; p.x = clamp(p.x, a0 + T, a0 + 19 * T - p.w); }
  }

  updateFlyer(input) {
    const p = this.player;
    if (p.inv > 0) p.inv--; if (p.barkCd > 0) p.barkCd--; if (p.barkT > 0) p.barkT--; if (p.shotCd > 0) p.shotCd--;
    if (p.star > 0) p.star--;
    const end = this.L.w * T - VIEW_W, scroll = this.cam < end ? .55 : 0;
    this.cam = Math.min(end, this.cam + scroll);
    const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0), dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    p.vx += (dx * 1.35 - p.vx) * .2; p.vy += (dy * 1.35 - p.vy) * .2 + Math.sin(this.frame / 20) * .02;
    if (dx) p.face = 1;
    this.moveX(p, p.vx + scroll); this.moveY(p, p.vy);
    if (p.x > this.cam + VIEW_W - p.w - 4 && this.clearT <= 60) p.x = this.cam + VIEW_W - p.w - 4;
    if (p.x < this.cam) {
      p.x = this.cam;
      // 벽에 끼이면 하트 하나를 잃고 가까운 빈자리로 빠져나와요
      if (!this.fits(p)) {
        const dy = [...Array(48)].map((_, i) => (i >> 1) * (i % 2 ? -1 : 1) + (i % 2 ? -1 : 1)).find(d => this.fits({ ...p, y: p.y + d }));
        if (dy === undefined) return this.die();
        p.y += dy; if (!this.god) this.hurt();
      }
    }
    if (p.y < 0) p.y = 0; if (p.y > VIEW_H - p.h) p.y = VIEW_H - p.h;
    if ((input.aPressed || input.bPressed) && p.shotCd === 0 && this.shots.length < 3) {
      this.shots.push({ kind: 'shot', x: p.x + p.w, y: p.y + 5, w: 4, h: 4, vx: 3.2, vy: 0, life: 70 }); p.shotCd = 12; this.hooks.sound('throw');
    }
    if (input.barkPressed) this.special();
    if (p.magnet > 0) { p.magnet--; this.pullBones(p); }
    this.collectTiles(p);
    if (this.cam >= end) { this.clearT++; if (this.clearT > 60) { p.x += 1.5; if (p.x > this.cam + VIEW_W + 8) this.win(); } }
  }

  special() {
    if (this.char === 'coffee' && !this.fly) this.dash();
    else if (this.char === 'turtle') this.popcorn();
    else if (this.char === 'lizard') this.flame();
    else this.bark();
  }
  popcorn() { // 팝콘공의 팝!: 팝콘이 부채꼴로 튀어 나가요
    const p = this.player;
    if (p.barkCd > 0) return;
    p.barkCd = 70; p.barkT = 14;
    const dir = this.fly ? 1 : p.face;
    for (const [vx, vy] of this.fly ? [[2.6, -.8], [2.8, 0], [2.6, .8]] : [[1.6, -2.3], [2.2, -1.5], [2.7, -.7]])
      this.shots.push({ kind: 'pop', x: p.x + p.w / 2 - 2, y: p.y + 2, w: 4, h: 4, vx: vx * dir, vy, g: this.fly ? 0 : .15, life: 90 });
    this.hooks.sound('pop');
  }
  flame() { // 드래곤(비어디드래곤)의 불!: 앞으로 짧게 불꽃을 뿜어요
    const p = this.player;
    if (p.barkCd > 0) return;
    p.barkCd = 80; p.barkT = 18;
    const dir = this.fly ? 1 : p.face;
    for (const [vy, sp] of [[-.35, 2.6], [0, 3], [.35, 2.6], [0, 2.2]])
      this.shots.push({ kind: 'flame', x: p.x + (dir > 0 ? p.w - 2 : -4), y: p.y + 3, w: 5, h: 5, vx: dir * sp, vy, life: 20, bossHit: false });
    this.hooks.sound('fire');
  }
  dash() {
    const p = this.player;
    if (p.barkCd > 0) return;
    p.barkCd = 110; p.barkT = 16; p.dashT = 16; p.dashDir = p.face; p.vy = 0;
    this.hooks.sound('dash');
  }
  pullBones(p) { // 자석: 가까운 뼈다귀가 날아와요
    const cx = Math.floor((p.x + p.w / 2) / T), cy = Math.floor((p.y + p.h / 2) / T);
    for (let tx = cx - 5; tx <= cx + 5; tx++) for (let ty = cy - 5; ty <= cy + 5; ty++) if (this.tile(tx, ty) === 'o') {
      this.setTile(tx, ty, '.'); this.addBone(); this.fx.push({ kind: 'fly', x: tx * T + 4, y: ty * T + 3, tx: p.x + p.w / 2, ty: p.y + p.h / 2, life: 12 });
    }
  }
  bark() {
    const p = this.player;
    if (p.barkCd > 0) return;
    p.barkCd = 150; p.barkT = 22; this.reveal = 150;
    this.hooks.sound('bark');
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2, near = e => Math.hypot(e.x + e.w / 2 - cx, e.y + e.h / 2 - cy);
    for (const e of this.enemies) if (!e.dead && near(e) < 44) { e.stun = 200; e.vx = 0; this.fx.push({ kind: 'stars', x: e.x + e.w / 2, y: e.y - 4, life: 40 }); }
    for (const f of this.foes) if (near(f) < 48) f.gone = true;
    if (this.boss && !this.boss.dead && near(this.boss) < 56 && this.boss.hurt === 0) { this.boss.stun = 110; this.fx.push({ kind: 'stars', x: this.boss.x + 9, y: this.boss.y - 4, life: 60 }); }
    this.fx.push({ kind: 'ring', x: cx, y: cy, life: 22 });
  }

  collectTiles(e) {
    const x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + e.w - 1) / T), y0 = Math.floor(e.y / T), y1 = Math.floor((e.y + e.h - 1) / T);
    for (let tx = x0; tx <= x1; tx++) for (let ty = y0; ty <= y1; ty++) {
      const c = this.tile(tx, ty);
      if (c === 'o') { this.setTile(tx, ty, '.'); this.addBone(); this.fx.push({ kind: 'sparkle', x: tx * T + 4, y: ty * T + 3, life: 14 }); }
      else if (c === 'G') {
        this.setTile(tx, ty, '.');
        const i = this.L.golds.findIndex(g => g.tx === tx && g.ty === ty);
        this.gold |= 1 << i; this.carry.score += 2000; this.pop(tx * T - 4, ty * T - 6, 2000);
        this.fx.push({ kind: 'sparkle', x: tx * T + 4, y: ty * T + 3, life: 30, big: true });
        this.hooks.sound('gold'); this.hooks.gold?.(i);
      }
    }
  }
  addBone(n = 1) {
    this.carry.bones += n; this.carry.score += 10 * n; this.hooks.sound('bone');
    while (this.carry.bones >= 100) { this.carry.bones -= 100; this.oneUp(); }
  }
  oneUp() { this.carry.lives = Math.min(99, this.carry.lives + 1); this.hooks.sound('oneup'); this.pop(this.player.x, this.player.y - 8, '1UP'); }
  pop(x, y, text) { this.pops.push({ x, y, text: String(text), life: 50 }); }
  score(n, x, y) { this.carry.score += n; this.pop(x, y, n); }

  bumpBlock(tx, ty) {
    const c = this.tile(tx, ty), key = `${tx},${ty}`, kind = this.items[key];
    if (c === '?' || c === 'h' || (c === 'B' && kind)) {
      if (kind === 'bones') {
        this.items[key + '#'] = (this.items[key + '#'] || 0) + 1;
        this.spawnItem('bone', tx, ty);
        if (this.items[key + '#'] >= 6) { this.setTile(tx, ty, 'U'); delete this.items[key]; }
      } else {
        this.setTile(tx, ty, 'U'); delete this.items[key];
        this.spawnItem(kind || 'bone', tx, ty);
      }
      this.bumps.set(key, 8); this.hooks.sound('bump');
    } else if (c === 'B') {
      if (this.carry.big && !this.fly) {
        this.setTile(tx, ty, '.'); this.carry.score += 50; this.hooks.sound('break'); this.shake = Math.max(this.shake, 4);
        for (const [vx, vy] of [[-1, -3], [1, -3], [-.7, -2], [.7, -2]]) this.fx.push({ kind: 'brick', x: tx * T + 2, y: ty * T + 2, vx, vy, life: 70 });
      } else { this.bumps.set(key, 8); this.hooks.sound('bump'); }
    } else { this.hooks.sound('bump'); return; }
    // 블록 위의 적과 뼈다귀
    for (const e of this.enemies) if (!e.dead && e.x + e.w > tx * T && e.x < tx * T + T && Math.abs(e.y + e.h - ty * T) < 3) this.knock(e);
    if (this.tile(tx, ty - 1) === 'o') { this.setTile(tx, ty - 1, '.'); this.addBone(); }
  }

  spawnItem(kind, tx, ty) {
    if (kind === 'bone') { this.addBone(); this.things.push({ kind: 'bonePop', x: tx * T, y: ty * T - 8, w: 8, h: 8, vy: -3, life: 22 }); return; }
    if (kind === 'power') kind = this.carry.big ? 'ball' : 'meat';
    this.things.push({ kind, x: tx * T, y: ty * T, w: 8, h: 8, vx: 0, vy: 0, rise: 16, dir: 1, gone: false });
    this.hooks.sound('item');
  }

  // ── 적 ─────────────────────────────────────────────────────
  spawnEnemies() {
    const right = this.cam + VIEW_W + 24;
    for (const d of this.spawnDefs) {
      if (d.spawned || d.tx * T > right) continue;
      if (d.tx * T < this.cam - 24 && !this.fly) { d.spawned = true; continue; }
      d.spawned = true;
      const [w, h] = SIZES[d.type];
      const e = { type: d.type, x: d.tx * T + (8 - w) / 2, y: d.air ? d.ty * T : d.ty * T - h, w, h, vx: 0, vy: 0, dir: -1, t: 0, stun: 0, state: 'walk', baseY: d.ty * T, dead: false, gone: false };
      if (d.type === 'cup') e.cool = 60 + (d.tx % 5) * 12;
      if (d.type === 'ember') { e.y = ROWS * T + 8; e.cool = 20 + (d.tx % 4) * 20; e.state = 'lava'; }
      if (d.type === 'dino') e.cool = 90 + (d.tx % 5) * 10;
      if (d.type === 'bat') { e.state = 'hang'; e.y = d.ty * T; }
      this.enemies.push(e);
    }
  }

  updateEnemy(e) {
    e.t++;
    if (e.dead) { // 뒤집혀 떨어지거나 납작
      if (e.state === 'flat') { if (e.t > 30) e.gone = true; return; }
      e.vy = Math.min(4, e.vy + .25); e.x += e.vx; e.y += e.vy; if (e.y > ROWS * T + 16) e.gone = true; return;
    }
    if (e.x < this.cam - 64 || e.x > this.cam + VIEW_W + 120) { if (this.fly || e.x < this.cam - 64) e.gone = true; return; }
    if (e.stun > 0) { e.stun--; e.vx = 0; if (e.type !== 'pigeon') { e.vy = Math.min(4, e.vy + .3); if (this.moveY(e, e.vy).length) e.vy = 0; } return; }
    if (e.type === 'pigeon') {
      e.x += (this.fly ? -.85 : -.45); e.y = e.baseY + Math.sin(e.t * .06) * 10; return;
    }
    if (e.type === 'ember') { // 용암에서 튀어 오르는 불꽃(밟을 수 없어요)
      if (e.state === 'lava') { if (--e.cool <= 0) { e.state = 'up'; e.vy = -Math.sqrt(2 * .16 * (ROWS * T + 8 - e.baseY)); this.hooks.sound('spit'); } return; }
      e.vy += .16; e.y += e.vy;
      if (e.vy > 0 && e.y > ROWS * T + 8) { e.state = 'lava'; e.cool = 120; e.y = ROWS * T + 8; }
      return;
    }
    if (e.type === 'bat') { // 천장에 매달렸다가 가까이 오면 휙
      const p = this.player, dx = p.x - e.x;
      if (e.state === 'hang') { if (Math.abs(dx) < 60 || this.fly) { e.state = 'swoop'; e.dir = Math.sign(dx) || -1; e.t = 0; } return; }
      e.x += e.dir * (this.fly ? 1.1 : .8); e.y = e.baseY + Math.abs(Math.sin(e.t * .04)) * 24;
      return;
    }
    if (e.type === 'cup') {
      e.vy = Math.min(4, e.vy + .3); if (this.moveY(e, e.vy).length) e.vy = 0;
      const p = this.player, dx = p.x - e.x;
      if (--e.cool <= 0 && Math.abs(dx) < 110) {
        e.cool = 190;
        this.foes.push({ kind: 'drop', x: e.x + 4, y: e.y - 2, w: 4, h: 4, vx: this.fly ? -1.2 : Math.sign(dx) * Math.min(1.6, Math.abs(dx) / 50 + .4), vy: -2.6, g: .1, life: 260 });
        this.hooks.sound('spit');
      }
      return;
    }
    // 걷는 적: 커피콩·깡통·고슴도치
    if (e.state === 'shell') {
      if (e.vx === 0 && ++e.idle > 420) { e.state = 'walk'; e.h = 12; e.y -= 4; }
    } else {
      e.vx = e.dir * (e.type === 'hedgehog' ? .3 : e.type === 'can' ? .34 : e.type === 'dino' ? .32 : .38);
      if (e.type === 'dino') { // 꼬마 용: 가끔 멈춰 불꽃을 뿜어요
        const p = this.player;
        if (--e.cool <= 0 && Math.abs(p.x - e.x) < 120) { e.cool = 210; e.dir = Math.sign(p.x - e.x) || e.dir; e.breath = 24; }
        if (e.breath > 0) { e.vx = 0; if (--e.breath === 10) { this.foes.push({ kind: 'fire', x: e.x + (e.dir > 0 ? e.w : -4), y: e.y + 3, w: 4, h: 4, vx: e.dir * 1.7, vy: 0, g: 0, life: 150 }); this.hooks.sound('fire'); } }
      }
    }
    e.vy = Math.min(4, e.vy + .3);
    if (this.moveX(e, e.vx)) { e.dir *= -1; if (e.state === 'shell') { e.vx = -e.vx; this.hooks.sound('bump'); } }
    if (this.moveY(e, e.vy).length) e.vy = 0;
    if (e.y > ROWS * T + 8) e.gone = true;
    const tx0 = Math.floor(e.x / T), ty = Math.floor((e.y + e.h - 2) / T);
    if (this.tile(tx0, ty) === '~') e.gone = true;
    if (e.state === 'shell' && e.vx) for (const o of this.enemies) if (o !== e && !o.dead && overlap(e, o)) { this.knock(o); this.score(200, o.x, o.y); }
    if (e.state === 'walk') for (const o of this.enemies) if (o !== e && !o.dead && o.state === 'walk' && !['pigeon', 'cup', 'ember', 'bat'].includes(o.type) && overlap(e, o)) { e.dir = e.x < o.x ? -1 : 1; o.dir = -e.dir; }
  }

  knock(e) { e.dead = true; e.state = 'fall'; e.vy = -2.5; e.vx = e.x < this.player.x ? -.6 : .6; e.t = 0; this.hooks.sound('kick'); }

  stomp(e) {
    const p = this.player;
    this.chain = Math.min(this.chain + 1, STOMP_SCORES.length);
    const pts = STOMP_SCORES[this.chain - 1];
    if (this.chain >= 5) this.oneUp(); else this.score(pts, e.x, e.y - 6);
    p.vy = this.inputA ? -4.2 : -3; this.hooks.sound('stomp');
    if (e.type === 'bean') { e.dead = true; e.state = 'flat'; e.t = 0; }
    else if (e.type === 'can') {
      if (e.state === 'shell' && e.vx === 0) this.kick(e);
      else { e.state = 'shell'; e.vx = 0; e.idle = 0; e.stun = 0; if (e.h === 12) { e.h = 8; e.y += 4; } }
    } else this.knock(e);
  }
  kick(e) { const p = this.player; e.vx = (p.x + p.w / 2 < e.x + e.w / 2 ? 1 : -1) * 3; e.idle = 0; e.kickT = 14; this.hooks.sound('kick'); }

  // ── 아이템·공·적 발사체·효과 ───────────────────────────────
  updateThings() {
    for (const it of this.things) {
      if (it.kind === 'bonePop') { it.y += it.vy; it.vy += .25; if (--it.life <= 0) it.gone = true; continue; }
      if (it.rise > 0) { it.rise--; it.y -= .5; if (it.rise === 0) { it.baseY = it.y; it.vx = STILL.includes(it.kind) ? 0 : it.kind === 'star' ? 1 : .7; } continue; }
      if (it.kind === 'wing') { it.t = (it.t || 0) + 1; it.y = it.baseY + Math.sin(it.t / 12) * 3; continue; }
      if (STILL.includes(it.kind)) continue;
      it.vy = Math.min(4, it.vy + (it.kind === 'star' ? .2 : .3));
      if (this.moveX(it, it.vx)) it.vx = -it.vx;
      if (this.moveY(it, it.vy).length && it.vy >= 0) it.vy = it.kind === 'star' ? -3.2 : 0;
      if (it.y > ROWS * T + 8) it.gone = true;
    }
    this.things = this.things.filter(t => !t.gone);
  }

  updateShots() {
    for (const s of this.shots) {
      if (--s.life <= 0 || s.x < this.cam - 16 || s.x > this.cam + VIEW_W + 16) { s.gone = true; continue; }
      if (s.kind === 'shot') { if (this.moveX(s, s.vx)) s.gone = true; }
      else if (s.kind === 'pop') { s.vy += s.g; s.x += s.vx; s.y += s.vy; if (SOLID.includes(this.tile(Math.floor((s.x + 2) / T), Math.floor((s.y + 2) / T)))) { s.gone = true; this.fx.push({ kind: 'sparkle', x: s.x + 2, y: s.y + 2, life: 10 }); } }
      else if (s.kind === 'flame') { s.x += s.vx; s.y += s.vy; if (SOLID.includes(this.tile(Math.floor((s.x + 2) / T), Math.floor((s.y + 2) / T)))) s.gone = true; }
      else {
        if (this.moveX(s, s.vx)) s.vx = -s.vx;
        const hits = this.moveY(s, s.vy);
        if (hits.length) s.vy = -s.vy;
        if (s.y > ROWS * T) s.gone = true;
      }
      this.collectTiles(s);
      for (const e of this.enemies) if (!e.dead && e.type !== 'ember' && overlap(s, e)) { this.knock(e); this.score(100, e.x, e.y - 6); if (s.kind !== 'flame') { s.gone = true; break; } }
      for (const f of this.foes) if (overlap(s, f)) { f.gone = true; s.gone = true; }
      const b = this.boss;
      if (b && !b.dead && !s.gone && !s.bossHit && overlap(s, b)) { if (s.kind === 'flame') { for (const o of this.shots) if (o.kind === 'flame') o.bossHit = true; } else s.gone = true; if (b.hurt === 0) { b.chip += 1; this.hooks.sound('bump'); if (b.chip >= 3) { b.chip = 0; this.hitBoss(b, 40); } } }
    }
    this.shots = this.shots.filter(s => !s.gone);
  }

  updateFoes() {
    for (const f of this.foes) {
      if (--f.life <= 0) { f.gone = true; continue; }
      if (f.kind === 'fire') { f.x += f.vx; f.y += f.vy; if (SOLID.includes(this.tile(Math.floor((f.x + 2) / T), Math.floor((f.y + 2) / T)))) { f.gone = true; this.fx.push({ kind: 'splash', x: f.x, y: f.y, life: 12 }); } }
      else if (f.kind === 'drop') { f.vy += f.g; f.x += f.vx; f.y += f.vy; if (SOLID.includes(this.tile(Math.floor((f.x + 2) / T), Math.floor((f.y + 3) / T)))) { f.gone = true; this.fx.push({ kind: 'splash', x: f.x, y: f.y, life: 12 }); } }
      else if (f.kind === 'yarn') {
        f.vy = Math.min(4, f.vy + .15);
        if (this.moveX(f, f.vx)) f.vx = -f.vx;
        if (this.moveY(f, f.vy).length && f.vy >= 0) f.vy = -2.2;
      }
      if (f.y > ROWS * T + 8) f.gone = true;
    }
    this.foes = this.foes.filter(f => !f.gone);
  }

  updateFx() {
    if (this.shake > 0) this.shake--;
    for (const f of this.fx) { f.life--; if (f.kind === 'dust') { f.x += f.dir * .35; f.y -= .15; } if (f.kind === 'brick') { f.x += f.vx; f.y += f.vy; f.vy += .2; } if (f.kind === 'fallblock') { f.vy += .2; f.y += f.vy; } if (f.kind === 'fly') { f.x += (f.tx - f.x) * .3; f.y += (f.ty - f.y) * .3; } }
    this.fx = this.fx.filter(f => f.life > 0);
    for (const q of this.pops) { q.life--; q.y -= .4; }
    this.pops = this.pops.filter(q => q.life > 0);
  }

  interact() {
    const p = this.player;
    for (const it of this.things) {
      if (it.gone || it.kind === 'bonePop' || it.rise > 8 || !overlap(p, it)) continue;
      it.gone = true;
      if (it.kind === 'meat') { if (!this.carry.big) this.grow(); else this.score(1000, it.x, it.y); this.hooks.sound('power'); }
      else if (it.kind === 'ball') { if (!this.carry.big) this.grow(); this.carry.power = 'ball'; this.hooks.sound('power'); this.hooks.hint('테니스공 파워! B(X)를 눌러 공을 던져요. 공은 뼈다귀도 모아 와요.'); }
      else if (it.kind === 'star') { p.star = 600; this.hooks.music('star'); this.hooks.sound('power'); }
      else if (it.kind === 'heart') this.oneUp();
      else if (it.kind === 'wing') { if (!this.carry.big) this.grow(); this.carry.power = 'wing'; this.hooks.sound('power'); this.hooks.hint('날개 파워! 공중에서 A를 한 번 더 눌러 뛰고, 꾹 누르면 사뿐히 내려와요.'); }
      else if (it.kind === 'shield') { this.carry.shield = true; this.hooks.sound('power'); this.hooks.hint('방울 방패! 한 번은 부딪혀도 괜찮아요.'); }
      else if (it.kind === 'magnet') { p.magnet = 900; this.hooks.sound('power'); this.hooks.hint('뼈다귀 자석! 잠깐 동안 주변 뼈다귀가 날아와요.'); }
      else if (it.kind === 'clock') { if (this.easy) this.score(500, it.x, it.y); else { this.time += 100; this.pop(it.x, it.y - 6, '+100'); } this.hooks.sound('item'); }
      else if (it.kind === 'bigBone') { this.addBone(10); this.pop(it.x, it.y - 6, '+10'); }
    }
    for (const e of this.enemies) {
      if (e.dead || !overlap(p, e)) continue;
      if (p.star > 0 || p.dashT > 0) { this.knock(e); this.score(200, e.x, e.y - 6); continue; }
      if (e.type === 'ember' && e.state === 'lava') continue;
      const stompable = !(e.type === 'hedgehog' && e.stun === 0) && e.type !== 'ember';
      const fromAbove = p.vy > 0 && p.prevBottom <= e.y + 5;
      if (fromAbove && stompable && !this.fly) { this.stomp(e); p.y = e.y - p.h; continue; }
      if (fromAbove && this.fly && stompable) { this.knock(e); this.score(100, e.x, e.y); continue; }
      if (e.stun > 0) continue;
      if (e.state === 'shell' && e.vx === 0) { this.kick(e); continue; }
      if (e.state === 'shell' && e.kickT > 0) { e.kickT--; continue; }
      this.hurt();
    }
    for (const f of this.foes) {
      if (!overlap(p, f)) continue;
      if (f.kind === 'yarn' && p.vy > 0 && p.prevBottom <= f.y + 4) { f.gone = true; p.vy = -3; this.hooks.sound('stomp'); continue; }
      if (p.star > 0 || p.dashT > 0) { f.gone = true; continue; }
      this.hurt();
    }
    const b = this.boss;
    if (b && !b.dead && overlap(p, b) && p.dashT > 0 && b.hurt === 0) { this.hitBoss(b, 60); p.dashT = 0; p.vx = -p.dashDir * 2; p.vy = -3; }
    else if (b && !b.dead && overlap(p, b)) {
      const fromAbove = p.vy > 0 && p.prevBottom <= b.y + 7;
      if (fromAbove && b.hurt === 0) { this.hitBoss(b, 70); p.vy = -4.4; p.y = b.y - p.h; }
      else if (fromAbove) p.vy = -3.5;
      else if (b.hurt === 0 && b.stun === 0) this.hurt();
    }
  }

  grow() { const p = this.player; if (this.carry.big) return; this.carry.big = true; p.y -= 7; p.h = 20; p.inv = Math.max(p.inv, 30); }
  hurt() {
    const p = this.player;
    if (p.inv > 0 || p.star > 0 || this.state !== 'play' || this.god) return;
    if (this.fly) { p.flyHp--; p.inv = 90; this.hooks.sound('hurt'); if (p.flyHp <= 0) this.die(); return; }
    if (p.dashT > 0) return;
    if (this.carry.shield) { this.carry.shield = false; p.inv = 140; this.hooks.sound('hurt'); this.fx.push({ kind: 'ring', x: p.x + p.w / 2, y: p.y + p.h / 2, life: 14 }); return; }
    if (this.carry.power) { this.carry.power = null; p.inv = 140; this.hooks.sound('hurt'); return; }
    if (this.carry.big) { this.carry.big = false; p.h = 13; p.y += 7; p.inv = 140; this.hooks.sound('hurt'); return; }
    this.die();
  }
  fall() {
    const p = this.player, c = this.carry;
    if (this.state !== 'play') return;
    if (!p.safe || !(c.shield || c.power || c.big)) return this.die();
    if (c.shield) c.shield = false; else if (c.power) c.power = null; else { c.big = false; p.h = 13; }
    p.x = p.safe.x; p.y = p.safe.feet - p.h; p.vx = 0; p.vy = 0; p.inv = 150; p.onMover = null;
    this.hooks.sound('hurt'); this.fx.push({ kind: 'ring', x: p.x + p.w / 2, y: p.y + p.h / 2, life: 18 });
    if (!this.fallHint) { this.fallHint = true; this.hooks.hint('앗! 떨어졌지만 한 번은 구해 줬어요. 대신 작아졌어요.'); }
  }
  die() {
    if (this.state !== 'play') return;
    this.state = 'dying'; this.stateT = 0; const p = this.player; p.vx = 0; p.vy = 0;
    this.carry.big = false; this.carry.power = null; this.carry.shield = false;
    this.hooks.music(null); this.hooks.sound('die');
  }
  updateDying() {
    const p = this.player; this.stateT++;
    if (this.stateT === 30) p.vy = -4;
    if (this.stateT > 30) { p.vy += .2; p.y += p.vy; }
    if (this.stateT === 170) { this.state = 'done'; this.hooks.dead({ checkpoint: this.checkpoint }); }
  }

  updateCamera() {
    if (this.fly) return;
    const p = this.player, max = this.L.w * T - VIEW_W;
    if (this.bossStarted) { this.cam = this.L.boss.arena * T; return; }
    const target = clamp(p.x - 64 + p.face * 8, 0, max);
    this.cam += clamp(target - this.cam, -3, 3);
    this.cam = clamp(this.cam, Math.max(0, p.x - 104), Math.min(max, p.x - 40));
    this.cam = clamp(this.cam, 0, max);
  }

  updateTimer() {
    if (this.easy || this.bossStarted) return;
    if (++this.timeTick >= 45) {
      this.timeTick = 0; this.time--;
      if (this.time === 100) this.hooks.sound('hurry');
      if (this.time <= 0) { this.time = 0; this.die(); }
    }
  }

  checkHints() {
    const px = this.player.x;
    for (const h of this.L.hints) if (!this.hintsShown.has(h) && px >= h.tx * T) { this.hintsShown.add(h); this.hooks.hint(h.text); }
  }

  // ── 골 ─────────────────────────────────────────────────────
  touchPole() {
    const p = this.player, gx = this.L.goal.tx * T;
    if (this.state !== 'play') return;
    const heightScore = [5000, 2000, 800, 400, 200, 100];
    const band = clamp(Math.floor((p.y - 3 * T) / (1.6 * T)), 0, heightScore.length - 1);
    this.score(heightScore[band], gx, p.y);
    this.state = 'pole'; this.stateT = 0; p.x = gx - p.w + 4; p.vx = 0; p.vy = 0; p.face = 1;
    this.flag = { y: 3 * T };
    this.hooks.music(null); this.hooks.sound('pole');
  }
  updateGoal() {
    const p = this.player, base = (ROWS - 4) * T;
    this.stateT++;
    if (this.state === 'pole') {
      if (p.y + p.h < base) p.y = Math.min(base - p.h, p.y + 1.8);
      if (this.flag.y < base - 8) this.flag.y += 1.8;
      if (p.y + p.h >= base && this.flag.y >= base - 8) { this.state = 'walkout'; this.stateT = 0; p.x += 10; this.hooks.sound('clear'); }
    } else if (this.state === 'walkout') {
      p.vx = .9; p.face = 1; p.vy = Math.min(4, p.vy + .3);
      this.moveX(p, p.vx); if (this.moveY(p, p.vy).length) { p.vy = 0; p.ground = true; }
      p.anim += .16;
      if (p.x > (this.L.goal.tx + 5) * T) { p.hidden = true; this.state = 'tally'; this.stateT = 0; }
    } else if (this.state === 'tally') {
      if (this.time > 0 && !this.easy) { const n = Math.min(this.time, 5); this.time -= n; this.carry.score += n * 10; if (this.stateT % 3 === 0) this.hooks.sound('tick'); }
      else if (this.stateT > 40) this.win();
    }
  }
  win() { if (this.state === 'done') return; this.state = 'done'; this.hooks.clear({ id: this.L.id }); }

  // ── 보스: 커피 ─────────────────────────────────────────────
  startBoss() {
    const B = this.L.boss;
    this.bossStarted = true; this.cam = B.arena * T;
    for (let ty = 0; ty < ROWS - 3; ty++) this.setTile(B.arena, ty, 'H');
    const dragon = B.kind === 'dragon', [w, h] = dragon ? SIZES.dragon : SIZES.boss;
    this.boss = { kind: dragon ? 'dragon' : 'coffee', state: 'fly', fireT: 90, diveT: 200, restT: 0, x: B.tx * T, y: (ROWS - 3) * T - h, w, h, vx: 0, vy: 0, dir: -1, hp: B.hp, maxHp: B.hp, hurt: 0, stun: 0, chip: 0, jumpT: 120, throwT: 80, t: 0, dead: false, final: B.final, ground: false };
    this.hooks.music(null); this.hooks.sound('meow');
    this.state = 'bossTalk';
    if (dragon) { this.boss.y = 3 * T; this.hooks.sound('roar'); }
    const lines = dragon
      ? (B.final
        ? ['에스프레소: 크아아앙! 여기까지 오다니!', `에스프레소: ${this.friend}는 내 보물이다! 절대 못 돌려준다!`, this.char === 'coffee' ? '커피: 친구를 괴롭히면 가만 안 둔다냥!' : this.char === 'mocha' ? '모카: 야옹! 라떼를 돌려줘!' : '라떼: 멍멍! 모카를 돌려줘!']
        : ['에스프레소: 크르릉... 조그만 녀석들이 감히!', '에스프레소: 내 불꽃 맛을 보여 주마!'])
      : B.final
      ? ['커피: 냐하하! 여기까지 오다니 대단하다냥!', `커피: 하지만 ${this.friend}는 절대 못 데려간다냥! 덤벼라, ${this.hero}!`]
      : this.L.id === '1-3'
        ? [`커피: 냐옹~ 네가 ${this.hero}냥? ${this.friend}는 내가 데려갔다냥!`, `커피: ${this.friend}를 찾고 싶으면 나를 이겨 봐라냥!`]
        : ['커피: 또 왔냥? 이번엔 더 빠르다냥!', '커피: 털실 공 맛 좀 봐라냥!'];
    this.hooks.say(lines, () => { this.state = 'play'; this.hooks.music(dragon ? 'dragonBoss' : 'boss'); });
  }
  updateBoss(b) {
    b.t++;
    if (b.dead) return;
    if (b.hurt > 0) b.hurt--;
    if (b.kind === 'dragon') return this.updateDragon(b);
    const p = this.player, arena = this.L.boss.arena * T;
    const speed = .45 + (b.maxHp - b.hp) * .12;
    if (b.stun > 0) { b.stun--; b.vx = 0; }
    else if (b.ground) {
      const dx = p.x - b.x;
      if (Math.abs(dx) > 20 || b.t % 90 === 0) b.dir = Math.sign(dx) || -1;
      b.vx = b.dir * speed;
      if (--b.jumpT <= 0) { b.vy = -4.2; b.vx = b.dir * (1.1 + speed * .5); b.jumpT = 170 + (b.t * 7) % 60; this.hooks.sound('bossJump'); }
      if (--b.throwT <= 0) {
        b.throwT = Math.max(80, 140 - (b.maxHp - b.hp) * 12);
        this.foes.push({ kind: 'yarn', x: b.x + (b.dir < 0 ? -4 : b.w - 4), y: b.y + 4, w: 8, h: 8, vx: b.dir * (1.2 + (b.maxHp - b.hp) * .15), vy: -1.8, life: 360 });
        this.hooks.sound('throw');
      }
    }
    b.vy = Math.min(4.5, b.vy + .28);
    const wasX = b.x;
    this.moveX(b, b.vx);
    if (b.x === wasX && b.vx) b.dir *= -1;
    b.ground = false;
    if (this.moveY(b, b.vy).length && b.vy >= 0) { if (!b.ground && b.vy > 2) this.fx.push({ kind: 'ring', x: b.x + 9, y: b.y + b.h, life: 10 }); b.ground = true; b.vy = 0; }
    b.x = clamp(b.x, arena + T, arena + 18 * T - b.w);
  }
  // 용: 하늘을 날며 불꽃을 뿜다가, 내려와 쉴 때 밟을 수 있어요
  updateDragon(b) {
    const p = this.player, arena = this.L.boss.arena * T, groundY = (ROWS - 3) * T - b.h, rage = (b.maxHp - b.hp) / b.maxHp, fin = b.final;
    if (b.stun > 0 && b.state !== 'rest') { b.state = 'rest'; b.restT = b.stun; b.vy = 1; }
    if (b.state === 'fly') {
      const targetX = arena + T * (3 + (Math.sin(b.t / (fin ? 70 : 90)) + 1) * 6.5);
      b.x += (targetX - b.x) * .03; b.y += ((2.5 * T + Math.sin(b.t / 16) * 6) - b.y) * .08;
      b.dir = p.x < b.x ? -1 : 1;
      if (--b.fireT <= 0) {
        b.fireT = Math.max(70, (fin ? 120 : 150) - rage * 50);
        const n = fin ? 3 + Math.round(rage * 2) : 3, cx = b.x + (b.dir < 0 ? 2 : b.w - 2), cy = b.y + 12, a0 = Math.atan2(p.y + p.h / 2 - cy, p.x + p.w / 2 - cx);
        for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * .28; this.foes.push({ kind: 'fire', x: cx, y: cy, w: 5, h: 5, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.6, g: 0, life: 200 }); }
        this.hooks.sound('fire');
      }
      if (--b.diveT <= 0) { b.state = 'dive'; b.diveX = clamp(p.x - b.w / 2, arena + T, arena + 18 * T - b.w); this.hooks.sound('roar'); }
    } else if (b.state === 'dive') {
      b.x += clamp(b.diveX - b.x, -2.2, 2.2); b.y += 2.2 + rage;
      if (b.y >= groundY) { b.y = groundY; b.state = 'rest'; b.restT = fin ? 120 - rage * 20 : 140; this.shake = 8; this.fx.push({ kind: 'ring', x: b.x + b.w / 2, y: b.y + b.h, life: 14 }); }
    } else if (b.state === 'rest') {
      if (b.y < groundY) { b.y = Math.min(groundY, b.y + 2.5); }
      if (b.stun > 0) b.stun--;
      if (--b.restT <= 0 && b.stun <= 0) { b.state = 'rise'; }
    } else if (b.state === 'rise') {
      b.y -= 1.8; if (b.y <= 2.5 * T) { b.state = 'fly'; b.diveT = Math.max(110, (fin ? 170 : 220) - rage * 70); }
    }
    b.ground = b.state === 'rest';
    b.x = clamp(b.x, arena + T, arena + 19 * T - b.w);
  }
  hitBoss(b, inv) {
    b.hp--; b.hurt = inv; b.stun = 0; this.hooks.sound('bossHit'); this.hooks.sound(b.kind === 'dragon' ? 'roar' : 'meow');
    if (b.kind === 'dragon' && b.state === 'rest') { b.state = 'rise'; } this.shake = 10; this.carry.score += 1000; this.pop(b.x, b.y - 8, 1000);
    if (b.hp <= 0) {
      b.dead = true; this.foes = []; this.state = 'bossTalk'; this.hooks.music(null); this.hooks.sound('bossDown');
      const lines = b.kind === 'dragon'
        ? (b.final
          ? ['에스프레소: 크릉... 졌다...', '에스프레소: 사실은... 혼자 사는 게 너무 심심했어.', '모카: 그럼 너도 우리랑 친구 하자!']
          : ['에스프레소: 크윽! 제법이군!', `에스프레소: 하지만 ${this.friend}는 내 성에 있다! 쫓아올 테면 와 봐라!`])
        : b.final
        ? ['커피: 으앙... 졌다냥.', '커피: 사실은... 나도 같이 놀 친구가 갖고 싶었어.', this.char === 'mocha' ? '모카: 야옹! 그럼 우리랑 친구 하자!' : '라떼: 멍멍! 그럼 우리랑 친구 하자!']
        : ['커피: 으앗! 제법이다냥!', `커피: 하지만 ${this.friend}는 여기 없지롱~ 다음 곳에서 보자냥!`];
      this.hooks.say(lines, () => { this.state = 'bossEnd'; this.stateT = 0; });
    }
  }
  updateBossEnd() {
    const b = this.boss; this.stateT++;
    this.updateFx();
    if (b.final) {
      if (this.stateT === 1) this.hooks.music('clear');
      if (this.stateT === 90) { this.state = 'done'; this.hooks.ending(); }
      return;
    }
    if (b.kind === 'dragon') { // 용은 하늘 높이 날아가요
      b.dir = 1; b.x += 1.6; b.y -= 1.4;
      if (this.stateT === 120) this.hooks.sound('clear');
      if (this.stateT > 180) this.win();
      return;
    }
    // 커피가 오른쪽으로 도망쳐요
    if (this.stateT === 1) { b.vy = -4.5; b.dir = 1; this.hooks.sound('bossJump'); }
    b.vy += .25; b.x += 2.2; b.y += b.vy;
    if (b.y > (ROWS - 3) * T - b.h && b.vy > 0) { b.y = (ROWS - 3) * T - b.h; b.vy = -3.5; }
    if (this.stateT === 150) { this.hooks.sound('clear'); }
    if (this.stateT > 200) this.win();
  }
}

export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
