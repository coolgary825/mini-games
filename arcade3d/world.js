import * as THREE from '../chess/vendor/three/three.module.js';
import {OrbitControls} from '../chess/vendor/three/OrbitControls.js';
import {clamp,distance} from './rules.js';
export {THREE};
export class World{
 constructor(host,{headless=false,onPick=()=>{},onError=()=>{}}={}){
  this.headless=headless;this.host=host;this.scene=new THREE.Scene();this.stage=new THREE.Group();this.scene.add(this.stage);this.fx=new THREE.Group();this.scene.add(this.fx);this.effects=[];this.materials=new Map();this.time=0;this.camera=new THREE.PerspectiveCamera(46,1,.1,220);this.camera.position.set(0,16,19);this.target=new THREE.Vector3();this.followTarget=null;
  this.hemi=new THREE.HemisphereLight(0xf1f7ff,0x65717a,2.5);this.scene.add(this.hemi);this.sun=new THREE.DirectionalLight(0xffecd1,3);this.sun.position.set(-12,28,16);this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);Object.assign(this.sun.shadow.camera,{left:-32,right:32,top:32,bottom:-32,far:100});this.sun.shadow.normalBias=.09;this.scene.add(this.sun);
  if(headless)return;
  this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.2;host.append(this.renderer.domElement);
  this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();onError();});
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.enablePan=false;this.controls.minPolarAngle=.1;this.controls.maxPolarAngle=1.25;this.controls.minDistance=9;this.controls.maxDistance=55;
  this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();let down=null,moved=false,count=0;
  const canvas=this.renderer.domElement;canvas.addEventListener('pointerdown',e=>{count++;if(count>1)moved=true;else{down=[e.clientX,e.clientY];moved=false;}});canvas.addEventListener('pointermove',e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])>8)moved=true;});canvas.addEventListener('pointercancel',()=>{down=null;count=0;moved=true;});canvas.addEventListener('pointerup',e=>{count=Math.max(0,count-1);if(down&&!moved&&e.button===0){const r=canvas.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);const hits=this.raycaster.intersectObjects(this.stage.children,true);if(hits[0]){let object=hits[0].object;while(object.parent!==this.stage&&!object.userData.action)object=object.parent;onPick(object.userData.action||null,hits[0].point);}}if(!count)down=null;});
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.resize();
 }
 mat(color,options={}){const key=JSON.stringify([color,options]);if(!this.materials.has(key))this.materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.7,...options}));return this.materials.get(key);}
 mesh(geometry,color,x=0,y=0,z=0,parent=this.stage,options={}){const m=new THREE.Mesh(geometry,this.mat(color,options));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 box(w,h,d,color,x=0,y=0,z=0,parent=this.stage,options={}){return this.mesh(new THREE.BoxGeometry(w,h,d),color,x,y,z,parent,options);}
 sphere(r,color,x=0,y=0,z=0,parent=this.stage,options={}){return this.mesh(new THREE.SphereGeometry(r,16,12),color,x,y,z,parent,options);}
 cylinder(top,bottom,h,color,x=0,y=0,z=0,parent=this.stage,options={}){return this.mesh(new THREE.CylinderGeometry(top,bottom,h,16),color,x,y,z,parent,options);}
 group(x=0,y=0,z=0){const g=new THREE.Group();g.position.set(x,y,z);this.stage.add(g);return g;}
 ground(color,size=65,y=-.25){return this.box(size,.5,size,color,0,y,0);}
 environment(sky,fog=sky){this.scene.background=new THREE.Color(sky);this.scene.fog=new THREE.Fog(fog,45,120);}
 label(text,x,y,z,color='#ffffff',size=2){const group=this.group(x,y,z);if(this.headless)return group;const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='rgba(12,22,40,.78)';ctx.beginPath();ctx.roundRect(8,8,496,112,22);ctx.fill();ctx.font='bold 42px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,256,68);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false}));sprite.scale.set(size,size/4,1);group.add(sprite);return group;}
 tree(x,z,scale=1,color=0x368c69){const g=this.group(x,0,z);g.scale.setScalar(scale);this.cylinder(.14,.22,1.7,0x816045,0,.85,0,g);for(let i=0;i<3;i++)this.mesh(new THREE.ConeGeometry(1.05-i*.23,1.5,7),color,0,1.65+i*.65,0,g);return g;}
 rock(x,z,scale=1){const g=this.mesh(new THREE.DodecahedronGeometry(scale,0),0x8396a0,x,scale*.5,z);g.scale.y=.65;return g;}
 flower(x,z,color=0xffd57a){const g=this.group(x,0,z);this.cylinder(.025,.025,.45,0x498754,0,.22,0,g);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;this.sphere(.12,color,Math.cos(a)*.14,.48,Math.sin(a)*.14,g);}this.sphere(.085,0xffeaac,0,.52,0,g);return g;}
 character(color=0x72c9ff,{kind='human',scale=1}={}){
  const g=this.group();g.scale.setScalar(scale);g.userData.kind=kind;
  const body=this.box(.62,.7,.4,color,0,1.02,0,g);const head=this.box(.5,.48,.46,0xffd5b0,0,1.62,0,g);
  this.box(.52,.16,.48,0x3b3445,0,1.89,0,g);
  for(const side of [-1,1]){this.box(.06,.075,.015,0x253443,side*.115,1.65,.238,g);this.box(.1,.045,.03,0xf19f9c,side*.17,1.54,.24,g);}
  this.box(.12,.025,.02,0x9a6056,0,1.51,.243,g);
  const limbs={};for(const [name,x,y] of [['leftLeg',-.18,.62],['rightLeg',.18,.62],['leftArm',-.45,1.29],['rightArm',.45,1.29]]){const limb=new THREE.Group();limb.position.set(x,y,0);g.add(limb);this.box(name.includes('Leg')?.25:.2,.55,.28,name.includes('Leg')?0x354664:color,0,-.25,0,limb);if(name.includes('Leg'))this.box(.27,.14,.42,0xf8f3e8,0,-.51,.07,limb);else this.sphere(.105,0xffd5b0,0,-.54,0,limb);limbs[name]=limb;}
  g.userData={...g.userData,...limbs,body,head};return g;
 }
 animateCharacter(g,speed,t,action=0){const d=g.userData;if(!d.leftLeg)return;const swing=Math.sin(t*10)*Math.min(.75,speed*.16);d.leftLeg.rotation.x=swing;d.rightLeg.rotation.x=-swing;d.leftArm.rotation.x=-swing;d.rightArm.rotation.x=action?-.7-Math.sin(action*Math.PI)*1.6:swing;d.body.position.y=1.02+Math.abs(Math.sin(t*10))*Math.min(.045,speed*.01);}
 creature(index,color=0xa7da85){const g=this.group();const shape=index%5;this.sphere(.55,color,0,.6,0,g);if(shape===0){this.box(.8,.28,1.15,color,0,.66,0,g);this.mesh(new THREE.ConeGeometry(.25,.4,3),color,0,1.08,0,g);}if(shape===1){for(const s of [-1,1]){const ear=this.sphere(.2,color,s*.32,1.19,0,g);ear.scale.set(.55,2,.5);}}if(shape===2){this.box(.8,.55,.6,color,0,.7,0,g);for(const s of [-1,1])this.mesh(new THREE.ConeGeometry(.14,.4,8),0xf8e0b7,s*.32,1.18,0,g);}if(shape===3){this.sphere(.25,0xf4b9cf,0,1.18,0,g);for(const s of [-1,1]){const wing=this.sphere(.45,color,s*.64,.7,0,g);wing.scale.set(1,.14,.65);}}if(shape===4){this.cylinder(.47,.7,.25,color,0,.25,0,g);this.sphere(.45,color,0,.75,0,g);this.mesh(new THREE.ConeGeometry(.55,.5,8),0xffd17c,0,1.3,0,g);}
  for(const side of [-1,1]){this.sphere(.15,0xffffff,side*.2,.82,.45,g);this.sphere(.07,0x18324b,side*.2,.83,.58,g);this.sphere(.12,0xf3ceaa,side*.33,.11,.18,g);}return g;}
 coin(x,y,z,color=0xffd46b){const c=this.cylinder(.23,.23,.065,color,x,y,z,this.stage,{metalness:.65,roughness:.25});c.rotation.x=Math.PI/2;return c;}
 ring(x,z,r,color,y=.04){const m=this.mesh(new THREE.RingGeometry(r-.06,r,64),color,x,y,z,this.stage,{transparent:true,opacity:.65,side:THREE.DoubleSide});m.rotation.x=-Math.PI/2;m.castShadow=false;return m;}
 beam(a,b,color,width=.07){const mid=new THREE.Vector3().addVectors(a,b).multiplyScalar(.5),length=a.distanceTo(b);const m=this.cylinder(width,width,length,color,mid.x,mid.y,mid.z,this.fx,{emissive:color,emissiveIntensity:.8});m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());this.effects.push({mesh:m,life:.13,total:.13,kind:'beam'});}
 burst(x,y,z,color=0xffd77e,n=20){for(let i=0;i<n;i++){const m=this.mesh(new THREE.IcosahedronGeometry(.075,0),color,x,y,z,this.fx,{emissive:color,emissiveIntensity:.3});const a=Math.random()*Math.PI*2;this.effects.push({mesh:m,life:.5+Math.random()*.5,total:1,v:new THREE.Vector3(Math.cos(a)*(1+Math.random()*3),2+Math.random()*4,Math.sin(a)*(1+Math.random()*3))});}}
 remove(object){if(!object)return;object.removeFromParent();object.traverse(o=>{o.geometry?.dispose();if(o.isSprite){o.material.map?.dispose();o.material.dispose();}});}
 clear(){this.stage.children.slice().forEach(o=>this.remove(o));this.effects.forEach(e=>this.remove(e.mesh));this.effects=[];}
 follow(point){this.followTarget=point;if(this.controls)this.controls.enabled=false;}
 orbit(x=0,y=0,z=0,distance=20){this.followTarget=null;this.target.set(x,y,z);this.camera.position.set(x+distance*.5,y+distance*.65,z+distance);if(this.controls){this.controls.enabled=true;this.controls.target.copy(this.target);this.controls.update();}else this.camera.lookAt(this.target);}
 resize(){if(this.headless)return;const r=this.host.getBoundingClientRect();if(!r.width||!r.height)return;this.renderer.setSize(r.width,r.height);this.camera.aspect=r.width/r.height;this.camera.updateProjectionMatrix();}
 update(dt){this.time+=dt;if(this.followTarget){const p=this.followTarget;this.target.lerp(new THREE.Vector3(p.x,p.y+.8,p.z-1),Math.min(1,dt*6));this.camera.position.lerp(new THREE.Vector3(p.x,p.y+13,p.z+16),Math.min(1,dt*6));this.camera.lookAt(this.target);this.sun.position.set(p.x-12,p.y+28,p.z+16);this.sun.target.position.copy(p);this.scene.add(this.sun.target);}else this.controls?.update();
  this.effects=this.effects.filter(e=>{e.life-=dt;if(e.life<=0){this.remove(e.mesh);return false;}if(e.v){e.v.y-=9*dt;e.mesh.position.addScaledVector(e.v,dt);e.mesh.rotation.x+=dt*4;e.mesh.scale.setScalar(Math.max(.02,e.life/e.total));}return true;});
 }
 render(){this.renderer?.render(this.scene,this.camera);}
 dispose(){this.clear();this.materials.forEach(m=>m.dispose());this.controls?.dispose();this.observer?.disconnect();this.renderer?.dispose();this.renderer?.domElement.remove();}
}
export function movePlayer(player,input,dt,speed,bounds=Infinity){
 let x=input.x,z=input.z;const n=Math.hypot(x,z);if(n>1){x/=n;z/=n;}
 if(!n&&input.target){const dx=input.target.x-player.position.x,dz=input.target.z-player.position.z,d=Math.hypot(dx,dz);if(d>.15){x=dx/d;z=dz/d;}else input.target=null;}
 player.position.x=clamp(player.position.x+x*speed*dt,-bounds,bounds);player.position.z=clamp(player.position.z+z*speed*dt,-bounds,bounds);if(x||z)player.rotation.y=Math.atan2(x,z);return Math.hypot(x,z)*speed;
}
