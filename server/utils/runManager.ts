import { spawn as nodeSpawn, execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { saveRunHistory } from './runHistory'

export interface RunJob {
  prompt: string
  cwd: string
  project: string
  buffer: string[]
  done: boolean
  exitCode: number | null
  startedAt: string
  sessionId?: string
  listeners: Set<(chunk: string) => void>
  kill: () => void
}

const jobs = new Map<string, RunJob>()

const HOME = homedir()

// A broad PATH so we can find `claude`/`bun`/`node` wherever the user installed
// them — native installer (~/.local/bin), Homebrew, nvm, bun, system dirs.
const SEARCH_PATH = [
  `${HOME}/.local/bin`,
  `${HOME}/.bun/bin`,
  '/opt/homebrew/bin',
  '/usr/local/bin',
  '/usr/bin',
  '/bin',
  process.env.PATH ?? '',
].filter(Boolean).join(':')

// Resolve an executable on SEARCH_PATH (like `which`), returns absolute path or null.
function which(cmd: string): string | null {
  try {
    const out = execSync(`command -v ${cmd}`, {
      encoding: 'utf8',
      env: { ...process.env, PATH: SEARCH_PATH },
      timeout: 3000,
    }).trim()
    if (out && existsSync(out)) return out
  } catch { /* not found */ }
  return null
}

// How to launch Claude Code, resolved dynamically per machine:
//  1) the `claude` executable on PATH (native installer or npm bin) — run directly
//  2) a known `@anthropic-ai/claude-code/cli.js`, run via bun or node
type Launcher = { cmd: string; prefixArgs: string[] }

function resolveLauncher(): Launcher | null {
  // Preferred: the `claude` launcher on PATH. Works for both the standalone
  // native binary and the npm-installed wrapper, no runtime guessing needed.
  const claude = which('claude')
  if (claude) return { cmd: claude, prefixArgs: [] }

  // Fallback: a raw cli.js — needs a JS runtime (bun, then node).
  const cliCandidates = [
    `${HOME}/.bun/install/global/node_modules/@anthropic-ai/claude-code/cli.js`,
    `/opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js`,
    `/usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js`,
  ]
  // Also scan every nvm node version dir for the npm-global install.
  try {
    const nvmRoot = `${HOME}/.nvm/versions/node`
    if (existsSync(nvmRoot)) {
      for (const v of execSync(`ls -1 ${nvmRoot}`, { encoding: 'utf8', timeout: 3000 }).split('\n').filter(Boolean)) {
        cliCandidates.push(`${nvmRoot}/${v}/lib/node_modules/@anthropic-ai/claude-code/cli.js`)
      }
    }
  } catch { /* ignore */ }

  const cli = cliCandidates.find(p => existsSync(p))
  if (!cli) return null

  const runtime = which('bun') || which('node')
  if (!runtime) return null
  return { cmd: runtime, prefixArgs: [cli] }
}

export function createRun(prompt: string, cwd: string, project: string, resumeSessionId?: string): string {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const launcher = resolveLauncher()

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    HOME,
    PATH: SEARCH_PATH,
  }

  const cliArgs = ['-p', prompt, '--output-format', 'stream-json', '--verbose', '--dangerously-skip-permissions']
  const baseArgs = launcher ? [...launcher.prefixArgs, ...cliArgs] : cliArgs
  const args = resumeSessionId ? [...baseArgs, '--resume', resumeSessionId] : baseArgs

  const job: RunJob = {
    prompt, cwd, project,
    buffer: [],
    done: false,
    exitCode: null,
    startedAt: new Date().toISOString(),
    listeners: new Set(),
    kill: () => {},
  }
  jobs.set(runId, job)

  const push = (chunk: string) => {
    job.buffer.push(chunk)
    for (const fn of job.listeners) fn(chunk)
  }

  // No Claude Code CLI found on this machine — fail clearly instead of spawning
  // a path that doesn't exist.
  if (!launcher) {
    push(JSON.stringify({
      type: 'stderr',
      text: 'Claude Code CLI not found. Install it (https://claude.com/claude-code) and ensure `claude` is on your PATH.',
    }))
    job.done = true
    job.exitCode = -1
    push(JSON.stringify({ type: 'done', code: -1 }))
    setTimeout(() => jobs.delete(runId), 30 * 60 * 1000)
    return runId
  }

  const proc = nodeSpawn(launcher.cmd, args, {
    cwd,
    shell: false,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  job.kill = () => proc.kill('SIGTERM')

  proc.stdout.on('data', (data: Buffer) => {
    for (const line of data.toString().split('\n').filter(l => l.trim())) {
      // Capture session_id from init event
      try {
        const e = JSON.parse(line)
        if (e.type === 'system' && e.subtype === 'init' && e.session_id) {
          job.sessionId = e.session_id
        }
      } catch { /* not json */ }
      push(line)
    }
  })

  proc.stderr.on('data', (data: Buffer) => {
    push(JSON.stringify({ type: 'stderr', text: data.toString().trim() }))
  })

  proc.on('close', (code: number | null) => {
    job.done = true
    job.exitCode = code
    push(JSON.stringify({ type: 'done', code }))
    saveRunHistory(runId, job)
  })

  proc.on('error', (err: Error) => {
    push(JSON.stringify({ type: 'stderr', text: `Failed to start: ${err.message}` }))
    job.done = true
    push(JSON.stringify({ type: 'done', code: -1 }))
  })

  setTimeout(() => jobs.delete(runId), 30 * 60 * 1000)
  return runId
}

export function getJob(runId: string): RunJob | undefined {
  return jobs.get(runId)
}

export function killJob(runId: string): void {
  jobs.get(runId)?.kill()
}
