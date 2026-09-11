import {LEVELS, positionCommand} from './domain.js';
export class ChessEngine {
  constructor(onState=()=>{}){this.onState=onState;this.worker=null;this.pending=null;this.ready=null;this.closed=false;}
  init(){
    if(this.ready)return this.ready;
    this.ready=new Promise((resolve,reject)=>{
      this.rejectReady=reject;
      this.onState('loading');
      try{this.worker=new Worker(new URL('./vendor/stockfish-18-lite-single.js',import.meta.url));}
      catch(e){this.onState('error');reject(e);return;}
      this.bootTimer=setTimeout(()=>this.fail(Error('AI 준비 시간 초과')),25000);
      this.worker.onerror=()=>this.fail(Error('AI를 불러오지 못했어요'));
      this.worker.onmessage=({data})=>{
        for(const line of String(data).split('\n')){
          if(line==='uciok'){this.send('setoption name Hash value 16');this.send('isready');}
          if(line==='readyok'){clearTimeout(this.bootTimer);this.onState('ready');resolve();}
          const task=this.pending;
          if(!task)continue;
          if(line.startsWith('info ')&&line.includes(' pv ')){
            const score=line.match(/score (cp|mate) (-?\d+)/),depth=line.match(/depth (\d+)/),pv=line.split(' pv ')[1];
            if(score)task.info={kind:score[1],score:Number(score[2]),depth:Number(depth?.[1]||0),pv:pv?.trim().split(' ')||[]};
          }
          if(line.startsWith('bestmove ')){
            clearTimeout(task.timer);this.pending=null;task.resolve({move:line.split(' ')[1],...task.info});
          }
        }
      };
      this.send('uci');
    });
    return this.ready;
  }
  send(command){this.worker?.postMessage(command);}
  fail(error){clearTimeout(this.bootTimer);if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(error);this.pending=null;}this.rejectReady?.(error);this.worker?.terminate();this.worker=null;this.ready=null;this.onState('error');}
  async search(game,level=7,analysis=false){
    await this.init();
    if(this.closed)throw Error('취소됨');
    if(this.pending)throw Error('AI가 생각 중이에요');
    const l=LEVELS[level];
    this.send('setoption name Skill Level value '+(analysis?20:l.skill));
    this.send('setoption name MultiPV value 1');
    this.send(positionCommand(game));
    return new Promise((resolve,reject)=>{
      this.pending={resolve,reject,info:{},timer:setTimeout(()=>this.fail(Error('AI 응답 시간 초과')),12000)};
      this.send(`go depth ${analysis?18:l.depth} movetime ${analysis?1200:l.ms}`);
    });
  }
  dispose(){this.closed=true;clearTimeout(this.bootTimer);this.rejectReady?.(Error('취소됨'));if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(Error('취소됨'));this.pending=null;}this.worker?.terminate();this.worker=null;}
}
