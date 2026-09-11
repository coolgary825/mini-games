// Install jsdom outside the game checkout, then run:
// JUNWOO_TEST_MODULES=/tmp/junwoo-chess-checks node --test chess/tests/runtime.test.mjs
// This is a simulated DOM integration test, not a browser/WebGL visual test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {Chess} from '../domain.js';
import {ChessEngine} from '../engine.js';

const children=new Set();
class NodeEngineWorker{
  constructor(url){
    this.child=spawn(process.execPath,[fileURLToPath(url)]);children.add(this.child);let buffer='';
    this.child.stdout.on('data',data=>{buffer+=data;let end;while((end=buffer.indexOf('\n'))!==-1){const line=buffer.slice(0,end).trim();buffer=buffer.slice(end+1);this.onmessage?.({data:line});}});
    this.child.on('error',()=>this.onerror?.());
  }
  postMessage(message){this.child.stdin.write(message+'\n');}
  terminate(){this.child.kill();children.delete(this.child);}
}
globalThis.Worker=NodeEngineWorker;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(predicate,ms=7000){const start=Date.now();while(!predicate()){if(Date.now()-start>ms)throw Error('Condition timed out');await wait(20);}}

test('real Stockfish engine loads and supports legal moves, hints and cancellation',async()=>{
  const engine=new ChessEngine();
  try{
    const game=new Chess();game.move('e4');
    const result=await engine.search(game,3);assert(game.moves({verbose:true}).some(m=>m.from+m.to+(m.promotion||'')===result.move));
    const hint=await engine.search(game,7,true);assert(hint.depth>0);assert(Number.isFinite(hint.score));
    const pending=engine.search(game,7,true);await wait(20);engine.dispose();await assert.rejects(pending);
  }finally{engine.dispose();}
});

test('UI moves, undo, review, imports, promotions, puzzles, profiles, AI and clocks',{timeout:25000},async()=>{
  const require=createRequire((process.env.JUNWOO_TEST_MODULES||'/tmp/junwoo-chess-checks')+'/package.json');
  const {JSDOM}=require('jsdom');
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const dom=new JSDOM(html,{url:'http://localhost:8765/chess/',pretendToBeVisual:true});
  const {window}=dom;
  window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  window.HTMLDialogElement.prototype.close=function(){this.open=false;};
  window.localStorage.setItem('junwoo-chess-settings',JSON.stringify({mode:'local',view:'2d',sound:false}));
  for(const name of ['window','document','localStorage','location','navigator'])Object.defineProperty(globalThis,name,{configurable:true,value:window[name]});
  const originalInterval=globalThis.setInterval,intervals=[];
  globalThis.setInterval=(...args)=>{const id=originalInterval(...args);intervals.push(id);return id;};
  const $=id=>window.document.getElementById(id);
  const click=id=>$(id).click();
  const sq=(a,b)=>{window.document.querySelector(`[data-square="${a}"]`).click();window.document.querySelector(`[data-square="${b}"]`).click();};
  const change=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new window.Event('change'));};
  const saved=()=>JSON.parse(window.localStorage.getItem('junwoo-chess-game-'+$('profile').value));
  const mode=m=>window.document.querySelector(`[data-mode="${m}"]`).click();
  const start=()=>{click('newBtn');if($('confirmAction'))click('confirmAction');};
  const importPosition=text=>{click('importBtn');$('importText').value=text;click('doImport');};
  try{
    await import('../app.js?runtime-test');
    assert.equal(document.querySelectorAll('.square').length,64);assert.equal(document.querySelectorAll('#board .piece').length,32);
    mode('local');start();sq('e2','e4');await wait(5);assert.deepEqual(saved().moves,['e4']);sq('e7','e5');await wait(5);assert.equal(saved().moves.length,2);
    click('firstBtn');assert.match($('status').textContent,/지난 수/);assert.equal(document.querySelector('[data-square="e2"] img')!==null,true);
    click('lastBtn');click('undoBtn');assert.equal(saved().moves.length,1);assert.equal(saved().assisted,true);
    importPosition('not chess');assert.match($('importError').textContent,/읽을 수/);click('cancelImport');
    importPosition('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');sq('e1','g1');await wait(5);assert.equal(saved().moves[0],'O-O');assert(document.querySelector('[data-square="f1"] img'));
    importPosition('7k/P7/6K1/8/8/8/8/8 w - - 0 1');sq('a7','a8');assert.equal(document.querySelectorAll('.promotion button').length,4);document.querySelectorAll('.promotion button')[3].click();await wait(5);assert.equal(new Chess(saved().moves.length?new Chess(saved().start).fen():saved().start).get('a7').type,'p');assert.match(saved().moves[0],/=N/);
    mode('puzzle');change('puzzleSelect','0');start();sq('h5','h3');await wait(5);assert.equal(saved().moves.length,0);sq('h5','f7');await wait(15);assert.equal(saved().result.reason,'체크메이트');assert(JSON.parse(localStorage.getItem('junwoo-chess-stats-준우')).puzzles.includes('scholar'));click('closeModal');
    change('profile','은우');assert.equal(saved().moves.length,0);change('profile','준우');assert.equal(saved().result.reason,'체크메이트');
    mode('ai');change('difficulty','0');change('side','w');start();sq('e2','e4');await until(()=>saved().moves.length===2);click('undoBtn');assert.equal(saved().moves.length,0);
    change('difficulty','3');start();sq('d2','d4');await until(()=>saved().moves.length===2);assert.equal(saved().config.level,3);
    click('hintBtn');await until(()=>!$('hintBtn').disabled);assert.equal(saved().assisted,true);assert.equal($('hintArrow').style.opacity,'0.85');
    mode('local');change('time','180:2');start();sq('e2','e4');await wait(250);click('pauseBtn');const paused=saved().clocks.b;await wait(250);click('resumeBtn');click('pauseBtn');assert(saved().clocks.b>paused-30);assert(saved().clocks.w>=181000);
    click('closeModal');
    const timeoutSeed={version:1,start:new Chess().fen(),moves:['e4'],config:{mode:'ai',level:7,human:'w',time:'180:2',puzzle:0},clocks:{w:180000,b:10},clockHistory:[{w:180000,b:180000}],increment:2000,started:true,paused:true,flipped:false,result:null,assisted:false,imported:false};
    localStorage.setItem('junwoo-chess-game-손님',JSON.stringify(timeoutSeed));change('profile','손님');click('resumeBtn');await until(()=>saved().result?.reason==='시간 초과');await wait(50);assert.equal(saved().result.winner,'w');assert(!saved().paused);assert(!$('coachText').textContent.includes('AI를 다시'));click('closeModal');
  }finally{
    intervals.forEach(clearInterval);globalThis.setInterval=originalInterval;children.forEach(child=>child.kill());await wait(3700);window.close();
  }
});
