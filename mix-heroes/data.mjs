export const W=1000,H=570, SAVE_KEY='junwoo-mix-heroes-v1';
export const HEROES={melee:{name:'가디언',role:'근거리',cost:50,hp:190,range:92,speed:58,delay:1.02,color:'#ef9364',hint:'앞에서 든든하게 지켜요'},ranged:{name:'레인저',role:'원거리',cost:60,hp:100,range:290,speed:42,delay:1.2,color:'#77bca3',hint:'뒤에서 멀리 공격해요'}};
export const WEAPONS={
 sword:{name:'나무검',role:'melee',power:19,color:'#c28b53',desc:'가까운 적을 씩씩하게 공격',base:true},
 hammer:{name:'돌망치',role:'melee',power:23,color:'#8d9aaa',desc:'조금 느려도 묵직한 한 방',base:true,delay:1.15},
 bow:{name:'새싹활',role:'ranged',power:14,color:'#6aaf84',desc:'멀리 있는 적에게 화살 발사',base:true},
 staff:{name:'별지팡이',role:'ranged',power:16,color:'#b391d0',desc:'반짝이는 별빛을 멀리 발사',base:true},
 sword2:{name:'튼튼한 검',role:'melee',power:35,color:'#e2bc60',desc:'공격 힘이 커진 든든한 검'},
 hammer2:{name:'튼튼한 망치',role:'melee',power:43,color:'#e2bc60',desc:'묵직한 공격 힘이 더 커져요',delay:1.15},
 bow2:{name:'튼튼한 활',role:'ranged',power:28,color:'#e2bc60',desc:'더 강한 화살을 멀리 발사'},
 staff2:{name:'튼튼한 지팡이',role:'ranged',power:31,color:'#e2bc60',desc:'더 밝고 강한 별빛 공격'},
 fire:{name:'불꽃검',role:'melee',power:27,color:'#ef8c51',desc:'불꽃으로 3초 동안 추가 피해',effect:'burn'},
 ice:{name:'얼음활',role:'ranged',power:23,color:'#6bbdcf',desc:'얼음 화살로 2초 동안 느리게',effect:'slow'},
 thunder:{name:'번개망치',role:'melee',power:29,color:'#b19be0',desc:'주변 적에게도 번개 피해',effect:'splash'},
 wind:{name:'바람활',role:'ranged',power:24,color:'#75bea1',desc:'화살이 적 하나를 더 관통',effect:'pierce'}
};
export const RECIPES=[['sword','sword','sword2'],['hammer','hammer','hammer2'],['bow','bow','bow2'],['staff','staff','staff2'],['sword','staff','fire'],['bow','staff','ice'],['hammer','staff','thunder'],['sword','bow','wind']];
export function recipe(a,b){return RECIPES.find(r=>(r[0]===a&&r[1]===b)||(r[0]===b&&r[1]===a))?.[2]||null;}
export const SLOTS=[{x:225,y:222,row:'뒷줄'},{x:225,y:335,row:'뒷줄'},{x:225,y:448,row:'뒷줄'},{x:383,y:222,row:'앞줄'},{x:383,y:335,row:'앞줄'},{x:383,y:448,row:'앞줄'}];
export const WAVES=[
 {name:'숲속의 첫 만남',tip:'가디언은 앞줄, 레인저는 뒷줄에 두어요.',types:['slime','slime','slime','slime'],gap:3.3,mult:1},
 {name:'통통, 버섯 친구들',tip:'코인으로 친구를 한 명 더 불러 보세요.',types:['slime','slime','tank','slime','slime'],gap:3.1,mult:1.05},
 {name:'쌩쌩 달리는 도토리',tip:'빠른 친구는 얼음활로 느리게 만들어요.',types:['fast','slime','fast','slime','fast','slime'],gap:2.9,mult:1.12},
 {name:'든든한 우리 팀',tip:'앞줄에 가디언이 있으면 레인저가 안전해요.',types:['tank','slime','fast','tank','slime','fast','slime'],gap:2.7,mult:1.2},
 {name:'반짝이는 합성의 힘',tip:'불꽃검과 번개망치의 힘을 시험해 보세요.',types:['tank','fast','slime','tank','fast','slime','tank','slime'],gap:2.5,mult:1.3},
 {name:'작은 친구들의 행진',tip:'바람활은 뒤에 있는 적까지 관통해요.',types:['fast','slime','slime','fast','tank','slime','fast','slime','tank'],gap:2.3,mult:1.4},
 {name:'숲의 깊은 곳으로',tip:'빈자리를 채우고 무기를 합성해 보세요.',types:['tank','fast','tank','slime','fast','tank','slime','fast','tank','slime'],gap:2.2,mult:1.5},
 {name:'우리가 지켜 줄게',tip:'가디언의 번개는 모여 있는 적에게 좋아요.',types:['tank','tank','fast','slime','tank','fast','slime','tank','fast','tank','slime'],gap:2.1,mult:1.65},
 {name:'보석을 지키는 마음',tip:'합성 무기를 모두 장착했는지 살펴보세요.',types:['tank','fast','tank','fast','slime','tank','fast','tank','slime','tank','fast','tank'],gap:2,mult:1.8},
 {name:'큰 버섯 왕의 등장',tip:'버섯 왕이 왔어요! 우리 팀의 힘을 모아요.',types:['slime','tank','fast','tank','boss','fast','tank','slime','fast','tank'],gap:2.7,mult:1.9}
];
export const ENEMIES={slime:{name:'말랑이',hp:64,speed:26,damage:8,delay:1.5,color:'#a9c67f',coins:4},fast:{name:'도토리',hp:49,speed:48,damage:7,delay:1.2,color:'#d1a56f',coins:4},tank:{name:'버섯이',hp:135,speed:20,damage:13,delay:1.7,color:'#c79bc4',coins:6},boss:{name:'큰 버섯 왕',hp:1050,speed:13,damage:20,delay:1.6,color:'#ef947c',coins:30}};
export const clone=x=>JSON.parse(JSON.stringify(x));
