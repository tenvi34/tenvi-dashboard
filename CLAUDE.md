@AGENTS.md

# Claude Code 작업 안내

- 이 프로젝트의 기존 작업 규칙은 `AGENTS.md`를 기준으로 따른다.
- 작업을 시작하기 전 `README.md`, 현재 파일 구조, 최근 Git 변경사항을 확인해 현재 구현 상태를 파악한다.
- 기존 기능 수정 또는 신규 기능 구현 전에는 먼저 원인 분석 또는 구현 계획을 제시하고, 승인받은 뒤 파일을 수정한다.

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

## Board 모듈 작업 메모

- Board 화면 구현 파일은 `src/modules/Board.jsx`이다.
- Board 순수 로직은 `src/modules/boardLogic.js`에 둔다.
- Board 테스트는 `src/modules/boardLogic.test.js`에 둔다.
- Board 저장 key는 `STORAGE_KEYS.boardPosts`이며 실제 문자열은 `tenvi.board.posts`이다.
- Board 게시글은 localStorage에 저장한다.
- Board 현재 화면 흐름:
  - 목록 화면: 제목과 날짜 중심 목록
  - 작성 화면: 작성자, 제목, 내용 입력
  - 상세 화면: 제목, 작성자, 작성 시간, 조회수, 본문
  - 수정 화면: 기존 작성자, 제목, 내용 수정
- Board 상세 화면을 열면 조회수가 증가하고 저장된다.
- 기존 게시글 데이터와 호환해야 한다.
  - `author`가 없으면 화면 fallback을 사용한다.
  - `views`가 없으면 조회 시 1부터 시작한다.
- Board UI 문구는 `src/i18n/translations.js`의 `board` 키 아래에 추가한다.
- Board 스타일은 `src/App.css`의 `board-*` class 영역에서 관리한다.

## 검증

- Board 로직, 번역, 저장 키, 모듈 연결을 수정하면 `npm run test:run`과 `npm run build`를 실행한다.
- 단순 문서 수정만 할 때는 테스트/빌드를 생략할 수 있지만, 문서가 코드 구조를 설명하는 경우 실제 파일명과 key를 확인한다.
