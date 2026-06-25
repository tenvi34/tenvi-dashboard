# TENVI 함수/파일 참조

이 문서는 현재 코드 기준으로 주요 컴포넌트, helper, 저장소 파일의 위치와 역할을 빠르게 확인하기 위한 참조 문서다. 상세 설계는 각 전용 문서를 우선한다.

- Board 상세: `docs/board.md`
- 로컬 사용자 프로필 상세: `docs/profile.md`
- 백업/복원 상세: `docs/backup.md`
- 전체 실행 방법: `README.md`

## 앱 Shell

### `src/App.jsx`

- `App`: TENVI 전체 shell 컴포넌트. 모듈 목록, `activeModule`, 언어, 시작 모듈, HUD 효과, 테마를 관리하고 각 모듈에 props를 전달한다.
- 모듈 전환은 React state 기반이며 React Router를 사용하지 않는다.
- 공유 설정은 `STORAGE_KEYS.language`, `STORAGE_KEYS.startModule`, `STORAGE_KEYS.hudEffect`, `STORAGE_KEYS.theme`를 통해 localStorage와 연결된다.

### 공통 컴포넌트

- `src/components/Sidebar.jsx`: 데스크톱 좌측 모듈 내비게이션.
- `src/components/MobileTabBar.jsx`: 모바일 하단 탭과 더보기 메뉴.
- `src/components/UserAvatar.jsx`: 닉네임/프로필 이미지 기반 원형 아바타. 상세는 `docs/profile.md` 참고.
- `src/components/UserAvatar.css`: `UserAvatar` 전용 스타일.

## Board 모듈

### 진입 파일

- `src/modules/Board.jsx`: Board 모듈의 화면 상태, 목록/작성/상세/수정/휴지통 흐름을 조합한다.
- `src/modules/Board.css`: Board 전용 스타일.

### Board 하위 컴포넌트

- `src/modules/board/BoardList.jsx`: 게시글 목록, 검색, 정렬, 카테고리 필터, 고정글 토글, 휴지통/카테고리 관리 진입.
- `src/modules/board/BoardDetail.jsx`: 게시글 상세, 조회수 표시, 작성자 아바타, 이미지 확대 보기 진입.
- `src/modules/board/BoardForm.jsx`: 작성/수정 폼 wrapper, 제목/작성자/카테고리 입력, 임시저장 목록 UI.
- `src/modules/board/BoardEditor.jsx`: 텍스트/이미지 block 편집, block 이동, 중간 삽입, 이미지 선택.
- `src/modules/board/BoardCategoryManager.jsx`: 카테고리 생성/수정/삭제 UI.
- `src/modules/board/BoardTrash.jsx`: 삭제된 게시글 복구와 영구 삭제 UI.
- `src/modules/board/BoardImageLightbox.jsx`: Board 상세 이미지 확대 보기 modal.

### Board hook

- `src/modules/board/useBoardPosts.js`: `STORAGE_KEYS.boardPosts` 기반 게시글 복원/저장 상태.
- `src/modules/board/useBoardCategories.js`: `STORAGE_KEYS.boardCategories` 기반 카테고리 복원/저장 상태.
- `src/modules/board/useBoardDrafts.js`: 다중 임시저장 목록, 기존 단일 draft 호환, 임시저장 저장/삭제/불러오기 상태.
- `src/modules/board/useBoardDetailImages.js`: 상세 화면 이미지 block의 IndexedDB 이미지 로드와 확대 보기 상태.

### Board 순수 로직

`src/modules/boardLogic.js`는 Board 데이터 정규화와 변경 로직을 담당한다.

주요 export:

- `DEFAULT_BOARD_CATEGORY_ID`, `DEFAULT_BOARD_CATEGORIES`, `BOARD_SORT_OPTIONS`
- `normalizeBoardBlocks`, `createBoardPost`, `updateBoardPost`, `deleteBoardPost`
- `moveBoardPostToTrash`, `restoreBoardPost`, `increaseBoardPostViews`, `toggleBoardPostPinned`
- `createBoardCategory`, `normalizeBoardCategories`, `parseBoardCategories`
- `addBoardCategory`, `updateBoardCategory`, `deleteBoardCategory`, `movePostsToDefaultCategory`
- `getBoardImageIds`, `getRemovedBoardImageIds`, `getBoardPostTextContent`, `sortBoardPosts`
- `createBoardDraft`, `parseBoardDraft`

### Board 이미지 저장소

`src/modules/boardImageStore.js`는 Board 이미지 IndexedDB 저장을 담당한다.

- DB 이름: `TENVI_BOARD_DB`
- DB 버전: `1`
- object store: `boardImages`
- keyPath: `id`

주요 export:

- `saveBoardImage(file)`
- `getBoardImage(imageId)`
- `getBoardImages(imageIds)`
- `getAllBoardImages()`
- `putBoardImages(imageRecords)`
- `deleteBoardImage(imageId)`
- `deleteBoardImages(imageIds)`

### Board 전용 백업

`src/modules/boardBackupLogic.js`는 Board 전용 JSON 백업/복원을 담당한다.

주요 export:

- `BOARD_BACKUP_APP = 'TENVI Dashboard'`
- `BOARD_BACKUP_TYPE = 'board-backup'`
- `BOARD_BACKUP_VERSION = 1`
- `BOARD_BACKUP_STORAGE_KEYS`
- `createBoardBackupFileName(date)`
- `collectBoardBackupData(...)`
- `validateBoardBackupData(backupPayload)`
- `restoreBoardBackupData(backupPayload, dependencies)`
- `downloadBoardBackupFile(backupPayload)`
- `parseBoardBackupFile(backupFile)`

## 로컬 사용자 프로필

### `src/modules/userProfileLogic.js`

로컬 사용자 프로필의 기본값, 정규화, 업데이트, 초기화를 담당한다.

주요 export:

- `DEFAULT_USER_PROFILE_ID = 'local-user'`
- `DEFAULT_USER_NICKNAME = 'TENVI'`
- `createDefaultUserProfile(createdAt)`
- `normalizeUserProfile(profile, fallbackDate)`
- `parseUserProfile(rawProfile, fallbackDate)`
- `updateUserProfile(currentProfile, patch, updatedAt)`
- `resetUserProfile(resetAt)`

### `src/modules/profileImageStore.js`

프로필 이미지 IndexedDB 저장을 담당한다.

- DB 이름: `TENVI_PROFILE_DB`
- DB 버전: `1`
- object store: `profileImages`
- keyPath: `id`

주요 export:

- `saveProfileImage(file)`
- `getProfileImage(imageId)`
- `getAllProfileImages()`
- `putProfileImages(imageRecords)`
- `deleteProfileImage(imageId)`

## Settings와 백업

### `src/modules/Settings.jsx`

- 언어, 시작 모듈, HUD 효과, 테마, 로컬 프로필, 데이터 백업/복원, Tasks/Notes 초기화 UI를 담당한다.
- 전체 앱 백업과 Board 전용 백업 UI가 함께 있다.

### `src/modules/settingsBackup.js`

전체 앱 백업 payload 검증과 파일명 생성을 담당한다.

주요 export:

- `START_MODULES = ['dashboard', 'tasks', 'notes', 'board', 'command']`
- `HUD_EFFECTS = ['normal', 'reduced']`
- `THEMES = ['dark', 'standard']`
- `LANGUAGES = ['ko', 'en']`
- `BACKUP_APP = 'TENVI'`
- `BACKUP_TYPE = 'tenvi-dashboard-backup'`
- `BACKUP_VERSION = 1`
- `createBackupFileName()`
- `validateBackupPayload(backupPayload)`

## Map 저장소와 백업

### `src/services/photoArchiveRepository.js`

Map 사진 기록과 컬렉션 IndexedDB 저장소를 담당한다.

- DB 이름: `tenvi-photo-archive`
- DB 버전: `2`
- stores: `photoRecords`, `photoCollections`
- keyPath: `id`

주요 export:

- `PHOTO_RECORD_STORE_NAME = 'photoRecords'`
- `PHOTO_COLLECTION_STORE_NAME = 'photoCollections'`
- `openPhotoArchiveDatabase()`
- `getPhotoRecords()`, `getPhotoRecordCount()`
- `createPhotoRecord(recordInput)`, `createPhotoRecords(recordInputs)`
- `updatePhotoRecord(id, patch)`, `deletePhotoRecord(id)`
- `replacePhotoArchiveData({ records, collections })`
- `replacePhotoRecords(records)`

### `src/services/photoCollectionRepository.js`

Map 컬렉션 CRUD를 담당한다.

주요 export:

- `getPhotoCollections()`
- `createPhotoCollection(collectionInput)`
- `updatePhotoCollection(id, patch)`
- `deletePhotoCollection(collectionId)`

### `src/services/photoArchiveBackupService.js`

Map 사진/컬렉션 백업 직렬화와 복원 검증을 담당한다.

주요 export:

- `blobToDataUrl(blob)`, `dataUrlToBlob(dataUrl)`
- `serializePhotoRecordsForBackup(records)`
- `serializePhotoCollectionsForBackup(collections)`
- `validateMapBackupRecordShape(record, collections)`
- `validateMapCollectionBackupRecordShape(collection)`
- `preparePhotoCollectionsForRestore(backupCollections)`
- `preparePhotoRecordsForRestore(backupRecords, collections)`

## 기타 주요 모듈 로직

- `src/modules/tasksLogic.js`: task 생성, 마감일 정규화, 날짜별 task 조회/집계.
- `src/modules/calendarLogic.js`: 날짜 key, 월간 calendar cell, 단일/기간 일정 정규화와 조회.
- `src/modules/commandLogic.js`: Command Console 명령 파싱, 저장 데이터 분석, 결과 생성.
- `src/modules/timerLogic.js`: focus/break timer 시간 변환과 표시 형식.
- `src/modules/mapLogic.js`: Map 사진 record/collection 입력 정규화, 위치 데이터 처리, 필터링.
- `src/modules/bulkPhotoUploadLogic.js`: Map bulk 업로드 분석 결과, 위치 보정, 저장 후보 생성.
- `src/services/placeSearchService.js`: Nominatim 장소 검색, 결과 정규화, 간단 캐시.
- `src/services/photoArchiveSummaryService.js`: Dashboard용 Map 저장소 요약 생성.
- `src/utils/imageUtils.js`: 미리보기 이미지 크기 계산과 축소 Blob 생성.

## 저장소 key 참조

`src/constants/storageKeys.js`의 `STORAGE_KEYS`가 localStorage key의 단일 기준이다.

| 이름 | 실제 key |
| --- | --- |
| `tasks` | `todo-manager-lite.todos` |
| `notes` | `tenvi.notes` |
| `language` | `tenvi.language` |
| `startModule` | `tenvi.startModule` |
| `hudEffect` | `tenvi.hudEffect` |
| `theme` | `tenvi.theme` |
| `timerCompletedSessions` | `tenvi.timer.completedSessions` |
| `calendarEvents` | `tenvi.calendar.events` |
| `boardPosts` | `tenvi.board.posts` |
| `boardDraft` | `tenvi.board.draft` |
| `boardDrafts` | `tenvi.board.drafts` |
| `boardCategories` | `tenvi.board.categories` |
| `userProfile` | `tenvi.user.profile` |

## 테스트 파일

현재 확인된 주요 테스트 파일:

- `src/modules/boardLogic.test.js`
- `src/modules/boardBackupLogic.test.js`
- `src/modules/userProfileLogic.test.js`
- `src/modules/settingsBackup.test.js`
- `src/services/photoArchiveBackupService.test.js`
- `src/constants/storageKeys.test.js`
- `src/i18n/translations.test.js`

전체 테스트 파일 목록은 다음 명령으로 확인한다.

```bash
Get-ChildItem -Path src -Recurse -Filter *.test.js
```

## 현재 코드 기준 확인 필요

- Board 이미지 block의 caption 필드는 현재 코드에서 확인되지 않는다.
- 카테고리별 게시글 수 badge/표시는 현재 코드에서 확인되지 않는다.
