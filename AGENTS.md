# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server (http://localhost:5173)
- `npm run build` — production build to `dist/`
- `npm run preview` — preview built bundle
- `npm run lint` — ESLint over the repo

No test runner is configured.

## Architecture

Single-page React 18 + Vite + Tailwind app that displays GitHub issues assigned to the authenticated user, grouped by repository. There is no backend — the browser talks directly to GitHub's GraphQL API using a Personal Access Token the user supplies on a login screen.

Data flow:

1. `src/components/LoginForm` collects `username` + PAT and stores them via `src/utils/localStorage.js` (`getCredentials` / `clearCredentials`).
2. `src/services/github.js` issues a GraphQL `search` query for issues assigned to the user.
3. `src/services/dataManager.js` is the orchestration layer used by the UI: it checks the session cache (`src/utils/cache.js`) via `shouldRefreshData()`, fetches fresh data when needed, groups issues by `repository.nameWithOwner`, sorts repos alphabetically and issues within each repo by `createdAt` desc, then writes the result back to the cache. On `Authentication failed` it clears both credentials and cache so the app falls back to the login screen.
4. `src/App.jsx` renders `RepositoryGroup` → `IssueList` → `IssueCard` from that grouped structure.

The cache layer exists specifically to avoid hammering GitHub's rate limit during a session — prefer routing new data fetches through `dataManager.fetchIssues` rather than calling `github.js` directly so caching/auth-failure handling stays consistent.

Styling is Tailwind (config in `tailwind.config.js`, entry `src/index.css`). ESLint flat config lives in `eslint.config.js`.

## UI Guidelines

- **Always use shadcn/ui components** from `src/components/ui/` for any UI element — buttons, inputs, labels, cards, badges, separators, scroll areas, etc.
- If a needed shadcn component doesn't exist in `src/components/ui/`, create it there following the existing pattern (CVA + `cn` utility, semantic token classes).
- **Never use hardcoded Tailwind color classes** (`gray-*`, `blue-*`, `red-*`, etc.) for UI elements. Always use semantic tokens (`text-foreground`, `bg-muted`, `border-border`, `text-muted-foreground`, `text-destructive`, `bg-primary`, etc.) so dark mode works automatically.
- Raw `<button>`, `<input>`, and `<label>` elements should be replaced with their shadcn equivalents (`Button`, `Input`, `Label`).
