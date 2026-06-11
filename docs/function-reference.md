# TENVI 함수 레퍼런스

이 문서는 `src` 런타임 소스 기준의 함수 레퍼런스다. `*.test.js` 내부의 테스트 콜백, JSX 안의 매우 짧은 인라인 setter 콜백, CSS/정적 asset은 제외했다. 추정이 필요한 설명은 `추정`으로 표시했다.

## `src/App.jsx`

### `App`
- 파일 경로: `src/App.jsx`
- 역할: TENVI 최상위 앱 shell, 전역 설정 상태, 모듈 전환, PC Sidebar와 모바일 탭바 연결.
- 주요 입력값/파라미터: 없음.
- 반환값: TENVI 전체 JSX.
- 내부에서 호출하는 주요 함수: `useState`, `useEffect`, `useMemo`, `isSupportedLanguage`, `translations[...]`.
- 사용되는 위치: `src/main.jsx`에서 렌더링되는 기본 앱 컴포넌트.
- 주의사항 또는 개선 포인트: `activeModule`은 React state 기반 라우팅 역할을 하므로 Router 도입 시 기존 localStorage start module 흐름을 보존해야 한다.

## `src/components/Sidebar.jsx`

### `Sidebar`
- 파일 경로: `src/components/Sidebar.jsx`
- 역할: PC 좌측 모듈 네비게이션 렌더링.
- 주요 입력값/파라미터: `activeModule`, `modules`, `onModuleChange`, `t`.
- 반환값: Sidebar JSX.
- 내부에서 호출하는 주요 함수: `modules.map`, `onModuleChange`.
- 사용되는 위치: `App`.
- 주의사항 또는 개선 포인트: 모바일에서는 CSS로 숨겨지고 `MobileTabBar`가 같은 `activeModule` 상태를 공유한다.

## `src/components/MobileTabBar.jsx`

### `MobileTabBar`
- 파일 경로: `src/components/MobileTabBar.jsx`
- 역할: 모바일 하단 탭바와 더보기 메뉴 렌더링.
- 주요 입력값/파라미터: `activeModule`, `modules`, `moreModules`, `onModuleChange`, `t`.
- 반환값: 모바일 탭바 JSX.
- 내부에서 호출하는 주요 함수: `useState`, `moreModules.some`, `modules.map`, `moreModules.map`, `handleModuleChange`.
- 사용되는 위치: `App`.
- 주의사항 또는 개선 포인트: 모바일 내비게이션 전용 UI state만 내부에 두고, 실제 모듈 이동은 `App`의 `activeModule`을 사용한다.

### `handleModuleChange`
- 파일 경로: `src/components/MobileTabBar.jsx`
- 역할: 모바일 탭 선택 후 모듈 전환과 더보기 닫기.
- 주요 입력값/파라미터: `moduleId`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `onModuleChange`, `setIsMoreOpen`.
- 사용되는 위치: `MobileTabBar`의 탭/더보기 버튼.
- 주의사항 또는 개선 포인트: 더보기 선택 후 메뉴를 닫아 모바일 화면 잔상을 방지한다.

## `src/modules/Tasks.jsx`

### `Tasks`
- 파일 경로: `src/modules/Tasks.jsx`
- 역할: Tasks 모듈 UI, localStorage 복원/저장, 추가/완료/삭제/필터 처리.
- 주요 입력값/파라미터: `t`.
- 반환값: Tasks JSX.
- 내부에서 호출하는 주요 함수: `useState`, `useEffect`, `useMemo`, `createTask`, `normalizeDueDate`, `handleAddTodo`, `handleToggleTodo`, `handleDeleteTodo`.
- 사용되는 위치: `App`.
- 주의사항 또는 개선 포인트: 초기 로드에서 JSON parse 결과가 배열인지 검사하지 않는다. 손상 데이터 fallback 강화 가능.

### `handleAddTodo`
- 파일 경로: `src/modules/Tasks.jsx`
- 역할: 새 Task 생성 및 목록 상단 추가.
- 주요 입력값/파라미터: submit `event`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `event.preventDefault`, `createTask`, `setTodos`.
- 사용되는 위치: Tasks 입력 form `onSubmit`.
- 주의사항 또는 개선 포인트: 빈 제목은 무시한다.

### `handleToggleTodo`
- 파일 경로: `src/modules/Tasks.jsx`
- 역할: Task 완료 상태 토글.
- 주요 입력값/파라미터: `todoId`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `setTodos`, `Array.map`.
- 사용되는 위치: Task checkbox `onChange`.
- 주의사항 또는 개선 포인트: id가 없으면 변화 없이 기존 배열을 순회한다.

### `handleDeleteTodo`
- 파일 경로: `src/modules/Tasks.jsx`
- 역할: Task 삭제.
- 주요 입력값/파라미터: `todoId`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `setTodos`, `Array.filter`.
- 사용되는 위치: Task 삭제 버튼.
- 주의사항 또는 개선 포인트: 삭제 확인 없이 즉시 제거한다.

## `src/modules/tasksLogic.js`

### `normalizeDueDate`
- 파일 경로: `src/modules/tasksLogic.js`
- 역할: `YYYY-MM-DD` 형식 마감일만 보존.
- 주요 입력값/파라미터: `dueDate`.
- 반환값: 유효한 날짜 문자열 또는 빈 문자열.
- 내부에서 호출하는 주요 함수: `DATE_KEY_PATTERN.test`.
- 사용되는 위치: `createTask`, Tasks 표시, Calendar/Command task due 계산.
- 주의사항 또는 개선 포인트: 실제 존재하는 날짜인지까지는 검증하지 않는다.

### `createTask`
- 파일 경로: `src/modules/tasksLogic.js`
- 역할: Task 객체 생성.
- 주요 입력값/파라미터: `{ dueDate, id, title }`.
- 반환값: Task 객체 또는 `null`.
- 내부에서 호출하는 주요 함수: `normalizeDueDate`, `crypto.randomUUID`.
- 사용되는 위치: `Tasks.handleAddTodo`.
- 주의사항 또는 개선 포인트: `crypto.randomUUID` 미지원 환경 fallback이 없다.

### `getTasksDueOnDate`
- 파일 경로: `src/modules/tasksLogic.js`
- 역할: 특정 날짜 마감 Task 필터링.
- 주요 입력값/파라미터: `tasks`, `dateKey`.
- 반환값: Task 배열.
- 내부에서 호출하는 주요 함수: `normalizeDueDate`, `Array.filter`.
- 사용되는 위치: `Calendar`, `getActiveTasksDueOnDate`.
- 주의사항 또는 개선 포인트: 완료 여부와 무관하게 반환한다.

### `getActiveTasksDueOnDate`
- 파일 경로: `src/modules/tasksLogic.js`
- 역할: 특정 날짜의 미완료 마감 Task 필터링.
- 주요 입력값/파라미터: `tasks`, `dateKey`.
- 반환값: 미완료 Task 배열.
- 내부에서 호출하는 주요 함수: `getTasksDueOnDate`, `Array.filter`.
- 사용되는 위치: `getTodayDueTasks`.
- 주의사항 또는 개선 포인트: completed truthy 여부만 본다.

### `getTodayDueTasks`
- 파일 경로: `src/modules/tasksLogic.js`
- 역할: 오늘 마감인 미완료 Task 반환.
- 주요 입력값/파라미터: `tasks`, `currentDate`.
- 반환값: Task 배열.
- 내부에서 호출하는 주요 함수: `getDateKey`, `getActiveTasksDueOnDate`.
- 사용되는 위치: `Dashboard`, `Command`.
- 주의사항 또는 개선 포인트: 브라우저 로컬 타임존 기준이다.

### `countDueTasksByDate`
- 파일 경로: `src/modules/tasksLogic.js`
- 역할: 날짜별 Task 마감 개수 집계.
- 주요 입력값/파라미터: `tasks`.
- 반환값: `{ [dateKey]: count }`.
- 내부에서 호출하는 주요 함수: `normalizeDueDate`, `Array.reduce`.
- 사용되는 위치: `Calendar`.
- 주의사항 또는 개선 포인트: 완료 Task도 개수에 포함한다.

## `src/modules/Notes.jsx`

### `Notes`
- 파일 경로: `src/modules/Notes.jsx`
- 역할: Notes 모듈 UI, localStorage 복원/저장, 추가/삭제 처리.
- 주요 입력값/파라미터: `t`.
- 반환값: Notes JSX.
- 내부에서 호출하는 주요 함수: `useState`, `useEffect`, `handleAddNote`, `handleDeleteNote`, `formatCreatedAt`.
- 사용되는 위치: `App`.
- 주의사항 또는 개선 포인트: 초기 JSON parse 결과가 배열인지 검사하지 않는다.

### `handleAddNote`
- 파일 경로: `src/modules/Notes.jsx`
- 역할: 새 Note 생성 및 목록 상단 추가.
- 주요 입력값/파라미터: submit `event`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `event.preventDefault`, `crypto.randomUUID`, `setNotes`.
- 사용되는 위치: Notes 입력 form `onSubmit`.
- 주의사항 또는 개선 포인트: 제목/내용이 모두 비어 있으면 무시한다.

### `handleDeleteNote`
- 파일 경로: `src/modules/Notes.jsx`
- 역할: Note 삭제.
- 주요 입력값/파라미터: `noteId`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `setNotes`, `Array.filter`.
- 사용되는 위치: Note 삭제 버튼.
- 주의사항 또는 개선 포인트: 삭제 확인 없이 즉시 제거한다.

### `formatCreatedAt`
- 파일 경로: `src/modules/Notes.jsx`
- 역할: Note 생성 시각을 locale 기준으로 표시.
- 주요 입력값/파라미터: `value`.
- 반환값: 날짜/시간 문자열.
- 내부에서 호출하는 주요 함수: `Intl.DateTimeFormat`.
- 사용되는 위치: Notes 목록 `time`.
- 주의사항 또는 개선 포인트: 잘못된 날짜 문자열이면 브라우저에서 `Invalid Date` 포맷 오류가 날 수 있다.

## `src/modules/Timer.jsx`

### `readCompletedSessions`
- 파일 경로: `src/modules/Timer.jsx`
- 역할: 완료된 Focus 세션 수 복원.
- 주요 입력값/파라미터: 없음.
- 반환값: 0 이상의 숫자.
- 내부에서 호출하는 주요 함수: `localStorage.getItem`, `Number.parseInt`.
- 사용되는 위치: `Timer` 초기 state.
- 주의사항 또는 개선 포인트: 음수 값은 현재 그대로 반환될 수 있다.

### `Timer`
- 파일 경로: `src/modules/Timer.jsx`
- 역할: 타이머/스톱워치 UI와 interval 상태 관리.
- 주요 입력값/파라미터: `t`.
- 반환값: Timer JSX.
- 내부에서 호출하는 주요 함수: `useState`, `useEffect`, `useCallback`, `minutesToSeconds`, `formatTime`, `formatStopwatchTime`, `normalizeMinutes`, `getModeSeconds`.
- 사용되는 위치: `App`.
- 주의사항 또는 개선 포인트: 10ms 스톱워치는 탭 비활성화/브라우저 throttling의 영향을 받는다.

### `getModeSeconds`
- 파일 경로: `src/modules/Timer.jsx`
- 역할: focus/break 모드별 초 단위 duration 계산.
- 주요 입력값/파라미터: `timerMode`.
- 반환값: 초 단위 숫자.
- 내부에서 호출하는 주요 함수: `minutesToSeconds`.
- 사용되는 위치: 타이머 interval, reset, duration 변경 처리.
- 주의사항 또는 개선 포인트: `timerMode`가 `focus`가 아니면 break로 처리한다.

### `handleFocusMinutesChange`
- 파일 경로: `src/modules/Timer.jsx`
- 역할: focus duration 입력 변경 반영.
- 주요 입력값/파라미터: change `event`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `normalizeMinutes`, `minutesToSeconds`, state setters.
- 사용되는 위치: focus duration input.
- 주의사항 또는 개선 포인트: 타이머 실행 중에는 남은 시간을 즉시 바꾸지 않는다.

### `handleBreakMinutesChange`
- 파일 경로: `src/modules/Timer.jsx`
- 역할: break duration 입력 변경 반영.
- 주요 입력값/파라미터: change `event`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `normalizeMinutes`, `minutesToSeconds`, state setters.
- 사용되는 위치: break duration input.
- 주의사항 또는 개선 포인트: break 모드 정지 상태일 때만 남은 시간을 즉시 바꾼다.

### `handleStart`
- 파일 경로: `src/modules/Timer.jsx`
- 역할: 타이머 시작.
- 주요 입력값/파라미터: 없음.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `setIsRunning`.
- 사용되는 위치: Timer 시작 버튼.
- 주의사항 또는 개선 포인트: 이미 실행 중이어도 동일 state 설정만 수행한다.

### `handlePause`
- 파일 경로: `src/modules/Timer.jsx`
- 역할: 타이머 일시정지.
- 주요 입력값/파라미터: 없음.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `setIsRunning`.
- 사용되는 위치: Timer 일시정지 버튼.
- 주의사항 또는 개선 포인트: 없음.

### `handleReset`
- 파일 경로: `src/modules/Timer.jsx`
- 역할: 현재 모드 duration으로 타이머 재설정.
- 주요 입력값/파라미터: 없음.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `setIsRunning`, `setSecondsLeft`, `getModeSeconds`.
- 사용되는 위치: Timer reset 버튼.
- 주의사항 또는 개선 포인트: 모드를 focus로 되돌리지는 않는다.

### `handleStopwatchReset`
- 파일 경로: `src/modules/Timer.jsx`
- 역할: 스톱워치 시간과 lap 초기화.
- 주요 입력값/파라미터: 없음.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `setIsStopwatchRunning`, `setStopwatchMilliseconds`, `setLaps`.
- 사용되는 위치: Stopwatch reset 버튼.
- 주의사항 또는 개선 포인트: 없음.

### `handleAddLap`
- 파일 경로: `src/modules/Timer.jsx`
- 역할: 현재 스톱워치 시간을 lap 목록에 추가.
- 주요 입력값/파라미터: 없음.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `setLaps`.
- 사용되는 위치: Stopwatch lap 버튼.
- 주의사항 또는 개선 포인트: 0ms일 때는 기록하지 않는다.

## `src/modules/timerLogic.js`

### `minutesToSeconds`
- 파일 경로: `src/modules/timerLogic.js`
- 역할: 분 값을 초로 변환하고 최소 1분을 보장.
- 주요 입력값/파라미터: `minutes`.
- 반환값: 초 단위 숫자.
- 내부에서 호출하는 주요 함수: `Math.max`.
- 사용되는 위치: `Timer`.
- 주의사항 또는 개선 포인트: 숫자가 아닌 값이면 `NaN` 가능성이 있다.

### `formatTime`
- 파일 경로: `src/modules/timerLogic.js`
- 역할: 초를 `mm:ss`로 포맷.
- 주요 입력값/파라미터: `totalSeconds`.
- 반환값: 문자열.
- 내부에서 호출하는 주요 함수: `Math.floor`, `String.padStart`.
- 사용되는 위치: `Timer`.
- 주의사항 또는 개선 포인트: 음수 입력 방어는 없다.

### `formatStopwatchTime`
- 파일 경로: `src/modules/timerLogic.js`
- 역할: 밀리초를 `mm:ss.mmm`으로 포맷.
- 주요 입력값/파라미터: `totalMilliseconds`.
- 반환값: 문자열.
- 내부에서 호출하는 주요 함수: `Math.floor`, `String.padStart`.
- 사용되는 위치: `Timer`.
- 주의사항 또는 개선 포인트: 1시간 이상은 분 단위가 계속 증가한다.

### `normalizeMinutes`
- 파일 경로: `src/modules/timerLogic.js`
- 역할: 입력 값을 1~240 사이의 정수 분으로 보정.
- 주요 입력값/파라미터: `value`, `fallback`.
- 반환값: 정수.
- 내부에서 호출하는 주요 함수: `Number.parseInt`, `Math.min`, `Math.max`.
- 사용되는 위치: `Timer`.
- 주의사항 또는 개선 포인트: 소수는 정수로 잘린다.

## `src/modules/Command.jsx`

### `Command`
- 파일 경로: `src/modules/Command.jsx`
- 역할: 명령 입력, 결과 표시, 최근 명령 history 관리.
- 주요 입력값/파라미터: `onModuleChange`, `t`.
- 반환값: Command JSX.
- 내부에서 호출하는 주요 함수: `useState`, `executeCommand`, `handleExecute`, `createResult`, `parseCommand`, `readStoredList`, `readCommandDataStatus`.
- 사용되는 위치: `App`.
- 주의사항 또는 개선 포인트: history는 세션 state이며 localStorage에 저장하지 않는다.

### `executeCommand`
- 파일 경로: `src/modules/Command.jsx`
- 역할: 명령어 파싱, 저장 데이터 읽기, 결과 생성, 모듈 이동, history 갱신.
- 주요 입력값/파라미터: `commandText`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `readStoredList`, `parseCommand`, `createResult`, `readCommandDataStatus`, `normalizeCommand`, `onModuleChange`.
- 사용되는 위치: form submit, help command 버튼, history 버튼.
- 주의사항 또는 개선 포인트: 실행 시점의 localStorage를 직접 읽는다.

### `handleExecute`
- 파일 경로: `src/modules/Command.jsx`
- 역할: form submit 이벤트를 명령 실행으로 연결.
- 주요 입력값/파라미터: submit `event`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `event.preventDefault`, `executeCommand`.
- 사용되는 위치: Command form `onSubmit`.
- 주의사항 또는 개선 포인트: 없음.

## `src/modules/commandLogic.js`

### `readStoredList`
- 파일 경로: `src/modules/commandLogic.js`
- 역할: localStorage 배열 데이터 안전 복원.
- 주요 입력값/파라미터: `storageKey`.
- 반환값: 배열.
- 내부에서 호출하는 주요 함수: `localStorage.getItem`, `JSON.parse`, `Array.isArray`.
- 사용되는 위치: `Command.executeCommand`.
- 주의사항 또는 개선 포인트: 손상 JSON은 빈 배열로 처리한다.

### `readStoredNumber`
- 파일 경로: `src/modules/commandLogic.js`
- 역할: localStorage 숫자 데이터 복원.
- 주요 입력값/파라미터: `storageKey`.
- 반환값: 0 이상의 숫자.
- 내부에서 호출하는 주요 함수: `Number.parseInt`, `Math.max`.
- 사용되는 위치: `readCommandDataStatus`.
- 주의사항 또는 개선 포인트: 음수는 0으로 보정한다.

### `readStoredChoice`
- 파일 경로: `src/modules/commandLogic.js`
- 역할: 저장된 선택값을 허용 목록 기준으로 검증.
- 주요 입력값/파라미터: `storageKey`, `allowedValues`, `fallback`.
- 반환값: 저장값 또는 fallback.
- 내부에서 호출하는 주요 함수: `localStorage.getItem`, `Array.includes`.
- 사용되는 위치: `readCommandDataStatus`.
- 주의사항 또는 개선 포인트: 허용 목록 변경 시 Settings와 동기화 필요.

### `readCommandDataStatus`
- 파일 경로: `src/modules/commandLogic.js`
- 역할: Command가 표시할 설정/세션 상태 수집.
- 주요 입력값/파라미터: 없음.
- 반환값: `{ language, startModule, timerSessions }`.
- 내부에서 호출하는 주요 함수: `readStoredChoice`, `readStoredNumber`.
- 사용되는 위치: `Command.executeCommand`.
- 주의사항 또는 개선 포인트: Dashboard/Settings와 같은 storage key를 공유한다.

### `getNoteTime`
- 파일 경로: `src/modules/commandLogic.js`
- 역할: Note 생성 시각을 정렬 가능한 timestamp로 변환.
- 주요 입력값/파라미터: `note`.
- 반환값: 숫자 timestamp 또는 0.
- 내부에서 호출하는 주요 함수: `Date`, `Number.isNaN`.
- 사용되는 위치: `getRecentNotes`.
- 주의사항 또는 개선 포인트: 비정상 날짜는 가장 오래된 항목처럼 취급한다.

### `getRecentNotes`
- 파일 경로: `src/modules/commandLogic.js`
- 역할: 최신 Note 목록 추출.
- 주요 입력값/파라미터: `notes`, `limit`.
- 반환값: Note 배열.
- 내부에서 호출하는 주요 함수: `getNoteTime`, `Array.sort`, `Array.slice`.
- 사용되는 위치: `createResult`.
- 주의사항 또는 개선 포인트: 원본 배열 복사 후 정렬한다.

### `getTaskStats`
- 파일 경로: `src/modules/commandLogic.js`
- 역할: Task 전체/완료/미완료/완료율 계산.
- 주요 입력값/파라미터: `tasks`.
- 반환값: `{ active, completed, completionRate, total }`.
- 내부에서 호출하는 주요 함수: `Array.filter`, `Math.round`.
- 사용되는 위치: `createResult`, `getRecommendation`.
- 주의사항 또는 개선 포인트: completed truthy 여부 기준.

### `normalizeCommand`
- 파일 경로: `src/modules/commandLogic.js`
- 역할: 명령어 비교용 trim/lowercase 처리.
- 주요 입력값/파라미터: `command`.
- 반환값: 정규화된 문자열.
- 내부에서 호출하는 주요 함수: `String.trim`, `String.toLowerCase`.
- 사용되는 위치: `parseCommand`, `Command.executeCommand`.
- 주의사항 또는 개선 포인트: locale-specific lowercase는 고려하지 않는다.

### `matchesCommand`
- 파일 경로: `src/modules/commandLogic.js`
- 역할: 명령어가 alias 목록과 정확히 일치하는지 확인.
- 주요 입력값/파라미터: `normalizedCommand`, `aliases`.
- 반환값: boolean.
- 내부에서 호출하는 주요 함수: `Array.some`.
- 사용되는 위치: `parseCommand`.
- 주의사항 또는 개선 포인트: 부분 일치는 `parseKeywordCommand`가 담당한다.

### `parseKeywordCommand`
- 파일 경로: `src/modules/commandLogic.js`
- 역할: 검색형 명령어에서 alias 뒤 keyword 추출.
- 주요 입력값/파라미터: `command`, `normalizedCommand`, `aliases`.
- 반환값: keyword 문자열 또는 `null`.
- 내부에서 호출하는 주요 함수: `Array.find`, `String.startsWith`, `String.slice`.
- 사용되는 위치: `parseCommand`.
- 주의사항 또는 개선 포인트: alias와 keyword 사이 구분자가 없어도 startsWith 기준으로 처리된다.

### `parseCommand`
- 파일 경로: `src/modules/commandLogic.js`
- 역할: 사용자 명령을 intent 객체로 변환.
- 주요 입력값/파라미터: `command`.
- 반환값: `{ type, ... }` 형태 parsed command.
- 내부에서 호출하는 주요 함수: `normalizeCommand`, `matchesCommand`, `parseKeywordCommand`.
- 사용되는 위치: `Command.executeCommand`.
- 주의사항 또는 개선 포인트: alias 목록이 하드코딩되어 있어 번역 key와 동기화 관리가 필요하다.

### `getRecommendation`
- 파일 경로: `src/modules/commandLogic.js`
- 역할: 현재 task/note 상태에 따른 추천 문구 선택.
- 주요 입력값/파라미터: `stats`, `noteCount`, `t`.
- 반환값: 추천 문자열.
- 내부에서 호출하는 주요 함수: 없음.
- 사용되는 위치: `createResult`.
- 주의사항 또는 개선 포인트: 추천 규칙은 단순 우선순위 기반이다.

### `getRecommendedTask`
- 파일 경로: `src/modules/commandLogic.js`
- 역할: 첫 번째 미완료 Task 선택.
- 주요 입력값/파라미터: `tasks`.
- 반환값: Task 객체 또는 `undefined`.
- 내부에서 호출하는 주요 함수: `Array.find`.
- 사용되는 위치: `createResult`.
- 주의사항 또는 개선 포인트: 우선순위/마감일 정렬은 하지 않는다.

### `createMetric`
- 파일 경로: `src/modules/commandLogic.js`
- 역할: Command 결과 metric 객체 생성.
- 주요 입력값/파라미터: `label`, `value`.
- 반환값: `{ label, value }`.
- 내부에서 호출하는 주요 함수: 없음.
- 사용되는 위치: `createResult`.
- 주의사항 또는 개선 포인트: 단순 구조 helper.

### `formatScheduleItem`
- 파일 경로: `src/modules/commandLogic.js`
- 역할: Calendar event를 Command 결과 문자열로 포맷.
- 주요 입력값/파라미터: `event`.
- 반환값: 문자열.
- 내부에서 호출하는 주요 함수: `getCalendarEventDateLabel`.
- 사용되는 위치: `createResult`.
- 주의사항 또는 개선 포인트: memo가 있으면 콜론으로 붙인다.

### `createCommandListItem`
- 파일 경로: `src/modules/commandLogic.js`
- 역할: 사용 가능한 명령어 목록 result item 생성.
- 주요 입력값/파라미터: `t`.
- 반환값: Command result item 객체.
- 내부에서 호출하는 주요 함수: 없음.
- 사용되는 위치: `createResult`.
- 주의사항 또는 개선 포인트: `isCommandList`로 UI에서 버튼 목록으로 렌더링된다.

### `createResult`
- 파일 경로: `src/modules/commandLogic.js`
- 역할: parsed command와 저장 데이터로 Command 결과 모델 생성.
- 주요 입력값/파라미터: `{ calendarEvents, command, currentDate, dataStatus, notes, parsedCommand, tasks, t }`.
- 반환값: `{ title, type, metrics, items, navigateTo? }`.
- 내부에서 호출하는 주요 함수: `getTaskStats`, `getRecentNotes`, `getRecommendation`, `getTodayEvents`, `getTodayDueTasks`, `getMonthEvents`, `getRecommendedTask`, `countEventsByDate`, `getNextEvent`, `createMetric`, `formatScheduleItem`, `createCommandListItem`.
- 사용되는 위치: `Command.executeCommand`.
- 주의사항 또는 개선 포인트: 조건 분기가 길어 command registry 형태로 분리 가능하다.

## `src/modules/Calendar.jsx`

### `readStoredCalendarEvents`
- 파일 경로: `src/modules/Calendar.jsx`
- 역할: Calendar localStorage 값 복원.
- 주요 입력값/파라미터: 없음.
- 반환값: Calendar event 배열.
- 내부에서 호출하는 주요 함수: `localStorage.getItem`, `readCalendarEvents`.
- 사용되는 위치: `Calendar` 초기 state.
- 주의사항 또는 개선 포인트: storage key 변경 금지.

### `readStoredTasks`
- 파일 경로: `src/modules/Calendar.jsx`
- 역할: Calendar에서 표시할 Tasks 저장 목록 복원.
- 주요 입력값/파라미터: 없음.
- 반환값: Task 배열.
- 내부에서 호출하는 주요 함수: `localStorage.getItem`, `JSON.parse`, `Array.isArray`.
- 사용되는 위치: `Calendar` 초기 state.
- 주의사항 또는 개선 포인트: Calendar 렌더 이후 Tasks 변경은 자동 반영되지 않는다.

### `Calendar`
- 파일 경로: `src/modules/Calendar.jsx`
- 역할: 월간 달력, 선택 날짜 일정/Task, 일정 추가/삭제 UI 관리.
- 주요 입력값/파라미터: `t`.
- 반환값: Calendar JSX.
- 내부에서 호출하는 주요 함수: `useState`, `useMemo`, `getDateKey`, `parseDateKey`, `getEventsForDate`, `getTasksDueOnDate`, `countEventsByDate`, `countDueTasksByDate`, `getMonthCalendarCells`, `getCalendarDayRangeMeta`, 내부 핸들러.
- 사용되는 위치: `App`.
- 주의사항 또는 개선 포인트: Tasks는 초기 state만 읽으므로 다른 모듈에서 수정한 마감 Task는 Calendar 재마운트 전까지 갱신되지 않을 수 있다.

### `resetEventForm`
- 파일 경로: `src/modules/Calendar.jsx`
- 역할: 일정 입력 폼 초기화.
- 주요 입력값/파라미터: 없음.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: state setters.
- 사용되는 위치: `handleAddEvent`, `handleCancelEventForm`.
- 주의사항 또는 개선 포인트: 선택 날짜를 기준으로 시작/종료일을 재설정한다.

### `persistEvents`
- 파일 경로: `src/modules/Calendar.jsx`
- 역할: Calendar event 배열 저장 및 state 반영.
- 주요 입력값/파라미터: `nextEvents`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `localStorage.setItem`, `setEvents`.
- 사용되는 위치: `handleAddEvent`, `handleDeleteEvent`.
- 주의사항 또는 개선 포인트: 저장 실패 예외 처리는 없다.

### `syncVisibleMonth`
- 파일 경로: `src/modules/Calendar.jsx`
- 역할: 선택 날짜 기준으로 표시 월/연도 동기화.
- 주요 입력값/파라미터: `nextDateKey`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `parseDateKey`, state setters.
- 사용되는 위치: `selectDate`, `handleStartDateChange`.
- 주의사항 또는 개선 포인트: 입력 날짜 형식이 유효하다고 가정한다.

### `selectDate`
- 파일 경로: `src/modules/Calendar.jsx`
- 역할: 날짜 선택과 일정 폼 날짜 동기화.
- 주요 입력값/파라미터: `dateKey`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `syncVisibleMonth`, state setters.
- 사용되는 위치: 달력 날짜 버튼.
- 주의사항 또는 개선 포인트: 폼 메시지를 초기화한다.

### `moveVisibleMonth`
- 파일 경로: `src/modules/Calendar.jsx`
- 역할: 이전/다음 달 이동 및 선택 날짜 보정.
- 주요 입력값/파라미터: `offset`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `parseDateKey`, `getAdjacentMonth`, `getClampedDateKey`, state setters.
- 사용되는 위치: 월 이동 버튼.
- 주의사항 또는 개선 포인트: 말일 이동 시 해당 월에 없는 날짜는 마지막 날짜로 보정한다.

### `handleYearChange`
- 파일 경로: `src/modules/Calendar.jsx`
- 역할: 연도 select 변경 처리.
- 주요 입력값/파라미터: change `event`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `Number`, `parseDateKey`, `getClampedDateKey`.
- 사용되는 위치: year select.
- 주의사항 또는 개선 포인트: select option 범위 밖 값은 UI상 들어오기 어렵다.

### `handleMonthChange`
- 파일 경로: `src/modules/Calendar.jsx`
- 역할: 월 select 변경 처리.
- 주요 입력값/파라미터: change `event`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `Number`, `parseDateKey`, `getClampedDateKey`.
- 사용되는 위치: month select.
- 주의사항 또는 개선 포인트: 선택 날짜를 새 월에 맞게 보정한다.

### `handleAddEvent`
- 파일 경로: `src/modules/Calendar.jsx`
- 역할: 일정 생성, 저장, 폼 닫기.
- 주요 입력값/파라미터: submit `event`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `event.preventDefault`, `isValidCalendarDateRange`, `createCalendarEvent`, `persistEvents`, `resetEventForm`.
- 사용되는 위치: Calendar event form.
- 주의사항 또는 개선 포인트: 저장 실패 예외 처리는 없다.

### `handleDeleteEvent`
- 파일 경로: `src/modules/Calendar.jsx`
- 역할: 일정 삭제.
- 주요 입력값/파라미터: `eventId`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `removeCalendarEvent`, `persistEvents`.
- 사용되는 위치: 일정 삭제 버튼.
- 주의사항 또는 개선 포인트: 삭제 확인 없이 즉시 제거한다.

### `handleStartDateChange`
- 파일 경로: `src/modules/Calendar.jsx`
- 역할: 시작일 변경과 종료일 최소 보정.
- 주요 입력값/파라미터: change `event`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `setEndDate`, `syncVisibleMonth`.
- 사용되는 위치: 시작일 input.
- 주의사항 또는 개선 포인트: 종료일이 시작일보다 앞서면 시작일로 맞춘다.

### `handleEndDateChange`
- 파일 경로: `src/modules/Calendar.jsx`
- 역할: 종료일 변경.
- 주요 입력값/파라미터: change `event`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: state setters.
- 사용되는 위치: 종료일 input.
- 주의사항 또는 개선 포인트: 최종 범위 검증은 제출 시 수행한다.

### `handleCancelEventForm`
- 파일 경로: `src/modules/Calendar.jsx`
- 역할: 일정 폼 입력 취소.
- 주요 입력값/파라미터: 없음.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `resetEventForm`, `setIsEventFormOpen`.
- 사용되는 위치: 일정 폼 취소 버튼.
- 주의사항 또는 개선 포인트: 입력 중 데이터가 즉시 사라진다.

## `src/modules/calendarLogic.js`

### `getDateKey`
- 파일 경로: `src/modules/calendarLogic.js`
- 역할: Date를 `YYYY-MM-DD` key로 변환.
- 주요 입력값/파라미터: `date`.
- 반환값: 날짜 key 문자열.
- 내부에서 호출하는 주요 함수: `Date.getFullYear`, `String.padStart`.
- 사용되는 위치: Calendar, Dashboard, Command, Tasks logic.
- 주의사항 또는 개선 포인트: 로컬 타임존 기준.

### `parseDateKey`
- 파일 경로: `src/modules/calendarLogic.js`
- 역할: `YYYY-MM-DD`를 year/month/day 객체로 분해.
- 주요 입력값/파라미터: `dateKey`.
- 반환값: `{ year, month, day }`.
- 내부에서 호출하는 주요 함수: `String.split`, `Number`.
- 사용되는 위치: Calendar logic 전반.
- 주의사항 또는 개선 포인트: month는 JavaScript Date용 0-base다.

### `isDateKey`
- 파일 경로: `src/modules/calendarLogic.js`
- 역할: 날짜 key 형식과 실제 날짜 유효성 검증.
- 주요 입력값/파라미터: `dateKey`.
- 반환값: boolean.
- 내부에서 호출하는 주요 함수: `parseDateKey`, `getDateKey`, `RegExp.test`.
- 사용되는 위치: `isValidCalendarDateRange`, `normalizeCalendarEvent`.
- 주의사항 또는 개선 포인트: 비공개 helper.

### `getDaysInMonth`
- 파일 경로: `src/modules/calendarLogic.js`
- 역할: 특정 월의 일수 계산.
- 주요 입력값/파라미터: `year`, `month`.
- 반환값: 숫자.
- 내부에서 호출하는 주요 함수: `Date`.
- 사용되는 위치: `getClampedDateKey`, `getMonthCalendarCells`, `getMonthEvents`.
- 주의사항 또는 개선 포인트: month는 0-base다.

### `getClampedDateKey`
- 파일 경로: `src/modules/calendarLogic.js`
- 역할: 월 범위에 맞춰 day를 보정한 날짜 key 생성.
- 주요 입력값/파라미터: `year`, `month`, `day`.
- 반환값: 날짜 key 문자열.
- 내부에서 호출하는 주요 함수: `getDaysInMonth`, `getDateKey`, `Math.min`, `Math.max`.
- 사용되는 위치: Calendar 월/연도 이동.
- 주의사항 또는 개선 포인트: 말일 보정용.

### `getAdjacentMonth`
- 파일 경로: `src/modules/calendarLogic.js`
- 역할: 현재 월에서 offset만큼 이동한 월/연도 계산.
- 주요 입력값/파라미터: `year`, `month`, `offset`.
- 반환값: `{ year, month }`.
- 내부에서 호출하는 주요 함수: `Date`.
- 사용되는 위치: `Calendar.moveVisibleMonth`.
- 주의사항 또는 개선 포인트: month는 0-base다.

### `isFullMoonDate`
- 파일 경로: `src/modules/calendarLogic.js`
- 역할: synodic month 기준으로 보름달 근사 여부 계산.
- 주요 입력값/파라미터: `dateKey`.
- 반환값: boolean.
- 내부에서 호출하는 주요 함수: `parseDateKey`, `Date.UTC`.
- 사용되는 위치: Calendar 날짜 셀.
- 주의사항 또는 개선 포인트: 천문학적 정확 계산이 아니라 근사값이다.

### `getMonthCalendarCells`
- 파일 경로: `src/modules/calendarLogic.js`
- 역할: 월간 달력 grid 셀 생성.
- 주요 입력값/파라미터: `year`, `month`.
- 반환값: 날짜 셀 객체와 `null`이 섞인 배열.
- 내부에서 호출하는 주요 함수: `getDaysInMonth`, `getDateKey`.
- 사용되는 위치: Calendar.
- 주의사항 또는 개선 포인트: 앞/뒤 빈칸은 `null`로 채운다.

### `isValidCalendarDateRange`
- 파일 경로: `src/modules/calendarLogic.js`
- 역할: 시작/종료 날짜 범위 검증.
- 주요 입력값/파라미터: `startDate`, `endDate`.
- 반환값: boolean.
- 내부에서 호출하는 주요 함수: `isDateKey`.
- 사용되는 위치: Calendar, `createCalendarEvent`, `normalizeCalendarEvent`.
- 주의사항 또는 개선 포인트: 문자열 비교가 가능한 `YYYY-MM-DD` 형식에 의존한다.

### `getCalendarEventStartDate`
- 파일 경로: `src/modules/calendarLogic.js`
- 역할: event 시작일 fallback 계산.
- 주요 입력값/파라미터: `event`.
- 반환값: 날짜 key.
- 내부에서 호출하는 주요 함수: 없음.
- 사용되는 위치: Calendar logic 전반.
- 주의사항 또는 개선 포인트: 구형 `date` 필드 호환을 유지한다.

### `getCalendarEventEndDate`
- 파일 경로: `src/modules/calendarLogic.js`
- 역할: event 종료일 fallback 계산.
- 주요 입력값/파라미터: `event`.
- 반환값: 날짜 key.
- 내부에서 호출하는 주요 함수: 없음.
- 사용되는 위치: Calendar logic 전반.
- 주의사항 또는 개선 포인트: `endDate > startDate` 검증은 별도 함수에서 한다.

### `normalizeCalendarEvent`
- 파일 경로: `src/modules/calendarLogic.js`
- 역할: 저장된 Calendar event 형식 검증/보정.
- 주요 입력값/파라미터: `event`.
- 반환값: 보정된 event 또는 `null`.
- 내부에서 호출하는 주요 함수: `isDateKey`, `getCalendarEventStartDate`, `getCalendarEventEndDate`, `isValidCalendarDateRange`.
- 사용되는 위치: `readCalendarEvents`, `isCalendarEvent`.
- 주의사항 또는 개선 포인트: 필수 문자열 필드가 엄격하다.

### `isCalendarEvent`
- 파일 경로: `src/modules/calendarLogic.js`
- 역할: event 유효성 predicate.
- 주요 입력값/파라미터: `event`.
- 반환값: boolean.
- 내부에서 호출하는 주요 함수: `normalizeCalendarEvent`.
- 사용되는 위치: `readCalendarEvents`.
- 주의사항 또는 개선 포인트: normalize를 두 번 호출할 수 있는 구조다.

### `readCalendarEvents`
- 파일 경로: `src/modules/calendarLogic.js`
- 역할: 저장 문자열에서 유효한 Calendar event만 복원.
- 주요 입력값/파라미터: `storageValue`.
- 반환값: event 배열.
- 내부에서 호출하는 주요 함수: `JSON.parse`, `Array.isArray`, `Array.filter`, `isCalendarEvent`.
- 사용되는 위치: `Calendar`, tests.
- 주의사항 또는 개선 포인트: 유효하지만 보정된 normalize 결과를 반환하지 않고 원본 event를 필터링한다.

### `isRangedCalendarEvent`
- 파일 경로: `src/modules/calendarLogic.js`
- 역할: 기간 일정 여부 판별.
- 주요 입력값/파라미터: `event`.
- 반환값: boolean.
- 내부에서 호출하는 주요 함수: `getCalendarEventStartDate`, `getCalendarEventEndDate`.
- 사용되는 위치: Calendar 표시, `getCalendarEventDateLabel`.
- 주의사항 또는 개선 포인트: 날짜 유효성은 검증하지 않는다.

### `formatCalendarDate`
- 파일 경로: `src/modules/calendarLogic.js`
- 역할: `YYYY-MM-DD`를 `YYYY.MM.DD`로 변환.
- 주요 입력값/파라미터: `dateKey`.
- 반환값: 문자열.
- 내부에서 호출하는 주요 함수: `String.replaceAll`.
- 사용되는 위치: `getCalendarEventDateLabel`.
- 주의사항 또는 개선 포인트: 형식 검증은 하지 않는다.

### `getCalendarEventDateLabel`
- 파일 경로: `src/modules/calendarLogic.js`
- 역할: 하루/기간 일정 날짜 표시 문자열 생성.
- 주요 입력값/파라미터: `event`.
- 반환값: 문자열.
- 내부에서 호출하는 주요 함수: `isRangedCalendarEvent`, `formatCalendarDate`, `getCalendarEventStartDate`, `getCalendarEventEndDate`.
- 사용되는 위치: Calendar, Dashboard, Command.
- 주의사항 또는 개선 포인트: locale 포맷은 아니고 고정 문자열 포맷이다.

### `eventOccursOnDate`
- 파일 경로: `src/modules/calendarLogic.js`
- 역할: event가 특정 날짜에 포함되는지 판별.
- 주요 입력값/파라미터: `event`, `dateKey`.
- 반환값: boolean.
- 내부에서 호출하는 주요 함수: `getCalendarEventStartDate`, `getCalendarEventEndDate`.
- 사용되는 위치: `getEventsForDate`, `getCalendarEventRangePosition`.
- 주의사항 또는 개선 포인트: 문자열 날짜 비교에 의존한다.

### `getDateKeysBetween`
- 파일 경로: `src/modules/calendarLogic.js`
- 역할: 시작~종료 사이의 모든 날짜 key 생성.
- 주요 입력값/파라미터: `startDateKey`, `endDateKey`.
- 반환값: 날짜 key 배열.
- 내부에서 호출하는 주요 함수: `isValidCalendarDateRange`, `parseDateKey`, `getDateKey`, `Date.setDate`.
- 사용되는 위치: `getCalendarEventDateKeys`.
- 주의사항 또는 개선 포인트: 긴 기간 일정은 배열이 커질 수 있다.

### `getCalendarEventDateKeys`
- 파일 경로: `src/modules/calendarLogic.js`
- 역할: event가 차지하는 날짜 key 배열 반환.
- 주요 입력값/파라미터: `event`.
- 반환값: 날짜 key 배열.
- 내부에서 호출하는 주요 함수: `getDateKeysBetween`, `getCalendarEventStartDate`, `getCalendarEventEndDate`.
- 사용되는 위치: `getScheduledDateCount`, `countEventsByDate`.
- 주의사항 또는 개선 포인트: 유효하지 않은 event는 빈 배열 가능.

### `getEventsForDate`
- 파일 경로: `src/modules/calendarLogic.js`
- 역할: 특정 날짜에 해당하는 event 필터링.
- 주요 입력값/파라미터: `events`, `dateKey`.
- 반환값: event 배열.
- 내부에서 호출하는 주요 함수: `eventOccursOnDate`, `Array.filter`.
- 사용되는 위치: Calendar, `getTodayEvents`.
- 주의사항 또는 개선 포인트: 정렬은 하지 않는다.

### `getCalendarEventRangePosition`
- 파일 경로: `src/modules/calendarLogic.js`
- 역할: 특정 날짜가 기간 일정의 시작/중간/끝/단일 어디인지 계산.
- 주요 입력값/파라미터: `event`, `dateKey`.
- 반환값: `RANGE_POSITION` 값 또는 `null`.
- 내부에서 호출하는 주요 함수: `eventOccursOnDate`, `getCalendarEventStartDate`, `getCalendarEventEndDate`.
- 사용되는 위치: `getCalendarDayRangeMeta`.
- 주의사항 또는 개선 포인트: 여러 기간 일정 겹침은 상위 함수에서 단순화한다.

### `getCalendarDayRangeMeta`
- 파일 경로: `src/modules/calendarLogic.js`
- 역할: 날짜 셀의 기간 일정 class/meta 계산.
- 주요 입력값/파라미터: `events`, `dateKey`.
- 반환값: `{ classNames, hasRangeEvents, hasSingleDayEvents, periodPosition, rangeEventCount }`.
- 내부에서 호출하는 주요 함수: `getCalendarEventRangePosition`, `Array.map`, `Array.filter`, `Array.find`.
- 사용되는 위치: Calendar 날짜 셀.
- 주의사항 또는 개선 포인트: 겹치는 기간 일정이 많아도 대표 position 하나만 class로 쓴다.

### `getTodayEvents`
- 파일 경로: `src/modules/calendarLogic.js`
- 역할: 오늘 발생하는 event 반환.
- 주요 입력값/파라미터: `events`, `today`.
- 반환값: event 배열.
- 내부에서 호출하는 주요 함수: `getDateKey`, `getEventsForDate`.
- 사용되는 위치: Dashboard, Command.
- 주의사항 또는 개선 포인트: 로컬 날짜 기준이다.

### `getMonthEvents`
- 파일 경로: `src/modules/calendarLogic.js`
- 역할: 현재 월과 겹치는 event 반환.
- 주요 입력값/파라미터: `events`, `currentDate`.
- 반환값: event 배열.
- 내부에서 호출하는 주요 함수: `getDateKey`, `parseDateKey`, `getDaysInMonth`, `getCalendarEventStartDate`, `getCalendarEventEndDate`.
- 사용되는 위치: Dashboard, Command.
- 주의사항 또는 개선 포인트: 월을 걸치는 기간 일정도 포함한다.

### `getScheduledDateCount`
- 파일 경로: `src/modules/calendarLogic.js`
- 역할: event가 등록된 고유 날짜 수 계산.
- 주요 입력값/파라미터: `events`.
- 반환값: 숫자.
- 내부에서 호출하는 주요 함수: `getCalendarEventDateKeys`, `Set`.
- 사용되는 위치: Dashboard.
- 주의사항 또는 개선 포인트: 기간 일정은 여러 날짜로 카운트된다.

### `getNextEvent`
- 파일 경로: `src/modules/calendarLogic.js`
- 역할: 오늘 이후 다음 event 선택.
- 주요 입력값/파라미터: `events`, `currentDate`.
- 반환값: event 또는 `undefined`.
- 내부에서 호출하는 주요 함수: `getDateKey`, `getCalendarEventStartDate`, `getCalendarEventEndDate`, `Array.filter`, `Array.sort`.
- 사용되는 위치: Dashboard, Command.
- 주의사항 또는 개선 포인트: `endDate > todayKey`라 오늘 진행 중인 일정은 제외될 수 있다.

### `countEventsByDate`
- 파일 경로: `src/modules/calendarLogic.js`
- 역할: 날짜별 event 개수 집계.
- 주요 입력값/파라미터: `events`.
- 반환값: `{ [dateKey]: count }`.
- 내부에서 호출하는 주요 함수: `getCalendarEventDateKeys`, `Array.reduce`, `Array.forEach`.
- 사용되는 위치: Calendar, Command.
- 주의사항 또는 개선 포인트: 기간 일정은 포함 날짜마다 1씩 증가한다.

### `createCalendarEvent`
- 파일 경로: `src/modules/calendarLogic.js`
- 역할: Calendar event 객체 생성.
- 주요 입력값/파라미터: `{ date, startDate, endDate, title, memo }`.
- 반환값: event 객체 또는 `null`.
- 내부에서 호출하는 주요 함수: `String.trim`, `isValidCalendarDateRange`, `Date.toISOString`, `Math.random`.
- 사용되는 위치: `Calendar.handleAddEvent`.
- 주의사항 또는 개선 포인트: id 생성이 `Date.now + Math.random` 기반이다.

### `removeCalendarEvent`
- 파일 경로: `src/modules/calendarLogic.js`
- 역할: event 배열에서 특정 id 제거.
- 주요 입력값/파라미터: `events`, `eventId`.
- 반환값: event 배열.
- 내부에서 호출하는 주요 함수: `Array.filter`.
- 사용되는 위치: `Calendar.handleDeleteEvent`.
- 주의사항 또는 개선 포인트: 존재하지 않는 id면 원본과 같은 항목 배열을 새로 만든다.

## `src/modules/Dashboard.jsx`

### `readStoredList`
- 파일 경로: `src/modules/Dashboard.jsx`
- 역할: Dashboard용 localStorage 배열 복원.
- 주요 입력값/파라미터: `storageKey`.
- 반환값: 배열.
- 내부에서 호출하는 주요 함수: `localStorage.getItem`, `JSON.parse`, `Array.isArray`.
- 사용되는 위치: `Dashboard`.
- 주의사항 또는 개선 포인트: 손상 데이터는 빈 배열로 fallback.

### `readStoredNumber`
- 파일 경로: `src/modules/Dashboard.jsx`
- 역할: Dashboard용 숫자 저장값 복원.
- 주요 입력값/파라미터: `storageKey`.
- 반환값: 0 이상의 숫자.
- 내부에서 호출하는 주요 함수: `Number.parseInt`, `Math.max`.
- 사용되는 위치: `Dashboard`.
- 주의사항 또는 개선 포인트: 숫자가 아니면 0.

### `getNoteTime`
- 파일 경로: `src/modules/Dashboard.jsx`
- 역할: Note 정렬용 timestamp 생성.
- 주요 입력값/파라미터: `note`.
- 반환값: timestamp 또는 0.
- 내부에서 호출하는 주요 함수: `Date`, `Number.isNaN`.
- 사용되는 위치: `Dashboard` recent notes 계산.
- 주의사항 또는 개선 포인트: `commandLogic`에도 유사 함수가 있어 공통화 가능.

### `Dashboard`
- 파일 경로: `src/modules/Dashboard.jsx`
- 역할: Overview/Work/Archive/System dashboard 탭 렌더링과 요약 데이터 표시.
- 주요 입력값/파라미터: `hudEffect`, `language`, `startModule`, `t`, `theme`.
- 반환값: Dashboard JSX.
- 내부에서 호출하는 주요 함수: `useState`, `useEffect`, `readStoredList`, `readStoredNumber`, `getTodayEvents`, `getTodayDueTasks`, `getMonthEvents`, `getScheduledDateCount`, `getNextEvent`, 내부 render 함수.
- 사용되는 위치: `App`.
- 주의사항 또는 개선 포인트: Tasks/Notes/Calendar는 렌더 시 localStorage를 읽고, Map summary는 비동기로 가져온다.

### `loadMapSummary`
- 파일 경로: `src/modules/Dashboard.jsx`
- 역할: IndexedDB Map summary 비동기 로드.
- 주요 입력값/파라미터: 없음.
- 반환값: Promise<void>.
- 내부에서 호출하는 주요 함수: `getMapArchiveSummary`, `setMapSummaryState`.
- 사용되는 위치: `Dashboard` 내부 `useEffect`.
- 주의사항 또는 개선 포인트: 언마운트 후 setState 방지를 위해 `isMounted` flag를 쓴다.

### `renderEmptyState`
- 파일 경로: `src/modules/Dashboard.jsx`
- 역할: Dashboard 공통 빈 상태 UI 생성.
- 주요 입력값/파라미터: `message`.
- 반환값: JSX.
- 내부에서 호출하는 주요 함수: 없음.
- 사용되는 위치: Dashboard render helper들.
- 주의사항 또는 개선 포인트: 문구만 바꿔 재사용한다.

### `renderNoteList`
- 파일 경로: `src/modules/Dashboard.jsx`
- 역할: 최근 Note 목록 또는 빈 상태 렌더링.
- 주요 입력값/파라미터: `items`.
- 반환값: JSX.
- 내부에서 호출하는 주요 함수: `renderEmptyState`.
- 사용되는 위치: overview/archive 탭.
- 주의사항 또는 개선 포인트: 제목이 없으면 `t.notes.untitled`.

### `renderTodayScheduleList`
- 파일 경로: `src/modules/Dashboard.jsx`
- 역할: 오늘 일정 목록 렌더링.
- 주요 입력값/파라미터: 없음.
- 반환값: JSX.
- 내부에서 호출하는 주요 함수: `renderEmptyState`.
- 사용되는 위치: work 탭.
- 주의사항 또는 개선 포인트: 최대 3개로 제한된 `todayEvents`를 사용한다.

### `renderDueTaskList`
- 파일 경로: `src/modules/Dashboard.jsx`
- 역할: 오늘 마감 Task 목록 렌더링.
- 주요 입력값/파라미터: 없음.
- 반환값: JSX.
- 내부에서 호출하는 주요 함수: `renderEmptyState`.
- 사용되는 위치: work 탭.
- 주의사항 또는 개선 포인트: 최대 3개로 제한된 `todayDueTasks`를 사용한다.

### `renderNextEvent`
- 파일 경로: `src/modules/Dashboard.jsx`
- 역할: 다음 일정 카드 내용 렌더링.
- 주요 입력값/파라미터: 없음.
- 반환값: JSX.
- 내부에서 호출하는 주요 함수: `getCalendarEventDateLabel`, `renderEmptyState`.
- 사용되는 위치: overview/work 탭.
- 주의사항 또는 개선 포인트: 다음 일정 계산은 `getNextEvent` 결과에 의존한다.

### `renderMapSummaryBody`
- 파일 경로: `src/modules/Dashboard.jsx`
- 역할: Map archive 요약 상태별 UI 렌더링.
- 주요 입력값/파라미터: 없음.
- 반환값: JSX.
- 내부에서 호출하는 주요 함수: `renderEmptyState`.
- 사용되는 위치: archive 탭.
- 주의사항 또는 개선 포인트: loading/error/empty/ready 상태를 모두 처리한다.

### `renderOverviewTab`
- 파일 경로: `src/modules/Dashboard.jsx`
- 역할: Dashboard overview 탭 렌더링.
- 주요 입력값/파라미터: 없음.
- 반환값: JSX.
- 내부에서 호출하는 주요 함수: `renderNextEvent`, `renderNoteList`.
- 사용되는 위치: `tabRenderers.overview`.
- 주의사항 또는 개선 포인트: 첫 화면 정보 밀도가 높으므로 모바일 CSS와 함께 관리 필요.

### `renderWorkTab`
- 파일 경로: `src/modules/Dashboard.jsx`
- 역할: 작업/일정 중심 탭 렌더링.
- 주요 입력값/파라미터: 없음.
- 반환값: JSX.
- 내부에서 호출하는 주요 함수: `renderEmptyState`, `renderDueTaskList`, `renderTodayScheduleList`, `renderNextEvent`.
- 사용되는 위치: `tabRenderers.work`.
- 주의사항 또는 개선 포인트: Task/Calendar 요약이 localStorage snapshot 기준이다.

### `renderArchiveTab`
- 파일 경로: `src/modules/Dashboard.jsx`
- 역할: Notes/Map archive 탭 렌더링.
- 주요 입력값/파라미터: 없음.
- 반환값: JSX.
- 내부에서 호출하는 주요 함수: `renderNoteList`, `renderMapSummaryBody`.
- 사용되는 위치: `tabRenderers.archive`.
- 주의사항 또는 개선 포인트: Map summary는 IndexedDB 비동기 상태에 의존한다.

### `renderSystemTab`
- 파일 경로: `src/modules/Dashboard.jsx`
- 역할: 설정/저장 데이터 요약 탭 렌더링.
- 주요 입력값/파라미터: 없음.
- 반환값: JSX.
- 내부에서 호출하는 주요 함수: 없음.
- 사용되는 위치: `tabRenderers.system`.
- 주의사항 또는 개선 포인트: 설정 label은 `t` fallback을 사용한다.

## `src/modules/Settings.jsx`

### `readStoredCount`
- 파일 경로: `src/modules/Settings.jsx`
- 역할: localStorage 배열 데이터 개수 계산.
- 주요 입력값/파라미터: `storageKey`.
- 반환값: 숫자.
- 내부에서 호출하는 주요 함수: `localStorage.getItem`, `JSON.parse`, `Array.isArray`.
- 사용되는 위치: `Settings`.
- 주의사항 또는 개선 포인트: 손상 데이터는 0.

### `readStoredList`
- 파일 경로: `src/modules/Settings.jsx`
- 역할: 백업용 localStorage 배열 데이터 복원.
- 주요 입력값/파라미터: `storageKey`.
- 반환값: 배열.
- 내부에서 호출하는 주요 함수: `localStorage.getItem`, `JSON.parse`, `Array.isArray`.
- 사용되는 위치: `handleExportBackup`.
- 주의사항 또는 개선 포인트: 손상 데이터는 빈 배열로 백업된다.

### `readStoredCompletedSessions`
- 파일 경로: `src/modules/Settings.jsx`
- 역할: Timer 완료 세션 수 백업값 복원.
- 주요 입력값/파라미터: 없음.
- 반환값: 0 이상의 숫자.
- 내부에서 호출하는 주요 함수: `localStorage.getItem`, `Number.parseInt`, `Math.max`.
- 사용되는 위치: `handleExportBackup`.
- 주의사항 또는 개선 포인트: Settings 백업 전용 helper.

### `Settings`
- 파일 경로: `src/modules/Settings.jsx`
- 역할: 언어/시작 모듈/테마/HUD 설정, 데이터 개수, 백업/복원, reset UI 관리.
- 주요 입력값/파라미터: `hudEffect`, `language`, `onHudEffectChange`, `onLanguageChange`, `onStartModuleChange`, `onThemeChange`, `startModule`, `t`, `theme`.
- 반환값: Settings JSX.
- 내부에서 호출하는 주요 함수: `useState`, `useRef`, `useEffect`, `handleConfirmReset`, `handleExportBackup`, `restoreLocalStorageData`, `handleRestoreBackup`.
- 사용되는 위치: `App`.
- 주의사항 또는 개선 포인트: 복원 로직은 localStorage와 IndexedDB를 함께 건드리므로 rollback 흐름 유지가 중요하다.

### `handleConfirmReset`
- 파일 경로: `src/modules/Settings.jsx`
- 역할: Tasks/Notes localStorage 데이터 초기화.
- 주요 입력값/파라미터: 없음.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `localStorage.removeItem`, state setters.
- 사용되는 위치: reset confirm 버튼.
- 주의사항 또는 개선 포인트: Map/Timer/설정 데이터는 삭제하지 않는다.

### `handleExportBackup`
- 파일 경로: `src/modules/Settings.jsx`
- 역할: TENVI 데이터를 JSON 백업 파일로 내보내기.
- 주요 입력값/파라미터: 없음.
- 반환값: Promise<void>.
- 내부에서 호출하는 주요 함수: `serializePhotoRecordsForBackup`, `getPhotoRecords`, `serializePhotoCollectionsForBackup`, `getPhotoCollections`, `readStoredList`, `readStoredCompletedSessions`, `createBackupFileName`, `URL.createObjectURL`.
- 사용되는 위치: export backup 버튼.
- 주의사항 또는 개선 포인트: Blob URL revoke를 click 직후 수행한다.

### `restoreLocalStorageData`
- 파일 경로: `src/modules/Settings.jsx`
- 역할: 검증된 백업 데이터의 localStorage 영역 복원.
- 주요 입력값/파라미터: `validatedBackup`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `localStorage.setItem`, `JSON.stringify`.
- 사용되는 위치: `handleRestoreBackup`.
- 주의사항 또는 개선 포인트: 기존 storage key 구조를 그대로 사용한다.

### `handleRestoreBackup`
- 파일 경로: `src/modules/Settings.jsx`
- 역할: JSON 백업 파일 검증, 사용자 확인, Map 데이터 복원, localStorage 복원, rollback 처리.
- 주요 입력값/파라미터: file input change `event`.
- 반환값: Promise<void>.
- 내부에서 호출하는 주요 함수: `validateBackupPayload`, `preparePhotoCollectionsForRestore`, `preparePhotoRecordsForRestore`, `window.confirm`, `getPhotoRecords`, `getPhotoCollections`, `replacePhotoArchiveData`, `replacePhotoRecords`, `restoreLocalStorageData`, app 설정 setter들.
- 사용되는 위치: 백업 파일 input `onChange`.
- 주의사항 또는 개선 포인트: 복원 실패 시 가능한 범위에서 localStorage/IndexedDB rollback을 시도한다.

## `src/modules/settingsBackup.js`

### `createBackupFileName`
- 파일 경로: `src/modules/settingsBackup.js`
- 역할: 오늘 날짜가 포함된 백업 파일명 생성.
- 주요 입력값/파라미터: 없음.
- 반환값: `tenvi-backup-YYYY-MM-DD.json`.
- 내부에서 호출하는 주요 함수: `Date.toISOString`, `String.slice`.
- 사용되는 위치: `Settings.handleExportBackup`.
- 주의사항 또는 개선 포인트: UTC 날짜 기준이다.

### `isPlainObject`
- 파일 경로: `src/modules/settingsBackup.js`
- 역할: plain object 형태 검증.
- 주요 입력값/파라미터: `value`.
- 반환값: boolean.
- 내부에서 호출하는 주요 함수: `Array.isArray`.
- 사용되는 위치: `validateBackupPayload`.
- 주의사항 또는 개선 포인트: prototype까지 엄격히 보지는 않는다.

### `validateBackupPayload`
- 파일 경로: `src/modules/settingsBackup.js`
- 역할: TENVI 백업 JSON payload 구조 검증 및 정규화.
- 주요 입력값/파라미터: `backupPayload`.
- 반환값: 검증된 백업 객체 또는 `null`.
- 내부에서 호출하는 주요 함수: `isPlainObject`, `Object.prototype.hasOwnProperty.call`, `Number.parseInt`, `Array.isArray`.
- 사용되는 위치: `Settings.handleRestoreBackup`.
- 주의사항 또는 개선 포인트: constants의 허용 목록과 Settings UI 옵션이 동기화되어야 한다.

## `src/modules/Map.jsx`

### `createViewportRequest`
- 파일 경로: `src/modules/Map.jsx`
- 역할: Leaflet 지도 이동 요청 객체 생성.
- 주요 입력값/파라미터: `type`, `target`.
- 반환값: `{ latitude, longitude, recordId, requestId, type }`.
- 내부에서 호출하는 주요 함수: `Date.now`, `Math.random`.
- 사용되는 위치: Map 내부 핸들러와 `MapViewportController`.
- 주의사항 또는 개선 포인트: requestId로 동일 요청 중복 처리를 피한다.

### `getLocationSourceLabel`
- 파일 경로: `src/modules/Map.jsx`
- 역할: locationSource 값을 번역 label로 변환.
- 주요 입력값/파라미터: `source`, `t`.
- 반환값: 문자열.
- 내부에서 호출하는 주요 함수: `normalizeLocationSource`.
- 사용되는 위치: marker popup, detail panel.
- 주의사항 또는 개선 포인트: unknown은 `normalizeLocationSource` 정책상 manual로 보정될 수 있다.

### `getCollectionName`
- 파일 경로: `src/modules/Map.jsx`
- 역할: collection id로 표시 이름 반환.
- 주요 입력값/파라미터: `collectionId`, `collections`, `t`.
- 반환값: collection name 또는 unassigned label.
- 내부에서 호출하는 주요 함수: `Array.find`.
- 사용되는 위치: detail/preview/filter 요약.
- 주의사항 또는 개선 포인트: 존재하지 않는 id는 미분류로 표시한다.

### `createBulkUploadId`
- 파일 경로: `src/modules/Map.jsx`
- 역할: bulk 업로드 항목 id 생성.
- 주요 입력값/파라미터: `file`, `index`.
- 반환값: 문자열 id.
- 내부에서 호출하는 주요 함수: 없음.
- 사용되는 위치: `analyzeBulkPhotoFiles`.
- 주의사항 또는 개선 포인트: 같은 파일이 같은 순서로 반복 선택되면 id가 같을 수 있다.

### `getBulkItemStatusLabel`
- 파일 경로: `src/modules/Map.jsx`
- 역할: bulk item status를 번역 label로 변환.
- 주요 입력값/파라미터: `status`, `t`.
- 반환값: 문자열.
- 내부에서 호출하는 주요 함수: 없음.
- 사용되는 위치: `BulkUploadList`.
- 주의사항 또는 개선 포인트: unknown은 failed label로 표시된다.

### `getMapSummaryLocationSource`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 필터 요약용 locationSource 보정.
- 주요 입력값/파라미터: `source`.
- 반환값: `exif|manual|search|unknown`.
- 내부에서 호출하는 주요 함수: `Array.includes`.
- 사용되는 위치: `createMapFilterSummary`.
- 주의사항 또는 개선 포인트: `mapLogic.normalizeLocationSourceForFilter`와 유사해 공통화 가능.

### `createMapFilterSummary`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 현재 collection filter 기준 사진 수와 source count 요약 생성.
- 주요 입력값/파라미터: `records`, `selectedFilter`, `collections`, `t`.
- 반환값: `{ filterName, photoCount, sourceCounts }`.
- 내부에서 호출하는 주요 함수: `Array.find`, `Array.reduce`, `getMapSummaryLocationSource`.
- 사용되는 위치: Map detail/summary UI.
- 주의사항 또는 개선 포인트: `records`는 이미 필터링된 결과로 들어온다.

### `MapViewportController`
- 파일 경로: `src/modules/Map.jsx`
- 역할: Leaflet 지도 인스턴스의 fitBounds/flyTo/setView 제어.
- 주요 입력값/파라미터: `layoutKey`, `records`, `request`, `shouldFitBounds`, `target`.
- 반환값: `null`.
- 내부에서 호출하는 주요 함수: `useMap`, `useRef`, `useEffect`, `L.latLngBounds`, Leaflet `fitBounds`, `setView`, `flyTo`.
- 사용되는 위치: `Map`의 `MapContainer` 내부.
- 주의사항 또는 개선 포인트: 컨테이너 크기 측정 실패 시 이동을 건너뛴다.

### `ManualLocationPicker`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 지도 클릭 좌표를 상위 핸들러로 전달.
- 주요 입력값/파라미터: `disabled`, `onPickLocation`.
- 반환값: `null`.
- 내부에서 호출하는 주요 함수: `useMapEvents`.
- 사용되는 위치: `MapContainer` 내부.
- 주의사항 또는 개선 포인트: disabled일 때 클릭을 무시한다.

### `MapResizeController`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 모바일 view/mode 변경 후 Leaflet size 재계산.
- 주요 입력값/파라미터: `watchValue`.
- 반환값: `null`.
- 내부에서 호출하는 주요 함수: `useMap`, `useEffect`, `window.setTimeout`, `map.invalidateSize`.
- 사용되는 위치: `MapContainer` 내부.
- 주의사항 또는 개선 포인트: 120ms 지연은 레이아웃 전환 완료를 기다리기 위한 값으로 보인다.

### `PhotoPreview`
- 파일 경로: `src/modules/Map.jsx`
- 역할: Blob을 object URL로 바꿔 이미지 미리보기 렌더링.
- 주요 입력값/파라미터: `alt`, `blob`, `className`.
- 반환값: `img` JSX 또는 `null`.
- 내부에서 호출하는 주요 함수: `useState`, `useEffect`, `URL.createObjectURL`, `URL.revokeObjectURL`.
- 사용되는 위치: Map thumbnails/detail/upload/lightbox.
- 주의사항 또는 개선 포인트: Blob 변경 시 object URL 정리가 중요하다.

### `PhotoPreviewButton`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 이미지 미리보기를 클릭 가능한 전체 보기 버튼으로 감싸기.
- 주요 입력값/파라미터: `alt`, `blob`, `className`, `onOpen`, `t`.
- 반환값: button JSX 또는 `PhotoPreview`.
- 내부에서 호출하는 주요 함수: `PhotoPreview`, `onOpen`.
- 사용되는 위치: draft/edit/detail 사진 preview.
- 주의사항 또는 개선 포인트: blob이 없으면 버튼이 아닌 preview만 반환한다.

### `PhotoLightbox`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 전체 사진 보기 모달 렌더링.
- 주요 입력값/파라미터: `photo`, `onClose`, `t`.
- 반환값: dialog JSX 또는 `null`.
- 내부에서 호출하는 주요 함수: `PhotoPreview`, `onClose`.
- 사용되는 위치: `Map`.
- 주의사항 또는 개선 포인트: 배경 스크롤 잠금은 `Map`의 `photoViewer` effect와 CSS에 의존한다.

### `PhotoRecordMarker`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 저장된 사진 위치 marker와 popup 렌더링.
- 주요 입력값/파라미터: `icon`, `isActive`, `onSelectRecord`, `record`, `t`.
- 반환값: Leaflet `Marker` JSX.
- 내부에서 호출하는 주요 함수: `useRef`, `useEffect`, `getLocationSourceLabel`, `onSelectRecord`.
- 사용되는 위치: Map marker 목록.
- 주의사항 또는 개선 포인트: 활성 marker는 popup을 자동으로 연다.

### `PlaceSearchPanel`
- 파일 경로: `src/modules/Map.jsx`
- 역할: Nominatim 장소 검색 UI.
- 주요 입력값/파라미터: `disabled`, `language`, `onSelectPlace`, `t`.
- 반환값: 검색 panel JSX.
- 내부에서 호출하는 주요 함수: `useState`, `handleSearch`, `handleSubmit`, `searchPlaces`.
- 사용되는 위치: draft/edit/bulk 위치 지정 UI.
- 주의사항 또는 개선 포인트: 네트워크 실패 시 검색 결과를 비우고 error를 표시한다.

### `handleSearch`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 검색어와 scope로 장소 검색 수행.
- 주요 입력값/파라미터: 없음.
- 반환값: Promise<void>.
- 내부에서 호출하는 주요 함수: `searchPlaces`, state setters.
- 사용되는 위치: `PlaceSearchPanel.handleSubmit`.
- 주의사항 또는 개선 포인트: disabled 또는 빈 검색어면 무시한다.

### `handleSubmit`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 장소 검색 form submit 처리.
- 주요 입력값/파라미터: submit `event`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `event.preventDefault`, `handleSearch`.
- 사용되는 위치: `PlaceSearchPanel` form.
- 주의사항 또는 개선 포인트: 없음.

### `PhotoRecordList`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 저장 사진 목록 렌더링.
- 주요 입력값/파라미터: `activeRecordId`, `emptyMessage`, `onSelectRecord`, `records`, `t`.
- 반환값: list panel JSX.
- 내부에서 호출하는 주요 함수: `records.map`, `PhotoPreview`, `onSelectRecord`.
- 사용되는 위치: `MapExplorePanel`.
- 주의사항 또는 개선 포인트: 목록 thumbnail은 전체 보기 버튼으로 감싸지 않는다.

### `PhotoCollectionPanel`
- 파일 경로: `src/modules/Map.jsx`
- 역할: collection 생성/수정 form과 collection 목록 렌더링.
- 주요 입력값/파라미터: collection draft/handlers/collections/t.
- 반환값: collection panel JSX.
- 내부에서 호출하는 주요 함수: `collections.map`, handler props.
- 사용되는 위치: `MapCollectionManagerPanel`.
- 주의사항 또는 개선 포인트: 실제 저장/삭제 로직은 `Map` 상위 핸들러가 담당한다.

### `PhotoCollectionSelect`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 사진 record에 연결할 collection select 렌더링.
- 주요 입력값/파라미터: `collections`, `onChange`, `t`, `value`.
- 반환값: select label JSX.
- 내부에서 호출하는 주요 함수: `collections.map`, `onChange`.
- 사용되는 위치: `PhotoDraftPanel`, `PhotoEditPanel`, bulk upload panel.
- 주의사항 또는 개선 포인트: 빈 값은 `null`로 변환한다.

### `BulkUploadList`
- 파일 경로: `src/modules/Map.jsx`
- 역할: bulk upload 항목 목록 렌더링과 선택 checkbox 제공.
- 주요 입력값/파라미터: `items`, `selectedIds`, `onToggleTarget`, `t`.
- 반환값: list JSX.
- 내부에서 호출하는 주요 함수: `getBulkItemStatusLabel`, `PhotoPreview`.
- 사용되는 위치: `BulkUploadPanel`.
- 주의사항 또는 개선 포인트: failed 항목은 선택 대상에서 제외된다(UI 조건 기준).

### `BulkUploadPanel`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 대량 업로드 분석 결과, 위치 부여, 저장 UI 렌더링.
- 주요 입력값/파라미터: bulk 상태, 선택 ids, collection, 각종 handler, `t`.
- 반환값: bulk panel JSX.
- 내부에서 호출하는 주요 함수: `createBulkUploadSummary`, `getBulkMissingLocationItems`, `getBulkLocationAssignableItems`, `getBulkPhotoSaveCandidates`, `BulkUploadList`, `PlaceSearchPanel`.
- 사용되는 위치: `MapUploadPanel`.
- 주의사항 또는 개선 포인트: 위치 없는 사진 후처리는 상위 `Map` state와 연결된다.

### `PhotoDraftPanel`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 새 사진 draft 편집/저장 UI.
- 주요 입력값/파라미터: `collections`, `draft`, `isSaving`, `language`, draft handlers, `t`.
- 반환값: draft panel JSX.
- 내부에서 호출하는 주요 함수: `PhotoPreviewButton`, `PhotoCollectionSelect`, `PlaceSearchPanel`, `isPhotoDraftReadyToSave`.
- 사용되는 위치: `MapUploadPanel`.
- 주의사항 또는 개선 포인트: 위치가 없으면 저장 버튼이 비활성화된다.

### `PhotoEditPanel`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 기존 사진 record 편집 UI.
- 주요 입력값/파라미터: `collections`, `editDraft`, `isUpdating`, `language`, handlers, `record`, `t`.
- 반환값: edit panel JSX.
- 내부에서 호출하는 주요 함수: `PhotoPreviewButton`, `PhotoCollectionSelect`, `PlaceSearchPanel`, `isEditDraftReadyToSave`.
- 사용되는 위치: Map detail column.
- 주의사항 또는 개선 포인트: 수정 중 지도 클릭/검색으로 좌표를 바꿀 수 있다.

### `PhotoRecordDetail`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 선택된 사진 record 상세 표시와 수정/삭제 진입.
- 주요 입력값/파라미터: `collections`, `filterSummary`, `onDeleteRecord`, `onOpenPhoto`, `onStartEdit`, `record`, `t`.
- 반환값: detail panel JSX.
- 내부에서 호출하는 주요 함수: `PhotoPreviewButton`, `getCollectionName`, `getLocationSourceLabel`.
- 사용되는 위치: Map detail column.
- 주의사항 또는 개선 포인트: 선택 record가 없으면 안내 empty state를 보여준다.

### `MapModeTabs`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 탐색/사진 업로드/컬렉션 관리 탭 렌더링.
- 주요 입력값/파라미터: `activeMode`, `onChangeMode`, `t`.
- 반환값: tabs JSX.
- 내부에서 호출하는 주요 함수: mode 배열 `map`, `onChangeMode`.
- 사용되는 위치: `Map`.
- 주의사항 또는 개선 포인트: mode 변경 시 상위 state가 각 패널 표시를 결정한다.

### `MobileMapViewTabs`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 모바일 탐색 화면의 지도/목록/상세 view 전환.
- 주요 입력값/파라미터: `activeView`, `onChangeView`, `t`.
- 반환값: mobile tabs JSX.
- 내부에서 호출하는 주요 함수: view 배열 `map`, `onChangeView`.
- 사용되는 위치: `Map`.
- 주의사항 또는 개선 포인트: PC 3패널 구조에는 영향을 주지 않도록 CSS/data attribute와 함께 사용된다.

### `MobileMapPreviewCard`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 모바일 지도 view에서 선택 record 간단 preview 표시.
- 주요 입력값/파라미터: `collections`, `onOpenDetail`, `record`, `t`.
- 반환값: preview button/card JSX 또는 `null`.
- 내부에서 호출하는 주요 함수: `getCollectionName`, `onOpenDetail`.
- 사용되는 위치: Map view panel 하단.
- 주의사항 또는 개선 포인트: record가 없으면 렌더링하지 않는다.

### `MobileMapEmptyCard`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 모바일 지도 view에서 표시할 사진이 없을 때 목록 이동 안내.
- 주요 입력값/파라미터: `onOpenList`, `t`.
- 반환값: empty card JSX.
- 내부에서 호출하는 주요 함수: `onOpenList`.
- 사용되는 위치: Map view panel 하단.
- 주의사항 또는 개선 포인트: 필터 결과가 없을 때 사용된다.

### `MapExplorePanel`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 탐색 모드의 collection filter, 검색/위치 filter, 기록 목록 렌더링.
- 주요 입력값/파라미터: `activeRecordId`, `collections`, `filteredRecords`, filters, setters, `t`.
- 반환값: explore panel JSX.
- 내부에서 호출하는 주요 함수: `handleResetFilters`, `PhotoRecordList`, filter setters.
- 사용되는 위치: `Map`.
- 주의사항 또는 개선 포인트: 모바일에서는 목록 view일 때 중심 panel로 쓰인다.

### `handleResetFilters`
- 파일 경로: `src/modules/Map.jsx`
- 함수명: `handleResetFilters`
- 역할: Map 탐색 목록의 컬렉션/위치 출처/검색어 필터를 기본값으로 되돌린다.
- 주요 파라미터: 없음.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `onSetCollectionFilter`, `onSetLocationSourceFilter`, `onSetSearchQuery`.
- 사용 위치: `MapExplorePanel`의 필터 초기화 버튼.
- 주의사항: 필터 state는 상위 `Map`에서 전달된 setter로 변경되므로 저장 데이터나 IndexedDB 구조에는 영향을 주지 않는다.

### `MapUploadPanel`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 사진 단건/대량 업로드 UI, draft panel, bulk panel 연결.
- 주요 입력값/파라미터: draft/bulk 상태, collection, upload handlers, refs, `t`.
- 반환값: upload panel JSX.
- 내부에서 호출하는 주요 함수: `PhotoDraftPanel`, `BulkUploadPanel`.
- 사용되는 위치: `Map`.
- 주의사항 또는 개선 포인트: 실제 파일 분석과 저장은 상위 `Map` 핸들러에서 수행한다.

### `MapCollectionManagerPanel`
- 파일 경로: `src/modules/Map.jsx`
- 역할: collection 관리 모드 wrapper.
- 주요 입력값/파라미터: collection draft/state/handlers/t.
- 반환값: collection manager JSX.
- 내부에서 호출하는 주요 함수: `PhotoCollectionPanel`.
- 사용되는 위치: `Map`.
- 주의사항 또는 개선 포인트: 구조상 현재는 단순 래퍼다.

### `Map`
- 파일 경로: `src/modules/Map.jsx`
- 역할: Map 모듈 전체 상태, IndexedDB 기록/컬렉션 로드, 사진 분석/저장/편집/삭제, 지도 이동, 모바일 view state 관리.
- 주요 입력값/파라미터: `t`.
- 반환값: Map JSX.
- 내부에서 호출하는 주요 함수: React hooks, repository/service/logic 함수들, 아래 내부 핸들러 전체.
- 사용되는 위치: `App`.
- 주의사항 또는 개선 포인트: 단일 컴포넌트 책임이 커서 upload/explore/detail 상태를 hook이나 하위 container로 분리 가능하다.

### `getCollectionRecordCount`
- 파일 경로: `src/modules/Map.jsx`
- 함수명: `getCollectionRecordCount`
- 역할: 특정 컬렉션에 연결된 사진 record 개수를 계산한다.
- 주요 파라미터: `collectionId`.
- 반환값: 숫자.
- 내부에서 호출하는 주요 함수: `normalizedRecords.filter`.
- 사용 위치: `MapCollectionManagerPanel`에서 각 컬렉션의 연결 사진 수를 표시할 때 전달된다.
- 주의사항: `normalizedRecords` 기준이므로 삭제되었거나 존재하지 않는 컬렉션 id는 상위 정규화 결과의 영향을 받는다.

### `handleKeyDown`
- 파일 경로: `src/modules/Map.jsx`
- 함수명: `handleKeyDown`
- 역할: 사진 전체 보기 모달에서 `Escape` 키로 모달을 닫는다.
- 주요 파라미터: keyboard `event`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `setPhotoViewer`.
- 사용 위치: `photoViewer`가 열렸을 때 등록되는 `window` keydown listener.
- 주의사항: effect cleanup에서 listener와 `tenvi-modal-open` body class를 함께 정리한다.

### `resetBulkUpload`
- 파일 경로: `src/modules/Map.jsx`
- 역할: bulk upload 관련 state 초기화.
- 주요 입력값/파라미터: 없음.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: state setters.
- 사용되는 위치: upload toggle, edit 시작, bulk 결과 정리.
- 주의사항 또는 개선 포인트: cancel ref도 함께 초기화한다.

### `analyzeBulkPhotoFiles`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 여러 사진 파일의 EXIF/preview 분석 수행.
- 주요 입력값/파라미터: `files`.
- 반환값: Promise<void>.
- 내부에서 호출하는 주요 함수: `createBulkUploadId`, `readPhotoLocation`, `createPreviewImageBlob`, `createBulkPhotoAnalysisItem`, `setBulkUpload`.
- 사용되는 위치: `handlePhotoChange`.
- 주의사항 또는 개선 포인트: 취소 flag를 보며 순차 처리한다.

### `handlePhotoChange`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 파일 input 변경 시 단건/대량 업로드 흐름 분기.
- 주요 입력값/파라미터: file input change `event`.
- 반환값: Promise<void>.
- 내부에서 호출하는 주요 함수: `analyzeBulkPhotoFiles`, `readPhotoLocation`, `createPreviewImageBlob`, `createPhotoDraft`, `createViewportRequest`.
- 사용되는 위치: 숨김 file input `onChange`.
- 주의사항 또는 개선 포인트: input value를 비워 같은 파일 재선택 가능하게 한다.

### `handlePickLocation`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 지도 클릭 좌표를 edit/draft/bulk 선택 대상에 적용.
- 주요 입력값/파라미터: `{ lat, lng }`.
- 반환값: 없음 또는 Promise 흐름 호출.
- 내부에서 호출하는 주요 함수: `applyBulkLocationToSelection`, `applyManualLocationToDraft`, `createViewportRequest`.
- 사용되는 위치: `ManualLocationPicker`.
- 주의사항 또는 개선 포인트: 현재 모드와 draft/edit/bulk 상태에 따라 동작이 달라진다.

### `handleSelectPlace`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 장소 검색 결과를 draft/edit 좌표로 적용.
- 주요 입력값/파라미터: `place`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `applySearchLocationToDraft`, `createViewportRequest`.
- 사용되는 위치: `PlaceSearchPanel`.
- 주의사항 또는 개선 포인트: edit 상태가 우선된다.

### `handleChangeDraft`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 새 사진 draft patch 반영.
- 주요 입력값/파라미터: `patch`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `setDraft`.
- 사용되는 위치: `PhotoDraftPanel`.
- 주의사항 또는 개선 포인트: shallow merge다.

### `handleChangeEditDraft`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 편집 draft patch 반영.
- 주요 입력값/파라미터: `patch`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `setEditDraft`.
- 사용되는 위치: `PhotoEditPanel`.
- 주의사항 또는 개선 포인트: shallow merge다.

### `handleChangeCollectionDraft`
- 파일 경로: `src/modules/Map.jsx`
- 역할: collection draft patch 반영.
- 주요 입력값/파라미터: `patch`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `setCollectionDraft`.
- 사용되는 위치: `PhotoCollectionPanel`.
- 주의사항 또는 개선 포인트: shallow merge다.

### `resetCollectionDraft`
- 파일 경로: `src/modules/Map.jsx`
- 역할: collection form 상태 초기화.
- 주요 입력값/파라미터: 없음.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: state setters.
- 사용되는 위치: collection 취소/삭제/저장 후.
- 주의사항 또는 개선 포인트: form도 닫는다.

### `handleStartCollectionEdit`
- 파일 경로: `src/modules/Map.jsx`
- 역할: collection 편집 모드 시작.
- 주요 입력값/파라미터: `collection`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: state setters.
- 사용되는 위치: collection 수정 버튼.
- 주의사항 또는 개선 포인트: 기존 collection 값을 draft로 복사한다.

### `handleSaveCollection`
- 파일 경로: `src/modules/Map.jsx`
- 역할: collection 생성 또는 수정 저장.
- 주요 입력값/파라미터: 없음.
- 반환값: Promise<void>.
- 내부에서 호출하는 주요 함수: `normalizePhotoCollectionInput`, `isPhotoCollectionInputValid`, `updatePhotoCollection`, `createPhotoCollection`, state setters.
- 사용되는 위치: collection 저장 버튼.
- 주의사항 또는 개선 포인트: 이름이 없으면 저장하지 않는다.

### `handleDeleteCollection`
- 파일 경로: `src/modules/Map.jsx`
- 역할: collection 삭제와 연결 record 미분류 반영.
- 주요 입력값/파라미터: `collection`.
- 반환값: Promise<void>.
- 내부에서 호출하는 주요 함수: `window.confirm`, `deletePhotoCollection`, `setCollections`, `setRecords`, `resetCollectionDraft`.
- 사용되는 위치: collection 삭제 버튼.
- 주의사항 또는 개선 포인트: 사진은 삭제하지 않고 collectionId만 null로 이동한다.

### `handleSaveDraft`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 새 사진 record 저장.
- 주요 입력값/파라미터: 없음.
- 반환값: Promise<void>.
- 내부에서 호출하는 주요 함수: `createPhotoRecordInput`, `createPhotoRecord`, `createViewportRequest`.
- 사용되는 위치: `PhotoDraftPanel`.
- 주의사항 또는 개선 포인트: 위치가 없으면 error message를 띄운다.

### `handleCancelBulkAnalysis`
- 파일 경로: `src/modules/Map.jsx`
- 역할: bulk 분석 취소 flag 설정.
- 주요 입력값/파라미터: 없음.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `bulkCancelRef.current = true`.
- 사용되는 위치: bulk 분석 취소 버튼.
- 주의사항 또는 개선 포인트: 이미 처리 중인 현재 파일은 끝난 뒤 취소가 반영될 수 있다.

### `handleChangeBulkCollection`
- 파일 경로: `src/modules/Map.jsx`
- 역할: bulk 저장 대상 collection 변경.
- 주요 입력값/파라미터: `collectionId`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `setBulkUpload`.
- 사용되는 위치: bulk collection select.
- 주의사항 또는 개선 포인트: saveResult를 초기화한다.

### `handleToggleBulkLocationTarget`
- 파일 경로: `src/modules/Map.jsx`
- 역할: bulk 위치 적용 대상 선택 토글.
- 주요 입력값/파라미터: `itemId`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `toggleBulkMissingLocationSelection`, `setSelectedMissingLocationItemIds`.
- 사용되는 위치: `BulkUploadList`.
- 주의사항 또는 개선 포인트: 함수 이름은 missing target이지만 현재 선택 전체 대상에도 쓰인다.

### `handleSelectAllBulkLocationTargets`
- 파일 경로: `src/modules/Map.jsx`
- 역할: bulk 위치 적용 가능한 항목 전체 선택.
- 주요 입력값/파라미터: 없음.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `selectAllBulkLocationAssignableItems`, `setSelectedMissingLocationItemIds`.
- 사용되는 위치: bulk 전체 선택 버튼.
- 주의사항 또는 개선 포인트: EXIF가 있는 항목도 선택 대상에 포함될 수 있다.

### `handleClearMissingLocationSelection`
- 파일 경로: `src/modules/Map.jsx`
- 역할: bulk 위치 대상 선택 해제.
- 주요 입력값/파라미터: 없음.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `clearBulkMissingLocationSelection`, `setSelectedMissingLocationItemIds`.
- 사용되는 위치: bulk 선택 해제 버튼.
- 주의사항 또는 개선 포인트: 없음.

### `applyBulkLocationToSelection`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 선택된 bulk 항목들에 같은 위치 적용.
- 주요 입력값/파라미터: `location`.
- 반환값: Promise<void>.
- 내부에서 호출하는 주요 함수: `createPreviewImageBlob`, `applyLocationToBulkItems`, `clearBulkMissingLocationSelection`, state setters.
- 사용되는 위치: `handlePickLocation`, `handleSelectBulkPlace`.
- 주의사항 또는 개선 포인트: preview 생성 실패 항목은 failed로 바꾼다.

### `handleSelectBulkPlace`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 장소 검색 결과를 bulk 선택 항목 위치로 적용.
- 주요 입력값/파라미터: `place`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `applyBulkLocationToSelection`, `createViewportRequest`.
- 사용되는 위치: bulk `PlaceSearchPanel`.
- 주의사항 또는 개선 포인트: 비동기 함수 호출을 await하지 않는다.

### `handleSaveBulkLocatedPhotos`
- 파일 경로: `src/modules/Map.jsx`
- 역할: bulk 저장 후보들을 IndexedDB에 저장하고 결과 반영.
- 주요 입력값/파라미터: 없음.
- 반환값: Promise<void>.
- 내부에서 호출하는 주요 함수: `createBulkPhotoRecordInputs`, `createPhotoRecords`, `createBulkPhotoSaveResult`, `getPhotoRecords`, `clearBulkMissingLocationSelection`, `createViewportRequest`.
- 사용되는 위치: bulk 저장 버튼.
- 주의사항 또는 개선 포인트: 일부 실패가 있어도 성공 record는 저장된다.

### `handleStartEdit`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 선택 record 편집 시작.
- 주요 입력값/파라미터: 없음.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `resetBulkUpload`, `createEditDraft`, `createViewportRequest`.
- 사용되는 위치: detail 편집 버튼.
- 주의사항 또는 개선 포인트: 새 사진 추가 상태를 취소한다.

### `handleCancelEdit`
- 파일 경로: `src/modules/Map.jsx`
- 역할: record 편집 취소.
- 주요 입력값/파라미터: 없음.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `setEditDraft`, `setStatusMessage`.
- 사용되는 위치: edit 취소 버튼.
- 주의사항 또는 개선 포인트: 변경 내용은 저장되지 않는다.

### `handleSaveEdit`
- 파일 경로: `src/modules/Map.jsx`
- 역할: record 수정 사항 저장.
- 주요 입력값/파라미터: 없음.
- 반환값: Promise<void>.
- 내부에서 호출하는 주요 함수: `createPhotoRecordUpdatePatch`, `updatePhotoRecord`, `createViewportRequest`.
- 사용되는 위치: edit 저장 버튼.
- 주의사항 또는 개선 포인트: 위치가 유효하지 않으면 저장하지 않는다.

### `handleSelectRecord`
- 파일 경로: `src/modules/Map.jsx`
- 역할: active record 변경과 지도 이동 요청 생성.
- 주요 입력값/파라미터: `recordId`, `requestType`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `normalizedRecords.find`, `createViewportRequest`.
- 사용되는 위치: 목록/marker 선택 흐름.
- 주의사항 또는 개선 포인트: draft/edit/add 상태를 닫는다.

### `handleSelectMarker`
- 파일 경로: `src/modules/Map.jsx`
- 역할: marker 클릭 선택을 record 선택으로 위임.
- 주요 입력값/파라미터: `recordId`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `handleSelectRecord`.
- 사용되는 위치: `PhotoRecordMarker`.
- 주의사항 또는 개선 포인트: requestType을 `marker-select`로 고정한다.

### `handleChangeMobileMapView`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 모바일 map view state 변경.
- 주요 입력값/파라미터: `nextView`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: state setters.
- 사용되는 위치: 모바일 view tabs, preview/empty card.
- 주의사항 또는 개선 포인트: 사용자 상호작용 flag를 true로 바꿔 자동 list 전환을 막는다.

### `handleSelectRecordFromList`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 목록에서 record 선택 후 모바일 상세 view로 이동.
- 주요 입력값/파라미터: `recordId`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `handleSelectRecord`, `handleChangeMobileMapView`.
- 사용되는 위치: `MapExplorePanel`.
- 주의사항 또는 개선 포인트: PC에서도 호출되지만 CSS/view state 영향은 모바일 중심이다.

### `handleShowActiveRecordOnMap`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 현재 선택 record를 지도 view에서 다시 포커스.
- 주요 입력값/파라미터: 없음.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `handleChangeMobileMapView`, `createViewportRequest`.
- 사용되는 위치: 상세 view의 지도 보기 흐름.
- 주의사항 또는 개선 포인트: activeRecord가 없으면 view만 map으로 바꾼다.

### `handleSelectMobileMapView`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 모바일 view tab 선택 처리.
- 주요 입력값/파라미터: `nextView`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `handleShowActiveRecordOnMap`, `handleChangeMobileMapView`.
- 사용되는 위치: `MobileMapViewTabs`.
- 주의사항 또는 개선 포인트: activeRecord가 있는 상태에서 map view 선택 시 지도 포커스를 함께 수행한다.

### `handleDeleteRecord`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 사진 record 삭제와 state 반영.
- 주요 입력값/파라미터: `recordId`.
- 반환값: Promise<void>.
- 내부에서 호출하는 주요 함수: `window.confirm`, `deletePhotoRecord`, state setters, `createViewportRequest`.
- 사용되는 위치: detail 삭제 버튼.
- 주의사항 또는 개선 포인트: active record 삭제 시 모바일 view를 list로 돌린다.

### `handleToggleAddPhoto`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 사진 추가 상태 토글 또는 파일 선택창 열기.
- 주요 입력값/파라미터: 없음.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `photoInputRef.current?.click`, state setters.
- 사용되는 위치: upload 모드 사진 추가 버튼.
- 주의사항 또는 개선 포인트: 추가 중이면 draft를 버리고 닫는다.

### `handleFitAllMarkers`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 모든 marker가 보이도록 지도 이동 요청.
- 주요 입력값/파라미터: 없음.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `createViewportRequest`.
- 사용되는 위치: 전체 위치 보기 버튼.
- 주의사항 또는 개선 포인트: 요청 type은 강제 fit-all이다.

## `src/modules/mapLogic.js`

### `isValidCoordinate`
- 파일 경로: `src/modules/mapLogic.js`
- 역할: 좌표 숫자 유효성 검증.
- 주요 입력값/파라미터: `value`.
- 반환값: boolean.
- 내부에서 호출하는 주요 함수: `Number.isFinite`.
- 사용되는 위치: map logic 내부.
- 주의사항 또는 개선 포인트: 문자열 숫자는 false다. 외부 함수에서 `Number(...)` 후 넘기는 경우가 많다.

### `normalizeLocationSource`
- 파일 경로: `src/modules/mapLogic.js`
- 역할: 저장용 location source 보정.
- 주요 입력값/파라미터: `source`.
- 반환값: `exif|manual|search`.
- 내부에서 호출하는 주요 함수: `Array.includes`.
- 사용되는 위치: draft/record 생성, edit patch, label 계산.
- 주의사항 또는 개선 포인트: unknown은 manual로 fallback한다.

### `normalizePhotoRecordCollectionId`
- 파일 경로: `src/modules/mapLogic.js`
- 역할: record collectionId 유효성 보정.
- 주요 입력값/파라미터: `record`, `collections`.
- 반환값: collection id 또는 `null`.
- 내부에서 호출하는 주요 함수: `Array.some`.
- 사용되는 위치: `Map` normalized records.
- 주의사항 또는 개선 포인트: collections가 있으면 존재 여부까지 확인한다.

### `normalizePhotoCollectionInput`
- 파일 경로: `src/modules/mapLogic.js`
- 역할: collection 입력값 trim/string 보정.
- 주요 입력값/파라미터: `input`.
- 반환값: `{ name, description, startDate, endDate }`.
- 내부에서 호출하는 주요 함수: `String`, `String.trim`.
- 사용되는 위치: `isPhotoCollectionInputValid`, `Map.handleSaveCollection`.
- 주의사항 또는 개선 포인트: 날짜 형식 검증은 하지 않는다.

### `isPhotoCollectionInputValid`
- 파일 경로: `src/modules/mapLogic.js`
- 역할: collection 생성/수정 가능 여부 확인.
- 주요 입력값/파라미터: `input`.
- 반환값: boolean.
- 내부에서 호출하는 주요 함수: `normalizePhotoCollectionInput`, `Boolean`.
- 사용되는 위치: `Map.handleSaveCollection`.
- 주의사항 또는 개선 포인트: 이름만 필수다.

### `filterPhotoRecordsByCollection`
- 파일 경로: `src/modules/mapLogic.js`
- 역할: collection filter 기준 사진 record 필터링.
- 주요 입력값/파라미터: `records`, `collections`, `selectedFilter`.
- 반환값: record 배열.
- 내부에서 호출하는 주요 함수: `Set`, `Array.map`, `Array.filter`.
- 사용되는 위치: `Map`.
- 주의사항 또는 개선 포인트: 미분류 필터는 존재하지 않는 collectionId도 포함한다.

### `normalizeSearchText`
- 파일 경로: `src/modules/mapLogic.js`
- 역할: 검색 비교용 문자열 보정.
- 주요 입력값/파라미터: `value`.
- 반환값: lowercase trimmed string.
- 내부에서 호출하는 주요 함수: `String`, `String.trim`, `String.toLowerCase`.
- 사용되는 위치: `filterPhotoRecordsBySearchAndLocation`.
- 주의사항 또는 개선 포인트: 비공개 helper.

### `normalizeLocationSourceForFilter`
- 파일 경로: `src/modules/mapLogic.js`
- 역할: 필터용 location source 보정.
- 주요 입력값/파라미터: `source`.
- 반환값: `exif|manual|search|unknown`.
- 내부에서 호출하는 주요 함수: `Array.includes`.
- 사용되는 위치: `filterPhotoRecordsBySearchAndLocation`.
- 주의사항 또는 개선 포인트: 저장용 normalize와 fallback 정책이 다르다.

### `filterPhotoRecordsBySearchAndLocation`
- 파일 경로: `src/modules/mapLogic.js`
- 역할: 텍스트 검색과 위치 source 필터 적용.
- 주요 입력값/파라미터: `records`, `{ searchQuery, locationSourceFilter }`.
- 반환값: record 배열.
- 내부에서 호출하는 주요 함수: `normalizeSearchText`, `normalizeLocationSourceForFilter`, `Array.filter`, `Array.some`.
- 사용되는 위치: `Map`.
- 주의사항 또는 개선 포인트: title/memo/originalFileName만 검색한다.

### `formatExifDate`
- 파일 경로: `src/modules/mapLogic.js`
- 역할: EXIF 날짜 값을 표시 문자열로 변환.
- 주요 입력값/파라미터: `value`.
- 반환값: 문자열.
- 내부에서 호출하는 주요 함수: `Date.getTime`, `Date.toLocaleString`, `String`.
- 사용되는 위치: `normalizePhotoLocation`.
- 주의사항 또는 개선 포인트: locale은 브라우저 기본값이다.

### `normalizePhotoLocation`
- 파일 경로: `src/modules/mapLogic.js`
- 역할: EXIF metadata에서 위치/촬영일 상태 객체 생성.
- 주요 입력값/파라미터: `fileName`, `metadata`.
- 반환값: located 또는 missing-location location 객체.
- 내부에서 호출하는 주요 함수: `Number`, `DATE_CANDIDATE_KEYS.find`, `formatExifDate`, `isValidCoordinate`, `normalizeLocationSource`.
- 사용되는 위치: `readPhotoLocation`.
- 주의사항 또는 개선 포인트: GPS 좌표가 없으면 missing-location이다.

### `createManualLocation`
- 파일 경로: `src/modules/mapLogic.js`
- 역할: 지도 클릭 좌표로 수동 위치 객체 생성.
- 주요 입력값/파라미터: `previousLocation`, `latitude`, `longitude`.
- 반환값: 새 location 객체 또는 이전 location.
- 내부에서 호출하는 주요 함수: `Number`, `isValidCoordinate`, `normalizeLocationSource`.
- 사용되는 위치: `applyManualLocationToDraft`.
- 주의사항 또는 개선 포인트: 좌표가 유효하지 않으면 이전 값을 그대로 반환한다.

### `createPhotoDraft`
- 파일 경로: `src/modules/mapLogic.js`
- 역할: 선택된 파일/location/preview로 저장 전 draft 생성.
- 주요 입력값/파라미터: `file`, `location`, `previewImage`.
- 반환값: draft 객체.
- 내부에서 호출하는 주요 함수: `String.replace`.
- 사용되는 위치: `Map.handlePhotoChange`.
- 주의사항 또는 개선 포인트: previewImage blob이 있다고 가정한다.

### `applySearchLocationToDraft`
- 파일 경로: `src/modules/mapLogic.js`
- 역할: 장소 검색 좌표를 draft에 적용.
- 주요 입력값/파라미터: `draft`, `place`.
- 반환값: draft 또는 원본 draft.
- 내부에서 호출하는 주요 함수: `Number`, `isValidCoordinate`.
- 사용되는 위치: `Map.handleSelectPlace`.
- 주의사항 또는 개선 포인트: draft가 없거나 좌표가 없으면 변경하지 않는다.

### `applyManualLocationToDraft`
- 파일 경로: `src/modules/mapLogic.js`
- 역할: 지도 클릭 좌표를 draft에 적용.
- 주요 입력값/파라미터: `draft`, `latitude`, `longitude`.
- 반환값: draft 또는 원본 draft.
- 내부에서 호출하는 주요 함수: `createManualLocation`.
- 사용되는 위치: `Map.handlePickLocation`.
- 주의사항 또는 개선 포인트: draft 없는 상태에서는 변경하지 않는다.

### `isPhotoDraftReadyToSave`
- 파일 경로: `src/modules/mapLogic.js`
- 역할: 새 사진 draft 저장 가능 여부 검증.
- 주요 입력값/파라미터: `draft`.
- 반환값: boolean.
- 내부에서 호출하는 주요 함수: `Boolean`, `Number`, `isValidCoordinate`.
- 사용되는 위치: `PhotoDraftPanel`, `createPhotoRecordInput`.
- 주의사항 또는 개선 포인트: 제목 유효성은 저장 input 생성에서 fallback 처리한다.

### `createEditDraft`
- 파일 경로: `src/modules/mapLogic.js`
- 역할: 저장 record를 edit draft로 변환.
- 주요 입력값/파라미터: `record`.
- 반환값: edit draft 또는 `null`.
- 내부에서 호출하는 주요 함수: `Number`, `normalizeLocationSource`.
- 사용되는 위치: `Map.handleStartEdit`.
- 주의사항 또는 개선 포인트: preview blob은 edit draft에 포함하지 않는다.

### `isEditDraftReadyToSave`
- 파일 경로: `src/modules/mapLogic.js`
- 역할: edit draft 저장 가능 여부 검증.
- 주요 입력값/파라미터: `editDraft`.
- 반환값: boolean.
- 내부에서 호출하는 주요 함수: `Boolean`, `Number`, `isValidCoordinate`.
- 사용되는 위치: `PhotoEditPanel`, `createPhotoRecordUpdatePatch`.
- 주의사항 또는 개선 포인트: id가 필수다.

### `createPhotoRecordUpdatePatch`
- 파일 경로: `src/modules/mapLogic.js`
- 역할: edit draft를 repository update patch로 변환.
- 주요 입력값/파라미터: `editDraft`.
- 반환값: patch 객체 또는 `null`.
- 내부에서 호출하는 주요 함수: `isEditDraftReadyToSave`, `normalizeLocationSource`, `String.trim`.
- 사용되는 위치: `Map.handleSaveEdit`.
- 주의사항 또는 개선 포인트: 빈 제목은 original file name으로 fallback한다.

### `createPhotoRecordInput`
- 파일 경로: `src/modules/mapLogic.js`
- 역할: 새 사진 draft를 repository create input으로 변환.
- 주요 입력값/파라미터: `draft`.
- 반환값: record input 또는 `null`.
- 내부에서 호출하는 주요 함수: `isPhotoDraftReadyToSave`, `normalizeLocationSource`, `String.trim`.
- 사용되는 위치: `Map.handleSaveDraft`.
- 주의사항 또는 개선 포인트: IndexedDB record schema와 직접 맞물린다.

### `readPhotoLocation`
- 파일 경로: `src/modules/mapLogic.js`
- 역할: 파일에서 GPS/EXIF 날짜 metadata 읽기.
- 주요 입력값/파라미터: `file`.
- 반환값: Promise<location 객체>.
- 내부에서 호출하는 주요 함수: `exifr.gps`, `exifr.parse`, `normalizePhotoLocation`.
- 사용되는 위치: `Map.handlePhotoChange`, `analyzeBulkPhotoFiles`.
- 주의사항 또는 개선 포인트: EXIF 읽기 실패는 missing-location 흐름으로 이어질 수 있다.

## `src/modules/bulkPhotoUploadLogic.js`

### `isValidCoordinate`
- 파일 경로: `src/modules/bulkPhotoUploadLogic.js`
- 역할: bulk 저장 후보 좌표 검증.
- 주요 입력값/파라미터: `value`.
- 반환값: boolean.
- 내부에서 호출하는 주요 함수: `Number`, `Number.isFinite`.
- 사용되는 위치: `getBulkPhotoSaveCandidates`.
- 주의사항 또는 개선 포인트: 문자열 숫자도 허용한다.

### `normalizeBulkUploadItemStatus`
- 파일 경로: `src/modules/bulkPhotoUploadLogic.js`
- 역할: bulk item status 보정.
- 주요 입력값/파라미터: `status`.
- 반환값: `located|missing-location|failed`.
- 내부에서 호출하는 주요 함수: `Array.includes`.
- 사용되는 위치: bulk logic 전반.
- 주의사항 또는 개선 포인트: 알 수 없는 값은 failed.

### `createBulkPhotoAnalysisItem`
- 파일 경로: `src/modules/bulkPhotoUploadLogic.js`
- 역할: 파일 분석 결과를 bulk item으로 정규화.
- 주요 입력값/파라미터: `{ errorMessage, file, fileType, fileName, id, location, previewImage, status }`.
- 반환값: bulk item 객체.
- 내부에서 호출하는 주요 함수: `normalizeBulkUploadItemStatus`, `String.replace`.
- 사용되는 위치: `Map.analyzeBulkPhotoFiles`.
- 주의사항 또는 개선 포인트: originalStatus와 현재 status를 둘 다 보존한다.

### `getBulkMissingLocationItems`
- 파일 경로: `src/modules/bulkPhotoUploadLogic.js`
- 역할: 원래 위치정보가 없고 실패하지 않은 항목 필터링.
- 주요 입력값/파라미터: `items`.
- 반환값: bulk item 배열.
- 내부에서 호출하는 주요 함수: `Array.filter`.
- 사용되는 위치: `BulkUploadPanel`.
- 주의사항 또는 개선 포인트: 위치를 나중에 부여해도 originalStatus 기준으로 포함될 수 있다.

### `getBulkLocationAssignableItems`
- 파일 경로: `src/modules/bulkPhotoUploadLogic.js`
- 역할: 위치 일괄 적용 가능한 항목 필터링.
- 주요 입력값/파라미터: `items`.
- 반환값: failed가 아닌 item 배열.
- 내부에서 호출하는 주요 함수: `Array.filter`.
- 사용되는 위치: `BulkUploadPanel`, `selectAllBulkLocationAssignableItems`.
- 주의사항 또는 개선 포인트: 이미 EXIF 위치가 있는 항목도 포함한다.

### `toggleBulkMissingLocationSelection`
- 파일 경로: `src/modules/bulkPhotoUploadLogic.js`
- 역할: bulk item 선택 id 토글.
- 주요 입력값/파라미터: `selectedIds`, `itemId`.
- 반환값: 새 id 배열.
- 내부에서 호출하는 주요 함수: `Array.includes`, `Array.filter`.
- 사용되는 위치: `Map.handleToggleBulkLocationTarget`.
- 주의사항 또는 개선 포인트: 이름은 missing location 기준이지만 범용 선택 토글로 쓰인다.

### `selectAllBulkMissingLocationItems`
- 파일 경로: `src/modules/bulkPhotoUploadLogic.js`
- 역할: 위치 없는 항목 id 전체 선택.
- 주요 입력값/파라미터: `items`.
- 반환값: id 배열.
- 내부에서 호출하는 주요 함수: `getBulkMissingLocationItems`, `Array.map`.
- 사용되는 위치: 현재 직접 사용처 없음(이전 UI 또는 테스트).
- 주의사항 또는 개선 포인트: 현재 코드에서는 `selectAllBulkLocationAssignableItems`를 주로 사용한다.

### `selectAllBulkLocationAssignableItems`
- 파일 경로: `src/modules/bulkPhotoUploadLogic.js`
- 역할: 위치 적용 가능한 항목 id 전체 선택.
- 주요 입력값/파라미터: `items`.
- 반환값: id 배열.
- 내부에서 호출하는 주요 함수: `getBulkLocationAssignableItems`, `Array.map`.
- 사용되는 위치: `Map.handleSelectAllBulkLocationTargets`.
- 주의사항 또는 개선 포인트: failed만 제외한다.

### `clearBulkMissingLocationSelection`
- 파일 경로: `src/modules/bulkPhotoUploadLogic.js`
- 역할: bulk 선택 id 초기화.
- 주요 입력값/파라미터: 없음.
- 반환값: 빈 배열.
- 내부에서 호출하는 주요 함수: 없음.
- 사용되는 위치: Map bulk handlers.
- 주의사항 또는 개선 포인트: 새 배열을 반환한다.

### `applyLocationToBulkItems`
- 파일 경로: `src/modules/bulkPhotoUploadLogic.js`
- 역할: 선택된 bulk item들에 위치/출처 적용.
- 주요 입력값/파라미터: `items`, `selectedIds`, `location`.
- 반환값: 새 bulk item 배열.
- 내부에서 호출하는 주요 함수: `Set`, `Number`, `Array.map`.
- 사용되는 위치: `Map.applyBulkLocationToSelection`.
- 주의사항 또는 개선 포인트: locationSource는 search 외에는 manual로 보정한다.

### `createBulkUploadSummary`
- 파일 경로: `src/modules/bulkPhotoUploadLogic.js`
- 역할: bulk item status별 개수 집계.
- 주요 입력값/파라미터: `items`.
- 반환값: `{ total, located, missingLocation, failed }`.
- 내부에서 호출하는 주요 함수: `normalizeBulkUploadItemStatus`, `Array.reduce`.
- 사용되는 위치: `BulkUploadPanel`.
- 주의사항 또는 개선 포인트: unknown status는 failed로 집계된다.

### `getBulkPhotoSaveCandidates`
- 파일 경로: `src/modules/bulkPhotoUploadLogic.js`
- 역할: 저장 가능한 located bulk item 필터링.
- 주요 입력값/파라미터: `items`.
- 반환값: bulk item 배열.
- 내부에서 호출하는 주요 함수: `isValidCoordinate`, `Array.filter`, `Boolean`.
- 사용되는 위치: `BulkUploadPanel`, `createBulkPhotoRecordInput`, `createBulkPhotoRecordInputs`.
- 주의사항 또는 개선 포인트: preview blob 필수.

### `createBulkPhotoRecordInput`
- 파일 경로: `src/modules/bulkPhotoUploadLogic.js`
- 역할: bulk item을 photo record input으로 변환.
- 주요 입력값/파라미터: `item`, `collectionId`.
- 반환값: record input 또는 `null`.
- 내부에서 호출하는 주요 함수: `getBulkPhotoSaveCandidates`.
- 사용되는 위치: `createBulkPhotoRecordInputs`.
- 주의사항 또는 개선 포인트: item 하나를 배열로 감싸 저장 가능 여부를 재검증한다.

### `createBulkPhotoRecordInputs`
- 파일 경로: `src/modules/bulkPhotoUploadLogic.js`
- 역할: bulk item 배열을 저장 input 배열로 변환.
- 주요 입력값/파라미터: `items`, `collectionId`.
- 반환값: record input 배열.
- 내부에서 호출하는 주요 함수: `getBulkPhotoSaveCandidates`, `createBulkPhotoRecordInput`, `Array.map`, `Array.filter`.
- 사용되는 위치: `Map.handleSaveBulkLocatedPhotos`.
- 주의사항 또는 개선 포인트: 저장 순서는 후보 배열 순서를 따른다.

### `createBulkPhotoSaveResult`
- 파일 경로: `src/modules/bulkPhotoUploadLogic.js`
- 역할: bulk 저장 결과를 성공/실패 요약으로 변환.
- 주요 입력값/파라미터: `results`.
- 반환값: `{ successCount, failedCount, savedRecords, failedItems }`.
- 내부에서 호출하는 주요 함수: `Array.filter`, `Array.map`.
- 사용되는 위치: `Map.handleSaveBulkLocatedPhotos`.
- 주의사항 또는 개선 포인트: repository 결과 status 문자열에 의존한다.

## `src/services/photoArchiveRepository.js`

### `createRecordId`
- 파일 경로: `src/services/photoArchiveRepository.js`
- 역할: 사진 record id 생성.
- 주요 입력값/파라미터: 없음.
- 반환값: 문자열 id.
- 내부에서 호출하는 주요 함수: `crypto.randomUUID`, `Date.now`, `Math.random`.
- 사용되는 위치: `createPhotoRecord`.
- 주의사항 또는 개선 포인트: crypto 미지원 fallback은 충돌 가능성이 낮지만 0은 아니다.

### `openPhotoArchiveDatabase`
- 파일 경로: `src/services/photoArchiveRepository.js`
- 역할: IndexedDB database 열기와 object store/index 준비.
- 주요 입력값/파라미터: 없음.
- 반환값: Promise<IDBDatabase>.
- 내부에서 호출하는 주요 함수: `indexedDB.open`, `createObjectStore`, `createIndex`.
- 사용되는 위치: photo archive/collection repositories.
- 주의사항 또는 개선 포인트: DB 이름/version/store 이름 변경은 기존 데이터와 직결된다.

### `runStoreTransaction`
- 파일 경로: `src/services/photoArchiveRepository.js`
- 역할: photoRecords store transaction Promise wrapper.
- 주요 입력값/파라미터: `mode`, `action`.
- 반환값: Promise<request result>.
- 내부에서 호출하는 주요 함수: `openPhotoArchiveDatabase`, IndexedDB transaction APIs.
- 사용되는 위치: photo record CRUD.
- 주의사항 또는 개선 포인트: `action`은 IDBRequest를 반환해야 한다.

### `normalizePhotoRecord`
- 파일 경로: `src/services/photoArchiveRepository.js`
- 역할: record의 collectionId를 null/string으로 보정.
- 주요 입력값/파라미터: `record`.
- 반환값: record 객체.
- 내부에서 호출하는 주요 함수: `String.trim`.
- 사용되는 위치: `getPhotoRecords`, `replacePhotoArchiveData`.
- 주의사항 또는 개선 포인트: 다른 필드 검증은 하지 않는다.

### `getPhotoRecords`
- 파일 경로: `src/services/photoArchiveRepository.js`
- 역할: 사진 records 최신순 조회.
- 주요 입력값/파라미터: 없음.
- 반환값: Promise<record 배열>.
- 내부에서 호출하는 주요 함수: `runStoreTransaction`, `normalizePhotoRecord`, `Array.sort`.
- 사용되는 위치: Map, Settings, Dashboard summary service.
- 주의사항 또는 개선 포인트: createdAt 문자열 정렬에 의존한다.

### `getPhotoRecordCount`
- 파일 경로: `src/services/photoArchiveRepository.js`
- 역할: photoRecords store 개수 조회.
- 주요 입력값/파라미터: 없음.
- 반환값: Promise<number>.
- 내부에서 호출하는 주요 함수: `runStoreTransaction`.
- 사용되는 위치: Settings.
- 주의사항 또는 개선 포인트: 없음.

### `createPhotoRecord`
- 파일 경로: `src/services/photoArchiveRepository.js`
- 역할: 새 사진 record 생성/저장.
- 주요 입력값/파라미터: `recordInput`.
- 반환값: Promise<record>.
- 내부에서 호출하는 주요 함수: `createRecordId`, `runStoreTransaction`.
- 사용되는 위치: Map 단건 저장, bulk `createPhotoRecords`.
- 주의사항 또는 개선 포인트: 입력 schema 검증은 상위 logic에서 수행한다.

### `createPhotoRecords`
- 파일 경로: `src/services/photoArchiveRepository.js`
- 역할: 여러 record input 순차 저장과 성공/실패 결과 수집.
- 주요 입력값/파라미터: `recordInputs`.
- 반환값: Promise<result 배열>.
- 내부에서 호출하는 주요 함수: `createPhotoRecord`.
- 사용되는 위치: Map bulk 저장.
- 주의사항 또는 개선 포인트: 하나 실패해도 다음 항목 저장을 계속한다.

### `updatePhotoRecord`
- 파일 경로: `src/services/photoArchiveRepository.js`
- 역할: 기존 사진 record patch 저장.
- 주요 입력값/파라미터: `id`, `patch`.
- 반환값: Promise<updated record 또는 null>.
- 내부에서 호출하는 주요 함수: `runStoreTransaction`.
- 사용되는 위치: Map 편집 저장.
- 주의사항 또는 개선 포인트: patch가 덮어쓰는 필드 검증은 상위에서 한다.

### `deletePhotoRecord`
- 파일 경로: `src/services/photoArchiveRepository.js`
- 역할: 사진 record 삭제.
- 주요 입력값/파라미터: `id`.
- 반환값: Promise<id>.
- 내부에서 호출하는 주요 함수: `runStoreTransaction`.
- 사용되는 위치: Map record 삭제.
- 주의사항 또는 개선 포인트: 삭제 대상이 없어도 id를 반환한다.

### `replacePhotoArchiveData`
- 파일 경로: `src/services/photoArchiveRepository.js`
- 역할: 백업 복원용 records 및 선택적으로 collections 전체 교체.
- 주요 입력값/파라미터: `{ records, collections }`.
- 반환값: Promise<{ records, collections }>.
- 내부에서 호출하는 주요 함수: `openPhotoArchiveDatabase`, `normalizePhotoRecord`, IndexedDB `clear/add`.
- 사용되는 위치: Settings restore/rollback.
- 주의사항 또는 개선 포인트: 기존 store를 clear하므로 복원 확인/rollback 흐름이 중요하다.

### `replacePhotoRecords`
- 파일 경로: `src/services/photoArchiveRepository.js`
- 역할: records만 전체 교체.
- 주요 입력값/파라미터: `records`.
- 반환값: Promise.
- 내부에서 호출하는 주요 함수: `replacePhotoArchiveData`.
- 사용되는 위치: Settings restore.
- 주의사항 또는 개선 포인트: collections는 유지한다.

## `src/services/photoCollectionRepository.js`

### `createCollectionId`
- 파일 경로: `src/services/photoCollectionRepository.js`
- 역할: collection id 생성.
- 주요 입력값/파라미터: 없음.
- 반환값: 문자열 id.
- 내부에서 호출하는 주요 함수: `crypto.randomUUID`, `Date.now`, `Math.random`.
- 사용되는 위치: `createPhotoCollection`.
- 주의사항 또는 개선 포인트: fallback 충돌 가능성은 낮지만 존재한다.

### `normalizeCollection`
- 파일 경로: `src/services/photoCollectionRepository.js`
- 역할: collection record 필드 문자열/날짜 fallback 보정.
- 주요 입력값/파라미터: `collection`.
- 반환값: collection 객체.
- 내부에서 호출하는 주요 함수: `String`, `String.trim`, `Date.toISOString`.
- 사용되는 위치: collection CRUD.
- 주의사항 또는 개선 포인트: date 필드 형식 검증은 하지 않는다.

### `runCollectionTransaction`
- 파일 경로: `src/services/photoCollectionRepository.js`
- 역할: photoCollections store transaction Promise wrapper.
- 주요 입력값/파라미터: `mode`, `action`.
- 반환값: Promise<request result>.
- 내부에서 호출하는 주요 함수: `openPhotoArchiveDatabase`, IndexedDB transaction APIs.
- 사용되는 위치: collection CRUD.
- 주의사항 또는 개선 포인트: `action`은 IDBRequest를 반환해야 한다.

### `getPhotoCollections`
- 파일 경로: `src/services/photoCollectionRepository.js`
- 역할: collections 최신순 조회.
- 주요 입력값/파라미터: 없음.
- 반환값: Promise<collection 배열>.
- 내부에서 호출하는 주요 함수: `runCollectionTransaction`, `normalizeCollection`, `Array.sort`.
- 사용되는 위치: Map, Settings, Dashboard summary.
- 주의사항 또는 개선 포인트: createdAt 문자열 정렬에 의존한다.

### `createPhotoCollection`
- 파일 경로: `src/services/photoCollectionRepository.js`
- 역할: collection 생성/저장.
- 주요 입력값/파라미터: `collectionInput`.
- 반환값: Promise<collection>.
- 내부에서 호출하는 주요 함수: `createCollectionId`, `normalizeCollection`, `runCollectionTransaction`.
- 사용되는 위치: Map collection 저장.
- 주의사항 또는 개선 포인트: 이름 검증은 상위 logic에서 수행한다.

### `updatePhotoCollection`
- 파일 경로: `src/services/photoCollectionRepository.js`
- 역할: collection patch 저장.
- 주요 입력값/파라미터: `id`, `patch`.
- 반환값: Promise<collection 또는 null>.
- 내부에서 호출하는 주요 함수: `runCollectionTransaction`, `normalizeCollection`.
- 사용되는 위치: Map collection 수정.
- 주의사항 또는 개선 포인트: 없는 id면 null.

### `deletePhotoCollection`
- 파일 경로: `src/services/photoCollectionRepository.js`
- 역할: collection 삭제와 연결 record의 collectionId 해제.
- 주요 입력값/파라미터: `collectionId`.
- 반환값: Promise<{ affectedRecordCount, collectionId }>.
- 내부에서 호출하는 주요 함수: `openPhotoArchiveDatabase`, IndexedDB transaction APIs.
- 사용되는 위치: Map collection 삭제.
- 주의사항 또는 개선 포인트: 사진 record는 삭제하지 않는다.

## `src/services/photoArchiveBackupService.js`

### `isPlainObject`
- 파일 경로: `src/services/photoArchiveBackupService.js`
- 역할: 백업 record가 일반 객체인지 검증.
- 주요 입력값/파라미터: `value`.
- 반환값: boolean.
- 내부에서 호출하는 주요 함수: `Array.isArray`.
- 사용되는 위치: backup validation.
- 주의사항 또는 개선 포인트: prototype까지 엄격히 보지는 않는다.

### `isFiniteCoordinate`
- 파일 경로: `src/services/photoArchiveBackupService.js`
- 역할: 좌표값 finite 검증.
- 주요 입력값/파라미터: `value`.
- 반환값: boolean.
- 내부에서 호출하는 주요 함수: `Number`, `Number.isFinite`.
- 사용되는 위치: `validateMapBackupRecordShape`.
- 주의사항 또는 개선 포인트: 문자열 숫자도 허용한다.

### `normalizeLocationSource`
- 파일 경로: `src/services/photoArchiveBackupService.js`
- 역할: 백업/복원용 location source 보정.
- 주요 입력값/파라미터: `source`.
- 반환값: `exif|manual|search`.
- 내부에서 호출하는 주요 함수: `Array.includes`.
- 사용되는 위치: serialize/validate functions.
- 주의사항 또는 개선 포인트: unknown은 manual.

### `normalizeCollectionId`
- 파일 경로: `src/services/photoArchiveBackupService.js`
- 역할: 백업 record collectionId 복원 가능 여부 보정.
- 주요 입력값/파라미터: `collectionId`, `collections`.
- 반환값: collection id 또는 `null`.
- 내부에서 호출하는 주요 함수: `Array.some`.
- 사용되는 위치: `validateMapBackupRecordShape`.
- 주의사항 또는 개선 포인트: `collections === null`이면 무조건 null.

### `blobToDataUrl`
- 파일 경로: `src/services/photoArchiveBackupService.js`
- 역할: Blob을 data URL 문자열로 변환.
- 주요 입력값/파라미터: `blob`.
- 반환값: Promise<string>.
- 내부에서 호출하는 주요 함수: `FileReader.readAsDataURL`.
- 사용되는 위치: `serializePhotoRecordsForBackup`.
- 주의사항 또는 개선 포인트: 큰 이미지가 많으면 JSON 백업 용량이 커진다.

### `dataUrlToBlob`
- 파일 경로: `src/services/photoArchiveBackupService.js`
- 역할: data URL을 Blob으로 복원.
- 주요 입력값/파라미터: `dataUrl`.
- 반환값: Promise<Blob>.
- 내부에서 호출하는 주요 함수: `fetch`, `response.blob`.
- 사용되는 위치: `preparePhotoRecordsForRestore`.
- 주의사항 또는 개선 포인트: `data:image/`만 허용한다.

### `serializePhotoRecordsForBackup`
- 파일 경로: `src/services/photoArchiveBackupService.js`
- 역할: 사진 records를 JSON 백업 가능한 구조로 직렬화.
- 주요 입력값/파라미터: `records`.
- 반환값: Promise<backup record 배열>.
- 내부에서 호출하는 주요 함수: `Promise.all`, `Array.map`, `blobToDataUrl`, `normalizeLocationSource`.
- 사용되는 위치: `Settings.handleExportBackup`.
- 주의사항 또는 개선 포인트: Blob 변환 실패 시 전체 export가 실패한다.

### `validateMapBackupRecordShape`
- 파일 경로: `src/services/photoArchiveBackupService.js`
- 역할: Map backup record 구조 검증/정규화.
- 주요 입력값/파라미터: `record`, `collections`.
- 반환값: 정규화 record 또는 `null`.
- 내부에서 호출하는 주요 함수: `isPlainObject`, `isFiniteCoordinate`, `normalizeCollectionId`, `normalizeLocationSource`.
- 사용되는 위치: `preparePhotoRecordsForRestore`.
- 주의사항 또는 개선 포인트: 이미지 data URL 자체의 Blob 복원 가능성은 별도 단계에서 확인한다.

### `validateMapCollectionBackupRecordShape`
- 파일 경로: `src/services/photoArchiveBackupService.js`
- 역할: Map collection backup record 구조 검증/정규화.
- 주요 입력값/파라미터: `collection`.
- 반환값: collection 객체 또는 `null`.
- 내부에서 호출하는 주요 함수: `isPlainObject`, `String`, `String.trim`.
- 사용되는 위치: `serializePhotoCollectionsForBackup`, `preparePhotoCollectionsForRestore`.
- 주의사항 또는 개선 포인트: collection name은 필수다.

### `serializePhotoCollectionsForBackup`
- 파일 경로: `src/services/photoArchiveBackupService.js`
- 역할: collections를 백업 가능한 배열로 직렬화.
- 주요 입력값/파라미터: `collections`.
- 반환값: collection 배열.
- 내부에서 호출하는 주요 함수: `Array.map`, `validateMapCollectionBackupRecordShape`, `Array.filter`.
- 사용되는 위치: `Settings.handleExportBackup`.
- 주의사항 또는 개선 포인트: 유효하지 않은 collection은 백업에서 제외된다.

### `preparePhotoCollectionsForRestore`
- 파일 경로: `src/services/photoArchiveBackupService.js`
- 역할: 백업 collections 복원 계획 생성.
- 주요 입력값/파라미터: `backupCollections`.
- 반환값: `{ totalCount, validCount, damagedCount, restoredCollections }`.
- 내부에서 호출하는 주요 함수: `Array.isArray`, `Array.forEach`, `validateMapCollectionBackupRecordShape`.
- 사용되는 위치: `Settings.handleRestoreBackup`.
- 주의사항 또는 개선 포인트: 손상 항목 수를 사용자 확인에 활용한다.

### `preparePhotoRecordsForRestore`
- 파일 경로: `src/services/photoArchiveBackupService.js`
- 역할: 백업 records 검증, preview image Blob 복원, 복원 계획 생성.
- 주요 입력값/파라미터: `backupRecords`, `collections`.
- 반환값: Promise<{ totalCount, validCount, damagedCount, restoredRecords }>.
- 내부에서 호출하는 주요 함수: `Array.isArray`, `validateMapBackupRecordShape`, `dataUrlToBlob`.
- 사용되는 위치: `Settings.handleRestoreBackup`.
- 주의사항 또는 개선 포인트: 하나의 record Blob 복원 실패는 damagedCount로 처리하고 계속 진행한다.

## `src/services/photoArchiveSummaryService.js`

### `getTimestamp`
- 파일 경로: `src/services/photoArchiveSummaryService.js`
- 역할: 정렬용 timestamp 생성.
- 주요 입력값/파라미터: `value`.
- 반환값: 숫자.
- 내부에서 호출하는 주요 함수: `Date`, `Number.isNaN`.
- 사용되는 위치: `createMapArchiveSummary`.
- 주의사항 또는 개선 포인트: 잘못된 날짜는 0.

### `getSummaryLocationSource`
- 파일 경로: `src/services/photoArchiveSummaryService.js`
- 역할: 요약용 location source 보정.
- 주요 입력값/파라미터: `source`.
- 반환값: `exif|manual|search|unknown`.
- 내부에서 호출하는 주요 함수: `Array.includes`.
- 사용되는 위치: `createMapArchiveSummary`.
- 주의사항 또는 개선 포인트: Map logic에도 유사 helper가 있다.

### `createEmptyLocationSourceCounts`
- 파일 경로: `src/services/photoArchiveSummaryService.js`
- 역할: location source count 초기 객체 생성.
- 주요 입력값/파라미터: 없음.
- 반환값: `{ exif, manual, search, unknown }`.
- 내부에서 호출하는 주요 함수: 없음.
- 사용되는 위치: `createMapArchiveSummary`.
- 주의사항 또는 개선 포인트: source 종류 추가 시 함께 갱신 필요.

### `createMapArchiveSummary`
- 파일 경로: `src/services/photoArchiveSummaryService.js`
- 역할: records/collections로 Dashboard Map 요약 생성.
- 주요 입력값/파라미터: `records`, `collections`.
- 반환값: `{ totalPhotoRecords, totalCollections, recentPhotoRecords, representativeCollection, locationSourceCounts }`.
- 내부에서 호출하는 주요 함수: `Map`, `getSummaryLocationSource`, `getTimestamp`, `Array.forEach`, `Array.sort`, `Array.map`, `Array.reduce`.
- 사용되는 위치: `getMapArchiveSummary`, Dashboard.
- 주의사항 또는 개선 포인트: 대표 collection은 사진 수 우선, 동률이면 updatedAt 최신 우선.

### `getMapArchiveSummary`
- 파일 경로: `src/services/photoArchiveSummaryService.js`
- 역할: IndexedDB에서 records/collections를 읽어 summary 생성.
- 주요 입력값/파라미터: 없음.
- 반환값: Promise<summary>.
- 내부에서 호출하는 주요 함수: `Promise.all`, `getPhotoRecords`, `getPhotoCollections`, `createMapArchiveSummary`.
- 사용되는 위치: Dashboard.
- 주의사항 또는 개선 포인트: IndexedDB 로드 실패는 호출자가 처리한다.

## `src/services/placeSearchService.js`

### `wait`
- 파일 경로: `src/services/placeSearchService.js`
- 역할: 지정 시간만큼 지연.
- 주요 입력값/파라미터: `milliseconds`.
- 반환값: Promise<void>.
- 내부에서 호출하는 주요 함수: `setTimeout`.
- 사용되는 위치: `searchPlaces`.
- 주의사항 또는 개선 포인트: Nominatim rate limit 대응용.

### `getCacheKey`
- 파일 경로: `src/services/placeSearchService.js`
- 역할: 장소 검색 cache key 생성.
- 주요 입력값/파라미터: `query`, `language`, `countryCode`.
- 반환값: 문자열.
- 내부에서 호출하는 주요 함수: `String.trim`, `String.toLowerCase`.
- 사용되는 위치: `searchPlaces`.
- 주의사항 또는 개선 포인트: scope는 countryCode로 반영된다.

### `getCountryCodeForSearchScope`
- 파일 경로: `src/services/placeSearchService.js`
- 역할: UI 검색 scope를 Nominatim country code로 변환.
- 주요 입력값/파라미터: `scope`.
- 반환값: country code 문자열 또는 빈 문자열.
- 내부에서 호출하는 주요 함수: 없음.
- 사용되는 위치: `searchPlaces`.
- 주의사항 또는 개선 포인트: `PLACE_SEARCH_SCOPES`와 UI option 동기화 필요.

### `createAddressSummary`
- 파일 경로: `src/services/placeSearchService.js`
- 역할: Nominatim address 객체에서 짧은 주소 요약 생성.
- 주요 입력값/파라미터: `address`.
- 반환값: 문자열.
- 내부에서 호출하는 주요 함수: `Array.filter`, `Array.join`.
- 사용되는 위치: `normalizePlaceSearchResult`.
- 주의사항 또는 개선 포인트: address 필드 구조는 provider 응답에 의존한다.

### `normalizePlaceSearchResult`
- 파일 경로: `src/services/placeSearchService.js`
- 역할: Nominatim raw result를 앱 내부 장소 모델로 변환.
- 주요 입력값/파라미터: `result`.
- 반환값: place 객체 또는 `null`.
- 내부에서 호출하는 주요 함수: `Number`, `String`, `createAddressSummary`.
- 사용되는 위치: `searchPlaces`.
- 주의사항 또는 개선 포인트: 좌표와 display name이 없으면 제외한다.

### `clearPlaceSearchCache`
- 파일 경로: `src/services/placeSearchService.js`
- 역할: 장소 검색 메모리 cache와 rate-limit timestamp 초기화.
- 주요 입력값/파라미터: 없음.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `cache.clear`.
- 사용되는 위치: tests 또는 디버그 용도
- 주의사항 또는 개선 포인트: 런타임 UI에서는 직접 호출하지 않는다.

### `searchPlaces`
- 파일 경로: `src/services/placeSearchService.js`
- 역할: Nominatim 장소 검색, cache, rate limit, 결과 정규화.
- 주요 입력값/파라미터: `query`, `{ fetcher, language, scope }`.
- 반환값: Promise<place 배열>.
- 내부에서 호출하는 주요 함수: `getCountryCodeForSearchScope`, `getCacheKey`, `wait`, `URLSearchParams`, `fetcher`, `normalizePlaceSearchResult`.
- 사용되는 위치: `PlaceSearchPanel`.
- 주의사항 또는 개선 포인트: 외부 무료 서비스 정책과 요청 간격을 지켜야 한다.

## `src/utils/imageUtils.js`

### `calculatePreviewSize`
- 파일 경로: `src/utils/imageUtils.js`
- 역할: 원본 이미지 비율을 유지하며 최대 크기 이하 preview 크기 계산.
- 주요 입력값/파라미터: `width`, `height`, `maxSize`.
- 반환값: `{ width, height }`.
- 내부에서 호출하는 주요 함수: `Math.min`, `Math.max`, `Math.round`.
- 사용되는 위치: `createPreviewImageBlob`.
- 주의사항 또는 개선 포인트: 0 이하 크기는 `{0,0}`.

### `loadImageFromFile`
- 파일 경로: `src/utils/imageUtils.js`
- 역할: File을 object URL로 이미지 객체에 로드.
- 주요 입력값/파라미터: `file`.
- 반환값: Promise<HTMLImageElement>.
- 내부에서 호출하는 주요 함수: `URL.createObjectURL`, `URL.revokeObjectURL`, `Image`.
- 사용되는 위치: `createPreviewImageBlob`.
- 주의사항 또는 개선 포인트: load/error 모두 object URL을 revoke한다.

### `canvasToBlob`
- 파일 경로: `src/utils/imageUtils.js`
- 역할: canvas 내용을 Blob으로 변환.
- 주요 입력값/파라미터: `canvas`, `mimeType`, `quality`.
- 반환값: Promise<Blob>.
- 내부에서 호출하는 주요 함수: `canvas.toBlob`.
- 사용되는 위치: `createPreviewImageBlob`.
- 주의사항 또는 개선 포인트: toBlob 실패 시 reject한다.

### `createPreviewImageBlob`
- 파일 경로: `src/utils/imageUtils.js`
- 역할: 사진 파일을 IndexedDB 저장용 축소 preview Blob으로 변환.
- 주요 입력값/파라미터: `file`, `{ maxSize, mimeType, quality }`.
- 반환값: Promise<{ blob, width, height, mimeType }>.
- 내부에서 호출하는 주요 함수: `loadImageFromFile`, `calculatePreviewSize`, `document.createElement`, `canvas.getContext`, `context.drawImage`, `canvasToBlob`.
- 사용되는 위치: Map 단건/대량 업로드, bulk 위치 후처리.
- 주의사항 또는 개선 포인트: canvas context null 방어가 없다.

## `src/services/photoCollectionRepository.js`, `src/services/photoArchiveRepository.js` 공통 주의
- IndexedDB schema 이름과 version은 기존 사용자 데이터와 직접 연결된다.
- backup restore 함수들은 전체 교체가 가능하므로 Settings의 사용자 확인/rollback 흐름과 함께 유지해야 한다.

## `src/i18n/translations.js`

### 동적 번역 함수들
- 파일 경로: `src/i18n/translations.js`
- 역할: 숫자/이름/상태에 따라 달라지는 UI 문구 생성.
- 주요 입력값/파라미터: 각 key별 `count`, `moduleName`, `source`, `month`, `date`, `index`, `minutes`, `total`, `valid`, `damaged`, `success`, `failed`, `processed`.
- 반환값: 문자열.
- 내부에서 호출하는 주요 함수: 일부 영어 `monthValue`는 `Date.toLocaleString` 호출.
- 사용되는 위치: App/modules/components 전반의 `t.*` 호출.
- 주의사항 또는 개선 포인트: ko/en 양쪽 key 구조가 일치해야 하며 `translations.test.js`가 일부 key 누락을 방어한다.

동적 함수 key:
- `ko.command.scheduleCount`, `ko.command.openModuleMessage`
- `ko.dashboard.mapBriefing`, `ko.dashboard.mapLocationSourceValue`, `ko.dashboard.collectionPhotoCount`
- `ko.calendar.monthValue`, `ko.calendar.eventCount`
- `ko.map.filteredRecordCount`, `ko.map.deleteCollectionConfirm`, `ko.map.bulkAnalyzingProgress`, `ko.map.bulkSaveLocated`, `ko.map.bulkSaveComplete`, `ko.map.bulkMoreItems`, `ko.map.bulkSelectedCount`, `ko.map.bulkLastAssignedLocation`, `ko.map.bulkAssignedPhotoCount`
- `ko.tasks.dueDateValue`
- `ko.timer.lapLabel`, `ko.timer.minuteValue`
- `ko.settings.restoreMapReplaceConfirm`, `ko.settings.restoreDamagedMapConfirm`, `ko.settings.restoreDamagedMapCollectionsConfirm`, `ko.settings.restoreCompleteWithMap`, `ko.settings.restoreCompleteWithDamagedMap`, `ko.settings.restoreDamagedMapCollectionsSkipped`
- `en.command.scheduleCount`, `en.command.openModuleMessage`
- `en.dashboard.mapBriefing`, `en.dashboard.mapLocationSourceValue`, `en.dashboard.collectionPhotoCount`
- `en.calendar.monthValue`, `en.calendar.eventCount`
- `en.map.filteredRecordCount`, `en.map.deleteCollectionConfirm`, `en.map.bulkAnalyzingProgress`, `en.map.bulkSaveLocated`, `en.map.bulkSaveComplete`, `en.map.bulkMoreItems`, `en.map.bulkSelectedCount`, `en.map.bulkLastAssignedLocation`, `en.map.bulkAssignedPhotoCount`
- `en.tasks.dueDateValue`
- `en.timer.lapLabel`, `en.timer.minuteValue`
- `en.settings.restoreMapReplaceConfirm`, `en.settings.restoreDamagedMapConfirm`, `en.settings.restoreDamagedMapCollectionsConfirm`, `en.settings.restoreCompleteWithMap`, `en.settings.restoreCompleteWithDamagedMap`, `en.settings.restoreDamagedMapCollectionsSkipped`

### `isSupportedLanguage`
- 파일 경로: `src/i18n/translations.js`
- 역할: 언어 코드가 translations에 존재하는지 검증.
- 주요 입력값/파라미터: `language`.
- 반환값: boolean.
- 내부에서 호출하는 주요 함수: `Object.prototype.hasOwnProperty.call`.
- 사용되는 위치: `App`.
- 주의사항 또는 개선 포인트: 언어 추가 시 translations object와 함께 자동 반영된다.
