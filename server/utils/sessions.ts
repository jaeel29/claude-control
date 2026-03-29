import { execSync, execFileSync } from 'node:child_process'

export interface Session {
  pid: number
  cwd: string
  project: string
  mode: string
  elapsed: string
  sessionId: string | null
  resume: boolean
  settingSources: string
  args: string[]
}

function getCwd(pid: number): string {
  try {
    const out = execFileSync('lsof', ['-p', String(pid), '-Fn'], { encoding: 'utf8', timeout: 3000 })
    const cwdLine = out.split('\n').find(l => l.startsWith('n') && l.includes('/') && !l.includes('/dev/') && !l.includes('pipe') && !l.includes('socket'))
    // More targeted: look for the cwd entry (after 'fcwd')
    const lines = out.split('\n')
    let nextIsCwd = false
    for (const line of lines) {
      if (line === 'fcwd') { nextIsCwd = true; continue }
      if (nextIsCwd && line.startsWith('n')) return line.slice(1)
    }
    return ''
  } catch { return '' }
}

export function getRunningSessions(): Session[] {
  try {
    const out = execSync('ps aux', { encoding: 'utf8' })
    const sessions: Session[] = []

    for (const line of out.split('\n')) {
      if (!line.includes('native-binary/claude')) continue
      if (line.includes('grep') || line.includes('claude-in-chrome') || line.includes('claude-control')) continue

      const parts = line.trim().split(/\s+/)
      const pid = parseInt(parts[1])
      const elapsed = parts[9] ?? ''

      // Parse flags from the full command line
      const modeMatch = line.match(/--permission-mode\s+(\S+)/)
      const mode = modeMatch ? modeMatch[1] : 'default'

      const resumeMatch = line.match(/--resume\s+([a-f0-9-]{36})/)
      const sessionId = resumeMatch ? resumeMatch[1] : null

      const sourcesMatch = line.match(/--setting-sources\s+(\S+)/)
      const settingSources = sourcesMatch ? sourcesMatch[1] : ''

      // Reconstruct the args list (excluding the binary path)
      const cmdStart = line.indexOf('native-binary/claude')
      const rawArgs = cmdStart >= 0 ? line.slice(cmdStart).split(/\s+/).slice(1) : []

      // Get real cwd via lsof
      const cwd = getCwd(pid)
      const project = cwd ? cwd.split('/').pop() ?? '' : `PID ${pid}`

      sessions.push({
        pid,
        cwd,
        project,
        mode,
        elapsed,
        sessionId,
        resume: !!sessionId,
        settingSources,
        args: rawArgs.filter(a => a.length > 0),
      })
    }

    return sessions
  } catch {
    return []
  }
}
