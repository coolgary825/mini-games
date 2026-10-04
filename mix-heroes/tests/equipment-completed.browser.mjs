import assert from 'node:assert/strict';
import {fresh,buyHero,serialize} from '../engine.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.MIX_URL||'http://127.0.0.1:8771/mix-heroes/';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const mobile of [false,true]){
 const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'});
 const fixture=fresh();const second=buyHero(fixture,'melee').id;buyHero(fixture,'ranged');
 fixture.bag.push({id:fixture.nextId++,kind:'fire'},{id:fixture.nextId++,kind:'thunder'});fixture.phase='won';fixture.wave=10;fixture.tutorial=4;
 await ctx.addInitScript(raw=>{const pending=sessionStorage.getItem('test-next-save');if(pending){localStorage.setItem('junwoo-mix-heroes-v1',pending);sessionStorage.removeItem('test-next-save');}if(!localStorage.getItem('junwoo-mix-heroes-v1'))localStorage.setItem('junwoo-mix-heroes-v1',raw);},serialize(fixture));
 const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const tap=async s=>mobile?p.locator(s).tap():p.locator(s).click();
 const state=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('junwoo-mix-heroes-v1')));
 const enterForge=async()=>{if(await p.locator('#result-dialog').isVisible())await tap('#result-action');if(mobile)await tap('.quick-nav [data-screen="forge"]');};
 await p.goto(base);await p.locator('#loading').waitFor({state:'hidden'});await enterForge();
 await tap(`[data-equip-unit="${second}"]`);await tap('[data-item="2"]');await tap('[data-item="3"]');
 assert.equal(await p.locator('body').getAttribute('data-materials'),'2');assert.equal(await p.locator('#equip-area').isVisible(),false);
 assert.equal(await p.locator('#change-equipment').isEnabled(),true);await tap('#change-equipment');
 assert.match(await p.locator('#equipment-title').innerText(),/가디언 2/);
 assert.equal(await p.locator('#equipment-options button').count(),3);assert.equal(await p.locator('[data-direct-equip="3"]').count(),0,'ranged weapons must not appear for a Guardian');
 if(mobile)await p.screenshot({path:'/tmp/mix-equipment-completed-mobile.png'});
 const fire=fixture.bag.find(i=>i.kind==='fire').id;await tap(`[data-direct-equip="${fire}"]`);
 let g=await state();assert.equal(g.units[0].weapon,'sword');assert.equal(g.units[1].weapon,'fire');assert.equal(g.bag.find(i=>i.id===fire).kind,'sword');assert.equal(g.coins,fixture.coins);assert.equal(g.phase,'won');
 assert.equal(await p.locator('#equipment-dialog').isVisible(),false);assert.equal(await p.locator('body').getAttribute('data-materials'),'0');assert.match(await p.locator(`[data-equip-unit="${second}"]`).innerText(),/불꽃검/);
 await tap('[data-equip-unit="1"]');await tap('#change-equipment');await tap(`[data-direct-equip="${fixture.bag.find(i=>i.kind==='thunder').id}"]`);
 g=await state();assert.equal(g.units[0].weapon,'thunder');assert.equal(g.units[1].weapon,'fire');assert.equal(g.bag.length,fixture.bag.length);
 await p.reload();await p.locator('#loading').waitFor({state:'hidden'});await enterForge();assert.deepEqual((await state()).units,g.units);assert.deepEqual((await state()).bag,g.bag);
 // A compatible weapon shortage must be explained, not silently ignored.
 await p.evaluate(()=>{const g=JSON.parse(localStorage.getItem('junwoo-mix-heroes-v1'));g.bag=g.bag.filter(i=>i.kind==='staff');sessionStorage.setItem('test-next-save',JSON.stringify(g));});
 await p.reload();await p.locator('#loading').waitFor({state:'hidden'});await enterForge();await tap('#change-equipment');assert.equal(await p.locator('#equipment-options button').count(),0);assert.match(await p.locator('#equipment-note').innerText(),/맞는 무기가 가방에 없어요/);await tap('#equipment-dialog [data-close]');
 // A previous-wave result remains locked until the existing next-preparation action.
 await p.evaluate(()=>{const g=JSON.parse(localStorage.getItem('junwoo-mix-heroes-v1'));g.phase='reward';g.wave=1;sessionStorage.setItem('test-next-save',JSON.stringify(g));});
 await p.reload();await p.locator('#loading').waitFor({state:'hidden'});await p.locator('#result-dialog').waitFor();await p.keyboard.press('Escape');if(mobile)await tap('.quick-nav [data-screen="forge"]');assert.equal(await p.locator('#change-equipment').isDisabled(),true);assert.match(await p.locator('#equipment-status').innerText(),/다음 준비/);
 if(mobile)await tap('.quick-nav [data-screen="battle"]');await tap('#start');if(mobile)await tap('.quick-nav [data-screen="forge"]');assert.equal(await p.locator('#change-equipment').isEnabled(),true);
 assert.deepEqual(errors,[]);console.log(`PASS ${mobile?'touch':'desktop'}: completed save, two selected materials, direct equipment targets, role filtering, saved ownership, empty bag explanation and next-preparation unlock`);await ctx.close();
}}finally{await browser.close();}
