import { allowRemoteRun } from './runtime'

// Blocks code-executing endpoints (spawn/kill Claude) for REMOTE requests unless
// the operator opted in with CC_ALLOW_REMOTE_RUN=1 (--allow-remote-run). Loopback
// (the host machine) is always allowed, so remote is view-only by default.
export function assertRunAllowed(event: any): void {
  if (allowRemoteRun()) return
  const ra = event.node?.req?.socket?.remoteAddress || ''
  const loopback = ra === '127.0.0.1' || ra === '::1' || ra === '::ffff:127.0.0.1'
  if (loopback) return
  throw createError({
    statusCode: 403,
    message: 'Remote control is disabled. This dashboard is view-only over the network. Start with --allow-remote-run to enable it.',
  })
}
