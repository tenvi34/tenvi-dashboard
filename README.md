# TENVI Dashboard

TENVI는 개인용 AI 대시보드를 목표로 만든 React + Vite 기반 프로젝트입니다.  
어두운 HUD 톤, 네온 라인, 모듈형 화면 구성을 중심으로 Tasks, Notes, Calendar, Command Console, Timer, Settings 기능을 제공합니다.

## 기술 스택

- React
- Vite
- JavaScript
- CSS
- localStorage
- Vitest

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

Vitest 기반 테스트 환경이 추가되어 있습니다.

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
- 일정 제목과 간단한 메모 입력
- 일정 추가 및 삭제
- 일정이 있는 날짜에 표시 점과 일정 개수 배지 표시
- 오늘 날짜와 선택 날짜 강조
- 이전/다음 달 이동
- 연도/월 선택
- 보름달로 계산되는 날짜에 달 이모티콘 표시
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
| `데이터 상태` | `data status` | Tasks, Notes, Timer, 언어, 시작 모듈 상태 표시 |
| `타이머 열기` | `open timer` | Timer 모듈로 전환 |
| `설정 열기` | `open settings` | Settings 모듈로 전환 |
| `집중 모드` | `focus mode` | 미완료 태스크 추천 후 Timer 모듈로 전환 |

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

### Settings

- 언어 변경
- 기본 시작 모듈 선택
- HUD 효과 강도 선택
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

현재 Calendar 데이터는 Settings 백업/복원 대상에 포함되어 있지 않습니다.

## 데이터 저장 구조

TENVI는 별도 서버 없이 브라우저 localStorage에 데이터를 저장합니다. 기존 key 값은 사용자 데이터와 직접 연결되므로 변경하지 않는 것을 원칙으로 합니다.

| 데이터 | localStorage key | 설명 |
| --- | --- | --- |
| Tasks | `todo-manager-lite.todos` | 태스크 목록과 완료 상태 |
| Notes | `tenvi.notes` | 노트 제목과 내용 |
| Calendar | `tenvi.calendar.events` | 일정 날짜, 제목, 메모, 생성 시각 |
| Timer 세션 | `tenvi.timer.completedSessions` | 완료된 Focus 세션 수 |
| 언어 설정 | `tenvi.language` | `ko` 또는 `en` |
| 기본 시작 모듈 | `tenvi.startModule` | 앱 시작 시 열 모듈 |
| HUD 효과 | `tenvi.hudEffect` | `normal` 또는 `reduced` |

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
│  │  ├─ Notes.jsx
│  │  ├─ Settings.jsx
│  │  ├─ settingsBackup.js
│  │  ├─ settingsBackup.test.js
│  │  ├─ Tasks.jsx
│  │  ├─ Timer.jsx
│  │  ├─ timerLogic.js
│  │  └─ timerLogic.test.js
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
- 기존 localStorage key와 데이터 구조를 유지합니다.
- UI는 TENVI HUD 톤을 유지합니다.
- 다국어 UI 문구는 `translations` 구조를 통해 관리합니다.

## 향후 개선 계획

- Settings 백업/복원 대상에 Calendar 데이터 포함
- Calendar 일정 수정 기능
- Calendar 반복 일정 기능
- Command Console 명령어 자동완성
- 실제 AI API 연동
- 사용자별 대시보드 위젯 배치 설정
