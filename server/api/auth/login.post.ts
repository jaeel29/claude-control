import { setCookie } from 'h3'
import { authToken } from '../../utils/runtime'

export default defineEventHandler(async (event) => {
  const token = authToken()
  if (!token) return { ok: true, authDisabled: true }

  const body = await readBody(event)
  const supplied: string = (body?.token || '').trim()
  if (!supplied || supplied !== token) {
    throw createError({ statusCode: 401, message: 'Invalid access token' })
  }

  setCookie(event, 'cc_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days; not Secure so it works over http on a tailnet IP
  })
  return { ok: true }
})
