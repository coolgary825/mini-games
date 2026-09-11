/* The visual game and AI use the same fixed-step physics. No network dependencies. */
(() => {
  'use strict';
  const P = window.AlkagiPhysics, $ = id => document.getElementById(id);
  const canvas = $('board'), ctx = canvas.getContext('2d');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let stones, level = 1, turn = 0, phase = 'aim', round = 1, serial = 0;
  let drag = null, cue = null, keyboardIndex = 0, particles = [], shake = 0;
  let accumulator = 0, lastTime = 0, resting = 0, fallenThisShot = 0;
  let toastTimer, resultTimer, audioContext, soundEnabled = true, lastHitSound = 0;
  let records = {};
  try {
    const saved = JSON.parse(localStorage.getItem('alkagi-club-v1') || '{}');
    if (saved && typeof saved === 'object') {
      records = saved.wins && typeof saved.wins === 'object' ? saved.wins : {};
      if (Number.isInteger(saved.level) && saved.level >= 1 && saved.level <= 7) level = saved.level;
      soundEnabled = saved.sound !== false;
    }
  } catch (_) { /* The game also works with storage disabled. */ }
  function save() {
    try { localStorage.setItem('alkagi-club-v1', JSON.stringify({ wins: records, level, sound: soundEnabled })); } catch (_) {}
  }
  function unlockAudio() {
    if (!soundEnabled) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    try { audioContext ||= new Audio(); if (audioContext.state === 'suspended') audioContext.resume().catch(() => {}); } catch (_) {}
  }
  function sound(kind, intensity = 1) {
    if (!soundEnabled || !audioContext || audioContext.state !== 'running') return;
    const now = audioContext.currentTime;
    if (kind === 'hit' && now - lastHitSound < .035) return;
    if (kind === 'hit') lastHitSound = now;
    const osc = audioContext.createOscillator(), gain = audioContext.createGain();
    osc.type = kind === 'hit' ? 'triangle' : 'sine';
    const pitch = kind === 'hit' ? 850 : kind === 'fall' ? 240 : kind === 'win' ? 660 : 390;
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(kind === 'win' ? 990 : pitch * .35, now + .13);
    gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.11 * Math.min(1, intensity), now + .004);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .19);
    osc.connect(gain); gain.connect(audioContext.destination); osc.start(now); osc.stop(now + .2);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  function syncSound() {
    $('sound').textContent = soundEnabled ? '소리 켜짐 ♪' : '소리 꺼짐';
    $('sound').setAttribute('aria-label', soundEnabled ? '소리 끄기' : '소리 켜기');
    $('sound').setAttribute('aria-pressed', String(!soundEnabled));
  }
  function power(value = 0) {
    const percent = Math.round(Math.min(1, value) * 100);
    $('power-value').textContent = percent + '%';
    $('power-fill').style.width = percent + '%';
    $('power-fill').style.background = percent > 80 ? '#bd8245' : '#328264';
    $('aim-power').hidden = percent === 0;
    $('aim-power').textContent = '힘 ' + percent + '%';
  }
  function setStatus(text, label) {
    $('status').textContent = text; $('phase-label').textContent = label;
    $('human-player').classList.toggle('active', turn === 0);
    $('ai-player').classList.toggle('active', turn === 1);
  }
  function updateCounts() {
    for (const [team, key] of [[0, 'human'], [1, 'ai']]) {
      const count = stones.filter(s => s.team === team && s.alive).length;
      $(key + '-score').textContent = count;
      $(key + '-count').textContent = Array.from({ length: 5 }, (_, i) => i < count ? '●' : '○').join(' ');
    }
  }
  function updateLevel() {
    document.querySelectorAll('#levels button').forEach((b, i) => {
      b.classList.toggle('selected', i + 1 === level);
      b.classList.toggle('won', (records[i + 1] || 0) > 0);
      b.setAttribute('aria-pressed', String(i + 1 === level));
    });
    const config = P.LEVELS[level - 1];
    $('level-number').textContent = String(level).padStart(2, '0');
    $('level-name').textContent = config.name; $('level-label').textContent = config.label;
    $('level-description').textContent = config.description;
    $('wins').textContent = (Number(records[level]) || 0) + '승';
  }
  function reset(newLevel = level) {
    serial++; clearTimeout(toastTimer); clearTimeout(resultTimer);
    if ($('result').open) $('result').close();
    if (drag?.pointerId != null && canvas.hasPointerCapture(drag.pointerId)) canvas.releasePointerCapture(drag.pointerId);
    level = newLevel; stones = P.initialStones(); turn = 0; phase = 'aim'; round = 1;
    drag = cue = null; keyboardIndex = 0; particles = []; shake = 0; accumulator = resting = 0;
    $('toast').classList.remove('visible'); canvas.style.cursor = 'grab';
    $('turn-number').textContent = 'ROUND 01';
    updateLevel(); updateCounts(); power(); save();
    setStatus('내 차례! 검은 돌을 당겨 보세요.', 'YOUR TURN');
  }
  function toast(message) {
    clearTimeout(toastTimer); $('toast').textContent = message; $('toast').classList.add('visible');
    toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 1450);
  }
  function event(e) {
    if (e.type === 'hit') {
      sound('hit', Math.max(.25, e.impact / 1000));
      if (!reducedMotion) shake = Math.min(5, e.impact / 230);
    } else {
      sound('fall'); updateCounts();
      if (e.team !== turn) fallenThisShot++;
      if (fallenThisShot >= 2 && e.team !== turn) toast(fallenThisShot + '알 콤보!');
    }
    if (!reducedMotion) for (let i = 0; i < (e.type === 'fall' ? 16 : 7); i++) {
      const angle = Math.random() * Math.PI * 2, speed = 35 + Math.random() * 120;
      particles.push({ x: e.x, y: e.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: .5, maxLife: .5, color: e.type === 'fall' ? '#f6e5b4' : '#fff8dc', size: 2 + Math.random() * 3 });
    }
  }
  function launch(shot) {
    if (!P.shoot(stones, shot)) return;
    phase = 'moving'; drag = cue = null; resting = 0; fallenThisShot = 0; accumulator = 0;
    canvas.style.cursor = 'default'; power(shot.speed / P.MAX_SPEED); sound('launch');
    setStatus(turn === 0 ? '좋아, 그대로 밀어내!' : '컴퓨터의 한 수!', 'IN MOTION');
  }
  function finish() {
    const winner = P.outcome(stones);
    if (winner !== null) {
      phase = 'over'; power(); updateCounts();
      const won = winner === 0, draw = winner === 'draw';
      if (won) { records[level] = (Number(records[level]) || 0) + 1; save(); updateLevel(); sound('win'); }
      $('result-symbol').textContent = won ? '✦' : draw ? '◎' : '↗';
      $('result-eyebrow').textContent = won ? 'NICE SHOT!' : draw ? 'WHAT A MATCH.' : 'ONE MORE SHOT.';
      $('result-title').textContent = won ? (level === 7 ? '알까기 신을 이겼어!' : '멋진 승리!') : draw ? '아슬아슬, 무승부!' : '다음엔 이길 수 있어!';
      $('result-description').textContent = won ? `${level}단계 ${P.LEVELS[level - 1].name} 격파! ${round}라운드 만에 판을 가져왔어요.` : draw ? '마지막 돌이 함께 떨어졌어요. 다시 겨뤄 봐요.' : '내 돌이 모두 떨어졌어요. 힘을 조금 줄이고 가장자리의 상대 돌을 노려 봐요.';
      $('next-level').hidden = !won || level === 7;
      setStatus(won ? '내 승리! 멋진 한 판이었어요.' : draw ? '무승부! 마지막 돌이 함께 떨어졌어요.' : '컴퓨터 승리. 다시 도전해 봐요!', 'GAME OVER');
      resultTimer = setTimeout(() => $('result').showModal(), 650);
      return;
    }
    turn = 1 - turn; power();
    if (turn === 0) {
      round++; $('turn-number').textContent = 'ROUND ' + String(round).padStart(2, '0');
      phase = 'aim'; canvas.style.cursor = 'grab';
      setStatus('내 차례! 검은 돌을 당겨 보세요.', 'YOUR TURN');
    } else { phase = 'thinking'; setStatus('컴퓨터가 다음 수를 생각하고 있어요…', 'THINKING'); aiTurn(); }
  }
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function aiTurn() {
    const token = serial;
    const shot = await P.chooseShot(stones, level, 1, { cancelled: () => token !== serial, yield: () => wait(0) });
    if (!shot || token !== serial) return;
    cue = { ...shot, ai: true }; power(shot.speed / P.MAX_SPEED);
    setStatus('컴퓨터가 조준하고 있어요…', 'AIMING');
    await wait(650);
    if (token === serial && phase === 'thinking') launch(shot);
  }
  function position(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * 720 / rect.width, y: (e.clientY - rect.top) * 720 / rect.height };
  }
  function cancelAim() {
    if (phase !== 'aim') return;
    if (drag?.pointerId != null && canvas.hasPointerCapture(drag.pointerId)) canvas.releasePointerCapture(drag.pointerId);
    drag = cue = null; power(); canvas.style.cursor = 'grab';
    setStatus('내 차례! 검은 돌을 당겨 보세요.', 'YOUR TURN');
  }
  function updateDrag(e) {
    const p = position(e), dx = drag.start.x - p.x, dy = drag.start.y - p.y;
    const distance = Math.hypot(dx, dy);
    cue = { id: drag.id, angle: Math.atan2(dy, dx), speed: Math.min(1, distance / 190) * P.MAX_SPEED };
    power(cue.speed / P.MAX_SPEED);
  }
  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0 || phase !== 'aim' || turn !== 0 || drag) return;
    unlockAudio(); const p = position(e);
    const stone = stones.find(s => s.alive && s.team === 0 && Math.hypot(p.x - s.x, p.y - s.y) < P.RADIUS + 12);
    if (!stone) return;
    e.preventDefault(); canvas.focus({ preventScroll: true }); canvas.setPointerCapture(e.pointerId);
    drag = { id: stone.id, start: p, pointerId: e.pointerId }; cue = { id: stone.id, angle: -Math.PI / 2, speed: 0 };
    canvas.style.cursor = 'grabbing'; setStatus('쏠 방향의 반대로 당긴 뒤 놓으세요.', 'TAKE YOUR SHOT');
  });
  canvas.addEventListener('pointermove', e => { if (drag?.pointerId === e.pointerId) updateDrag(e); });
  canvas.addEventListener('pointerup', e => {
    if (!drag || drag.pointerId !== e.pointerId) return;
    updateDrag(e); const shot = { ...cue }; drag = null;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    if (shot.speed < P.MAX_SPEED * .045) cancelAim(); else launch(shot);
  });
  canvas.addEventListener('pointercancel', cancelAim);
  canvas.addEventListener('lostpointercapture', () => { if (drag) cancelAim(); });
  canvas.addEventListener('contextmenu', e => { e.preventDefault(); cancelAim(); });
  window.addEventListener('blur', cancelAim);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAim(); lastTime = 0; accumulator = 0; });
  canvas.addEventListener('keydown', e => {
    if (e.key === 'Escape' && phase === 'aim') { e.preventDefault(); cancelAim(); return; }
    if (phase !== 'aim' || turn !== 0 || drag) return;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)) return;
    e.preventDefault(); unlockAudio();
    const own = stones.filter(s => s.alive && s.team === 0);
    keyboardIndex %= own.length;
    if (!cue || !cue.keyboard) {
      if (e.key === 'ArrowLeft') keyboardIndex = (keyboardIndex + own.length - 1) % own.length;
      if (e.key === 'ArrowRight') keyboardIndex = (keyboardIndex + 1) % own.length;
      cue = { id: own[keyboardIndex].id, angle: -Math.PI / 2, speed: P.MAX_SPEED * .6, keyboard: e.key === 'Enter', selectOnly: e.key !== 'Enter' };
    } else {
      if (e.key === 'Enter') { launch({ ...cue }); return; }
      if (e.key === 'ArrowLeft') cue.angle -= .045;
      if (e.key === 'ArrowRight') cue.angle += .045;
      if (e.key === 'ArrowUp') cue.speed = Math.min(P.MAX_SPEED, cue.speed + P.MAX_SPEED * .025);
      if (e.key === 'ArrowDown') cue.speed = Math.max(P.MAX_SPEED * .05, cue.speed - P.MAX_SPEED * .025);
    }
    power(cue.selectOnly ? 0 : cue.speed / P.MAX_SPEED);
    setStatus(cue.selectOnly ? '← → 돌 선택 · Enter로 조준 시작' : '← → 각도 · ↑ ↓ 힘 · Enter 발사', 'KEYBOARD');
  });
  for (let i = 1; i <= 7; i++) {
    const b = document.createElement('button'); b.textContent = i;
    b.setAttribute('aria-label', `${i}단계 ${P.LEVELS[i - 1].name}. 선택하면 새 게임을 시작합니다.`);
    b.title = `${i}단계 ${P.LEVELS[i - 1].name} · 새 게임`;
    b.addEventListener('click', () => { unlockAudio(); reset(i); }); $('levels').appendChild(b);
  }
  $('sound').addEventListener('click', () => { soundEnabled = !soundEnabled; unlockAudio(); syncSound(); save(); });
  $('restart').addEventListener('click', () => { unlockAudio(); reset(); });
  $('play-again').addEventListener('click', () => { reset(); canvas.focus({ preventScroll: true }); });
  $('next-level').addEventListener('click', () => { reset(Math.min(7, level + 1)); canvas.focus({ preventScroll: true }); });
  $('view-board').addEventListener('click', () => $('result').close());
  // Cache the wood and grid; only stones and effects need redrawing each frame.
  const wood = document.createElement('canvas'); wood.width = wood.height = 720;
  const w = wood.getContext('2d');
  w.shadowColor = '#67513535'; w.shadowBlur = 20; w.shadowOffsetY = 13;
  w.fillStyle = '#b8905b'; w.beginPath(); w.roundRect(47, 47, 626, 632, 15); w.fill(); w.shadowColor = 'transparent';
  const gradient = w.createLinearGradient(60, 60, 650, 640);
  gradient.addColorStop(0, '#e4c89d'); gradient.addColorStop(.5, '#dbb785'); gradient.addColorStop(1, '#d3ac77');
  w.fillStyle = gradient; w.beginPath(); w.roundRect(48, 43, 624, 624, 13); w.fill();
  w.save(); w.beginPath(); w.roundRect(49, 44, 622, 622, 12); w.clip();
  for (let i = 0; i < 210; i++) {
    const y = 44 + i * 3;
    w.strokeStyle = i % 3 === 0 ? '#fff3d018' : '#8b633312'; w.lineWidth = .6;
    w.beginPath(); w.moveTo(48, y); w.bezierCurveTo(220, y - Math.sin(i * .23) * 5, 460, y + Math.cos(i) * 3, 672, y + Math.sin(i) * 2); w.stroke();
  }
  w.restore(); w.strokeStyle = '#855d323d'; w.lineWidth = 1;
  for (let i = 0; i < 9; i++) {
    const v = 90 + i * 67.5;
    w.beginPath(); w.moveTo(v, 90); w.lineTo(v, 630); w.stroke();
    w.beginPath(); w.moveTo(90, v); w.lineTo(630, v); w.stroke();
  }
  for (const x of [225, 360, 495]) for (const y of [225, 360, 495]) {
    if (x === 360 !== (y === 360)) continue;
    w.fillStyle = '#8d6b4277'; w.beginPath(); w.arc(x, y, 3.2, 0, Math.PI * 2); w.fill();
  }
  w.setLineDash([3, 6]); w.strokeStyle = '#855d3230'; w.strokeRect(P.MIN, P.MIN, 600, 600); w.setLineDash([]);
  function drawStone(s, selected) {
    if (selected) {
      ctx.beginPath(); ctx.arc(s.x, s.y, P.RADIUS + 8, 0, Math.PI * 2);
      ctx.strokeStyle = '#287557'; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.shadowColor = '#49381965'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 5;
    const g = ctx.createRadialGradient(s.x - 7, s.y - 9, 1, s.x, s.y, P.RADIUS + 1);
    if (s.team === 0) { g.addColorStop(0, '#647067'); g.addColorStop(.45, '#344139'); g.addColorStop(1, '#17251e'); }
    else { g.addColorStop(0, '#fffef6'); g.addColorStop(.6, '#f4f1e4'); g.addColorStop(1, '#d3d0c1'); }
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, P.RADIUS, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowOffsetY = 0;
    ctx.strokeStyle = s.team === 0 ? '#0e201b55' : '#a8a58d55'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = s.team === 0 ? '#ffffff0b' : '#ffffff77';
    ctx.beginPath(); ctx.ellipse(s.x - 5, s.y - 9, 7, 3, -.4, 0, Math.PI * 2); ctx.fill();
  }
  function drawCue() {
    if (!cue || cue.selectOnly) return;
    const s = stones.find(s => s.id === cue.id && s.alive); if (!s) return;
    const ux = Math.cos(cue.angle), uy = Math.sin(cue.angle), fraction = cue.speed / P.MAX_SPEED;
    const length = 48 + fraction * 140;
    ctx.save(); ctx.strokeStyle = cue.ai ? '#ad754bd0' : '#287557dd'; ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 2; ctx.setLineDash([5, 7]); ctx.beginPath();
    ctx.moveTo(s.x + ux * 29, s.y + uy * 29); ctx.lineTo(s.x + ux * length, s.y + uy * length); ctx.stroke(); ctx.setLineDash([]);
    const x = s.x + ux * length, y = s.y + uy * length;
    ctx.beginPath(); ctx.moveTo(x + ux * 7, y + uy * 7); ctx.lineTo(x - ux * 6 - uy * 5, y - uy * 6 + ux * 5);
    ctx.lineTo(x - ux * 6 + uy * 5, y - uy * 6 - ux * 5); ctx.closePath(); ctx.fill();
    if (!cue.ai && fraction > .03) {
      const bx = s.x - ux * fraction * 130, by = s.y - uy * fraction * 130;
      ctx.globalAlpha = .35; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(s.x - ux * 25, s.y - uy * 25); ctx.lineTo(bx, by); ctx.stroke();
      ctx.beginPath(); ctx.arc(bx, by, P.RADIUS, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  function draw(dt) {
    ctx.clearRect(0, 0, 720, 720); ctx.save();
    if (shake > .1) { ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake); shake *= Math.exp(-16 * dt); }
    ctx.drawImage(wood, 0, 0); drawCue();
    for (const s of stones) if (s.alive) drawStone(s, cue?.id === s.id);
    for (const p of particles) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife); ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    particles = particles.filter(p => p.life > 0); ctx.restore();
  }
  function frame(time) {
    const dt = lastTime ? Math.min(.05, (time - lastTime) / 1000) : 0; lastTime = time;
    if (phase === 'moving') {
      accumulator += dt;
      while (accumulator >= P.STEP && phase === 'moving') {
        const moving = P.step(stones, P.STEP, event); accumulator -= P.STEP;
        resting = moving ? 0 : resting + P.STEP;
        if (resting > .18) finish();
      }
    }
    draw(dt); requestAnimationFrame(frame);
  }
  // Match the backing buffer to the display without changing world coordinates.
  function resize() {
    const size = Math.round(canvas.getBoundingClientRect().width * Math.min(devicePixelRatio || 1, 2));
    if (!size) return;
    canvas.width = canvas.height = size; ctx.setTransform(size / 720, 0, 0, size / 720, 0, 0);
  }
  new ResizeObserver(resize).observe(canvas);
  syncSound(); reset(); resize(); requestAnimationFrame(frame);
})();
