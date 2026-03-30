import { readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { getGlobalAgents, getProjectAgents } from '../utils/agents'
import { getRunningSessions } from '../utils/sessions'
import { getRecentActivity } from '../utils/activity'
import { getSessionLog } from '../utils/sessionlog'

async function getTotalProjects(): Promise<number> {
  const dir = join(homedir(), '.claude', 'projects')
  if (!existsSync(dir)) return 0
  try {
    const entries = await readdir(dir)
    return entries.length
  } catch { return 0 }
}

export default defineEventHandler(async () => {
  const [globalAgents, projectAgents, sessions, activity, totalProjects, sessionLog] = await Promise.all([
    getGlobalAgents(),
    getProjectAgents(),
    Promise.resolve(getRunningSessions()),
    getRecentActivity(50),
    getTotalProjects(),
    getSessionLog(30),
  ])

  const runningIds = new Set(sessions.map(s => s.sessionId).filter(Boolean))
  const projectAgentCount = projectAgents.reduce((sum, p) => sum + p.agents.length, 0)
  const activeProjects = new Set(sessions.map(s => s.cwd).filter(Boolean)).size

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const promptsToday = activity.filter(a => new Date(a.timestamp) >= todayStart).length

  // Files modified: unique files edited+written across recent sessions active today
  const todaySessions = sessionLog.filter(s => new Date(s.lastActiveAt) >= todayStart)
  const modifiedFiles = new Set<string>()
  for (const s of todaySessions) {
    s.filesEdited.forEach(f => modifiedFiles.add(f))
    s.filesWritten.forEach(f => modifiedFiles.add(f))
  }
  const filesModifiedToday = modifiedFiles.size

  // Tool calls today: sum all tool calls across sessions active today
  const toolCallsToday = todaySessions.reduce((sum, s) => {
    return sum + Object.values(s.toolCalls).reduce((a, b) => a + b, 0)
  }, 0)

  // Commands run today: unique bash commands across sessions active today
  const commandsToday = new Set<string>()
  for (const s of todaySessions) {
    s.commandsRun.forEach(c => commandsToday.add(c))
  }
  const commandsRunToday = commandsToday.size

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
