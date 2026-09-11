import test from 'node:test';
import assert from 'node:assert/strict';
import {World,cameraFit} from '../world.js';
import {safeProgress,pathPoint,pathLength,supportAt,fashionScore} from '../rules.js';
import {Game as Roblox} from '../games/roblox.js';
import {Game as Defense,TOWERS} from '../games/defense.js';
import {Game as Brainrot,COLLECTION} from '../games/brainrot.js';
import {Game as Nights} from '../games/nights.js';
import {Game as Princess,THEMES,safeOutfit} from '../games/princess.js';

function harness(Game,raw={},difficulty=1){
 const world=new World(null,{headless:true}),progress=safeProgress(raw),events={saves:0,ends:[],controls:[],stats:[]};
 const ui={input:{x:0,z:0,target:null},goal:t=>events.goal=t,toast:t=>events.toast=t,sound:()=>{},save:()=>events.saves++,stats:s=>events.stats=s,controls:(t,items)=>events.controls=items,actions:items=>events.actions=items,reward:(n)=>{progress.coins+=Math.floor(n);},spend:n=>{if(progress.coins<n)return false;progress.coins-=n;return true;},confirm:(title,text,fn)=>fn(),end:(title,text,fn)=>events.ends.push({title,text,fn})};
 const game=new Game(world,ui,progress,{difficulty});
 return {world,progress,ui,events,game,step:(seconds,dt=.02)=>{for(let i=0;i<seconds/dt;i++){game.tick(dt,ui.input);world.update(dt);}},dispose:()=>world.dispose()};
}
test('all five 3D games construct distinct worlds and remain numerically stable',()=>{
 for(const Game of [Roblox,Defense,Brainrot,Nights,Princess]){const h=harness(Game);try{h.step(3);assert(h.world.stage.children.length>15);assert.equal(h.events.stats.length,4);h.world.scene.traverse(o=>{for(const n of [...o.position,...o.scale])assert(Number.isFinite(n));if(o.geometry){o.geometry.computeBoundingSphere();assert(Number.isFinite(o.geometry.boundingSphere.radius));}});}finally{h.dispose();}}
});
test('platform physics, jumps, checkpoints, rewards and challenge modes',()=>{
 const h=harness(Roblox,{coins:150,upgrades:{double:1}});try{const g=h.game;g.jump();assert(g.vy>0);h.step(.1);assert(g.player.position.y>0);g.jump();assert.equal(g.jumps,2);const v=g.vy;g.jump();assert.equal(g.vy,v);g.checkpoint=6;g.respawn();assert.equal(g.player.position.z,g.platforms[6].z);assert.equal(g.hearts,3);
 g.mode='coins';g.reset();assert.equal(g.platforms.length,1);const coin=g.coins[0];g.player.position.set(coin.x,0,coin.z);h.step(.02);assert(g.collected>=1);const previous=h.progress.coins;g.roundTime=59.99;h.step(.02);assert.equal(h.events.ends.length,1);assert(h.progress.coins>previous);
 g.mode='meteor';g.reset();h.step(1);assert(g.meteors.length>0);
 }finally{h.dispose();}
});
test('tower purchase/upgrade/sale economics, targeting, slow effects and wave completion',()=>{
 const h=harness(Defense);try{const g=h.game;for(const pad of g.pads){let closest=Infinity;for(let d=0;d<g.length;d+=.25){const p=pathPoint(g.paths,d);closest=Math.min(closest,Math.hypot(p.x-pad.x,p.z-pad.z));}assert(closest<Math.min(...TOWERS.map(t=>t.range)));}assert.equal(g.build(0),false);g.selected=g.pads[0];assert(g.build(0));assert.equal(g.cash,210-TOWERS[0].cost);const t=g.towers[0];g.cash=1000;const cost=g.upgradeCost(t);g.upgrade();assert.equal(t.level,2);assert.equal(g.cash,1000-cost);const refund=Math.floor(t.invested*.7);const cash=g.cash;g.sell();assert.equal(g.cash,cash+refund);assert.equal(g.towers.length,0);
 g.selected=g.pads[1];g.build(2);g.nextWave();g.spawn();const e=g.enemies[0];e.mesh.position.set(g.selected.x+1,0,g.selected.z);e.d=17;h.step(.02);assert(e.slow>0||e.hp<e.maxHp);g.enemies.forEach(enemy=>g.damage(enemy,100000));g.spawnLeft=0;h.step(.02);assert(!g.active);assert(h.progress.best>=1);g.charge=100;g.nextWave();g.spawn();g.ultimate();assert(g.charge<100);assert(g.enemies[0].dead||g.enemies[0].hp<g.enemies[0].maxHp);
 }finally{h.dispose();}
});
test('heist pickup, delivery, passive income, protection, purchases and collection restore',()=>{
 const h=harness(Brainrot,{coins:1000});try{const g=h.game,p=g.pods[0];g.player.position.set(p.x,0,p.z);g.interact();assert(g.carry);assert(p.cooldown>0);g.player.position.set(0,0,17);g.interactCooldown=0;g.interact();assert.equal(g.carry,null);assert.equal(g.owned.length,1);assert.deepEqual(h.progress.collection,[p.id]);const before=h.progress.coins;h.step(1.02);assert(h.progress.coins>before);g.buy('pet');assert(g.pet);g.activateShield();assert(g.shield>0);const caught=g.caught;g.capture();assert.equal(g.caught,caught);g.shield=0;g.invincible=0;g.capture();assert.equal(g.caught,caught+1);g.reset();assert.equal(g.owned.length,1);
 }finally{h.dispose();}
});
test('survival harvesting, fire, building, combat, rescue and dawn save',()=>{
 const h=harness(Nights);try{const g=h.game,r=g.resources.find(r=>r.type==='wood');g.player.position.set(r.x,0,r.z);g.interact();assert(g.wood>=2);g.wood=20;g.fuel=20;g.player.position.set(0,0,0);g.interactCD=0;g.interact();assert(g.fuel>20);assert(g.wood<20);g.wood=30;g.stone=10;assert(g.addStructure('tower'));assert.equal(g.structures.length,1);g.health=50;g.hunger=30;g.food=2;g.eat();assert(g.health>50&&g.hunger>30);g.spawnEnemy();const e=g.enemies[0];e.mesh.position.copy(g.player.position);g.attack();assert(e.dead||e.hp<38);g.player.position.set(0,0,4);g.children[0].mesh.position.copy(g.player.position);h.step(.02);assert.equal(g.rescued,1);g.phase=53.99;h.step(.02);assert.equal(g.day,2);assert.equal(h.progress.run.day,2);assert(h.events.saves>0);
 }finally{h.dispose();}
});
test('saved survival resources preserve legitimate zero values',()=>{
 const h=harness(Nights,{run:{day:3,health:80,hunger:0,fuel:0,wood:0,stone:0,food:0,rescued:0,role:'knight',structures:[]}});try{assert.equal(h.game.day,3);assert.equal(h.game.food,0);assert.equal(h.game.fuel,0);assert.equal(h.game.hunger,0);}finally{h.dispose();}
});
test('princess dressing, fair judging, runway reward, heart catch and cake recipes',()=>{
 const h=harness(Princess);try{const g=h.game;g.outfit={...g.outfit,color:THEMES[0].color,style:THEMES[0].style,wings:THEMES[0].wings,crown:1};g.buildPrincess();assert.equal(fashionScore(g.outfit,THEMES[0]),100);g.mode='show';g.themeIndex=0;g.startRunway();h.step(8.1);assert.equal(h.progress.best,100);assert(h.progress.coins>=50);assert.equal(g.runway,0);g.changeMode('hearts');h.step(.1);assert(g.hearts.length>0);g.changeMode('cake');const previous=h.progress.coins;g.finishCake();assert.equal(h.progress.coins,previous);g.cakeLayers=3;g.cakeFlavor=1;g.cakeTopping=2;g.buildCake();g.finishCake();assert.equal(h.progress.coins,previous+45);assert(h.events.ends.length>0);
 }finally{h.dispose();}
});
test('progress validation, path interpolation and platform edge cases',()=>{
 const p=safeProgress({coins:-99,collection:[0,99,'x'],color:999,upgrades:{speed:999,bad:'x'}});assert.equal(p.coins,0);assert.deepEqual(p.collection,[0]);assert.equal(p.color,0);assert.equal(p.upgrades.speed,10);const path=[{x:0,z:0},{x:0,z:10},{x:10,z:10}];assert.equal(pathLength(path),20);assert.deepEqual(pathPoint(path,15),{x:5,z:10,angle:Math.PI/2});assert.equal(supportAt([{x:0,z:0,y:2,w:3,d:3}],0,0,3,1).y,2);assert.equal(supportAt([{x:0,z:0,y:2,w:3,d:3}],5,0,3,1),null);assert.equal(safeOutfit({crown:0}).crown,0);
});

test('portrait tower-defense camera keeps the map width in view',()=>{for(const aspect of [.35,.44,.75,1,1.8]){const fit=cameraFit(aspect,44);assert(fit.fov<=100);assert(Math.abs(2*Math.tan(fit.fov*Math.PI/360)*fit.distance*aspect-44)<.0001);}});
