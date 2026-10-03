export const W=1000,H=570,SAVE_KEY='junwoo-merge-heroes-v1',MAX_TIER=5,CAPACITY=12;
export const HEROES={melee:{name:'근거리 용사',cost:50,range:92,speed:58,delay:1.02,color:'#ef9364'},ranged:{name:'원거리 용사',cost:60,range:290,speed:42,delay:1.2,color:'#77bca3'}};
const names={melee:['새싹 기사','방패 기사','강철 기사','불꽃 기사','태양 기사'],ranged:['새싹 궁수','숲의 궁수','바람 사수','별빛 사수','달빛 사수']};
const colors={melee:['#df9a6b','#79b7b1','#91a8cc','#e79376','#e2bc64'],ranged:['#80b79a','#83b777','#75b4cc','#b4a0d5','#858fce']};
const stories={melee:['용감한 첫걸음! 앞에서 친구들을 지켜요.','커다란 방패만큼 든든한 마음을 가졌어요.','반짝이는 갑옷을 입은 믿음직한 기사예요.','따뜻한 불꽃처럼 용기가 타올라요.','태양의 왕관을 쓴 최고의 근거리 용사예요.'],ranged:['작은 활로 멀리 있는 적을 맞혀요.','숲속에서 갈고닦은 솜씨를 보여 줘요.','바람을 읽으며 정확하게 화살을 쏘아요.','밤하늘의 별을 닮은 빛나는 사수예요.','달빛의 왕관을 쓴 최고의 원거리 용사예요.']};
export const CHARACTERS=Object.fromEntries(Object.keys(HEROES).flatMap(type=>Array.from({length:5},(_,i)=>{const tier=i+1,key=`${type}-${tier}`;return [key,{key,type,tier,name:names[type][i],hp:Math.round((type==='melee'?180:105)*2.1**i),power:Math.round((type==='melee'?20:15)*2.2**i),color:colors[type][i],gemCost:[10,25,60,140,320][i],story:stories[type][i]}];})));
export const keyOf=u=>`${u.type}-${u.tier}`;
export const stats=u=>CHARACTERS[keyOf(u)];
export const clone=x=>JSON.parse(JSON.stringify(x));
export const SLOTS=[{x:225,y:222,row:'뒷줄'},{x:225,y:335,row:'뒷줄'},{x:225,y:448,row:'뒷줄'},{x:383,y:222,row:'앞줄'},{x:383,y:335,row:'앞줄'},{x:383,y:448,row:'앞줄'}];
export const ENEMIES={slime:{name:'말랑이',hp:70,speed:26,damage:8,delay:1.5,color:'#a9c67f',coins:6},fast:{name:'도토리',hp:52,speed:48,damage:7,delay:1.2,color:'#d1a56f',coins:6},tank:{name:'버섯이',hp:140,speed:20,damage:13,delay:1.7,color:'#c79bc4',coins:9},boss:{name:'버섯 왕',hp:760,speed:13,damage:22,delay:1.6,color:'#ef947c',coins:35}};
export const WAVES=Array.from({length:20},(_,i)=>{const wave=i+1,count=4+Math.floor(i/2),types=Array.from({length:count},(_,n)=>i<2?'slime':n%4===0?'tank':n%3===1?'fast':'slime');if(wave%5===0)types.splice(Math.floor(count/2),0,'boss');return {name:wave===20?'달빛 숲의 마지막 모험':wave%5===0?'버섯 왕이 나타났어요':['새싹의 들판','반짝이는 숲길','도토리의 언덕','친구들의 산책'][i%4],tip:wave<=2?'같은 용사 두 명을 골라 합체해 보세요.':wave%5===0?'보스 등장! 합체로 더 든든한 팀을 만들어요.':'앞줄에는 기사, 뒷줄에는 궁수를 배치해요.',types,gap:Math.max(1.9,3-i*.055),mult:1.16**i};});

export const superCost=u=>80*2**(u.tier-1);
