import { getSessionImage } from '../../../../utils/sessionMessages'

export default defineEventHandler(async (event) => {
  const sessionId = getRouterParam(event, 'sessionId')
  const index = Number(getRouterParam(event, 'index'))
  if (!sessionId || Number.isNaN(index)) {
    throw createError({ statusCode: 400, message: 'Bad request' })
  }

  const img = await getSessionImage(sessionId, index)
  if (!img) throw createError({ statusCode: 404, message: 'Image not found' })

  setHeader(event, 'Content-Type', img.mediaType)
  setHeader(event, 'Cache-Control', 'private, max-age=86400')
  return img.buffer
})
