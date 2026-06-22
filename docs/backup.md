# TENVI 백업/복원 문서

## 개요

TENVI에는 두 종류의 백업/복원이 있습니다.

1. Settings의 전체 앱 JSON 백업/복원
2. Settings의 Board 전용 JSON 백업/복원

이 문서는 현재 코드 기준 구현 상태와 백업 대상, 복원 정책을 정리합니다.

## 전체 앱 백업/복원

관련 파일:

```txt
src/modules/Settings.jsx
src/modules/settingsBackup.js
src/modules/settingsBackup.test.js
src/services/photoArchiveBackupService.js
src/services/photoArchiveBackupService.test.js
```

백업 metadata:

- `BACKUP_APP`: `TENVI`
- `BACKUP_TYPE`: `tenvi-dashboard-backup`
- `BACKUP_VERSION`: `1`

파일명:

```txt
tenvi-backup-YYYY-MM-DD.json
```

현재 전체 앱 백업에 포함되는 data 필드:

- `tasks`
- `notes`
- `boardPosts`
- `calendarEvents`
- `timerCompletedSessions`
- `language`
- `startModule`
- `theme`
- `mapPhotoCollections`
- `mapPhotoRecords`
- `userProfile`

주의:

- 전체 앱 백업에는 localStorage 프로필 객체(`userProfile`)가 포함됩니다.
- 현재 코드 기준 전체 앱 백업에는 IndexedDB `profileImages`가 포함되지 않습니다.
- Map 사진 기록은 `photoArchiveBackupService.js`에서 preview Blob을 dataUrl로 직렬화합니다.

## 전체 앱 복원 정책

`validateBackupPayload`가 app/type/version/data shape를 검증합니다.

복원 대상:

| 데이터 | 저장소 |
| --- | --- |
| Tasks | `todo-manager-lite.todos` |
| Notes | `tenvi.notes` |
| Board posts | `tenvi.board.posts` |
| Calendar events | `tenvi.calendar.events` |
| Timer sessions | `tenvi.timer.completedSessions` |
| Language | `tenvi.language` |
| Start module | `tenvi.startModule` |
| Theme | `tenvi.theme` |
| User profile | `tenvi.user.profile` |
| Map records | IndexedDB `tenvi-photo-archive` / `photoRecords` |
| Map collections | IndexedDB `tenvi-photo-archive` / `photoCollections` |

복원 전 확인:

- 전체 데이터 덮어쓰기 확인
- 손상된 Map record/collection이 있을 경우 추가 확인
- Map 데이터 교체 확인

복원 실패 시 가능한 범위에서 이전 localStorage/Map 데이터를 rollback합니다.

## Board 전용 백업/복원

관련 파일:

```txt
src/modules/boardBackupLogic.js
src/modules/boardBackupLogic.test.js
src/modules/boardImageStore.js
src/modules/profileImageStore.js
src/modules/Settings.jsx
```

백업 metadata:

- `BOARD_BACKUP_APP`: `TENVI Dashboard`
- `BOARD_BACKUP_TYPE`: `board-backup`
- `BOARD_BACKUP_VERSION`: `1`

파일명:

```txt
tenvi-board-backup-YYYYMMDD-HHmmss.json
```

## Board 백업 JSON 구조

```js
{
  version: 1,
  app: 'TENVI Dashboard',
  type: 'board-backup',
  exportedAt: '2026-06-22T00:00:00.000Z',
  localStorage: {
    'tenvi.board.posts': '...',
    'tenvi.board.categories': '...',
    'tenvi.board.draft': '...',
    'tenvi.board.drafts': '...',
    'tenvi.user.profile': '...'
  },
  indexedDb: {
    boardImages: [],
    profileImages: []
  }
}
```

## Board 백업 대상 localStorage key

`BOARD_BACKUP_STORAGE_KEYS` 기준:

- `tenvi.board.posts`
- `tenvi.board.categories`
- `tenvi.board.draft`
- `tenvi.board.drafts`
- `tenvi.user.profile`

## Board 백업 대상 IndexedDB store

| 데이터 | DB | version | store |
| --- | --- | --- | --- |
| Board 게시글 이미지 | `TENVI_BOARD_DB` | `1` | `boardImages` |
| 프로필 이미지 | `TENVI_PROFILE_DB` | `1` | `profileImages` |

## Board 복원 정책

- 복원 전 `window.confirm`으로 덮어쓰기 확인
- app/type/version 검증
- localStorage는 `BOARD_BACKUP_STORAGE_KEYS`에 포함된 key만 복원
- 백업 파일에 다른 localStorage key가 있어도 무시
- `null` 값은 해당 key 제거
- `boardImages`는 IndexedDB `put`으로 복원
- `profileImages`는 IndexedDB `put`으로 복원
- 같은 ID가 있으면 덮어쓰기
- `profileImages`가 없는 기존 Board 백업도 유효하게 처리
- 병합 복원은 현재 구현되어 있지 않음

## 프로필 데이터 포함 여부

| 백업 종류 | `tenvi.user.profile` | `profileImages` |
| --- | --- | --- |
| 전체 앱 백업 | 포함 | 현재 코드 기준 미포함 |
| Board 전용 백업 | 포함 | 포함 |

## 현재 구현 여부

구현 완료:

- 전체 앱 JSON 백업 내보내기
- 전체 앱 JSON 복원
- Map records/collections 백업/복원
- Board 전용 JSON 백업 내보내기
- Board 전용 JSON 복원
- Board 이미지 포함
- 로컬 사용자 프로필 포함
- 프로필 이미지 포함(Board 전용 백업)

현재 한계:

- Board 전용 복원은 덮어쓰기 방식입니다.
- Board 백업 병합 복원은 없습니다.
- 전체 앱 백업에는 현재 코드 기준 프로필 이미지 IndexedDB 데이터가 포함되지 않습니다.
- 브라우저 저장소 용량 제한은 브라우저 정책을 따릅니다.

## 테스트

관련 테스트:

- `src/modules/settingsBackup.test.js`
- `src/modules/boardBackupLogic.test.js`
- `src/services/photoArchiveBackupService.test.js`

검증 명령:

```bash
npm run test:run
npm run build
npm run lint
```
