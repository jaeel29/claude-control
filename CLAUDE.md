# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

**claude-control** is a local web dashboard for monitoring and controlling Claude Code CLI sessions running on your machine. It reads Claude Code's local state (running processes, session logs, usage data) and renders it as a live UI, and it can launch and manage new Claude Code runs.

It is a single-user, local-only tool — the server reads from the host's `~/.claude/` directory and inspects local processes. It is not meant to be deployed publicly.

## Tech stack

- **Nuxt 4** (Vue 3, `<script setup>`, Composition API) with the `app/` directory structure
- **Nitro** server engine for the backend API (`server/`)
- **Bun** as package manager and runtime (`packageManager: bun@1.3.10`)
- **SCSS** via `sass-embedded`; global styles in `app/assets/css/main.css`
- **@nuxt/icon** with a custom `icons` collection from `app/assets/icons`
- TypeScript throughout

## Commands

```bash
bun install          # install deps (runs nuxt prepare via postinstall)
bun run dev          # dev server on http://localhost:3001
bun run build        # production build
bun run preview      # preview the build
bun run generate     # static generation
```

There is no test or lint script configured.

## Architecture

### Frontend (`app/`)
- `app.vue` — shell: `<AppSidebar />` + `<NuxtPage />`
- `pages/` — one file per route: `index` (home), `activity`, `agents`, `projects`, `tasks`, `logs`, `run`, `usage`, `test`
- `components/` — page-level components (`AppSidebar`, `ConversationModal`, `ActivitySessionRow`, `Modal`)
- `components/ui/` — reusable primitives (`Badge`, `Button`, `Drawer`, `Dropdown`)
- Pages fetch from `/api/*` with `useFetch` and poll on an interval (e.g. `setInterval(refresh, 10_000)`) to stay live.

### Backend (`server/`)
Nitro file-based routing. Endpoints in `server/api/`, logic in `server/utils/`:

- `runManager.ts` — spawns the Claude Code CLI (`claude-code/cli.js` via Bun) with `-p <prompt> --output-format stream-json --verbose --dangerously-skip-permissions`. Tracks jobs in memory, captures `session_id` from the init event, streams stdout to SSE listeners, and persists finished runs via `runHistory.ts`. Supports `--resume <sessionId>`.
- `sessions.ts` — discovers running Claude Code sessions by parsing `ps aux` and `lsof`, then resolves each session's id from the newest `.jsonl` in `~/.claude/projects/<encoded-cwd>/`.
- `activity.ts` / `sessionlog.ts` — parse session JSONL transcripts into conversation threads (user/assistant/tool messages).
- `usage.ts` — aggregates token usage and cost from session logs using a per-model `MODEL_PRICING` table.
- `tasks.ts` / `todos.ts` / `manualTodos.ts` — CRUD over JSON files in `~/.claude/` (e.g. `control-tasks.json`).
- `agents.ts`, `runHistory.ts` — agent listing and run history persistence.

### Key data sources (all under `~/.claude/`)
- `~/.claude/projects/<encoded-cwd>/*.jsonl` — session transcripts (cwd path with `/` → `-`)
- `~/.claude/control-tasks.json` and similar — dashboard-managed task/todo state
- Live OS process inspection (`ps aux`, `lsof`) for running sessions

## Conventions

- **Tabs** for indentation (see existing `.vue` and `.ts` files).
- **SFC block order (required for every new `.vue` file):** `<template>` first, then `<script setup lang="ts">`, then `<style scoped lang="scss">`. Always use `lang="ts"` on the script and `scoped` (plus `lang="scss"`) on the style.
- Vue: `<script setup lang="ts">`, define TS interfaces inline for fetched shapes.
- Theming: read colors from the design tokens in `app/assets/css/variables.css` (`--color-*`, `--badge-*`, `--glass-*`) so light/dark both work; never hardcode theme colors. Theme is toggled via `useTheme()` and applied as `data-theme` on `<html>` (anti-flash inline script in `app.vue`).
- Reuse the UI primitives in `app/components/ui/` — `BaseButton` (default `radius="rounded"`) for actions and `BaseBadge` (`variant="glass"`) for labels/pills — instead of bespoke buttons/pills.
- Links: use `<NuxtLink>` for navigation and in-page anchors, never raw `<a>` (except true external URLs).
- Icons: never inline `<svg>` in components. Use `<Icon>` (`@nuxt/icon`) — `lucide:*` for the built-in set, or a local custom collection for brand/custom marks. Add new SVGs as files under `app/assets/icons/<collection>/` and register the collection's `prefix`/`dir` in `nuxt.config.ts` (`icon.customCollections`), then reference as `<Icon name="<prefix>:<file>" />` (e.g. `icons:logo`, `ai:claude`).
- Server: typed `defineEventHandler`, throw `createError({ statusCode, message })` for validation; use `node:` builtins (`fs`, `path`, `os`, `child_process`).
- Use `~/` alias for app imports; server utils import via relative paths (`../utils/...`).
- Match existing file naming: `*.get.ts` / `*.post.ts` / `*.put.ts` / `*.delete.ts` for API routes; dynamic segments as `[param]`.

## Version Control

This repo lives on **GitHub** (`github.com/jaeel29/claude-control`). Use **`gh`** for PRs (`gh pr view/diff/list`).

- Commits: Conventional Commits (`feat|fix|refactor|build|ci|chore|docs|style|perf|test`)
- Small, per-feature commits. NEVER commit before the user has reviewed the change

### Commit & push structure

When the user asks to commit/push, follow this exactly:

1. **One commit per concern, not one mega-commit.** Split the working tree by _logical change_ (e.g. a landing page, a data-fetching refactor, and a theming change are separate commits — stage by concern with `git add -p` when needed). Each commit must build (`bun run build`) on its own.
2. **Conventional subject**: `type(scope): imperative summary`, ≤ 72 chars, lower-case, no trailing period. Scope is the area touched (`landing`, `dashboard`, `cli`, `theme`, `chat`, `api`, …).
3. **Body explains WHY, with evidence.** For a fix: state the _root cause_, the fix, and how it was verified (build/Playwright). For a refactor: what changed and why it's safe. Wrap at ~80 cols. List the touched files when a commit spans several.
4. **Flag any runtime/setup dependencies** in the body (e.g. "needs the Claude Code CLI on PATH") so the commit is self-documenting.
5. **Every commit message ends with**:
   ```
   Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
   ```
6. **Verify before pushing**: `bun run build` succeeds. Show the user the planned split + subjects, then push only when they confirm (or when they've already said "push to main directly").
7. **Branch**: push to `main` only when the user explicitly says so; otherwise branch + open a PR with `gh`.

## Notes / gotchas

- `runManager.findCli()` probes hardcoded candidate paths for the Claude Code CLI and a hardcoded Bun path (`~/.bun/bin/bun`); these are machine-specific and may need updating.
- Runs use `--dangerously-skip-permissions` — spawned Claude Code processes execute without permission prompts. Treat this as a local-trust-only tool.
- In-memory jobs are dropped after 30 minutes (`setTimeout(... 30 * 60 * 1000)`).
- Session/usage parsing is best-effort and wraps JSON parsing in try/catch — malformed lines are skipped silently.
