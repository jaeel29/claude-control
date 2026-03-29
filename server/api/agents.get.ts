import { getGlobalAgents, getProjectAgents } from '../utils/agents'

export default defineEventHandler(async () => {
  const [globalAgents, projectAgents] = await Promise.all([
    getGlobalAgents(),
    getProjectAgents(),
  ])

  return {
    global: globalAgents,
    projects: projectAgents,
  }
})
