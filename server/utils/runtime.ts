// Runtime settings read directly from env (set by bin/cli.mjs at launch).
export function authToken(): string {
  return process.env.CC_AUTH_TOKEN || ''
}
export function bindMode(): string {
  return process.env.CC_BIND || 'localhost'
}
export function allowRemoteRun(): boolean {
  return process.env.CC_ALLOW_REMOTE_RUN === '1'
}
