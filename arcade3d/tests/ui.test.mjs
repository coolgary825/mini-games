// Simulated DOM and actual scene/game logic; no browser or GPU rendering.
// npm install --prefix /tmp/junwoo-chess-checks jsdom@26.1.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire,registerHooks} from 'node:module';
import {readFile} from 'node:fs/promises';
const require=createRequire((process.env.JUNWOO_TEST_MODULES||'/tmp/junwoo-chess-checks')+'/package.json');
const {JSDOM}=require('jsdom');
const hooks=registerHooks({resolve(specifier,context,nextResolve){if(specifier==='./world.js'&&context.parentURL?.includes('/arcade3d/app.js'))return {url:new URL('./headless-world.mjs',import.meta.url).href,shortCircuit:true};return nextResolve(specifier,context);}});
const originalTimeout=globalThis.setTimeout;
const wait=ms=>new Promise(r=>originalTimeout(r,ms));
async function until(fn){const start=Date.now();while(!fn()){if(Date.now()-start>4000)throw Error('UI failed to boot');await wait(5);}}
for(const id of ['roblox','defense','brainrot','99nights','princess'])test(id+' boots, starts, pauses, switches profiles and keeps legacy link',async()=>{
 const html=await readFile(new URL('../../'+id+'/3d.html',import.meta.url),'utf8');const dom=new JSDOM(html,{url:'http://localhost:8765/'+id+'/3d.html',pretendToBeVisual:true});const {window}=dom;
 window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};window.HTMLDialogElement.prototype.close=function(){this.open=false;};
 window.localStorage.setItem('junwoo-3d-muted','true');
 for(const key of ['window','document','localStorage','location','navigator'])Object.defineProperty(globalThis,key,{configurable:true,value:window[key]});
 const frames=[],timers=[];globalThis.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};globalThis.setTimeout=(...args)=>{const handle=originalTimeout(...args);timers.push(handle);return handle;};globalThis.devicePixelRatio=1;
 const $=id=>document.getElementById(id),click=id=>$(id).click();let now=100;
 const step=count=>{for(let i=0;i<count;i++){const frame=frames.shift();if(frame){now+=16;frame(now);}}};
 try{
  await import('../app.js?ui-test='+id);await until(()=>$('startBtn').disabled===false);assert($('errorCover').hidden);assert.equal(document.querySelectorAll('#stats>div').length,4);assert($('legacyLink').href.endsWith('.html'));assert.equal(document.querySelector('.home').href,'https://coolgary825.github.io/mini-games/');
  click('startBtn');assert($('welcome').hidden);assert($('pauseCover').hidden);step(10);window.dispatchEvent(new window.KeyboardEvent('keydown',{code:'KeyW'}));step(30);window.dispatchEvent(new window.KeyboardEvent('keyup',{code:'KeyW'}));
  click('pauseBtn');assert(!$('pauseCover').hidden);click('resumeBtn');assert($('pauseCover').hidden);
  click('panelBtn');assert(document.body.classList.contains('panel-open'));click('closePanel');assert(!document.body.classList.contains('panel-open'));
  click('helpBtn');assert($('dialog').open);assert($('dialogText').textContent.includes('기존 게임'));$('dialogActions').querySelector('button').click();assert(!$('dialog').open);
  $('difficulty').value='2';$('difficulty').dispatchEvent(new window.Event('change'));assert($('dialog').open);$('dialogActions').querySelector('button').click();assert.equal($('difficulty').value,'1');
  $('profile').value='은우';$('profile').dispatchEvent(new window.Event('change'));assert(!$('welcome').hidden);assert.equal(JSON.parse(localStorage.getItem('junwoo-3d-profile')),'은우');click('startBtn');step(10);assert(localStorage.getItem('junwoo-3d-'+id+'-은우'));
 }finally{timers.forEach(clearTimeout);globalThis.setTimeout=originalTimeout;window.close();frames.length=0;}
});
test.after(()=>hooks.deregister());
