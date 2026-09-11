# 준우네 3D 체스 클럽 — 오픈소스 안내

이 디렉터리의 체스 앱 코드는 GPL-3.0-or-later로 배포합니다. 개별 외부 구성요소에는 아래 라이선스가 적용됩니다. GPL 전문은 [vendor/stockfish.COPYING.txt](vendor/stockfish.COPYING.txt)를 참고하세요.

- **Stockfish.js 18.0.8 / Stockfish 18 Lite single-threaded** — Chess.com, LLC and Stockfish contributors, GPL-3.0. 수정하지 않은 npm 배포 파일입니다. [전체 해당 버전 소스, 신경망 다운로드 및 빌드 스크립트](https://github.com/nmrugg/stockfish.js/tree/93c994592dcf3b4b21052ab925e9b534df9c0918), [배포 패키지](https://registry.npmjs.org/stockfish/-/stockfish-18.0.8.tgz), [라이선스](vendor/stockfish.COPYING.txt).
- **chess.js 1.4.0** — Jeff Hlywa and contributors, BSD-2-Clause. [소스](https://github.com/jhlywa/chess.js/tree/v1.4.0), [라이선스](vendor/chess.LICENSE).
- **Three.js 0.180.0** — Three.js authors, MIT. [소스](https://github.com/mrdoob/three.js/tree/r180), [라이선스](vendor/three/LICENSE). OrbitControls.js의 bare import 경로만 같은 디렉터리의 three.module.js로 변경했습니다.
- **cburnett 체스 SVG** — Colin M. L. Burnett, GPL-2.0-or-later. [원본 배포 파일 및 라이선스 안내](https://github.com/lichess-org/lila/tree/master/public/piece/cburnett). 아이콘은 나이트 그림에서 파생되었습니다.

앱 및 3D 말 모델·애니메이션 소스: [준우네 게임천국 저장소](https://github.com/coolgary825/mini-games/tree/main/chess). 3D 모델은 이 앱에서 직접 생성합니다.
