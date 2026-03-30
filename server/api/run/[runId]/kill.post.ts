import { killJob } from '../../../utils/runManager'

export default defineEventHandler(async (event) => {
  const runId = getRouterParam(event, 'runId')
  if (runId) killJob(runId)
  return { ok: true }
})
