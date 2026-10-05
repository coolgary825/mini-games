import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,buy,buyFromCodex,mergePreview,merge,moveHero,dismiss,refund,start,pause,retry,nextWave,step,serialize,restore,campaign} from '../engine.mjs';
import {CHARACTERS,HEROES,stats,keyOf,superCost,clone,MAX_TIER,WAVES,ENEMIES,SLOTS} from '../data.mjs';
import {prepare,fight} from './strategy.mjs';
for(const variant of [0,1])for(const speed of [1,2])test(`20 stages, strategy ${variant}, speed ${speed}, clears with skills, boss gem upgrades and deployment`,()=>{const g=fresh();g.speed=speed;for(let w=1;w<=20;w++){prepare(g,variant);const time=fight(g);assert.ok(time<180);assert.equal(g.phase,w===20?'won':'reward');assert.ok(g.crystal>0);const saved=restore(serialize(g));assert.equal(saved.coins,g.coins);assert.equal(saved.gems,g.gems);assert.deepEqual(saved.discovered,g.discovered);const before=g.gems;for(let i=0;i<MAX_TIER;i++)step(g,.1);assert.equal(g.gems,before);if(w<20){assert.equal(nextWave(g),true);assert.equal(nextWave(g),false);}}assert.ok(g.discovered.length>=10);});
test('separate coin purchases use exact prices, appropriate slots and codex unlock',()=>{const g=fresh();assert.equal(buy(g,'ranged').ok,true);assert.equal(g.coins,120);assert.equal(g.gems,20);assert.ok(g.discovered.includes('ranged-1'));assert.equal(g.units[1].slot,1);assert.equal(buy(g,'melee').ok,true);assert.equal(g.coins,70);assert.equal(buy(g,'bad').ok,false);g.coins=0;const before=serialize(g);assert.equal(buy(g,'melee').ok,false);assert.equal(serialize(g),before);});
for(const type of ['melee','ranged'])for(let tier=1;tier<MAX_TIER;tier++)test(`normal merge ${type} ${tier}: two become one, stronger and permanently recorded`,()=>{const g=fresh();g.units=[{id:1,type,tier,slot:4},{id:2,type,tier,slot:1}];g.nextId=3;g.discovered=[`${type}-${tier}`];const before=serialize(g);const p=mergePreview(g,[1,2]);assert.equal(serialize(g),before);assert.equal(p.cost,0);const r=merge(g,[1,2]);assert.equal(r.ok,true);assert.equal(g.units.length,1);assert.equal(g.units[0].tier,tier+1);assert.equal(g.coins,180);assert.equal(g.gems,20);assert.ok(g.discovered.includes(`${type}-${tier}`));assert.ok(g.discovered.includes(`${type}-${tier+1}`));assert.ok(stats(g.units[0]).hp>CHARACTERS[`${type}-${tier}`].hp);assert.ok(stats(g.units[0]).power>CHARACTERS[`${type}-${tier}`].power);assert.equal(merge(g,[1,2]).ok,false);});
test('normal merge rejects different roles, levels, same ID, missing IDs, max level',()=>{const g=fresh();buy(g,'ranged');let before=serialize(g);assert.equal(merge(g,[1,2]).ok,false);assert.equal(merge(g,[1,1]).ok,false);assert.equal(merge(g,[1,999]).ok,false);assert.equal(serialize(g),before);g.units[1].type='melee';g.units[1].tier=2;assert.equal(merge(g,[1,2]).ok,false);g.units.forEach(u=>u.tier=MAX_TIER);assert.equal(merge(g,[1,2]).ok,false);});
for(let tier=1;tier<MAX_TIER;tier++)test(`super merge tier ${tier}: arbitrary partner, chosen first role, exact coins`,()=>{const g=fresh();g.coins=10000;g.units=[{id:1,type:'ranged',tier,slot:1},{id:2,type:'melee',tier:1,slot:4}];g.nextId=3;const expected=superCost(g.units[0]);const p=mergePreview(g,[1,2],'super');assert.equal(p.character.type,'ranged');assert.equal(p.character.tier,tier+1);assert.equal(p.cost,expected);const r=merge(g,[1,2],'super');assert.equal(r.ok,true);assert.equal(g.coins,10000-expected);assert.equal(g.gems,20);assert.equal(g.units.length,1);assert.equal(g.units[0].type,'ranged');assert.equal(g.units[0].tier,tier+1);assert.equal(g.units[0].slot,1);});
test('super merge order determines result; shortage, max tier and unknown mode are atomic',()=>{const g=fresh();buy(g,'ranged');assert.equal(mergePreview(g,[1,2],'super').character.type,'melee');assert.equal(mergePreview(g,[2,1],'super').character.type,'ranged');g.coins=79;const before=serialize(g);assert.equal(merge(g,[1,2],'super').ok,false);assert.equal(merge(g,[1,2],'oops').ok,false);assert.equal(serialize(g),before);g.units[0].tier=MAX_TIER;assert.equal(mergePreview(g,[1,2],'super').ok,false);});
test('codex gem prices strictly rise; locked characters cannot be purchased',()=>{const g=fresh();const before=serialize(g);assert.equal(buyFromCodex(g,'ranged-1').ok,false);assert.equal(buyFromCodex(g,'melee-5').ok,false);assert.equal(buyFromCodex(g,'invalid').ok,false);assert.equal(serialize(g),before);for(const type of ['melee','ranged'])for(let i=1;i<MAX_TIER;i++)assert.ok(CHARACTERS[`${type}-${i+1}`].gemCost>CHARACTERS[`${type}-${i}`].gemCost);});
for(const s of Object.values(CHARACTERS))test(`codex purchase ${s.key}: exact gems and real character stats`,()=>{const g=fresh([s.key]);g.gems=s.gemCost;const coins=g.coins,r=buyFromCodex(g,s.key);assert.equal(r.ok,true);assert.equal(g.gems,0);assert.equal(g.coins,coins);const u=g.units.find(u=>u.id===r.id);assert.equal(keyOf(u),s.key);assert.equal(stats(u).hp,s.hp);assert.equal(stats(u).power,s.power);assert.equal(buyFromCodex(g,s.key).ok,false);});
test('field and bench stay valid during full capacity, bench merges, swap and dismiss',()=>{const g=fresh();g.coins=5000;while(g.units.length<12)buy(g,'melee');assert.equal(g.units.filter(u=>u.slot!==null).length,6);const before=g.coins;assert.equal(buy(g,'ranged').ok,false);g.gems=500;assert.equal(buyFromCodex(g,'melee-1').ok,false);assert.equal(g.gems,500);assert.equal(g.coins,before);const bench=g.units.filter(u=>u.slot===null);merge(g,[bench[0].id,bench[1].id]);const merged=g.units.at(-1);assert.equal(merged.slot,null);moveHero(g,merged.id,4);assert.equal(g.units.find(u=>u.id===1).slot,null);const d=stats(merged),amount=refund(merged);assert.equal(dismiss(g,merged.id).ok,true);assert.equal(g.coins,before+amount);assert.ok(g.discovered.includes(d.key));});
test('merge a deployed and bench unit preserves deployment; last deployed cannot be benched',()=>{const g=fresh();buy(g,'melee');moveHero(g,2,null);assert.equal(moveHero(g,1,null).ok,false);const r=merge(g,[2,1]);assert.equal(g.units[0].id,r.id);assert.equal(g.units[0].slot,4);assert.equal(dismiss(g,r.id).ok,false);});
test('last deployed dismissal puts a reserve on the battlefield',()=>{const g=fresh();buy(g,'ranged');moveHero(g,2,null);dismiss(g,1);assert.equal(g.units[0].id,2);assert.equal(g.units[0].slot,4);});
test('battle locks purchases and merges; pause freezes engine; retry and reload restore both currencies and codex',()=>{const g=fresh();buy(g,'ranged');const before=campaign(g);start(g);assert.equal(buy(g,'melee').ok,false);assert.equal(buyFromCodex(g,'melee-1').ok,false);assert.equal(merge(g,[1,2],'super').ok,false);assert.equal(dismiss(g,1).ok,false);pause(g);const frozen=clone(g);step(g,.1);assert.deepEqual(g,frozen);pause(g);g.coins+=30;g.gems+=100;g.crystal=0;step(g,.1);assert.equal(g.phase,'lost');assert.deepEqual(campaign(restore(serialize(g))),before);assert.equal(retry(g),true);assert.deepEqual(campaign(g),before);});
test('codex values are the actual runtime maximum HP and damage',()=>{for(const s of Object.values(CHARACTERS)){const g=fresh([s.key]);g.units[0]={id:1,type:s.type,tier:s.tier,slot:s.type==='melee'?4:1};start(g);const u=g.run.units[0];assert.equal(u.maxHp,s.hp);u.cd=0;u.x=380;u.y=330;g.run.spawned=999;g.run.spawnIn=999;g.run.enemies=[{id:1,type:'slime',hp:100000,maxHp:100000,x:435,y:330,cd:999,flash:0,anim:0}];step(g,.01);u.cd=999;if(s.type==='ranged')for(let i=0;i<6;i++)step(g,.05);assert.equal(100000-g.run.enemies[0].hp,s.power);}});
test('a defeated team cannot leave enemies stuck forever at the crystal',()=>{const g=fresh();g.wave=20;start(g);g.run.units.forEach(u=>u.hp=0);for(let i=0;i<2200&&g.phase==='battle';i++)step(g,.1);assert.equal(g.phase,'lost');});
test('reset retains discoveries but resets army and both currencies; invalid saves recover',()=>{const g=fresh(['melee-5','ranged-3']);g.coins=800;g.gems=300;const next=fresh(g.discovered);assert.equal(next.coins,180);assert.equal(next.gems,20);assert.deepEqual(next.discovered,g.discovered);for(const raw of ['bad','null','{}',JSON.stringify({...g,gems:-1}),JSON.stringify({...g,units:[{id:1,type:'melee',tier:'1',slot:4}]}),JSON.stringify({...g,discovered:['bad']})])assert.deepEqual(restore(raw),fresh());});
test('final victory still allows codex shopping and merging without repeating rewards',()=>{const g=fresh(['ranged-1']);g.phase='won';g.wave=20;const r=buyFromCodex(g,'ranged-1');assert.equal(r.ok,true);assert.equal(merge(g,[1,r.id],'super').ok,true);const gems=g.gems;assert.equal(start(g).ok,false);step(g,.1);assert.equal(g.gems,gems);assert.equal(restore(serialize(g)).phase,'won');});

test('exactly seven stars for each fixed attack type, with Summer to Coffee and Autumn to Mocha',()=>{
 assert.equal(MAX_TIER,7);assert.equal(Object.keys(CHARACTERS).length,14);
 assert.equal(CHARACTERS['melee-1'].name,'여름');assert.equal(CHARACTERS['melee-2'].name,'커피');
 assert.equal(CHARACTERS['ranged-1'].name,'가을');assert.equal(CHARACTERS['ranged-2'].name,'모카');
 for(const s of Object.values(CHARACTERS)){assert.equal(s.attackType,s.type);assert.equal(Number.isFinite(s.gemCost),true);if(s.type==='ranged')assert.equal(s.weapon,s.tier>=4?'missile':'blaster');}
});
test('moving to any of six slots never changes range, stats or projectile type',()=>{
 for(const type of ['melee','ranged'])for(let slot=0;slot<SLOTS.length;slot++){
  const g=fresh();g.units[0].type=type;const before=stats(g.units[0]);moveHero(g,1,slot);assert.equal(g.units[0].type,type);assert.equal(stats(g.units[0]),before);start(g);
  const u=g.run.units[0];u.cd=0;const x=u.x;g.run.spawned=999;g.run.spawnIn=999;
  g.run.enemies=[{id:1,type:'tank',hp:100000,maxHp:100000,x:u.x+220,y:u.y,cd:999,flash:0,anim:0}];step(g,.01);
  assert.equal(g.run.shots.length,type==='ranged'?1:0);if(type==='melee')assert.ok(u.x>x);else assert.equal(g.run.shots[0].weapon,'blaster');
 }
});
test('high-star ranged heroes fire missiles and all projectiles deal their displayed damage',()=>{
 const g=fresh();g.units[0]={id:1,type:'ranged',tier:7,slot:4};start(g);const u=g.run.units[0];u.cd=0;g.run.spawned=999;g.run.spawnIn=999;g.run.enemies=[{id:1,type:'tank',hp:100000,maxHp:100000,x:u.x+200,y:u.y,cd:999,flash:0,anim:0}];step(g,.01);assert.equal(g.run.shots[0].weapon,'missile');assert.equal(g.run.shots[0].power,CHARACTERS['ranged-7'].power);
});
test('reduced rewards, stronger late waves, and half-value refunds close easy coin farming',()=>{
 let oldTotal=180,newTotal=180;for(let wave=1;wave<=20;wave++){const d=WAVES[wave-1];oldTotal+=70+wave*8+d.types.reduce((a,t)=>a+({slime:6,fast:6,tank:9,artillery:9,boss:35}[t]),0);newTotal+=45+wave*5+d.types.reduce((a,t)=>a+ENEMIES[t].coins,0);}assert.ok(newTotal<oldTotal*.65);assert.ok(WAVES[19].mult>1.16**19);assert.equal(refund({type:'melee',tier:1}),25);
 const g=fresh();buy(g,'melee');start(g);while(g.phase==='battle')step(g,.1);assert.equal(g.run.reward,50);assert.equal(g.run.earned,8);const before=g.coins;step(g,.1);assert.equal(g.coins,before);
});
test('seven stars remain reachable with earned resources and final army refunds',()=>{
 const g=fresh();for(let wave=1;wave<=20;wave++){prepare(g,0);fight(g);assert.equal(g.phase,wave===20?'won':'reward');if(wave<20)nextWave(g);}
 const u=g.units.find(u=>u.tier===6);assert.ok(u);for(const other of [...g.units])if(other!==u)assert.equal(dismiss(g,other.id).ok,true);
 const partner=buyFromCodex(g,'melee-1');assert.equal(partner.ok,true);assert.equal(merge(g,[u.id,partner.id],'super').ok,true);assert.equal(g.units[0].tier,7);assert.ok(g.discovered.includes('melee-7'));assert.equal(restore(serialize(g)).units[0].tier,7);
});
test('legacy five-star saves retain currencies, slots, discoveries and progress',()=>{
 const old={...fresh(['melee-5','ranged-5']),wave:17,coins:456,gems:789,units:[{id:1,type:'melee',tier:5,slot:0},{id:2,type:'ranged',tier:5,slot:5}],nextId:3};const restored=restore(JSON.stringify(old));for(const k of ['wave','coins','gems','units','discovered'])assert.deepEqual(restored[k],old[k]);
});

test('all seven ranged tiers stay planted and hit entrance enemies from every slot at both speeds',()=>{
 for(const speed of [1,2])for(let tier=1;tier<=MAX_TIER;tier++)for(let slot=0;slot<SLOTS.length;slot++){
  const g=fresh();g.speed=speed;g.units[0]={id:1,type:'ranged',tier,slot};start(g);
  const u=g.run.units[0],origin={x:u.x,y:u.y};let fired=false,hit=false;
  for(let n=0;n<150&&g.phase==='battle';n++){
   step(g,1/30);assert.equal(u.x,origin.x);assert.equal(u.y,origin.y);
   if(g.run.shots.length){fired=true;assert.equal(g.run.shots[0].weapon,stats(u).weapon);}
   if(g.run.enemies.some(e=>e.hp<e.maxHp)||g.run.kills>0)hit=true;
  }
  assert.ok(fired,`tier ${tier}, slot ${slot}, speed ${speed} must shoot`);
  assert.ok(hit,`tier ${tier}, slot ${slot}, speed ${speed} must hit`);
 }
});
test('out-of-range enemies never make ranged heroes creep forward',()=>{
 const g=fresh();g.units[0].type='ranged';start(g);const u=g.run.units[0],origin={x:u.x,y:u.y};g.run.spawned=999;g.run.spawnIn=999;
 g.run.enemies=[{id:1,type:'tank',hp:100000,maxHp:100000,x:2000,y:u.y,cd:999,flash:0,anim:0}];
 for(let n=0;n<600;n++){step(g,1/30);assert.equal(u.x,origin.x);assert.equal(u.y,origin.y);assert.equal(g.run.shots.length,0);}
});
test('overlapping melee allies yield to stationary shooters in either array order',()=>{
 for(const rangedFirst of [true,false]){
  const g=fresh();g.units=[{id:1,type:'ranged',tier:1,slot:0},{id:2,type:'melee',tier:1,slot:3}];g.nextId=3;if(!rangedFirst)g.units.reverse();start(g);
  const u=g.run.units.find(u=>u.type==='ranged'),ally=g.run.units.find(u=>u.type==='melee'),origin={x:u.x,y:u.y};ally.x=u.x;ally.y=u.y;g.run.spawned=999;g.run.spawnIn=999;
  for(let n=0;n<120;n++){step(g,1/30);assert.equal(u.x,origin.x);assert.equal(u.y,origin.y);}
  assert.ok(Math.hypot(ally.x-u.x,ally.y-u.y)>38);
 }
});
