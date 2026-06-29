import { readdir } from 'node:fs/promises'
import { existsSync, createReadStream } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { createInterface } from 'node:readline'
import type { ConversationMessage } from './activity'

export interface SessionThread {
  sessionId: string
  project: string
  cwd: string
  aiTitle: string | null
  messages: ConversationMessage[]
}

// Locate the JSONL file for a sessionId across all ~/.claude/projects/* dirs.
async function findSessionFile(sessionId: string): Promise<{ file: string; projDir: string; projectName: string } | null> {
  const projectsDir = join(homedir(), '.claude', 'projects')
  if (!existsSync(projectsDir)) return null
  let projects: string[] = []
  try { projects = await readdir(projectsDir) } catch { return null }

  for (const proj of projects) {
    const projDir = join(projectsDir, proj)
    let files: string[] = []
    try { files = (await readdir(projDir)).filter(f => f.endsWith('.jsonl')) } catch { continue }
    // Session files are named <sessionId>.jsonl
    const match = files.find(f => f === `${sessionId}.jsonl`)
    if (match) {
      const projectName = proj.replace(/^-/, '').split('-').slice(-2).join('-')
      return { file: join(projDir, match), projDir, projectName }
    }
  }
  return null
}

/**
 * Full ordered conversation thread for ONE session — reads the ENTIRE JSONL with
 * no line cap (unlike getRecentActivity, which truncates and returns per-turn
 * slices). This is what the ChatWidget renders so it shows the complete history,
 * not just the latest turn.
 */
export async function getSessionMessages(sessionId: string): Promise<SessionThread | null> {
  const found = await findSessionFile(sessionId)
  if (!found) return null

  const messages: ConversationMessage[] = []
  let aiTitle: string | null = null
  let cwd = ''
  // The most recent `last-prompt` entry — Claude Code writes the user's prompt
  // here (esp. while it's mid-run, before the prompt becomes a real `user` entry).
  // We surface it as a pending turn at the end IF it isn't already the last user
  // message, so a prompt typed while Claude is running shows immediately.
  let lastPrompt = ''
  let lastPromptTs = ''
  let imageCount = 0 // global image index across the whole session

  try {
    const rl = createInterface({ input: createReadStream(found.file), crlfDelay: Infinity })
    for await (const line of rl) {
      if (!line.trim()) continue
      let entry: any
      try { entry = JSON.parse(line) } catch { continue }

      if (entry.cwd && !cwd) cwd = entry.cwd
      if (entry.type === 'ai-title' && entry.aiTitle) aiTitle = entry.aiTitle
      if (entry.type === 'last-prompt' && typeof entry.lastPrompt === 'string') {
        lastPrompt = entry.lastPrompt
        lastPromptTs = entry.timestamp || ''
      }

      if (entry.type === 'user' && entry.message?.content) {
        const content = entry.message.content
        const fullText = typeof content === 'string'
          ? content
          : Array.isArray(content)
            ? content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')
            : ''
        // Collect image blocks → global indices (data served lazily, not inlined).
        const imgIdx: number[] = []
        if (Array.isArray(content)) {
          for (const b of content) {
            if (b?.type === 'image' && b?.source?.data) {
              imgIdx.push(imageCount)
              imageCount++
            }
          }
        }
        if (fullText.trim().length > 0 || imgIdx.length) {
          messages.push({
            role: 'user',
            text: fullText.slice(0, 200),
            fullText,
            timestamp: entry.timestamp,
            ...(imgIdx.length ? { images: imgIdx } : {}),
          })
        }
      }

      if (entry.type === 'assistant' && Array.isArray(entry.message?.content)) {
        for (const block of entry.message.content) {
          if (block.type === 'text' && block.text?.trim()) {
            messages.push({ role: 'assistant', text: block.text.slice(0, 200), fullText: block.text, timestamp: entry.timestamp })
          } else if (block.type === 'tool_use') {
            const inp = block.input ?? {}
            // TodoWrite → capture the list so the widget renders a checklist.
            if (block.name === 'TodoWrite' && Array.isArray(inp.todos)) {
              const todos = inp.todos
                .map((t: any) => ({ content: String(t.content ?? ''), status: t.status ?? 'pending' }))
                .filter((t: any) => t.content)
              const done = todos.filter((t: any) => t.status === 'completed').length
              messages.push({
                role: 'tool',
                text: `${done}/${todos.length}`,
                fullText: `${done}/${todos.length} done`,
                timestamp: entry.timestamp,
                toolName: 'TodoWrite',
                todos,
              })
              continue
            }
            const detail = inp.file_path
              ? inp.file_path.split('/').slice(-2).join('/')
              : inp.command
                ? String(inp.command).slice(0, 70)
                : inp.prompt
                  ? String(inp.prompt).slice(0, 70)
                  : JSON.stringify(inp).slice(0, 70)
            messages.push({ role: 'tool', text: detail, fullText: detail, timestamp: entry.timestamp, toolName: block.name })
          }
        }
      }
    }
  } catch { /* ignore */ }

  // Surface a pending prompt (typed while Claude is still running) that hasn't
  // yet been written as a real `user` message. Dedupe against ALL recent user
  // messages — Claude rewrites `last-prompt` to past prompts too, and the real
  // `user` entry may not be the very last message (tool_results follow it).
  if (lastPrompt.trim()) {
    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim()
    // last-prompt is truncated (~200 chars), so compare by a shared prefix
    // rather than exact equality against the (longer) real user message.
    const target = normalize(lastPrompt)
    const head = target.slice(0, 120)
    const alreadyShown = messages.some(
      (m) => m.role === 'user' && normalize(m.fullText).startsWith(head),
    )
    if (!alreadyShown) {
      messages.push({
        role: 'user',
        text: lastPrompt.slice(0, 200),
        fullText: lastPrompt,
        timestamp: lastPromptTs,
      })
    }
  }

  return { sessionId, project: found.projectName, cwd, aiTitle, messages }
}

/** Fetch the Nth image (global index) of a session — base64 bytes + media type. */
export async function getSessionImage(
  sessionId: string,
  index: number,
): Promise<{ buffer: Buffer; mediaType: string } | null> {
  const found = await findSessionFile(sessionId)
  if (!found) return null
  let n = 0
  try {
    const rl = createInterface({ input: createReadStream(found.file), crlfDelay: Infinity })
    for await (const line of rl) {
      if (!line.includes('"image"')) continue
      let entry: any
      try { entry = JSON.parse(line) } catch { continue }
      const content = entry?.message?.content
      if (!Array.isArray(content)) continue
      for (const b of content) {
        if (b?.type === 'image' && b?.source?.data) {
          if (n === index) {
            return {
              buffer: Buffer.from(b.source.data, 'base64'),
              mediaType: b.source.media_type || 'image/png',
            }
          }
          n++
        }
      }
    }
  } catch { /* ignore */ }
  return null
}
