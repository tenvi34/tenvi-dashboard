# TENVI Project Rules

## Project Identity

- This project is TENVI, a personal AI dashboard.
- TENVI is built with React + Vite.
- Keep the existing TENVI HUD design tone: dark, cybernetic, module-based, readable, and restrained.

## Architecture

- Manage features as dashboard modules.
- Current and planned modules include:
  - Dashboard
  - Tasks
  - Notes
  - Timer
  - Settings
- Prefer module-level changes over placing unrelated feature logic in `App.jsx`.
- Keep the layout easy to extend with additional modules later.

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
- Do not break existing Tasks behavior:
  - Add task
  - Complete task
  - Delete task
  - Filter tasks
  - Persist tasks in localStorage
- Preserve existing module navigation behavior unless the requested task explicitly changes it.

## Workflow

- Before modifying files, present a modification plan first.
- Before running commands, tell the user what command will be run and why.
- After completing work, summarize:
  - Changed files
  - Key changes
  - How to verify

