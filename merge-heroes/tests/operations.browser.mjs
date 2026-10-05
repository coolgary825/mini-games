import assert from 'node:assert/strict';
import {fresh,campaign,nextWave} from '../engine.mjs';import {prepare,fight} from './strategy.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const url=process.env.MERGE_URL||'http://127.0.0.1:8771/merge-heroes/?v=20261005-ops1';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const mobile of [false,true]){
 const fixture=fresh();for(let n=1;n<15;n++){prepare(fixture);fight(fixture);nextWave(fixture);}prepare(fixture);
 const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1100},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'});
 await ctx.addInitScript(data=>{if(!localStorage.getItem('junwoo-merge-heroes-v1'))localStorage.setItem('junwoo-merge-heroes-v1',JSON.stringify(data));},campaign(fixture));
 const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(r.url());});
 await p.clock.install({time:new Date('2026-10-05T03:00:00Z')});await p.clock.pauseAt(new Date('2026-10-05T03:00:01Z'));await p.goto(url);await p.locator('#loading').waitFor({state:'hidden'});
 const tap=s=>mobile?p.locator(s).tap():p.locator(s).click();
 assert.equal(await p.locator('[data-skill="pulse"]').isDisabled(),true);if(mobile){assert.equal(await p.locator('#team-area').isVisible(),false);assert.ok((await p.locator('#start').boundingBox()).y<780);await tap('.quick-nav [data-screen="manage"]');assert.equal(await p.locator('#battle-area').isVisible(),false);assert.equal(await p.locator('#team-area').isVisible(),true);}
 await tap('#auto-deploy');if(mobile)await tap('.quick-nav [data-screen="battle"]');await tap('#start');
 let warned=false;for(let n=0;n<80;n++){await p.clock.runFor(250);if(await p.locator('#boss-hud.warning').count()){warned=true;break;}}
 assert.ok(warned,'boss must show a visible warning before its special attack');assert.match(await p.locator('#combat-callout').innerText(),/충격파/);assert.equal(await p.locator('[data-skill="pulse"]').isEnabled(),true);
 await p.screenshot({path:`/tmp/merge-ops-boss-${mobile?'mobile':'desktop'}.png`,fullPage:!mobile});
 const hp=Number(await p.locator('#boss-health').getAttribute('value'));const energy=Number(await p.locator('#energy-value').innerText());await tap('[data-skill="pulse"]');
 assert.equal(await p.locator('#boss-hud.warning').count(),0);assert.ok(Number(await p.locator('#boss-health').getAttribute('value'))<hp);assert.ok(Number(await p.locator('#energy-value').innerText())<energy);assert.equal(await p.locator('[data-skill="pulse"]').isDisabled(),true);assert.match(await p.locator('#pulse-status').innerText(),/초/);
 await tap('#start');assert.equal(await p.locator('body').getAttribute('data-phase'),'paused');const paused=await p.locator('#energy-value').innerText();await p.clock.runFor(3000);assert.equal(await p.locator('#energy-value').innerText(),paused);assert.equal(await p.locator('[data-skill="overdrive"]').isDisabled(),true);await tap('#start');await p.clock.runFor(1600);
 await p.reload();await p.locator('#loading').waitFor({state:'hidden'});assert.equal(await p.locator('body').getAttribute('data-phase'),'prep');assert.equal(await p.locator('#energy-value').innerText(),'50');
 if(mobile){await tap('.quick-nav [data-screen="manage"]');await p.screenshot({path:'/tmp/merge-ops-manage-mobile.png',fullPage:true});for(const width of [320,390,768]){await p.setViewportSize({width,height:844});for(const screen of ['battle','manage']){await tap(`.quick-nav [data-screen="${screen}"]`);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}}}
 assert.deepEqual(errors,[]);console.log(`PASS ${mobile?'touch':'desktop'}: boss warning, actual pulse damage and interruption, energy and cooldown, pause, checkpoint reload, deployment and navigation`);await ctx.close();
}}finally{await browser.close();}
