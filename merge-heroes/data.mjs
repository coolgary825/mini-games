export const W=1000,H=570,SAVE_KEY='junwoo-merge-heroes-v1',MAX_TIER=5,CAPACITY=12;
export const HEROES={melee:{name:'근거리 용사',cost:50,range:92,speed:58,delay:1.02,color:'#ef9364'},ranged:{name:'원거리 용사',cost:60,range:290,speed:42,delay:1.2,color:'#77bca3'}};
// Stable role/tier keys preserve all existing armies, currencies and discoveries.
const buddies={
 melee:[
  {name:'라떼',buddy:'latte',color:'#dcad72',story:'11살 장모 치와와. 복슬복슬한 털과 용감한 마음으로 친구들을 지켜요.'},
  {name:'가을',buddy:'autumn',color:'#bf8b64',story:'1살 아기 고양이. 낙엽처럼 가볍게 뛰어올라 앞발로 톡!'},
  {name:'커피',buddy:'coffee',color:'#79768e',story:'2살 검은 고양이. 반짝이는 눈으로 숲을 지키는 든든한 친구예요.'},
  {name:'팝콘공',buddy:'popcorn',color:'#e5bd65',story:'동글동글 팝콘 친구! 통통 튀어 올라 고소한 힘을 보여 줘요.'},
  {name:'드래곤',buddy:'dragon',color:'#e5a270',story:'큰 날개와 따뜻한 불꽃을 가진 아기 용. 친구들 앞에서 씩씩하게 싸워요.'}
 ],
 ranged:[
  {name:'여름',buddy:'summer',color:'#8cbca8',story:'1살 아기 고양이. 작은 앞발로 반짝이는 빛방울을 멀리 보내요.'},
  {name:'모카',buddy:'mocha',color:'#dfa956',story:'2살 노란 고양이. 햇살처럼 반짝이는 빛방울로 친구들을 도와요.'},
  {name:'별빛 여름',buddy:'summer',variant:'star',color:'#b3a0d6',story:'별빛 망토를 두른 여름! 작은 별들이 더 멀리, 더 힘차게 날아가요.'},
  {name:'황금 모카',buddy:'mocha',variant:'gold',color:'#e5be58',story:'황금 왕관을 쓴 모카. 햇살의 힘을 모아 반짝이는 빛을 발사해요.'},
  {name:'달빛 드래곤',buddy:'dragon',variant:'moon',color:'#969ede',story:'달빛을 품은 아기 용. 푸른 별빛을 멀리 보내 숲을 지켜요.'}
 ]
};
export const CHARACTERS=Object.fromEntries(Object.keys(HEROES).flatMap(type=>buddies[type].map((buddy,i)=>{const tier=i+1,key=`${type}-${tier}`;return [key,{key,type,tier,...buddy,hp:Math.round((type==='melee'?180:105)*2.1**i),power:Math.round((type==='melee'?20:15)*2.2**i),gemCost:[10,25,60,140,320][i]}];})));
export const keyOf=u=>`${u.type}-${u.tier}`;
export const stats=u=>CHARACTERS[keyOf(u)];
export const clone=x=>JSON.parse(JSON.stringify(x));
export const SLOTS=[{x:225,y:222,row:'뒷줄'},{x:225,y:335,row:'뒷줄'},{x:225,y:448,row:'뒷줄'},{x:383,y:222,row:'앞줄'},{x:383,y:335,row:'앞줄'},{x:383,y:448,row:'앞줄'}];
export const ENEMIES={slime:{name:'말랑이',hp:70,speed:26,damage:8,delay:1.5,color:'#a9c67f',coins:6},fast:{name:'도토리',hp:52,speed:48,damage:7,delay:1.2,color:'#d1a56f',coins:6},tank:{name:'버섯이',hp:140,speed:20,damage:13,delay:1.7,color:'#c79bc4',coins:9},boss:{name:'버섯 왕',hp:760,speed:13,damage:22,delay:1.6,color:'#ef947c',coins:35}};
export const WAVES=Array.from({length:20},(_,i)=>{const wave=i+1,count=4+Math.floor(i/2),types=Array.from({length:count},(_,n)=>i<2?'slime':n%4===0?'tank':n%3===1?'fast':'slime');if(wave%5===0)types.splice(Math.floor(count/2),0,'boss');return {name:wave===20?'달빛 숲의 마지막 모험':wave%5===0?'버섯 왕이 나타났어요':['새싹의 들판','반짝이는 숲길','도토리의 언덕','친구들의 산책'][i%4],tip:wave<=2?'같은 용사 두 명을 골라 합체해 보세요.':wave%5===0?'보스 등장! 합체로 더 든든한 팀을 만들어요.':'근거리 친구는 앞줄, 원거리 친구는 뒷줄에 배치해요.',types,gap:Math.max(1.9,3-i*.055),mult:1.16**i};});

export const superCost=u=>80*2**(u.tier-1);
