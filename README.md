# TENVI Dashboard

TENVI Dashboard는 React + Vite 기반의 개인용 로컬 대시보드입니다. 서버 로그인 없이 브라우저 저장소를 사용하며, Tasks, Notes, Board, Calendar, Command, Timer, Map, Settings 모듈을 하나의 HUD 스타일 작업 공간으로 제공합니다.

자세한 Board 구조는 [docs/board.md](docs/board.md), 로컬 사용자 프로필은 [docs/profile.md](docs/profile.md), 백업/복원 정책은 [docs/backup.md](docs/backup.md)를 참고하세요.

## 기술 스택

- React 19
- Vite 8
- JavaScript
- CSS
- localStorage
- IndexedDB
- Vitest
- Leaflet / React Leaflet
- exifr

## 실행 방법

```bash
npm install
npm run dev
```

빌드 결과 미리보기:

```bash
npm run preview
```

## 테스트와 빌드

`package.json` 기준 현재 scripts:

```bash
npm run lint
npm run test
npm run test:run
npm run build
```

일반 검증 권장 순서:

```bash
npm run test:run
npm run build
npm run lint
```

## 주요 기능 요약

### Dashboard

- Tasks, Notes, Board, Calendar, Timer, Map 데이터를 요약해서 표시합니다.
- Dashboard 자체 데이터는 별도 저장하지 않고 다른 모듈 저장소를 읽어 요약합니다.

### Tasks

- 작업 추가, 완료, 삭제, 필터링
- due date 기반 Calendar/Dashboard 연동
- `todo-manager-lite.todos` localStorage key 사용

### Notes

- 노트 추가, 삭제
- `tenvi.notes` localStorage key 사용

### Board

- 게시글 목록, 상세, 작성, 수정, 삭제
- 상세 진입 시 조회수 증가 및 `tenvi.board.posts` 저장
- 카테고리 생성/수정/삭제, 카테고리 필터
- 검색 범위: 제목, 내용, 작성자
- 정렬: 최신순, 오래된순, 조회수순, 제목순
- 고정글 표시 및 고정/해제
- 복구함, 복구, 영구 삭제
- 블록 기반 에디터: 텍스트 블록, 이미지 블록, 블록 이동/삽입/삭제
- 다중 임시저장과 legacy 단일 임시저장 호환
- 게시글 이미지는 IndexedDB `TENVI_BOARD_DB`의 `boardImages` store에 저장
- 게시글 localStorage에는 이미지 원본이 아니라 `imageId` 중심으로 저장
- 로컬 사용자 프로필의 nickname을 새 글 작성자 기본값으로 사용
- 게시글 목록/상세 작성자 영역에 원형 `UserAvatar` 표시

현재 코드 기준 이미지 캡션 입력/저장 필드는 확인되지 않습니다. 캡션 기능은 구현 완료 기능으로 문서화하지 않습니다.

### Calendar

- 단일 날짜 일정과 기간 일정 추가/삭제
- 기존 date-only 일정 fallback 유지
- `tenvi.calendar.events` localStorage key 사용

### Command

- 저장된 Tasks, Notes, Board, Calendar, Timer, Settings 데이터를 분석
- 규칙 기반 명령 실행
- 최근 명령 history는 현재 세션 state로만 유지

### Timer

- Focus/Break 타이머
- 시작, 일시정지, 초기화
- Stopwatch와 lap
- 완료 Focus 세션 수를 `tenvi.timer.completedSessions`에 저장

### Map

- 사진 위치 기록, 검색, 편집, 삭제
- 사진 컬렉션 관리
- 원본 고해상도 이미지는 저장하지 않고 preview Blob만 IndexedDB에 저장
- IndexedDB `tenvi-photo-archive` v2 사용
- object store: `photoRecords`, `photoCollections`
- 장소 검색은 Nominatim 기반이며 Google Maps Platform 같은 유료 API는 사용하지 않습니다.

### Settings

- 언어, 기본 시작 모듈, 테마 설정
- 저장 데이터 개수 표시
- 로컬 사용자 프로필 편집
- 전체 앱 JSON 백업/복원
- Board 전용 JSON 백업/복원
- Tasks/Notes 데이터 초기화

## 주요 모듈 구조

```txt
src/
  App.jsx
  components/
    MobileTabBar.jsx
    Sidebar.jsx
    UserAvatar.jsx
    UserAvatar.css
  constants/
    storageKeys.js
  i18n/
    translations.js
  modules/
    Board.jsx
    Board.css
    board/
      BoardCategoryManager.jsx
      BoardDetail.jsx
      BoardEditor.jsx
      BoardForm.jsx
      BoardImageLightbox.jsx
      BoardList.jsx
      BoardTrash.jsx
      useBoardCategories.js
      useBoardDetailImages.js
      useBoardDrafts.js
      useBoardPosts.js
    boardLogic.js
    boardImageStore.js
    boardBackupLogic.js
    userProfileLogic.js
    profileImageStore.js
    Settings.jsx
    Settings.css
    settingsBackup.js
  services/
    photoArchiveRepository.js
    photoCollectionRepository.js
    photoArchiveBackupService.js
    photoArchiveSummaryService.js
    placeSearchService.js
  utils/
    imageUtils.js
```

모듈 전환은 React state 기반이며 React Router는 사용하지 않습니다.

## localStorage

실제 key는 `src/constants/storageKeys.js`의 `STORAGE_KEYS`에 정의합니다.

| 데이터 | key |
| --- | --- |
| Tasks | `todo-manager-lite.todos` |
| Notes | `tenvi.notes` |
| Board 게시글 | `tenvi.board.posts` |
| Board 카테고리 | `tenvi.board.categories` |
| Board legacy 단일 임시저장 | `tenvi.board.draft` |
| Board 다중 임시저장 | `tenvi.board.drafts` |
| 로컬 사용자 프로필 | `tenvi.user.profile` |
| Calendar 일정 | `tenvi.calendar.events` |
| 언어 | `tenvi.language` |
| 기본 시작 모듈 | `tenvi.startModule` |
| 테마 | `tenvi.theme` |
| Timer 완료 세션 | `tenvi.timer.completedSessions` |
| HUD 효과 | `tenvi.hudEffect` |

## IndexedDB

| 용도 | DB | version | object store |
| --- | --- | --- | --- |
| Board 게시글 이미지 | `TENVI_BOARD_DB` | `1` | `boardImages` |
| 로컬 프로필 이미지 | `TENVI_PROFILE_DB` | `1` | `profileImages` |
| Map 사진 기록/컬렉션 | `tenvi-photo-archive` | `2` | `photoRecords`, `photoCollections` |

## 현재 한계

- 실제 로그인, 회원가입, 비밀번호 기능은 없습니다.
- 데이터는 브라우저 로컬 저장소에 저장되므로 브라우저/프로필/기기 간 자동 동기화가 없습니다.
- Board 백업 복원은 기본적으로 덮어쓰기 방식이며 병합 복원은 없습니다.
- Board 이미지 캡션 필드는 현재 코드 기준 확인되지 않습니다.
- Board 상세 URL 라우팅은 없습니다.
- 외부 AI API 연동은 현재 구현되어 있지 않습니다.

## 추후 개선 방향

- Board 백업 병합 복원
- Board 검색/정렬 조건 저장
- Dashboard 최근 Board 글 카드 강화
- Board 상세 URL 라우팅
- 댓글 기능과 UserAvatar 재사용
- 로컬 저장소 export/import UX 개선
- 실제 AI API 연동은 비용/보안 정책 검토 후 별도 범위에서 진행
