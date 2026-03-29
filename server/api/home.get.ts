import { getGlobalAgents, getProjectAgents } from '../utils/agents'
import { getRunningSessions } from '../utils/sessions'
import { getRecentActivity } from '../utils/activity'

export default defineEventHandler(async () => {
  const [globalAgents, projectAgents, sessions, activity] = await Promise.all([
    getGlobalAgents(),
    getProjectAgents(),
    Promise.resolve(getRunningSessions()),
    getRecentActivity(20),
  ])

  const projectAgentCount = projectAgents.reduce((sum, p) => sum + p.agents.length, 0)

  return {
    stats: {
      running: sessions.length,
      globalAgents: globalAgents.length,
      totalAgents: globalAgents.length + projectAgentCount,
      projects: projectAgents.length,
    },
    sessions,
    activity,
  }
})
