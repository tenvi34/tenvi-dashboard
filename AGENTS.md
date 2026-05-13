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

- When writing new code or modifying existing core logic, add concise Korean comments where they are useful for maintenance.
- Do not comment every line. Focus on core logic that would be expensive to understand later when reading the code alone.
- Comments should not merely repeat what the code does. Explain why the logic is needed, what to be careful about, or how it relates to existing data and behavior.
- Prioritize comments in these areas:
  - localStorage keys and save/restore flows
  - Global state management in `App.jsx`
  - Module switching based on `activeModule`
  - Command Console command analysis and result generation
  - Timer intervals and `useEffect` handling
  - Settings save flows, data count display, and reset logic
  - The `translations` object structure and language key consistency rules
- Do not add unnecessary comments to simple JSX, obvious UI markup, or code whose meaning is clear from variable names.
- Place comments close to constants or state update logic when the code could risk breaking existing behavior, such as localStorage key preservation, existing user data, or shared state across modules.

## Workflow

- Before modifying files, present a modification plan first.
- Before running commands, tell the user what command will be run and why.
- After completing work, summarize:
  - Changed files
  - Key changes
  - How to verify
