import { readdir, readFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { getRunningSessions } from './sessions'
import { MANUAL_SESSION_ID, MANUAL_PROJECT } from './manualTodos'

export interface TodoItem {
  content: string
  status: 'pending' | 'in_progress' | 'completed'
  activeForm?: string
}

export interface LiveTodoSession {
  sessionId: string
  agentId: string
  project: string
  cwd: string
  todos: TodoItem[]
  lastModified: string
  isRunning: boolean
}

export async function getLiveTodos(): Promise<LiveTodoSession[]> {
  const todosDir = join(homedir(), '.claude', 'todos')
  if (!existsSync(todosDir)) return []

  const sessions = getRunningSessions()
  const runningIds = new Set(sessions.map(s => s.sessionId).filter(Boolean))

  let files: string[] = []
  try {
    files = (await readdir(todosDir)).filter(f => f.endsWith('.json'))
  } catch { return [] }

  const cutoff = Date.now() - 24 * 60 * 60 * 1000 // last 24h

  const results: LiveTodoSession[] = []

  for (const file of files) {
    // filename pattern: {sessionId}-agent-{agentId}.json
    const match = file.match(/^([a-f0-9-]{36})-agent-([a-f0-9-]{36})\.json$/)
    if (!match) continue

    const [, sessionId, agentId] = match
    const filePath = join(todosDir, file)

    try {
      const s = await stat(filePath)
      const isManual = sessionId === MANUAL_SESSION_ID
      if (!isManual && s.mtimeMs < cutoff && !runningIds.has(sessionId)) continue

      const raw = await readFile(filePath, 'utf8')
      const todos: TodoItem[] = JSON.parse(raw)
      if (!Array.isArray(todos) || todos.length === 0) continue

      // Only show sessions that have at least one non-completed todo or are running
      const hasActive = todos.some(t => t.status !== 'completed')
      if (!hasActive && !isManual && !runningIds.has(sessionId)) continue

      const matchedSession = sessions.find(s => s.sessionId === sessionId)

      results.push({
        sessionId,
        agentId,
        project: isManual ? MANUAL_PROJECT : (matchedSession?.project ?? sessionId.slice(0, 8)),
        cwd: matchedSession?.cwd ?? '',
        todos,
        lastModified: s.mtime.toISOString(),
        isRunning: runningIds.has(sessionId),
      })
    } catch { /* skip unreadable files */ }
  }

  return results.sort((a, b) => {
    // Running sessions first, then by lastModified
    if (a.isRunning !== b.isRunning) return a.isRunning ? -1 : 1
    return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
  })
}
