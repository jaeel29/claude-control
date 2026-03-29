import { readdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

export interface AgentMeta {
  name: string
  description: string
  tools: string
  model: string
  raw: string
}

function parseFrontmatter(content: string): AgentMeta {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  const fm: Record<string, string> = {}
  if (match) {
    for (const line of match[1].split('\n')) {
      const [key, ...rest] = line.split(':')
      if (key && rest.length) fm[key.trim()] = rest.join(':').trim()
    }
  }
  return {
    name: fm.name ?? '',
    description: fm.description ?? '',
    tools: fm.tools ?? '',
    model: fm.model ?? '',
    raw: content,
  }
}

async function readAgentsDir(dir: string): Promise<AgentMeta[]> {
  if (!existsSync(dir)) return []
  try {
    const files = await readdir(dir)
    const agents: AgentMeta[] = []
    for (const f of files.filter(f => f.endsWith('.md'))) {
      const content = await readFile(join(dir, f), 'utf8')
      agents.push(parseFrontmatter(content))
    }
    return agents
  } catch { return [] }
}

export async function getGlobalAgents(): Promise<AgentMeta[]> {
  return readAgentsDir(join(homedir(), '.claude', 'agents'))
}

export interface ProjectAgents {
  project: string
  path: string
  agents: AgentMeta[]
}

/**
 * Claude stores project paths as slugs: each '/' is replaced with '-', with a leading '-'.
 * Since project/folder names can contain hyphens, we resolve slugs by trying all
 * possible hyphen groupings and checking which ones exist on the filesystem.
 */
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

export async function getProjectAgents(): Promise<ProjectAgents[]> {
  const projectsDir = join(homedir(), '.claude', 'projects')
  if (!existsSync(projectsDir)) return []

  const globalAgentsDir = join(homedir(), '.claude', 'agents')
  const results: ProjectAgents[] = []
  try {
    const entries = await readdir(projectsDir)
    for (const entry of entries) {
      const absPath = slugToPath(entry)
      if (!absPath) continue
      const agentsDir = join(absPath, '.claude', 'agents')
      if (agentsDir === globalAgentsDir) continue
      const agents = await readAgentsDir(agentsDir)
      if (agents.length > 0) {
        results.push({
          project: absPath.split('/').pop() ?? entry,
          path: absPath,
          agents,
        })
      }
    }
  } catch { /* ignore */ }
  return results
}
