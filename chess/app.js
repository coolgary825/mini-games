import {Chess,START,NAMES,LEVELS,DEFAULT_SETTINGS,uci,moveFromUci,outcome,flagOutcome,restoreGame,positionAt,capturedMaterial,materialScore,safeSettings,validatePlayablePosition} from './domain.js';
import {ChessEngine} from './engine.js';
import {PUZZLES} from './puzzles.js';

const $=id=>document.getElementById(id);
const profiles=['준우','은우','리우','아빠','손님'];
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
let storageWarning=false;
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{if(!storageWarning){storageWarning=true;toast('저장 공간을 사용할 수 없어 이번 대국은 자동 저장되지 않아요.');}}}
let profile=read('junwoo-chess-profile','준우');if(!profiles.includes(profile))profile='준우';
let settings=safeSettings(read('junwoo-chess-settings',{}));
let game=new Chess(),config={mode:'ai',level:3,human:'w',time:'0',puzzle:0};
let selected=null,flipped=false,review=null,result=null,paused=false,busy=false,assisted=false,imported=false;
let clocks={w:0,b:0},clockHistory=[],increment=0,started=false,lastTick=Date.now(),lastSave=0;
let engine=null,generation=0,hint=null,toastTimer=null,promotionPending=false;
let stats=readStats(),audioContext=null,focusSquare='e2';
let board3d=null,threeLoading=null,animating=false,endModalTimer=null;
function readStats(){const raw=read('junwoo-chess-stats-'+profile,{});return {wins:Math.max(0,Number(raw.wins)||0),losses:Math.max(0,Number(raw.losses)||0),draws:Math.max(0,Number(raw.draws)||0),puzzles:Array.isArray(raw.puzzles)?raw.puzzles.filter(x=>PUZZLES.some(p=>p.id===x)):[]};}
function saveStats(){write('junwoo-chess-stats-'+profile,stats);renderStats();}
function save(){
  const history=game.history({verbose:true});
  write('junwoo-chess-game-'+profile,{version:1,start:history[0]?.before||game.fen(),moves:game.history(),config,clocks,clockHistory,increment,started,paused,flipped,result,assisted,imported});
}
function saveSettings(){write('junwoo-chess-settings',settings);}
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3600);}
function invalidate(){generation++;clearTimeout(endModalTimer);engine?.dispose();engine=null;board3d?.cancel();animating=false;busy=false;hint=null;selected=null;}
function getEngine(){
  if(!engine)engine=new ChessEngine(state=>{
    if(state==='loading')$('engineState').textContent='AI를 준비하고 있어요. 첫 실행에는 잠시 걸릴 수 있어요.';
    if(state==='ready')$('engineState').textContent='Stockfish 준비 완료 · 대국 자동 저장 중';
    if(state==='error')$('engineState').textContent='AI 연결을 다시 시도하거나 둘이 두기로 즐겨 보세요.';
  });
  return engine;
}
function loadSaved(){
  const saved=read('junwoo-chess-game-'+profile,null);
  if(!saved)return false;
  try{
    const loaded=restoreGame(saved),c=saved.config;
    if(!c||!['ai','local','puzzle'].includes(c.mode)||!['w','b'].includes(c.human)||!Number.isInteger(c.level)||!LEVELS[c.level]||!['0','180:2','300:3','600:5','900:10'].includes(c.time))throw Error('설정 오류');
    if(!Number.isInteger(c.puzzle)||!PUZZLES[c.puzzle])throw Error('퍼즐 오류');
    if(!saved.clocks||!['w','b'].every(k=>Number.isFinite(saved.clocks[k])&&saved.clocks[k]>=0))throw Error('시계 오류');
    const expectedIncrement=Number(c.time.split(':')[1]||0)*1000;
    if(saved.increment!==expectedIncrement||!Array.isArray(saved.clockHistory)||saved.clockHistory.length!==loaded.history().length||saved.clockHistory.some(v=>!v||!['w','b'].every(k=>Number.isFinite(v[k])&&v[k]>=0)))throw Error('기록 오류');
    game=loaded;config={...c};clocks={...saved.clocks};clockHistory=saved.clockHistory;increment=expectedIncrement;started=!!saved.started;flipped=!!saved.flipped;
    result=saved.result&&typeof saved.result.reason==='string'&&[null,'w','b'].includes(saved.result.winner)?saved.result:outcome(game);
    assisted=!!saved.assisted;imported=!!saved.imported;paused=!result;review=null;
    settings.mode=config.mode;settings.level=config.level;settings.side=config.human;settings.time=config.time;
    $('puzzleSelect').value=String(config.puzzle);
    return true;
  }catch{toast('저장된 대국을 읽지 못해 새 체스판을 열었어요.');return false;}
}
function newGame(){
  invalidate();closeModal();
  const human=settings.side==='random'?(Math.random()<.5?'w':'b'):settings.side;
  config={mode:settings.mode,level:settings.level,human,time:settings.mode==='puzzle'?'0':settings.time,puzzle:Number($('puzzleSelect').value)||0};
  game=new Chess(config.mode==='puzzle'?PUZZLES[config.puzzle].fen:START);
  if(config.mode==='puzzle')config.human=game.turn();
  const seconds=Number(config.time.split(':')[0]);increment=Number(config.time.split(':')[1]||0)*1000;
  clocks={w:seconds*1000,b:seconds*1000};clockHistory=[];started=false;paused=false;result=null;review=null;assisted=false;imported=false;flipped=config.human==='b';lastTick=Date.now();
  setCoach(config.mode==='puzzle'?'체크메이트 퍼즐':'오늘의 체스 코치',config.mode==='puzzle'?'한 수로 체크메이트! 기물을 누르고 도착할 칸을 선택하세요.':'중앙을 차지하고, 나이트와 비숍을 먼저 꺼내 보세요.');
  $('engineState').textContent='대국은 이 기기에 자동 저장돼요.';
  save();render();scheduleAI();
}
function askNew(){
  if(!result&&game.history().length){confirmAction('새 대국을 시작할까요?','지금 대국의 자동 저장은 새 대국으로 바뀌어요. 보관하려면 먼저 PGN 저장을 눌러 주세요.','새 대국 시작',newGame);}
  else newGame();
}
function shownGame(){return review===null?game:positionAt(game,review);}
function squareOrder(){const files=flipped?'hgfedcba':'abcdefgh',ranks=flipped?'12345678':'87654321';return [...ranks].flatMap(r=>[...files].map(f=>f+r));}
function pieceImage(piece){const img=document.createElement('img');img.src=`pieces/${piece.color}${piece.type.toUpperCase()}.svg`;img.alt='';img.className='piece';img.draggable=false;return img;}
function renderBoard(){
  const g=shownGame(),legal=selected&&review===null?g.moves({square:selected,verbose:true}):[];
  const history=game.history({verbose:true});const ply=review===null?history.length:review;const last=ply?history[ply-1]:null;
  const order=squareOrder(),fragment=document.createDocumentFragment();
  const active=document.activeElement?.dataset?.square;
  order.forEach((sq,index)=>{
    const piece=g.get(sq),button=document.createElement('button');
    button.type='button';button.dataset.square=sq;button.className='square'+((index+Math.floor(index/8))%2?' dark':'');
    button.tabIndex=sq===focusSquare?0:-1;
    button.setAttribute('aria-label',`${sq}${piece?' '+(piece.color==='w'?'백':'흑')+' '+NAMES[piece.type]:' 빈 칸'}${legal.some(m=>m.to===sq)?' · 이동 가능':''}`);
    button.setAttribute('aria-pressed',String(selected===sq));
    if(piece){button.classList.add('occupied');button.append(pieceImage(piece));}
    if(last&&(last.from===sq||last.to===sq))button.classList.add('last');
    if(selected===sq)button.classList.add('selected');
    if(settings.legal&&legal.some(m=>m.to===sq))button.classList.add('legal');
    if(piece?.type==='k'&&piece.color===g.turn()&&g.isCheck())button.classList.add('check');
    if(index%8===0){const span=document.createElement('span');span.className='rank';span.textContent=sq[1];button.append(span);}
    if(index>=56){const span=document.createElement('span');span.className='file';span.textContent=sq[0];button.append(span);}
    fragment.append(button);
  });
  $('board').replaceChildren(fragment);
  if(active)$('board').querySelector(`[data-square="${active}"]`)?.focus({preventScroll:true});
  const arrow=$('hintArrow');arrow.style.opacity='0';
  if(hint&&review===null){const a=order.indexOf(hint.from),b=order.indexOf(hint.to);arrow.setAttribute('x1',(a%8)*100+50);arrow.setAttribute('y1',Math.floor(a/8)*100+50);arrow.setAttribute('x2',(b%8)*100+50);arrow.setAttribute('y2',Math.floor(b/8)*100+50);arrow.style.opacity='.85';}
  sync3D();
}
function playerName(color){
  if(config.mode==='local')return color==='w'?profile+' · 백':'친구 · 흑';
  if(config.mode==='puzzle')return color===config.human?profile:'퍼즐의 상대';
  return color===config.human?profile:'컴퓨터';
}
function sync3D(){
  if(!board3d)return;
  const g=shownGame(),history=game.history({verbose:true}),ply=review??history.length;
  board3d.sync(g,{selected,legal:settings.legal&&selected&&review===null?g.moves({square:selected,verbose:true}):[],last:ply?history[ply-1]:null,hint:review===null?hint:null,check:g.isCheck(),flipped,theme:settings.theme});
}
async function setView(view){
  settings.view=view;saveSettings();
  if(view==='3d'&&!board3d){
    $('viewHint').textContent='3D 체스판을 준비하고 있어요…';
    try{
      threeLoading??=import('./board3d.js');
      const {Board3D}=await threeLoading;
      if(!board3d)board3d=new Board3D($('threeHost'),clickSquare,()=>{settings.view='2d';board3d?.dispose();board3d=null;setView('2d');toast('3D 화면을 사용할 수 없어 2D 체스판으로 전환했어요.');});
    }catch{settings.view='2d';$('threeHost').replaceChildren();toast('이 기기에서는 3D를 지원하지 않아 2D로 열었어요.');}
  }
  const enabled=settings.view==='3d'&&!!board3d;
  board3d?.setEnabled(enabled);document.querySelector('.board-wrap').classList.toggle('is-3d',enabled);
  $('view3dBtn').classList.toggle('active',enabled);$('view2dBtn').classList.toggle('active',!enabled);$('view3dBtn').setAttribute('aria-pressed',String(enabled));$('view2dBtn').setAttribute('aria-pressed',String(!enabled));
  $('cameraBtn').hidden=!enabled;$('viewHint').textContent=enabled?'드래그로 회전 · 두 손가락으로 확대':'기물을 누르고 이동할 칸을 선택하세요';sync3D();saveSettings();
}
function renderPlayers(){
  const bottom=flipped?'b':'w',top=bottom==='w'?'b':'w';
  for(const [where,color] of [['top',top],['bottom',bottom]]){
    $(where+'Name').textContent=playerName(color);
    $(where+'Detail').textContent=(color==='w'?'백':'흑')+(config.mode==='ai'&&color!==config.human?' · '+LEVELS[config.level].name:config.mode==='puzzle'?' · 체크메이트 연습':config.mode==='local'?' · 같은 화면에서 번갈아 두기':assisted?' · 도움받으며 연습 중':' · 즐거운 한 수');
  }
  renderClocks();
}
function clockText(ms){if(!Number(config.time.split(':')[0]))return '∞';const s=Math.ceil(Math.max(0,ms)/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
function renderClocks(){for(const [where,color] of [['top',flipped?'w':'b'],['bottom',flipped?'b':'w']]){const el=$(where+'Clock');el.textContent=clockText(clocks[color]);el.classList.toggle('active',!result&&!paused&&review===null&&game.turn()===color);el.classList.toggle('low',!!Number(config.time.split(':')[0])&&clocks[color]<30000&&!result);}}
function renderHistory(){
  const history=game.history({verbose:true}),list=$('moveList'),atBottom=list.scrollHeight-list.scrollTop-list.clientHeight<35;
  const fragment=document.createDocumentFragment();
  const rows=[];
  history.forEach((move,index)=>{
    const fullmove=Number(move.before.split(' ')[5]);
    let row=rows[rows.length-1];
    if(!row||row.number!==fullmove){row={number:fullmove,w:null,b:null};rows.push(row);}
    row[move.color]={san:move.san,ply:index+1};
  });
  rows.forEach(row=>{
    const div=document.createElement('div');div.className='move-row';const n=document.createElement('span');n.textContent=row.number+'.';div.append(n);
    for(const color of ['w','b']){const m=row[color];if(!m){const dash=document.createElement('span');dash.textContent='…';div.append(dash);continue;}const button=document.createElement('button');button.textContent=m.san;button.dataset.ply=m.ply;button.title=`${row.number}수 ${color==='w'?'백':'흑'} ${m.san} 다시 보기`;if(m.ply===(review??history.length))button.className='current';div.append(button);}
    fragment.append(div);
  });
  if(!history.length){const empty=document.createElement('p');empty.className='empty';empty.textContent=config.mode==='puzzle'?'체크메이트를 한 수로 찾아보세요.':'첫 수를 두어 이야기를 시작하세요.';fragment.append(empty);}
  list.replaceChildren(fragment);if(atBottom&&review===null)list.scrollTop=list.scrollHeight;
  $('moveCount').textContent=history.length+'차례';$('reviewLabel').textContent=review===null?'실전':`${review} / ${history.length}`;
  const current=review??history.length;
  $('firstBtn').disabled=$('prevBtn').disabled=current===0;
  $('lastBtn').disabled=$('nextBtn').disabled=review===null;
  const captured=capturedMaterial(shownHistoryGame());$('captured').replaceChildren();
  if(!captured.w.length&&!captured.b.length)$('captured').textContent='아직 잡힌 기물이 없어요.';
  else for(const color of ['w','b']){const span=document.createElement('span');span.textContent=(color==='w'?'백':'흑')+' ';for(const type of captured[color]){const img=pieceImage({type,color:color==='w'?'b':'w'});span.append(img);}$('captured').append(span);}
}
function shownHistoryGame(){if(review===null)return game;const history=game.history({verbose:true}),g=new Chess(history[0]?.before||game.fen());history.slice(0,review).forEach(m=>g.move(uci(m)));return g;}
function renderStats(){$('stats').innerHTML=`<span>승 <strong>${stats.wins}</strong></span><span>패 <strong>${stats.losses}</strong></span><span>무 <strong>${stats.draws}</strong></span><span>퍼즐 <strong>${new Set(stats.puzzles).size}/${PUZZLES.length}</strong></span>`;$('stats').title='AI 대전 결과 · 힌트와 무르기를 사용한 연습 및 불러온 기보는 전적 제외';}
function renderStatus(){
  let message;
  if(review!==null)message='지난 수를 보고 있어요 · ›| 로 실전 복귀';
  else if(result)message=(result.winner===null?'무승부':config.mode==='puzzle'?'퍼즐 성공!':playerName(result.winner)+' 승리')+' · '+result.reason;
  else if(paused)message='일시정지 · 계속 두기를 눌러 주세요';
  else if(animating)message='기물이 움직이고 있어요…';
  else if(busy)message=(game.turn()!==config.human&&config.mode==='ai'?'컴퓨터가 생각 중이에요…':'추천 수를 찾고 있어요…');
  else message=(config.mode==='puzzle'?'한 수 체크메이트! · ':'')+(game.turn()==='w'?'백':'흑')+'의 차례'+(game.isCheck()?' · 체크! 킹을 지켜 주세요':'');
  $('status').textContent=message;
  $('boardOverlay').hidden=!(paused&&review===null&&!result);
  $('pauseBtn').textContent=paused?'▶ 계속 두기':'Ⅱ 일시정지';
  $('pauseBtn').disabled=!!result||config.mode==='puzzle'||review!==null;
  $('undoBtn').disabled=!game.history().length||!!result||config.mode==='puzzle'||review!==null;
  $('hintBtn').disabled=!!result||busy||paused||review!==null||(config.mode==='ai'&&game.turn()!==config.human);
  $('resignBtn').disabled=!!result||config.mode==='puzzle'||review!==null;
  $('drawBtn').disabled=!!result||config.mode!=='local'||review!==null;
  $('drawBtn').title=config.mode==='local'?'두 사람이 동의하면 무승부로 끝내요':'AI 대전에서는 체스 규칙에 따라 무승부를 판정해요';
}
function setEvaluation(score=materialScore(shownGame()),label='기물',kind='cp'){
  $('evalText').textContent=kind==='mate'?'메이트 '+Math.abs(score)+'수':label+' '+(score>=0?'+':'')+(score/100).toFixed(1);
  const percent=kind==='mate'?(score>0?98:2):Math.min(95,Math.max(5,50+Math.tanh(score/700)*45));
  $('evalFill').style.height=percent+'%';$('evalRail').title='백 기준 · '+$('evalText').textContent;
}
function render(){renderBoard();renderPlayers();renderHistory();renderStats();renderStatus();setEvaluation();applyAppearance();}
function applyAppearance(){document.body.dataset.theme=settings.theme;document.querySelector('.coach').hidden=!settings.coach;$('legalToggle').checked=settings.legal;$('coachToggle').checked=settings.coach;$('animationToggle').checked=settings.animations;$('soundBtn').textContent=settings.sound?'♪ 소리 켜짐':'♪ 소리 꺼짐';$('soundBtn').setAttribute('aria-pressed',String(settings.sound));document.querySelectorAll('[data-theme]').forEach(b=>{if(b.tagName!=='BUTTON')return;b.classList.toggle('active',b.dataset.theme===settings.theme);b.setAttribute('aria-pressed',String(b.dataset.theme===settings.theme));});}
function setCoach(title,text){$('coachTitle').textContent=title;$('coachText').textContent=text;}
function coachMove(m){
  if(game.isCheckmate()){setCoach('체크메이트!', '킹이 공격받고 있고, 안전하게 피할 방법이 없어요. 멋진 대국이었어요!');return;}
  if(m.flags.includes('k')||m.flags.includes('q')){setCoach('킹을 안전하게!','캐슬링으로 킹을 피신시키고 룩을 중앙으로 꺼냈어요.');return;}
  if(m.promotion){setCoach('폰이 '+NAMES[m.promotion]+'으로 변신!','폰이 마지막 줄에 도착해 원하는 기물로 승급했어요.');return;}
  if(m.flags.includes('e')){setCoach('특별한 잡기, 앙파상','바로 전에 두 칸 움직인 폰을 지나온 칸에서 잡았어요. 이 기회는 한 차례뿐이에요.');return;}
  if(game.isCheck()){setCoach('체크! 킹이 위험해요.','킹을 옮기거나, 공격하는 기물을 잡거나, 중간을 막아야 해요.');return;}
  if(m.captured){setCoach(NAMES[m.piece]+'으로 '+NAMES[m.captured]+' 잡기','이제 내 기물도 안전한지 살펴보세요. 상대가 다시 잡을 수 있을까요?');return;}
  const tips=['중앙 네 칸 e4, d4, e5, d5를 차지하면 기물들이 활발하게 움직여요.','나이트는 L자로 움직여요. 한 번에 두 기물을 공격하는 포크를 찾아보세요.','한 기물만 계속 움직이기보다 나이트와 비숍을 골고루 꺼내 보세요.','수를 두기 전에 상대의 체크, 기물 잡기, 다음 위협을 살펴보세요.','룩은 폰이 없는 열린 세로줄에서 더 강해져요.','퀸은 강하지만 혼자 깊이 들어가면 공격받기 쉬워요.'];
  setCoach('다음 한 수를 위한 힌트',tips[Math.floor(game.history().length/2)%tips.length]);
}
function sound(type='move'){
  if(!settings.sound)return;
  try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();const now=audioContext.currentTime;const tones=type==='end'?[523,659,784]:type==='check'?[440,660]:type==='capture'?[220,330]:[480];tones.forEach((freq,i)=>{const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(.065,now+i*.09);gain.gain.exponentialRampToValueAtTime(.001,now+i*.09+.12);osc.connect(gain);gain.connect(audioContext.destination);osc.start(now+i*.09);osc.stop(now+i*.09+.13);});}catch{}
}
function settleClock(){
  const now=Date.now(),elapsed=Math.max(0,now-lastTick);lastTick=now;
  if(!started||paused||result||animating||review!==null||!Number(config.time.split(':')[0]))return;
  const color=game.turn();clocks[color]=Math.max(0,clocks[color]-elapsed);
  if(clocks[color]===0)finish(flagOutcome(game,color));
}
async function applyMove(move){
  settleClock();if(result||paused||review!==null)return;
  const before={...clocks};let made;try{made=game.move({from:move.from,to:move.to,promotion:move.promotion});}catch{return;}
  if(config.mode==='puzzle'&&!game.isCheckmate()){
    game.undo();selected=null;hint=null;renderBoard();sound('capture');setCoach('다시 생각해 볼까요?','그 수로는 아직 체크메이트가 아니에요. 상대 킹의 모든 탈출 칸을 막아 보세요.');toast('아직 메이트가 아니에요. 다시 도전!');return;
  }
  clockHistory.push(before);if(Number(config.time.split(':')[0]))clocks[made.color]+=increment;
  started=true;lastTick=Date.now();selected=null;hint=null;focusSquare=made.to;
  coachMove(made);sound(game.isCheck()?'check':made.captured?'capture':'move');
  const token=generation;animating=true;busy=true;
  const motion=board3d?board3d.animateMove(made,game,settings.animations):Promise.resolve();
  const end=outcome(game);
  if(end){finish(end,motion);return;}
  save();render();
  await motion;
  if(token!==generation)return;
  animating=false;busy=false;lastTick=Date.now();renderStatus();scheduleAI();
}
function clickSquare(sq){
  if(review!==null){toast('›| 버튼으로 현재 대국에 돌아온 뒤 두세요.');return;}
  if(result||paused||busy||promotionPending)return;
  if(config.mode==='ai'&&game.turn()!==config.human)return;
  focusSquare=sq;
  if(selected){const moves=game.moves({square:selected,verbose:true}).filter(m=>m.to===sq);if(moves.length){if(moves.some(m=>m.promotion)){choosePromotion(moves);return;}applyMove(moves[0]);return;}}
  const p=game.get(sq);selected=p?.color===game.turn()&&selected!==sq?sq:null;hint=null;renderBoard();
}
function choosePromotion(moves){
  promotionPending=true;showModal('어떤 기물로 승급할까요?', '<p>폰이 마지막 줄에 도착했어요. 원하는 기물을 선택하세요.</p><div class="promotion"></div>');
  const container=$('modalBody').querySelector('.promotion');
  for(const type of ['q','r','b','n']){const button=document.createElement('button');button.append(pieceImage({type,color:game.turn()}));const label=document.createElement('span');label.textContent=NAMES[type];button.append(label);button.onclick=()=>{const m=moves.find(m=>m.promotion===type);closeModal();if(m)applyMove(m);};container.append(button);}
}
async function scheduleAI(){
  if(config.mode!=='ai'||game.turn()===config.human||result||paused||review!==null||busy)return;
  const token=generation,fen=game.fen(),l=LEVELS[config.level];busy=true;renderStatus();
  try{
    let chosen,info;
    if(Math.random()<l.random){await new Promise(r=>setTimeout(r,350));const moves=game.moves({verbose:true});chosen=moves[Math.floor(Math.random()*moves.length)];}
    else {info=await getEngine().search(game,config.level);chosen=moveFromUci(game,info.move);}
    if(token!==generation||game.fen()!==fen||paused||result||review!==null)return;
    busy=false;if(!chosen)throw Error('AI가 수를 찾지 못했어요');
    const rootTurn=game.turn();applyMove(chosen);
    if(info?.score!==undefined)setEvaluation(info.score*(rootTurn==='w'?1:-1),'AI',info.kind);
  }catch(e){
    if(token!==generation)return;
    busy=false;paused=true;lastTick=Date.now();save();render();setCoach('AI를 다시 준비해 주세요.','계속 두기를 누르면 다시 시도해요. 인터넷 연결을 확인하거나 새 대국에서 둘이 두기를 선택할 수도 있어요.');toast('AI를 불러오지 못했어요. 계속 두기로 다시 시도해 주세요.');
    engine?.dispose();engine=null;
  }
}
async function requestHint(){
  if($('hintBtn').disabled)return;
  if(config.mode==='puzzle'){
    const p=PUZZLES[config.puzzle];let best;
    for(const move of game.moves({verbose:true})){game.move(move);const mate=game.isCheckmate();game.undo();if(mate){best=move;break;}}
    hint=best;setCoach('퍼즐 힌트',p.hint);renderBoard();return;
  }
  assisted=true;save();const token=generation,fen=game.fen(),turn=game.turn();busy=true;renderStatus();
  try{
    const info=await getEngine().search(game,7,true);
    if(token!==generation||fen!==game.fen()||paused||result||review!==null)return;
    hint=moveFromUci(game,info.move);busy=false;
    if(hint){setCoach('추천 수 · '+hint.san,`${NAMES[hint.piece]}을 ${hint.from}에서 ${hint.to}(으)로 옮겨 보세요.${hint.promotion?' '+NAMES[hint.promotion]+'으로 승급하세요.':''} 힌트를 사용한 대국은 전적에 포함되지 않아요.`);renderBoard();}
    if(info.score!==undefined)setEvaluation(info.score*(turn==='w'?1:-1),'AI',info.kind);
    renderPlayers();renderStatus();
  }catch{if(token!==generation)return;busy=false;renderStatus();toast('힌트를 준비하지 못했어요. 다시 시도해 주세요.');engine?.dispose();engine=null;}
}
function undo(){
  if($('undoBtn').disabled)return;
  settleClock();if(result)return;invalidate();assisted=true;
  do{const prev=clockHistory.pop();const m=game.undo();if(!m)break;if(prev)clocks={...prev};}while(config.mode==='ai'&&game.turn()!==config.human&&game.history().length);
  started=game.history().length>0;lastTick=Date.now();setCoach('한 번 더 생각할 기회','무르기를 사용한 대국은 연습으로 기록돼요. 이번에는 상대의 위협도 살펴보세요.');save();render();scheduleAI();
}
function togglePause(){
  if(result||review!==null)return;
  settleClock();if(result)return;paused=!paused;invalidate();lastTick=Date.now();save();render();if(!paused)scheduleAI();
}
let reviewWasPaused=false;
function goReview(ply){
  const count=game.history().length;if(!count)return;
  ply=Math.max(0,Math.min(count,ply));
  if(ply===count){review=null;paused=result?false:reviewWasPaused;lastTick=Date.now();render();save();scheduleAI();return;}
  if(review===null){settleClock();reviewWasPaused=paused;invalidate();}
  review=ply;selected=null;hint=null;render();
}
function finish(end,motion=Promise.resolve()){
  if(result)return;
  generation++;clearTimeout(endModalTimer);
  result=end;paused=false;review=null;engine?.dispose();engine=null;busy=false;selected=null;hint=null;
  if(config.mode==='puzzle'){
    const p=PUZZLES[config.puzzle];if(!stats.puzzles.includes(p.id))stats.puzzles.push(p.id);saveStats();setCoach('퍼즐 해결!',p.lesson);
  }else if(config.mode==='ai'&&!assisted&&!imported){if(end.winner===null)stats.draws++;else if(end.winner===config.human)stats.wins++;else stats.losses++;saveStats();}
  save();render();sound('end');
  const token=generation;
  motion.then(()=>{
  if(token!==generation)return;animating=false;board3d?.celebrate(end.winner,settings.animations);
  endModalTimer=setTimeout(()=>{
  if(token!==generation)return;
  const title=config.mode==='puzzle'?'체크메이트! 정답이에요.':end.winner===null?'멋진 대국, 무승부!':playerName(end.winner)+' 승리!';
  showModal(title,'<div class="result-icon">'+(end.winner===null?'½':'♔')+'</div><p class="result-summary" id="resultReason"></p><p class="result-summary" id="resultDetail"></p><div class="actions"><button id="reviewResult">체스판 살펴보기</button><button id="playAgain" class="primary"></button></div>');
  $('resultReason').textContent=end.reason;
  $('resultDetail').textContent=config.mode==='puzzle'?PUZZLES[config.puzzle].lesson:assisted||imported?'도움을 받거나 불러온 대국은 승패 전적에 포함되지 않아요.':'대국 기록을 눌러 결정적인 순간을 다시 살펴보세요.';
  $('reviewResult').onclick=closeModal;$('playAgain').textContent=config.mode==='puzzle'?'다음 퍼즐':'다시 두기';
  $('playAgain').onclick=()=>{if(config.mode==='puzzle'){$('puzzleSelect').value=String((config.puzzle+1)%PUZZLES.length);settings.mode='puzzle';renderSettings();}newGame();};
  },board3d?.enabled&&settings.animations&&!board3d.reduced?2200:0);
  });
}
function showModal(title,html){$('modalTitle').textContent=title;$('modalBody').innerHTML=html;if(!$('modal').open)$('modal').showModal();}
function closeModal(){promotionPending=false;$('modal').close();}
function confirmAction(title,description,label,action){showModal(title,'<p id="confirmText"></p><div class="actions"><button id="cancelAction">취소</button><button id="confirmAction" class="primary"></button></div>');$('confirmText').textContent=description;$('confirmAction').textContent=label;$('cancelAction').onclick=closeModal;$('confirmAction').onclick=()=>{closeModal();action();};}
function exportPGN(){
  const clone=restoreGame({version:1,start:game.history({verbose:true})[0]?.before||game.fen(),moves:game.history()});
  clone.header('Event',config.mode==='puzzle'?'Junwoo Chess Puzzle':'Junwoo Chess Club','White',playerName('w'),'Black',playerName('b'),'Date',new Date().toISOString().slice(0,10).replaceAll('-','.'),'Result',result?(result.winner===null?'1/2-1/2':result.winner==='w'?'1-0':'0-1'):'*');
  const blob=new Blob([clone.pgn({maxWidth:80})],{type:'application/x-chess-pgn;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`준우네체스-${new Date().toISOString().slice(0,10)}.pgn`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('대국 기록을 PGN 파일로 저장했어요.');
}
function showImport(){
  settleClock();if(!result&&review===null){paused=true;invalidate();save();render();}
  showModal('대국 / 체스판 불러오기','<p>PGN 기보 또는 FEN 위치를 붙여 넣으세요. 불러오면 현재 자동 저장을 바꾸고, 시간 제한 없는 2인 연습으로 열어요.</p><label>기보 또는 위치<textarea id="importText" spellcheck="false" placeholder="1. e4 e5 2. Nf3 Nc6 또는 FEN 위치"></textarea></label><label>PGN 파일 선택<input id="importFile" type="file" accept=".pgn,.txt"></label><p id="importError" role="alert"></p><div class="actions"><button id="cancelImport">취소</button><button id="doImport" class="primary">불러오기</button></div>');
  $('cancelImport').onclick=closeModal;
  $('importFile').onchange=async e=>{const file=e.target.files[0];if(file){if(file.size>100000){$('importError').textContent='100KB 이하의 기보 파일을 골라 주세요.';return;}$('importText').value=await file.text();}};
  $('doImport').onclick=()=>{
    try{
      const text=$('importText').value.trim();if(!text||text.length>100000)throw Error('기보 또는 위치를 입력해 주세요.');
      const next=new Chess();if(/^[rnbqkpRNBQKP1-8/]+\s[wb]\s/.test(text))next.load(text);else next.loadPgn(text);
      validatePlayablePosition(next);
      if(next.history().length>3000)throw Error('기보가 너무 길어요.');
      invalidate();game=next;config={mode:'local',level:3,human:'w',time:'0',puzzle:0};settings.mode='local';settings.time='0';clocks={w:0,b:0};clockHistory=game.history().map(()=>({w:0,b:0}));increment=0;started=!!game.history().length;result=outcome(game);paused=false;review=null;flipped=false;assisted=true;imported=true;lastTick=Date.now();closeModal();renderSettings();save();render();setCoach('기보를 불러왔어요.','기록을 눌러 복기하거나 두 사람이 번갈아 이어 둘 수 있어요.');
    }catch{$('importError').textContent='기보를 읽을 수 없어요. PGN 수순 또는 킹이 각각 하나 있는 올바른 FEN을 확인해 주세요.';}
  };
}
async function copyFEN(){const fen=shownGame().fen();try{await navigator.clipboard.writeText(fen);toast('체스판 위치(FEN)를 복사했어요.');}catch{showModal('체스판 위치 복사','<p>아래 내용을 선택해 복사하세요.</p><textarea id="fenCopy" readonly></textarea>');$('fenCopy').value=fen;$('fenCopy').select();}}
function renderSettings(){
  document.querySelectorAll('[data-mode]').forEach(button=>{const active=button.dataset.mode===settings.mode;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  $('matchSettings').hidden=settings.mode==='puzzle';$('puzzleSettings').hidden=settings.mode!=='puzzle';$('difficultyLabel').hidden=settings.mode==='local';$('side').disabled=settings.mode==='local';
  $('difficulty').value=String(settings.level);$('side').value=settings.side;$('time').value=settings.time;$('profile').value=profile;
  $('newBtn').firstChild.textContent=settings.mode==='puzzle'?'퍼즐 도전하기 ':'새 대국 시작 ';
  $('puzzleDescription').textContent=PUZZLES[Number($('puzzleSelect').value)||0].title+' · 한 수 메이트';applyAppearance();
}
function showHelp(){
  showModal('체스, 한 수씩 배워요','<p>목표는 상대 킹을 <b>체크메이트</b>하는 것! 내 기물을 누른 다음 이동할 칸을 누르세요. 백부터 번갈아 한 수씩 둡니다.</p><div id="pieceRules"></div><h3>꼭 알아둘 특별 규칙</h3><p><b>체크:</b> 킹이 공격받으면 반드시 막아야 해요. 킹을 잡는 수는 없어요.<br><b>캐슬링:</b> 아직 움직이지 않은 킹과 룩 사이가 비어 있고, 킹이 체크 중이거나 공격받는 칸을 지나지 않을 때 킹을 두 칸 옮겨요.<br><b>앙파상:</b> 바로 전에 두 칸 전진한 상대 폰이 내 폰 옆에 오면 지나온 칸으로 잡을 수 있어요.<br><b>승급:</b> 폰이 마지막 줄에 도착하면 퀸·룩·비숍·나이트를 선택해요.</p><h3>대국과 연습</h3><p>난이도와 시간은 <b>새 대국 시작</b>을 누를 때 적용돼요. 시간은 첫 수를 둔 뒤부터 흐르고, +초는 한 수를 둘 때마다 더해져요. 다른 창으로 이동하거나 기록을 복기할 때는 시계를 멈춰요.</p><p>스테일메이트, 같은 위치 3회 반복, 기물 부족, 50수 규칙은 자동 무승부예요. 시간 초과는 패배지만 상대에게 킹만 남거나 양쪽 기물이 부족하면 무승부로 처리해요. 이곳은 편하게 즐기는 캐주얼 체스예요.</p><p>힌트·무르기를 쓴 AI 대국과 불러온 기보는 전적에 포함하지 않아요. 전적, 퍼즐, 대국 저장은 선택한 플레이어별로 <b>이 기기</b>에 보관돼요. 8단계는 상대적인 난이도이며 공식 레이팅이 아니에요.</p><h3>키보드와 기록</h3><p>체스판에서 방향키로 칸 이동, Enter 또는 Space로 선택해요. <b>U</b> 무르기 · <b>H</b> 힌트 · <b>F</b> 뒤집기. 기보의 수를 누르면 그때 위치로 돌아가요. PGN은 대국 전체, FEN은 현재 체스판 위치예요.</p>');
  const rules={k:'한 칸씩 모든 방향. 공격받는 칸으로는 갈 수 없어요.',q:'가로·세로·대각선으로 원하는 만큼 움직여요.',r:'가로·세로로 원하는 만큼 움직여요.',b:'대각선으로 원하는 만큼 움직여요.',n:'두 칸과 한 칸, L자로 점프! 다른 기물을 뛰어넘어요.',p:'앞으로 한 칸, 첫 이동은 두 칸도 가능. 잡을 때는 앞 대각선 한 칸이에요.'};
  for(const [type,text] of Object.entries(rules)){const div=document.createElement('div');div.className='rules-piece';div.append(pieceImage({type,color:'w'}));const p=document.createElement('p');const strong=document.createElement('strong');strong.textContent=NAMES[type]+' · ';p.append(strong,document.createTextNode(text));div.append(p);$('pieceRules').append(div);}
}

$('board').onclick=e=>{const square=e.target.closest('[data-square]');if(square)clickSquare(square.dataset.square);};
$('board').onkeydown=e=>{const order=squareOrder(),index=order.indexOf(e.target.dataset.square),delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-8,ArrowDown:8}[e.key];if(index<0||delta===undefined)return;e.preventDefault();focusSquare=order[Math.max(0,Math.min(63,index+delta))];$('board').querySelectorAll('button').forEach(b=>b.tabIndex=b.dataset.square===focusSquare?0:-1);$('board').querySelector(`[data-square="${focusSquare}"]`).focus();};
document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||$('modal').open||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;const action={u:undo,h:requestHint,f:()=>{$('flipBtn').click();}}[e.key.toLowerCase()];if(action){e.preventDefault();action();}});
$('newBtn').onclick=askNew;$('undoBtn').onclick=undo;$('hintBtn').onclick=requestHint;$('pauseBtn').onclick=togglePause;$('resumeBtn').onclick=togglePause;
$('flipBtn').onclick=()=>{flipped=!flipped;save();renderBoard();renderPlayers();};
$('fullscreenBtn').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('이 기기에서는 홈 화면에 추가하면 더 넓게 볼 수 있어요.');}catch{toast('이 브라우저에서는 전체 화면을 지원하지 않아요.');}};
$('moveList').onclick=e=>{const b=e.target.closest('[data-ply]');if(b)goReview(Number(b.dataset.ply));};
$('firstBtn').onclick=()=>goReview(0);$('prevBtn').onclick=()=>goReview((review??game.history().length)-1);$('nextBtn').onclick=()=>goReview((review??game.history().length)+1);$('lastBtn').onclick=()=>goReview(game.history().length);
$('exportBtn').onclick=exportPGN;$('importBtn').onclick=showImport;$('fenBtn').onclick=copyFEN;
$('closeModal').onclick=closeModal;$('modal').addEventListener('cancel',()=>{promotionPending=false;});$('modal').addEventListener('close',()=>{promotionPending=false;});
$('resignBtn').onclick=()=>{const loser=config.mode==='ai'?config.human:game.turn();confirmAction('기권할까요?',playerName(loser)+'의 기권으로 대국을 마칠 수 있어요.','기권하기',()=>{settleClock();if(!result)finish({winner:loser==='w'?'b':'w',reason:'상대의 기권'});});};
$('drawBtn').onclick=()=>confirmAction('무승부에 동의하나요?','두 플레이어가 모두 동의하면 대국을 무승부로 마쳐요.','둘 다 동의해요',()=>{settleClock();if(!result)finish({winner:null,reason:'두 플레이어의 합의'});});
$('helpBtn').onclick=showHelp;$('creditsBtn').onclick=()=>showModal('오픈소스 안내','<p>체스 AI: <a href="https://github.com/nmrugg/stockfish.js/tree/93c994592dcf3b4b21052ab925e9b534df9c0918" target="_blank" rel="noopener">Stockfish.js 18.0.8 / Stockfish 18 Lite</a> · GPL-3.0<br>규칙 판정: <a href="https://github.com/jhlywa/chess.js/tree/v1.4.0" target="_blank" rel="noopener">chess.js 1.4.0</a> · BSD-2-Clause<br>체스 기물: Colin M. L. Burnett (cburnett), Lichess 배포 · GPL-2.0-or-later</p><p><a href="THIRD_PARTY.md">라이선스와 소스 코드 안내</a> · <a href="vendor/stockfish.COPYING.txt">GPL 전문</a></p><p>처음 실행할 때 AI 파일 약 7MB를 받아요. 한 번 준비되면 오프라인에서도 즐길 수 있어요.</p>');
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{settings.mode=b.dataset.mode;saveSettings();renderSettings();});
$('difficulty').onchange=e=>{settings.level=Number(e.target.value);saveSettings();};$('side').onchange=e=>{settings.side=e.target.value;saveSettings();};$('time').onchange=e=>{settings.time=e.target.value;saveSettings();};$('puzzleSelect').onchange=renderSettings;
document.querySelectorAll('button[data-theme]').forEach(b=>b.onclick=()=>{settings.theme=b.dataset.theme;saveSettings();applyAppearance();sync3D();});
$('soundBtn').onclick=()=>{settings.sound=!settings.sound;saveSettings();applyAppearance();if(settings.sound)sound();};
$('legalToggle').onchange=e=>{settings.legal=e.target.checked;saveSettings();renderBoard();};$('coachToggle').onchange=e=>{settings.coach=e.target.checked;saveSettings();applyAppearance();};
$('profile').onchange=e=>{settleClock();save();invalidate();profile=e.target.value;write('junwoo-chess-profile',profile);stats=readStats();if(!loadSaved())newGame();else{setCoach('어서 와요, '+profile+'!','저장된 대국을 불러왔어요. 계속 두기로 이어가세요.');render();}renderSettings();};
document.addEventListener('visibilitychange',()=>{if(document.hidden){settleClock();if(!result){if(review===null)paused=true;else reviewWasPaused=true;invalidate();save();renderStatus();}}});
window.addEventListener('pagehide',()=>{settleClock();save();});
setInterval(()=>{settleClock();renderClocks();if(started&&!paused&&!result&&review===null&&Date.now()-lastSave>3000){lastSave=Date.now();save();}},150);
PUZZLES.forEach((p,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=p.title;$('puzzleSelect').append(option);});
if(!loadSaved())newGame();else{render();setCoach('이어서 두기','지난 대국을 안전하게 저장해 뒀어요. 계속 두기를 누르면 이어서 시작해요.');}
renderSettings();
$('view3dBtn').onclick=()=>setView('3d');$('view2dBtn').onclick=()=>setView('2d');$('cameraBtn').onclick=()=>board3d?.resetCamera();
$('animationToggle').onchange=e=>{settings.animations=e.target.checked;saveSettings();};
$('animationInfoBtn').onclick=()=>showModal('말마다 다른 3D 동작','<p>말을 움직이거나 잡으면 각 말의 특징에 맞춰 움직여요. 승리하면 남은 말들이 함께 축하해요!</p><table class=animation-table><tr><th>말</th><th>이동</th><th>잡혔을 때</th><th>승리</th></tr><tr><td>폰</td><td>작은 두 번의 뜀</td><td>뒤집히며 쏙</td><td>통통 뛰기</td></tr><tr><td>나이트</td><td>높이 도약</td><td>공중 옆구르기</td><td>앞발 들기</td></tr><tr><td>비숍</td><td>회전 활공</td><td>회전하며 사라짐</td><td>공중 회전</td></tr><tr><td>룩</td><td>묵직한 돌진</td><td>흔들리며 내려앉기</td><td>쿵쿵 리듬</td></tr><tr><td>퀸</td><td>떠올라 한 바퀴</td><td>빛처럼 흩어짐</td><td>우아한 회전</td></tr><tr><td>킹</td><td>고개를 숙이며 전진</td><td>패배할 때 쓰러짐</td><td>왕의 인사</td></tr></table><p>캐슬링은 킹과 룩이 함께 움직이고, 승급할 때는 빛이 터지며 새 말로 변해요. 체크메이트에서도 킹을 직접 잡지는 않아요.</p><p>3D 화면을 드래그하면 회전하고, 휠 또는 두 손가락으로 확대해요. ↺ 버튼으로 원래 시점에 돌아와요. 애니메이션을 끄거나 2D로 전환할 수도 있어요. 기기의 동작 줄이기 설정을 존중해요.</p>');
setView(settings.view);
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
