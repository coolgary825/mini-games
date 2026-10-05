import assert from 'node:assert/strict';
import {fresh,buyHero,serialize} from '../engine.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.MIX_URL||'http://127.0.0.1:8771/mix-heroes/';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const mobile of [false,true]){
 const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'});
 const g=fresh();buyHero(g,'melee');g.coins=200;g.bag=['bow','bow2','ice','wind','staff','staff2'].map(kind=>({id:g.nextId++,kind}));
 await ctx.addInitScript(raw=>{if(!localStorage.getItem('junwoo-mix-heroes-v1'))localStorage.setItem('junwoo-mix-heroes-v1',raw);},serialize(g));
 const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));const tap=s=>mobile?p.locator(s).tap():p.locator(s).click();const forge=async()=>{if(mobile)await tap('.quick-nav [data-screen="forge"]');};
 await p.goto(base);await p.locator('#loading').waitFor({state:'hidden'});await forge();await tap(`[data-item="${g.bag[0].id}"]`);
 assert.match(await p.locator('#equip').innerText(),/레인저 전용/);assert.equal(await p.locator('#equip').isDisabled(),true);assert.match(await p.locator('#select-compatible').innerText(),/레인저 모집/);await tap('#select-compatible');await tap('[data-buy-hero="ranged"]');await forge();
 const ranger=JSON.parse(await p.evaluate(()=>localStorage.getItem('junwoo-mix-heroes-v1'))).units.find(u=>u.type==='ranged');
 for(const item of g.bag){await tap('#clear-selection');await tap('[data-equip-unit="1"]');await tap(`[data-item="${item.id}"]`);assert.equal(await p.locator(`[data-equip-unit="${ranger.id}"]`).getAttribute('aria-pressed'),'true');assert.equal(await p.locator('#equip').isEnabled(),true);await tap('#equip');const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('junwoo-mix-heroes-v1')));assert.equal(saved.units.find(u=>u.id===ranger.id).weapon,item.kind);assert.equal(saved.units[0].weapon,'sword');assert.equal(saved.units[1].weapon,'sword');}
 assert.deepEqual(errors,[]);console.log(`PASS ${mobile?'touch':'desktop'}: no-Ranger recruitment guidance and automatic role selection for all 6 ranged weapons`);await ctx.close();
}}finally{await browser.close();}
