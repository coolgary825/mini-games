import {HEROES,CHARACTERS,ENEMIES,WAVES,SLOTS,MAX_TIER,CAPACITY,keyOf,stats,clone,superCost,SKILLS} from './data.mjs?v=20261005-ops1';
const ok=(message,extra={})=>({ok:true,message,...extra});
const fail=message=>({ok:false,message});
export function fresh(discovered=[]){return {version:1,medals:Array(20).fill(0),wave:1,phase:'prep',coins:180,gems:20,crystal:100,units:[{id:1,type:'melee',tier:1,slot:4}],nextId:2,discovered:[...new Set(['melee-1',...discovered.filter(k=>CHARACTERS[k])])],muted:true,speed:1,checkpoint:null,run:null};}
export const canEdit=g=>['prep','won'].includes(g.phase);
export function buy(g,type){if(!canEdit(g))return fail('준비 시간에 용사를 부를 수 있어요.');const d=HEROES[type];if(!d)return fail('근거리 또는 원거리 용사를 골라 주세요.');if(g.units.length>=CAPACITY)return fail('용사단이 가득해요. 합체하거나 용사를 돌려보내 주세요.');if(g.coins<d.cost)return fail(`코인이 ${d.cost-g.coins}개 더 필요해요.`);const order=type==='melee'?[4,3,5,1,0,2]:[1,0,2,4,3,5],slot=order.find(n=>!g.units.some(u=>u.slot===n))??null;const u={id:g.nextId++,type,tier:1,slot};g.coins-=d.cost;g.units.push(u);unlock(g,u);return ok(`${stats(u).name} 등장!${slot===null?' 대기석에서 기다려요.':''}`,{id:u.id});}
function unlock(g,u){const key=keyOf(u);if(!g.discovered.includes(key))g.discovered.push(key);}
export function mergePreview(g,ids,mode='normal'){if(ids.length!==2||ids[0]===ids[1])return fail('같은 용사 두 명을 골라 주세요.');const [a,b]=ids.map(id=>g.units.find(u=>u.id===id));if(!a||!b)return fail('우리 용사단에서 두 명을 골라 주세요.');if(mode==='normal'&&(a.type!==b.type||a.tier!==b.tier))return fail('일반 합체는 공격 타입과 별 단계가 같아야 해요.');if(a.tier>=MAX_TIER)return fail('이미 최고의 7단계 용사예요!');if(!['normal','super'].includes(mode))return fail('합체 방법을 골라 주세요.');return ok('합체 준비 완료!',{character:CHARACTERS[`${a.type}-${a.tier+1}`],cost:mode==='super'?superCost(a):0});}
export function merge(g,ids,mode='normal'){if(!canEdit(g))return fail('합체는 준비 시간에 할 수 있어요.');const preview=mergePreview(g,ids,mode);if(!preview.ok)return preview;if(g.coins<preview.cost)return fail(`코인이 ${preview.cost-g.coins}개 더 필요해요.`);g.coins-=preview.cost;const [a,b]=ids.map(id=>g.units.find(u=>u.id===id)),u={id:g.nextId++,type:a.type,tier:a.tier+1,slot:a.slot??b.slot};g.units=g.units.filter(u=>!ids.includes(u.id));g.units.push(u);const newlyDiscovered=!g.discovered.includes(keyOf(u));unlock(g,u);return ok(`${stats(u).name}으로 합체!${newlyDiscovered?' 도감에 새로 등록됐어요.':''}`,{id:u.id,key:keyOf(u),newlyDiscovered});}
export function buyFromCodex(g,key){if(!canEdit(g))return fail('도감 구매는 준비 시간에 할 수 있어요.');const s=CHARACTERS[key];if(!s||!g.discovered.includes(key))return fail('이미 얻은 용사만 보석으로 살 수 있어요.');if(g.units.length>=CAPACITY)return fail('용사단이 가득해요. 합체하거나 돌려보내 주세요.');if(g.gems<s.gemCost)return fail(`보석이 ${s.gemCost-g.gems}개 더 필요해요.`);const order=s.type==='melee'?[4,3,5,1,0,2]:[1,0,2,4,3,5];const u={id:g.nextId++,type:s.type,tier:s.tier,slot:order.find(n=>!g.units.some(x=>x.slot===n))??null};g.gems-=s.gemCost;g.units.push(u);return ok(`${s.name}이 보석을 받고 다시 합류했어요!`,{id:u.id});}
export function moveHero(g,id,slot){if(!canEdit(g))return fail('배치는 준비 시간에 바꿀 수 있어요.');const u=g.units.find(u=>u.id===id);if(!u||(slot!==null&&(!Number.isInteger(slot)||!SLOTS[slot])))return fail('용사와 자리를 골라 주세요.');if(slot===null&&u.slot!==null&&g.units.filter(u=>u.slot!==null).length===1)return fail('전장에는 한 명 이상 남겨 주세요.');const other=slot===null?null:g.units.find(x=>x.slot===slot);if(other)other.slot=u.slot;u.slot=slot;return ok(slot===null?'대기석으로 이동했어요.':'자리를 바꿨어요.');}
export function autoDeploy(g){if(!canEdit(g))return fail('배치는 준비 시간에 바꿀 수 있어요.');const sorted=[...g.units].sort((a,b)=>stats(b).power-stats(a).power||a.id-b.id);for(const u of g.units)u.slot=null;for(const u of sorted.slice(0,6)){const order=u.type==='melee'?[4,3,5,1,0,2]:[1,0,2,4,3,5];u.slot=order.find(slot=>!g.units.some(other=>other.slot===slot));}return ok('강한 용사부터 배치했어요. 근거리는 앞, 원거리는 뒤!');}
export const refund=u=>Math.floor(HEROES[u.type].cost*2**(u.tier-1)*.5);
export function dismiss(g,id){if(!canEdit(g))return fail('준비 시간에만 돌려보낼 수 있어요.');const u=g.units.find(u=>u.id===id);if(!u)return fail('용사를 골라 주세요.');if(g.units.length===1)return fail('마지막 용사는 함께 있어야 해요.');if(u.slot!==null&&g.units.filter(x=>x.slot!==null).length===1){const next=g.units.find(x=>x.id!==id);next.slot=u.slot;}const coins=refund(u);g.units=g.units.filter(x=>x.id!==id);g.coins+=coins;return ok(`${stats(u).name}을 돌려보내고 ${coins}코인을 돌려받았어요. 도감 기록은 남아요.`);}
export function campaign(g){const {checkpoint,run,...data}=g;return clone(data);}
export function start(g){if(g.phase!=='prep')return fail('먼저 다음 전투를 준비해 주세요.');if(!g.units.some(u=>u.slot!==null))return fail('전장에 용사를 배치해 주세요.');g.checkpoint=campaign(g);g.phase='battle';g.run={time:0,energy:50,overdrive:0,cooldowns:{overdrive:0,pulse:0},skillUses:0,interrupts:0,fallen:0,shake:0,hostile:[],spawned:0,kills:0,earned:0,spawnIn:1.2,enemies:[],shots:[],fx:[],nextEnemy:1,events:[],reward:0,units:g.units.filter(u=>u.slot!==null).map(u=>({...u,x:SLOTS[u.slot].x,y:SLOTS[u.slot].y,hp:stats(u).hp,maxHp:stats(u).hp,cd:.2,anim:0,attacks:0}))};return ok('우리 용사단, 출발!');}
export function pause(g){if(g.phase==='battle'){g.phase='paused';return true;}if(g.phase==='paused'){g.phase='battle';return true;}return false;}
export function retry(g){if(!g.checkpoint||!['lost','battle','paused'].includes(g.phase))return false;const muted=g.muted,speed=g.speed;Object.assign(g,clone(g.checkpoint),{muted,speed,phase:'prep',checkpoint:null,run:null});return true;}
export function nextWave(g){if(g.phase!=='reward'||g.wave>=20)return false;g.wave++;g.phase='prep';g.crystal=100;g.run=null;g.checkpoint=null;return true;}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function move(a,b,speed,dt,stop=0){const d=dist(a,b);if(d<=stop)return;const k=Math.min(speed*dt,d-stop)/d;a.x+=(b.x-a.x)*k;a.y+=(b.y-a.y)*k;}
function effect(r,kind,x,y,color,text=''){const life=kind==='text'?1:kind==='muzzle'?.12:kind==='pulse'?.75:.45;r.fx.push({kind,x,y,color,text,life,max:life});}
function hit(g,e,power,source='skill'){
 if(e.hp<=0)return;const armor=e.type==='tank'&&source==='ranged'?.55:1,amount=Math.max(1,Math.round(power*armor));e.hp=Math.max(0,e.hp-amount);e.flash=.15;effect(g.run,'text',e.x,e.y-35,armor<1?'#91b4d1':'#fff1cf',String(amount));
 if(e.hp===0){g.run.kills++;const coins=ENEMIES[e.type].coins;g.run.earned+=coins;g.coins+=coins;g.run.energy=Math.min(100,g.run.energy+4);effect(g.run,'burst',e.x,e.y,ENEMIES[e.type].color);effect(g.run,'coin',e.x,e.y-10,'#efc15c');g.run.events.push('pop');}
}
export function cast(g,key){
 const s=SKILLS[key],r=g.run;if(g.phase!=='battle'||!s||!r)return fail('스킬은 전투 중에 사용할 수 있어요.');
 if(r.cooldowns[key]>0)return fail('스킬이 충전 중이에요.');if(r.energy<s.cost)return fail(`에너지가 ${Math.ceil(s.cost-r.energy)} 더 필요해요.`);if(!r.enemies.some(e=>e.hp>0))return fail('적이 나타나면 스킬을 사용해요.');
 r.energy-=s.cost;r.cooldowns[key]=s.cooldown;r.skillUses++;
 if(key==='overdrive'){r.overdrive=5;effect(r,'pulse',400,335,'#f7c775');for(const u of r.units)if(u.hp>0)u.cd=0;}
 else {const power=r.units.filter(u=>u.hp>0).reduce((n,u)=>n+stats(u).power,0)*1.15;for(const e of r.enemies){hit(g,e,power);e.stun=2;if(e.charge){e.charge=null;e.specialIn=5;effect(r,'text',e.x,e.y-65,'#89f2e2','공격 차단!');r.interrupts++;}}effect(r,'pulse',500,330,'#82e5eb');r.shake=.2;}
 r.events.push('skill');return ok(s.name+'!');
}
export function step(g,dt){if(g.phase!=='battle')return;let left=Math.min(.15,Math.max(0,dt))*g.speed;while(left>0&&g.phase==='battle'){const d=Math.min(1/60,left);tick(g,d);left-=d;}}
function damageHero(r,u,amount){if(u.hp<=0)return;u.hp=Math.max(0,u.hp-Math.round(amount));u.flash=.15;effect(r,'ring',u.x,u.y,'#f28c80');if(u.hp===0)r.fallen++;}
function bossAttack(g,e,dt,alive){
 const r=g.run,sector=WAVES[g.wave-1].sector;e.specialIn-=dt;
 if(e.charge){e.charge.left-=dt;if(e.charge.left<=0){const q=e.charge;for(const u of alive)if(dist(u,q)<q.radius)damageHero(r,u,u.maxHp*(sector===3?.38:.28));effect(r,'blast',q.x,q.y,'#ff957e');r.shake=.3;e.charge=null;e.specialIn=sector===3&&e.hp<e.maxHp/2?4.5:7;}return true;}
 if(e.specialIn<=0&&alive.length){const target=sector===1?alive.filter(u=>u.type==='ranged').sort((a,b)=>stats(b).power-stats(a).power)[0]||alive[0]:alive.reduce((a,b)=>stats(a).power>stats(b).power?a:b);e.charge={x:target.x,y:target.y,radius:sector>=2?190:135,left:1.8,max:1.8};r.events.push('warning');return true;}return false;
}
function tick(g,dt){
 const r=g.run,def=WAVES[g.wave-1];r.time+=dt;r.spawnIn-=dt;r.energy=Math.min(100,r.energy+3*dt);r.overdrive=Math.max(0,r.overdrive-dt);r.shake=Math.max(0,r.shake-dt);for(const k of Object.keys(SKILLS))r.cooldowns[k]=Math.max(0,r.cooldowns[k]-dt);
 for(const f of r.fx)f.life-=dt;r.fx=r.fx.filter(f=>f.life>0);
 if(r.spawned<def.types.length&&r.spawnIn<=0){const type=def.types[r.spawned],d=ENEMIES[type],hp=Math.round(d.hp*def.mult);r.enemies.push({id:r.nextEnemy++,type,x:935,y:type==='boss'?335:[225,443,335][r.spawned%3],hp,maxHp:hp,cd:.7,flash:0,anim:0,stun:0,slow:0,specialIn:4,charge:null});r.spawned++;r.spawnIn=g.wave>=7&&r.spawned%3?def.gap*.48:def.gap;}
 for(const u of r.units){
  if(u.hp<=0)continue;u.cd-=dt*(r.overdrive>0?1.8:1);u.anim=Math.max(0,u.anim-dt);u.flash=Math.max(0,(u.flash||0)-dt);const enemies=r.enemies.filter(e=>e.hp>0),data=HEROES[u.type],s=stats(u);
  if(!enemies.length){if(u.type==='melee')move(u,SLOTS[u.slot],data.speed,dt,2);continue;}
  const e=enemies.reduce((a,b)=>dist(u,a)<dist(u,b)?a:b);
  if(dist(u,e)>data.range){if(u.type==='melee')move(u,e,data.speed,dt,data.range-5);}
  else if(u.cd<=0){u.cd=data.delay;u.anim=.24;u.attacks++;r.events.push('hit');
   if(u.type==='melee'){hit(g,e,s.power,'melee');effect(r,'slash',e.x-16,e.y-16,s.color);if(u.tier>=3&&u.attacks%4===0){for(const other of enemies)if(other!==e&&dist(other,e)<150)hit(g,other,s.power*.6,'melee');effect(r,'blast',e.x,e.y,s.color);}}
   else {r.shots.push({x:u.x+24,y:u.y-24,tx:e.x,ty:e.y-20,target:e.id,power:s.power,color:s.color,weapon:s.weapon,tier:u.tier,speed:s.weapon==='missile'?450:620,life:3});effect(r,'muzzle',u.x+30,u.y-24,s.color);}
  }
 }
 // Only melee heroes move aside; shooters always retain their chosen position.
 for(let i=0;i<r.units.length;i++)for(let j=i+1;j<r.units.length;j++){const a=r.units[i],b=r.units[j];if(a.hp<=0||b.hp<=0||(a.type==='ranged'&&b.type==='ranged'))continue;let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d<38){if(d<.01){dx=0;dy=1;d=1;}const k=(38-d)*Math.min(1,dt*5)*.5;if(a.type==='melee'){const push=b.type==='ranged'?k*2:k;a.x-=dx/d*push;a.y-=dy/d*push;}if(b.type==='melee'){const push=a.type==='ranged'?k*2:k;b.x+=dx/d*push;b.y+=dy/d*push;}}}
 for(const e of r.enemies){
  if(e.hp<=0)continue;const d=ENEMIES[e.type],damage=Math.round(d.damage*Math.sqrt(def.mult));e.flash=Math.max(0,e.flash-dt);e.anim=Math.max(0,e.anim-dt);e.cd-=dt;e.slow=Math.max(0,(e.slow||0)-dt);e.stun=Math.max(0,(e.stun||0)-dt);if(e.stun>0)continue;
  const alive=r.units.filter(u=>u.hp>0);if(e.type==='boss'&&bossAttack(g,e,dt,alive))continue;
  const nearby=alive.length?alive.reduce((a,b)=>dist(e,a)<dist(e,b)?a:b):null;
  if(e.type==='artillery'&&nearby&&dist(e,nearby)<480){if(e.cd<=0){e.cd=d.delay;r.hostile.push({x:e.x,y:e.y-30,tx:nearby.x,ty:nearby.y,target:nearby.id,power:damage,life:4});effect(r,'muzzle',e.x-20,e.y-30,'#f09b9c');}continue;}
  const dest=nearby&&dist(e,nearby)<(e.type==='fast'?120:225)?nearby:{x:104,y:335};
  if(nearby&&dest===nearby&&dist(e,nearby)<49+(e.type==='boss'?20:0)){if(e.cd<=0){damageHero(r,nearby,damage);e.cd=d.delay;e.anim=.24;}}
  else if(dist(e,{x:104,y:335})<=40){if(e.cd<=0){g.crystal=Math.max(0,g.crystal-damage);e.cd=d.delay;effect(r,'ring',105,330,'#f49c83');r.shake=.2;}}
  else move(e,dest,d.speed*(e.slow>0?.55:1),dt,30);
 }
 for(const p of r.shots){p.life-=dt;let e=r.enemies.find(e=>e.id===p.target&&e.hp>0);if(!e){e=r.enemies.filter(e=>e.hp>0).sort((a,b)=>dist(p,a)-dist(p,b))[0];if(e)p.target=e.id;}if(e){p.tx=e.x;p.ty=e.y-20;}const target={x:p.tx,y:p.ty};if(dist(p,target)<p.speed*dt+10){if(e){hit(g,e,p.power,'ranged');if(p.tier>=3)e.slow=1.5;if(p.weapon==='missile'){for(const other of r.enemies)if(other!==e&&other.hp>0&&dist(other,e)<115)hit(g,other,p.power*.35,'ranged');effect(r,'blast',e.x,e.y,p.color);}}p.life=0;}else move(p,target,p.speed,dt);}
 for(const p of r.hostile){p.life-=dt;const u=r.units.find(u=>u.id===p.target&&u.hp>0);if(u){p.tx=u.x;p.ty=u.y-20;}if(dist(p,{x:p.tx,y:p.ty})<340*dt+10){if(u)damageHero(r,u,p.power);p.life=0;}else move(p,{x:p.tx,y:p.ty},340,dt);}
 r.hostile=r.hostile.filter(p=>p.life>0);r.shots=r.shots.filter(p=>p.life>0);r.enemies=r.enemies.filter(e=>e.hp>0);
 if(g.crystal<=0){g.phase='lost';return;}
 if(r.spawned===def.types.length&&r.enemies.length===0){r.reward=45+g.wave*5;r.gems=8+g.wave*2+(g.wave%5===0?15:0);r.stars=1+Number(g.crystal>=80)+Number(r.fallen===0&&r.time<=75);g.medals[g.wave-1]=Math.max(g.medals[g.wave-1]||0,r.stars);g.coins+=r.reward;g.gems+=r.gems;g.phase=g.wave===20?'won':'reward';}
}
export function serialize(g){let d=campaign(g);if(['battle','paused','lost'].includes(g.phase)&&g.checkpoint)d={...clone(g.checkpoint),muted:g.muted,speed:g.speed};if(['reward','won'].includes(g.phase))d.lastReward={earned:g.run?.earned??0,reward:g.run?.reward??0,gems:g.run?.gems??0,stars:g.run?.stars??0,time:Math.round(g.run?.time??0),interrupts:g.run?.interrupts??0};return JSON.stringify(d);}
export function restore(raw){try{const d=JSON.parse(raw);if(d.version!==1||!Number.isInteger(d.wave)||d.wave<1||d.wave>20||!['prep','reward','won'].includes(d.phase)||!Number.isInteger(d.coins)||d.coins<0||d.coins>1000000||!Number.isInteger(d.gems)||d.gems<0||d.gems>1000000||!Array.isArray(d.units)||d.units.length<1||d.units.length>CAPACITY||!Number.isInteger(d.nextId)||d.nextId<2||!Number.isFinite(d.crystal)||d.crystal<0||d.crystal>100||!Array.isArray(d.discovered)||d.discovered.some(k=>!CHARACTERS[k]))throw 0;const ids=new Set(),slots=new Set();for(const u of d.units){if(!Number.isInteger(u.tier)||!CHARACTERS[keyOf(u)]||!Number.isInteger(u.id)||u.id<1||u.id>=d.nextId||ids.has(u.id)||(u.slot!==null&&(!Number.isInteger(u.slot)||!SLOTS[u.slot]||slots.has(u.slot))))throw 0;ids.add(u.id);if(u.slot!==null)slots.add(u.slot);}if(!slots.size||(d.phase==='reward'&&d.wave===20)||(d.phase==='won'&&d.wave!==20))throw 0;if(d.lastReward&&['earned','reward','gems'].some(k=>!Number.isInteger(d.lastReward[k])||d.lastReward[k]<0||d.lastReward[k]>1000000))throw 0;if(d.lastReward&&d.lastReward.stars!==undefined&&(!Number.isInteger(d.lastReward.stars)||d.lastReward.stars<0||d.lastReward.stars>3))throw 0;return {...fresh(),...d,medals:Array.from({length:20},(_,i)=>Number.isInteger(d.medals?.[i])?Math.max(0,Math.min(3,d.medals[i])):0),discovered:[...new Set([...d.discovered,...d.units.map(keyOf)])],muted:d.muted!==false,speed:d.speed===2?2:1,checkpoint:null,run:d.lastReward?{...d.lastReward,units:[],enemies:[],shots:[],fx:[],time:0}:null};}catch{return fresh();}}
