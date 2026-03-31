import { readdir, stat } from 'node:fs/promises'
import { existsSync, createReadStream } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { createInterface } from 'node:readline'
import { getGlobalAgents, getProjectAgents } from '../utils/agents'
import { getRunningSessions2 } from '../utils/sessions'
import { getRecentActivity } from '../utils/activity'

async function getTotalProjects(): Promise<number> {
  const dir = join(homedir(), '.claude', 'projects')
  if (!existsSync(dir)) return 0
  try {
    const entries = await readdir(dir)
    return entries.length
  } catch { return 0 }
}

async function getTodayStats() {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayMs = todayStart.getTime()

  const projectsDir = join(homedir(), '.claude', 'projects')
  if (!existsSync(projectsDir)) return { filesModifiedToday: 0, toolCallsToday: 0, commandsRunToday: 0 }

  const modifiedFiles = new Set<string>()
  const commandsToday = new Set<string>()
  let toolCallsToday = 0

  try {
    const projects = await readdir(projectsDir)
    await Promise.all(projects.map(async proj => {
      const projDir = join(projectsDir, proj)
      let files: string[] = []
      try { files = (await readdir(projDir)).filter(f => f.endsWith('.jsonl')) } catch { return }

      // Only process files modified today
      const todayFiles = (await Promise.all(
        files.map(async f => {
          try { return { f, mtime: (await stat(join(projDir, f))).mtimeMs } }
          catch { return null }
        })
      )).filter((x): x is { f: string; mtime: number } => !!x && x.mtime >= todayMs)

      await Promise.all(todayFiles.map(async ({ f }) => {
        const filePath = join(projDir, f)
        try {
          const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity })
          for await (const line of rl) {
            try {
              const e = JSON.parse(line)
              if (e.type !== 'assistant' || !Array.isArray(e.message?.content)) continue
              if (!e.timestamp || new Date(e.timestamp).getTime() < todayMs) continue
              for (const block of e.message.content) {
                if (block.type !== 'tool_use') continue
                toolCallsToday++
                const name: string = block.name
                if (name === 'Write' && block.input?.file_path) modifiedFiles.add(block.input.file_path)
                if ((name === 'Edit' || name === 'MultiEdit') && block.input?.file_path) modifiedFiles.add(block.input.file_path)
                if (name === 'Bash' && block.input?.command) commandsToday.add(String(block.input.command).slice(0, 120))
              }
            } catch { /* skip */ }
          }
        } catch { /* skip */ }
      }))
    }))
  } catch { /* ignore */ }

  return {
    filesModifiedToday: modifiedFiles.size,
    toolCallsToday,
    commandsRunToday: commandsToday.size,
  }
}

export default defineEventHandler(async () => {
  const [globalAgents, projectAgents, sessions, activity, totalProjects, todayStats] = await Promise.all([
    getGlobalAgents(),
    getProjectAgents(),
    getRunningSessions2(),
    getRecentActivity(50),
    getTotalProjects(),
    getTodayStats(),
  ])

  const runningIds = new Set(sessions.map(s => s.sessionId).filter(Boolean))
  const projectAgentCount = projectAgents.reduce((sum, p) => sum + p.agents.length, 0)
  const activeProjects = new Set(sessions.map(s => s.cwd).filter(Boolean)).size

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const promptsToday = activity.filter(a => new Date(a.timestamp) >= todayStart).length

  const { filesModifiedToday, toolCallsToday, commandsRunToday } = todayStats

  return {
    stats: {
      running: sessions.length,
      activeProjects,
      totalAgents: globalAgents.length + projectAgentCount,
      projects: totalProjects,
      promptsToday,
      filesModifiedToday,
      toolCallsToday,
      commandsRunToday,
    },
    sessions,
    activity: activity.map(a => ({ ...a, isRunning: runningIds.has(a.sessionId) })),
  }
})
