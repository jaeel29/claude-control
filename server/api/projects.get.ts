import { readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { getRunningSessions } from '../utils/sessions'

function slugToPath(slug: string): string | null {
  const tokens = slug.replace(/^-/, '').split('-')

  function tryPaths(idx: number, current: string): string | null {
    if (idx === tokens.length) return existsSync(current) ? current : null
    for (let end = idx + 1; end <= tokens.length; end++) {
      const segment = tokens.slice(idx, end).join('-')
      const candidate = current + '/' + segment
      const result = tryPaths(end, candidate)
      if (result) return result
    }
    return null
  }

  return tryPaths(0, '')
}

export interface ProjectInfo {
  name: string
  path: string | null
  slug: string
  lastActive: string | null
  sessionCount: number
  hasLocalAgents: boolean
}

export default defineEventHandler(async (): Promise<{ projects: ProjectInfo[] }> => {
  const projectsDir = join(homedir(), '.claude', 'projects')
  if (!existsSync(projectsDir)) return { projects: [] }

  const sessions = getRunningSessions()
  const runningCwds = new Set(sessions.map(s => s.cwd).filter(Boolean))

  try {
    const entries = await readdir(projectsDir)

    const projects = await Promise.all(entries.map(async (slug): Promise<ProjectInfo> => {
      const projDir = join(projectsDir, slug)
      const resolvedPath = slugToPath(slug)
      const name = resolvedPath
        ? resolvedPath.split('/').pop() ?? slug
        : slug.split('-').filter(Boolean).slice(-2).join('-')

      // Get last modified time from session files
      let lastActive: string | null = null
      try {
        const files = (await readdir(projDir)).filter(f => f.endsWith('.jsonl'))
        if (files.length) {
          const mtimes = await Promise.all(
            files.map(f => stat(join(projDir, f)).then(s => s.mtimeMs).catch(() => 0))
          )
          const latest = Math.max(...mtimes)
          if (latest > 0) lastActive = new Date(latest).toISOString()
        }
      } catch { /* ignore */ }

      const hasLocalAgents = resolvedPath
        ? existsSync(join(resolvedPath, '.claude', 'agents'))
        : false

      const sessionCount = resolvedPath
        ? sessions.filter(s => s.cwd === resolvedPath).length
        : 0

      return { name, path: resolvedPath, slug, lastActive, sessionCount, hasLocalAgents }
    }))

    // Sort: running first, then by last active desc
    projects.sort((a, b) => {
      if (a.sessionCount > 0 && b.sessionCount === 0) return -1
      if (b.sessionCount > 0 && a.sessionCount === 0) return 1
      if (!a.lastActive) return 1
      if (!b.lastActive) return -1
      return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
    })

    return { projects }
  } catch {
    return { projects: [] }
  }
})
