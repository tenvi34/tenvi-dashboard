# TENVI Dashboard

TENVI는 React + Vite 기반의 개인 AI 대시보드입니다. 서버 없이 브라우저 안에서 동작하며, Tasks, Notes, Calendar, Command, Timer, Map, Settings 모듈을 하나의 HUD 스타일 작업 공간으로 제공합니다.

현재 TENVI는 로컬 우선(local-first) 구조입니다. Tasks, Notes, Calendar, Timer, 언어/테마 설정은 `localStorage`에 저장하고, Map 사진 기록과 컬렉션은 IndexedDB에 저장합니다.

## 기술 스택

- React 19
- Vite 8
- JavaScript
- CSS
- localStorage
- IndexedDB
- Vitest
- exifr
- Leaflet
- React Leaflet

## 실행 방법

의존성 설치:

```bash
npm install
```

개발 서버 실행:

```bash
npm run dev
```

프로덕션 빌드:

```bash
npm run build
```

빌드 결과 미리보기:

```bash
npm run preview
```

## 테스트와 검증

```bash
npm run test:run
```

전체 확인 시 권장 명령:

```bash
npm run test:run
npm run build
npm run lint
```

현재 테스트는 다음 영역을 다룹니다.

- localStorage key 상수 유지
- `translations` 한국어/영어 key 구조
- Command Console 명령 파싱과 결과 생성
- Timer 시간 포맷과 입력값 정규화
- Settings 백업 JSON 검증
- Calendar 날짜, 월간 셀, 일정 계산
- Tasks due date 집계
- Map 사진 위치 정규화, draft 생성, 편집 patch 생성
- Map 미리보기 이미지 크기 계산
- 장소 검색 결과 정규화와 검색 범위 처리

## 현재 모듈

### Dashboard

- Tasks, Notes, Calendar, Map 상태 요약
- 오늘 브리핑 카드
- 핵심 수치 카드
- 최근 노트, 오늘 일정, 오늘 마감 Task, 다음 일정 표시
- Map 아카이브 요약
  - 전체 사진 기록 수
  - 컬렉션 수
  - 위치 지정 방식별 수
  - 최근 사진 기록
  - 대표 컬렉션

### Tasks

- Task 추가
- 완료 상태 변경
- Task 삭제
- 전체/진행 중/완료 필터
- due date 입력
- localStorage 저장

### Notes

- 노트 제목 입력
- 노트 내용 입력
- 노트 추가
- 노트 삭제
- localStorage 저장

### Calendar

- 월간 달력 UI
- 날짜 선택
- 선택 날짜의 일정 목록 표시
- 선택 날짜에 마감인 Tasks 표시
- 일정 제목과 메모 입력
- 일정 추가/삭제
- 오늘 날짜, 선택 날짜, 일정이 있는 날짜 표시
- 이전/다음 월 이동
- 연도/월 선택
- 보름달 날짜 표시
- Dashboard와 Command Console에서 Calendar 데이터 활용
- `tenvi.calendar.events` localStorage key에 저장

### Command

저장된 Tasks, Notes, Calendar 데이터를 기반으로 규칙 기반 명령을 실행합니다. 한국어/영어 명령을 모두 지원하며, 결과는 현재 언어 설정에 맞춰 표시됩니다.

예시 명령:

| 한국어 | English | 설명 |
| --- | --- | --- |
| `상태 분석` | `analyze status` | Tasks, Notes 상태 요약 |
| `미완료 작업` | `show active tasks` | 미완료 Task 목록 표시 |
| `완료율` | `completion rate` | Task 완료율 표시 |
| `최근 노트` | `recent notes` | 최근 노트 목록 표시 |
| `노트 검색 [키워드]` | `search notes [keyword]` | 노트 제목/내용 검색 |
| `도움말` | `help` | 사용 가능한 명령 표시 |
| `오늘 추천` | `recommend task` | 미완료 Task 중 하나 추천 |
| `태스크 검색 [키워드]` | `search tasks [keyword]` | Task 제목 검색 |
| `데이터 상태` | `data status` | 저장 데이터 상태 표시 |
| `타이머 열기` | `open timer` | Timer 모듈로 이동 |
| `설정 열기` | `open settings` | Settings 모듈로 이동 |
| `집중 모드` | `focus mode` | Task 추천 후 Timer 모듈로 이동 |
| `오늘 마감` | `today tasks` | 오늘 마감인 미완료 Tasks 표시 |

Calendar 명령:

| 한국어 | English | 설명 |
| --- | --- | --- |
| `오늘 일정` | `today schedules` | 오늘 일정 목록 표시 |
| `이번 달 일정` | `this month schedules` | 이번 달 일정 수와 날짜별 요약 표시 |
| `일정 검색 [키워드]` | `search schedules [keyword]` | 일정 제목/메모 검색 |
| `다음 일정` | `next schedule` | 오늘 이후 가장 가까운 일정 표시 |
| `일정 상태` | `schedule status` | 전체/오늘/이번 달 일정 상태 표시 |

### Timer

- Focus/Break 타이머
- 시작, 일시정지, 초기화
- Focus/Break 시간 설정
- 완료 세션 수 localStorage 저장
- Stopwatch
- Lap 기록 추가/초기화

### Map

Map 모듈은 사진 위치 기반 기록을 지도에 표시하는 로컬 사진 아카이브입니다. 사진 기록과 컬렉션은 IndexedDB에 저장됩니다.

탭 구조:

- 탐색
- 사진 업로드
- 컬렉션 관리

탐색 화면:

- 컬렉션 select 필터
- 접이식 사진 검색/위치 방식 필터
- 필터 적용 중 badge
- 사진 기록 목록
- 지도 마커 표시
- 사진 목록 또는 지도 마커 선택 시 상세 패널 표시
- 사진 미선택 시 compact 필터 요약 표시
- 전체 위치 보기

사진 기록 기능:

- 사진 단일/다중 등록
- EXIF GPS 위치정보 자동 추출
- GPS가 없는 사진에 지도 클릭으로 위치 지정
- 장소 검색 결과 선택으로 위치 지정
- 위치 지정 방식 표시
  - `exif`: EXIF 자동 감지
  - `manual`: 직접 지정
  - `search`: 장소 검색
  - `unknown`: 알 수 없음
- 제목과 메모 입력
- 저장된 모든 사진 기록 지도 마커 표시
- 목록 선택 또는 마커 선택으로 상세 패널 갱신
- 사진 기록 편집
  - 제목 수정
  - 메모 수정
  - 지도 클릭으로 위치 수정
  - 장소 검색으로 위치 수정
  - 저장 전까지 원본 IndexedDB 기록 미변경
- 사진 기록 삭제
- 새로고침 후 IndexedDB에서 기록 복원

대량 업로드:

- 여러 사진 분석
- 위치정보 있는 사진과 없는 사진 분류
- 위치정보 없는 사진 선택 후 일괄 위치 지정
- 저장 전 임시 마커 표시
- 일부 항목 실패 시 실패 목록 표시

장소 검색:

- 공개 Nominatim Search API 사용
- 검색 버튼 또는 Enter 입력 시에만 요청
- 입력 중 자동완성 요청 없음
- 최대 5개 결과 표시
- 동일 검색어/언어/범위 조합 메모리 캐시
- 검색 범위 선택
  - 전체
  - 일본
  - 한국
- OpenStreetMap/Nominatim 출처 표시
- Google Places, Google Maps Platform 같은 유료/과금 가능 서비스는 사용하지 않음

Map 저장 정책:

- 원본 고해상도 사진은 저장하지 않음
- 화면 표시용 리사이즈 미리보기 Blob만 IndexedDB에 저장
- 파일명, 파일 형식, 촬영 시각, 좌표, 위치 지정 방식, 제목, 메모, 생성/수정 시각 저장
- localStorage에는 Map 사진 기록이나 이미지 데이터를 저장하지 않음

### Settings

- 언어 변경
- 기본 시작 모듈 선택
- HUD 효과 강도 선택
- 테마 선택
  - HUD
  - Standard
- 저장 데이터 현황 표시
  - Tasks
  - Notes
  - Map 사진 기록
- Tasks/Notes 데이터 초기화
  - 명시적인 확인 후 실행
- JSON 백업 내보내기
- JSON 백업 복원
  - 복원 전 확인
  - 손상된 데이터 검증
  - 실패 시 가능한 범위에서 롤백

현재 백업/복원 대상:

- Tasks
- Notes
- Timer 완료 세션
- 언어 설정
- 기본 시작 모듈
- HUD 효과 설정
- 테마 설정
- Map 사진 기록
- Map 컬렉션

## UI/UX 정리 현황

최근 UI 정리 작업을 통해 전체 앱의 화면 리듬과 Map 탐색 사용성을 개선했습니다.

- 공통 버튼, 입력창, 카드, 패널, 빈 상태 스타일 정리
- HUD 모드와 일반 모드 대비 보정
- Dashboard 요약 카드 정보 위계 정리
- Calendar 선택 날짜/목록/입력 영역 구분
- Settings 일반 설정, 백업/복원, 초기화 위험도 구분
- Map 탐색 화면 압축
  - 컬렉션 필터 select화
  - 검색/위치 필터 접이식 처리
  - 사진 목록 공간 확대
  - 사진 미선택 요약 compact화
  - 지도 중심성을 높이도록 패널 폭 조정

## 데이터 저장 구조

TENVI는 별도 서버 없이 브라우저 저장소를 사용합니다. 기존 key와 저장 구조는 사용자 데이터와 직접 연결되므로 변경하지 않는 것을 원칙으로 합니다.

### localStorage

| 데이터 | localStorage key | 설명 |
| --- | --- | --- |
| Tasks | `todo-manager-lite.todos` | Task 목록, 완료 상태, due date |
| Notes | `tenvi.notes` | 노트 제목과 내용 |
| Calendar | `tenvi.calendar.events` | 일정 날짜, 제목, 메모, 생성 시각 |
| Timer 세션 | `tenvi.timer.completedSessions` | 완료한 Focus 세션 수 |
| 언어 설정 | `tenvi.language` | `ko` 또는 `en` |
| 기본 시작 모듈 | `tenvi.startModule` | 앱 시작 시 열 모듈 |
| HUD 효과 | `tenvi.hudEffect` | `normal` 또는 `reduced` |
| 테마 | `tenvi.theme` | `hud` 또는 `standard` |

Calendar 일정 데이터 구조:

```js
{
  id: string,
  date: 'YYYY-MM-DD',
  title: string,
  memo: string,
  createdAt: string
}
```

### IndexedDB

Map 사진 기록과 컬렉션은 IndexedDB에 저장합니다.

| 항목 | 값 |
| --- | --- |
| DB 이름 | `tenvi-photo-archive` |
| 사진 Object store | `photoRecords` |
| 컬렉션 Object store | `photoCollections` |
| keyPath | `id` |

사진 기록 데이터 구조:

```js
{
  id: string,
  previewImageBlob: Blob,
  previewImageMimeType: string,
  previewImageWidth: number,
  previewImageHeight: number,
  originalFileName: string,
  fileType: string,
  takenAt: string,
  latitude: number,
  longitude: number,
  locationSource: 'exif' | 'manual' | 'search' | 'unknown',
  collectionId: string | null,
  title: string,
  memo: string,
  createdAt: string,
  updatedAt: string
}
```

컬렉션 데이터 구조:

```js
{
  id: string,
  name: string,
  description: string,
  startDate: string,
  endDate: string,
  createdAt: string,
  updatedAt: string
}
```

## 프로젝트 구조

```text
tenvi-dashboard/
├─ public/
├─ src/
│  ├─ components/
│  │  └─ Sidebar.jsx
│  ├─ constants/
│  │  ├─ storageKeys.js
│  │  └─ storageKeys.test.js
│  ├─ i18n/
│  │  ├─ translations.js
│  │  └─ translations.test.js
│  ├─ modules/
│  │  ├─ Calendar.jsx
│  │  ├─ calendarLogic.js
│  │  ├─ calendarLogic.test.js
│  │  ├─ Command.jsx
│  │  ├─ commandLogic.js
│  │  ├─ commandLogic.test.js
│  │  ├─ Dashboard.jsx
│  │  ├─ Map.jsx
│  │  ├─ mapLogic.js
│  │  ├─ mapLogic.test.js
│  │  ├─ Notes.jsx
│  │  ├─ Settings.jsx
│  │  ├─ settingsBackup.js
│  │  ├─ settingsBackup.test.js
│  │  ├─ Tasks.jsx
│  │  ├─ tasksLogic.js
│  │  ├─ tasksLogic.test.js
│  │  ├─ Timer.jsx
│  │  ├─ timerLogic.js
│  │  └─ timerLogic.test.js
│  ├─ services/
│  │  ├─ photoArchiveBackupService.js
│  │  ├─ photoArchiveRepository.js
│  │  ├─ photoArchiveSummaryService.js
│  │  ├─ photoCollectionRepository.js
│  │  ├─ placeSearchService.js
│  │  └─ placeSearchService.test.js
│  ├─ utils/
│  │  ├─ imageUtils.js
│  │  └─ imageUtils.test.js
│  ├─ App.css
│  ├─ App.jsx
│  ├─ index.css
│  └─ main.jsx
├─ AGENTS.md
├─ package.json
├─ package-lock.json
├─ vite.config.js
└─ README.md
```

## 개발 원칙

- 기능은 가능한 모듈 단위로 관리합니다.
- 모듈 전환은 React state 기반이며 React Router를 사용하지 않습니다.
- 외부 라이브러리는 기본적으로 추가하지 않습니다.
- 비용이 발생하거나 결제 계정/API 과금 설정이 필요한 외부 API는 현재 범위에서 사용하지 않습니다.
- 기존 localStorage key와 IndexedDB 구조를 유지합니다.
- 기존 저장 데이터는 명시적인 사용자 확인 없이 초기화하지 않습니다.
- UI는 TENVI HUD 톤을 유지하되, 일반 모드에서는 장시간 사용성을 우선합니다.
- 한국어/영어 UI 문구는 `translations` 구조를 통해 관리합니다.
- 저장소 로직은 화면 로직과 분리합니다.

주요 저장소/서비스:

- Map 사진 기록 저장/조회/수정/삭제: `src/services/photoArchiveRepository.js`
- Map 컬렉션 저장/조회/수정/삭제: `src/services/photoCollectionRepository.js`
- Map 백업 직렬화/복원 준비: `src/services/photoArchiveBackupService.js`
- Dashboard Map 요약: `src/services/photoArchiveSummaryService.js`
- 장소 검색: `src/services/placeSearchService.js`
- 이미지 미리보기 생성: `src/utils/imageUtils.js`

## 향후 개선 후보

- Calendar 일정 수정 기능
- Calendar 반복 일정 기능
- Command Console 명령 자동완성
- Map 기록 날짜/여행별 보기 고도화
- Map 검색과 컬렉션 UX 추가 개선
- 실제 AI API 연동
- 사용자별 대시보드 프리셋
