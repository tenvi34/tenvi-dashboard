# 로컬 사용자 프로필 문서

## 개요

TENVI의 사용자 프로필은 실제 로그인/회원가입 계정이 아니라 브라우저 로컬 저장소 기반의 단일 사용자 프로필입니다. 현재 구현은 개인 대시보드 안에서 작성자 기본값과 원형 프로필 이미지를 제공하기 위한 구조입니다.

## 실제 로그인/회원가입이 아님

구현하지 않은 기능:

- 서버 로그인
- 회원가입
- 비밀번호
- 사용자별 권한
- 여러 사용자 전환
- 원격 동기화

프로필 데이터는 현재 브라우저 프로필의 localStorage와 IndexedDB에만 저장됩니다.

## 관련 파일

```txt
src/modules/userProfileLogic.js
src/modules/userProfileLogic.test.js
src/modules/profileImageStore.js
src/components/UserAvatar.jsx
src/components/UserAvatar.css
src/modules/Settings.jsx
src/modules/Settings.css
src/modules/Board.jsx
src/modules/board/BoardList.jsx
src/modules/board/BoardDetail.jsx
```

## 프로필 데이터 구조

localStorage key는 `tenvi.user.profile`입니다.

```js
{
  id: 'local-user',
  nickname: 'TENVI',
  bio: '',
  avatarImageId: '',
  createdAt: '2026-06-22T00:00:00.000Z',
  updatedAt: '2026-06-22T00:00:00.000Z'
}
```

필드 규칙:

- `id`: 고정값 `local-user`
- `nickname`: trim 후 빈 값이면 `TENVI` fallback
- `bio`: 문자열로 보존
- `avatarImageId`: 프로필 이미지 IndexedDB 레코드 ID
- `createdAt`: 최초 생성 시각
- `updatedAt`: 프로필 저장/이미지 변경/초기화 시 갱신

## 프로필 로직

`src/modules/userProfileLogic.js` export:

- `DEFAULT_USER_PROFILE_ID`
- `DEFAULT_USER_NICKNAME`
- `createDefaultUserProfile`
- `normalizeUserProfile`
- `parseUserProfile`
- `updateUserProfile`
- `resetUserProfile`

역할:

- 손상된 JSON을 기본 프로필로 복구
- nickname trim 처리
- 빈 nickname을 `TENVI`로 보정
- bio/avatarImageId를 문자열로 보존
- `updatedAt` 갱신

## 프로필 이미지 IndexedDB 저장 구조

프로필 이미지는 localStorage에 dataUrl로 직접 저장하지 않습니다. localStorage에는 `avatarImageId`만 저장하고 실제 dataUrl은 IndexedDB에 저장합니다.

`src/modules/profileImageStore.js` 기준:

| 항목 | 값 |
| --- | --- |
| DB 이름 | `TENVI_PROFILE_DB` |
| DB 버전 | `1` |
| object store | `profileImages` |
| keyPath | `id` |
| ID prefix | `profile-image-` |

프로필 이미지 record 예시:

```js
{
  id: 'profile-image-...',
  dataUrl: 'data:image/png;base64,...',
  name: 'profile.png',
  type: 'image/png',
  createdAt: '2026-06-22T00:00:00.000Z'
}
```

주요 export:

- `saveProfileImage`
- `getProfileImage`
- `getAllProfileImages`
- `putProfileImages`
- `deleteProfileImage`

## Settings UI

`Settings.jsx`의 로컬 프로필 패널에서 다음 기능을 제공합니다.

- 현재 프로필 이미지 원형 미리보기
- 이미지 선택
- 이미지 제거
- nickname 입력
- bio 입력
- 프로필 저장
- 프로필 초기화
- 저장/제거/오류 상태 메시지 표시

이미지를 새로 선택하면 기존 `avatarImageId`가 있던 경우 가능한 범위에서 이전 프로필 이미지 레코드를 삭제합니다. 이미지 제거와 프로필 초기화도 기존 이미지 삭제를 후처리로 시도합니다.

## UserAvatar 컴포넌트

`src/components/UserAvatar.jsx`는 원형 프로필 이미지를 표시하는 공통 컴포넌트입니다.

props:

- `nickname`
- `avatarImageId`
- `size`: `sm`, `md`, `lg`
- `className`

동작:

1. `avatarImageId`가 있으면 `getProfileImage`로 IndexedDB에서 dataUrl을 읽습니다.
2. 이미지가 있으면 원형 `<img>`로 표시합니다.
3. 이미지가 없거나 조회에 실패하면 nickname 첫 글자를 fallback으로 표시합니다.
4. nickname도 없으면 `T`를 표시합니다.

스타일은 `src/components/UserAvatar.css`에 분리되어 있습니다.

## Board 작성자 기본값 연결

`Board.jsx`는 새 글 작성 폼 초기화 시 `tenvi.user.profile`을 읽고 `parseUserProfile(...).nickname`을 작성자 기본값으로 사용합니다.

정책:

- 프로필 nickname이 `TENVI`이면 새 글 작성자 기본값도 `TENVI`
- 프로필 nickname을 바꾸면 이후 새 글 작성 시 기본 작성자도 변경
- 글쓰기 화면에서 작성자를 직접 수정하면 해당 게시글은 입력한 author로 저장
- 기존 게시글 author는 프로필 변경으로 강제 변경하지 않음

## Board 목록/상세 Avatar 연결

현재 구현은 로컬 사용자 1명 기준입니다.

- `BoardList.jsx`: 게시글 목록 row에 `UserAvatar`와 저장된 `post.author` 텍스트 표시
- `BoardDetail.jsx`: 상세 작성자 영역에 `UserAvatar`와 저장된 `post.author` 텍스트 표시
- Avatar 이미지는 현재 로컬 프로필의 `avatarImageId`를 사용
- author 텍스트는 게시글에 저장된 값을 그대로 표시

다중 사용자/댓글 기능으로 확장할 경우, 게시글 또는 댓글 단위에 avatar 참조 필드를 별도로 저장하는 구조가 필요합니다.

## fallback 표시 방식

- 이미지 있음: IndexedDB dataUrl 이미지 표시
- 이미지 없음: nickname 첫 글자 표시
- nickname 없음: `T` 표시
- 항상 원형으로 표시
- 이미지에는 `object-fit: cover` 적용

## 백업/복원 포함 여부

Board 전용 백업에는 다음이 포함됩니다.

- `tenvi.user.profile`
- IndexedDB `profileImages`

상세는 [backup.md](backup.md)를 참고하세요.

## 테스트

프로필 관련 테스트:

- `src/modules/userProfileLogic.test.js`
- `src/modules/boardBackupLogic.test.js` 일부

검증 범위:

- 기본 프로필 생성
- 손상된 JSON fallback
- nickname trim
- 빈 nickname fallback
- bio 보존
- avatarImageId 보존
- updatedAt 갱신
- Board 백업에 profileImages 포함/복원

## 현재 한계

- 실제 사용자 계정이 아닙니다.
- 다중 사용자 avatar 구분은 없습니다.
- 기존 게시글 author와 avatar의 시점별 매핑은 저장하지 않습니다.
- 프로필 이미지는 현재 브라우저 IndexedDB에만 저장됩니다.

## 추후 개선 방향

- 댓글 기능에서 UserAvatar 재사용
- 게시글/댓글별 작성자 프로필 snapshot 저장 여부 검토
- 프로필 이미지 크기 제한 또는 리사이즈 정책 추가
- 전체 앱 백업에 프로필 이미지까지 포함할지 검토
