import * as THREE from './vendor/three/three.module.js';
import {OrbitControls} from './vendor/three/OrbitControls.js';

const THEMES={ocean:[0xb9d5e2,0x426e91],forest:[0xe0e6cc,0x527461],walnut:[0xe3c598,0x885b3a],violet:[0xd8cce8,0x796294]};
export const MOVE_DURATION={p:580,n:900,b:780,r:650,q:920,k:820};
export const squarePoint=s=>({x:s.charCodeAt(0)-97-3.5,z:3.5-(Number(s[1])-1)});
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
// Motion profiles are separate for every piece, including taking and celebrating.
export function motionPose(type,t,capturing=false){
  const wave=Math.sin(Math.PI*t),progress=ease(t);
  switch(type){
    case 'p':return {progress,y:Math.abs(Math.sin(Math.PI*t*2))*.19,tilt:wave*.13,spin:0,scale:1+wave*.03};
    case 'n':return {progress,y:wave*1.65,tilt:-Math.sin(Math.PI*t*2)*.35,spin:0,scale:1};
    case 'b':return {progress,y:wave*.4,tilt:0,spin:Math.PI*2*progress,scale:1};
    case 'r':return {progress:1-Math.pow(1-t,3),y:Math.sin(t*Math.PI*6)*wave*.025,tilt:wave*(capturing?.2:.08),spin:0,scale:1};
    case 'q':return {progress,y:wave*.7,tilt:0,spin:Math.PI*2*progress,scale:1+wave*.06};
    default:return {progress,y:wave*.15,tilt:-wave*.12,spin:0,scale:1};
  }
}
export function capturePose(type,t){
  const a=ease(t);
  switch(type){
    case 'p':return {y:-a*.8,rx:a*Math.PI/2,rz:0,spin:0,scale:1-a*.85};
    case 'n':return {y:Math.sin(t*Math.PI)*.8-a*.4,rx:0,rz:a*Math.PI*.8,spin:a*2,scale:1-a};
    case 'b':return {y:a*.65,rx:0,rz:0,spin:a*8,scale:1-a};
    case 'r':return {y:-a,rx:0,rz:Math.sin(t*25)*(1-t)*.15,spin:0,scale:1-a*.9};
    case 'q':return {y:a*1.2,rx:0,rz:0,spin:-a*6,scale:1-a};
    default:return {y:-a*.2,rx:0,rz:a*Math.PI/2,spin:0,scale:1-a*.2};
  }
}
export function victoryPose(type,t){
  const wave=Math.sin(t*Math.PI*2);
  switch(type){
    case 'p':return {y:Math.abs(wave)*.27,rx:0,rz:wave*.13,spin:0};
    case 'n':return {y:Math.abs(wave)*.65,rx:-Math.abs(wave)*.45,rz:0,spin:0};
    case 'b':return {y:.15+wave*.12,rx:0,rz:0,spin:t*3};
    case 'r':return {y:Math.max(0,wave)*.13,rx:0,rz:wave*.075,spin:0};
    case 'q':return {y:.3+wave*.2,rx:0,rz:0,spin:t*2.5};
    default:return {y:Math.abs(wave)*.09,rx:Math.max(0,wave)*.18,rz:0,spin:0};
  }
}

export function createPiece(type,color){
  const group=new THREE.Group();group.userData={type,color};
  const body=new THREE.MeshStandardMaterial({color:color==='w'?0xf5eee0:0x28374c,metalness:color==='w'?.17:.48,roughness:.29});
  const trim=new THREE.MeshStandardMaterial({color:color==='w'?0xc09850:0x71c5c5,metalness:.72,roughness:.25});
  const mesh=(geo,mat=body,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;};
  const lathe=points=>mesh(new THREE.LatheGeometry(points.map(p=>new THREE.Vector2(...p)),24));
  const torus=(radius,tube,y)=>{const m=mesh(new THREE.TorusGeometry(radius,tube,8,32),trim,0,y);m.rotation.x=Math.PI/2;};
  lathe([[0,0],[.3,0],[.34,.045],[.34,.11],[.30,.16],[.27,.19],[.25,.23],[.19,.27],[.16,.39],[.14,.52],[.17,.58],[0,.58]]);
  torus(.305,.021,.14);
  if(type==='p'){
    lathe([[0,.51],[.19,.51],[.22,.56],[.19,.62],[0,.62]]);
    mesh(new THREE.SphereGeometry(.22,24,16),body,0,.78);
  }else if(type==='r'){
    lathe([[0,.4],[.18,.4],[.2,.72],[.28,.78],[.28,.91],[0,.91]]);
    torus(.24,.025,.76);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;const m=mesh(new THREE.BoxGeometry(.15,.18,.15),body,Math.sin(a)*.215,.98,Math.cos(a)*.215);m.rotation.y=a;}
  }else if(type==='n'){
    lathe([[0,.47],[.22,.47],[.23,.58],[.18,.63],[0,.63]]);
    const shape=new THREE.Shape();shape.moveTo(-.22,0);shape.lineTo(-.24,.32);shape.quadraticCurveTo(-.31,.59,-.08,.75);shape.lineTo(-.05,.97);shape.lineTo(.08,.86);shape.quadraticCurveTo(.18,.78,.2,.64);shape.lineTo(.38,.49);shape.lineTo(.32,.32);shape.lineTo(.12,.35);shape.lineTo(.13,.11);shape.lineTo(.22,0);shape.closePath();
    const horse=mesh(new THREE.ExtrudeGeometry(shape,{depth:.2,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.035,bevelThickness:.035}),body,0,.58,-.1);
    horse.rotation.y=-Math.PI/2;
    // Eyes and mane make the knight recognizable from both camera sides.
    for(const side of [-1,1])mesh(new THREE.SphereGeometry(.032,10,8),trim,side*.135,1.27,-.035);
    for(let i=0;i<4;i++)mesh(new THREE.BoxGeometry(.23,.075,.1),trim,0,.82+i*.12,.19-i*.015);
  }else if(type==='b'){
    lathe([[0,.43],[.15,.43],[.13,.76],[.22,.81],[.2,.89],[0,.89]]);
    const mitre=mesh(new THREE.SphereGeometry(.235,24,20),body,0,1.1);mitre.scale.set(.82,1.4,.82);
    const slash=mesh(new THREE.BoxGeometry(.035,.29,.4),trim,0,1.17);slash.rotation.z=-.4;
    mesh(new THREE.SphereGeometry(.055,16,10),trim,0,1.46);torus(.195,.022,.85);
  }else if(type==='q'){
    lathe([[0,.45],[.16,.45],[.13,.8],[.21,.96],[.23,1.03],[.2,1.09],[.24,1.18],[0,1.18]]);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;const jewel=mesh(new THREE.ConeGeometry(.065,.25,8),trim,Math.sin(a)*.23,1.29,Math.cos(a)*.23);jewel.rotation.z=-Math.sin(a)*.28;jewel.rotation.x=Math.cos(a)*.28;mesh(new THREE.SphereGeometry(.055,12,8),trim,Math.sin(a)*.27,1.42,Math.cos(a)*.27);}
    mesh(new THREE.SphereGeometry(.1,16,12),body,0,1.37);torus(.22,.025,1.02);
  }else{
    lathe([[0,.43],[.17,.43],[.14,.84],[.22,.94],[.23,1.03],[.19,1.12],[.23,1.22],[0,1.22]]);
    mesh(new THREE.SphereGeometry(.12,16,12),body,0,1.25);
    mesh(new THREE.BoxGeometry(.095,.4,.095),trim,0,1.52);
    mesh(new THREE.BoxGeometry(.3,.095,.095),trim,0,1.58);torus(.22,.025,1.01);
  }
  if(color==='b')group.rotation.y=Math.PI;
  group.userData.baseRotation=group.rotation.y;
  return group;
}
function disposeObject(object){const geometries=new Set(),materials=new Set();object.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});geometries.forEach(g=>g.dispose());materials.forEach(m=>{m.map?.dispose();m.dispose();});}

export class Board3D{
  constructor(host,onSquare,onError){
    this.host=host;this.onSquare=onSquare;this.onError=onError;this.enabled=true;this.pieces=new Map();this.tiles=new Map();this.particles=[];this.animation=null;this.victory=null;this.fen='';this.theme='';this.flipped=null;this.snapshot=null;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x101c30);this.scene.fog=new THREE.Fog(0x101c30,25,48);
    this.camera=new THREE.OrthographicCamera(-6.4,6.4,6.4,-6.4,.1,70);this.camera.position.set(6,11,10);this.camera.lookAt(0,0,0);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.3;
    this.renderer.domElement.setAttribute('aria-label','3D 체스판 · 클릭으로 이동, 드래그로 회전, 두 손가락으로 확대');this.renderer.domElement.setAttribute('aria-hidden','true');
    host.append(this.renderer.domElement);
    this.renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();this.cancel();this.enabled=false;onError();});
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,.2,0);this.controls.enableDamping=true;this.controls.dampingFactor=.1;this.controls.enablePan=false;this.controls.minPolarAngle=.15;this.controls.maxPolarAngle=1.03;this.controls.minZoom=.78;this.controls.maxZoom=1.55;this.controls.rotateSpeed=.55;
    this.scene.add(new THREE.HemisphereLight(0xdcefff,0x384655,2.5));
    const sun=new THREE.DirectionalLight(0xffebce,3.8);sun.position.set(-4,12,6);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=sun.shadow.camera.bottom=-7;sun.shadow.camera.right=sun.shadow.camera.top=7;sun.shadow.bias=-.0006;sun.shadow.normalBias=.035;this.scene.add(sun);
    const rim=new THREE.DirectionalLight(0x81bde9,2.3);rim.position.set(6,5,-7);this.scene.add(rim);
    const base=new THREE.Mesh(new THREE.BoxGeometry(9,.3,9),new THREE.MeshStandardMaterial({color:0x203149,metalness:.55,roughness:.35}));base.position.y=-.24;base.receiveShadow=true;this.scene.add(base);
    const trim=new THREE.Mesh(new THREE.BoxGeometry(8.9,.055,8.9),new THREE.MeshStandardMaterial({color:0xad925c,metalness:.7,roughness:.3}));trim.position.y=-.08;this.scene.add(trim);
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0x111d30,roughness:.85}));plane.rotation.x=-Math.PI/2;plane.position.y=-.43;plane.receiveShadow=true;this.scene.add(plane);
    for(let rank=1;rank<=8;rank++)for(let file=0;file<8;file++){
      const sq=String.fromCharCode(97+file)+rank,pos=squarePoint(sq),dark=(file+rank)%2===1;
      const tile=new THREE.Mesh(new THREE.BoxGeometry(.998,.10,.998),new THREE.MeshStandardMaterial({color:dark?THEMES.ocean[1]:THEMES.ocean[0],roughness:.52,metalness:.12}));tile.position.set(pos.x,0,pos.z);tile.userData={square:sq,dark};tile.receiveShadow=true;this.tiles.set(sq,tile);this.scene.add(tile);
    }
    this.marks=new THREE.Group();this.scene.add(this.marks);this.effects=new THREE.Group();this.scene.add(this.effects);this.labels=new THREE.Group();this.scene.add(this.labels);this.makeLabels();
    this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();let down=null,drag=false,touches=0;
    this.renderer.domElement.addEventListener('pointerdown',e=>{touches++;if(touches>1)drag=true;else{down={x:e.clientX,y:e.clientY};drag=false;}});
    this.renderer.domElement.addEventListener('pointermove',e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)drag=true;});
    this.renderer.domElement.addEventListener('pointerup',e=>{touches=Math.max(0,touches-1);if(!down||drag||e.button!==0||this.animation){if(!touches)down=null;return;}const rect=this.renderer.domElement.getBoundingClientRect();this.pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);const hit=this.raycaster.intersectObjects([...this.pieces.values(),...this.tiles.values()],true)[0];if(hit){let object=hit.object;while(object&&!object.userData.square)object=object.parent;if(object?.userData.square)this.onSquare(object.userData.square);}down=null;});
    this.renderer.domElement.addEventListener('pointercancel',()=>{touches=0;down=null;drag=true;});
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();
    this.frame=0;this.lastFrame=0;this.tick=this.tick.bind(this);this.frame=requestAnimationFrame(this.tick);
  }
  makeLabels(){
    const label=(text,x,z,rotation=0)=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d');c.fillStyle='#c1d4e4';c.font='bold 44px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,32,34);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.23,.23),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.rotation.z=rotation;mesh.position.set(x,-.045,z);this.labels.add(mesh);};
    for(let i=0;i<8;i++){label('abcdefgh'[i],i-3.5,4.25);label('abcdefgh'[i],i-3.5,-4.25,Math.PI);label(String(i+1),-4.25,3.5-i);label(String(i+1),4.25,3.5-i,Math.PI);}
  }
  resize(){const {width,height}=this.host.getBoundingClientRect();if(width<1||height<1)return;this.renderer.setSize(width,height,false);const aspect=width/height;this.camera.left=-6.4*aspect;this.camera.right=6.4*aspect;this.camera.top=6.4;this.camera.bottom=-6.4;this.camera.updateProjectionMatrix();}
  setEnabled(enabled){if(!enabled&&this.animation)this.cancel();this.enabled=enabled;this.host.hidden=!enabled;if(enabled){this.resize();if(this.snapshot)this.sync(...this.snapshot);}}
  resetCamera(flipped=this.flipped){this.camera.position.set(flipped?-6:6,11,flipped?-10:10);this.camera.zoom=1;this.camera.updateProjectionMatrix();this.controls.target.set(0,.2,0);this.controls.update();}
  sync(game,options){
    this.snapshot=[game,options];
    if(this.flipped!==options.flipped){this.flipped=options.flipped;this.resetCamera();}
    if(this.theme!==options.theme){this.theme=options.theme;const colors=THEMES[this.theme]||THEMES.ocean;this.tiles.forEach(tile=>tile.material.color.setHex(colors[tile.userData.dark?1:0]));}
    if(!this.animation&&game.fen()!==this.fen)this.rebuild(game);
    this.updateMarks(game,options);
  }
  rebuild(game){
    for(const p of this.pieces.values()){this.scene.remove(p);disposeObject(p);}this.pieces.clear();
    for(const row of game.board())for(const p of row){if(!p)continue;const piece=createPiece(p.type,p.color),pos=squarePoint(p.square);piece.position.set(pos.x,.055,pos.z);piece.userData.square=p.square;this.pieces.set(p.square,piece);this.scene.add(piece);}
    this.fen=game.fen();
  }
  updateMarks(game,{selected,legal,last,hint,check}){
    disposeObject(this.marks);this.marks.clear();
    const mark=(sq,color,size=.91,ring=false)=>{const point=squarePoint(sq),geometry=ring?new THREE.RingGeometry(.34,.42,32):new THREE.PlaneGeometry(size,size),material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:ring?.85:.38,depthWrite:false});const m=new THREE.Mesh(geometry,material);m.rotation.x=-Math.PI/2;m.position.set(point.x,.062,point.z);this.marks.add(m);};
    if(last){mark(last.from,0xf9d269);mark(last.to,0xf9d269);}if(selected)mark(selected,0xffcb53,.96);
    for(const move of legal||[]){if(game.get(move.to))mark(move.to,0x7eefd0,1,true);else{const pos=squarePoint(move.to);const dot=new THREE.Mesh(new THREE.CircleGeometry(.13,24),new THREE.MeshBasicMaterial({color:0x193749,transparent:true,opacity:.7}));dot.rotation.x=-Math.PI/2;dot.position.set(pos.x,.066,pos.z);this.marks.add(dot);}}
    if(check){const king=game.board().flat().find(p=>p?.type==='k'&&p.color===game.turn());if(king)mark(king.square,0xff4b62,.98);}
    if(hint){const a=squarePoint(hint.from),b=squarePoint(hint.to),start=new THREE.Vector3(a.x,.25,a.z),end=new THREE.Vector3(b.x,.25,b.z),dir=end.clone().sub(start);const arrow=new THREE.ArrowHelper(dir.clone().normalize(),start,dir.length()-.15,0xffc34c,.4,.3);this.marks.add(arrow);}
  }
  burst(point,color,count=18,style='spark'){
    for(let i=0;i<count;i++){const m=new THREE.Mesh(style==='stone'?new THREE.BoxGeometry(.085,.085,.085):new THREE.SphereGeometry(.035,5,4),new THREE.MeshBasicMaterial({color,transparent:true}));m.position.copy(point);const a=Math.random()*Math.PI*2,s=.6+Math.random()*1.8;const velocity=new THREE.Vector3(Math.cos(a)*s,1+Math.random()*2.5,Math.sin(a)*s);this.effects.add(m);this.particles.push({mesh:m,velocity,born:performance.now(),life:750+Math.random()*500});}
  }
  pulse(point,color){const mesh=new THREE.Mesh(new THREE.RingGeometry(.3,.36,40),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.7,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.copy(point);mesh.position.y=.075;this.effects.add(mesh);this.particles.push({mesh,born:performance.now(),life:650,ring:true});}
  animateMove(move,game,enabled=true){
    if(!this.enabled||!enabled||this.reduced){this.rebuild(game);return Promise.resolve();}
    const piece=this.pieces.get(move.from);if(!piece){this.rebuild(game);return Promise.resolve();}
    this.cancel();
    const captureSquare=move.flags.includes('e')?move.to[0]+move.from[1]:move.to;
    const captured=move.captured?this.pieces.get(captureSquare):null;
    let rook=null;if(move.flags.includes('k')||move.flags.includes('q')){const short=move.flags.includes('k'),rank=move.from[1];rook={piece:this.pieces.get((short?'h':'a')+rank),from:squarePoint((short?'h':'a')+rank),to:squarePoint((short?'f':'d')+rank)};}
    return new Promise(resolve=>{this.animation={move,game,piece,captured,rook,from:squarePoint(move.from),to:squarePoint(move.to),start:performance.now(),duration:MOVE_DURATION[move.piece]+(captured?220:0)+(move.promotion?250:0),resolve,impact:false};});
  }
  cancel(){if(this.animation){const a=this.animation;this.animation=null;a.resolve();}this.victory=null;for(const p of this.particles){this.effects.remove(p.mesh);disposeObject(p.mesh);}this.particles=[];this.fen='';}
  celebrate(winner,enabled=true){
    if(!enabled||!this.enabled||this.reduced)return;
    this.victory={winner,start:performance.now(),duration:3500,lastBurst:0};
  }
  tick(now){
    this.frame=requestAnimationFrame(this.tick);
    if(!this.enabled||document.hidden){this.lastFrame=now;return;}
    const dt=Math.min(.045,(now-(this.lastFrame||now))/1000);this.lastFrame=now;
    this.controls.update();
    const a=this.animation;
    if(a){
      const t=Math.min(1,(now-a.start)/a.duration),pose=motionPose(a.move.piece,t,!!a.captured),p=a.piece;
      p.position.set(THREE.MathUtils.lerp(a.from.x,a.to.x,pose.progress),.055+pose.y,THREE.MathUtils.lerp(a.from.z,a.to.z,pose.progress));p.rotation.x=pose.tilt;p.rotation.y=p.userData.baseRotation+pose.spin;p.scale.setScalar(pose.scale);
      if(a.rook?.piece){const r=ease(Math.max(0,(t-.18)/.82));a.rook.piece.position.set(THREE.MathUtils.lerp(a.rook.from.x,a.rook.to.x,r),.055+Math.sin(r*Math.PI)*.1,THREE.MathUtils.lerp(a.rook.from.z,a.rook.to.z,r));}
      if(a.captured&&t>.53){const c=capturePose(a.captured.userData.type,Math.min(1,(t-.53)/.47)),v=a.captured;v.position.y=.055+c.y;v.rotation.set(c.rx,v.userData.baseRotation+c.spin,c.rz);v.scale.setScalar(Math.max(.001,c.scale));}
      if(t>.6&&!a.impact){a.impact=true;const point=new THREE.Vector3(a.to.x,.25,a.to.z),colors={p:0xe4ca88,n:0x8de2be,b:0x91bfff,r:0xffc378,q:0xd4a2ff,k:0xffd872};this.pulse(point,colors[a.move.piece]);if(a.captured||a.move.promotion)this.burst(point,colors[a.move.piece],a.move.promotion?36:22,a.move.piece==='r'?'stone':'spark');}
      if(t===1){this.animation=null;this.rebuild(a.game);a.resolve();}
    }
    const v=this.victory;
    if(v){
      const seconds=(now-v.start)/1000;
      for(const p of this.pieces.values()){
        if(p.userData.color===v.winner||v.winner===null){const pose=victoryPose(p.userData.type,seconds);p.position.y=.055+pose.y;p.rotation.set(pose.rx,p.userData.baseRotation+pose.spin,pose.rz);}
        else if(p.userData.type==='k'){p.rotation.z=Math.min(1,seconds)*Math.PI*.42;p.position.y=.055;}
      }
      if(now-v.lastBurst>420){v.lastBurst=now;this.burst(new THREE.Vector3((Math.random()-.5)*6,2,(Math.random()-.5)*6),[0xf2cf76,0x7ce5c7,0xa3c9ff,0xc7a0ff][Math.floor(Math.random()*4)],20);}
      if(now-v.start>v.duration){this.victory=null;this.fen='';if(this.snapshot)this.rebuild(this.snapshot[0]);}
    }
    this.particles=this.particles.filter(p=>{const age=(now-p.born)/p.life;if(age>=1){this.effects.remove(p.mesh);disposeObject(p.mesh);return false;}if(p.ring){p.mesh.scale.setScalar(1+age*4);p.mesh.material.opacity=(1-age)*.7;}else{p.velocity.y-=4*dt;p.mesh.position.addScaledVector(p.velocity,dt);p.mesh.rotation.x+=dt*4;p.mesh.material.opacity=1-age;}return true;});
    this.renderer.render(this.scene,this.camera);
  }
  dispose(){this.cancel();cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();this.controls.dispose();disposeObject(this.scene);this.renderer.dispose();this.renderer.domElement.remove();}
}
