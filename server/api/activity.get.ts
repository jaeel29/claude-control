import { getRecentActivity } from '../utils/activity'
import { getRunningSessions2 } from '../utils/sessions'

export default defineEventHandler(async () => {
  const [items, sessions] = await Promise.all([
    getRecentActivity(50),
    getRunningSessions2(),
  ])

  // Only match by resolved sessionId — precise, no false positives from shared cwd
  const runningIds = new Set(sessions.map(s => s.sessionId).filter(Boolean))

  const tagged = items.map(item => ({
    ...item,
    isRunning: runningIds.has(item.sessionId),
  }))
  return { items: tagged }
})
