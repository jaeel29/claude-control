import { getUsageSummary } from '../utils/usage'

export default defineEventHandler(async () => {
  return getUsageSummary()
})
