# TENVI Board 모듈 문서

## 개요

Board 모듈은 TENVI Dashboard 안의 개인 게시판 기능이다. 서버 API 없이 브라우저 로컬 저장소를 사용하며, 게시글 목록, 상세 보기, 작성, 수정, 삭제, 복구함, 카테고리, 검색, 정렬, 고정글, 이미지 블록, 다중 임시저장을 제공한다.

현재 구현은 다음 저장소를 사용한다.

- 게시글, 카테고리, 임시저장 메타데이터: `localStorage`
- 게시글 이미지 원본 데이터: `IndexedDB`
- 게시글 데이터에는 이미지 원본을 넣지 않고 `imageId`만 저장한다.

## 파일 구조

Board는 Map 모듈처럼 엔트리 파일과 하위 컴포넌트 폴더를 나눈다.

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
src/modules/boardLogic.js
src/modules/boardLogic.test.js
src/modules/boardImageStore.js
src/constants/storageKeys.js
```

### `src/modules/Board.jsx`

Board 모듈의 엔트리 컴포넌트다. 화면 조립, 상태 소유, 저장소 읽기/쓰기, 주요 핸들러를 담당한다.

주요 역할:

- 목록, 상세, 작성, 수정 화면 전환
- 게시글, 카테고리, 임시저장 복원 및 저장
- 게시글 생성, 수정, 조회수 증가, 삭제, 복구, 영구 삭제
- 카테고리 생성, 수정, 삭제
- 검색어, 검색 범위, 카테고리 필터, 정렬 상태 관리
- 상세 이미지 미리보기 데이터 조회
- 이미지 확대 보기 모달 상태 관리

`Board.jsx`는 기존 localStorage key를 직접 보존한다. key 이름을 바꾸거나 의미를 재사용하면 안 된다.

### `src/modules/board/BoardForm.jsx`

게시글 작성/수정 폼을 담당한다.

- 작성/수정 헤더와 제출/취소 버튼
- 카테고리, 작성자, 제목 입력
- `BoardEditor` 연결
- 작성 모드의 임시저장 상태 표시
- 임시저장 목록 열기, 불러오기, 삭제, 전체 삭제 UI

실제 저장 로직은 `Board.jsx`의 핸들러를 props로 받아 실행한다.

### `src/modules/board/BoardEditor.jsx`

블록 기반 게시글 에디터다.

- 텍스트 블록 추가/수정
- 이미지 파일 선택 후 `saveBoardImage`로 IndexedDB 저장
- 이미지 블록 추가
- 블록 삭제
- 블록 위/아래 이동
- pointer 기반 블록 재정렬
- 이미지 preview 복원

이미지 블록은 `imageId`, `src`, `name` 중심으로 유지한다. caption UI는 현재 없다.

### `src/modules/board/BoardDetail.jsx`

게시글 상세 화면을 담당한다.

- 제목, 작성자, 날짜, 조회수, 카테고리 표시
- 고정/해제, 목록, 수정, 삭제 버튼
- 텍스트/이미지 블록 렌더링
- 이미지 클릭 시 확대 보기 요청
- 선택 게시글이 없을 때 missing 상태 표시

### `src/modules/board/BoardList.jsx`

게시글 목록 화면을 담당한다.

- 글쓰기 버튼
- 복구함 토글
- 카테고리 필터
- 정렬 select
- 검색 패널
- 게시글 제목 목록
- 빈 상태와 검색 결과 없음 상태
- `BoardCategoryManager`, `BoardTrash` 조립

정렬 옵션은 `BOARD_SORT_OPTIONS`를 사용한다.

### `src/modules/board/BoardCategoryManager.jsx`

카테고리 관리 UI를 담당한다.

- 카테고리 추가
- 카테고리 이름 수정
- 카테고리 삭제
- 기본 카테고리 `general` 삭제 방지 UI
- 카테고리 오류 메시지 표시

카테고리 mutation 로직은 `boardLogic.js`와 `Board.jsx` 핸들러가 담당한다.

### `src/modules/board/BoardTrash.jsx`

복구함 UI를 담당한다.

- 삭제된 게시글 목록 표시
- 삭제 시각 표시
- 복구 버튼
- 영구 삭제 버튼
- 빈 복구함 메시지

복구함은 별도 localStorage key를 쓰지 않는다. 게시글 객체의 `deletedAt` 필드로 구분한다.

### `src/modules/board/BoardImageLightbox.jsx`

상세 이미지 확대 보기 모달이다.

- 모달 열림/닫힘 표시
- 배경 클릭 닫기
- 닫기 버튼
- 원본 비율 이미지 표시

body scroll lock과 Escape 닫기 처리는 `Board.jsx`에서 관리한다.

### `src/modules/boardLogic.js`

Board 데이터 구조와 순수 로직을 담당한다. UI state를 직접 만지지 않는다.

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

Board 이미지 IndexedDB 저장소를 담당한다.

주요 export:

- `saveBoardImage`
- `getBoardImage`
- `getBoardImages`
- `deleteBoardImage`
- `deleteBoardImages`

## localStorage / IndexedDB key

### localStorage

| 용도 | key | 설명 |
| --- | --- | --- |
| 게시글 목록 | `tenvi.board.posts` | 활성 글과 복구함 글을 모두 포함한다. `deletedAt`으로 상태를 구분한다. |
| 카테고리 목록 | `tenvi.board.categories` | 카테고리 배열 저장 |
| 단일 임시저장 | `tenvi.board.draft` | legacy key. 호환을 위해 계속 읽고 저장한다. |
| 다중 임시저장 | `tenvi.board.drafts` | 최대 10개의 draft 목록 저장 |

key 정의는 `src/constants/storageKeys.js`의 `STORAGE_KEYS`를 사용한다.

### IndexedDB

| 항목 | 값 |
| --- | --- |
| DB 이름 | `TENVI_BOARD_DB` |
| DB 버전 | `1` |
| object store | `boardImages` |
| keyPath | `id` |

## 게시글 데이터 구조

게시글은 `tenvi.board.posts`에 JSON 배열로 저장한다.

```js
{
  id: 'post-id',
  title: '게시글 제목',
  content: '텍스트 블록에서 추출한 본문',
  blocks: [
    {
      id: 'block-1',
      type: 'text',
      content: '본문'
    }
  ],
  author: 'TENVI',
  categoryId: 'general',
  createdAt: '2026-06-19T00:00:00.000Z',
  updatedAt: '2026-06-19T00:00:00.000Z',
  views: 0,
  pinned: true,
  deletedAt: '2026-06-20T00:00:00.000Z'
}
```

주의 사항:

- `pinned`는 고정된 게시글에만 `true`로 들어갈 수 있다.
- `deletedAt`이 있으면 복구함 글로 취급한다.
- legacy 게시글은 `category` 필드를 가질 수 있으며 `getPostCategoryId`가 보정한다.
- legacy 게시글은 `blocks` 없이 `content`만 가질 수 있으며 `normalizeBoardBlocks`가 텍스트 블록으로 보정한다.

## blocks 구조

Board 본문은 `blocks` 배열로 관리한다.

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

legacy 호환을 위해 `src` 기반 이미지 블록도 허용한다.

```js
{
  id: 'block-id',
  type: 'image',
  src: 'data:image/png;base64,...',
  name: 'legacy-image.png'
}
```

## 이미지 저장 흐름

1. `BoardEditor`에서 이미지 파일을 선택한다.
2. `saveBoardImage`가 파일을 dataUrl로 변환해 IndexedDB에 저장한다.
3. 게시글 block에는 `imageId`와 `name`만 저장한다.
4. 상세/수정 화면에서 `getBoardImages`로 `imageId`에 해당하는 dataUrl을 다시 조회한다.
5. 수정 중 제거된 이미지 ID는 `getRemovedBoardImageIds`로 계산하고 `deleteBoardImages`로 정리한다.
6. 복구함 이동 시 이미지는 삭제하지 않는다.
7. 영구 삭제 또는 draft 삭제 시 연결된 이미지 ID를 삭제한다.

## 카테고리 규칙

기본 카테고리 ID는 `general`이다.

기본 카테고리 목록은 `DEFAULT_BOARD_CATEGORIES`에 정의한다.

- `general`
- `notice`
- `dev`
- `daily`
- `question`
- `image`

규칙:

- 빈 이름은 추가/수정하지 않는다.
- 중복 이름은 추가/수정하지 않는다.
- `general`은 삭제할 수 없다.
- 다른 카테고리를 삭제하면 해당 카테고리 글은 `general`로 이동한다.

## 임시저장 규칙

다중 임시저장은 `tenvi.board.drafts`에 저장한다.

```js
{
  id: 'draft-id',
  author: 'TENVI',
  title: '임시저장 제목',
  categoryId: 'general',
  blocks: [],
  savedAt: '2026-06-19T00:00:00.000Z'
}
```

규칙:

- 최대 `MAX_BOARD_DRAFTS = 10`개를 보관한다.
- 최신 저장 시각 순으로 정렬한다.
- legacy key `tenvi.board.draft`를 읽어 다중 draft 목록에 병합한다.
- 작성 완료 시 현재 active draft와 legacy draft를 정리한다.
- draft 삭제 시 연결된 이미지 ID도 IndexedDB에서 정리한다.

## 복구함 규칙

복구함은 별도 저장 key를 쓰지 않는다.

- 삭제: `moveBoardPostToTrash`가 `deletedAt`을 추가한다.
- 목록: `deletedAt`이 없는 글만 활성 목록에 표시한다.
- 복구함: `deletedAt`이 있는 글만 표시한다.
- 복구: `restoreBoardPost`가 `deletedAt`을 제거한다.
- 영구 삭제: `deleteBoardPost`로 배열에서 제거하고 연결 이미지도 삭제한다.

## 보존해야 할 기존 동작

리팩토링 또는 기능 추가 시 다음 동작을 깨면 안 된다.

- 게시글 목록 보기
- 제목 목록 클릭으로 상세 진입
- 상세 진입 시 조회수 증가 및 `tenvi.board.posts` 저장
- 게시글 작성, 수정, 삭제
- 삭제 글 복구 및 영구 삭제
- 고정글 우선 정렬
- 검색 범위 `title`, `content`, `author`
- 정렬 모드 `latest`, `oldest`, `views`, `title`
- 카테고리 추가, 수정, 삭제와 `general` fallback
- 이미지 포함 게시글 작성과 상세 미리보기
- 다중 임시저장 저장, 불러오기, 삭제, 전체 삭제
- 기존 localStorage key 호환
- 기존 IndexedDB 이미지 저장소 호환

## 테스트

Board 순수 로직은 `src/modules/boardLogic.test.js`에서 검증한다.

주요 테스트 범위:

- 게시글 생성, 수정, 삭제
- blocks 정규화
- imageId 추출 및 제거 이미지 계산
- 카테고리 추가, 수정, 삭제, fallback
- draft 생성과 파싱
- 복구함 이동과 복구
- 정렬과 고정글 우선순위

검증 명령:

```bash
npm run test:run -- src/modules/boardLogic.test.js
npm run build
npm run lint
```

## 향후 개선 후보

- `Board.jsx`의 상태/핸들러를 hook으로 분리
- Board 데이터 백업/복원 기능
- 검색/정렬 조건 저장
- Dashboard 최근 게시글 카드
- Command Console에서 Board 검색/요약 명령
- 게시글 상세 URL 라우팅
- 이미지 caption 필드 추가
