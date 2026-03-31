import { readdir, stat } from 'node:fs/promises'
import { existsSync, createReadStream } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { createInterface } from 'node:readline'

// Pricing per million tokens (USD)
const MODEL_PRICING: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  'claude-opus-4-6':           { input: 15.00, output: 75.00, cacheWrite: 18.75, cacheRead: 1.50 },
  'claude-opus-4':             { input: 15.00, output: 75.00, cacheWrite: 18.75, cacheRead: 1.50 },
  'claude-sonnet-4-6':         { input:  3.00, output: 15.00, cacheWrite:  3.75, cacheRead: 0.30 },
  'claude-sonnet-4-5':         { input:  3.00, output: 15.00, cacheWrite:  3.75, cacheRead: 0.30 },
  'claude-haiku-4-5-20251001': { input:  0.80, output:  4.00, cacheWrite:  1.00, cacheRead: 0.08 },
  'claude-haiku-4-5':          { input:  0.80, output:  4.00, cacheWrite:  1.00, cacheRead: 0.08 },
}
const DEFAULT_PRICING = { input: 3.00, output: 15.00, cacheWrite: 3.75, cacheRead: 0.30 }

function calcCost(model: string, usage: {
  input_tokens?: number
  output_tokens?: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
}): number {
  const p = MODEL_PRICING[model] ?? DEFAULT_PRICING
  const input = (usage.input_tokens ?? 0) / 1_000_000
  const output = (usage.output_tokens ?? 0) / 1_000_000
  const cacheWrite = (usage.cache_creation_input_tokens ?? 0) / 1_000_000
  const cacheRead = (usage.cache_read_input_tokens ?? 0) / 1_000_000
  return input * p.input + output * p.output + cacheWrite * p.cacheWrite + cacheRead * p.cacheRead
}

export interface DailyUsage {
  date: string
  cost: number
  inputTokens: number
  outputTokens: number
  sessions: number
}

export interface ProjectUsage {
  project: string
  cost: number
  inputTokens: number
  outputTokens: number
  sessions: number
}

export interface UsageSummary {
  totalCost: number
  costToday: number
  costThisWeek: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCacheReadTokens: number
  totalCacheWriteTokens: number
  totalSessions: number
  daily: DailyUsage[]
  byProject: ProjectUsage[]
}

async function readLines(filePath: string, maxLines = 3000): Promise<string[]> {
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

function toDate(ts: string): string {
  return ts.slice(0, 10) // YYYY-MM-DD
}

export async function getUsageSummary(): Promise<UsageSummary> {
  const projectsDir = join(homedir(), '.claude', 'projects')
  if (!existsSync(projectsDir)) return empty()

  // Daily map for last 60 days
  const dailyMap = new Map<string, DailyUsage>()
  const projectMap = new Map<string, ProjectUsage>()
  const seenSessions = new Set<string>()

  let totalCost = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let totalCacheReadTokens = 0
  let totalCacheWriteTokens = 0

  const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000 // 60 days

  try {
    const projects = await readdir(projectsDir)

    for (const proj of projects) {
      const projDir = join(projectsDir, proj)
      const segments = proj.split('-').filter(Boolean)
      const projectName = segments.slice(-2).join('-')

      let files: string[] = []
      try {
        files = (await readdir(projDir)).filter(f => f.endsWith('.jsonl'))
      } catch { continue }

      for (const file of files) {
        const filePath = join(projDir, file)
        try {
          const s = await stat(filePath)
          if (s.mtimeMs < cutoff) continue
        } catch { continue }

        const lines = await readLines(filePath)

        let sessionId = ''
        const sessionCost = { cost: 0, input: 0, output: 0 }

        for (const line of lines) {
          try {
            const e = JSON.parse(line)
            if (!e.timestamp) continue

            // Track sessionId
            if (!sessionId && e.sessionId) sessionId = e.sessionId

            if (e.type === 'assistant' && e.message?.usage && e.message?.model) {
              const usage = e.message.usage
              const model: string = e.message.model
              const cost = calcCost(model, usage)
              const date = toDate(e.timestamp)

              totalCost += cost
              totalInputTokens += usage.input_tokens ?? 0
              totalOutputTokens += usage.output_tokens ?? 0
              totalCacheReadTokens += usage.cache_read_input_tokens ?? 0
              totalCacheWriteTokens += usage.cache_creation_input_tokens ?? 0

              sessionCost.cost += cost
              sessionCost.input += usage.input_tokens ?? 0
              sessionCost.output += usage.output_tokens ?? 0

              // Daily
              if (!dailyMap.has(date)) {
                dailyMap.set(date, { date, cost: 0, inputTokens: 0, outputTokens: 0, sessions: 0 })
              }
              const day = dailyMap.get(date)!
              day.cost += cost
              day.inputTokens += usage.input_tokens ?? 0
              day.outputTokens += usage.output_tokens ?? 0

              // Project
              if (!projectMap.has(projectName)) {
                projectMap.set(projectName, { project: projectName, cost: 0, inputTokens: 0, outputTokens: 0, sessions: 0 })
              }
              const proj2 = projectMap.get(projectName)!
              proj2.cost += cost
              proj2.inputTokens += usage.input_tokens ?? 0
              proj2.outputTokens += usage.output_tokens ?? 0
            }
          } catch { /* skip */ }
        }

        // Count unique sessions
        if (sessionId && !seenSessions.has(sessionId)) {
          seenSessions.add(sessionId)
          const firstDate = lines
            .map(l => { try { const e = JSON.parse(l); return e.timestamp as string } catch { return '' } })
            .find(t => t)
          if (firstDate) {
            const date = toDate(firstDate)
            const day = dailyMap.get(date)
            if (day) day.sessions++
            const p = projectMap.get(projectName)
            if (p) p.sessions++
          }
        }
      }
    }
  } catch { /* ignore */ }

  // Build sorted daily array (last 30 days, fill gaps)
  const today = new Date()
  const daily: DailyUsage[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    daily.push(dailyMap.get(key) ?? { date: key, cost: 0, inputTokens: 0, outputTokens: 0, sessions: 0 })
  }

  const todayKey = today.toISOString().slice(0, 10)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const costToday = dailyMap.get(todayKey)?.cost ?? 0
  const costThisWeek = [...dailyMap.entries()]
    .filter(([d]) => d >= weekAgo.toISOString().slice(0, 10))
    .reduce((s, [, v]) => s + v.cost, 0)

  const byProject = [...projectMap.values()]
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10)

  return {
    totalCost,
    costToday,
    costThisWeek,
    totalInputTokens,
    totalOutputTokens,
    totalCacheReadTokens,
    totalCacheWriteTokens,
    totalSessions: seenSessions.size,
    daily,
    byProject,
  }
}

function empty(): UsageSummary {
  const daily: DailyUsage[] = []
  const today = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    daily.push({ date: d.toISOString().slice(0, 10), cost: 0, inputTokens: 0, outputTokens: 0, sessions: 0 })
  }
  return {
    totalCost: 0, costToday: 0, costThisWeek: 0,
    totalInputTokens: 0, totalOutputTokens: 0,
    totalCacheReadTokens: 0, totalCacheWriteTokens: 0,
    totalSessions: 0, daily, byProject: [],
  }
}
