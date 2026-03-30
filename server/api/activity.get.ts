import { getRecentActivity } from '../utils/activity'
import { getRunningSessions } from '../utils/sessions'

export default defineEventHandler(async () => {
  const [items, sessions] = await Promise.all([
    getRecentActivity(50),
    Promise.resolve(getRunningSessions()),
  ])
  const runningIds = new Set(sessions.map(s => s.sessionId).filter(Boolean))
  const tagged = items.map(item => ({ ...item, isRunning: runningIds.has(item.sessionId) }))
  return { items: tagged }
})
