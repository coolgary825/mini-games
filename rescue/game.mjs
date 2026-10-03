import { PETS, FAMILY, TOOLS, LEVELS, solutionSlots } from './data.mjs';
import { createGame, placeTool, remaining, undo, step } from './engine.mjs';
import { icon, petArt, petPortrait, childPortrait, scenery, terrainArt, toolArt } from './art.mjs';

const $ = id => document.getElementById(id);
const STORAGE_KEY = 'our-little-rescue-v1';
let saved = { completed: [], lastLevel: 0, muted: true };
try {
  const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (raw && typeof raw === 'object') saved = {
    completed: Array.isArray(raw.completed) ? [...new Set(raw.completed.filter(n => Number.isInteger(n) && n >= 0 && n < LEVELS.length))] : [],
    lastLevel: Number.isInteger(raw.lastLevel) && LEVELS[raw.lastLevel] ? raw.lastLevel : 0,
    muted: typeof raw.muted === 'boolean' ? raw.muted : true,
  };
} catch { /* Private browsing or corrupt storage: the game still works. */ }
let game, selected, follow = true, lastFrame = 0, accumulator = 0, toastTimer, audio, helpWasPlaying = false;
let particles = [], lastRecoverNotice = -10;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
function persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch {} }
function decorate(root = document) { root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); }); }
function notify(message) {
  $('toast').textContent = message; $('toast').classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3300);
}
function enableAudio() {
  if (saved.muted) return;
  try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); audio.resume().catch(() => {}); } catch {}
}
function chime(kind = 'place') {
  if (saved.muted || !audio || audio.state !== 'running') return;
  const notes = kind === 'complete' ? [523.25,659.25,783.99,1046.5] : kind === 'saved' ? [659.25,783.99,1046.5] : kind === 'bounce' ? [392,587.33] : [523.25,659.25];
  notes.forEach((frequency,i) => {
    const oscillator = audio.createOscillator(), gain = audio.createGain(), t = audio.currentTime + i*.1;
    oscillator.type = 'sine'; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0,t); gain.gain.linearRampToValueAtTime(.065,t+.02); gain.gain.exponentialRampToValueAtTime(.001,t+.38);
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(t); oscillator.stop(t+.4);
  });
}
function soundButton() {
  $('sound').innerHTML = icon(saved.muted ? 'muted' : 'sound');
  $('sound').setAttribute('aria-label', saved.muted ? '소리 켜기' : '소리 끄기');
  $('sound').title = saved.muted ? '소리 켜기' : '소리 끄기';
  $('sound').setAttribute('aria-pressed', String(!saved.muted));
}
function renderLevels() {
  $('level-list').innerHTML = LEVELS.map((level,i) => `<button class="level-item ${i === game.index ? 'active' : ''} ${saved.completed.includes(i) ? 'completed' : ''}" data-level="${i}" aria-label="${i+1}단계 ${level.title}${saved.completed.includes(i)?', 구조 완료':''}" ${i===game.index?'aria-current="step"':''}><span class="level-index">${saved.completed.includes(i) ? icon('check') : String(i+1).padStart(2,'0')}</span><span><strong>${level.title}</strong><small>${level.lesson || (i === 0 ? '다리 놓기' : i === 1 ? '방향 바꾸기' : i === 2 ? '푹신하게 내려오기' : i === 3 ? '함께 건너가기' : '온 가족의 모험')}</small></span><span class="level-arrow">›</span></button>`).join('');
  $('journey-count').textContent = `${saved.completed.length} / ${LEVELS.length}`;
  $('journey-bar').style.width = `${saved.completed.length/LEVELS.length*100}%`;
}
function renderRoster() {
  $('pet-roster').innerHTML = Object.entries(PETS).map(([id,p]) => {
    const rescued = saved.completed.some(i => LEVELS[i].pets.includes(id));
    return `<div class="pet-card ${rescued?'saved':''}"><div class="pet-picture">${petPortrait(id)}</div><div><strong>${p.name}${rescued?' · ✓':''}</strong><small>${p.age}<span> · ${p.kitten?'아기 고양이':p.dog?'치와와':'고양이'}</span></small></div></div>`;
  }).join('');
}
function renderTools() {
  const visibleTools = Object.entries(TOOLS).filter(([type]) => !['stairs','dig'].includes(type) || game.index >= (type==='stairs'?5:6));
  $('tool-buttons').classList.toggle('expanded', visibleTools.length>3);
  $('tool-buttons').style.setProperty('--tool-count',visibleTools.length);
  $('tool-buttons').innerHTML = visibleTools.map(([type,t]) => {
    const count = remaining(game,type), unavailable = !game.level.supplies[type];
    return `<button data-tool="${type}" class="tool-button ${selected===type?'selected':''} ${unavailable?'disabled-tool':''}" ${unavailable?'disabled':''} aria-pressed="${selected===type}" aria-label="${t.verb}, ${count}개 남음${unavailable?', 이번 단계에서는 사용하지 않아요':''}"><span class="tool-symbol">${icon(type)}</span><span><strong>${t.name}</strong><small>${unavailable?'다음 모험에서 만나요':t.description}</small></span><span class="tool-count">${count}</span></button>`;
  }).join('');
  renderSlots();
  $('undo').disabled = !game.history.length || game.status === 'complete';
}
function renderSlots() {
  $('slots').innerHTML = game.level.slots.map(slot => `<button class="slot ${game.placed[slot.id]?'installed-slot':selected===slot.type?'match':'mismatch'}" data-slot="${slot.id}" style="left:${slot.x/9.6}%;top:${(slot.y-12)/5.4}%" aria-label="${TOOLS[slot.type].verb} 위치${game.placed[slot.id]?', 설치 완료':''}" ${game.placed[slot.id]?'disabled tabindex="-1"':''}>${icon(slot.type)}<span>${slot.type==='dig'?'바닥 뚫기':TOOLS[slot.type].name+' 놓기'}</span></button>`).join('');
  $('terrain-layer').innerHTML = terrainArt(game.level,game.placed);
  $('installed-layer').innerHTML = game.level.slots.filter(s => game.placed[s.id]).map(toolArt).join('');
}
function setGuide(text = game.level.tip || game.level.hint) { $('guide-text').textContent = text; }
function hud() {
  $('rescue-count').textContent = `${game.rescued} / ${game.pets.length}`;
  const playing = game.status === 'playing';
  $('play').innerHTML = `${icon(playing?'pause':game.status==='complete'?'check':'play')}<span id="play-label">${playing?'잠깐 멈춤':game.status==='complete'?'구조 성공!':game.status==='paused'?'계속 가자!':'출발!'}</span>`;
  $('play').disabled = game.status === 'complete';
  $('scene-status').textContent = playing ? '친구들이 걷고 있어요' : game.status === 'complete' ? '모두 집에 도착했어요' : game.status === 'paused' ? '잠깐 쉬는 중이에요' : '길을 준비해요';
  $('scene-world').classList.toggle('game-paused', !playing);
  $('speed').textContent = `${game.speed}×`;
  $('speed').setAttribute('aria-label', `이동 속도 ${game.speed}배. 누르면 ${game.speed===1?2:1}배`);
}
function centerOn(x, smooth = true) {
  const viewport = $('scene-viewport'), width = $('scene-world').clientWidth;
  if (width <= viewport.clientWidth) return;
  viewport.scrollTo({ left: x/960*width-viewport.clientWidth/2, behavior: smooth && !reducedMotion ? 'smooth' : 'instant' });
}
function setFollow(value) {
  follow = value; $('follow').setAttribute('aria-pressed',String(follow));
  $('follow').textContent = follow ? '따라가는 중 ✓' : '동물 따라가기';
}
function loadLevel(index) {
  clearTimeout(toastTimer); $('toast').classList.remove('show');
  game = createGame(index); particles = []; accumulator = 0; lastRecoverNotice = -10;
  selected = index===5?'stairs':Object.keys(TOOLS).find(type => game.level.supplies[type]>0);
  saved.lastLevel = index; persist();
  const l=game.level;
  $('level-number').textContent = `STAGE ${String(l.id).padStart(2,'0')}`;
  $('level-title').textContent = l.title; $('level-place').textContent = l.place;
  $('level-caption').textContent = l.subtitle;
  $('scene').setAttribute('aria-label', `${l.title}. ${l.pets.map(id=>PETS[id].name).join(', ')}를 우리 집으로 안내해요.`);
  $('scene').innerHTML = scenery(l);
  $('animals-layer').innerHTML = game.pets.map((p,i) => `<g id="animal-${i}" class="pet-waiting"><g class="pet-body">${petArt(p.id,`scene-${i}`)}</g><text class="pet-name" y="22">${PETS[p.id].name}</text></g>`).join('');
  $('guide-avatar').innerHTML = childPortrait(l.helper);
  $('guide-name').textContent = `${FAMILY[l.helper].name}의 한마디`;
  $('start-label').hidden = false;
  $('start-label').textContent = l.pets.length===1 ? `${PETS[l.pets[0]].name}, 준비!` : '우리 모두 준비!';
  $('start-label').style.left = `${l.spawn.x/9.6}%`;
  $('start-label').style.top = `${(l.spawn.y+26)/5.4}%`;
  setGuide(); renderLevels(); renderTools(); renderRoster(); hud(); drawPets();
  setFollow(true); centerOn(l.spawn.x,false);
  document.querySelector('.level-item.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
function selectTool(type) {
  if (!game.level.supplies[type] || game.status==='complete') return;
  selected = type; renderTools();
  const slot = game.level.slots.find(s=>s.type===type&&!game.placed[s.id]);
  if (slot) { if(game.status==='playing') setFollow(false); centerOn(slot.x); }
  setGuide(remaining(game,type) ? `${TOOLS[type].name}를 골랐어! 지도에서 같은 모양의 점선을 눌러 줘.` : `${TOOLS[type].name}를 모두 놓았어. 되돌리기를 누르면 다시 놓을 수 있어.`);
}
function install(slotId) {
  enableAudio();
  const result = placeTool(game,slotId,selected);
  if (!result.ok) {
    if(result.reason==='mismatch') {
      const slot = game.level.slots.find(s=>s.id===slotId);
      notify(`여기에는 ${TOOLS[slot.type].name}가 필요해요. 가방에서 골라 주세요.`);
    } else if(result.reason==='empty') notify('도구를 모두 썼어요. 되돌리기로 다시 놓을 수 있어요.');
    return;
  }
  chime();
  const slot = game.level.slots.find(s=>s.id===slotId);
  burst(slot.x,slot.y-20,'#d1bc73',9);
  renderTools();
  const allPlaced = solutionSlots(game.level).every(s=>game.placed[s.id]);
  if(allPlaced) { setGuide(game.status==='ready' ? '안전한 길이 완성됐어! 이제 출발을 눌러서 함께 집으로 가자.' : '좋아, 길이 완성됐어! 친구들이 집에 도착할 때까지 함께 지켜보자.'); notify('좋아! 안전한 길이 완성됐어요.'); }
  else { setGuide(selected==='dig'?'바닥이 열렸어! 아래쪽에 안전한 길이 있는지 살펴보자.':`${TOOLS[selected].name} 설치 완료! 다른 점선에도 필요한 도구를 놓아 줘.`); }
  if(remaining(game,selected)===0) {
    const next = Object.keys(TOOLS).find(type => remaining(game,type)>0);
    if(next) { selected = next; renderTools(); }
  }
}
function togglePlay() {
  if(game.status==='complete') return;
  enableAudio();
  game.status = game.status==='playing'?'paused':'playing';
  if(game.status==='playing') { setFollow(true); $('start-label').hidden = true; if(game.time===0) chime(); }
  hud();
}
function undoPlacement() {
  if(undo(game)) { renderTools(); setGuide('괜찮아, 천천히 다시 놓아 보자.'); notify('마지막 도구를 가방에 넣었어요.'); }
}
function burst(x,y,color,count=12) {
  if(reducedMotion) return;
  for(let i=0;i<count;i++) particles.push({ x,y,vx:(Math.random()-.5)*100,vy:-30-Math.random()*85,age:0,life:1.2+Math.random()*.5,color,size:2+Math.random()*3 });
}
function drawParticles(dt) {
  particles = particles.filter(p=>p.age<p.life);
  for(const p of particles) { p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=90*dt; }
  $('particles-layer').innerHTML = particles.map(p=>`<circle class="particle" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${p.size}" fill="${p.color}" opacity="${Math.max(0,1-p.age/p.life).toFixed(2)}"/>`).join('');
}
function drawPets() {
  game.pets.forEach((pet,i) => {
    const el = $(`animal-${i}`);
    const scale = PETS[pet.id].kitten ? .78 : .94;
    el.setAttribute('transform', `translate(${pet.x} ${pet.y})`);
    el.setAttribute('class',`pet-${pet.state}`);
    el.querySelector('.pet-body').setAttribute('transform',`scale(${scale*pet.dir} ${scale})`);
    el.querySelector('.pet-name').style.display = game.pets.length>1 && pet.state==='waiting' ? 'none' : '';
    el.style.opacity = pet.state==='waiting' && i>0 ? '0' : '';
  });
}
function completeLevel() {
  if(!saved.completed.includes(game.index)) saved.completed.push(game.index);
  persist(); renderLevels(); renderRoster(); hud(); renderTools(); chime('complete');
  const final = game.index === LEVELS.length-1;
  $('win-eyebrow').textContent = final?'HOME IS WHERE WE ARE TOGETHER':'A LITTLE HAPPY ENDING';
  $('win-title').textContent = final?'모두 함께라서, 우리 집!':`${game.level.pets.map(id=>PETS[id].name).join(' · ')} 구조 성공!`;
  $('win-copy').textContent = final?'준우, 은우, 리우와 다섯 친구가 모두 만났어요. 함께 만든 길이라서 더 따뜻해요.':`${game.level.place}의 모험을 무사히 마쳤어요. 작은 도움 하나가 따뜻한 귀가를 만들었어요.`;
  $('win-art').innerHTML = (final ? `<div class="celebration" style="display:flex;justify-content:center;width:100%">${FAMILY.map((_,i)=>childPortrait(i).replace('<svg ','<svg class="win-family" ')).join('')}</div>` : '') + game.level.pets.map(petPortrait).join('');
  $('next-level').innerHTML = `${final?'첫 모험 다시 하기':'다음 모험'} ${icon('arrow')}`;
  if(!$('win-dialog').open) $('win-dialog').showModal();
}
function eventsHandler(events) {
  for(const event of events) {
    if(event.type==='saved') { notify(`${PETS[event.id].name}, 무사히 도착했어요!`); burst(game.level.goal.x,game.level.goal.y-55,'#d3b874',20); chime('saved'); hud(); }
    if(event.type==='bounce') {
      burst(event.x,event.y,'#d5a3ae',10); chime('bounce');
      const body = $(`animal-${game.pets.findIndex(p=>p.id===event.id)}`).querySelector('.pet-art');
      body.classList.add('landing-bounce');
      body.addEventListener('animationend',()=>body.classList.remove('landing-bounce'),{once:true});
    }
    if(event.type==='recover' && game.time-lastRecoverNotice>4) { lastRecoverNotice=game.time;notify(`${PETS[event.id].name}는 괜찮아요! 출발점에서 다시 걸어올 거예요.`);setGuide('길이 아직 끊겨 있나 봐. 잠깐 멈추고 점선에 필요한 도구를 놓아 보자.'); }
    if(event.type==='blocked' && game.time-lastRecoverNotice>4) { lastRecoverNotice=game.time;notify('높은 턱 앞에서 기다리고 있어요. 계단으로 길을 이어 주세요.'); }
    if(event.type==='complete') completeLevel();
  }
}
function frame(timestamp) {
  const dt = Math.min((timestamp-(lastFrame||timestamp))/1000,.1); lastFrame=timestamp;
  if(game.status==='playing') {
    accumulator += dt;
    while(accumulator>=1/60) { eventsHandler(step(game,1/60)); accumulator-=1/60; }
    drawPets();
    if(follow) {
      const leading = game.pets.filter(p=>p.state!=='saved'&&p.state!=='waiting').sort((a,b)=>b.x-a.x)[0];
      if(leading) centerOn(leading.x,false);
    }
  } else accumulator=0;
  if(particles.length) drawParticles(dt);
  requestAnimationFrame(frame);
}
decorate();
$('family-faces').innerHTML = FAMILY.map((_,i)=>`<span>${childPortrait(i)}</span>`).join('');
soundButton(); loadLevel(saved.lastLevel);
$('tool-buttons').addEventListener('click', e => { const button=e.target.closest('[data-tool]'); if(button) selectTool(button.dataset.tool); });
$('slots').addEventListener('click',e=>{const button=e.target.closest('[data-slot]');if(button) install(button.dataset.slot);});
$('slots').addEventListener('pointerover',e=>{const button=e.target.closest('[data-slot]');if(button?.classList.contains('match'))button.classList.add('preview');});
$('slots').addEventListener('pointerout',e=>{e.target.closest('[data-slot]')?.classList.remove('preview');});
$('level-list').addEventListener('click',e=>{const button=e.target.closest('[data-level]');if(button)loadLevel(Number(button.dataset.level));});
$('play').addEventListener('click',togglePlay);
$('undo').addEventListener('click',undoPlacement);
$('restart').addEventListener('click',()=>{loadLevel(game.index);notify('처음부터 다시 준비해요.');});
$('speed').addEventListener('click',()=>{game.speed=game.speed===1?2:1;hud();});
$('sound').addEventListener('click',()=>{saved.muted=!saved.muted;persist();soundButton();enableAudio();chime();});
$('follow').addEventListener('click',()=>{setFollow(!follow);if(follow){const p=game.pets.find(p=>p.state!=='saved');if(p)centerOn(p.x);}});
$('hint').addEventListener('click',()=>{
  setGuide(game.level.hint);
  const wrong = game.level.slots.find(s=>s.decoy&&game.placed[s.id]);
  if(wrong) { setFollow(false);centerOn(wrong.x);notify('이 구멍 아래에는 안전한 길이 없어요. 되돌리기로 바닥을 복구해 주세요.');return; }
  const slot=solutionSlots(game.level).find(s=>!game.placed[s.id]);
  if(slot) { selected=slot.type;renderTools();setFollow(false);centerOn(slot.x);notify(slot.type==='dig'?'쿠션 위쪽의 안전한 바닥을 뚫어 주세요.':`반짝이는 곳에 ${TOOLS[slot.type].name}를 놓아 주세요.`); }
  else notify(game.status==='ready'?'길이 완성됐어요. 출발을 눌러 주세요!':'길이 완성됐어요. 함께 집으로 가요!');
});
$('help').addEventListener('click',()=>{helpWasPlaying=game.status==='playing';if(helpWasPlaying){game.status='paused';hud();}$('help-dialog').showModal();});
function closeHelp(){ $('help-dialog').close(); }
$('close-help').addEventListener('click',closeHelp);$('help-ready').addEventListener('click',closeHelp);
$('help-dialog').addEventListener('close',()=>{if(helpWasPlaying&&game.status==='paused'){game.status='playing';hud();}helpWasPlaying=false;});
$('replay').addEventListener('click',()=>{$('win-dialog').close();loadLevel(game.index);});
$('next-level').addEventListener('click',()=>{$('win-dialog').close();loadLevel((game.index+1)%LEVELS.length);});
$('close-win').addEventListener('click',()=>$('win-dialog').close());
let pointerStart;
$('scene-viewport').addEventListener('pointerdown',e=>{pointerStart=e.clientX;});
$('scene-viewport').addEventListener('pointermove',e=>{if(pointerStart!==undefined&&Math.abs(e.clientX-pointerStart)>12)setFollow(false);});
window.addEventListener('pointerup',()=>{pointerStart=undefined;});
$('scene-viewport').addEventListener('wheel',()=>setFollow(false),{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.status==='playing'){game.status='paused';hud();}});
document.addEventListener('keydown',e=>{
  if($('help-dialog').open||$('win-dialog').open||e.target.matches('input,textarea,select'))return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undoPlacement();return;}
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.code==='Space'&&!e.target.closest('button,a')){e.preventDefault();togglePlay();}
  const type=Object.keys(TOOLS).find(type=>TOOLS[type].key===e.key);if(type)selectTool(type);
});
requestAnimationFrame(frame);
