import { sendRedirect } from 'h3'

// When launched as the installed CLI app (CC_APP_MODE=app, set by bin/cli.mjs),
// the marketing landing page at "/" is irrelevant — send users straight to the
// dashboard. When the site is built/deployed for marketing (flag unset), "/"
// shows the landing page as normal.
export default defineEventHandler((event) => {
  if (process.env.CC_APP_MODE !== 'app') return
  const path = event.path || event.node.req.url || '/'
  if (path === '/' || path === '') {
    return sendRedirect(event, '/overview', 302)
  }
})
