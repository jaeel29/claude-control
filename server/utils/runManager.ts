import { spawn as nodeSpawn } from 'node:child_process'
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

const BUN = `${HOME}/.bun/bin/bun`

function findCli(): string {
  const candidates = [
    `${HOME}/.bun/install/global/node_modules/@anthropic-ai/claude-code/cli.js`,
    `${HOME}/.nvm/versions/node/v20.19.5/lib/node_modules/@anthropic-ai/claude-code/cli.js`,
    `${HOME}/.nvm/versions/node/v22.0.0/lib/node_modules/@anthropic-ai/claude-code/cli.js`,
    `/usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js`,
  ]
  return candidates.find(p => existsSync(p)) ?? (candidates[0] as string)
}

export function createRun(prompt: string, cwd: string, project: string, resumeSessionId?: string): string {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const CLI = findCli()

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    HOME,
    PATH: `${HOME}/.bun/bin:${HOME}/.nvm/versions/node/v20.19.5/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH ?? ''}`,
  }

  const baseArgs = [CLI, '-p', prompt, '--output-format', 'stream-json', '--verbose', '--dangerously-skip-permissions']
  const args = resumeSessionId ? [...baseArgs, '--resume', resumeSessionId] : baseArgs

  const proc = nodeSpawn(BUN, args, {
    cwd,
    shell: false,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const job: RunJob = {
    prompt, cwd, project,
    buffer: [],
    done: false,
    exitCode: null,
    startedAt: new Date().toISOString(),
    listeners: new Set(),
    kill: () => proc.kill('SIGTERM'),
  }
  jobs.set(runId, job)

  const push = (chunk: string) => {
    job.buffer.push(chunk)
    for (const fn of job.listeners) fn(chunk)
  }

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
