import { readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { getGlobalAgents, getProjectAgents } from '../utils/agents'
import { getRunningSessions } from '../utils/sessions'
import { getRecentActivity } from '../utils/activity'

async function getTotalProjects(): Promise<number> {
  const dir = join(homedir(), '.claude', 'projects')
  if (!existsSync(dir)) return 0
  try {
    const entries = await readdir(dir)
    return entries.length
  } catch { return 0 }
}

export default defineEventHandler(async () => {
  const [globalAgents, projectAgents, sessions, activity, totalProjects] = await Promise.all([
    getGlobalAgents(),
    getProjectAgents(),
    Promise.resolve(getRunningSessions()),
    getRecentActivity(20),
    getTotalProjects(),
  ])

  const projectAgentCount = projectAgents.reduce((sum, p) => sum + p.agents.length, 0)
  const activeProjects = new Set(sessions.map(s => s.cwd).filter(Boolean)).size

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const promptsToday = activity.filter(a => new Date(a.timestamp) >= todayStart).length

  return {
    stats: {
      running: sessions.length,
      activeProjects,
      totalAgents: globalAgents.length + projectAgentCount,
      projects: totalProjects,
      promptsToday,
    },
    sessions,
    activity,
  }
})
