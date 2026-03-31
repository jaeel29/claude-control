import { readdir, stat } from 'node:fs/promises'
import { existsSync, createReadStream } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { createInterface } from 'node:readline'

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'tool'
  text: string
  fullText: string
  timestamp: string
  toolName?: string
}

export interface ActivityItem {
  // The user's question that started this turn
  text: string
  fullText: string
  timestamp: string
  project: string
  sessionId: string
  cwd: string
  aiTitle: string | null
  // Full thread: user message + assistant replies
  messages: ConversationMessage[]
}

async function readLines(filePath: string, maxLines = 400): Promise<string[]> {
  const first: string[] = []
  const last: string[] = []
  let count = 0
  try {
    const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity })
    for await (const line of rl) {
      count++
      // Always keep first 20 lines (to catch ai-title written early in session)
      if (count <= 20) first.push(line)
      last.push(line)
      if (last.length > maxLines) last.shift()
    }
  } catch { /* ignore */ }
  // Merge: first 20 + last N, deduplicated by position
  if (count <= maxLines) return last
  const seen = new Set<string>()
  const result: string[] = []
  for (const l of [...first, ...last]) {
    if (!seen.has(l)) { seen.add(l); result.push(l) }
  }
  return result
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
      // Decode folder name back to real cwd: leading '-' separates path components
      const cwd = proj.startsWith('-') ? proj.replace(/-/g, '/') : '/' + proj.replace(/-/g, '/')

      let allFiles: string[] = []
      try {
        allFiles = (await readdir(projDir)).filter(f => f.endsWith('.jsonl'))
      } catch { continue }

      if (!allFiles.length) continue

      const sorted = await sortedByMtime(projDir, allFiles)
      const recentFiles = sorted.slice(0, 3)

      for (const file of recentFiles) {
        const lines = await readLines(join(projDir, file), 400)

        // Parse all messages in this session file, in order
        let aiTitle: string | null = null
        let resolvedCwd = cwd  // fallback to folder-decoded cwd
        const sessionMessages: Array<{
          role: 'user' | 'assistant' | 'tool'
          fullText: string
          timestamp: string
          sessionId: string
          toolName?: string
        }> = []

        for (const line of lines) {
          try {
            const entry = JSON.parse(line)
            const type = entry.type

            // Read real cwd from first entry that has it
            if (!resolvedCwd && entry.cwd) resolvedCwd = entry.cwd
            if (entry.cwd && resolvedCwd === cwd) resolvedCwd = entry.cwd

            if (type === 'ai-title' && entry.aiTitle) {
              aiTitle = entry.aiTitle
            }

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
              if (Array.isArray(content)) {
                for (const block of content) {
                  if (block.type === 'text' && block.text?.trim().length > 5) {
                    sessionMessages.push({
                      role: 'assistant',
                      fullText: block.text,
                      timestamp: entry.timestamp,
                      sessionId: entry.sessionId ?? '',
                    })
                  } else if (block.type === 'tool_use') {
                    const inp = block.input ?? {}
                    const detail = inp.file_path
                      ? inp.file_path.split('/').slice(-2).join('/')
                      : inp.command
                        ? String(inp.command).slice(0, 70)
                        : inp.prompt
                          ? String(inp.prompt).slice(0, 70)
                          : JSON.stringify(inp).slice(0, 70)
                    sessionMessages.push({
                      role: 'tool',
                      fullText: detail,
                      timestamp: entry.timestamp,
                      sessionId: entry.sessionId ?? '',
                      toolName: block.name,
                    })
                  }
                }
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
              cwd: resolvedCwd,
              aiTitle,
              messages: [{
                role: 'user',
                text: msg.fullText.slice(0, 200),
                fullText: msg.fullText,
                timestamp: msg.timestamp,
              }],
            }
          } else if (currentTurn) {
            currentTurn.messages.push({
              role: msg.role,
              text: msg.fullText.slice(0, 200),
              fullText: msg.fullText,
              timestamp: msg.timestamp,
              toolName: msg.toolName,
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
