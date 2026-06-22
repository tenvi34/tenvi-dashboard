# TENVI Board 모듈 문서

## 문서 역할

이 문서는 현재 코드 기준 Board 모듈의 구조, 데이터 모델, 저장소, 사용자 흐름, 테스트 범위를 설명합니다. 프로젝트 전체 개요는 [../README.md](../README.md), 로컬 사용자 프로필 상세는 [profile.md](profile.md), 백업/복원 상세는 [backup.md](backup.md)를 참고하세요.

## Board 모듈 개요

Board는 TENVI Dashboard 안의 로컬 게시판 모듈입니다. 서버 API 없이 브라우저 localStorage와 IndexedDB를 사용합니다. 게시글 텍스트 데이터는 localStorage에 저장하고, 이미지 원본 dataUrl은 IndexedDB에 분리 저장합니다.

진입 방식은 React Router가 아니라 `App.jsx`의 `activeModule` state 기반 모듈 전환입니다.

## 주요 기능 목록

구현 완료:

- 게시글 목록 보기
- 게시글 제목 클릭으로 상세 진입
- 게시글 상세 보기
- 상세 진입 시 조회수 증가 및 localStorage 저장
- 게시글 작성, 수정, 삭제
- 카테고리별 필터
- 카테고리 생성, 수정, 삭제
- 전체 게시글 수 표시
- 검색 결과/필터 결과 수 표시
- 게시글 정렬: 최신순, 오래된순, 조회수순, 제목순
- 고정 게시글 표시
- 게시글 고정/해제
- 제목, 내용, 작성자 기준 검색
- 게시글 복구함
- 복구함에서 게시글 복구
- 복구함에서 영구 삭제
- 영구 삭제 시 연결된 Board 이미지 데이터 정리
- 텍스트 블록 작성
- 이미지 블록 추가
- 블록 단위 편집
- 블록 위치 이동
- 글 중간에 문단/이미지 삽입
- 이미지 포함 게시글 저장
- 기존 게시글 수정 시 제거된 이미지 정리
- 다중 임시저장
- legacy 단일 임시저장 호환
- 상세 이미지 클릭 확대 보기와 닫기 버튼
- 로컬 사용자 프로필 nickname을 새 글 작성자 기본값으로 사용
- 게시글 목록/상세 작성자 영역에 `UserAvatar` 표시

현재 코드 기준 확인 필요/미구현:

- 이미지 캡션 입력/저장/표시 필드는 현재 코드에서 확인되지 않습니다.
- 카테고리별 게시글 수가 카테고리 버튼마다 직접 표시되는 UI는 현재 코드 기준 확인되지 않습니다. 전체/검색 결과 수와 복구함 수는 표시됩니다.

## 파일 구조

```txt
src/modules/Board.jsx
src/modules/Board.css
src/modules/board/
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
src/modules/boardLogic.js
src/modules/boardImageStore.js
src/modules/boardBackupLogic.js
src/modules/userProfileLogic.js
src/modules/profileImageStore.js
src/components/UserAvatar.jsx
src/components/UserAvatar.css
src/constants/storageKeys.js
```

## 주요 컴포넌트 역할

### `src/modules/Board.jsx`

Board 엔트리 컴포넌트입니다.

- 목록/상세/작성/수정 화면 전환
- 게시글, 카테고리, 임시저장 hook 연결
- 작성/수정 폼 상태 관리
- 게시글 생성, 수정, 조회수 증가, 삭제, 복구, 영구 삭제
- 카테고리 생성, 수정, 삭제
- 검색어, 검색 범위, 카테고리 필터, 정렬 상태 관리
- 상세 이미지 preview와 lightbox 연결
- 로컬 사용자 프로필 nickname/avatar를 Board UI에 연결

### `src/modules/board/BoardList.jsx`

게시글 목록 화면입니다.

- 글쓰기 버튼
- 복구함 토글
- 카테고리 필터
- 카테고리 관리 패널 조립
- 정렬 select
- 검색 입력과 검색 범위 버튼
- 게시글 제목 목록
- 작성자 이름과 `UserAvatar` 표시
- 빈 상태와 검색 결과 없음 상태

### `src/modules/board/BoardDetail.jsx`

게시글 상세 화면입니다.

- 제목, 카테고리, 고정 배지
- 작성자, 작성 시간, 조회수
- `UserAvatar` 표시
- 고정/해제, 목록, 수정, 삭제 버튼
- 텍스트/이미지 블록 렌더링
- 이미지 클릭 시 확대 보기 요청

### `src/modules/board/BoardForm.jsx`

게시글 작성/수정 폼입니다.

- 작성/수정 헤더
- 카테고리, 작성자, 제목 입력
- `BoardEditor` 연결
- 작성 모드 임시저장 상태 표시
- 임시저장 목록 열기, 불러오기, 삭제, 전체 삭제 UI

실제 저장 로직은 `Board.jsx` handler에서 처리합니다.

### `src/modules/board/BoardEditor.jsx`

블록 기반 에디터입니다.

- 텍스트 블록 추가/수정
- 이미지 파일 선택 후 `saveBoardImage`로 IndexedDB 저장
- 이미지 블록 추가
- 블록 삭제
- 블록 위/아래 이동
- pointer 기반 블록 재정렬
- 활성 블록 다음 위치에 텍스트/이미지 삽입
- `imageId` 기반 preview 복원

현재 코드 기준 이미지 캡션 입력 UI는 확인되지 않습니다.

### `src/modules/board/BoardCategoryManager.jsx`

카테고리 관리 UI입니다.

- 카테고리 추가
- 카테고리 이름 수정
- 카테고리 삭제
- 기본 카테고리 `general` 삭제 방지
- 카테고리 오류 메시지 표시

### `src/modules/board/BoardTrash.jsx`

복구함 UI입니다.

- 삭제된 게시글 목록 표시
- 삭제 시각 표시
- 복구 버튼
- 영구 삭제 버튼
- 빈 복구함 메시지

복구함은 별도 localStorage key를 쓰지 않고 게시글의 `deletedAt` 필드로 구분합니다.

### `src/modules/board/BoardImageLightbox.jsx`

상세 이미지 확대 보기 모달입니다.

- 확대 이미지 표시
- 닫기 버튼
- 배경 클릭 닫기

Escape 닫기와 body scroll lock은 `useBoardDetailImages`에서 처리합니다.

## 주요 hook 역할

### `useBoardPosts.js`

- `tenvi.board.posts` 복원
- 활성 글과 복구함 글 파생
- 게시글 배열 변경 시 기존 key에 저장

### `useBoardCategories.js`

- `tenvi.board.categories` 복원
- 카테고리 배열 변경 시 기존 key에 저장

### `useBoardDrafts.js`

- legacy draft key `tenvi.board.draft` 복원/삭제
- 다중 draft key `tenvi.board.drafts` 복원/저장
- 최대 10개 제한
- 최신 저장 시각 순 정렬
- active draft 상태 관리

### `useBoardDetailImages.js`

- 상세 게시글 `imageId` 기반 preview 복원
- lightbox 상태 관리
- Escape 닫기와 body scroll lock

## 주요 로직 파일 역할

### `src/modules/boardLogic.js`

Board 순수 로직입니다. UI state를 직접 만지지 않습니다.

주요 export:

- `DEFAULT_BOARD_CATEGORY_ID`
- `DEFAULT_BOARD_CATEGORIES`
- `BOARD_SORT_OPTIONS`
- `normalizeBoardBlocks`
- `getPostCategoryId`
- `createBoardCategory`
- `normalizeBoardCategories`
- `parseBoardCategories`
- `addBoardCategory`
- `updateBoardCategory`
- `deleteBoardCategory`
- `movePostsToDefaultCategory`
- `getBoardCategoryName`
- `getBoardImageIds`
- `getRemovedBoardImageIds`
- `createBoardDraft`
- `parseBoardDraft`
- `getBoardPostTextContent`
- `createBoardPost`
- `parseBoardPosts`
- `deleteBoardPost`
- `moveBoardPostToTrash`
- `restoreBoardPost`
- `increaseBoardPostViews`
- `toggleBoardPostPinned`
- `updateBoardPost`
- `sortBoardPosts`

### `src/modules/boardImageStore.js`

Board 이미지 IndexedDB helper입니다.

- DB: `TENVI_BOARD_DB`
- version: `1`
- store: `boardImages`
- keyPath: `id`

주요 export:

- `saveBoardImage`
- `getBoardImage`
- `getBoardImages`
- `getAllBoardImages`
- `putBoardImages`
- `deleteBoardImage`
- `deleteBoardImages`

### `src/modules/boardBackupLogic.js`

Board 전용 백업/복원 payload helper입니다. 상세 정책은 [backup.md](backup.md)를 참고하세요.

### `src/modules/userProfileLogic.js`

로컬 사용자 프로필 구조 보정과 저장값 갱신 helper입니다. 상세 정책은 [profile.md](profile.md)를 참고하세요.

## 게시글 데이터 구조

게시글은 `tenvi.board.posts`에 JSON 배열로 저장합니다.

```js
{
  id: 'post-id',
  title: '게시글 제목',
  content: '텍스트 블록에서 추출한 본문',
  blocks: [],
  author: 'TENVI',
  categoryId: 'general',
  createdAt: '2026-06-22T00:00:00.000Z',
  updatedAt: '2026-06-22T00:00:00.000Z',
  views: 0,
  pinned: true,
  deletedAt: '2026-06-23T00:00:00.000Z'
}
```

주의:

- `pinned`는 고정된 글에만 `true`가 될 수 있습니다.
- `deletedAt`이 있으면 복구함 글로 취급합니다.
- legacy 게시글은 `category` 필드를 가질 수 있으며 `getPostCategoryId`가 보정합니다.
- legacy 게시글은 `blocks` 없이 `content`만 가질 수 있으며 `normalizeBoardBlocks`가 텍스트 블록으로 보정합니다.

## blocks 데이터 구조

### text block

```js
{
  id: 'block-id',
  type: 'text',
  content: '텍스트 내용'
}
```

### image block

```js
{
  id: 'block-id',
  type: 'image',
  imageId: 'board-image-id',
  name: 'image.png'
}
```

legacy 호환을 위해 `src` 기반 이미지 블록도 허용합니다.

```js
{
  id: 'block-id',
  type: 'image',
  src: 'data:image/png;base64,...',
  name: 'legacy-image.png'
}
```

현재 코드 기준 `caption` 필드는 `normalizeBoardBlocks`, `BoardEditor`, `BoardDetail`에서 확인되지 않습니다.

## 이미지 저장 구조

1. `BoardEditor`에서 이미지 파일을 선택합니다.
2. `saveBoardImage`가 파일을 dataUrl로 변환해 IndexedDB `boardImages`에 저장합니다.
3. 게시글 block에는 `imageId`와 `name`만 저장합니다.
4. 상세/수정 화면은 `getBoardImages`로 dataUrl을 다시 조회합니다.
5. 수정 중 제거된 이미지 ID는 `getRemovedBoardImageIds`로 계산합니다.
6. 영구 삭제 또는 draft 삭제 시 연결된 이미지 ID를 `deleteBoardImages`로 삭제합니다.
7. 복구함 이동 시 이미지는 삭제하지 않습니다.

## 카테고리 구조

기본 카테고리 ID는 `general`입니다.

기본 카테고리:

- `general`: 일반
- `notice`: 공지
- `dev`: 개발
- `daily`: 일상
- `question`: 질문
- `image`: 이미지

규칙:

- 빈 이름은 추가/수정하지 않습니다.
- 중복 이름은 추가/수정하지 않습니다.
- `general`은 삭제할 수 없습니다.
- 카테고리를 삭제하면 연결 게시글은 `general`로 이동합니다.

## 검색/정렬/고정글 구조

검색 범위는 `Board.jsx`의 `SEARCH_SCOPES` 기준입니다.

- `title`
- `content`
- `author`

정렬 옵션은 `BOARD_SORT_OPTIONS` 기준입니다.

- `latest`
- `oldest`
- `views`
- `title`

고정글은 `pinned: true`로 표시하며, `sortBoardPosts`에서 각 정렬 모드 안에서 우선 노출합니다.

## 임시저장 구조

다중 임시저장은 `tenvi.board.drafts`에 저장합니다.

```js
{
  id: 'draft-id',
  author: 'TENVI',
  title: '임시저장 제목',
  categoryId: 'general',
  blocks: [],
  savedAt: '2026-06-22T00:00:00.000Z'
}
```

규칙:

- 최대 10개 보관
- 최신 저장 시각 순 정렬
- legacy key `tenvi.board.draft`를 읽어 다중 draft 목록에 병합
- 작성 완료 시 현재 active draft와 legacy draft 정리
- draft 삭제 시 연결된 이미지 ID 정리

## 복구함 구조

복구함은 별도 key를 쓰지 않습니다.

- 삭제: `moveBoardPostToTrash`가 `deletedAt` 추가
- 활성 목록: `deletedAt`이 없는 글
- 복구함: `deletedAt`이 있는 글
- 복구: `restoreBoardPost`가 `deletedAt` 제거
- 영구 삭제: `deleteBoardPost`로 배열에서 제거하고 연결 이미지 삭제

## UserAvatar / 프로필 연동 구조

- `Board.jsx`가 `STORAGE_KEYS.userProfile`에서 현재 로컬 프로필을 읽습니다.
- 새 글 작성자 기본값은 `parseUserProfile(...).nickname`입니다.
- `BoardList`와 `BoardDetail`은 현재 프로필의 `avatarImageId`를 `UserAvatar`에 전달합니다.
- 게시글에 저장된 `author` 텍스트는 그대로 표시합니다.
- 프로필 변경은 기존 게시글 `author`를 강제로 바꾸지 않습니다.

## localStorage key 목록

| 용도 | key |
| --- | --- |
| 게시글 목록 | `tenvi.board.posts` |
| 카테고리 목록 | `tenvi.board.categories` |
| legacy 단일 임시저장 | `tenvi.board.draft` |
| 다중 임시저장 | `tenvi.board.drafts` |
| 로컬 사용자 프로필 | `tenvi.user.profile` |

## IndexedDB 목록

| 용도 | DB | version | store | keyPath |
| --- | --- | --- | --- | --- |
| Board 이미지 | `TENVI_BOARD_DB` | `1` | `boardImages` | `id` |
| 프로필 이미지 | `TENVI_PROFILE_DB` | `1` | `profileImages` | `id` |

## 주요 사용자 흐름

### 새 글 작성

1. Board 목록에서 글쓰기 클릭
2. 프로필 nickname을 작성자 기본값으로 설정
3. 제목, 카테고리, 텍스트/이미지 블록 입력
4. 이미지 파일은 IndexedDB에 저장되고 block에는 `imageId` 저장
5. 제출 시 `createBoardPost`로 게시글 생성
6. `tenvi.board.posts`에 저장
7. 현재 active draft 정리

### 상세 보기

1. 목록 제목 클릭
2. `increaseBoardPostViews`로 조회수 증가
3. 증가된 posts 배열을 `tenvi.board.posts`에 저장
4. 상세 화면에서 이미지 block의 `imageId`를 IndexedDB에서 복원

### 수정

1. 상세에서 수정 클릭
2. legacy content-only 글도 blocks로 보정
3. 수정 저장 시 `updateBoardPost` 적용
4. 제거된 이미지 ID를 계산해 IndexedDB에서 삭제

### 삭제/복구/영구 삭제

1. 삭제는 `deletedAt`을 추가해 복구함으로 이동
2. 복구는 `deletedAt` 제거
3. 영구 삭제는 posts 배열에서 제거
4. 영구 삭제 시 연결된 Board 이미지 삭제

## 테스트 범위

Board 관련 테스트 파일:

- `src/modules/boardLogic.test.js`
- `src/modules/boardBackupLogic.test.js`
- `src/modules/userProfileLogic.test.js`
- `src/constants/storageKeys.test.js`

주요 검증 범위:

- 게시글 생성, 수정, 삭제
- blocks 정규화
- imageId 추출과 제거 이미지 계산
- 카테고리 추가, 수정, 삭제, fallback
- draft 생성과 파싱
- 복구함 이동과 복구
- 정렬과 고정글 우선순위
- Board 백업 payload 검증과 복원 대상 key 제한
- 프로필 nickname/bio/avatarImageId 보정

검증 명령:

```bash
npm run test:run
npm run build
npm run lint
```

## 현재 한계

- Board 상세 URL 라우팅은 없습니다.
- Board 백업 복원은 병합이 아니라 덮어쓰기 방식입니다.
- 이미지 캡션 기능은 현재 코드 기준 확인되지 않습니다.
- 카테고리별 개별 게시글 수 배지는 현재 코드 기준 확인되지 않습니다.
- 다중 사용자 모델은 없으며, Avatar는 현재 로컬 사용자 프로필을 기준으로 표시합니다.

## 추후 개선 방향

- Board 백업 병합 복원
- 검색/정렬 조건 저장
- 게시글 상세 URL 라우팅
- 댓글 기능과 UserAvatar 재사용
- 이미지 caption 필드 추가 여부 검토
- Dashboard 최근 게시글 카드 강화
- Command Console의 Board 검색/요약 명령 확장
