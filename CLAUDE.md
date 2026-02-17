# AGENTS.md

Guide for coding agents in this repository.
Prefer observed project patterns over generic defaults.

## Project Summary

- Name: `markdown-viewer`
- Stack: Vite + vanilla JavaScript (ES modules)
- Runtime: browser only
- Output: single self-contained `docs/index.html` via `vite-plugin-singlefile`
- UI copy language: Korean
- Package manager: `npm` (lockfile present)

## Repository Structure

- `index.html`: app shell, sidebar/header/footer markup
- `src/main.js`: init flow, rendering, search, shortcuts, refresh behavior
- `src/directory.js`: directory picker/scanning/persisted handle utilities
- `src/style.css`: theme tokens and full UI styles
- `vite.config.js`: Vite + singlefile plugin config
- `docs/index.html`: production artifact (tracked)

## Build / Lint / Test Commands

### Install

```bash
npm install
```

### Dev

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

### Lint Status

- No lint script in `package.json`
- No ESLint/Biome/Prettier config in repo
- Use `npm run build` as baseline automated verification

### Test Status

- No test framework configured
- No `npm test` script
- No `*.test.*` / `*.spec.*` files

### Single Test Command

- Not available currently
- If tests are introduced, document exact command here
  - Example pattern: `npm test -- path/to/file.test.js`

## Verification Baseline

For every change:

1. Run `npm run build`
2. If UI changed, run `npm run dev` and manually check key flows
3. Verify folder pick, file open, search, theme toggle, refresh behavior

## Coding Style (Observed)

### JavaScript / Imports

- Use ESM `import`/`export`
- Keep imports grouped at file top
- CSS imports in JS are part of current pattern
- Prefer named imports unless default-only module

### Formatting

- 2-space indentation
- Single quotes
- Template literals for interpolation
- Keep semicolon style consistent with touched file
- Avoid unnecessary wrapping or large formatting churn

### Naming

- `camelCase` for variables/functions/helpers
- `UPPER_SNAKE_CASE` for fixed constants
- DOM refs often use semantic suffixes: `El`, `Btn`, `Input`
- CSS classes are kebab-case (`sidebar-actions`, `tree-item`)

### Types / Data Modeling

- Plain JavaScript project (no TS tooling)
- Do not introduce TS syntax unless explicitly requested
- File metadata may include underscore caches (`_cachedText`, `_firstLine`)
- Tree model: directory nodes as `Map`, files as arrays

### State Management

- Module-level mutable state (`let`) in `src/main.js` is expected
- Add new state near existing state declarations
- Prefer extending current flows over parallel duplicate state paths

### DOM / UI Patterns

- Vanilla DOM APIs only
- Common usage: `createElement`, `innerHTML`, `classList`, `addEventListener`
- Escape untrusted text before HTML insertion (`esc()` pattern)
- Sidebar header is two-row layout: title row + action row
- Icon-only actions should include accessible labels and tooltip text

### Async / Concurrency

- Prefer `async/await`
- Use `Promise.all` for independent preload tasks
- Use `for await...of` for directory handle iteration
- Keep loading overlay text updated during long scans

### Error Handling

- Ignore expected user cancel (`AbortError`) silently
- Log unexpected runtime failures with `console.error`
- Use safe fallbacks for non-critical read failures
- Do not swallow critical failures without fallback behavior

### Comments / Docs

- Keep comments short and intent-focused
- Maintain existing section comment style (`// === Section ===`)
- Preserve JSDoc on exported helpers in `src/directory.js`

### CSS Conventions

- Use CSS custom properties for theme/system values
- Theme switching uses `[data-theme]`
- Reuse established tokens (`--bg`, `--border`, `--text-muted`, etc.)
- Match existing spacing/opacity/transition rhythm for controls

## Architecture Notes

- Entry point: `init()` in `src/main.js`
- Startup restores saved directory handle when available
- Directory load paths:
  - native `showDirectoryPicker`
  - fallback `input[webkitdirectory]`
- Render flow: scan -> preload first lines -> render tree/recent -> open markdown
- Refresh behavior:
  - native picker: reload current handle
  - fallback: reopen file picker dialog

## Cursor / Copilot Rules

Checked paths:

- `.cursorrules`
- `.cursor/rules/`
- `.github/copilot-instructions.md`

Current status: none of these files exist in this repo.
If added later, treat them as higher-priority and sync this file.

## Change Scope Rules

- Make surgical changes only
- Avoid unrelated refactors
- Match style of nearby code
- Do not add new tooling (lint/test/TS) unless requested
- Keep single-file build behavior unless explicitly asked otherwise
