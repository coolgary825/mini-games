import { Chess } from './vendor/chess.js';
export { Chess };
export const START = new Chess().fen();
export const NAMES = {p:'폰',n:'나이트',b:'비숍',r:'룩',q:'퀸',k:'킹'};
export const LEVELS = [
  {name:'첫걸음',skill:0,depth:1,ms:100,random:1},
  {name:'쉬움',skill:0,depth:2,ms:150,random:.5},
  {name:'초급',skill:0,depth:3,ms:250,random:.15},
  {name:'보통',skill:3,depth:5,ms:450,random:0},
  {name:'중급',skill:7,depth:8,ms:700,random:0},
  {name:'고급',skill:12,depth:12,ms:1100,random:0},
  {name:'전문가',skill:17,depth:16,ms:1800,random:0},
  {name:'마스터',skill:20,depth:22,ms:2800,random:0},
];
export const DEFAULT_SETTINGS = {mode:'ai',level:3,side:'w',time:'0',theme:'ocean',sound:true,legal:true,coach:true,view:'3d',animations:true};
export const uci = m => m.from+m.to+(m.promotion||'');
export function moveFromUci(game, value) {return game.moves({verbose:true}).find(m=>uci(m)===value);}
export function positionCommand(game){
  const history=game.history({verbose:true});
  return 'position fen '+(history[0]?.before||game.fen())+(history.length?' moves '+history.map(uci).join(' '):'');
}
export function outcome(game){
  if(game.isCheckmate()) return {winner:game.turn()==='w'?'b':'w',reason:'체크메이트'};
  if(game.isStalemate()) return {winner:null,reason:'스테일메이트 — 둘 수 있는 수가 없어요'};
  if(game.isThreefoldRepetition()) return {winner:null,reason:'같은 위치가 세 번 반복됐어요'};
  if(game.isInsufficientMaterial()) return {winner:null,reason:'체크메이트할 기물이 부족해요'};
  if(game.isDrawByFiftyMoves()) return {winner:null,reason:'50수 동안 폰 이동과 기물 잡기가 없었어요'};
  return null;
}
// A lone king cannot win on time; other flag falls use this casual club's rule.
export function flagOutcome(game, loser){
  const winner=loser==='w'?'b':'w';
  const pieces=game.board().flat().filter(p=>p?.color===winner);
  if(pieces.every(p=>p.type==='k')||game.isInsufficientMaterial())return {winner:null,reason:'시간 종료 · 상대의 체크메이트 기물 부족'};
  return {winner,reason:'시간 초과'};
}
export function restoreGame(saved){
  if(!saved||saved.version!==1||typeof saved.start!=='string'||!Array.isArray(saved.moves)||saved.moves.length>3000)throw Error('저장 형식 오류');
  const game=new Chess(saved.start);
  for(const move of saved.moves){if(typeof move!=='string')throw Error('기보 오류');game.move(move);}
  return game;
}
export function validatePlayablePosition(game){
  const fields=game.fen().split(' ');
  fields[1]=fields[1]==='w'?'b':'w';fields[3]='-';
  if(new Chess(fields.join(' ')).isCheck())throw Error('상대 킹이 이미 체크인 위치는 불러올 수 없어요.');
  return game;
}
export function positionAt(game,ply){
  const history=game.history({verbose:true});
  return new Chess(ply===0?(history[0]?.before||game.fen()):history[ply-1].after);
}
export function capturedMaterial(game){
  const result={w:[],b:[]};
  for(const m of game.history({verbose:true}))if(m.captured)result[m.color].push(m.captured);
  return result;
}
export function materialScore(game){
  const values={p:100,n:320,b:330,r:500,q:900,k:0};
  return game.board().flat().reduce((n,p)=>n+(p?(p.color==='w'?1:-1)*values[p.type]:0),0);
}
export function safeSettings(value={}){
  const s={...DEFAULT_SETTINGS};
  if(['ai','local','puzzle'].includes(value.mode))s.mode=value.mode;
  if(Number.isInteger(value.level)&&value.level>=0&&value.level<8)s.level=value.level;
  if(['w','b','random'].includes(value.side))s.side=value.side;
  if(['0','180:2','300:3','600:5','900:10'].includes(value.time))s.time=value.time;
  if(['ocean','forest','walnut','violet'].includes(value.theme))s.theme=value.theme;
  if(['3d','2d'].includes(value.view))s.view=value.view;
  for(const k of ['sound','legal','coach','animations'])if(typeof value[k]==='boolean')s[k]=value[k];
  return s;
}
