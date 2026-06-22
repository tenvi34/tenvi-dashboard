@AGENTS.md

# Claude Code 작업 안내

이 문서는 TENVI Dashboard에서 Claude Code를 사용할 때의 보조 안내 문서다. 기본 작업 규칙은 `AGENTS.md`를 우선한다.

## 기본 원칙

- 프로젝트 정체성, 아키텍처, 보존해야 할 기존 동작은 `AGENTS.md`를 기준으로 확인한다.
- 기능 구현이나 리팩토링을 시작하기 전에는 요청과 직접 관련된 파일부터 확인한다.
- 문서 최신화 작업에서는 기능 코드, `package.json`, 테스트 설정을 수정하지 않는다.
- 기존 localStorage key와 IndexedDB DB/store 이름은 사용자 데이터 호환성과 연결되므로 문서에도 실제 코드 기준 이름을 적는다.

## 주요 문서

- `README.md`: 프로젝트 전체 개요, 실행/테스트/빌드 방법, 모듈 요약
- `docs/board.md`: Board 모듈 상세 구조와 데이터 흐름
- `docs/profile.md`: 로컬 사용자 프로필과 `UserAvatar` 구조
- `docs/backup.md`: 전체 백업과 Board 전용 백업 구조
- `docs/function-reference.md`: 주요 컴포넌트, helper, 저장소 함수 빠른 참조

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

## Board 작업 메모

- Board 진입 컴포넌트는 `src/modules/Board.jsx`다.
- Board 하위 UI는 `src/modules/board/` 폴더의 컴포넌트와 hook으로 분리되어 있다.
- Board 순수 로직은 `src/modules/boardLogic.js`에 있다.
- Board 이미지 IndexedDB helper는 `src/modules/boardImageStore.js`에 있다.
- Board 전용 백업 helper는 `src/modules/boardBackupLogic.js`에 있다.
- Board 테스트는 `src/modules/boardLogic.test.js`, `src/modules/boardBackupLogic.test.js`에 있다.

## 프로필 작업 메모

- 로컬 사용자 프로필 로직은 `src/modules/userProfileLogic.js`에 있다.
- 프로필 이미지 IndexedDB helper는 `src/modules/profileImageStore.js`에 있다.
- 원형 아바타 UI는 `src/components/UserAvatar.jsx`와 `src/components/UserAvatar.css`에 있다.
- 프로필은 실제 로그인/회원가입 기능이 아니며, 현재 브라우저의 localStorage와 IndexedDB에만 저장된다.

## 검증

- 문서만 수정한 경우 테스트/빌드는 필수는 아니지만, 가능하면 `npm run test:run`과 `npm run build`로 회귀를 확인한다.
- 기능 코드, 저장소 key, 번역 구조, 모듈 연결을 수정한 경우에는 `npm run test:run`과 `npm run build`를 실행한다.
