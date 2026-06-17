@AGENTS.md

# Claude Code 작업 안내

- 이 프로젝트의 기본 작업 규칙은 `AGENTS.md`를 기준으로 따른다.
- 작업을 시작하기 전에 요청과 직접 관련된 파일을 먼저 확인하고, 필요한 경우에만 주변 파일로 범위를 넓힌다.
- 기존 기능을 수정하거나 새 기능을 구현하기 전에 영향 범위를 짧게 파악하고, 중간 이상 규모의 변경은 간단한 계획을 먼저 제시한다.

## 현재 주요 모듈

- Dashboard
- Command
- Tasks
- Notes
- Board
- Calendar
- Map
- Timer
- Settings

## 주석 유지 규칙

- 새 코드나 핵심 로직을 수정할 때는 유지보수에 도움이 되는 짧은 한국어 주석을 계속 추가한다.
- `const` 상수, helper 함수, 파생 값, state 그룹, handler 함수처럼 역할이나 흐름을 설명할 필요가 있는 선언에도 주석을 붙인다.
- 단순 JSX, 명확한 변수명, 한 줄만 봐도 의미가 분명한 코드는 과하게 주석 처리하지 않는다.
- localStorage key, 저장/복원 흐름, module view 전환, draft 처리, IndexedDB 처리, 테스트 fixture에는 특히 주석을 우선한다.
- 주석은 설명문보다 짧은 명사구 스타일을 우선한다.
  - 예: `// Board 새 글 draft 복원`
  - 예: `// 활성 블록 다음 위치에 삽입`

## Board 모듈 작업 메모

- Board 화면 구현 파일은 `src/modules/Board.jsx`이다.
- Board 순수 로직은 `src/modules/boardLogic.js`에 둔다.
- Board 테스트는 `src/modules/boardLogic.test.js`에 둔다.
- Board 게시글 저장 key는 `STORAGE_KEYS.boardPosts`이며 실제 문자열은 `tenvi.board.posts`이다.
- Board 새 글 draft 저장 key는 `STORAGE_KEYS.boardDraft`이며 실제 문자열은 `tenvi.board.draft`이다.
- 기존 게시글 데이터는 localStorage에 저장하며, 기존 저장 구조와 key를 변경하지 않는다.
- Board 현재 화면 흐름:
  - 목록 화면: 제목과 날짜 중심 목록
  - 작성 화면: 작성자, 제목, blocks 기반 본문 입력
  - 상세 화면: 제목, 작성자, 작성 시간, 조회수, 본문
  - 수정 화면: 기존 작성자, 제목, blocks 수정
- Board 상세 화면에 들어가면 조회수가 증가하고 저장된다.
- 새 글 작성 화면의 draft 자동저장은 수정 화면에 적용하지 않는다.
- 기존 게시글 데이터와 호환해야 한다.
  - `author`가 없으면 화면 fallback을 사용한다.
  - `views`가 없으면 조회 시 1부터 시작한다.
- Board UI 문구는 `src/i18n/translations.js`의 `board` 키 아래에 추가한다.
- Board 스타일은 `src/App.css`의 `board-*` class 영역에서 관리한다.

## 검증

- Board 로직, 번역, 저장 key, 모듈 연결을 수정하면 `npm run test:run`과 `npm run build`를 실행한다.
- 단순 문서 수정만 할 때는 테스트와 빌드를 생략할 수 있다.
