import { execSync, execFileSync } from 'node:child_process'
import { readdir, stat, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

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

// Encode a cwd path to the ~/.claude/projects/ folder name format
function cwdToProjectDir(cwd: string): string {
  return cwd.replace(/\//g, '-')
}

// Read the most recent sessionId from the latest JSONL in the project dir
async function resolveSessionId(cwd: string): Promise<string | null> {
  try {
    const projectsDir = join(homedir(), '.claude', 'projects')
    const encoded = cwdToProjectDir(cwd)
    const projDir = join(projectsDir, encoded)
    if (!existsSync(projDir)) return null

    const files = (await readdir(projDir)).filter(f => f.endsWith('.jsonl'))
    if (!files.length) return null

    // Find most recently modified file
    const withMtime = await Promise.all(
      files.map(async f => {
        try { return { f, mtime: (await stat(join(projDir, f))).mtimeMs } }
        catch { return { f, mtime: 0 } }
      })
    )
    const latest = withMtime.sort((a, b) => b.mtime - a.mtime)[0]
    if (!latest) return null

    // Read last few lines to find a sessionId
    const content = await readFile(join(projDir, latest.f), 'utf8')
    const lines = content.split('\n').filter(Boolean).slice(-50)
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const e = JSON.parse(lines[i])
        if (e.sessionId) return e.sessionId as string
      } catch { /* skip */ }
    }
    return null
  } catch { return null }
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

      const modeMatch = line.match(/--permission-mode\s+(\S+)/)
      const mode = modeMatch ? modeMatch[1] : 'default'

      const resumeMatch = line.match(/--resume\s+([a-f0-9-]{36})/)
      const sessionId = resumeMatch ? resumeMatch[1] : null

      const sourcesMatch = line.match(/--setting-sources\s+(\S+)/)
      const settingSources = sourcesMatch ? sourcesMatch[1] : ''

      const cmdStart = line.indexOf('native-binary/claude')
      const rawArgs = cmdStart >= 0 ? line.slice(cmdStart).split(/\s+/).slice(1) : []

      const cwd = getCwd(pid)
      const project = cwd ? cwd.split('/').pop() ?? '' : `PID ${pid}`

      sessions.push({
        pid, cwd, project, mode, elapsed, sessionId,
        resume: !!sessionId, settingSources,
        args: rawArgs.filter(a => a.length > 0),
      })
    }

    return sessions
  } catch {
    return []
  }
}

// Async version that also resolves sessionIds from JSONL for fresh sessions
export async function getRunningSessions2(): Promise<Session[]> {
  const sessions = getRunningSessions()
  await Promise.all(
    sessions
      .filter(s => !s.sessionId && s.cwd)
      .map(async s => {
        const id = await resolveSessionId(s.cwd)
        if (id) s.sessionId = id
      })
  )
  return sessions
}
