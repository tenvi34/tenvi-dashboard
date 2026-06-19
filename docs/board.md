# TENVI Board 모듈 문서

## 1. Board 모듈 개요

Board 모듈은 TENVI Dashboard 안에서 개인 게시판 기능을 담당한다. 서버 기반 게시판이 아니라 브라우저 로컬 저장소를 사용하는 클라이언트 단독 모듈이며, 게시글 목록, 상세 보기, 작성, 수정, 삭제, 복구함, 카테고리, 검색, 정렬, 고정글, 이미지 포함 글쓰기, 다중 임시저장을 제공한다.

저장 구조는 두 가지로 나뉜다.

- 게시글, 카테고리, 임시저장 메타데이터는 `localStorage`에 저장한다.
- 게시글 이미지 원본 데이터는 `IndexedDB`에 저장하고, 게시글 데이터에는 이미지 식별자인 `imageId`만 저장한다.

이 구조 덕분에 게시글 데이터는 JSON으로 관리하면서도 이미지 데이터가 `localStorage`를 과도하게 차지하지 않도록 분리할 수 있다. 다만 모든 데이터는 현재 브라우저의 로컬 저장소에만 존재하므로 서버 동기화, 로그인 기반 소유권 관리, 기기 간 동기화는 제공하지 않는다.

## 2. 주요 기능 목록

### 게시글 CRUD

- 게시글 목록 보기
- 게시글 상세 보기
- 게시글 작성
- 게시글 수정
- 게시글 삭제
- 삭제된 게시글 복구
- 복구함에서 영구 삭제
- 게시글 제목 클릭 시 상세 화면 진입
- 상세 화면 진입 시 조회수 증가 및 `localStorage` 저장

### 검색

Board 목록 하단의 검색 UI에서 검색어를 입력하고 검색 범위를 선택할 수 있다. 현재 검색 범위는 `title`, `content`, `author`이며, UI 라벨은 `translations.js`의 `board.searchScopes`에서 관리한다.

### 정렬

정렬 옵션은 `BOARD_SORT_OPTIONS`에 정의되어 있다.

- `latest`: 최신순
- `oldest`: 오래된순
- `views`: 조회수순
- `title`: 제목순

정렬은 `sortBoardPosts`에서 처리하며, 고정글은 정렬 모드와 관계없이 우선 배치된다.

### 고정글

게시글 상세 화면에서 고정/해제를 전환할 수 있다. 로직은 `toggleBoardPostPinned`에서 처리하며, 게시글 객체에는 `pinned: true` 형태로 저장된다.

주의: 문서 요구사항의 `isPinned`라는 이름은 현재 코드 필드명이 아니다. 현재 구현 기준 필드명은 `pinned`이다.

### 카테고리 관리

- 카테고리별 게시글 필터
- 카테고리 생성
- 카테고리 이름 수정
- 카테고리 삭제
- 기본 카테고리 `general` 삭제 방지
- 삭제된 카테고리에 속한 게시글을 기본 카테고리로 이동

카테고리 로직은 `addBoardCategory`, `updateBoardCategory`, `deleteBoardCategory`, `movePostsToDefaultCategory`, `getPostCategoryId`, `getBoardCategoryName`에서 처리한다.

### 블록 기반 에디터

Board는 단일 textarea가 아니라 `blocks` 배열 기반으로 글 내용을 관리한다. 블록은 크게 텍스트 블록과 이미지 블록으로 나뉜다.

- 텍스트 블록 추가
- 이미지 블록 추가
- 블록 삭제
- 블록 위/아래 이동
- 포인터 드래그 기반 블록 재정렬
- 이미지 추가 후 필요한 경우 다음 텍스트 블록 자동 삽입

### 이미지 저장

- 이미지 파일은 `BoardEditor.jsx`에서 선택한다.
- 선택된 이미지는 `saveBoardImage`를 통해 IndexedDB에 저장한다.
- 게시글 블록에는 `imageId`와 `name`을 저장한다.
- 상세 화면과 편집 화면에서는 `getBoardImages`로 `imageId`에 해당하는 `dataUrl`을 다시 조회해 미리보기에 사용한다.
- 수정 중 제거된 이미지의 `imageId`는 `getRemovedBoardImageIds`로 계산한 뒤 `deleteBoardImages`로 정리한다.
- 복구함에서 영구 삭제할 때 연결된 이미지도 `deleteBoardImages`로 삭제한다.

### 임시저장

- 글쓰기 화면에서 현재 입력 상태를 임시저장할 수 있다.
- 여러 개의 임시저장 글을 `tenvi.board.drafts`에 저장한다.
- 기존 단일 임시저장 key인 `tenvi.board.draft`도 읽어 다중 임시저장 목록에 병합한다.
- `임시저장 불러오기` 버튼으로 임시저장 목록을 열고 원하는 항목을 클릭해 불러온다.
- 임시저장 삭제와 전체 삭제를 지원한다.
- 임시저장 목록은 저장 시각 기준 최신순으로 정렬하고 최대 `10`개까지 유지한다.

### 복구함

- 일반 삭제는 게시글을 즉시 제거하지 않고 `deletedAt`을 추가해 복구함 상태로 만든다.
- 활성 목록은 `deletedAt`이 없는 게시글만 보여준다.
- 복구함은 `deletedAt`이 있는 게시글을 보여준다.
- 복구 시 `deletedAt`을 제거하고 `updatedAt`을 갱신한다.
- 영구 삭제 시 게시글을 배열에서 제거하고 연결된 이미지 데이터를 IndexedDB에서 삭제한다.

복구함은 별도 localStorage key를 사용하지 않는다. `tenvi.board.posts` 안의 게시글 객체 상태로 관리한다.

### 테스트

Board 핵심 데이터 로직은 `src/modules/boardLogic.test.js`에서 검증한다. UI 테스트가 아니라 게시글 생성, 정규화, 정렬, 카테고리, 임시저장, 복구함, 이미지 ID 처리 같은 순수 로직 중심의 테스트다.

## 3. 주요 파일 역할

### `src/modules/Board.jsx`

Board 모듈의 화면 상태와 사용자 흐름을 담당한다.

주요 역할:

- 게시글 목록/상세/작성/수정 화면 전환
- `localStorage`에서 게시글, 카테고리, 임시저장 복원
- 게시글 저장, 수정, 조회수 증가, 삭제, 복구, 영구 삭제
- 카테고리 생성/수정/삭제
- 검색어, 검색 범위, 카테고리 필터, 정렬 상태 관리
- 임시저장 저장/불러오기/삭제
- 상세 이미지 확대 보기 상태 관리
- IndexedDB 이미지 조회 및 삭제 호출

주요 내부 상수:

```js
const POSTS_STORAGE_KEY = STORAGE_KEYS.boardPosts
const DRAFT_STORAGE_KEY = STORAGE_KEYS.boardDraft
const DRAFTS_STORAGE_KEY = STORAGE_KEYS.boardDrafts
const CATEGORIES_STORAGE_KEY = STORAGE_KEYS.boardCategories
const CATEGORY_FILTER_ALL = 'all'
const SEARCH_SCOPES = ['title', 'content', 'author']
const LEGACY_DRAFT_ID = 'legacy-board-draft'
const MAX_BOARD_DRAFTS = 10
```

### `src/modules/BoardEditor.jsx`

블록 기반 글쓰기 에디터를 담당한다.

주요 역할:

- 텍스트 블록 생성/수정
- 이미지 파일 선택
- `saveBoardImage`를 통한 이미지 IndexedDB 저장
- 이미지 블록 생성
- `getBoardImages`를 통한 이미지 미리보기 복원
- 블록 삭제
- 블록 위/아래 이동
- 포인터 드래그 기반 블록 재정렬

현재 코드 기준 이미지 블록에 별도 caption 입력 UI는 확인되지 않는다. 이미지 블록은 `imageId`, `src`, `name` 중심으로 관리된다.

### `src/modules/boardLogic.js`

Board 데이터 처리와 저장 구조 정규화를 담당하는 순수 로직 모음이다. UI 상태를 직접 다루지 않고, 입력 데이터를 받아 새 데이터 구조를 반환한다.

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

### `src/modules/boardLogic.test.js`

`boardLogic.js`의 순수 로직을 검증한다. 저장소나 DOM이 아니라 입력/출력 중심의 테스트로 구성되어 있어 Board 데이터 구조 변경 시 회귀를 빠르게 확인할 수 있다.

### `src/modules/boardImageStore.js`

Board 이미지 IndexedDB 저장소를 담당한다.

주요 역할:

- IndexedDB 초기화
- 이미지 파일을 `FileReader`로 `dataUrl` 변환
- 이미지 레코드 저장
- 이미지 단건/여러 건 조회
- 이미지 단건/여러 건 삭제

주요 export:

- `saveBoardImage`
- `getBoardImage`
- `getBoardImages`
- `deleteBoardImage`
- `deleteBoardImages`

### `src/modules/Board.css`

Board 모듈 전용 스타일 파일이다. 목록, 상세, 작성/수정 에디터, 임시저장 목록, 복구함, 이미지 확대 보기, 테마별 Board 보정 스타일을 포함한다.

### `src/i18n/translations.js`

Board UI 문구는 `translations.js`의 `board` 섹션에서 관리한다. 한국어/영어 문구가 함께 정의되어 있으며, 검색 범위 라벨, 정렬 옵션 라벨, 임시저장 문구, 복구함 문구, 이미지 확대 보기 문구 등이 포함된다.

## 4. 게시글 데이터 구조

게시글은 `tenvi.board.posts`에 JSON 배열로 저장된다. 현재 생성 로직인 `createBoardPost` 기준 기본 형태는 다음과 같다.

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
  views: 0
}
```

필드 설명:

- `id`: 게시글 고유 ID. `createBoardPost`에서 `crypto.randomUUID()`를 사용한다.
- `title`: trim 처리된 게시글 제목.
- `content`: 텍스트 블록 내용을 합친 문자열. 이미지 블록은 포함하지 않는다.
- `blocks`: 텍스트/이미지 블록 배열.
- `author`: 작성자. 비어 있으면 `TENVI`를 사용한다.
- `categoryId`: 카테고리 ID. 기본값은 `general`.
- `createdAt`: 생성 시각 ISO 문자열.
- `updatedAt`: 수정 시각 ISO 문자열.
- `views`: 조회수. 상세 진입 시 증가한다.
- `pinned`: 고정글 여부. 고정된 게시글에만 `true`로 들어갈 수 있다.
- `deletedAt`: 복구함 이동 시 추가되는 삭제 시각. 이 값이 있으면 활성 목록에서 제외된다.

### 기존 데이터 호환

기존 게시글이 `categoryId` 대신 `category` 필드를 갖고 있을 수 있다. 이 경우 `getPostCategoryId`가 `post.categoryId ?? post.category` 순서로 값을 읽고, 현재 카테고리 목록에 없는 값이면 기본 카테고리 `general`로 보정한다.

기존 게시글이 `blocks` 없이 `content`만 갖고 있을 수 있다. `normalizeBoardBlocks(blocks, fallbackContent)`는 `blocks`가 배열이 아니면 `content`를 텍스트 블록 하나로 변환한다.

```js
normalizeBoardBlocks(undefined, '기존 본문')
// [
//   { id: '...', type: 'text', content: '기존 본문' }
// ]
```

## 5. `blocks` 구조

Board는 본문을 `blocks` 배열로 관리한다.

### text block

```js
{
  id: 'block-id',
  type: 'text',
  content: '텍스트 내용'
}
```

`content`는 문자열로 정규화된다. `getBoardPostTextContent`는 텍스트 블록의 `content`를 trim 후 빈 값을 제외하고 `\n\n`으로 합쳐 게시글의 `content` 필드를 만든다.

### image block

```js
{
  id: 'block-id',
  type: 'image',
  imageId: 'board-image-...',
  name: 'image.png'
}
```

현재 이미지 저장 방식에서는 `imageId`를 사용한다. 기존 또는 legacy 데이터 호환을 위해 `src` 기반 이미지 블록도 유지된다.

```js
{
  id: 'block-id',
  type: 'image',
  src: 'data:image/png;base64,...',
  name: 'legacy-image.png'
}
```

### image caption

현재 코드 기준으로 이미지 caption 전용 필드는 확인되지 않는다. `BoardEditor.jsx`에도 caption 입력 UI가 없고, `normalizeBoardImageBlock`은 `imageId`, `src`, `name`만 정규화한다.

따라서 caption 구조는 현재 코드 기준 확인 필요 항목이다. 추후 caption을 추가하려면 image block에 `caption` 필드를 도입하고, `normalizeBoardImageBlock`, 상세 렌더링, 테스트를 함께 갱신해야 한다.

### blocks 구조를 사용하는 이유

단일 textarea만 사용하면 텍스트와 이미지의 순서를 표현하기 어렵다. `blocks` 구조는 다음 이점이 있다.

- 텍스트와 이미지를 원하는 순서로 섞을 수 있다.
- 이미지 블록을 본문 중간에 배치할 수 있다.
- 블록 단위 이동, 삭제, 삽입이 가능하다.
- 게시글 수정 시 제거된 이미지 블록을 계산해 IndexedDB 이미지를 정리할 수 있다.
- 추후 코드 블록, 체크리스트, 인용문 같은 블록 타입으로 확장하기 쉽다.

## 6. 이미지 저장 구조

게시글의 `localStorage` 데이터에는 실제 이미지 데이터가 들어가지 않는다. 이미지 블록은 `imageId`만 저장하고, 실제 이미지 `dataUrl`은 IndexedDB의 `boardImages` object store에 저장한다.

### IndexedDB 이미지 레코드

`saveBoardImage`는 파일을 `dataUrl`로 변환한 뒤 다음 형태로 저장한다.

```js
{
  id: 'board-image-...',
  dataUrl: 'data:image/png;base64,...',
  name: 'image.png',
  type: 'image/png',
  createdAt: '2026-06-19T00:00:00.000Z'
}
```

`saveBoardImage`가 반환하는 값은 게시글 블록에 넣기 위한 최소 정보다.

```js
{
  imageId: 'board-image-...',
  name: 'image.png',
  type: 'image/png'
}
```

### `boardImageStore.js` 역할

- `openBoardImageDb`: `TENVI_BOARD_DB` 데이터베이스를 열고 object store를 준비한다.
- `saveBoardImage`: 파일을 IndexedDB에 저장하고 `imageId`를 반환한다.
- `getBoardImage`: imageId 단건 조회.
- `getBoardImages`: imageId 배열 조회 후 `{ [imageId]: imageRecord }` 형태로 반환.
- `deleteBoardImage`: imageId 단건 삭제.
- `deleteBoardImages`: imageId 여러 건 삭제.

### 이미지 정리 시점

- 게시글 수정 시: 수정 전후 블록을 비교해 제거된 `imageId`를 `getRemovedBoardImageIds`로 계산하고 `deleteBoardImages`를 호출한다.
- 복구함으로 이동 시: 이미지를 삭제하지 않는다. 복구 가능해야 하기 때문이다.
- 영구 삭제 시: 게시글을 `tenvi.board.posts`에서 제거하고 연결된 이미지 `imageId`를 IndexedDB에서 삭제한다.
- 임시저장 삭제 시: 해당 draft에 포함된 이미지 ID를 삭제한다.
- 임시저장 전체 삭제 시: draft 목록 전체의 이미지 ID를 모아 삭제한다.

### 기존 `src` 기반 이미지 블록 호환

`normalizeBoardImageBlock`은 `imageId`뿐 아니라 `src`도 유지한다. 상세 화면과 편집 화면은 `block.src || imagePreviews[block.imageId]` 흐름으로 이미지 소스를 결정한다. 따라서 과거에 `src`로 저장된 이미지 블록도 표시할 수 있다.

## 7. 카테고리 구조

카테고리는 `tenvi.board.categories`에 JSON 배열로 저장된다.

```js
{
  id: 'general',
  name: '일반',
  createdAt: '2026-06-19T00:00:00.000Z',
  updatedAt: '2026-06-19T00:00:00.000Z',
  isDefault: true
}
```

기본 카테고리 ID는 `DEFAULT_BOARD_CATEGORY_ID`에 정의된 `general`이다.

기본 카테고리 목록은 `DEFAULT_BOARD_CATEGORIES`에 정의되어 있으며 현재 코드 기준 ID는 다음과 같다.

- `general`
- `notice`
- `dev`
- `daily`
- `question`
- `image`

`normalizeBoardCategories`는 저장된 카테고리 배열이 없거나 비정상일 때 기본 카테고리 목록을 반환한다. 또한 `general`이 누락된 경우 fallback으로 다시 추가한다.

카테고리 정책:

- 이름이 비어 있으면 생성/수정하지 않는다.
- 같은 이름의 카테고리는 중복 생성하지 않는다.
- `general` 카테고리는 삭제할 수 없다.
- 다른 카테고리를 삭제하면 `movePostsToDefaultCategory`가 해당 카테고리의 게시글을 `general`로 이동시킨다.

## 8. 임시저장 구조

임시저장은 `createBoardDraft`로 생성한다.

```js
{
  author: 'TENVI',
  title: '임시저장 제목',
  categoryId: 'general',
  blocks: [
    { id: 'block-1', type: 'text', content: '작성 중 내용' }
  ],
  savedAt: '2026-06-19T00:00:00.000Z'
}
```

다중 임시저장 목록에서는 Board.jsx가 이 draft payload에 `id`를 추가해 저장한다.

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

저장 key:

- `tenvi.board.drafts`: 다중 임시저장 목록.
- `tenvi.board.draft`: 기존 단일 임시저장 key. 호환을 위해 계속 읽고 저장한다.

흐름:

1. 글쓰기 화면을 열면 `loadBoardDrafts`로 다중 임시저장 목록을 읽는다.
2. `tenvi.board.draft`에 legacy draft가 있으면 `LEGACY_DRAFT_ID` 또는 legacy draft의 `id`로 목록에 병합한다.
3. 임시저장을 실행하면 현재 입력값으로 draft를 만들고 `tenvi.board.drafts`에 저장한다.
4. 목록은 저장 시각 기준 최신순으로 정렬하고 최대 `MAX_BOARD_DRAFTS = 10`개까지 유지한다.
5. 다른 draft를 불러오기 전에 현재 입력값이 있으면 확인창을 띄우고, 필요한 경우 현재 입력값도 draft로 저장한다.
6. 게시글 작성이 완료되면 legacy draft를 삭제하고, 현재 active draft를 다중 목록에서 제거한다.

## 9. 복구함 구조

복구함은 별도 key나 별도 배열을 사용하지 않는다. `tenvi.board.posts`에 저장된 게시글 객체의 `deletedAt` 필드로 상태를 구분한다.

삭제 흐름:

```js
moveBoardPostToTrash(posts, postId)
```

대상 게시글에 다음 필드를 반영한다.

```js
{
  ...post,
  deletedAt: '2026-06-19T00:00:00.000Z',
  updatedAt: '2026-06-19T00:00:00.000Z'
}
```

목록 구분:

- 활성 게시글: `!post.deletedAt`
- 복구함 게시글: `post.deletedAt`

복구 흐름:

```js
restoreBoardPost(posts, postId)
```

`deletedAt`을 제거하고 `updatedAt`을 현재 시각으로 갱신한다.

영구 삭제 흐름:

1. `getBoardImageIds(targetPost.blocks)`로 연결 이미지 ID를 추출한다.
2. `deleteBoardPost(posts, postId)`로 게시글 배열에서 제거한다.
3. `deleteBoardImages(imageIds)`로 IndexedDB 이미지 데이터를 삭제한다.

## 10. localStorage / IndexedDB key 목록

### localStorage

| 용도 | key | 비고 |
| --- | --- | --- |
| 게시글 목록 | `tenvi.board.posts` | 활성 글과 복구함 글을 모두 포함한다. 복구함은 `deletedAt` 필드로 구분한다. |
| 카테고리 목록 | `tenvi.board.categories` | 카테고리 배열 저장. |
| 단일 임시저장 | `tenvi.board.draft` | 기존 데이터 호환용 legacy key. 현재도 일부 흐름에서 저장/삭제한다. |
| 다중 임시저장 | `tenvi.board.drafts` | 다중 draft 목록 저장. |
| 복구함 | 별도 key 없음 | `tenvi.board.posts` 내부의 `deletedAt` 필드로 관리한다. |

위 key는 `src/constants/storageKeys.js`의 `STORAGE_KEYS`에 정의되어 있다.

### IndexedDB

| 항목 | 값 |
| --- | --- |
| DB 이름 | `TENVI_BOARD_DB` |
| DB 버전 | `1` |
| object store 이름 | `boardImages` |
| keyPath | `id` |

IndexedDB 관련 상수는 `src/modules/boardImageStore.js`에 정의되어 있다.

## 11. 주요 사용자 흐름

### 글 작성 흐름

1. 사용자가 목록에서 `글쓰기`를 누른다.
2. `handleOpenWrite`가 작성 폼을 초기화하고 draft 목록을 다시 읽는다.
3. 사용자가 작성자, 제목, 카테고리, blocks를 입력한다.
4. `작성` 버튼을 누르면 `handleCreatePost`가 제목과 본문 존재 여부를 확인한다.
5. `createBoardPost`로 게시글 객체를 만든다.
6. 새 게시글을 posts 배열 앞에 추가하고 `tenvi.board.posts`에 저장한다.
7. 작성 완료 후 active draft를 삭제하고 목록으로 돌아간다.

### 이미지 포함 글 작성 흐름

1. 에디터에서 이미지 추가 버튼을 누른다.
2. 파일 선택 input이 열린다.
3. `BoardEditor.jsx`의 `addImageBlock`이 파일을 `saveBoardImage`로 IndexedDB에 저장한다.
4. 반환된 `imageId`와 파일명을 image block으로 추가한다.
5. 게시글 저장 시 localStorage에는 image block의 `imageId`만 저장된다.
6. 상세 화면에서는 `getBoardImages`로 imageId에 해당하는 `dataUrl`을 조회해 렌더링한다.

### 글 수정 흐름

1. 상세 화면에서 `수정`을 누른다.
2. `handleOpenEdit`이 선택 게시글을 editable blocks로 변환한다.
3. 사용자가 제목, 작성자, 카테고리, blocks를 수정한다.
4. 저장 시 `getRemovedBoardImageIds`로 수정 전후 제거된 이미지 ID를 계산한다.
5. `updateBoardPost`로 게시글을 갱신하고 `tenvi.board.posts`에 저장한다.
6. 제거된 이미지 ID는 `deleteBoardImages`로 IndexedDB에서 삭제한다.

### 글 삭제/복구/영구삭제 흐름

1. 상세 화면에서 삭제를 누르면 확인창을 띄운다.
2. 확인 시 `moveBoardPostToTrash`가 게시글에 `deletedAt`을 추가한다.
3. 활성 목록에서는 해당 게시글이 제외되고 복구함에서 보인다.
4. 복구를 누르면 `restoreBoardPost`가 `deletedAt`을 제거한다.
5. 영구 삭제를 누르면 `deleteBoardPost`로 게시글을 제거하고, 연결된 이미지도 `deleteBoardImages`로 삭제한다.

### 카테고리 관리 흐름

1. 목록 화면에서 카테고리 관리 패널을 연다.
2. 새 이름을 입력해 카테고리를 추가한다.
3. 기존 카테고리 이름을 수정할 수 있다.
4. 카테고리를 삭제하면 해당 카테고리에 속한 게시글은 기본 카테고리 `general`로 이동한다.
5. 기본 카테고리 `general`은 삭제할 수 없다.

### 임시저장 불러오기 흐름

1. 글쓰기 화면에서 `임시저장 불러오기`를 누른다.
2. `draftList`에 저장된 draft 목록이 열린다.
3. 사용자가 원하는 draft를 클릭한다.
4. 현재 작성 중인 내용이 있고 다른 draft를 불러오는 경우 확인창을 띄운다.
5. 필요한 경우 현재 작성 중인 내용을 draft로 저장한다.
6. 선택한 draft를 폼에 복원하고 목록을 닫는다.

## 12. 테스트 범위

`src/modules/boardLogic.test.js`에서 확인되는 주요 테스트 범위는 다음과 같다.

### 게시글 생성/수정/삭제

- 정상 게시글 생성
- blocks 기반 게시글 생성
- 빈 제목 게시글 생성 방지
- 빈 본문/빈 blocks 게시글 생성 방지
- 이미지 전용 게시글 생성 허용
- `crypto.randomUUID` 기반 ID 생성
- 게시글 삭제 시 원본 배열 불변성 유지
- 게시글 수정 시 `id`, `createdAt`, `views` 같은 안정 필드 보존
- 제목 또는 본문이 비어 있으면 수정하지 않음

### blocks 정규화

- content-only legacy 게시글을 text block으로 변환
- text block에서 게시글 `content` 생성
- image block 보존
- imageId 기반 image block 보존
- 텍스트 content 생성 시 image block 제외

### imageId 처리

- `getBoardImageIds`로 blocks 안의 imageId 추출
- `getRemovedBoardImageIds`로 수정 중 제거된 imageId 계산
- imageId block 업데이트 보존

### category 처리

- 기본 카테고리 정규화
- 저장된 카테고리 JSON 안전 파싱
- 유효하고 중복되지 않는 카테고리 추가
- 빈 카테고리/중복 카테고리 추가 방지
- 카테고리 이름 수정
- `general` 카테고리 삭제 방지
- `general` 외 기본 카테고리 삭제 허용
- 삭제된 카테고리의 게시글을 `general`로 이동
- legacy `category` 필드를 `categoryId`처럼 읽기
- 카테고리 이름 fallback 조회

### draft 처리

- `createBoardDraft`로 draft 생성
- `parseBoardDraft`로 draft JSON 복원
- damaged draft 데이터 안전 처리
- draft blocks shape 보존

### trash 처리

- `moveBoardPostToTrash`로 `deletedAt` 추가
- `restoreBoardPost`로 `deletedAt` 제거
- 원본 posts 배열을 직접 변경하지 않음

### sort/pin 처리

- `sortBoardPosts`가 원본 배열을 mutate하지 않음
- 최신순, 오래된순, 조회수순, 제목순 정렬
- `toggleBoardPostPinned`로 고정 상태 전환
- 고정글이 각 정렬 모드에서 먼저 노출됨

## 13. 현재 한계와 추후 개선 방향

### 현재 한계

- 서버 저장소가 없다.
- 로그인/사용자 인증이 없다.
- 작성자 입력은 단순 텍스트이며 실제 사용자 계정과 연결되지 않는다.
- `localStorage`와 IndexedDB는 브라우저 로컬 저장소이므로 기기 간 동기화가 없다.
- 브라우저 데이터 삭제, 다른 기기 사용, 시크릿 모드 등에 취약하다.
- 복구함도 같은 `tenvi.board.posts` 배열 안에서 관리하므로 대량 데이터가 쌓이면 별도 보관 정책이 필요할 수 있다.
- 현재 코드 기준 이미지 caption 입력/저장 구조는 확인되지 않는다.
- 현재 모듈 이동은 React state 기반이며 React Router 기반 URL 라우팅은 없다.

### 추후 개선 방향

- Board 데이터 백업/복원 기능 강화
- 서버 API 연동
- 인증 기반 사용자/작성자 관리
- 댓글 기능 추가
- 사용자 프로필 기능 추가
- 게시글 상세 URL을 위한 React Router 도입
- 이미지 caption 필드 추가
- 게시글 첨부 이미지 정리 상태를 점검하는 관리 도구 추가
- 검색/정렬 조건을 URL 또는 localStorage에 저장하는 기능
- 실제 인증 기반 게시판으로 확장

## 현재 코드 기준 확인 필요 항목

- 이미지 caption 구조: 현재 `BoardEditor.jsx`와 `boardLogic.js` 기준으로 caption 입력/저장 필드는 확인되지 않는다.
- 복구함 전용 localStorage key: 현재 별도 key는 없고 `tenvi.board.posts` 내부의 `deletedAt`으로 관리된다.
