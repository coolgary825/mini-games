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
export const ENEMIES={
 slime:{name:'정찰 드론',hp:78,speed:32,damage:9,delay:1.4,color:'#7bcac5',coins:2,hint:'가까이 오는 기본 적'},
 fast:{name:'돌격 드론',hp:62,speed:64,damage:10,delay:1.1,color:'#efb76a',coins:2,hint:'빈틈으로 코어에 돌진'},
 tank:{name:'방패 골렘',hp:175,speed:24,damage:16,delay:1.65,color:'#939dc4',coins:4,hint:'총알 피해 45% 감소 · 근거리로 격파'},
 artillery:{name:'포격 드론',hp:95,speed:28,damage:14,delay:2.6,color:'#df8ba8',coins:3,hint:'멀리서 공격 · 충격파로 끊기'},
 boss:{name:'거대 파수꾼',hp:620,speed:20,damage:25,delay:1.6,color:'#e39072',coins:15,hint:'붉은 공격 예고 때 충격파!'}
};
export const SECTORS=[
 {name:'궤도 정거장',en:'ORBITAL DOCK',color:'#78dacf',boss:'철갑 파수꾼',pattern:'분쇄 충격',hint:'붉은 원이 차면 강타! 충격파로 끊어 주세요.'},
 {name:'붉은 협곡',en:'RED CANYON',color:'#e6a471',boss:'포격 사령관',pattern:'후방 포격',hint:'원거리 용사를 노려요. 공격 예고 때 충격파!'},
 {name:'번개 발전소',en:'STORM REACTOR',color:'#bcacf2',boss:'폭풍 거인',pattern:'연쇄 번개',hint:'큰 범위 공격! 여러 칸에 나누어 배치해요.'},
 {name:'마지막 성채',en:'THE LAST CITADEL',color:'#f08e9e',boss:'이클립스',pattern:'일식 폭격',hint:'체력 절반부터 빨라져요. 과충전과 충격파를 번갈아 써요.'}
];
const formations=[
 ['slime','slime','slime','slime'],
 ['slime','fast','slime','slime','fast'],
 ['slime','tank','slime','fast','slime','tank'],
 ['fast','slime','fast','tank','slime','fast','slime'],
 ['slime','tank','boss','fast','slime','tank'],
 ['tank','fast','slime','artillery','slime','tank','fast'],
 ['fast','fast','slime','tank','artillery','fast','slime','fast'],
 ['tank','slime','artillery','fast','tank','fast','artillery','slime'],
 ['fast','tank','fast','artillery','slime','tank','fast','artillery','slime'],
 ['tank','artillery','boss','fast','fast','tank','artillery','slime'],
 ['fast','tank','slime','artillery','fast','tank','slime','artillery','fast'],
 ['tank','artillery','fast','fast','tank','artillery','fast','slime','tank','fast'],
 ['fast','fast','artillery','tank','fast','artillery','tank','slime','fast','fast','tank'],
 ['artillery','tank','fast','tank','artillery','fast','slime','tank','artillery','fast','fast'],
 ['tank','fast','boss','artillery','tank','fast','artillery','tank','fast','artillery'],
 ['fast','artillery','tank','fast','tank','artillery','fast','tank','artillery','fast','fast','tank'],
 ['tank','tank','artillery','fast','fast','tank','artillery','fast','tank','fast','artillery','fast'],
 ['fast','fast','artillery','tank','artillery','fast','tank','fast','artillery','tank','fast','fast','tank'],
 ['tank','artillery','fast','fast','tank','artillery','tank','fast','artillery','fast','tank','fast','artillery'],
 ['tank','fast','boss','artillery','tank','fast','fast','artillery','tank','fast','artillery','tank','fast']
];
export const WAVES=formations.map((types,i)=>{const wave=i+1,sector=Math.floor(i/5),zone=SECTORS[sector],boss=wave%5===0;return {
 name:boss?zone.boss:['착륙 지점','돌격 경보','방어선 돌파','포위 작전'][i%5],sector,boss,types,
 tip:boss?zone.hint:wave===1?'여름과 가을을 모집하고 시작! 전투 중 스킬 버튼을 눌러요.':wave===2?'돌격 드론은 빈틈을 노려요. 근거리와 원거리를 함께 배치해요.':wave===3?'방패 골렘은 총알에 강해요. 근거리 용사로 상대해요.':wave>=6?'과충전은 공격 속도 UP · 충격파는 적 전체 기절 + 보스 공격 취소':'같은 용사끼리 합체! 전투 전 도감에서 보석도 써 보세요.',
 gap:Math.max(1.05,2.4-i*.065),mult:1.22**i
};});
export const SKILLS={
 overdrive:{name:'과충전',cost:40,cooldown:12,description:'5초 동안 공격 속도 80% 증가',key:'Q'},
 pulse:{name:'충격파',cost:55,cooldown:14,description:'전체 피해 + 2초 기절 · 보스 공격 취소',key:'E'}
};
export function talent(u){return u.tier<3?'기본 공격':u.type==='melee'?'4번째 공격마다 주변 적도 강타':u.tier>=4?'미사일 폭발 · 주변 피해 + 둔화':'별 총알 · 적 이동 속도 감소';}

export const superCost=u=>[80,160,280,440,650,900][u.tier-1];
