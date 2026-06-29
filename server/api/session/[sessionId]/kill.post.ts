import { getRunningSessions } from '../../../utils/sessions'

export default defineEventHandler(async (event) => {
  const sessionId = getRouterParam(event, 'sessionId')
  if (!sessionId) throw createError({ statusCode: 400, message: 'Missing sessionId' })

  const sessions = getRunningSessions()
  const match = sessions.find(s => s.sessionId === sessionId)

  if (!match) throw createError({ statusCode: 404, message: 'No running session found with that ID' })

  try {
    process.kill(match.pid, 'SIGTERM')
    return { ok: true, pid: match.pid }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err?.message ?? 'Failed to kill process' })
  }
})
