import { readdir, stat } from 'node:fs/promises'
import { existsSync, createReadStream } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { createInterface } from 'node:readline'

export interface ConversationMessage {
  role: 'user' | 'assistant'
  text: string
  fullText: string
  timestamp: string
}

export interface ActivityItem {
  // The user's question that started this turn
  text: string
  fullText: string
  timestamp: string
  project: string
  sessionId: string
  // Full thread: user message + assistant replies
  messages: ConversationMessage[]
}

async function readLastLines(filePath: string, maxLines = 2000): Promise<string[]> {
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

      const sorted = await sortedByMtime(projDir, allFiles)
      const recentFiles = sorted.slice(0, 3)

      for (const file of recentFiles) {
        const lines = await readLastLines(join(projDir, file), 400)

        // Parse all messages in this session file, in order
        const sessionMessages: Array<{
          role: 'user' | 'assistant'
          fullText: string
          timestamp: string
          sessionId: string
        }> = []

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
                sessionMessages.push({
                  role: 'user',
                  fullText,
                  timestamp: entry.timestamp,
                  sessionId: entry.sessionId ?? '',
                })
              }
            }

            if (type === 'assistant' && entry.message?.content) {
              const content = entry.message.content
              const fullText = Array.isArray(content)
                ? content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')
                : ''
              if (fullText.trim().length > 5) {
                sessionMessages.push({
                  role: 'assistant',
                  fullText,
                  timestamp: entry.timestamp,
                  sessionId: entry.sessionId ?? '',
                })
              }
            }
          } catch { /* skip malformed lines */ }
        }

        // Group into conversation turns: each turn starts with a user message
        let currentTurn: ActivityItem | null = null

        for (const msg of sessionMessages) {
          if (msg.role === 'user') {
            if (currentTurn) items.push(currentTurn)
            currentTurn = {
              text: msg.fullText.slice(0, 200),
              fullText: msg.fullText,
              timestamp: msg.timestamp,
              project: projectName,
              sessionId: msg.sessionId,
              messages: [{
                role: 'user',
                text: msg.fullText.slice(0, 200),
                fullText: msg.fullText,
                timestamp: msg.timestamp,
              }],
            }
          } else if (msg.role === 'assistant' && currentTurn) {
            currentTurn.messages.push({
              role: 'assistant',
              text: msg.fullText.slice(0, 200),
              fullText: msg.fullText,
              timestamp: msg.timestamp,
            })
          }
        }
        if (currentTurn) items.push(currentTurn)
      }
    }
  } catch { /* ignore */ }

  return items
    .filter(i => i.timestamp)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)
}
