import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, solutionSlots } from '../data.mjs';
import { createGame, placeTool, remaining, undo, step } from '../engine.mjs';
import { terrainPieces, stairSteps } from '../terrain.mjs';

function simulate(game, seconds) {
  const events=[];
  for(let i=0;i<seconds*60 && game.status!=='complete';i++) events.push(...step(game,1/60));
  return events;
}
for(let index=0;index<LEVELS.length;index++) {
  test(`stage ${index+1}: every pet reaches home safely with the intended solution`,()=>{
    const game=createGame(index);
    for(const slot of solutionSlots(game.level)) assert.equal(placeTool(game,slot.id,slot.type).ok,true);
    game.status='playing';
    const events=simulate(game,90);
    assert.equal(game.status,'complete');
    assert.equal(game.rescued,game.level.pets.length);
    assert.equal(events.filter(e=>e.type==='recover').length,0);
    assert.equal(events.filter(e=>e.type==='complete').length,1);
    assert.deepEqual(game.pets.map(p=>p.state),game.pets.map(()=> 'saved'));
  });
  for(const omitted of solutionSlots(LEVELS[index])) {
    test(`stage ${index+1}: missing ${omitted.id} causes safe recovery, and placing it later allows completion`,()=>{
      const game=createGame(index);
      for(const slot of solutionSlots(game.level)) if(slot.id!==omitted.id) placeTool(game,slot.id,slot.type);
      game.status='playing';
      const events=simulate(game,70);
      assert.notEqual(game.status,'complete');
      assert.ok(events.some(e=>e.type==='recover'));
      assert.ok(game.pets.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
      assert.equal(placeTool(game,omitted.id,omitted.type).ok,true);
      simulate(game,90);
      assert.equal(game.status,'complete');
    });
  }
}
test('pause freezes movement, double speed doubles travel, and ready mode does not move',()=>{
  const a=createGame(),b=createGame();
  step(a,1/60);assert.equal(a.time,0);
  a.status=b.status='playing';b.speed=2;
  simulate(a,1);simulate(b,1);
  assert.ok(Math.abs((b.pets[0].x-130)-2*(a.pets[0].x-130))<.001);
  a.status='paused';const before=a.pets[0].x;simulate(a,20);assert.equal(a.pets[0].x,before);
});
test('inventory, invalid placement and undo stay consistent',()=>{
  const g=createGame(1);
  assert.equal(remaining(g,'bridge'),1);
  assert.equal(placeTool(g,'sign','bridge').reason,'mismatch');
  assert.equal(g.history.length,0);
  assert.equal(placeTool(g,'brook','bridge').ok,true);
  assert.equal(remaining(g,'bridge'),0);
  assert.equal(placeTool(g,'brook','bridge').reason,'occupied');
  assert.equal(placeTool(g,'sign','turn').ok,true);
  assert.equal(undo(g),true);assert.equal(remaining(g,'turn'),1);
  assert.equal(remaining(g,'bridge'),0);
  assert.equal(undo(g),true);assert.equal(remaining(g,'bridge'),1);
  assert.equal(undo(g),false);
});
test('removing a bridge under a walking pet can be recovered without restarting',()=>{
  const g=createGame();placeTool(g,'brook','bridge');g.status='playing';
  while(g.pets[0].x<440)step(g,1/60);
  undo(g);const events=simulate(g,5);assert.ok(events.some(e=>e.type==='recover'));
  placeTool(g,'brook','bridge');simulate(g,50);assert.equal(g.status,'complete');
});
test('all levels finish at 2× speed without tunnelling through bridges or cushions',()=>{
  for(let i=0;i<LEVELS.length;i++){
    const g=createGame(i);g.speed=2;
    for(const slot of solutionSlots(g.level))placeTool(g,slot.id,slot.type);
    g.status='playing';const events=simulate(g,60);
    assert.equal(g.status,'complete');assert.equal(events.filter(e=>e.type==='recover').length,0);
  }
});

for (const index of [8, 9]) {
  test(`stage ${index+1}: choosing the wrong floor uses the only drill; undo allows a safe solution`, () => {
    const g = createGame(index);
    const wrong = g.level.slots.find(s=>s.decoy);
    const right = solutionSlots(g.level).find(s=>s.type==='dig');
    for (const slot of solutionSlots(g.level)) if(slot.type!=='dig') placeTool(g,slot.id,slot.type);
    assert.equal(placeTool(g,wrong.id,'dig').ok,true);
    assert.equal(remaining(g,'dig'),0);
    assert.equal(placeTool(g,right.id,'dig').reason,'empty');
    g.status='playing';const events=simulate(g,60);
    assert.notEqual(g.status,'complete');assert.ok(events.some(e=>e.type==='recover'));
    undo(g);assert.equal(remaining(g,'dig'),1);
    assert.equal(placeTool(g,right.id,'dig').ok,true);
    simulate(g,90);assert.equal(g.status,'complete');
  });
}
test('digging removes only the selected upper floor; undo restores its exact shape',()=>{
  const g=createGame(6), before=terrainPieces(g.level);
  placeTool(g,'trapdoor','dig');const pieces=terrainPieces(g.level,g.placed);
  assert.deepEqual(pieces.filter(p=>p.terrainIndex===0).map(p=>[p.x1,p.x2]),[[0,405],[505,600]]);
  assert.deepEqual(pieces.filter(p=>p.terrainIndex===1),before.filter(p=>p.terrainIndex===1));
  undo(g);assert.deepEqual(terrainPieces(g.level,g.placed),before);
});
test('pets actually ascend stair treads and fall through the selected floor',()=>{
  const climbing=createGame(5);
  for(const slot of solutionSlots(climbing.level))placeTool(climbing,slot.id,slot.type);
  climbing.status='playing';let stoodOnStair=false;
  const treads=stairSteps(climbing.level.slots[0]);
  for(let n=0;n<1500&&climbing.status!=='complete';n++){
    step(climbing,1/60);
    if(climbing.pets.some(p=>treads.some(s=>p.x>s.x1&&p.x<s.x2&&Math.abs(p.y-s.y)<.001)))stoodOnStair=true;
  }
  assert.equal(stoodOnStair,true);
  const dropping=createGame(6);
  for(const slot of solutionSlots(dropping.level))placeTool(dropping,slot.id,slot.type);
  dropping.status='playing';let fellThroughHole=false;
  for(let n=0;n<1500&&dropping.status!=='complete';n++){
    step(dropping,1/60);
    if(dropping.pets.some(p=>p.x>405&&p.x<505&&p.y>263&&p.y<380&&p.state==='falling'))fellThroughHole=true;
  }
  assert.equal(fellThroughHole,true);assert.equal(dropping.status,'complete');
});
test('removing stairs mid-climb and restoring them does not strand a pet',()=>{
  const g=createGame(5);
  placeTool(g,'high-brook','bridge');placeTool(g,'hill','stairs');g.status='playing';
  for(let n=0;n<1000&&g.pets[0].x<350;n++)step(g,1/60);
  undo(g);const events=simulate(g,8);assert.ok(events.some(e=>e.type==='recover'));
  placeTool(g,'hill','stairs');simulate(g,60);assert.equal(g.status,'complete');
});
test('a high solid wall stops walking instead of letting a pet pass through it',()=>{
  const g=createGame(5);
  g.level={...g.level,terrain:[{x1:0,x2:200,y:365},{x1:200,x2:960,y:265}],slots:[]};
  g.status='playing';const events=simulate(g,10);
  assert.ok(g.pets[0].x<=200);assert.equal(g.pets[0].state,'blocked');
  assert.equal(events.filter(e=>e.type==='blocked').length,2);
});
