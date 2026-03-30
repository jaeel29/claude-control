import { getSessionLog } from '../utils/sessionlog'

export default defineEventHandler(async () => {
  const sessions = await getSessionLog(30)
  return { sessions }
})
