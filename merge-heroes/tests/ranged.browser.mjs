import assert from 'node:assert/strict';
import {fresh} from '../engine.mjs';
import {SAVE_KEY} from '../data.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const url=process.env.MERGE_URL||'http://127.0.0.1:8771/merge-heroes/';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const mobile of [false,true])for(const tier of [1,4]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'});
  const data=fresh([`ranged-${tier}`]);data.units=[{id:1,type:'ranged',tier,slot:0}];
  await context.addInitScript(({key,data})=>{
   localStorage.setItem(key,JSON.stringify(data));
   // Observe rendered world coordinates without changing game state or drawing.
   window.rangedAnchors=[];
   const draw=CanvasRenderingContext2D.prototype.drawImage;
   CanvasRenderingContext2D.prototype.drawImage=function(img,...args){
    if(img?.src?.startsWith('data:image/svg+xml')&&decodeURIComponent(img.src).includes('data-buddy=')){
     const m=this.getTransform();window.rangedAnchors.push([m.e,m.f]);
    }
    return draw.call(this,img,...args);
   };
  },{key:SAVE_KEY,data});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-10-04T06:00:00Z')});await page.clock.pauseAt(new Date('2026-10-04T06:00:01Z'));
  await page.goto(url);await page.locator('#loading').waitFor({state:'hidden'});
  assert.match(await page.locator('#selected-detail').innerText(),/제자리에서/);
  await page.locator('#start').click();await page.clock.runFor(tier===1?2000:3000);
  await page.locator('#battle-area').screenshot({path:`/tmp/ranged-${mobile?'mobile':'desktop'}-${tier}.png`});
  await page.clock.runFor(7000);
  const anchors=await page.evaluate(()=>window.rangedAnchors);
  assert.ok(anchors.length>30);const [x,y]=anchors[0];for(const [px,py]of anchors){assert.ok(Math.abs(px-x)<.001);assert.ok(Math.abs(py-y)<.001);}
  assert.ok(Number(await page.locator('#coins').textContent())>180,'stationary ranged hero must score projectile kills');
  assert.deepEqual(errors,[]);console.log(`PASS ${mobile?'mobile':'desktop'} tier ${tier}: fixed rendered position, visible firing, projectile kills`);
  await context.close();
 }
}finally{await browser.close();}
