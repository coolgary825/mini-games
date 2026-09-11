import {THREE,movePlayer} from '../world.js';
import {supportAt,AVATAR_COLORS,distance} from '../rules.js';
export class Game{
 constructor(world,ui,progress,config){Object.assign(this,{world,ui,progress,config});this.mode='obby';this.reset();}
 reset(){const w=this.world;w.clear();w.environment(0x94cef4,0xa9d9f5);w.hemi.intensity=2.8;w.sun.intensity=3;this.ended=false;this.time=0;this.roundTime=0;this.vy=0;this.onGround=true;this.hearts=[6,4,3][this.config.difficulty];this.checkpoint=0;this.coins=[];this.platforms=[];this.hazards=[];this.meteors=[];this.dashTime=0;this.dashCooldown=0;this.collected=0;this.score=0;this.jumps=0;
  this.player=w.character(AVATAR_COLORS[this.progress.color]);this.player.position.set(0,0,0);w.follow(this.player.position);
  if(this.mode==='obby')this.buildObby();else this.buildArena();
  for(let i=0;i<24;i++){const g=w.group((Math.random()-.5)*100,10+Math.random()*8,-Math.random()*100);for(let j=0;j<3;j++){const cloud=w.sphere(1.5,0xffffff,j*1.3,0,0,g);cloud.scale.set(1.6,.55,1);}g.userData.cloud=true;}
  this.ui.goal(this.mode==='obby'?'빛나는 체크포인트를 따라 하늘섬 정상에 도착하세요.':this.mode==='coins'?'60초 동안 하늘 정원의 코인을 최대한 모으세요.':'45초 동안 떨어지는 운석을 피해 살아남으세요.');this.controls();this.hud();
 }
 platform(x,y,z,width=3,depth=3,color=0x70c58e){const w=this.world,p={x,y,z,w:width,d:depth,baseX:x,moving:false};p.mesh=w.box(width,.65,depth,color,x,y-.325,z);w.box(width*.9,.5,depth*.9,0xb9e6ee,x,y-.8,z);this.platforms.push(p);return p;}
 buildObby(){const w=this.world;this.platform(0,0,0,7,7);w.label('출발 · SPACE 점프',0,3,0,'#ffffff',5);
  for(let i=1;i<=26;i++){const x=Math.sin(i*.9)*4,y=i*.5,z=-i*3.5,width=[3.4,3.0,2.65][this.config.difficulty];const p=this.platform(x,y,z,width,width,i%6===0?0x6bdacb:i%3===0?0xa9a0ed:0x79bf8d);if(i%7===4){p.moving=true;p.amp=.55+.2*this.config.difficulty;p.phase=i;}
    if(i%6===0){w.ring(x,z,.75,0xffd665,y+.035);w.label('체크포인트',x,y+2.5,z,'#ffe394',3);}
    const coin=w.coin(x,y+1,z);this.coins.push({mesh:coin,x,y:y+1,z,p,got:false});if(i%5===3){const hazard=w.mesh(new THREE.ConeGeometry(.35,.55,5),0xfa7483,x+.65,y+.28,z-.7);this.hazards.push({mesh:hazard,p,xOffset:.65,zOffset:-.7});}
  }
  const end=this.platform(0,14,-96,7,6,0xffd27e);this.finishPlatform=end;w.cylinder(.05,.05,3,0xffffff,0,15.5,-96);const flag=w.box(1.4,.7,.05,0xff7cb8,.7,16.4,-96);w.label('GOAL',0,18,-96,'#fff2b3',4);w.box(2,1,2,0xeabb6a,0,14.5,-97.5);
 }
 buildArena(){this.platform(0,0,0,24,24,this.mode==='coins'?0x70c6a7:0x7c83cb);for(let i=0;i<20;i++)this.spawnCoin();this.world.label(this.mode==='coins'?'코인 러시':'메테오 서바이벌',0,3,-11,'#ffffff',6);}
 spawnCoin(){const x=(Math.random()-.5)*21,z=(Math.random()-.5)*21,mesh=this.world.coin(x,1,z);this.coins.push({mesh,x,y:1,z,got:false});}
 controls(){this.ui.controls('하늘섬 모험',[
  {label:'모험 선택',options:[['obby','하늘섬 오비'],['coins','코인 러시'],['meteor','메테오 생존']],value:this.mode,change:v=>{this.mode=v;this.reset();}},
  {label:'아바타 색',options:AVATAR_COLORS.map((_,i)=>[String(i),['하늘','핑크','민트','골드','보라','크림'][i]]),value:String(this.progress.color),change:v=>{this.progress.color=Number(v);this.player.userData.body.material=this.world.mat(AVATAR_COLORS[Number(v)]);this.ui.save();}},
  {label:'이중 점프 · '+(this.progress.upgrades.double?'보유 중':'120 코인'),disabled:!!this.progress.upgrades.double,click:()=>{if(this.ui.spend(120)){this.progress.upgrades.double=1;this.ui.save();this.controls();}}},
  {label:'더 빠른 발 · '+(this.progress.upgrades.speed?'보유 중':'100 코인'),disabled:!!this.progress.upgrades.speed,click:()=>{if(this.ui.spend(100)){this.progress.upgrades.speed=1;this.ui.save();this.controls();}}}
 ]);this.ui.actions([{key:'Space',label:'점프',action:()=>this.jump()},{key:'KeyE',label:'대시',action:()=>this.dash()}]);}
 jump(){if(this.ended)return;if(this.onGround||this.progress.upgrades.double&&this.jumps<2){this.vy=8.5;this.jumps++;this.onGround=false;this.world.burst(this.player.position.x,this.player.position.y+.1,this.player.position.z,0xe4f8ff,8);this.ui.sound('jump');}}
 dash(){if(this.dashCooldown<=0){this.dashTime=.28;this.dashCooldown=2;this.world.burst(this.player.position.x,this.player.position.y+1,this.player.position.z,0x91e6ff,10);}}
 respawn(){this.hearts--;this.world.burst(this.player.position.x,this.player.position.y,this.player.position.z,0xff8eab,18);this.ui.sound('hit');if(this.hearts<=0){this.finish(false);return;}const p=this.platforms[this.checkpoint]||this.platforms[0];this.player.position.set(p.x,p.y+.2,p.z);this.vy=0;this.jumps=0;this.onGround=false;this.invincible=1.5;this.ui.toast('체크포인트에서 다시 도전!');}
 tick(dt,input){if(this.ended)return;const w=this.world;this.time+=dt;this.roundTime+=dt;this.dashCooldown-=dt;this.dashTime-=dt;this.invincible=Math.max(0,(this.invincible||0)-dt);
  for(const p of this.platforms){if(p.moving){const old=p.x;p.x=p.baseX+Math.sin(this.time*1.3+p.phase)*p.amp;p.mesh.position.x=p.x;if(this.support===p&&this.onGround)this.player.position.x+=p.x-old;}}
  const oldY=this.player.position.y,speed=movePlayer(this.player,input,dt,(5.2+(this.progress.upgrades.speed?.7:0))*(this.dashTime>0?2:1));this.vy-=19*dt;this.player.position.y+=this.vy*dt;
  this.support=this.vy<=0?supportAt(this.platforms,this.player.position.x,this.player.position.z,oldY,this.player.position.y):null;
  if(this.support){this.player.position.y=this.support.y;this.vy=0;this.onGround=true;this.jumps=0;const i=this.platforms.indexOf(this.support);if(i%6===0&&i>this.checkpoint&&this.mode==='obby'){this.checkpoint=i;this.ui.toast('체크포인트 저장!');w.burst(this.support.x,this.support.y+1,this.support.z,0xffd677,25);}}
  else this.onGround=false;
  w.animateCharacter(this.player,speed,this.time);if(!this.onGround){this.player.userData.leftArm.rotation.x=-1.3;this.player.userData.rightArm.rotation.x=-1.3;}
  for(const c of this.coins){if(c.got)continue;if(c.p)c.x=c.p.x;c.mesh.position.set(c.x,c.y+Math.sin(this.time*3+c.x)*.12,c.z);c.mesh.rotation.z+=dt*2;if(Math.hypot(c.x-this.player.position.x,c.z-this.player.position.z)<.65&&Math.abs(c.y-this.player.position.y-1)<1){c.got=true;w.remove(c.mesh);this.collected++;this.ui.reward(5,false);w.burst(c.x,c.y,c.z,0xffdb73,10);this.ui.sound('coin');if(this.mode==='coins')this.spawnCoin();}}
  for(const h of this.hazards){h.mesh.position.x=h.p.x+h.xOffset;if(!this.invincible&&distance(this.player.position,h.mesh.position)<.42&&Math.abs(this.player.position.y-h.p.y)<.6){this.respawn();break;}}
  if(this.mode==='meteor'&&Math.floor(this.roundTime*1.8)>Math.floor((this.roundTime-dt)*1.8)){const x=(Math.random()-.5)*23,z=(Math.random()-.5)*23,m=w.sphere(.5,0xf97b5d,x,14,z,this.world.stage,{emissive:0xd74524,emissiveIntensity:.6});const warning=w.ring(x,z,.8,0xff856d);this.meteors.push({mesh:m,warning});}
  this.meteors=this.meteors.filter(m=>{m.mesh.position.y-=dt*(6+this.config.difficulty*2);if(m.mesh.position.y<1){w.burst(m.mesh.position.x,.2,m.mesh.position.z,0xffa659,16);if(!this.invincible&&distance(m.mesh.position,this.player.position)<1.3)this.respawn();w.remove(m.mesh);w.remove(m.warning);return false;}return true;});
  if(this.player.position.y<(this.mode==='obby'?(this.platforms[this.checkpoint]?.y||0)-10:-8))this.respawn();
  if(this.mode==='obby'&&this.support===this.finishPlatform)this.finish(true);if(this.mode==='coins'&&this.roundTime>=60)this.finish(true);if(this.mode==='meteor'&&this.roundTime>=45)this.finish(true);this.hud();
 }
 hud(){this.ui.stats([{label:'하트',value:'♥'.repeat(Math.max(0,this.hearts))},{label:this.mode==='obby'?'체크포인트':'남은 시간',value:this.mode==='obby'?`${Math.floor(this.checkpoint/6)}/4`:`${Math.max(0,Math.ceil((this.mode==='coins'?60:45)-this.roundTime))}초`},{label:'모은 코인',value:this.collected},{label:'내 코인',value:this.progress.coins}]);}
 finish(won){if(this.ended)return;this.ended=true;const bonus=won?80+this.collected*2:10;this.ui.reward(bonus);if(won)this.progress.wins++;this.progress.best=Math.max(this.progress.best,this.collected);this.ui.save();this.ui.end(won?'하늘섬 도전 성공!':'다시 날아오를 시간!',`${this.collected}개를 모았어요. 보너스 ${bonus} 코인!`,()=>this.reset());}
 pick(action,point){this.ui.input.target={x:point.x,z:point.z};}
}
