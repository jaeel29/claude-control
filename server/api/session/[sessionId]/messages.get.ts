import { getSessionMessages } from '../../../utils/sessionMessages'

export default defineEventHandler(async (event) => {
  const sessionId = getRouterParam(event, 'sessionId')
  if (!sessionId) throw createError({ statusCode: 400, message: 'Missing sessionId' })

  const thread = await getSessionMessages(sessionId)
  if (!thread) return { sessionId, project: '', cwd: '', aiTitle: null, messages: [] }
  return thread
})
