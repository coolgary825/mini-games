export const W=1000,H=570,SAVE_KEY='junwoo-merge-heroes-v1',MAX_TIER=7,CAPACITY=12;
export const HEROES={melee:{name:'근거리',cost:50,range:92,speed:58,delay:1.02,color:'#ef9364'},ranged:{name:'원거리',cost:60,range:780,speed:0,delay:1.2,color:'#77bca3'}};
// Stable role/tier keys preserve all existing armies, currencies and discoveries.
const buddies={
 melee:[
  {name:'여름',buddy:'summer',color:'#ffc078',story:'1살 아기 고양이. 어느 칸에 있어도 가까이 다가가 앞발로 톡!'},
  {name:'커피',buddy:'coffee',color:'#a19dbd',story:'여름 둘이 합체하면 등장! 2살 검은 고양이가 든든하게 가까이서 싸워요.'},
  {name:'라떼',buddy:'latte',color:'#e8bd81',story:'11살 장모 치와와. 복슬복슬한 털과 용감한 마음으로 친구들을 지켜요.'},
  {name:'팝콘공',buddy:'popcorn',color:'#ffe080',story:'동글동글 팝콘 친구! 통통 튀어 올라 고소한 힘을 보여 줘요.'},
  {name:'드래곤',buddy:'dragon',color:'#ffad78',story:'큰 날개와 따뜻한 불꽃을 가진 아기 용. 가까이서 씩씩하게 싸워요.'},
  {name:'번개 커피',buddy:'coffee',variant:'electric',color:'#e3fb80',story:'번개 갑옷을 입은 커피. 초고속 앞발로 경기장을 지켜요.'},
  {name:'태양 라떼',buddy:'latte',variant:'solar',color:'#ffbf75',story:'일곱 별을 모은 라떼! 태양 방패를 두른 근거리 친구의 최종 모습이에요.'}
 ],
 ranged:[
  {name:'가을',buddy:'autumn',color:'#67e8ef',story:'1살 아기 고양이. 어느 칸에 있어도 장난감 블래스터로 별 총알을 멀리 쏴요.'},
  {name:'모카',buddy:'mocha',color:'#f8cc63',story:'가을 둘이 합체하면 등장! 2살 노란 고양이가 햇살 총알을 멀리 쏴요.'},
  {name:'별빛 가을',buddy:'autumn',variant:'star',color:'#c3acff',story:'별빛 망토를 두른 가을! 작은 별들이 더 멀리, 더 힘차게 날아가요.'},
  {name:'황금 모카',buddy:'mocha',variant:'gold',color:'#ffe481',story:'황금 왕관을 쓴 모카. 황금 미사일을 멀리 발사해요.'},
  {name:'달빛 드래곤',buddy:'dragon',variant:'moon',color:'#a3b7ff',story:'달빛을 품은 아기 용. 푸른 미사일을 멀리 보내 경기장을 지켜요.'},
  {name:'로켓 팝콘공',buddy:'popcorn',variant:'rocket',color:'#b9a2ff',story:'팝콘공의 로켓 발사대! 알록달록 미사일을 멀리 보내요.'},
  {name:'은하 드래곤',buddy:'dragon',variant:'galaxy',color:'#7bf1ff',story:'일곱 별을 모은 드래곤! 은하 미사일을 발사하는 원거리 친구의 최종 모습이에요.'}
 ]
};
export const CHARACTERS=Object.fromEntries(Object.keys(HEROES).flatMap(type=>buddies[type].map((buddy,i)=>{const tier=i+1,key=`${type}-${tier}`;return [key,{key,type,attackType:type,weapon:type==='ranged'?(tier>=4?'missile':'blaster'):null,tier,...buddy,hp:Math.round((type==='melee'?180:105)*2.1**i),power:Math.round((type==='melee'?20:15)*2.2**i),gemCost:[10,25,60,140,320,650,1200][i]}];})));
export const keyOf=u=>`${u.type}-${u.tier}`;
export const stats=u=>CHARACTERS[keyOf(u)];
export const clone=x=>JSON.parse(JSON.stringify(x));
export const SLOTS=[{x:225,y:222},{x:225,y:335},{x:225,y:448},{x:383,y:222},{x:383,y:335},{x:383,y:448}].map((s,i)=>({...s,row:`배치 ${i+1}`}));
export const ENEMIES={slime:{name:'민트 젤리',hp:70,speed:26,damage:8,delay:1.5,color:'#a9c67f',coins:2},fast:{name:'번개 젤리',hp:52,speed:48,damage:7,delay:1.2,color:'#d1a56f',coins:2},tank:{name:'우주 젤리',hp:140,speed:20,damage:13,delay:1.7,color:'#c79bc4',coins:4},boss:{name:'킹 젤리',hp:760,speed:13,damage:22,delay:1.6,color:'#ef947c',coins:15}};
export const WAVES=Array.from({length:20},(_,i)=>{const wave=i+1,count=4+Math.floor(i/2),types=Array.from({length:count},(_,n)=>i<2?'slime':n%4===0?'tank':n%3===1?'fast':'slime');if(wave%5===0)types.splice(Math.floor(count/2),0,'boss');return {name:wave===20?'마지막 우주 챔피언전':wave%5===0?'킹 젤리가 나타났어요':['스타 아레나','네온 궤도','젤리 행성','은하수 경기장'][i%4],tip:wave<=2?'같은 용사 두 명을 골라 합체해 보세요.':wave%5===0?'보스 등장! 합체로 더 든든한 팀을 만들어요.':'위치를 바꿔도 친구의 공격 타입은 그대로예요.',types,gap:Math.max(1.9,3-i*.055),mult:1.18**i};});

export const superCost=u=>[80,160,280,440,650,900][u.tier-1];
