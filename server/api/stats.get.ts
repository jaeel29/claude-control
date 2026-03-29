import { getGlobalAgents, getProjectAgents } from '../utils/agents'
import { getRunningSessions } from '../utils/sessions'

export default defineEventHandler(async () => {
  const [globalAgents, projectAgents, sessions] = await Promise.all([
    getGlobalAgents(),
    getProjectAgents(),
    Promise.resolve(getRunningSessions()),
  ])

  const projectAgentCount = projectAgents.reduce((sum, p) => sum + p.agents.length, 0)

  return {
    running: sessions.length,
    globalAgents: globalAgents.length,
    totalAgents: globalAgents.length + projectAgentCount,
    projects: projectAgents.length,
  }
})
