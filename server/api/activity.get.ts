import { getRecentActivity } from '../utils/activity'

export default defineEventHandler(async () => {
  const items = await getRecentActivity(50)
  return { items }
})
