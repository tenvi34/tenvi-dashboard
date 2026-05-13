# TENVI

TENVI는 개인용 AI 어시스턴트 대시보드를 목표로 하는 React + Vite 기반 프로젝트입니다.

단순한 Todo 앱에서 출발했지만, 현재는 할 일 관리, 노트, 상태 분석 명령 콘솔, 집중 타이머, 설정 화면을 포함한 모듈형 대시보드 구조로 확장되어 있습니다. 전체 UI는 어두운 배경, 얇은 라인, 반투명 패널, 시안/블루 계열 포인트 컬러를 사용하는 TENVI HUD 디자인 톤을 기준으로 구성되어 있습니다.

## 주요 특징

- React + Vite 기반의 빠른 개발 환경
- TENVI HUD 스타일의 다크 테마 UI
- 사이드바 기반 모듈 전환 구조
- React Router 없이 `useState`로 현재 모듈 관리
- Dashboard, Tasks, Notes, Command Console, Timer, Settings 모듈 구현
- 한글/영어 언어 전환 지원
- localStorage 기반 데이터 유지
- 외부 AI API 없이 규칙 기반 Command Console 제공

## 기술 스택

- React
- Vite
- JavaScript
- CSS
- localStorage

## 주요 기능

### Dashboard

- Tasks 요약 표시
- Notes 요약 표시
- 최근 노트 목록 표시
- 현재 언어 설정에 맞춘 한글/영어 텍스트 표시

### Tasks

- 할 일 추가
- 할 일 완료 처리
- 할 일 삭제
- 전체 / 진행 중 / 완료 필터
- localStorage 저장을 통한 새로고침 후 데이터 유지

### Notes

- 노트 제목 입력
- 노트 내용 입력
- 노트 추가
- 노트 삭제
- localStorage 저장을 통한 새로고침 후 데이터 유지

### Command Console

- 현재 Tasks와 Notes 데이터를 기반으로 규칙 기반 분석 수행
- 상태 분석
- 미완료 작업 조회
- 완료율 조회
- 최근 노트 조회
- 노트 검색
- 최근 명령 기록 표시
- 명령 기록 클릭 실행 지원

### Timer

- 집중 타이머
- 휴식 타이머
- 시작 / 일시정지 / 초기화
- Focus / Break 모드 전환
- 남은 시간 표시
- 세션 완료 횟수 저장
- 스톱워치 탭
- 스톱워치 밀리초 표시
- 스톱워치 기록 저장 기능

### Settings

- 언어 설정
- 기본 시작 모듈 설정
- HUD 효과 강도 설정
- Tasks 데이터 개수 표시
- Notes 데이터 개수 표시
- 확인 절차가 포함된 데이터 초기화

## 모듈 구성

TENVI는 기능을 모듈 단위로 분리해 확장하기 쉬운 구조를 지향합니다.

- Dashboard: 전체 상태를 빠르게 확인하는 요약 화면
- Tasks: 할 일 관리 모듈
- Notes: 개인 메모 관리 모듈
- Command Console: 저장된 데이터를 분석하는 명령 콘솔
- Timer: 집중 타이머와 스톱워치 모듈
- Settings: 언어, 시작 화면, HUD 효과, 데이터 상태 설정 모듈

## 설치 및 실행 방법

프로젝트 의존성을 설치합니다.

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

## 프로젝트 구조

```text
tenvi-dashboard/
├─ public/
├─ src/
│  ├─ components/
│  │  └─ Sidebar.jsx
│  ├─ i18n/
│  │  └─ translations.js
│  ├─ modules/
│  │  ├─ Command.jsx
│  │  ├─ Dashboard.jsx
│  │  ├─ Notes.jsx
│  │  ├─ Settings.jsx
│  │  ├─ Tasks.jsx
│  │  └─ Timer.jsx
│  ├─ App.css
│  ├─ App.jsx
│  ├─ index.css
│  └─ main.jsx
├─ AGENTS.md
├─ package.json
└─ README.md
```

### 주요 파일 역할

- `src/App.jsx`: 전체 앱 상태, 언어 설정, 현재 활성 모듈, 레이아웃을 관리합니다.
- `src/App.css`: TENVI HUD 스타일과 전체 UI 스타일을 관리합니다.
- `src/components/Sidebar.jsx`: 왼쪽 사이드바와 모듈 전환 메뉴를 담당합니다.
- `src/i18n/translations.js`: 한글/영어 UI 텍스트를 관리합니다.
- `src/modules/Dashboard.jsx`: Tasks와 Notes 요약 정보를 표시합니다.
- `src/modules/Tasks.jsx`: 할 일 관리 기능을 담당합니다.
- `src/modules/Notes.jsx`: 노트 관리 기능을 담당합니다.
- `src/modules/Command.jsx`: 규칙 기반 명령어 분석 기능을 담당합니다.
- `src/modules/Timer.jsx`: 집중 타이머와 스톱워치 기능을 담당합니다.
- `src/modules/Settings.jsx`: 언어, 시작 모듈, HUD 효과, 데이터 상태 설정을 담당합니다.
- `AGENTS.md`: TENVI 프로젝트 작업 규칙을 정리한 문서입니다.

## 사용 방법

1. 왼쪽 사이드바에서 원하는 모듈을 선택합니다.
2. Dashboard에서 현재 Tasks와 Notes 상태를 확인합니다.
3. Tasks에서 할 일을 추가하고, 완료 처리하거나 삭제합니다.
4. Notes에서 제목과 내용을 입력해 노트를 저장하고 관리합니다.
5. Command Console에서 명령어를 입력해 현재 데이터를 분석합니다.
6. Timer에서 집중 타이머, 휴식 타이머, 스톱워치를 사용합니다.
7. Settings에서 언어, 기본 시작 모듈, HUD 효과 강도, 데이터 상태를 관리합니다.

## Command Console 명령 예시

```text
상태 분석
미완료 작업
완료율
최근 노트
노트 검색 키워드
```

```text
analyze status
show active tasks
completion rate
recent notes
search notes keyword
```

## 데이터 저장 방식

TENVI는 현재 별도 서버 없이 브라우저 localStorage를 사용해 데이터를 유지합니다.

- Tasks 데이터: 할 일 목록과 완료 상태
- Notes 데이터: 노트 제목과 내용
- 언어 설정: 한글/영어 선택 값
- 기본 시작 모듈: 앱 시작 시 열릴 모듈
- HUD 효과 강도: Normal / Reduced 설정
- Timer 세션: 완료된 집중 세션 수

기존 localStorage 데이터 구조는 사용자의 저장 데이터를 보호하기 위해 유지하는 것을 원칙으로 합니다.

## 향후 개선 계획

- Calendar 모듈 추가
- Command Console 명령어 확장
- 데이터 백업 및 복원 기능
- 모듈별 세부 설정 추가
- 실제 AI API 연동 검토
- 사용자별 대시보드 위젯 구성 기능

## 개발 메모

- 외부 라이브러리는 기본적으로 추가하지 않습니다.
- 라이브러리가 꼭 필요할 경우 이유, 장점, 직접 구현 대비 장점, 단점, 유지보수 비용, 대안을 먼저 검토한 뒤 승인 후 추가합니다.
- 기존 TENVI HUD 디자인 톤을 유지합니다.
- 기능은 가능한 한 모듈 단위로 분리합니다.
- 기존 Tasks, Notes, Settings, Timer localStorage 데이터와 동작을 깨뜨리지 않도록 주의합니다.
- 코드 수정 후에는 변경 파일, 핵심 변경 내용, 확인 방법을 정리합니다.
