import { sendStream, setHeader } from 'h3'
import { Readable } from 'node:stream'
import { getJob } from '../../../utils/runManager'

export default defineEventHandler(async (event) => {
  const runId = getRouterParam(event, 'runId')
  if (!runId) throw createError({ statusCode: 400, message: 'runId required' })

  const job = getJob(runId)
  if (!job) throw createError({ statusCode: 404, message: 'run not found' })

  setHeader(event, 'Content-Type', 'text/event-stream; charset=utf-8')
  setHeader(event, 'Cache-Control', 'no-cache')
  setHeader(event, 'Connection', 'keep-alive')
  setHeader(event, 'X-Accel-Buffering', 'no')

  const readable = new Readable({ read() {} })
  const push = (data: string) => readable.push(`data: ${data}\n\n`)

  // Replay buffer
  for (const chunk of [...job.buffer]) push(chunk)

  if (job.done) {
    readable.push(null)
    return sendStream(event, readable)
  }

  const listener = (chunk: string) => {
    push(chunk)
    try {
      if (JSON.parse(chunk).type === 'done') {
        job.listeners.delete(listener)
        readable.push(null)
      }
    } catch { /* keep streaming */ }
  }

  job.listeners.add(listener)

  event.node.req.on('close', () => {
    job.listeners.delete(listener)
    readable.destroy()
  })

  return sendStream(event, readable)
})
