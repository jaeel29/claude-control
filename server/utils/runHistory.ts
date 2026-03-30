import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import type { RunJob } from './runManager'

export interface HistoryEntry {
  id: string
  prompt: string
  project: string
  cwd: string
  exitCode: number | null
  startedAt: string
  completedAt: string
  outputPreview: string
  sessionId?: string
}

const HISTORY_PATH = `${homedir()}/.claude/control-run-history.json`

function load(): HistoryEntry[] {
  try {
    if (!existsSync(HISTORY_PATH)) return []
    return JSON.parse(readFileSync(HISTORY_PATH, 'utf-8'))
  } catch {
    return []
  }
}

function save(entries: HistoryEntry[]) {
  try {
    writeFileSync(HISTORY_PATH, JSON.stringify(entries, null, 2))
  } catch { /* ignore */ }
}

export function saveRunHistory(runId: string, job: RunJob) {
  const preview = job.buffer
    .map(line => {
      try {
        const e = JSON.parse(line)
        if (e.type === 'assistant') {
          for (const b of e.message?.content ?? []) {
            if (b.type === 'text' && b.text?.trim()) return b.text.trim()
          }
        }
        if (e.type === 'result' && e.result?.trim()) return e.result.trim()
        return null
      } catch { return null }
    })
    .filter(Boolean)
    .slice(-3)
    .join(' ')
    .slice(0, 200)

  const entry: HistoryEntry = {
    id: runId,
    prompt: job.prompt,
    project: job.project,
    cwd: job.cwd,
    exitCode: job.exitCode,
    startedAt: job.startedAt,
    completedAt: new Date().toISOString(),
    outputPreview: preview,
    sessionId: job.sessionId,
  }

  const entries = load()
  entries.unshift(entry)
  save(entries.slice(0, 200)) // keep last 200
}

export function getRunHistory(): HistoryEntry[] {
  return load()
}
