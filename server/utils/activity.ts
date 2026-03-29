import { readdir, stat } from 'node:fs/promises'
import { existsSync, createReadStream } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { createInterface } from 'node:readline'

export interface ActivityItem {
  role: 'user' | 'assistant'
  text: string
  timestamp: string
  project: string
  sessionId: string
  // Full message for modal
  fullText: string
  messageId?: string
}

async function readLastLines(filePath: string, maxLines = 400): Promise<string[]> {
  const lines: string[] = []
  try {
    const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity })
    for await (const line of rl) {
      lines.push(line)
      if (lines.length > maxLines) lines.shift()
    }
  } catch { /* ignore */ }
  return lines
}

async function sortedByMtime(dir: string, files: string[]): Promise<string[]> {
  const withMtime = await Promise.all(
    files.map(async f => {
      try {
        const s = await stat(join(dir, f))
        return { f, mtime: s.mtimeMs }
      } catch { return { f, mtime: 0 } }
    })
  )
  return withMtime.sort((a, b) => b.mtime - a.mtime).map(x => x.f)
}

export async function getRecentActivity(limit = 50): Promise<ActivityItem[]> {
  const projectsDir = join(homedir(), '.claude', 'projects')
  if (!existsSync(projectsDir)) return []

  const items: ActivityItem[] = []

  try {
    const projects = await readdir(projectsDir)

    for (const proj of projects) {
      const projDir = join(projectsDir, proj)
      const segments = proj.split('-').filter(Boolean)
      const projectName = segments.slice(-2).join('-')

      let allFiles: string[] = []
      try {
        allFiles = (await readdir(projDir)).filter(f => f.endsWith('.jsonl'))
      } catch { continue }

      if (!allFiles.length) continue

      // Sort by modification time desc — most recently active first
      const sorted = await sortedByMtime(projDir, allFiles)
      // Read the 2 most recently modified session files
      const recentFiles = sorted.slice(0, 2)

      for (const file of recentFiles) {
        const lines = await readLastLines(join(projDir, file), 400)

        for (const line of lines) {
          try {
            const entry = JSON.parse(line)
            const type = entry.type

            if (type === 'user' && entry.message?.content) {
              const content = entry.message.content
              const fullText = typeof content === 'string'
                ? content
                : Array.isArray(content)
                  ? content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')
                  : ''
              if (fullText.trim().length > 5) {
                items.push({
                  role: 'user',
                  text: fullText.slice(0, 200),
                  fullText,
                  timestamp: entry.timestamp,
                  project: projectName,
                  sessionId: entry.sessionId ?? '',
                  messageId: entry.uuid,
                })
              }
            }

            if (type === 'assistant' && entry.message?.content) {
              const content = entry.message.content
              const fullText = Array.isArray(content)
                ? content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')
                : ''
              if (fullText.trim().length > 5) {
                items.push({
                  role: 'assistant',
                  text: fullText.slice(0, 200),
                  fullText,
                  timestamp: entry.timestamp,
                  project: projectName,
                  sessionId: entry.sessionId ?? '',
                  messageId: entry.uuid,
                })
              }
            }
          } catch { /* skip malformed lines */ }
        }
      }
    }
  } catch { /* ignore */ }

  return items
    .filter(i => i.timestamp)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)
}
