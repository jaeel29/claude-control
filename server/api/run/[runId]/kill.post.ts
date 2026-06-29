import { killJob } from '../../../utils/runManager'
import { assertRunAllowed } from '../../../utils/guard'

export default defineEventHandler(async (event) => {
  assertRunAllowed(event)
  const runId = getRouterParam(event, 'runId')
  if (runId) killJob(runId)
  return { ok: true }
})
