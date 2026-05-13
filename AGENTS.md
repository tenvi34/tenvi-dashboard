# TENVI Project Rules

## Project Identity

- This project is TENVI, a personal AI dashboard.
- TENVI is built with React + Vite.
- Keep the existing TENVI HUD design tone: dark, cybernetic, module-based, readable, and restrained.

## Architecture

- Manage features as dashboard modules.
- Current modules include:
  - Dashboard
  - Command
  - Tasks
  - Notes
  - Timer
  - Settings
- Prefer module-level changes over placing unrelated feature logic in `App.jsx`.
- Keep the layout easy to extend with additional modules later.
- Module navigation currently uses React state, not React Router.
- Shared app settings are managed in `App.jsx` and passed into modules through props.

## Dependencies

- Do not add external libraries by default.
- If an external library seems necessary, explain the following first:
  - Why it is needed
  - Benefits
  - Benefits compared with direct implementation
  - Downsides or maintenance cost
  - Alternatives
- Add the library only after explicit approval.

## Existing Behavior

- Do not break existing localStorage data.
- Existing localStorage keys must not be renamed or repurposed.
- Do not break existing Tasks behavior:
  - Add task
  - Complete task
  - Delete task
  - Filter tasks
  - Persist tasks in localStorage
- Do not break existing Notes behavior:
  - Add note
  - Delete note
  - Persist notes in localStorage
- Do not break existing Command Console behavior:
  - Analyze stored Tasks and Notes data
  - Execute supported rule-based commands
  - Keep recent command history unique in the current session
- Do not break existing Settings behavior:
  - Change language
  - Choose default start module
  - Choose HUD effect strength
  - Reset Tasks and Notes data only after explicit confirmation
- Do not break existing Timer behavior:
  - Focus and Break mode timer
  - Start, pause, and reset controls
  - Completed session count persisted in localStorage
- Preserve existing module navigation behavior unless the requested task explicitly changes it.
- Preserve the `translations` structure when adding UI text.
- Avoid touching Tasks or Notes copy unless the task explicitly asks for it.

## Commenting Guidelines

- 새 코드를 작성하거나 기존 핵심 로직을 수정할 때는 유지보수에 필요한 한글 주석을 함께 추가한다.
- 모든 줄에 주석을 달지 않는다. 나중에 혼자 코드를 다시 읽을 때 이해 비용이 큰 핵심 로직 위주로만 간결하게 작성한다.
- 주석은 단순히 "무엇을 하는지"를 반복하지 말고, "왜 필요한지", "주의할 점", "기존 데이터나 동작과 어떤 관계가 있는지"를 설명한다.
- 특히 다음 영역에는 주석을 우선적으로 고려한다:
  - localStorage key와 저장/복원 흐름
  - `App.jsx`의 전역 상태 관리
  - `activeModule` 기반 모듈 전환 흐름
  - Command Console 명령 분석 및 결과 생성 로직
  - Timer의 interval과 `useEffect` 처리
  - Settings의 설정 저장, 데이터 개수 표시, 초기화 로직
  - `translations` 객체 구조와 언어 key 유지 규칙
- 단순 JSX, 명확한 UI 마크업, 변수명만으로 의미가 분명한 코드에는 불필요한 주석을 달지 않는다.
- localStorage 키 보존, 기존 사용자 데이터, 모듈 간 공유 상태처럼 기존 동작을 깨뜨릴 위험이 있는 부분은 해당 상수나 상태 변경 로직 가까이에 주석을 둔다.

## Workflow

- Before modifying files, present a modification plan first.
- Before running commands, tell the user what command will be run and why.
- After completing work, summarize:
  - Changed files
  - Key changes
  - How to verify
