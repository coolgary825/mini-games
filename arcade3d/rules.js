export const GAME_INFO={
 roblox:{title:'스카이 아일랜드',subtitle:'미니 로블록스 3D',color:'#73e1ff',icon:'☁',legacy:'로블록스.html',hint:'WASD / 방향키 이동 · Space 점프 · E 대시',goal:'하늘섬을 건너 깃발에 도착하세요.'},
 defense:{title:'가디언 포트리스',subtitle:'몬스터 디펜스 3D',color:'#ffd27a',icon:'♜',legacy:'디펜스게임.html',hint:'건설 칸 클릭 → 타워 선택 · E 다음 웨이브 · Q 유성',goal:'20번의 공격으로부터 성을 지켜 주세요.'},
 brainrot:{title:'네온 브레인롯 시티',subtitle:'브레인롯 훔치기 3D',color:'#d09cff',icon:'✦',legacy:'브레인롯훔치기.html',hint:'WASD 이동 · E 훔치기 / 보관 · Q 보호막',goal:'진열대의 브레인롯을 가져와 내 기지에 모으세요.'},
 '99nights':{title:'별빛 숲의 99일',subtitle:'99나이트 3D',color:'#a2e89e',icon:'☾',legacy:'99나이트.html',hint:'WASD 이동 · E 채집 / 모닥불 · Space 공격 · Q 식사',goal:'낮에 준비하고, 밤에는 모닥불을 지키세요.'},
 princess:{title:'로열 드림 스튜디오',subtitle:'공주게임 3D',color:'#ffb0d8',icon:'♕',legacy:'공주게임.html',hint:'드래그로 공주 회전 · 옷장으로 꾸미기 · E 런웨이',goal:'나만의 공주를 꾸미고 패션쇼에 도전하세요.'}
};
export const clamp=(x,min,max)=>Math.min(max,Math.max(min,x));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function pathPoint(points,d){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],len=distance(a,b);if(d<=len)return{x:a.x+(b.x-a.x)*d/len,z:a.z+(b.z-a.z)*d/len,angle:Math.atan2(b.x-a.x,b.z-a.z)};d-=len;}return{...points.at(-1),angle:0};}
export const pathLength=points=>points.slice(1).reduce((sum,p,i)=>sum+distance(p,points[i]),0);
export function fashionScore(outfit,theme){let score=35;if(outfit.color===theme.color)score+=25;if(outfit.style===theme.style)score+=20;if(outfit.crown>0)score+=10;if(outfit.wings===theme.wings)score+=10;return clamp(score,0,100);}
export function supportAt(platforms,x,z,previousY,newY){return platforms.filter(p=>Math.abs(x-p.x)<p.w/2+.22&&Math.abs(z-p.z)<p.d/2+.22&&previousY>=p.y-.03&&newY<=p.y).sort((a,b)=>b.y-a.y)[0]||null;}
export function safeProgress(raw={}){return {coins:clamp(Number(raw.coins)||0,0,1e9),best:clamp(Number(raw.best)||0,0,1e6),wins:clamp(Number(raw.wins)||0,0,1e6),color:Number.isInteger(raw.color)&&raw.color>=0&&raw.color<6?raw.color:0,upgrades:raw.upgrades&&typeof raw.upgrades==='object'?Object.fromEntries(Object.entries(raw.upgrades).filter(([k,v])=>/^[a-z]+$/.test(k)&&Number.isFinite(v)).map(([k,v])=>[k,clamp(Math.floor(v),0,10)])):{},collection:Array.isArray(raw.collection)?raw.collection.filter(n=>Number.isInteger(n)&&n>=0&&n<32):[],outfit:raw.outfit&&typeof raw.outfit==='object'?raw.outfit:null,run:raw.run&&typeof raw.run==='object'?raw.run:null};}
export const AVATAR_COLORS=[0x64c5fc,0xff9fbd,0x9fe3a8,0xf4c96b,0xb9a1f4,0xf6f3e8];
