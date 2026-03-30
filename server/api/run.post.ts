import { createRun } from '../utils/runManager'
import { existsSync } from 'node:fs'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const prompt: string = body?.prompt?.trim()
  const cwd: string = body?.cwd?.trim()
  const project: string = body?.project?.trim() || cwd?.split('/').pop() || 'unknown'

  if (!prompt) throw createError({ statusCode: 400, message: 'prompt is required' })
  if (!cwd) throw createError({ statusCode: 400, message: 'cwd is required' })
  if (!existsSync(cwd)) throw createError({ statusCode: 400, message: `directory not found: ${cwd}` })

  const runId = createRun(prompt, cwd, project)
  return { runId }
})
