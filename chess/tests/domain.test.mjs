import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess,START,LEVELS,outcome,flagOutcome,restoreGame,positionAt,positionCommand,moveFromUci,safeSettings,uci,validatePlayablePosition} from '../domain.js';
import {PUZZLES} from '../puzzles.js';
import {createPiece,motionPose,capturePose,victoryPose,squarePoint,MOVE_DURATION} from '../board3d.js';

test('initial move tree and rule enforcement',()=>{
  const game=new Chess();assert.equal(game.moves().length,20);
  let count=0;for(const a of game.moves()){game.move(a);for(const b of game.moves()){game.move(b);count+=game.moves().length;game.undo();}game.undo();}
  assert.equal(count,8902);assert.equal(game.fen(),START);
  assert.throws(()=>game.move({from:'e2',to:'e5'}));
});
test('castling moves both pieces and cannot cross attacked squares',()=>{
  const game=new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  game.move('O-O');assert.equal(game.get('g1').type,'k');assert.equal(game.get('f1').type,'r');assert.equal(game.get('h1'),undefined);game.undo();game.move('O-O-O');assert.equal(game.get('c1').type,'k');assert.equal(game.get('d1').type,'r');
  const attacked=new Chess('r3k2r/8/8/8/8/5r2/8/R3K2R w KQkq - 0 1');assert(!attacked.moves().includes('O-O'));assert(attacked.moves().includes('O-O-O'));
});
test('en passant is immediate and cannot expose own king',()=>{
  const game=new Chess();['e4','a6','e5','d5'].forEach(m=>game.move(m));const ep=game.move('exd6');assert(ep.flags.includes('e'));assert.equal(game.get('d5'),undefined);assert.equal(game.get('d6').type,'p');game.undo();game.move('Nf3');game.move('a5');assert(!game.moves({square:'e5'}).includes('exd6'));
  const pinned=new Chess('k3r3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');assert(!pinned.moves({verbose:true}).some(m=>m.flags.includes('e')));
});
test('all four promotion choices survive save/PGN round trips',()=>{
  const fen='7k/P7/6K1/8/8/8/8/8 w - - 0 1';
  for(const type of ['q','r','b','n']){const game=new Chess(fen);game.move({from:'a7',to:'a8',promotion:type});assert.equal(game.get('a8').type,type);const saved={version:1,start:fen,moves:game.history()};assert.equal(restoreGame(saved).fen(),game.fen());const imported=new Chess();imported.loadPgn(game.pgn());assert.equal(imported.fen(),game.fen());}
});
test('mate, stalemate, repetition, fifty-move and material draws',()=>{
  const mate=new Chess();['f3','e5','g4','Qh4#'].forEach(m=>mate.move(m));assert.deepEqual(outcome(mate),{winner:'b',reason:'체크메이트'});
  assert.equal(outcome(new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')).winner,null);
  const repetition=new Chess();for(let i=0;i<2;i++)['Nf3','Nf6','Ng1','Ng8'].forEach(m=>repetition.move(m));assert.match(outcome(repetition).reason,/세 번/);
  const fifty=new Chess('6k1/8/8/8/8/8/8/R5K1 w - - 100 51');assert.match(outcome(fifty).reason,/50수/);
  assert.match(outcome(new Chess('6k1/8/8/8/8/8/8/6K1 w - - 0 1')).reason,/부족/);
  assert.equal(flagOutcome(new Chess('6k1/8/8/8/8/8/8/R5K1 w - - 0 1'),'w').winner,null);
});
test('every puzzle starts legally and has a mate in one; alternatives accepted',()=>{
  for(const puzzle of PUZZLES){const game=new Chess(puzzle.fen);assert(!game.isGameOver(),puzzle.id);assert(!game.isCheck(),puzzle.id);const answers=[];for(const move of game.moves({verbose:true})){game.move(move);if(game.isCheckmate())answers.push(uci(move));game.undo();}assert(answers.length>0,puzzle.id);if(puzzle.id==='promotion')assert(answers.includes('f7f8q')&&answers.includes('f7f8r'));}
});
test('history replay, UCI with repetition history, and corrupted saves',()=>{
  const game=new Chess();['e4','e5','Nf3'].forEach(m=>game.move(m));assert.equal(positionAt(game,0).fen(),START);assert.equal(positionAt(game,2).turn(),'w');assert.equal(positionAt(game,3).fen(),game.fen());assert(positionCommand(game).endsWith('moves e2e4 e7e5 g1f3'));assert.equal(moveFromUci(game,'b8c6').san,'Nc6');
  assert.throws(()=>restoreGame({version:1,start:START,moves:['e9']}));assert.throws(()=>restoreGame({version:2,start:START,moves:[]}));
  const s=safeSettings({level:999,view:'invalid',sound:'x',mode:'local'});assert.equal(s.level,3);assert.equal(s.view,'3d');assert.equal(s.sound,true);assert.equal(s.mode,'local');assert.equal(LEVELS.length,8);
  assert.throws(()=>validatePlayablePosition(new Chess('8/8/8/8/8/8/4k3/4K3 w - - 0 1')));
  assert.throws(()=>validatePlayablePosition(new Chess('4k3/8/8/8/8/8/8/K3R3 w - - 0 1')));
  validatePlayablePosition(new Chess());
});
test('3D square coordinates and all six distinct movement/capture/victory profiles',()=>{
  assert.deepEqual(squarePoint('a1'),{x:-3.5,z:3.5});assert.deepEqual(squarePoint('h8'),{x:3.5,z:-3.5});
  for(const poseFn of [motionPose,capturePose,victoryPose]){const poses=['p','n','b','r','q','k'].map(type=>JSON.stringify(poseFn(type,.37)));assert.equal(new Set(poses).size,6);}
  for(const type of ['p','n','b','r','q','k']){
    assert.equal(motionPose(type,0).progress,0);assert.equal(motionPose(type,1).progress,1);assert(MOVE_DURATION[type]>=500);
    for(let t=0;t<=1;t+=.1){for(const n of Object.values(motionPose(type,t,true)))assert(Number.isFinite(n));}
  }
  assert(motionPose('n',.5).y>motionPose('q',.5).y);
});
test('3D models have distinct geometry and valid material for both sides',()=>{
  const signatures=new Set();
  for(const type of ['p','n','b','r','q','k'])for(const color of ['w','b']){
    const model=createPiece(type,color);assert.equal(model.userData.type,type);assert(model.children.length>=3);
    let vertices=0;model.traverse(o=>{if(o.isMesh){vertices+=o.geometry.attributes.position.count;assert(o.castShadow);assert(o.material);o.geometry.dispose();}});
    if(color==='w')signatures.add(vertices);assert.equal(model.rotation.y,color==='b'?Math.PI:0);
  }
  assert.equal(signatures.size,6);
});
