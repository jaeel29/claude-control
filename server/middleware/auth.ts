import { getRequestHeader, getCookie, sendRedirect, setResponseStatus } from 'h3'
import { authToken } from '../utils/runtime'

// Paths never gated: login page/API, the config probe, and static/build assets.
function isPublicPath(path: string): boolean {
  if (path === '/login') return true
  if (path.startsWith('/api/auth/')) return true
  if (path === '/api/config') return true
  if (path.startsWith('/_nuxt/') || path.startsWith('/__nuxt') || path.startsWith('/_ipx/')) return true
  if (path === '/favicon.ico' || path === '/favicon.svg' || path.startsWith('/fonts/') || path === '/robots.txt') return true
  return false
}

// Loopback (the host machine) is always trusted, so plain `localhost` use needs
// no token. Remote (tailnet/public) requests are gated.
function isLoopback(event: any): boolean {
  const ra = event.node?.req?.socket?.remoteAddress || ''
  return ra === '127.0.0.1' || ra === '::1' || ra === '::ffff:127.0.0.1'
}

export default defineEventHandler((event) => {
  const token = authToken()
  if (!token) return // no token configured → no gate (localhost-only use)

  const path = event.path || event.node.req.url || '/'
  if (isPublicPath(path)) return
  if (isLoopback(event)) return

  const cookie = getCookie(event, 'cc_session')
  const auth = getRequestHeader(event, 'authorization') || ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (cookie === token || bearer === token) return

  if (path.startsWith('/api/')) {
    setResponseStatus(event, 401)
    return { error: 'unauthorized' }
  }
  return sendRedirect(event, `/login?redirect=${encodeURIComponent(path)}`, 302)
})
