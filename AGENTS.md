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
- Do not integrate paid, billable, or payment-account-based external APIs for the current project scope.
  - Do not add Google Places, Google Maps Platform, or similar billable providers.
  - If a new external service is needed, explain its free usage terms and limits first, then wait for explicit approval.

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
- Write Korean comments in a concise noun-phrase style when possible.
  - Prefer: `// URL로 바꾸는 이미지 컴포넌트`
  - Avoid: `// URL로 바꾸는 이미지 컴포넌트입니다.`
  - Prefer: `// IndexedDB 초기화와 저장소 준비`
  - Avoid: `// IndexedDB를 초기화하고 저장소를 준비합니다.`
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

## File Exploration Scope

- When the user names a module, component, feature, or file, inspect that target first.
- Do not scan the entire repository by default.
- Read only files directly related to the requested change unless broader inspection is necessary to avoid breaking behavior.
- Before inspecting unrelated modules or shared application files, explain why they are needed.
- For small UI changes, inspect only the target component and its directly related style files first.
- For bug fixes, inspect the reported module first, then expand only to shared state, persistence logic, or shared utilities that directly affect the issue.
- Do not inspect unrelated modules merely to understand the entire application.
- Avoid generated, dependency, and output directories such as:
  - `node_modules`
  - `dist`
  - `build`
  - `.git`
  - coverage output

## Module Routing

- When a task concerns one module, start with that module's implementation file before checking `App.jsx` or unrelated modules.
- Inspect `App.jsx` first only when the task concerns:
  - module navigation
  - global app settings
  - props shared across modules
  - initial module selection
- Inspect translation-related code only when UI text, language settings, or translated labels change.
- Inspect persistence-related logic only when stored data, reset behavior, or existing localStorage-backed behavior may be affected.
- For styling-only requests, inspect the requested module and directly connected style files first.

## Environment and Sensitive Files

- Do not expose, copy, print, or modify secret values from `.env` files unless explicitly requested for a specific safe change.
- Prefer `.env.example` or documented variable names when configuration guidance is needed.
- Do not place API keys, tokens, secrets, or private configuration values directly in source files.
- When new environment variables are necessary, use placeholder values in `.env.example`.

## Validation Commands

- Use only scripts already defined in `package.json`.
- Do not install dependencies or change package manager files without explicit approval.
- Keep verification proportional to the requested change.
- For narrowly scoped visual changes, avoid broad validation commands unless needed for compilation or import safety.
- For changes affecting shared application state, translations, module integration, localStorage behavior, or configuration, run the appropriate existing validation command.

## Workflow

- For medium or large changes, briefly present a modification plan before editing.
- For small, clearly scoped changes in a named file or module, proceed directly within that scope.
- Before running commands that install dependencies, alter configuration, delete files, reset stored data, or perform broad validation, explain the command and why it is required.
- Routine read-only inspection and narrowly scoped verification do not require separate pre-announcements.
- After completing work, summarize:
  - Changed files
  - Key changes
  - How to verify
- Keep the completion summary proportional to the size and risk of the change.
