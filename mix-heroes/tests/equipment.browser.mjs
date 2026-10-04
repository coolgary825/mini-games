import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.MIX_URL||'http://127.0.0.1:8771/mix-heroes/';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const mobile of [false,true]){
 const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'});
 const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const tap=async selector=>mobile?p.locator(selector).tap():p.locator(selector).click();
 const screen=async name=>{if(mobile)await tap(`.quick-nav [data-screen="${name}"]`);};
 const state=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('junwoo-mix-heroes-v1')));
 await p.goto(base);await p.locator('#loading').waitFor({state:'hidden'});await screen('team');await tap('[data-buy-hero="melee"]');
 let g=await state();const first=g.units[0].id,second=g.units[1].id;
 await tap(`[data-unit="${second}"]`);await tap('.team-to-forge');
 await tap('[data-item="2"]');await tap('[data-item="3"]');await tap('#craft');
 assert.equal(await p.locator(`[data-equip-unit="${second}"]`).getAttribute('aria-pressed'),'true','craft must keep the second Guardian selected');
 assert.match(await p.locator('#equip').innerText(),/가디언 2/);await tap('#equip');
 g=await state();assert.equal(g.units.find(u=>u.id===first).weapon,'sword');assert.equal(g.units.find(u=>u.id===second).weapon,'fire');
 assert.match(await p.locator(`[data-equip-unit="${second}"]`).innerText(),/불꽃검/);
 // Select the other Guardian before forging a different weapon.
 await tap(`[data-equip-unit="${first}"]`);await tap('[data-buy-weapon="hammer"]');await tap('[data-buy-weapon="staff"]');
 g=await state();for(const kind of ['hammer','staff'])await tap(`[data-item="${g.bag.find(i=>i.kind===kind).id}"]`);await tap('#craft');await tap('#equip');
 g=await state();assert.equal(g.units.find(u=>u.id===first).weapon,'thunder');assert.equal(g.units.find(u=>u.id===second).weapon,'fire');
 // Return the first Guardian's weapon to the bag, then equip it on the second.
 const sword=g.bag.find(i=>i.kind==='sword').id;await tap(`[data-item="${sword}"]`);await tap('#equip');
 g=await state();assert.equal(g.bag.find(i=>i.id===sword).kind,'thunder');
 const otherSword=g.bag.find(i=>i.kind==='sword').id;await tap(`[data-item="${otherSword}"]`);await tap(`[data-item="${sword}"]`);
 assert.equal(await p.locator('body').getAttribute('data-materials'),'1','completed weapons must be selected alone for equipment');
 await tap(`[data-equip-unit="${second}"]`);assert.match(await p.locator('#equip').innerText(),/가디언 2/);await tap('#equip');
 g=await state();assert.equal(g.units.find(u=>u.id===first).weapon,'sword');assert.equal(g.units.find(u=>u.id===second).weapon,'thunder');assert.equal(g.bag.find(i=>i.id===sword).kind,'fire');
 await p.reload();await p.locator('#loading').waitFor({state:'hidden'});assert.deepEqual((await state()).units,g.units);assert.deepEqual((await state()).bag,g.bag);assert.deepEqual(errors,[]);
 console.log(`PASS ${mobile?'touch':'desktop'}: two Guardians, selection survives craft, separate equipment, returned weapons, selection of completed weapons and saved ownership`);await ctx.close();
}}finally{await browser.close();}
