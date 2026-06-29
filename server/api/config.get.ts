import { authToken, bindMode, allowRemoteRun } from '../utils/runtime'

// Non-secret runtime info the UI can read (never returns the token itself).
export default defineEventHandler(() => ({
  bindMode: bindMode(),
  authEnabled: Boolean(authToken()),
  allowRemoteRun: allowRemoteRun(),
}))
