import {THREE,movePlayer} from '../world.js';
import {AVATAR_COLORS,distance,clamp} from '../rules.js';
export const COLLECTION=[
 ['트랄랄레로',0x87d6ec,2],['퉁퉁 사후르',0xc48c68,3],['발레리나 카푸치나',0xf6b3cf,4],['봄바르디로',0x91bf82,5],['카푸치노 닌자',0xa599d5,6],['리릴리 라릴라',0xe5d580,8],['샤크 스타',0x7ca7e6,10],['딸기 엘프',0xf492a6,12],['레몬 드래곤',0xd9e789,15],['코스믹 킹',0xb48cea,20],['레인보우 피닉스',0xecb8e7,28],['황금 유니콘',0xf3d37f,40]
];
export class Game{
 constructor(world,ui,progress,config){Object.assign(this,{world,ui,progress,config});this.reset();}
 reset(){const w=this.world;w.clear();w.environment(0x202043,0x30264d);w.hemi.intensity=2.8;w.sun.intensity=2.3;w.ground(0x485b78,65);this.time=0;this.ended=false;this.carry=null;this.shield=0;this.shieldMesh=null;this.shieldCD=0;this.invincible=0;this.caught=0;this.delivered=0;this.bankTimer=0;this.stationTimer=0;this.raidTimer=32;this.interactCooldown=0;this.owned=[];this.pods=[];this.guards=[];this.dust=0;
  this.player=w.character(AVATAR_COLORS[this.progress.color]);this.player.position.set(0,0,16);w.follow(this.player.position);w.box(15,.2,10,0x547e92,0,.1,17);w.ring(0,17,6,0x8bfff0,.23);w.label('MY VAULT · 내 기지',0,4,20,'#b6fff0',7);
  for(const x of [-8.5,8.5]){w.box(.3,4,12,0x7e8ed3,x,2,17);w.box(.38,.08,12,0x9bfbe9,x,4,17,w.stage,{emissive:0x4eeccc,emissiveIntensity:1});}
  const saved=[...new Set(this.progress.collection)].filter(i=>COLLECTION[i]).slice(0,10);for(const [i,item] of saved.entries())this.addOwned(item,i);
  for(let i=0;i<10;i++){const x=(i%5-2)*6,z=i<5?-12:-22;w.cylinder(1,1.2,.6,0x263454,x,.3,z);const id=i===9?9+Math.floor(Math.random()*3):i;const creature=w.creature(id,COLLECTION[id][1]);creature.position.set(x,.65,z);w.ring(x,z,1.15,COLLECTION[id][1],.66);w.label(COLLECTION[id][0],x,3.6,z,'#f0e2ff',4.5);this.pods.push({x,z,id,mesh:creature,cooldown:0});}
  for(let i=0;i<3+this.config.difficulty;i++){const mesh=w.character(0xb271c5,{scale:1.1});mesh.position.set((i-2)*5,0,-8);w.box(.65,.22,.5,0x292b4f,0,1.94,0,mesh);this.guards.push({mesh,home:mesh.position.clone(),phase:i*2,raid:false});}
  for(let i=0;i<12;i++){const x=(i%2===0?-1:1)*(19+i%3),z=-25+Math.floor(i/2)*8;const g=w.group(x,0,z);w.box(3,4+i%4,4,[0x624879,0x45647e,0x53608c][i%3],0,2+i%4/2,0,g);for(let j=0;j<3;j++)w.box(.45,.7,.04,0xffcbeb,-.8+j*.8,2,2.03,g,{emissive:0xa26bb3,emissiveIntensity:.6});}
  this.pet=null;if(this.progress.upgrades.pet)this.makePet();this.ui.goal('위쪽 진열대로 가서 E로 훔치고, 아래쪽 내 기지에서 E로 보관하세요.');this.controls();this.ui.actions([{key:'KeyE',label:'훔치기 / 보관',action:()=>this.interact()},{key:'KeyQ',label:'보호막',action:()=>this.activateShield()}]);this.hud();
 }
 addOwned(id,index=this.owned.length){if(index>=10)return false;const x=(index%5-2)*2.5,z=15+Math.floor(index/5)*4,mesh=this.world.creature(id,COLLECTION[id][1]);mesh.position.set(x,.5,z);this.world.cylinder(.7,.8,.5,0x233e58,x,.25,z);this.owned.push({id,mesh,x,z});return true;}
 makePet(){if(this.pet)this.world.remove(this.pet);this.pet=this.world.creature(1,0xffc988);this.pet.scale.setScalar(.55);this.pet.position.copy(this.player.position);}
 income(){return this.owned.reduce((sum,p)=>sum+COLLECTION[p.id][2],0)*(1+(this.progress.upgrades.rebirth||0)*.5);}
 cost(key){return {speed:80,shield:140,pet:220}[key]*(1+(this.progress.upgrades[key]||0));}
 buy(key){if((this.progress.upgrades[key]||0)>=(key==='pet'?1:4))return;if(this.ui.spend(this.cost(key))){this.progress.upgrades[key]=(this.progress.upgrades[key]||0)+1;if(key==='pet')this.makePet();this.ui.save();this.controls();}}
 controls(){this.ui.controls('시티 업그레이드',[
  {text:'컬렉션 '+this.owned.length+'/10 · 초당 '+this.income().toFixed(1)+' 코인'},
  ...['speed','shield','pet'].map(key=>({label:{speed:'빠른 발',shield:'튼튼한 보호막',pet:'여우 경호원'}[key]+` · ${this.cost(key)} 코인`,disabled:(this.progress.upgrades[key]||0)>=(key==='pet'?1:4),click:()=>this.buy(key)})),
  {label:'환생 · 2,000 코인',small:'컬렉션을 비우고 수익 배율 +50%. 이동·보호막·펫은 유지해요.',click:()=>{if(this.progress.coins<2000){this.ui.toast('환생하려면 2,000 코인이 필요해요.');return;}this.ui.confirm('환생할까요?','컬렉션과 코인을 새로 시작하고 수익 배율이 50% 높아져요.',()=>{this.progress.coins=0;this.progress.collection=[];this.progress.upgrades.rebirth=(this.progress.upgrades.rebirth||0)+1;this.ui.save();this.reset();this.ui.toast('새로운 시작! 수익 배율이 높아졌어요.');});}},
  {text:'미션: 한 번의 탐험에서 5개를 보관하면 보너스 150 코인!'}
 ]);}
 interact(){if(this.interactCooldown>0)return;this.interactCooldown=.35;
  if(this.carry&&distance(this.player.position,{x:0,z:17})<7){
    const id=this.carry.id;if(this.owned.length>=10){this.ui.toast('진열대가 가득 찼어요! 환생으로 더 큰 수익에 도전해요.');return;}
    if(this.owned.some(p=>p.id===id)){this.ui.reward(COLLECTION[id][2]*10);this.ui.toast('이미 가진 친구예요. 교환 보너스를 받았어요!');}else{this.addOwned(id);this.progress.collection=this.owned.map(p=>p.id);this.ui.toast(COLLECTION[id][0]+' 보관 성공!');}
    this.world.remove(this.carry.mesh);this.carry=null;this.delivered++;this.ui.reward(25,false);if(this.delivered===5){this.ui.reward(150);this.progress.wins++;}this.progress.best=Math.max(this.progress.best,this.owned.length);this.ui.save();this.world.burst(this.player.position.x,1,this.player.position.z,0x8ffff0,28);this.ui.sound('win');this.controls();return;
  }
  if(this.carry){this.ui.toast('아래쪽 내 기지로 돌아가 보관하세요.');return;}
  const pod=this.pods.filter(p=>!p.cooldown&&distance(p,this.player.position)<2.2).sort((a,b)=>distance(a,this.player.position)-distance(b,this.player.position))[0];if(!pod){this.ui.toast('진열대 가까이에서 E를 눌러 주세요.');return;}
  pod.cooldown=12;pod.mesh.visible=false;const mesh=this.world.creature(pod.id,COLLECTION[pod.id][1]);mesh.scale.setScalar(.65);this.carry={id:pod.id,mesh};this.ui.sound('coin');this.ui.goal('브레인롯을 들고 있어요! 경비를 피해 아래쪽 내 기지로 돌아가세요.');
 }
 activateShield(){if(this.shieldCD>0){this.ui.toast(`보호막 준비까지 ${Math.ceil(this.shieldCD)}초`);return;}this.shield=5+(this.progress.upgrades.shield||0)*1.5;this.shieldCD=25;this.world.burst(this.player.position.x,1,this.player.position.z,0x8ee9ff,22);this.ui.sound('jump');}
 capture(){if(this.invincible||this.shield)return;this.caught++;this.invincible=3;if(this.carry){this.world.remove(this.carry.mesh);this.carry=null;}this.progress.coins=Math.max(0,this.progress.coins-Math.min(25,Math.floor(this.progress.coins*.05)));this.player.position.set(0,0,20);this.ui.input.target=null;this.ui.save();this.ui.sound('hit');this.ui.toast('경비에게 들켰어요! 기지에서 다시 출발해요.');this.ui.goal('보호막을 사용하면 경비를 잠시 따돌릴 수 있어요.');}
 tick(dt,input){this.time+=dt;this.shield=Math.max(0,this.shield-dt);this.shieldCD=Math.max(0,this.shieldCD-dt);this.invincible=Math.max(0,this.invincible-dt);this.interactCooldown-=dt;const speed=movePlayer(this.player,input,dt,(5.8+(this.progress.upgrades.speed||0)*.45)*(this.carry?.86:1),24);this.world.animateCharacter(this.player,speed,this.time);if(this.carry){this.carry.mesh.position.copy(this.player.position).add(new THREE.Vector3(0,2.25,0));this.carry.mesh.rotation.y=this.time;this.player.userData.leftArm.rotation.x=-2;this.player.userData.rightArm.rotation.x=-2;}
  if(this.shield>0){if(!this.shieldMesh)this.shieldMesh=this.world.sphere(1.2,0x8ae2ff,0,0,0,this.world.stage,{transparent:true,opacity:.2,wireframe:true});this.shieldMesh.position.copy(this.player.position).add(new THREE.Vector3(0,1,0));this.shieldMesh.rotation.y+=dt;}else if(this.shieldMesh){this.world.remove(this.shieldMesh);this.shieldMesh=null;}
  if(this.pet){const target=this.player.position.clone().add(new THREE.Vector3(-1.2,.05,1));this.pet.position.lerp(target,Math.min(1,dt*6));this.pet.position.y=.05+Math.abs(Math.sin(this.time*7))*.13;this.pet.rotation.y=this.player.rotation.y;}
  for(const pod of this.pods){if(pod.cooldown>0){pod.cooldown=Math.max(0,pod.cooldown-dt);pod.mesh.visible=pod.cooldown===0;}else{pod.mesh.position.y=.65+Math.sin(this.time*2+pod.id)*.12;pod.mesh.rotation.y=Math.sin(this.time*.7+pod.id)*.4;}}
  for(const [index,g] of this.guards.entries()){
    const near=distance(g.mesh.position,this.player.position)<(this.carry?13:5);let target;if(this.carry&&near)target=this.player.position;else target={x:g.home.x+Math.sin(this.time*.3+g.phase)*6,z:g.home.z+Math.cos(this.time*.4+g.phase)*4};
    const dx=target.x-g.mesh.position.x,dz=target.z-g.mesh.position.z,d=Math.hypot(dx,dz),blocked=this.shield>0&&d<3||this.pet&&distance(g.mesh.position,this.pet.position)<1.5;
    if(d>.25){const velocity=(this.carry&&near?3.5+this.config.difficulty*.6:1.5)*(blocked?-1:1);g.mesh.position.x+=dx/d*velocity*dt;g.mesh.position.z+=dz/d*velocity*dt;g.mesh.rotation.y=Math.atan2(dx,dz);this.world.animateCharacter(g.mesh,Math.abs(velocity),this.time+index);}
    if(this.carry&&d<.9&&!blocked)this.capture();
  }
  this.bankTimer+=dt;if(this.bankTimer>=1){const ticks=Math.floor(this.bankTimer);this.bankTimer-=ticks;this.dust+=this.income()*ticks;const gain=Math.floor(this.dust);this.dust-=gain;if(gain)this.ui.reward(gain,false);}
  this.hud();
 }
 hud(){this.ui.stats([{label:'내 코인',value:this.progress.coins},{label:'컬렉션',value:this.owned.length+'/10'},{label:'초당 수익',value:this.income().toFixed(1)},{label:this.carry?'들고 있는 친구':'보호막',value:this.carry?COLLECTION[this.carry.id][0]:this.shield>0?Math.ceil(this.shield)+'초':this.shieldCD>0?Math.ceil(this.shieldCD)+'초 후':'준비 완료'}]);}
 pick(action,point){this.ui.input.target={x:clamp(point.x,-24,24),z:clamp(point.z,-24,24)};}
}
