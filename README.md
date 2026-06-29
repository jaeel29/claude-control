# Claude Control

A local dashboard for your [Claude Code](https://claude.com/claude-code) sessions — live activity, history, and cost, right in your browser.

It reads the data Claude Code already saves on your machine (`~/.claude`) and turns it into a clean dashboard: which sessions are running now, the full conversation and tool history, and what each run costs. Everything runs locally — **no account, no cloud, nothing uploaded.**

```bash
npx claudecontrolai
```

Then open **http://localhost:3001**.

> Not comfortable with the terminal? Just tell **Claude Code**: _"install and run claudecontrolai"_ and it will do it for you.

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
npx claudecontrolai --bind lan       # also reach it from your phone (same Wi-Fi)
npx claudecontrolai --help           # show options
```

The dashboard polls your local Claude Code data and refreshes automatically.

### Options

| Flag | Default | What it does |
| --- | --- | --- |
| `--bind <mode>` | `localhost` | Where to listen: `localhost`, `lan` (same Wi-Fi), `tailnet` (Tailscale), `public` |
| `--port <n>` | `3001` | Port to listen on |
| `--token <secret>` | auto | Access token for remote auth (auto-generated and saved if omitted) |
| `--allow-remote-run` | off | Allow **starting/stopping** Claude from a remote device (off = view-only) |
| `-h`, `--help` | — | Show help |

When you bind to anything other than `localhost`, the terminal prints a **phone
URL**, an **access token**, and whether **remote run** is enabled.

## Track Claude Code from your phone

Your sessions live on your computer, so the dashboard runs there — but you can
open it on your phone's browser too.

**Same Wi-Fi (easiest, no extra software):**

```bash
npx claudecontrolai --bind lan
```

The terminal prints a **phone URL** (your computer's LAN address, e.g.
`http://192.168.x.x:3001`) and an **access token**. Open that URL on your phone
(connected to the same Wi-Fi) and enter the token.

**From anywhere (via [Tailscale](https://tailscale.com), free):**

```bash
npx claudecontrolai --bind tailnet
```

Install Tailscale on your computer and phone, sign in on both, then use the
`100.x.y.z` URL it prints.

Notes:

- It only works while your **computer is awake and online** — there's no cloud copy.
- The access token is saved to `~/.claudecontrol/token` so it stays the same
  between runs. The login cookie lasts 30 days per device.
- **localhost is always trusted** — using the dashboard on the computer itself
  never asks for a token.

## Remote control (running Claude from your phone)

By default, a dashboard opened over the network is **view-only**: you can watch
sessions, history, and cost, but the **Run** button is disabled remotely. If you
try to send a message from a remote device you'll see:

> Remote control is disabled. This dashboard is view-only over the network. Start with `--allow-remote-run` to enable it.

To start, resume, and stop runs from your phone, launch with the flag:

```bash
npx claudecontrolai --bind lan --allow-remote-run
```

⚠️ **What this means:** with `--allow-remote-run`, anyone who has the URL **and**
the token can execute code on your machine (runs spawn Claude Code with
`--dangerously-skip-permissions`). On your own Wi-Fi or private Tailscale network,
guarded by the token, this is normally fine — but treat it as a real capability,
not a view-only toggle. Leave it off if you only want to watch.

## How it works

Claude Code writes every session to `~/.claude/projects/<project>/<sessionId>.jsonl`. claudecontrol is a small [Nuxt](https://nuxt.com) app (a Nitro server + Vue UI) that:

1. discovers running sessions from your local processes,
2. parses those session logs into conversations, tool history, and usage, and
3. serves it all as a live dashboard on `localhost`.

Because it only reads local files and talks to your own machine, there's nothing to sign in to and no data leaves your computer.

## Troubleshooting

**"Module not found … @anthropic-ai/claude-code/cli.js" when sending a message**
The dashboard couldn't find the Claude Code CLI to spawn. It resolves `claude`
from your `PATH` (native installer, npm, Homebrew, nvm, bun). Make sure `claude`
runs in your terminal — `claude --version` should print a version. If you use a
version manager, launch the dashboard from a shell where `claude` is on `PATH`.

**"Remote control is disabled. This dashboard is view-only over the network."**
You opened the dashboard from another device and tried to run Claude. That's the
view-only default — restart with `--allow-remote-run` (see
[Remote control](#remote-control-running-claude-from-your-phone)).

**`EADDRINUSE: address already in use … :3001`**
Another instance is already running on that port. Stop it, or pick another port:

```bash
lsof -ti tcp:3001 | xargs kill -9   # free the port (macOS/Linux)
# or
npx claudecontrolai --port 4000
```

**On iPhone it downloads a `login.txt` file instead of showing the login page**
An occasional iOS Safari hiccup with the redirect to the login page. Open the
login URL directly — `http://<phone-url>/login` — or clear the site data in
Safari and reload. After that it renders normally.

**The phone URL won't load at all**
Check the phone is on the **same Wi-Fi** (and not a guest network that isolates
devices), and allow the connection if macOS prompts with a firewall dialog.

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
