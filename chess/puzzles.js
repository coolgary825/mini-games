import {Chess} from './domain.js';
function fromMoves(moves){const g=new Chess();moves.forEach(m=>g.move(m));return g.fen();}
export const PUZZLES=[
  {id:'scholar',title:'1. 퀸과 비숍의 합동 작전',fen:fromMoves(['e4','e5','Bc4','Nc6','Qh5','Nf6']),hint:'비숍이 c4에서 도와주고 있어요. 퀸으로 f7을 공격해 보세요.',lesson:'퀸 혼자보다 비숍과 함께! 킹 앞의 약한 f7 칸을 노렸어요.'},
  {id:'fool',title:'2. 열린 대각선',fen:fromMoves(['f3','e5','g4']),hint:'흑의 차례예요. 퀸이 d8에서 h4로 가는 대각선을 찾아보세요.',lesson:'킹 앞의 폰을 너무 많이 움직이면 대각선이 열려 위험해져요.'},
  {id:'backrank',title:'3. 마지막 줄의 비밀',fen:'6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',hint:'룩으로 상대의 마지막 줄에 들어가세요.',lesson:'킹 앞의 폰이 오히려 퇴로를 막았어요. 이것이 백랭크 메이트예요.'},
  {id:'ladder',title:'4. 두 룩의 사다리',fen:'7k/8/6K1/8/8/8/1R6/R7 w - - 0 1',hint:'킹이 g6에서 도망갈 칸을 막고 있어요. 룩을 8번째 줄로!',lesson:'룩은 줄을 막고, 킹은 가까운 탈출 칸을 막아요.'},
  {id:'smother',title:'5. 나이트의 깜짝 선물',fen:'6rk/6pp/7N/8/8/8/8/K7 w - - 0 1',hint:'나이트는 기물을 뛰어넘어요. h6에서 f7로 점프!',lesson:'자기 기물에 둘러싸인 킹을 나이트로 공격하는 질식 메이트예요.'},
  {id:'promotion',title:'6. 작은 폰의 큰 변신',fen:'7k/5P2/6K1/8/8/8/8/8 w - - 0 1',hint:'f7의 폰이 마지막 줄에 도착하면 어떤 기물로 바꿀까요?',lesson:'폰이 마지막 줄에 도착하면 승급해요. 퀸과 룩 모두 메이트가 가능해요.'},
  {id:'queen',title:'7. 킹과 퀸의 팀워크',fen:'7k/8/5KQ1/8/8/8/8/8 w - - 0 1',hint:'킹이 보호하는 g7 칸으로 퀸을 옮겨 보세요.',lesson:'킹의 보호를 받는 퀸은 상대 킹 바로 옆에서도 잡히지 않아요.'},
  {id:'blackrook',title:'8. 흑의 역습',fen:'4r1k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1',hint:'흑의 룩을 e1로 내려 마지막 줄을 공격하세요.',lesson:'흑도 같은 원리로 메이트할 수 있어요. 항상 상대의 위협도 살펴보세요.'},
];
