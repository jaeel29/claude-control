# claudecontrol

A local dashboard for your [Claude Code](https://claude.com/claude-code) sessions — live activity, history, and cost, right in your browser.

It reads the data Claude Code already saves on your machine (`~/.claude`) and turns it into a clean dashboard: which sessions are running now, the full conversation and tool history, and what each run costs. Everything runs locally — **no account, no cloud, nothing uploaded.**

```bash
npx claudecontrolai
```

Then open **http://localhost:3001**.

> Not comfortable with the terminal? Just tell **Claude Code**: *"install and run claudecontrolai"* and it will do it for you.

---

## Features

- **Live activity** — see active sessions and follow each step Claude takes (questions, tool calls, file edits), streamed from your local session logs.
- **Full conversation view** — a persistent chat widget that mirrors the Claude Code transcript, with the current turn's prompt pinned at the top and image previews.
- **Usage & cost** — tokens in/out and estimated cost, broken down by day, project, and model.
- **Run & resume** — start a new task, resume a past session, or stop a run — straight from the dashboard.
- **Light / dark / system** theming, and a responsive layout that works down to mobile.

## Requirements

- **Node 20+**
- The **Claude Code CLI** installed and on your `PATH` (the dashboard reads `~/.claude` and can spawn `claude`).
- macOS or Linux.

## Usage

```bash
npx claudecontrolai                  # start on http://localhost:3001
npx claudecontrolai --port 4000      # use a different port
npx claudecontrolai --bind tailnet   # reach it from your phone (see below)
npx claudecontrolai --help           # show options
```

The dashboard polls your local Claude Code data and refreshes automatically.

## Track Claude Code from your phone

Your sessions live on your computer, so the dashboard runs there — but you can
open it on your phone's browser over your own private network using
[Tailscale](https://tailscale.com) (free):

1. Install Tailscale on **your computer and your phone**, and sign in to the same
   account on both (`tailscale up` on the computer).
2. Start the dashboard bound to your tailnet:

   ```bash
   npx claudecontrolai --bind tailnet
   ```

3. The terminal prints a **private URL** (a `100.x.y.z` address) and an **access
   token**. Open that URL in your phone's browser and enter the token.

Notes:
- It only works while your **computer is awake and online** — there's no cloud copy.
- Remote access is **view-only by default** (you can watch, not run). To also start
  or stop runs from your phone, add `--allow-remote-run`.
- The access token is saved to `~/.claudecontrol/token` so it stays the same
  between runs.

## How it works

Claude Code writes every session to `~/.claude/projects/<project>/<sessionId>.jsonl`. claudecontrol is a small [Nuxt](https://nuxt.com) app (a Nitro server + Vue UI) that:

1. discovers running sessions from your local processes,
2. parses those session logs into conversations, tool history, and usage, and
3. serves it all as a live dashboard on `localhost`.

Because it only reads local files and talks to your own machine, there's nothing to sign in to and no data leaves your computer.

## Development

This repo is the source for the published package.

```bash
bun install
bun run dev      # dev server on http://localhost:3001
bun run build    # build the production server into .output
bun run start    # run the built server (what the published CLI does)
```

- **Stack:** Nuxt 4 (Vue 3, `<script setup>`), Nitro server, Bun, SCSS design tokens.
- See [CLAUDE.md](./CLAUDE.md) for architecture and conventions.

## License

MIT
