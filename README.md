# TENVI Dashboard

TENVI는 개인용 AI 대시보드를 목표로 만든 React + Vite 기반 프로젝트입니다.  
어두운 HUD 톤, 네온 라인, 모듈형 화면 구성을 중심으로 Dashboard, Tasks, Notes, Calendar, Command, Timer, Map, Settings 모듈을 제공합니다.

현재 TENVI는 서버 없이 브라우저 안에서 동작하는 로컬 우선 대시보드입니다. Tasks, Notes, Calendar, Timer, 설정값은 localStorage에 저장하고, Map 사진 기록은 IndexedDB에 저장합니다.

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

의존성을 설치합니다.

```bash
npm install
```

개발 서버를 실행합니다.

```bash
npm run dev
```

프로덕션 빌드를 생성합니다.

```bash
npm run build
```

빌드 결과를 로컬에서 미리 확인합니다.

```bash
npm run preview
```

## 테스트 및 검증

Vitest 기반 테스트 환경이 구성되어 있습니다.

```bash
npm run test:run
```

전체 검증 시에는 아래 명령을 함께 실행합니다.

```bash
npm run test:run
npm run build
npm run lint
```

현재 테스트 대상은 다음과 같습니다.

- localStorage key 상수 값 유지
- `translations` 객체의 필수 한글/영어 key
- Command Console 명령어 파싱과 결과 생성 로직
- Timer 시간 포맷 로직
- Settings 백업 JSON 검증 로직
- Calendar 날짜, 월간 달력, 일정 계산 로직
- Tasks due date 집계 로직
- Map 사진 위치 정규화, draft 생성, 편집 patch 생성, locationSource 호환 로직
- Map 미리보기 이미지 크기 계산 로직
- 장소 검색 결과 정규화, 주소 요약, 검색 범위 파라미터 처리

## 현재 모듈

### Dashboard

- Tasks 전체/진행 중/완료 개수 표시
- Notes 전체 개수와 최근 노트 일부 표시
- Calendar 요약 표시
  - 오늘 일정 개수
  - 오늘 일정 목록 일부
  - 다음 예정 일정 1개
  - 이번 달 전체 일정 개수
  - 이번 달 일정이 있는 날짜 수
- 데이터가 없을 때 TENVI 시스템 메시지 스타일의 안내 표시

### Tasks

- 태스크 추가
- 완료 상태 변경
- 태스크 삭제
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
- 7열 요일 기반 달력 표시
- 달력 날짜 클릭으로 선택 날짜 변경
- 선택 날짜의 일정 목록 표시
- 선택 날짜에 마감인 Tasks 표시
- 일정 제목과 간단한 메모 입력
- 일정 추가 및 삭제
- 일정이 있는 날짜에 표시 점과 일정 개수 배지 표시
- Tasks due date가 있는 날짜도 달력에 함께 표시
- 오늘 날짜와 선택 날짜 강조
- 이전/다음 달 이동
- 연도/월 선택
- 보름달로 계산되는 날짜에 달 표시
- Dashboard Calendar 요약과 Command Console Calendar 명령어에서 Calendar 데이터 활용
- `tenvi.calendar.events` localStorage key에 저장

### Command Console

저장된 Tasks, Notes, Calendar 데이터를 기반으로 규칙 기반 명령어를 실행합니다.  
한글/영어 명령어를 모두 지원하며, 결과 메시지는 현재 언어 설정에 따라 표시됩니다.

기존 데이터 분석 명령어:

| 한글 명령어 | 영어 명령어 | 설명 |
| --- | --- | --- |
| `상태 분석` | `analyze status` | Tasks와 Notes 상태 요약 |
| `미완료 작업` | `show active tasks` | 미완료 태스크 목록 표시 |
| `완료율` | `completion rate` | 태스크 완료율 표시 |
| `최근 노트` | `recent notes` | 최근 노트 목록 표시 |
| `노트 검색 [키워드]` | `search notes [keyword]` | 노트 제목/내용 검색 |
| `도움말` | `help` | 사용 가능한 명령어 목록 표시 |
| `오늘 추천` | `recommend task` | 미완료 태스크 중 하나 추천 |
| `태스크 검색 [키워드]` | `search tasks [keyword]` | 태스크 제목 검색 |
| `데이터 상태` | `data status` | Tasks, Notes, Calendar, Timer, 언어, 시작 모듈 상태 표시 |
| `타이머 열기` | `open timer` | Timer 모듈로 전환 |
| `설정 열기` | `open settings` | Settings 모듈로 전환 |
| `집중 모드` | `focus mode` | 미완료 태스크 추천 후 Timer 모듈로 전환 |
| `오늘 마감` | `today tasks` | 오늘 마감인 미완료 Tasks 표시 |

Calendar 명령어:

| 한글 명령어 | 영어 명령어 | 설명 |
| --- | --- | --- |
| `오늘 일정` | `today schedules` | 오늘 일정 목록 표시 |
| `이번 달 일정` | `this month schedules` | 이번 달 일정 개수와 날짜별 요약 표시 |
| `일정 검색 [키워드]` | `search schedules [keyword]` | 일정 제목/메모 검색 |
| `다음 일정` | `next schedule` | 오늘 이후 가장 가까운 일정 표시 |
| `일정 상태` | `schedule status` | 전체 일정 수, 오늘 일정 수, 이번 달 일정 수 표시 |

### Timer

- Focus 모드 타이머
- Break 모드 타이머
- 시작/일시정지/초기화
- Focus/Break 시간 설정
- 완료 세션 수 localStorage 저장
- 스톱워치
- 랩 기록 추가 및 초기화

### Map

Map 모듈은 사진 위치 기반 기록용 지도 아카이브입니다. 현재는 서버 없이 현재 브라우저의 IndexedDB에만 기록을 저장합니다.

주요 기능:

- 사진 여러 장 등록
- EXIF GPS 위치정보 자동 추출
- GPS가 없는 사진의 지도 클릭 직접 위치 지정
- GPS 자동 감지 위치의 지도 클릭 수정
- 장소 검색 결과 선택으로 위치 지정
- 위치 지정 방식 표시
  - `exif`: 자동 감지
  - `manual`: 직접 지정
  - `search`: 장소 검색
- 제목과 메모 입력
- 저장된 모든 사진 기록의 지도 마커 표시
- 사진 기록 목록 표시
- 목록 클릭 또는 마커 클릭 시 상세 패널 갱신
- 목록 클릭 시 해당 위치로 확대 이동
- 같은 기록을 다시 클릭해도 지도 이동 요청 재실행
- 마커 클릭 시 목록/상세 선택 상태 동기화
- 저장 기록 편집
  - 제목 수정
  - 메모 수정
  - 지도 클릭으로 위치 수정
  - 장소 검색으로 위치 수정
  - 저장 전까지 원본 IndexedDB 기록 미변경
- 사진 기록 삭제
- 새로고침 후 IndexedDB에서 기록 복원
- OpenStreetMap 지도 타일 출처 표시
- Nominatim 장소 검색 출처 표시

장소 검색:

- 공개 Nominatim Search API 사용
- 검색 버튼 또는 Enter 입력 시에만 요청
- 입력 중 자동완성 요청 없음
- 최대 5개 결과 표시
- 앱 전체 기준 초당 1회 요청 제한
- 동일 검색어/언어/범위 조합은 메모리 캐시 사용
- 검색 범위 선택
  - 전체: `countrycodes` 없음
  - 일본: `countrycodes=jp`
  - 한국: `countrycodes=kr`
- 검색 결과에 장소 유형과 주소 요약 표시
  - 예: `shop / department_store`
  - 예: `amenity / restaurant`

Map 저장 정책:

- 원본 고해상도 사진은 저장하지 않음
- 화면 표시용으로 리사이즈된 미리보기 Blob만 IndexedDB에 저장
- 사진 파일명, 파일 형식, 촬영일, 좌표, 위치 지정 방식, 제목, 메모, 등록일, 수정일 저장
- localStorage에는 Map 사진 기록이나 이미지 데이터를 저장하지 않음
- Settings 백업/복원에는 Map 이미지 데이터가 포함되지 않음

현재 프로젝트 범위에서는 비용이 발생하거나 결제/API 과금 설정이 필요한 장소 검색 Provider를 사용하지 않습니다. Google Places, Google Maps Platform 같은 유료/과금 가능 서비스는 연동하지 않습니다.

### Settings

- 언어 변경
- 기본 시작 모듈 선택
- HUD 효과 강도 선택
- 디자인 테마 선택
  - HUD
  - Standard
- Tasks/Notes 데이터 개수 표시
- Tasks/Notes 데이터 초기화
  - 명시적인 확인 절차 후 실행
- JSON 백업 내보내기
- JSON 백업 복원
  - 복원 전 확인 절차 표시
  - 잘못된 JSON 또는 TENVI 백업 형식이 아닌 파일은 복원하지 않음

현재 백업/복원 대상:

- Tasks
- Notes
- Timer 완료 세션
- 언어 설정
- 기본 시작 모듈
- HUD 효과 설정

현재 Calendar 데이터와 Map 사진 기록은 Settings 백업/복원 대상에 포함되어 있지 않습니다.

## 데이터 저장 구조

TENVI는 별도 서버 없이 브라우저 저장소를 사용합니다. 기존 key 값은 사용자 데이터와 직접 연결되므로 변경하지 않는 것을 원칙으로 합니다.

### localStorage

| 데이터 | localStorage key | 설명 |
| --- | --- | --- |
| Tasks | `todo-manager-lite.todos` | 태스크 목록, 완료 상태, due date |
| Notes | `tenvi.notes` | 노트 제목과 내용 |
| Calendar | `tenvi.calendar.events` | 일정 날짜, 제목, 메모, 생성 시각 |
| Timer 세션 | `tenvi.timer.completedSessions` | 완료된 Focus 세션 수 |
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

Map 사진 기록은 IndexedDB에 저장합니다.

| 항목 | 값 |
| --- | --- |
| DB 이름 | `tenvi-photo-archive` |
| Object store | `photoRecords` |
| keyPath | `id` |
| index | `createdAt`, `updatedAt` |

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
  locationSource: 'exif' | 'manual' | 'search',
  title: string,
  memo: string,
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
│  │  ├─ ModulePlaceholder.jsx
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
│  │  ├─ photoArchiveRepository.js
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
- React Router 없이 React state 기반으로 모듈 전환을 처리합니다.
- 외부 라이브러리는 기본적으로 추가하지 않습니다.
- 비용이 발생하거나 결제 계정/API 과금 설정이 필요한 외부 API는 현재 프로젝트 범위에서 사용하지 않습니다.
- 기존 localStorage key와 데이터 구조를 유지합니다.
- IndexedDB 기록도 명시적 삭제 없이 초기화하지 않습니다.
- UI는 TENVI HUD 톤을 유지합니다.
- 다국어 UI 문구는 `translations` 구조를 통해 관리합니다.
- 저장소 로직은 화면 로직과 분리합니다.
  - Map 사진 기록 저장/조회/수정/삭제: `src/services/photoArchiveRepository.js`
  - 장소 검색: `src/services/placeSearchService.js`
  - 이미지 미리보기 생성: `src/utils/imageUtils.js`

## 향후 개선 계획

- Settings 백업/복원 대상에 Calendar 데이터 포함
- Map 사진 기록의 서버 저장 전환
- 휴대폰/다른 PC 간 Map 기록 동기화
- Map 기록 앨범/여행별 분류
- Calendar 일정 수정 기능
- Calendar 반복 일정 기능
- Command Console 명령어 자동완성
- 실제 AI API 연동
- 사용자별 대시보드 위젯 배치 설정
