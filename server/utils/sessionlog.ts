import { readdir, stat } from 'node:fs/promises'
import { existsSync, createReadStream } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { createInterface } from 'node:readline'
import { getRunningSessions } from './sessions'

export interface SessionLogEntry {
  sessionId: string
  project: string
  cwd: string
  startedAt: string
  lastActiveAt: string
  isRunning: boolean
  filesRead: string[]
  filesWritten: string[]
  filesEdited: string[]
  commandsRun: string[]
  agentsSpawned: number
  toolCalls: Record<string, number>
}

async function readLines(filePath: string, maxLines = 1500): Promise<string[]> {
  const lines: string[] = []
  try {
    const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity })
    for await (const line of rl) {
      lines.push(line)
      if (lines.length > maxLines) lines.shift()
    }
  } catch { /* ignore */ }
  return lines
}

async function sortedByMtime(dir: string, files: string[]): Promise<string[]> {
  const withMtime = await Promise.all(
    files.map(async f => {
      try { return { f, mtime: (await stat(join(dir, f))).mtimeMs } }
      catch { return { f, mtime: 0 } }
    })
  )
  return withMtime.sort((a, b) => b.mtime - a.mtime).map(x => x.f)
}

export async function getSessionLog(limit = 20): Promise<SessionLogEntry[]> {
  const projectsDir = join(homedir(), '.claude', 'projects')
  if (!existsSync(projectsDir)) return []

  const sessions = getRunningSessions()
  const runningIds = new Set(sessions.map(s => s.sessionId).filter(Boolean))
  const cwdBySession = new Map(sessions.map(s => [s.sessionId, { cwd: s.cwd, project: s.project }]))

  const entries: SessionLogEntry[] = []

  try {
    const projects = await readdir(projectsDir)

    for (const proj of projects) {
      const projDir = join(projectsDir, proj)
      const segments = proj.split('-').filter(Boolean)
      const projectName = segments.slice(-2).join('-')

      let files: string[] = []
      try {
        files = (await readdir(projDir)).filter(f => f.endsWith('.jsonl'))
      } catch { continue }
      if (!files.length) continue

      const sorted = await sortedByMtime(projDir, files)

      for (const file of sorted.slice(0, 2)) {
        const lines = await readLines(join(projDir, file))

        const entry: SessionLogEntry = {
          sessionId: '',
          project: projectName,
          cwd: '',
          startedAt: '',
          lastActiveAt: '',
          isRunning: false,
          filesRead: [],
          filesWritten: [],
          filesEdited: [],
          commandsRun: [],
          agentsSpawned: 0,
          toolCalls: {},
        }

        const seenFiles: Record<string, Set<string>> = { read: new Set(), written: new Set(), edited: new Set() }

        for (const line of lines) {
          try {
            const e = JSON.parse(line)
            if (!e.timestamp) continue

            if (!entry.sessionId && e.sessionId) {
              entry.sessionId = e.sessionId
              const known = cwdBySession.get(e.sessionId)
              if (known) { entry.cwd = known.cwd; entry.project = known.project }
              else if (e.cwd) entry.cwd = e.cwd
            }

            if (!entry.startedAt) entry.startedAt = e.timestamp
            entry.lastActiveAt = e.timestamp

            if (e.type === 'assistant' && Array.isArray(e.message?.content)) {
              for (const block of e.message.content) {
                if (block.type !== 'tool_use') continue
                const name: string = block.name
                entry.toolCalls[name] = (entry.toolCalls[name] ?? 0) + 1

                if (name === 'Read' && block.input?.file_path) {
                  seenFiles.read.add(block.input.file_path)
                } else if (name === 'Write' && block.input?.file_path) {
                  seenFiles.written.add(block.input.file_path)
                } else if ((name === 'Edit' || name === 'MultiEdit') && block.input?.file_path) {
                  seenFiles.edited.add(block.input.file_path)
                } else if (name === 'Bash' && block.input?.command) {
                  const cmd = String(block.input.command).slice(0, 80)
                  if (!entry.commandsRun.includes(cmd)) entry.commandsRun.push(cmd)
                } else if (name === 'Agent') {
                  entry.agentsSpawned++
                }
              }
            }
          } catch { /* skip */ }
        }

        if (!entry.sessionId) continue
        entry.filesRead = [...seenFiles.read]
        entry.filesWritten = [...seenFiles.written]
        entry.filesEdited = [...seenFiles.edited]
        entry.isRunning = runningIds.has(entry.sessionId)

        entries.push(entry)
      }
    }
  } catch { /* ignore */ }

  return entries
    .filter(e => e.startedAt && Object.keys(e.toolCalls).length > 0)
    .sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime())
    .slice(0, limit)
}
