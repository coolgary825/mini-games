import assert from 'node:assert/strict';
import { LEVELS, solutionSlots } from '../data.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = process.env.RESCUE_URL || 'http://127.0.0.1:8765/mini-games/rescue/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [], failed = [];
async function makePage(options={}) {
  const context=await browser.newContext({ viewport:{width:1440,height:1000}, reducedMotion:'reduce', ...options });
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  return page;
}
async function ready(page) {await page.goto(url);await page.locator('[data-slot]').first().waitFor();}
async function solve(page,index,touch=false) {
  const press=async selector=> touch? page.locator(selector).tap():page.locator(selector).click();
  for(const slot of solutionSlots(LEVELS[index])) {
    await press(`[data-tool="${slot.type}"]`);
    await press(`[data-slot="${slot.id}"]`);
  }
  assert.equal(await page.locator('.installed-slot').count(),solutionSlots(LEVELS[index]).length);
  await press('#speed');
  await press('#play');
  await page.clock.runFor(16000);
  assert.equal(await page.locator('#win-dialog').evaluate(el=>el.open),true,`stage ${index+1} opens success dialog`);
  assert.equal(await page.locator('#rescue-count').textContent(),`${LEVELS[index].pets.length} / ${LEVELS[index].pets.length}`);
}
try {
  const page=await makePage();await ready(page);
  assert.match(await page.title(),/집으로 가는 길/);
  assert.equal(await page.locator('.level-item').count(),LEVELS.length);
  assert.equal(await page.locator('.pet-card').count(),5);
  await page.locator('[data-slot="brook"]').click();
  assert.equal(await page.locator('[data-tool="bridge"] .tool-count').textContent(),'0');
  await page.locator('#undo').click();
  assert.equal(await page.locator('.installed-slot').count(),0);
  await page.keyboard.press('1');await page.locator('[data-slot="brook"]').click();
  await page.locator('#play').click();await page.clock.runFor(1200);
  await page.locator('#help').click();
  const before=await page.locator('#animal-0').getAttribute('transform');
  await page.clock.runFor(2000);
  assert.equal(await page.locator('#animal-0').getAttribute('transform'),before,'help pauses the simulation');
  await page.locator('#help-ready').click();await page.clock.runFor(50);
  assert.equal(await page.locator('#play-label').textContent(),'잠깐 멈춤');
  await page.locator('#play').click();await page.clock.runFor(100);
  const paused=await page.locator('#animal-0').getAttribute('transform');
  await page.clock.runFor(1000);
  assert.equal(await page.locator('#animal-0').getAttribute('transform'),paused);
  await page.locator('#sound').click();assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'true');
  await page.locator('#speed').click();await page.locator('#play').click();await page.clock.runFor(13000);
  assert.equal(await page.locator('#win-dialog').evaluate(el=>el.open),true);
  console.log('PASS desktop: place, undo, shortcuts, pause, help pause/resume, audio, stage 1 completion');
  for(let index=1;index<LEVELS.length;index++) {
    await page.locator('#next-level').click();
    assert.equal(await page.locator('#level-title').textContent(),LEVELS[index].title);
    if(index===1) {
      await page.locator('[data-slot="sign"]').click();
      assert.match(await page.locator('#toast').textContent(),/표지판/);
      assert.equal(await page.locator('.installed-slot').count(),0);
    }
    await solve(page,index);
    console.log(`PASS desktop: stage ${index+1} all pets rescued`);
  }
  assert.equal(await page.locator('#win-art .win-family').count(),3);
  assert.equal(await page.locator('#win-art>svg').count(),5);
  await page.screenshot({path:'/tmp/rescue-celebration.png',fullPage:true});
  await page.reload();await page.locator('[data-slot]').first().waitFor();
  assert.equal(await page.locator('.completed').count(),LEVELS.length);
  assert.match(await page.locator('#level-title').textContent(),/우리 모두/);
  assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'true');
  await page.locator('[data-level="0"]').click();
  assert.equal(await page.locator('#start-label').isVisible(),true);
  await page.screenshot({path:'/tmp/rescue-desktop.png',fullPage:true});
  console.log('PASS saved progress and audio settings restored after reload');
  for(const width of [320,390,768,1024,1440]) {
    await page.setViewportSize({width,height:900});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no page overflow at ${width}px`);
  }
  console.log('PASS responsive page widths 320, 390, 768, 1024, 1440');
  const mobile=await makePage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});await ready(mobile);
  await mobile.locator('[data-tool="bridge"]').tap();await mobile.locator('[data-slot="brook"]').tap();
  await mobile.locator('#undo').tap();assert.equal(await mobile.locator('.installed-slot').count(),0);
  await mobile.locator('[data-level="5"]').tap();await solve(mobile,5,true);
  await mobile.locator('#next-level').tap();await solve(mobile,6,true);
  await mobile.locator('#next-level').tap();await solve(mobile,7,true);
  await mobile.locator('#next-level').tap();await solve(mobile,8,true);
  await mobile.locator('#next-level').tap();await solve(mobile,9,true);
  await mobile.screenshot({path:'/tmp/rescue-mobile-celebration.png',fullPage:true});
  await mobile.locator('#next-level').tap();
  await mobile.screenshot({path:'/tmp/rescue-mobile.png',fullPage:true});
  console.log('PASS mobile taps, undo, horizontal map, stages 6–10, final family celebration');
  const returning=await makePage();
  await returning.addInitScript(()=>localStorage.setItem('our-little-rescue-v1',JSON.stringify({completed:[0,1,2,3,4],lastLevel:4,muted:false})));
  await ready(returning);
  assert.equal(await returning.locator('.completed').count(),5);
  assert.equal(await returning.locator('#journey-count').textContent(),'5 / 10');
  await returning.locator('[data-level="8"]').click();
  await returning.keyboard.press('5');
  assert.equal(await returning.locator('[data-tool="dig"]').getAttribute('aria-pressed'),'true');
  await returning.locator('[data-slot="wrong-floor"]').click();
  assert.equal(await returning.locator('.dug-floor').count(),1);
  await returning.locator('#hint').click();
  assert.match(await returning.locator('#toast').textContent(),/되돌리기/);
  await returning.keyboard.press('5');
  await returning.locator('[data-slot="safe-floor"]').click();
  assert.match(await returning.locator('#toast').textContent(),/모두 썼어요/);
  await returning.locator('#undo').click();
  assert.equal(await returning.locator('.dug-floor').count(),0);
  assert.equal(await returning.locator('.diggable-floor').count(),2);
  await returning.keyboard.press('4');
  assert.equal(await returning.locator('[data-tool="stairs"]').getAttribute('aria-pressed'),'true');
  console.log('PASS old five-stage saves, shortcuts 4/5, wrong-floor hint, drill supply, floor restoration');
  const corrupt=await makePage();
  await corrupt.addInitScript(()=>localStorage.setItem('our-little-rescue-v1','{"completed":[99,-1,"0",null],"lastLevel":-6,"muted":"false"}'));
  await ready(corrupt);assert.equal(await corrupt.locator('.completed').count(),0);assert.match(await corrupt.locator('#level-title').textContent(),/라떼/);
  const blocked=await makePage();
  await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}}));
  await ready(blocked);await blocked.locator('[data-slot="brook"]').click();assert.equal(await blocked.locator('.installed-slot').count(),1);
  console.log('PASS invalid and blocked localStorage do not prevent play');
  assert.deepEqual(errors,[],'no JavaScript errors');assert.deepEqual(failed,[],'no failed assets under /mini-games/rescue/');
  console.log('PASS no JavaScript errors or failed resources');
} finally { await browser.close(); }
